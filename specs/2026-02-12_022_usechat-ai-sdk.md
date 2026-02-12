# Spec: AI SDK useChat Integration
Date: 2026-02-12
ID: 022
Status: Done

## Objective
Use the AI SDK `useChat` hook for the assistant panel to manage streaming, messages, and input state.

## Scope
### In scope
- Replace the manual fetch/stream parser in `AssistantChat` with AI SDK `useChat`.
- Preserve existing assistant UI (message list, tool badges, empty state) and context props.
- Ensure compatibility with the existing `/api/assistant/chat` route.

### Out of scope
- Changes to assistant tool definitions.
- New assistant features or UI redesign.

## Requirements
### Functional
- FR1: Assistant displays streaming responses using `useChat`.
- FR2: Messages persist in the panel during the session.
- FR3: Assistant continues to receive `projectId` and `pipelineId` context.
- FR4: Tool invocation badges still render when present in stream.

### Non-functional
- NFR1: No new dependencies introduced.
- NFR2: No regressions in assistant response streaming.

## Implementation Plan
1. Refactor `AssistantChat` to use `useChat` from `@ai-sdk/react`.
2. Pass `projectId`/`pipelineId` via `body` in `useChat` transport.
3. Convert UI messages to model messages in the chat API route.
4. Map `useChat` messages to the existing UI structure and tool badge rendering.

## Testing Plan
- Manual: Send a prompt and verify streaming text renders and tool badges appear.

## Acceptance Criteria
- AC1: `useChat` powers assistant streaming without manual parsing.
- AC2: Assistant panel renders responses and tool badges correctly.
