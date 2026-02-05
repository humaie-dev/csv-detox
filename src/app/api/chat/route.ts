import { createAzure } from "@ai-sdk/azure";
import { streamText, tool, convertToModelMessages } from "ai";
import { z } from "zod";
import {
  addStepToolSchema,
  removeStepToolSchema,
  editStepToolSchema,
  reorderStepsToolSchema,
  updateParseConfigToolSchema,
  previewDataToolSchema,
  toolDescriptions,
} from "@/lib/assistant/tools";

export const maxDuration = 30;

export async function POST(req: Request) {
  const body = await req.json();
  const { messages, data } = body;

  const {
    AZURE_OPENAI_ENDPOINT,
    AZURE_OPENAI_API_KEY,
    AZURE_OPENAI_DEPLOYMENT,
  } = process.env;

  if (!AZURE_OPENAI_ENDPOINT || !AZURE_OPENAI_API_KEY || !AZURE_OPENAI_DEPLOYMENT) {
    return new Response(
      JSON.stringify({
        error: "Azure OpenAI environment variables not configured",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const azure = createAzure({
    apiKey: AZURE_OPENAI_API_KEY,
    resourceName: extractResourceName(AZURE_OPENAI_ENDPOINT),
  });

  const model = azure(AZURE_OPENAI_DEPLOYMENT);

  const systemPrompt = buildSystemPrompt(data);
  
  // Debug: Log what data we're receiving (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.log('[Assistant] Building system prompt with data:', {
      hasColumns: !!data?.columns,
      columnsCount: data?.columns?.length || 0,
      hasCurrentSteps: !!data?.currentSteps,
      currentStepsCount: data?.currentSteps?.length || 0,
      currentStepsPreview: data?.currentSteps?.slice(0, 2),
      hasPreviewData: !!data?.previewData,
      hasOriginalData: !!data?.originalData,
      hasTypeEvolution: !!data?.typeEvolution,
      hasAvailableSheets: !!data?.availableSheets,
      availableSheetsCount: data?.availableSheets?.length || 0,
    });
  }

  // Convert UIMessages to ModelMessages for streamText
  const modelMessages = await convertToModelMessages(messages);

  const result = streamText({
    model,
    system: systemPrompt,
    messages: modelMessages,
    tools: {
      addStep: tool({
        description: toolDescriptions.addStep,
        inputSchema: addStepToolSchema,
      }),
      removeStep: tool({
        description: toolDescriptions.removeStep,
        inputSchema: removeStepToolSchema,
      }),
      editStep: tool({
        description: toolDescriptions.editStep,
        inputSchema: editStepToolSchema,
      }),
      reorderSteps: tool({
        description: toolDescriptions.reorderSteps,
        inputSchema: reorderStepsToolSchema,
      }),
      updateParseConfig: tool({
        description: toolDescriptions.updateParseConfig,
        inputSchema: updateParseConfigToolSchema,
      }),
      previewData: tool({
        description: toolDescriptions.previewData,
        inputSchema: previewDataToolSchema,
        execute: async ({ stepIndex = -1, maxRows = 10 }) => {
          // Get original data and steps from context
          const originalData = data?.originalData;
          const currentSteps = data?.currentSteps;
          
          if (!originalData) {
            return { error: "No original data available" };
          }
          
          // Import executor dynamically to execute pipeline
          const { executeUntilStep } = await import("@/lib/pipeline/executor");
          
          // Execute pipeline up to specified step
          const result = executeUntilStep(
            originalData, 
            currentSteps || [], 
            stepIndex
          );
          
          // Limit rows
          const limitedRows = Math.min(maxRows, 50);
          const rows = result.table.rows.slice(0, limitedRows);
          
          // Get column metadata at this step
          const columnsAtStep = result.typeEvolution[result.typeEvolution.length - 1];
          
          return {
            stepIndex,
            columns: columnsAtStep.map((c: any) => ({
              name: c.name,
              type: c.type,
              sampleValues: rows.slice(0, 3).map((row: any) => row[c.name]),
            })),
            rows,
            totalRows: result.table.rows.length,
            showing: rows.length,
          };
        },
      }),
    },
  });

  return result.toUIMessageStreamResponse();
}

function extractResourceName(endpoint: string): string {
  const match = endpoint.match(/https:\/\/(.+?)\.openai\.azure\.com/);
  if (!match) {
    throw new Error(`Invalid Azure OpenAI endpoint format: ${endpoint}`);
  }
  return match[1];
}

function buildSystemPrompt(data?: {
  columns?: string[];
  currentSteps?: Array<{ type: string; [key: string]: any }>;
  parseConfig?: Record<string, any>;
  previewData?: {
    columns: Array<{ name: string; type: string; sampleValues?: any[] }>;
    rows: any[];
  };
  originalData?: {
    columns: Array<{ name: string; type: string }>;
    rows: any[];
  };
  typeEvolution?: Array<Array<{ name: string; type: string }>>;
  availableSheets?: string[];
}): string {
  let prompt = `You are an AI assistant helping users build data transformation pipelines for CSV/Excel files.

Your job is to interpret natural language requests and call the appropriate tools to modify the pipeline.

IMPORTANT: You can call MULTIPLE tools in a single response to fulfill complex requests. For example:
- "clean up the data" might require: trim whitespace, remove duplicates, remove empty columns
- "prepare for analysis" might require: cast columns to correct types, remove nulls, sort by date
- "restructure the table" might require: unpivot, rename columns, reorder steps

Call as many tools as needed to fully accomplish the user's request in one go.

You have access to a previewData tool to see the current state of the data. Use it when you need to:
- Understand column names and types
- See sample values to determine appropriate transformations
- Verify the structure before making changes

Available transformation types and their configurations:

1. sort: Sort data by one or more columns
   Config: { columns: [{ name: string, direction: "asc"|"desc" }], nullsPosition?: "first"|"last" }

2. remove_column: Remove one or more columns
   Config: { columns: string[] }

3. rename_column: Rename a column
   Config: { oldName: string, newName: string }

4. deduplicate: Remove duplicate rows
   Config: { columns?: string[] } (omit columns to check all columns)

5. filter: Keep/remove rows based on conditions
   Config: { column: string, operator: "equals"|"not_equals"|"contains"|"not_contains"|"greater_than"|"less_than"|"greater_than_or_equal"|"less_than_or_equal", value: any, mode?: "keep"|"remove" }

6. trim: Remove leading/trailing whitespace
   Config: { columns: string[] }

7. uppercase: Convert to uppercase
   Config: { columns: string[] }

8. lowercase: Convert to lowercase
   Config: { columns: string[] }

9. split_column: Split a column into multiple
   Config: { sourceColumn: string, method: "delimiter"|"position"|"regex", newColumns: string[], delimiter?: string, positions?: number[], pattern?: string, trimResults?: boolean }

10. merge_columns: Combine multiple columns
    Config: { sourceColumns: string[], targetColumn: string, separator?: string, skipNulls?: boolean, keepOriginals?: boolean }

11. unpivot: Convert wide format to long format (columns → rows)
    Config: { idColumns: string[], valueColumns: string[], variableColumnName?: string, valueColumnName?: string }

12. pivot: Convert long format to wide format (rows → columns)
    Config: { indexColumns: string[], columnSource: string, valueSource: string, aggregation?: "sum"|"count"|"avg"|"min"|"max" }

13. cast_column: Cast column to a different type
    Config: { column: string, targetType: "string"|"number"|"boolean"|"date", onError?: "fail"|"null"|"skip", dateFormat?: string }

14. fill_down: Fill empty cells with last non-empty value from above
    Config: { columns: string[], treatWhitespaceAsEmpty?: boolean }

15. fill_across: Fill empty cells with last non-empty value from left
    Config: { columns: string[], treatWhitespaceAsEmpty?: boolean }

`;

  if (data?.columns && data.columns.length > 0) {
    prompt += `\nAvailable columns in the dataset: ${data.columns.join(", ")}\n`;
  }

  if (data?.previewData) {
    prompt += `\nCurrent data state:\n`;
    prompt += `Columns (${data.previewData.columns.length}):\n`;
    data.previewData.columns.slice(0, 10).forEach((col) => {
      const samples = col.sampleValues?.slice(0, 3).join(", ") || "no samples";
      prompt += `  - ${col.name} (${col.type}): ${samples}\n`;
    });
    if (data.previewData.columns.length > 10) {
      prompt += `  ... and ${data.previewData.columns.length - 10} more columns\n`;
    }
    prompt += `Rows: ${data.previewData.rows.length} in preview\n`;
  }

  if (data?.currentSteps && data.currentSteps.length > 0) {
    prompt += `\nCurrent pipeline steps (${data.currentSteps.length} steps):\n`;
    data.currentSteps.forEach((step, idx) => {
      prompt += `  ${idx + 1}. ${step.type}`;
      // Include key config details
      if (step.type === "sort" && step.columns) {
        const cols = Array.isArray(step.columns) 
          ? step.columns.map((c: any) => `${c.name} ${c.direction}`).join(", ")
          : "unknown";
        prompt += ` (${cols})`;
      } else if ((step.type === "remove_column" || step.type === "trim" || step.type === "uppercase" || step.type === "lowercase") && step.columns) {
        prompt += ` (${Array.isArray(step.columns) ? step.columns.join(", ") : step.columns})`;
      } else if (step.type === "rename_column") {
        prompt += ` (${step.oldName} → ${step.newName})`;
      } else if (step.type === "filter") {
        prompt += ` (${step.column} ${step.operator} ${step.value})`;
      } else if (step.type === "cast_column") {
        prompt += ` (${step.column} → ${step.targetType})`;
      }
      prompt += `\n`;
    });
    
    // Add type evolution information if available
    if (data?.typeEvolution && data.typeEvolution.length > 0) {
      prompt += `\nColumn type evolution through pipeline:\n`;
      prompt += `  Original (step 0): `;
      const originalCols = data.typeEvolution[0];
      if (originalCols && originalCols.length <= 5) {
        prompt += originalCols.map(c => `${c.name}:${c.type}`).join(", ");
      } else if (originalCols) {
        prompt += `${originalCols.length} columns`;
      }
      prompt += `\n`;
      
      // Show evolution for each step, but limit to important changes
      for (let i = 1; i < data.typeEvolution.length; i++) {
        const prevCols = data.typeEvolution[i - 1];
        const currCols = data.typeEvolution[i];
        
        // Check if columns changed
        const prevColNames = prevCols.map(c => c.name).sort().join(",");
        const currColNames = currCols.map(c => c.name).sort().join(",");
        const colsChanged = prevColNames !== currColNames;
        
        // Check if types changed
        const typesChanged = currCols.some((col, idx) => {
          const prevCol = prevCols.find(pc => pc.name === col.name);
          return prevCol && prevCol.type !== col.type;
        });
        
        if (colsChanged || typesChanged) {
          prompt += `  After step ${i}: `;
          if (colsChanged) {
            prompt += `${currCols.length} columns (${prevCols.length} → ${currCols.length})`;
          } else if (typesChanged) {
            const changedTypes = currCols.filter(col => {
              const prevCol = prevCols.find(pc => pc.name === col.name);
              return prevCol && prevCol.type !== col.type;
            });
            prompt += `types changed: ${changedTypes.map(c => {
              const prevCol = prevCols.find(pc => pc.name === c.name);
              return `${c.name} (${prevCol?.type}→${c.type})`;
            }).join(", ")}`;
          }
          prompt += `\n`;
        }
      }
    }
  } else {
    prompt += `\nCurrent pipeline is empty (no steps yet).\n`;
  }

  if (data?.parseConfig) {
    prompt += `\nCurrent parse configuration:\n`;
    if (data.parseConfig.sheetName) {
      prompt += `  - Sheet: ${data.parseConfig.sheetName}\n`;
    }
    if (data.parseConfig.startRow || data.parseConfig.endRow) {
      prompt += `  - Rows: ${data.parseConfig.startRow || 1} to ${data.parseConfig.endRow || "end"}\n`;
    }
    if (data.parseConfig.startColumn || data.parseConfig.endColumn) {
      prompt += `  - Columns: ${data.parseConfig.startColumn || 1} to ${data.parseConfig.endColumn || "end"}\n`;
    }
    prompt += `  - Has headers: ${data.parseConfig.hasHeaders ?? true}\n`;
  }
  
  // Always mention file type (Excel with sheets or CSV without sheets)
  if (data?.availableSheets && data.availableSheets.length > 0) {
    prompt += `\nFile type: Excel workbook\n`;
    prompt += `Excel file sheets:\n`;
    prompt += `  - Available sheets: ${data.availableSheets.join(", ")}\n`;
    const currentSheet = data.parseConfig?.sheetName;
    if (currentSheet) {
      prompt += `  - Currently viewing: ${currentSheet}\n`;
    } else {
      prompt += `  - Currently viewing: ${data.availableSheets[0]} (default first sheet)\n`;
    }
    prompt += `  - To switch sheets, use the updateParseConfig tool with the sheetName parameter\n`;
  } else {
    prompt += `\nFile type: CSV file (no sheets - single data table)\n`;
    prompt += `  - CSV files don't have multiple sheets like Excel files\n`;
    prompt += `  - If the user asks about sheets, explain that this is a CSV file with a single data table\n`;
  }

  prompt += `\nWhen the user requests a transformation:
1. Determine which tool(s) to call - you can call MULTIPLE tools in one response
2. Extract the necessary parameters from the user's message
3. Call all appropriate tools with correct configuration
4. For step operations (add/edit/remove/reorder), use 0-based indexing
5. If the request is ambiguous or missing information, ask for clarification (don't call any tools)
6. Think about the ORDER of operations - some changes depend on others completing first

IMPORTANT: You MUST call the appropriate tools to make changes. Do not just describe what you would do - actually call the tools.

Examples:
- "sort by date desc" → CALL addStep tool with sort config
- "remove column notes" → CALL addStep tool with remove_column config  
- "move step 3 up" → CALL reorderSteps tool from index 2 to index 1
- "remove the last step" → CALL removeStep tool with stepIndex = (number of steps - 1)
- "switch to sheet Transactions" or "use the Transactions sheet" → CALL updateParseConfig tool with sheetName: "Transactions"
- "what sheets are available?" → List the available sheets from the context above (no tool needed)
- "which sheet am I viewing?" → Tell them the currently viewing sheet from the context above (no tool needed)
- "clean up the data" → CALL addStep(trim), addStep(deduplicate), addStep(remove_column for empty cols)
- "prepare names for export" → CALL addStep(trim on name column), addStep(uppercase on name column)`;

  return prompt;
}
