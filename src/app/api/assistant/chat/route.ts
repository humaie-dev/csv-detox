import crypto from "node:crypto";
import { createAzure } from "@ai-sdk/azure";
import { api } from "@convex/api";
import type { Doc, Id } from "@convex/dataModel";
import { convertToModelMessages, stepCountIs, streamText, type UIMessage } from "ai";
import { z } from "zod";
import { downloadFileFromConvex, getConvexClient, getUpload } from "@/lib/convex/client";
import { listUploadSheets } from "@/lib/services/sheets";
import {
  ensureLocalDatabase,
  ensureLocalDatabaseForArtifact,
  getArtifactForParseOptions,
  getLocalDatabasePathForArtifact,
  getParseOptionsJson,
} from "@/lib/sqlite/artifacts";
import {
  closeDatabaseByKey,
  deleteDatabase,
  getDatabase,
  getDatabaseFromPath,
} from "@/lib/sqlite/database";
import { isProjectDataInitialized, parseAndStoreFile } from "@/lib/sqlite/parser";
import {
  getColumnStats,
  getDataSummary,
  getRowCount,
  getUniqueValues,
  sampleRows,
  searchColumn,
} from "@/lib/sqlite/sampling";
import { getParseConfig } from "@/lib/sqlite/schema";

// Initialize Azure OpenAI
const azure = createAzure({
  resourceName: process.env.AZURE_OPENAI_ENDPOINT?.split("//")[1]?.split(".")[0] || "",
  apiKey: process.env.AZURE_OPENAI_API_KEY || "",
});

const model = azure(process.env.AZURE_OPENAI_DEPLOYMENT || "gpt-4o");

/**
 * AI Assistant Chat API
 * POST /api/assistant/chat
 */
