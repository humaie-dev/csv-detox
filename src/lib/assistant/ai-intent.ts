/**
 * AI-powered intent parser using Azure OpenAI via AI SDK
 * Replaces the rule-based parser with LLM-based natural language understanding
 */

import { createAzure } from "@ai-sdk/azure";
import { generateText } from "ai";
import type { Proposal, ParseContext } from "./intent";
import {
  addStepToolSchema,
  removeStepToolSchema,
  editStepToolSchema,
  reorderStepsToolSchema,
  updateParseConfigToolSchema,
  toolDescriptions,
} from "./tools";

export interface ParseIntentParams extends ParseContext {
  userMessage: string;
}

/**
 * Parse user intent using Azure OpenAI with function calling
 */
export async function parseIntentWithAI(
  params: ParseIntentParams
): Promise<Proposal> {
  const {
    AZURE_OPENAI_ENDPOINT,
    AZURE_OPENAI_API_KEY,
    AZURE_OPENAI_DEPLOYMENT,
  } = process.env;

  if (!AZURE_OPENAI_ENDPOINT || !AZURE_OPENAI_API_KEY || !AZURE_OPENAI_DEPLOYMENT) {
    throw new Error(
      "Azure OpenAI environment variables not configured. Please set AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY, and AZURE_OPENAI_DEPLOYMENT."
    );
  }

  const azure = createAzure({
    apiKey: AZURE_OPENAI_API_KEY,
    resourceName: extractResourceName(AZURE_OPENAI_ENDPOINT),
  });

  const model = azure(AZURE_OPENAI_DEPLOYMENT);

  const systemPrompt = buildSystemPrompt(params);

  try {
    const result = await generateText({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: params.userMessage },
      ],
      tools: {
        addStep: {
          description: toolDescriptions.addStep,
          inputSchema: addStepToolSchema,
          execute: async (args) => args,
        },
        removeStep: {
          description: toolDescriptions.removeStep,
          inputSchema: removeStepToolSchema,
          execute: async (args) => args,
        },
        editStep: {
          description: toolDescriptions.editStep,
          inputSchema: editStepToolSchema,
          execute: async (args) => args,
        },
        reorderSteps: {
          description: toolDescriptions.reorderSteps,
          inputSchema: reorderStepsToolSchema,
          execute: async (args) => args,
        },
        updateParseConfig: {
          description: toolDescriptions.updateParseConfig,
          inputSchema: updateParseConfigToolSchema,
          execute: async (args) => args,
        },
      },
      toolChoice: "auto",
    });

    // Check if any tools were called
    if (result.toolCalls && result.toolCalls.length > 0) {
      const toolCall = result.toolCalls[0];
      return convertToolCallToProposal(toolCall);
    }

    // If no tools called, return clarification
    return {
      kind: "clarify",
      question: result.text || "I'm not sure how to help with that. Could you please rephrase your request?",
    };
  } catch (error) {
    console.error("Error parsing intent with AI:", error);
    return {
      kind: "clarify",
      question: "I encountered an error processing your request. Please try rephrasing it or use a simpler command.",
    };
  }
}

/**
 * Extract resource name from Azure OpenAI endpoint URL
 */
function extractResourceName(endpoint: string): string {
  const match = endpoint.match(/https:\/\/(.+?)\.openai\.azure\.com/);
  if (!match) {
    throw new Error(`Invalid Azure OpenAI endpoint format: ${endpoint}`);
  }
  return match[1];
}

/**
 * Build system prompt with context about available columns, steps, and config
 */
