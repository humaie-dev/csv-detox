# Spec: Assistant Streaming Display Fix
Date: 2026-02-12
ID: 021
Status: Done

## Objective
Ensure AI Assistant responses render in the panel by handling additional stream formats from the server response.

## Scope
### In scope
- Update client-side stream parsing to handle both `0:` and `data:` prefixed lines.
- Provide a safe fallback for plain text chunks.

### Out of scope
- Changes to server-side assistant routes or tool definitions.
- UI redesign of the assistant panel.

## Requirements
### Functional
- FR1: Assistant response text is displayed as it streams.
- FR2: Works with both `0:` and `data:` stream prefixes.
- FR3: Plain text chunks still render if no prefix is provided.

### Non-functional
- NFR1: No new dependencies introduced.
- NFR2: Preserve existing tool badge behavior and message history.

## Implementation Plan
1. Update stream parsing in `AssistantChat` to support `data:` and raw text.
2. Keep existing `0:` parsing logic intact.

## Testing Plan
- Manual: Send a prompt and confirm assistant text appears during streaming.

## Acceptance Criteria
- AC1: Assistant panel shows the streamed response text in real time.