export async function POST(req: Request) {
  try {
    const { messages, projectId, pipelineId } = await req.json();

    // Verify project exists
    const convex = getConvexClient();
    const project = await convex.query(api.projects.get, {
      id: projectId as Id<"projects">,
    });

    if (!project) {
      return Response.json({ error: "Project not found" }, { status: 404 });
    }

    // Get pipelines
    const pipelines = await convex.query(api.pipelines.list, {
      projectId: projectId as Id<"projects">,
    });

    // Get selected pipeline if provided
    let selectedPipeline = null;
    if (pipelineId) {
      selectedPipeline = await convex.query(api.pipelines.get, {
        id: pipelineId as Id<"pipelines">,
      });
    }

    // Get database
    const projectIdTyped = projectId as Id<"projects">;
    const initialized = await isProjectDataInitialized(projectIdTyped);
    if (!initialized) {
      return Response.json(
        { error: "Project data not initialized. Please parse the file first." },
        { status: 400 },
      );
    }

    await ensureLocalDatabase(projectIdTyped);
    const db = getDatabase(projectId);
    const projectUploadId = project.uploadId;

    // Build system context
    const systemContext = buildSystemContext(project, pipelines, selectedPipeline);

    const tools = {
      listSheets: {
        description: "List sheet names in the uploaded Excel workbook",
        inputSchema: z.object({}),
        execute: async () => {
          if (!projectUploadId) {
            return { sheets: [], message: "No upload available for this project." };
          }
          try {
            const sheets = await listUploadSheets(projectUploadId as Id<"uploads">);
            return { sheets };
          } catch (error) {
            return {
              sheets: [],
              message:
                error instanceof Error ? error.message : "Unable to list sheets for this file.",
            };
          }
        },
      },
      getSheetSummary: {
        description:
          "Get summary data for a specific sheet in the uploaded file (parses on-demand)",
        inputSchema: z.object({
          sheetName: z.string(),
          sampleSize: z.number().optional(),
        }),
        execute: async (params: { sheetName: string; sampleSize?: number }) => {
          if (!projectUploadId) {
            return { error: "No upload available for this project." };
          }

          const upload = await getUpload(projectUploadId as Id<"uploads">);
          if (!upload) {
            return { error: "Upload not found." };
          }

          const isExcel =
            upload.mimeType ===
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
            upload.mimeType === "application/vnd.ms-excel";

          if (!isExcel) {
            return {
              error: "This file is not an Excel workbook. CSV files do not have sheets.",
            };
          }

          const parseOptions = {
            ...upload.parseConfig,
            sheetName: params.sheetName,
          };
          const parseOptionsJson = getParseOptionsJson(parseOptions);

          const currentConfig = getParseConfig(db);
          if (currentConfig?.sheetName === params.sheetName) {
            const sampleSize = params.sampleSize ?? 5;
            return getDataSummary(db, "raw_data", sampleSize);
          }

          const artifact = await getArtifactForParseOptions(projectIdTyped, parseOptions);
          if (artifact) {
            await ensureLocalDatabaseForArtifact(projectIdTyped, artifact);
            const cacheKey = `${projectId}-sheet-${parseOptionsJson}`;
            const sheetDb = getDatabaseFromPath(
              getLocalDatabasePathForArtifact(projectIdTyped, artifact.artifactKey),
              cacheKey,
            );
            try {
              const sampleSize = params.sampleSize ?? 5;
              return getDataSummary(sheetDb, "raw_data", sampleSize);
            } finally {
              closeDatabaseByKey(cacheKey);
            }
          }

          const fileBuffer = await downloadFileFromConvex(upload.convexStorageId);
          const parseHash = crypto
            .createHash("sha256")
            .update(parseOptionsJson)
            .digest("hex")
            .slice(0, 12);
          const tempProjectId = `${projectId}-sheet-${parseHash}`;

          await parseAndStoreFile(
            tempProjectId as Id<"projects">,
            fileBuffer,
            upload.originalName,
            upload.mimeType,
            parseOptions,
          );

          const tempDb = getDatabase(tempProjectId);
          try {
            const sampleSize = params.sampleSize ?? 5;
            return getDataSummary(tempDb, "raw_data", sampleSize);
          } finally {
            closeDatabaseByKey(tempProjectId);
            deleteDatabase(tempProjectId);
          }
        },
      },
      getSheetColumnInfo: {
        description:
          "Get column metadata for a specific sheet in the uploaded file (parses on-demand)",
        inputSchema: z.object({
          sheetName: z.string(),
        }),
        execute: async (params: { sheetName: string }) => {
          const summary = await tools.getSheetSummary.execute({
            sheetName: params.sheetName,
            sampleSize: 0,
          });
          if ("error" in summary) {
            return summary;
          }
          return { columns: summary.columns, rowCount: summary.rowCount };
        },
      },
      getDataSummary: {
        description: "Get a summary of the data including row count, columns, and sample rows",
        inputSchema: z.object({
          tableName: z.string().optional().describe("Table name (default: raw_data)"),
          sampleSize: z.number().optional().describe("Number of sample rows (default: 5)"),
        }),
        execute: async (params: { tableName?: string; sampleSize?: number }) => {
          const tableName = params.tableName || "raw_data";
          const sampleSize = params.sampleSize || 5;
          return getDataSummary(db, tableName, sampleSize);
        },
      },
      sampleData: {
        description: "Get random sample rows from a table",
        inputSchema: z.object({
          tableName: z.string().optional(),
          limit: z.number().optional(),
        }),
        execute: async (params: { tableName?: string; limit?: number }) => {
          const tableName = params.tableName || "raw_data";
          const limit = Math.min(params.limit || 10, 100);
          const rows = sampleRows(db, tableName, limit);
          return { rows, count: rows.length };
        },
      },
      getColumnInfo: {
        description: "Get column information including types and statistics",
        inputSchema: z.object({
          tableName: z.string().optional(),
        }),
        execute: async (params: { tableName?: string }) => {
          const tableName = params.tableName || "raw_data";
          return { columns: getColumnStats(db, tableName) };
        },
      },
      getUniqueValues: {
        description: "Get unique values and counts for a column",
        inputSchema: z.object({
          columnName: z.string(),
          tableName: z.string().optional(),
          limit: z.number().optional(),
        }),
        execute: async (params: { columnName: string; tableName?: string; limit?: number }) => {
          const tableName = params.tableName || "raw_data";
          const limit = params.limit || 50;
          return {
            column: params.columnName,
            uniqueValues: getUniqueValues(db, tableName, params.columnName, limit),
          };
        },
      },
      searchData: {
        description: "Search for rows matching a pattern in a column",
        inputSchema: z.object({
          columnName: z.string(),
          searchTerm: z.string(),
          tableName: z.string().optional(),
          limit: z.number().optional(),
        }),
        execute: async (params: {
          columnName: string;
          searchTerm: string;
          tableName?: string;
          limit?: number;
        }) => {
          const tableName = params.tableName || "raw_data";
          const limit = params.limit || 20;
          return {
            query: { column: params.columnName, term: params.searchTerm },
            results: searchColumn(db, tableName, params.columnName, params.searchTerm, limit),
          };
        },
      },
      getRowCount: {
        description: "Get total number of rows in a table",
        inputSchema: z.object({
          tableName: z.string().optional(),
        }),
        execute: async (params: { tableName?: string }) => {
          const tableName = params.tableName || "raw_data";
          return { tableName, rowCount: getRowCount(db, tableName) };
        },
      },
      listPipelines: {
        description: "List all pipelines for this project",
        inputSchema: z.object({}),
        execute: async () => {
          return {
            pipelines: pipelines.map((p) => ({
              id: p._id,
              name: p.name,
              steps: p.steps,
              stepCount: p.steps.length,
            })),
          };
        },
      },
      getPipelineDetails: {
        description: "Get detailed information about a specific pipeline",
        inputSchema: z.object({
          pipelineId: z.string(),
        }),
        execute: async (params: { pipelineId: string }) => {
          const pipeline = await convex.query(api.pipelines.get, {
            id: params.pipelineId as Id<"pipelines">,
          });
          if (!pipeline) {
            return { error: "Pipeline not found" };
          }
          return {
            id: pipeline._id,
            name: pipeline.name,
            steps: pipeline.steps,
            stepCount: pipeline.steps.length,
          };
        },
      },
      createPipeline: {
        description: "Create a new pipeline (requires user approval)",
        inputSchema: z.object({
          name: z.string(),
          steps: z.array(z.unknown()).optional(),
          parseConfig: z
            .object({
              sheetName: z.string().optional(),
              sheetIndex: z.number().optional(),
              startRow: z.number().optional(),
              endRow: z.number().optional(),
              startColumn: z.number().optional(),
              endColumn: z.number().optional(),
              hasHeaders: z.boolean().optional(),
            })
            .optional(),
          parseSettings: z
            .object({
              sheetName: z.string().optional(),
              sheetIndex: z.number().optional(),
              startRow: z.number().optional(),
              endRow: z.number().optional(),
              startColumn: z.number().optional(),
              endColumn: z.number().optional(),
              hasHeaders: z.boolean().optional(),
            })
            .optional(),
          confirmed: z.boolean().describe("Set true after user approval"),
        }),
        execute: async (params: {
          name: string;
          steps?: unknown[];
          parseConfig?: Doc<"pipelines">["parseConfig"];
          parseSettings?: Doc<"pipelines">["parseConfig"];
          confirmed: boolean;
        }) => {
          if (!params.confirmed) {
            return {
              error: "User approval required",
              message: "Ask the user to confirm before creating the pipeline.",
            };
          }

          const parseConfig = params.parseConfig ?? params.parseSettings;
          const normalizedParseConfig = parseConfig
            ? { ...parseConfig, hasHeaders: parseConfig.hasHeaders ?? true }
            : undefined;

          const pipelineId = await convex.mutation(api.pipelines.create, {
            projectId: projectId as Id<"projects">,
            name: params.name,
            steps: (params.steps ?? []) as Doc<"pipelines">["steps"],
            parseConfig: normalizedParseConfig,
          });

          return { pipelineId };
        },
      },
      updatePipeline: {
        description: "Update an existing pipeline (requires user approval)",
        inputSchema: z.object({
          pipelineId: z.string(),
          steps: z.array(z.unknown()).optional(),
          parseConfig: z
            .object({
              sheetName: z.string().optional(),
              sheetIndex: z.number().optional(),
              startRow: z.number().optional(),
              endRow: z.number().optional(),
              startColumn: z.number().optional(),
              endColumn: z.number().optional(),
              hasHeaders: z.boolean().optional(),
            })
            .optional(),
          parseSettings: z
            .object({
              sheetName: z.string().optional(),
              sheetIndex: z.number().optional(),
              startRow: z.number().optional(),
              endRow: z.number().optional(),
              startColumn: z.number().optional(),
              endColumn: z.number().optional(),
              hasHeaders: z.boolean().optional(),
            })
            .optional(),
          confirmed: z.boolean().describe("Set true after user approval"),
        }),
        execute: async (params: {
          pipelineId: string;
          steps?: unknown[];
          parseConfig?: Doc<"pipelines">["parseConfig"];
          parseSettings?: Doc<"pipelines">["parseConfig"];
          confirmed: boolean;
        }) => {
          if (!params.confirmed) {
            return {
              error: "User approval required",
              message: "Ask the user to confirm before updating the pipeline.",
            };
          }

          const parseConfig = params.parseConfig ?? params.parseSettings;
          const normalizedParseConfig = parseConfig
            ? { ...parseConfig, hasHeaders: parseConfig.hasHeaders ?? true }
            : undefined;

          await convex.mutation(api.pipelines.update, {
            id: params.pipelineId as Id<"pipelines">,
            steps: params.steps as Doc<"pipelines">["steps"] | undefined,
            parseConfig: normalizedParseConfig,
          });

          return { success: true };
        },
      },
      deletePipeline: {
        description: "Delete a pipeline (requires user approval)",
        inputSchema: z.object({
          pipelineId: z.string(),
          confirmed: z.boolean().describe("Set true after user approval"),
        }),
        execute: async (params: { pipelineId: string; confirmed: boolean }) => {
          if (!params.confirmed) {
            return {
              error: "User approval required",
              message: "Ask the user to confirm before deleting the pipeline.",
            };
          }

          await convex.mutation(api.pipelines.remove, {
            id: params.pipelineId as Id<"pipelines">,
          });

          return { success: true };
        },
      },
    };

    const hasUiParts = Array.isArray(messages) && messages[0] && "parts" in messages[0];
    const uiMessages = hasUiParts ? (messages as UIMessage[]) : null;
    const modelMessages =
      hasUiParts && uiMessages
        ? await convertToModelMessages(
            uiMessages.map(({ id, ...rest }) => rest),
            { tools },
          )
        : messages;

    // Stream the response with tools
    const result = streamText({
      model,
      system: systemContext,
      messages: modelMessages,
      tools,
      stopWhen: stepCountIs(5),
    });

    if (uiMessages) {
      return result.toUIMessageStreamResponse({
        originalMessages: uiMessages,
      });
    }

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("Assistant error:", error);
    return Response.json(
      {
        error: "Failed to process request",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

/**
 * Build system context for the AI assistant
 */
function buildSystemContext(
  project: ProjectWithUpload,
  pipelines: Doc<"pipelines">[],
  selectedPipeline: Doc<"pipelines"> | null,
): string {
  const upload = project.upload ?? null;
  const fileContext = upload
    ? `**Uploaded File Context:**
- Original name: ${upload.originalName}
- File type: ${upload.mimeType}
- Size: ${upload.size} bytes
- Storage id: ${upload.convexStorageId}
- Parse config: ${upload.parseConfig ? JSON.stringify(upload.parseConfig) : "none"}
`
    : "**Uploaded File Context:** none";

  const context = `You are an AI assistant for CSV Detox, a data transformation tool. You're helping the user analyze and transform their data.

**Current Project:**
- Name: ${project.name}

${fileContext}

**Available Pipelines:** ${pipelines.length}
${pipelines.map((p, i) => `${i + 1}. ${p.name} (${p.steps.length} steps)`).join("\n")}

${
  selectedPipeline
    ? `**Selected Pipeline:** ${selectedPipeline.name}
- Steps: ${selectedPipeline.steps.length}
${selectedPipeline.steps.map((s, i) => `  ${i + 1}. ${s.type}`).join("\n")}`
    : ""
}

**Your Capabilities:**
1. **Data Analysis:** Use tools to sample data, analyze columns, find patterns, get statistics
2. **Pipeline Assistance:** Help users understand pipelines and suggest transformations
3. **Data Insights:** Answer questions about the data structure and content

**User Context Rules:**
- The user always speaks in the context of the original uploaded file, not SQLite tables.
- Translate user requests about the file/sheets into the appropriate tool calls.
- Use SQLite-backed tools to inspect data; do not attempt to load full sheets into context.
- If a request requires too much data to include and cannot be answered via sampling or aggregation, clearly explain the limitation.
- Any pipeline changes (create/update/delete) require explicit user approval before executing.

**Confirmation UX Pattern (Pipelines):**
- Before calling create/update/delete pipeline tools, present a short change summary and ask for confirmation.
- Require a clear user confirmation (e.g., "Confirm: create pipeline <name>" / "Confirm: update pipeline <id>" / "Confirm: delete pipeline <id>") before proceeding.
- When the user mentions "parseSettings", treat it as the pipeline parseConfig.

**Available Transformation Types:**
- filter_rows: Filter rows based on conditions
- select_columns: Select specific columns
- rename_columns: Rename columns
- sort_rows: Sort rows by column
- remove_duplicates: Remove duplicate rows
- fill_nulls: Fill null values
- drop_nulls: Drop rows with nulls
- convert_types: Convert column types
- add_column: Add calculated columns
- split_column: Split column into multiple
- merge_columns: Merge multiple columns
- replace_values: Replace specific values
- trim_whitespace: Remove whitespace
- extract_pattern: Extract text patterns

**Guidelines:**
- Always sample data before making recommendations
- Ask clarifying questions when transformation goals are unclear
- Suggest specific transformation steps with exact parameters
- Explain the impact of suggested transformations
- Be concise but thorough in your explanations

When the user asks for help with transformations, analyze their data first, then suggest specific pipeline steps.`;

  return context;
}

type ProjectWithUpload = Doc<"projects"> & {
  upload?: {
    originalName: string;
    mimeType: string;
    size: number;
    convexStorageId: Id<"_storage">;
    parseConfig?: Doc<"uploads">["parseConfig"];
  } | null;
};
