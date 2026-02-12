# Spec: Persistent Assistant Panel
Date: 2026-02-12
ID: 019
Status: Done

## Objective
Replace the AI Assistant drawer with a permanent right-side panel on the project page, aligned with the existing pipelines panel layout.

## Scope
### In scope
- Convert the AI Assistant UI from a slide-in drawer to a persistent right-side panel.
- Update layout on the project page to accommodate a fixed assistant panel.
- Preserve existing assistant functionality (messages, tool badges, streaming, context).
- Ensure responsive behavior so the panel remains usable on smaller screens.

### Out of scope
- New assistant features or tools.
- Changes to assistant back-end routes or tool definitions.
- Redesign of pipeline panel functionality beyond layout adjustments.

## Requirements
### Functional
- FR1: Assistant is always visible as a right-side panel on the project page.
- FR2: Assistant receives the same context props (projectId, pipelineId) as before.
- FR3: Users can still view message history, tool calls, and streaming replies.
- FR4: Panel layout does not overlap main content; main content remains usable.
- FR5: On small screens, the panel behavior remains accessible (e.g., collapsible or stacked).

### Non-functional
- NFR1: No new dependencies introduced.
- NFR2: No regressions in assistant functionality or existing pipeline flows.
- NFR3: Styling follows existing shadcn/ui patterns and project conventions.

## Implementation Plan
1. Update `AssistantChat` to support a panel layout (remove Sheet usage or add a `variant="panel"` mode).
2. Adjust project page layout to include a persistent right column for the assistant panel.
3. Ensure responsive behavior (stack or collapsible on smaller viewports).
4. Update any related styles and tests if needed.

## Testing Plan
- Unit: N/A (UI change only).
- Integration: Verify assistant streaming still works on project page.
- Manual:
  - Open project page and confirm assistant panel is visible without opening a drawer.
  - Send prompts and verify tool badges, streaming, and scroll behavior.
  - Resize viewport to confirm responsive layout is usable.

## Acceptance Criteria
- AC1: Assistant panel is permanently visible on the project page.
- AC2: Assistant functionality matches previous drawer behavior.
- AC3: Layout remains usable at desktop and mobile sizes.
