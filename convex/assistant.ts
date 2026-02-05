/**
 * Convex action for AI-powered intent parsing
 */

import { action } from "./_generated/server";
import { v } from "convex/values";
import { parseIntentWithAI } from "@/lib/assistant/ai-intent";

export const parseIntent = action({
  args: {
    userMessage: v.string(),
    columns: v.optional(v.array(v.string())),
    currentSteps: v.optional(v.array(v.any())),
    parseConfig: v.optional(
      v.object({
        sheetName: v.optional(v.string()),
        startRow: v.optional(v.number()),
        endRow: v.optional(v.number()),
        startColumn: v.optional(v.number()),
        endColumn: v.optional(v.number()),
        hasHeaders: v.optional(v.boolean()),
      })
    ),
  },
  handler: async (ctx, args) => {
    try {
      const proposal = await parseIntentWithAI({
        userMessage: args.userMessage,
        columns: args.columns,
        currentSteps: args.currentSteps,
        parseConfig: args.parseConfig,
      });

      return proposal;
    } catch (error) {
      console.error("Error in parseIntent action:", error);
      return {
        kind: "clarify",
        question: "I encountered an error processing your request. Please try again.",
      };
    }
  },
});