function buildSystemPrompt(params: ParseIntentParams): string {
  let prompt = `You are an AI assistant helping users build data transformation pipelines for CSV/Excel files.

Your job is to interpret natural language requests and call the appropriate tools to modify the pipeline.

Available transformation types:
- sort: Sort data by one or more columns (ascending/descending, nulls first/last)
- remove_column: Remove one or more columns
- rename_column: Rename a column
- deduplicate: Remove duplicate rows (by all columns or specific columns)
- filter: Keep/remove rows based on conditions (equals, not_equals, contains, not_contains, greater_than, less_than)
- trim: Remove leading/trailing whitespace from string columns
- uppercase: Convert string columns to uppercase
- lowercase: Convert string columns to lowercase
- split_column: Split a column into multiple columns (by delimiter, position, or regex)
- merge_columns: Combine multiple columns into one
- unpivot: Convert wide format to long format (columns → rows)
- pivot: Convert long format to wide format (rows → columns)
- cast_column: Cast column to a different type (string, number, boolean, date)
- fill_down: Fill empty cells with the last non-empty value from above
- fill_across: Fill empty cells with the last non-empty value from left

`;

  if (params.columns && params.columns.length > 0) {
    prompt += `\nAvailable columns in the dataset: ${params.columns.join(", ")}\n`;
  }

  if (params.currentSteps && params.currentSteps.length > 0) {
    prompt += `\nCurrent pipeline steps (${params.currentSteps.length} steps):\n`;
    params.currentSteps.forEach((step, idx) => {
      prompt += `  ${idx + 1}. ${step.type}\n`;
    });
  } else {
    prompt += `\nCurrent pipeline is empty (no steps yet).\n`;
  }

  if (params.parseConfig) {
    prompt += `\nCurrent parse configuration:\n`;
    if (params.parseConfig.sheetName) {
      prompt += `  - Sheet: ${params.parseConfig.sheetName}\n`;
    }
    if (params.parseConfig.startRow || params.parseConfig.endRow) {
      prompt += `  - Rows: ${params.parseConfig.startRow || 1} to ${params.parseConfig.endRow || "end"}\n`;
    }
    if (params.parseConfig.startColumn || params.parseConfig.endColumn) {
      prompt += `  - Columns: ${params.parseConfig.startColumn || 1} to ${params.parseConfig.endColumn || "end"}\n`;
    }
    prompt += `  - Has headers: ${params.parseConfig.hasHeaders ?? true}\n`;
  }

  prompt += `\nWhen the user requests a transformation:
1. Determine which tool to call
2. Extract the necessary parameters from the user's message
3. Call the appropriate tool with correct configuration
4. For step operations (add/edit/remove/reorder), use 0-based indexing
5. If the request is ambiguous or missing information, respond with text asking for clarification (don't call any tools)

Examples:
- "sort by date desc" → addStep with sort config
- "remove column notes" → addStep with remove_column config
- "move step 3 up" → reorderSteps from index 2 to index 1
- "use sheet Transactions" → updateParseConfig with sheetName`;

  return prompt;
}

/**
 * Convert AI SDK tool call to our Proposal type
 */
function convertToolCallToProposal(toolCall: any): Proposal {
  const { toolName, args } = toolCall;

  switch (toolName) {
    case "addStep":
      return {
        kind: "add_step",
        step: {
          config: { type: args.stepType, ...args.config },
          position: args.position ?? "end",
        },
      };

    case "removeStep":
      return {
        kind: "remove_step",
        stepIndex: args.stepIndex,
      };

    case "editStep":
      return {
        kind: "edit_step",
        stepIndex: args.stepIndex,
        newConfig: args.newConfig,
      };

    case "reorderSteps":
      return {
        kind: "reorder_steps",
        from: args.fromIndex,
        to: args.toIndex,
      };

    case "updateParseConfig":
      return {
        kind: "update_parse_config",
        changes: {
          ...(args.sheetName !== undefined && { sheetName: args.sheetName }),
          ...(args.startRow !== undefined && { startRow: args.startRow }),
          ...(args.endRow !== undefined && { endRow: args.endRow }),
          ...(args.startColumn !== undefined && { startColumn: args.startColumn }),
          ...(args.endColumn !== undefined && { endColumn: args.endColumn }),
          ...(args.hasHeaders !== undefined && { hasHeaders: args.hasHeaders }),
        },
      };

    default:
      return {
        kind: "clarify",
        question: `Unknown tool called: ${toolName}. Please try a different command.`,
      };
  }
}
