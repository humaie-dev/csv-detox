import { convertToModelMessages, streamText, stepCountIs, type UIMessage } from "ai";
import { createAzure } from "@ai-sdk/azure";
import { z } from "zod";
import { getDatabase } from "@/lib/sqlite/database";
import { getConvexClient } from "@/lib/convex/client";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import {
  sampleRows,
  getColumnStats,
  getUniqueValues,
  getRowCount,
  searchColumn,
  getDataSummary,
} from "@/lib/sqlite/sampling";

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
    const db = getDatabase(projectId);

    // Build system context
    const systemContext = buildSystemContext(project, pipelines, selectedPipeline);

    const tools = {
        getDataSummary: {
          description: "Get a summary of the data including row count, columns, and sample rows",
          inputSchema: z.object({
            tableName: z.string().optional().describe("Table name (default: raw_data)"),
            sampleSize: z.number().optional().describe("Number of sample rows (default: 5)"),
          }),
          execute: async (params) => {
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
          execute: async (params) => {
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
          execute: async (params) => {
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
          execute: async (params) => {
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
          execute: async (params) => {
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
          execute: async (params) => {
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
          execute: async (params) => {
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
      };

    const hasUiParts = Array.isArray(messages) && messages[0] && "parts" in messages[0];
    const uiMessages = hasUiParts ? (messages as UIMessage[]) : null;
    const modelMessages = hasUiParts
      ? await convertToModelMessages(
          uiMessages.map(({ id, ...rest }) => rest),
          { tools }
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
      { status: 500 }
    );
  }
}

/**
 * Build system context for the AI assistant
 */
function buildSystemContext(
  project: any,
  pipelines: any[],
  selectedPipeline: any | null
): string {
  const context = `You are an AI assistant for CSV Detox, a data transformation tool. You're helping the user analyze and transform their data.

**Current Project:**
- Name: ${project.name}
- File: ${project.upload?.originalName || "N/A"}

**Available Pipelines:** ${pipelines.length}
${pipelines.map((p, i) => `${i + 1}. ${p.name} (${p.steps.length} steps)`).join("\n")}

${selectedPipeline ? `**Selected Pipeline:** ${selectedPipeline.name}
- Steps: ${selectedPipeline.steps.length}
${selectedPipeline.steps.map((s: any, i: number) => `  ${i + 1}. ${s.type}`).join("\n")}` : ""}

**Your Capabilities:**
1. **Data Analysis:** Use tools to sample data, analyze columns, find patterns, get statistics
2. **Pipeline Assistance:** Help users understand pipelines and suggest transformations
3. **Data Insights:** Answer questions about the data structure and content

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
