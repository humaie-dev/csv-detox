import { createAzure } from "@ai-sdk/azure";
import { streamText, tool, convertToModelMessages } from "ai";
import {
  addStepToolSchema,
  removeStepToolSchema,
  editStepToolSchema,
  reorderStepsToolSchema,
  updateParseConfigToolSchema,
  previewDataToolSchema,
  toolDescriptions,
} from "@/lib/assistant/tools";
import { executeUntilStep } from "@/lib/pipeline/executor";

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

  // Convert UIMessages to ModelMessages for streamText
  const modelMessages = await convertToModelMessages(messages);

  const result = streamText({
    model,
    providerOptions: {
     
    },
    

    temperature: 0.7,
    system: systemPrompt,
    messages: modelMessages,
    tools: {
      addStep: tool({
        description: toolDescriptions.addStep,
        inputSchema: addStepToolSchema,
        execute: async () => {
          // Client-side tool - execution handled by user clicking "Apply" in UI
          return { status: "pending", message: "Waiting for user to apply changes" };
        },
      }),
      removeStep: tool({
        description: toolDescriptions.removeStep,
        inputSchema: removeStepToolSchema,
        execute: async () => {
          return { status: "pending", message: "Waiting for user to apply changes" };
        },
      }),
      editStep: tool({
        description: toolDescriptions.editStep,
        inputSchema: editStepToolSchema,
        execute: async () => {
          return { status: "pending", message: "Waiting for user to apply changes" };
        },
      }),
      reorderSteps: tool({
        description: toolDescriptions.reorderSteps,
        inputSchema: reorderStepsToolSchema,
        execute: async () => {
          return { status: "pending", message: "Waiting for user to apply changes" };
        },
      }),
      updateParseConfig: tool({
        description: toolDescriptions.updateParseConfig,
        inputSchema: updateParseConfigToolSchema,
        execute: async () => {
          return { status: "pending", message: "Waiting for user to apply changes" };
        },
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

Your job is to:
1. Answer questions about the data (columns, types, values, structure)
2. Help users understand their data transformation pipeline
3. When asked to MAKE CHANGES, call the appropriate tools

IMPORTANT: Only call tools when the user wants to CHANGE or MODIFY something. For questions, explanations, and information requests, respond with text - do NOT call tools.

Examples of when to RESPOND WITH TEXT (no tools):
- "Tell me about the product column" → Describe the column's type, sample values, and what it contains
- "What columns do I have?" → List the available columns
- "What does this pipeline do?" → Explain the transformation steps
- "What sheets are available?" → List the available sheets
- "Which sheet am I viewing?" → Tell them the current sheet

Examples of when to CALL TOOLS (make changes):
- "Remove the notes column" → CALL addStep tool with remove_column
- "Sort by date desc" → CALL addStep tool with sort config
- "Switch to sheet 2" → CALL updateParseConfig tool with sheetName
- "Delete the last step" → CALL removeStep tool

You can call MULTIPLE tools in a single response to fulfill complex requests. For example:
- "clean up the data" might require: trim whitespace, remove duplicates, remove empty columns
- "prepare for analysis" might require: cast columns to correct types, remove nulls, sort by date

You have access to a previewData tool to see the current state of the data. Use it when you need to:
- Understand column names and types
- See sample values to determine appropriate transformations
- Verify the structure before making changes

Available transformation types and their configurations:

CRITICAL RULES for addStep tool:
1. You MUST provide a complete config object with ALL required fields
2. The config parameter is a NESTED OBJECT - all operation parameters must be INSIDE config, not at the top level
3. Example structure: { stepType: "fill_down", config: { columns: ["Product"] }, position: "end" }
4. WRONG: { stepType: "fill_down", columns: ["Product"] } ❌ - columns is at wrong level
5. RIGHT: { stepType: "fill_down", config: { columns: ["Product"] } } ✅ - columns inside config
6. If the user's request is missing required information (like which columns), ASK for clarification with text - do NOT call the tool

1. sort: Sort data by one or more columns
   Config REQUIRED: { columns: [{ name: string, direction: "asc"|"desc" }], nullsPosition?: "first"|"last" }
   Example: { columns: [{ name: "date", direction: "desc" }] }

2. remove_column: Remove one or more columns
   Config REQUIRED: { columns: string[] }
   Example: { columns: ["notes", "temp"] }

3. rename_column: Rename a column
   Config REQUIRED: { oldName: string, newName: string }
   Example: { oldName: "old_name", newName: "new_name" }

4. deduplicate: Remove duplicate rows
   Config OPTIONAL: {} (empty object checks all columns) OR { columns: string[] } to check specific columns
   Example: {} OR { columns: ["id"] }

5. filter: Keep/remove rows based on conditions
   Config REQUIRED: { column: string, operator: "equals"|"not_equals"|"contains"|"not_contains"|"greater_than"|"less_than"|"greater_than_or_equal"|"less_than_or_equal", value: any, mode?: "keep"|"remove" }
   Example: { column: "status", operator: "equals", value: "active", mode: "keep" }

6. trim: Remove leading/trailing whitespace
   Config REQUIRED: { columns: string[] }
   Example: { columns: ["name", "email"] }

7. uppercase: Convert to uppercase
   Config REQUIRED: { columns: string[] }
   Example: { columns: ["country_code"] }

8. lowercase: Convert to lowercase
   Config REQUIRED: { columns: string[] }
   Example: { columns: ["email"] }

9. split_column: Split a column into multiple
   Config REQUIRED: { sourceColumn: string, method: "delimiter"|"position"|"regex", newColumns: string[], delimiter?: string, positions?: number[], pattern?: string, trimResults?: boolean }
   Example: { sourceColumn: "full_name", method: "delimiter", delimiter: " ", newColumns: ["first_name", "last_name"] }

10. merge_columns: Combine multiple columns
    Config REQUIRED: { sourceColumns: string[], targetColumn: string, separator?: string, skipNulls?: boolean, keepOriginals?: boolean }
    Example: { sourceColumns: ["first_name", "last_name"], targetColumn: "full_name", separator: " " }

11. unpivot: Convert wide format to long format (columns → rows)
    Config REQUIRED: { idColumns: string[], valueColumns: string[], variableColumnName?: string, valueColumnName?: string }
    Example: { idColumns: ["id"], valueColumns: ["jan", "feb", "mar"], variableColumnName: "month", valueColumnName: "value" }

12. pivot: Convert long format to wide format (rows → columns)
    Config REQUIRED: { indexColumns: string[], columnSource: string, valueSource: string, aggregation?: "sum"|"count"|"avg"|"min"|"max" }
    Example: { indexColumns: ["id"], columnSource: "month", valueSource: "value", aggregation: "sum" }

13. cast_column: Cast column to a different type
    Config REQUIRED: { column: string, targetType: "string"|"number"|"boolean"|"date", onError?: "fail"|"null"|"skip", dateFormat?: string }
    Example: { column: "price", targetType: "number", onError: "null" }

14. fill_down: Fill empty cells with last non-empty value from above
    Config REQUIRED: { columns: string[], treatWhitespaceAsEmpty?: boolean }
    Example config object: { columns: ["category", "region"], treatWhitespaceAsEmpty: true }
    Full tool call: { stepType: "fill_down", config: { columns: ["Product"] }, position: "end" }
    CRITICAL: The columns array must be INSIDE the config object. If user says "fill down" without specifying which columns, ASK them: "Which column(s) would you like to fill down?"

15. fill_across: Fill empty cells with last non-empty value from left
    Config REQUIRED: { columns: string[], treatWhitespaceAsEmpty?: boolean }
    Example config object: { columns: ["q1", "q2", "q3", "q4"], treatWhitespaceAsEmpty: true }
    Full tool call: { stepType: "fill_across", config: { columns: ["q1", "q2"] }, position: "end" }
    CRITICAL: The columns array must be INSIDE the config object. If user says "fill across" without specifying which columns, ASK them: "Which column(s) would you like to fill across?"

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
    prompt += `\nIMPORTANT: When using updateParseConfig tool, the existing settings above will be preserved automatically. You should ONLY specify the field(s) you want to change. For example:\n`;
    prompt += `  - To switch sheets: provide ONLY sheetName parameter\n`;
    prompt += `  - To change row range: provide ONLY startRow and/or endRow parameters\n`;
    prompt += `  - All other fields will remain unchanged automatically\n`;
  }
  
  // Always mention file type (Excel with sheets or CSV without sheets)
  if (data?.availableSheets && data.availableSheets.length > 0) {
    prompt += `\nFile type: Excel workbook\n`;
    prompt += `Available sheets: ${data.availableSheets.join(", ")}\n`;
    const currentSheet = data.parseConfig?.sheetName;
    if (currentSheet) {
      prompt += `Currently viewing sheet: "${currentSheet}"\n`;
    } else {
      prompt += `Currently viewing sheet: "${data.availableSheets[0]}" (the first sheet is used by default)\n`;
    }
    prompt += `\nTo switch sheets: Call updateParseConfig with ONLY the sheetName parameter.\n`;
    prompt += `  - sheetName must be an EXACT match from the available sheets list above\n`;
    prompt += `  - Do NOT include any other text, just the exact sheet name\n`;
    prompt += `  - Do NOT include startRow, endRow, startColumn, or endColumn unless the user specifically requests to change the data range\n`;
  } else {
    prompt += `\nFile type: CSV file (no sheets - single data table)\n`;
    prompt += `  - CSV files don't have multiple sheets like Excel files\n`;
    prompt += `  - If the user asks about sheets, explain that this is a CSV file with a single data table\n`;
  }

  prompt += `\nWhen the user requests a transformation or change:
1. Determine which tool(s) to call - you can call MULTIPLE tools in one response
2. Extract the necessary parameters from the user's message
3. Call all appropriate tools with correct configuration
4. For step operations (add/edit/remove/reorder), use 0-based indexing

When the user asks a QUESTION:
1. Answer based on the context provided above (columns, steps, data, sheets)
2. Be specific and helpful
3. Do NOT call tools for questions - just respond with text

If the request is ambiguous or missing information, ask for clarification (don't call any tools).

IMPORTANT: Only call tools when the user wants to MAKE CHANGES or MODIFY the pipeline. For informational questions, just respond with text.

CRITICAL for updateParseConfig tool:
- The system automatically preserves all existing parse configuration settings
- You should ONLY provide the specific parameter(s) that need to change
- Example: To switch sheets, provide ONLY { sheetName: "SheetName" } and nothing else
- Example: To change row range, provide ONLY { startRow: 1, endRow: 100 } and nothing else
- DO NOT provide all parameters when only changing one thing
- Unnecessary parameters may override valid settings with incorrect values

Examples of CORRECT tool calls:
- "sort by date desc" → addStep({ stepType: "sort", config: { columns: [{ name: "date", direction: "desc" }] }, position: "end" })
- "remove column notes" → addStep({ stepType: "remove_column", config: { columns: ["notes"] }, position: "end" })
- "fill down the product column" → addStep({ stepType: "fill_down", config: { columns: ["Product"] }, position: "end" })
- "fill down product and category" → addStep({ stepType: "fill_down", config: { columns: ["Product", "Category"] }, position: "end" })
- "trim whitespace from name" → addStep({ stepType: "trim", config: { columns: ["name"] }, position: "end" })
- "rename old_name to new_name" → addStep({ stepType: "rename_column", config: { oldName: "old_name", newName: "new_name" }, position: "end" })

Remember: ALL operation parameters (columns, column, oldName, newName, operator, value, etc.) must be INSIDE the config object!

Other tool examples:
- "move step 3 up" → reorderSteps({ fromIndex: 2, toIndex: 1 })
- "remove the last step" → removeStep({ stepIndex: (number of steps - 1) })
- "switch to sheet Transactions" → updateParseConfig({ sheetName: "Transactions" })
- "what sheets are available?" → Just respond with text listing the sheets (no tool call)
- "which sheet am I viewing?" → Just respond with text stating the current sheet (no tool call)

IMPORTANT: When switching sheets, ONLY provide the sheetName parameter. Do NOT include startRow, endRow, startColumn, or endColumn unless the user explicitly asks to change the data range.`;

  return prompt;
}
