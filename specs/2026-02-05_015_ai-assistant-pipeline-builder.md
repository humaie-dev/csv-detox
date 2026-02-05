# Spec 015 — AI Assistant Pipeline Builder
Date: 2026-02-05
ID: 015
Status: Complete

## Implementation Status
- ✅ Phase 1: Rule-based intent parser (SKIPPED - replaced by Phase 2)
- ✅ Phase 2: LLM-backed assistant with Azure OpenAI + AI SDK (COMPLETE)
- ✅ Phase 3: UI integration (chat panel, confirmation flow, undo) (COMPLETE)

## Phase 3 Summary (Completed 2026-02-05)
Created full-featured chat UI with confirmation flow and undo:
- Updated: `src/components/AssistantPanel.tsx` - Full chat interface with AI integration
- Updated: `src/app/pipeline/[pipelineId]/page.tsx` - Wired assistant with proposal handlers
- Features: Natural language commands, AI proposals, user confirmation, automatic preview updates, undo functionality

## Phase 2 Summary (Completed 2026-02-05)
Replaced rule-based intent parser with Azure OpenAI function calling:
- Installed: `ai`, `@ai-sdk/azure`, `zod`
- Created: `src/lib/assistant/ai-intent.ts` - AI-powered parser
- Created: `src/lib/assistant/tools.ts` - Tool schemas for function calling
- Created: `convex/assistant.ts` - Convex action wrapper
- Updated: `src/lib/assistant/intent.ts` - Extended proposal types
- Removed: Old rule-based parser and unit tests
- Environment: Requires AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY, AZURE_OPENAI_DEPLOYMENT

## Objective
Enable users to configure pipelines by chatting with an assistant on the pipeline management screen. The assistant can add, remove, edit, and reorder steps, adjust parser config, and leverage the current preview at each step to make informed changes.

## Scope
### In Scope
- Chat panel on the pipeline screen (`/pipeline/[pipelineId]`) with assistant messages and user input.
- Assistant capabilities (tooling) limited to safe, deterministic actions:
  - `addStep`, `removeStep`, `editStep`, `reorderSteps` on the active pipeline.
  - `updateParseConfig` for the associated upload.
  - `previewAt(stepIndex)` to view current data snapshot for context and user confirmation.
- Phase 2: LLM-backed assistant (Azure OpenAI) via Convex action with strict tool schema.

### Out of Scope
- Long-running or background jobs.
- Changes to existing transformation algorithms.

## Functional Requirements
- FR1: Show a chat panel alongside the existing pipeline UI.
- FR2: User can type natural-language requests like "sort by date desc then by amount asc", "remove column notes", "move step 3 above step 1".
- FR3: Assistant parses intent and proposes the concrete change(s) with a human-readable summary before applying.
- FR4: User must confirm before the assistant mutates the pipeline.
- FR5: After apply, preview automatically updates to the selected step or last step.
- FR6: Assistant can request a small data sample (up to 20 rows, first 10 columns) from `previewAt(index)` to reason about column names and types.
- FR7: Assistant can adjust parse config (sheet/row/column ranges, headers) with confirmation.
- FR8: All assistant actions must be undoable via a "Revert last change" command.

## Non-functional Requirements
- NFR1: Reuse shadcn/ui and existing app infrastructure.
- NFR2: Intent parser falls back to asking clarifying questions when ambiguous.
- NFR3: Never send raw row data to logs; only keep ephemeral state in-memory.
- NFR4: Maintain performance parity with current preview (no additional Convex load beyond existing actions and small samples).

## Design Overview
- UI: A right-side chat panel that collapses on mobile. Messages rendered using shadcn/ui components. System/assistant messages styled subtly.
- Intent Parsing (Phase 2 - IMPLEMENTED):
  - Azure OpenAI function calling with GPT-4o (or configured deployment)
  - 5 tools exposed to LLM: addStep, removeStep, editStep, reorderSteps, updateParseConfig
  - Supports 15 transformation types (sort, filter, remove_column, rename_column, deduplicate, etc.)
  - Contextual system prompt includes: available columns, current steps, parse config
  - Natural language understanding handles complex/ambiguous requests
  - Returns structured Proposal objects for UI confirmation flow
- Tooling Gateway (Phase 2 - IMPLEMENTED):
  - Convex action (`convex/assistant.ts`) calls Azure OpenAI with tool schemas
  - Environment variables for secure credential management
  - Same Proposal type ensures backward compatibility

## UX Flow
1) User types a request.
2) Assistant parses intent, performs a dry-run transformation against current in-memory state and small preview sample.
3) Assistant replies with the concrete change summary and optional preview snippet (e.g., first 5 rows after change).
4) User clicks "Apply".
5) Pipeline state updates; preview refreshes; assistant posts a success message with result summary and an "Undo" option.

## Data Access and Safety
- Sampling limited to at most 20 rows × 10 columns for assistant reasoning.
- No data persisted by the assistant beyond the normal pipeline save flow.
- Errors always surfaced in chat with actionable guidance.

## Testing Plan
- Phase 2 (AI-powered parser) - COMPLETE:
  - Manual testing required (LLM calls are non-deterministic)
  - Test via Convex action with real Azure OpenAI credentials
  - See `src/lib/assistant/__tests__/README.md` for test scenarios
- Phase 3 (UI integration) - TODO:
  - Manual integration testing on `/pipeline/[pipelineId]`
  - Confirm panel renders, commands propose changes, confirmation applies, preview updates
  - Confirm "Undo last change" works

## Acceptance Criteria
- AC1: Chat panel appears on the pipeline page and works on desktop and mobile (collapsible).
- AC2: For at least 7 command types (sort, remove column, rename column, deduplicate, filter, reorder step, parse config), the assistant proposes a correct change summary before apply.
- AC3: No changes are applied without user confirmation.
- AC4: Preview updates immediately after apply; errors are shown in chat.
- AC5: Undo last change works for all assistant-initiated mutations.
- AC6: Build and tests pass with new AI SDK dependencies.

## Phased Implementation
1. Phase 1: Rule-based assistant (SKIPPED - replaced by Phase 2)
2. ✅ Phase 2: LLM-backed assistant (Azure OpenAI + AI SDK) via Convex action - COMPLETE
3. ⏳ Phase 3: UI integration (AssistantPanel component, confirmation flow, undo) - NEXT

## Work Items
### Phase 2 (COMPLETE)
- ✅ Install AI SDK packages (`ai`, `@ai-sdk/azure`, `zod`)
- ✅ Create `src/lib/assistant/ai-intent.ts` - AI-powered intent parser
- ✅ Create `src/lib/assistant/tools.ts` - Tool schemas for function calling
- ✅ Create `convex/assistant.ts` - Convex action wrapper
- ✅ Update `src/lib/assistant/intent.ts` - Extended proposal types
- ✅ Remove old rule-based parser
- ✅ Update `.env.local.example` with Azure OpenAI variables

### Phase 3 (TODO)
- Create `src/components/AssistantPanel.tsx` using shadcn/ui
- Add panel to `src/app/pipeline/[pipelineId]/page.tsx` layout
- Wire tooling functions to pipeline state with dry-run/confirm/apply and undo
- Implement undo stack for assistant mutations
