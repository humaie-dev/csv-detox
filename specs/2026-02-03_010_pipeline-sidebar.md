# Spec: Pipeline Management Sidebar

Date: 2026-02-03
ID: 010
Status: Done

## Objective
Add a sidebar on the preview page that allows users to save, view, list, switch between, and delete transformation pipelines for the current file.

## Scope

### In scope
- Sidebar UI on left side of preview page
- Save current pipeline with a name
- List all saved pipelines for current upload
- Switch between pipelines (loads pipeline steps)
- Delete saved pipelines
- Show active/selected pipeline
- Collapse/expand sidebar
- Store pipelines in Convex database

### Out of scope
- Sharing pipelines between different files
- Exporting/importing pipeline definitions as JSON
- Pipeline templates or library
- Versioning/history of pipeline changes
- Duplicate/clone pipeline feature
- Renaming pipelines (can delete and re-save)

## Requirements

### Functional Requirements

#### FR1: Pipeline Storage (Convex)
- Create `pipelines` table in Convex schema
- Store: pipeline name, upload ID, steps array, created timestamp
- Each pipeline belongs to one upload
- Pipeline names must be unique per upload

#### FR2: Sidebar UI
- Sidebar on left side of preview page
- Shows list of saved pipelines for current file
- Collapsible (chevron icon to expand/collapse)
- Default state: expanded
- Pipeline list items show:
  - Pipeline name
  - Number of steps (e.g., "5 steps")
  - Active indicator (highlight current pipeline)
  - Delete button (trash icon)

#### FR3: Save Pipeline
- "Save Pipeline" button above pipeline steps
- Opens dialog to enter pipeline name
- Validation: name required, max 50 characters
- Success: adds to sidebar list
- Error: shows validation error

#### FR4: Switch Pipeline
- Click pipeline in sidebar to load it
- Replaces current pipeline steps with saved steps
- Updates preview to show transformed data
- Visual indicator shows active pipeline

#### FR5: Delete Pipeline
- Trash icon on each pipeline list item
- Confirmation dialog: "Delete '[name]'?"
- On confirm: removes from database and sidebar
- Cannot delete if it's the only pipeline (optional safeguard)

#### FR6: Empty State
- If no pipelines saved: show message "No saved pipelines"
- Show "Save current pipeline" call-to-action

### Non-Functional Requirements

#### NFR1: Performance
- Loading pipeline list: < 500ms
- Switching pipelines: < 1s (includes preview refresh)
- Saving pipeline: < 500ms

#### NFR2: UX
- Sidebar width: 280px (collapsed: 0px with toggle button)
- Smooth collapse/expand animation
- Clear active pipeline indicator
- Confirmation before destructive actions

#### NFR3: Data Integrity
- Pipeline steps validated before save
- Handle missing/invalid steps gracefully

## Design

### Convex Schema
```typescript
// convex/schema.ts
pipelines: defineTable({
  name: v.string(),
  uploadId: v.id("uploads"),
  steps: v.array(v.any()), // TransformationStep[]
  createdAt: v.number(),
})
  .index("by_upload", ["uploadId"])
```

### UI Layout
```
┌─────────────────────────────────────────────────┐
│  [≡] CSV Detox                       [Export]   │
├──────────┬──────────────────────────────────────┤
│ Pipelines│  Pipeline Steps          Data Preview│
│          │                                       │
│ [Save +] │  [Add Step]                          │
│          │  1. Trim                             │
│ ▸ Basic  │  2. Fill Down                        │
│   5 steps│  3. Sort                             │
│   [🗑]   │                                       │
│          │                                       │
│ ▸ Clean  │                                       │
│   3 steps│                                       │
│   [🗑]   │                                       │
│          │                                       │
└──────────┴──────────────────────────────────────┘
```

### Component Structure
```
src/components/PipelineSidebar.tsx       (new)
src/components/SavePipelineDialog.tsx    (new)
src/components/DeletePipelineDialog.tsx  (new, or reuse confirmation)
```

### Convex Functions
```
convex/pipelines.ts                      (new)
  - query: list(uploadId) → Pipeline[]
  - mutation: create(uploadId, name, steps)
  - mutation: delete(id)
```

## Testing Plan

### Unit Tests (Optional for UI-heavy features)
- Convex mutations validation
- Pipeline name validation

### Integration/Manual Tests
1. **Save Pipeline**
   - Save pipeline with valid name → appears in sidebar
   - Save with duplicate name → error message
   - Save with empty name → validation error
   - Save with 50-character name → succeeds
   - Save with 51-character name → validation error

2. **List Pipelines**
   - Navigate to file with 0 pipelines → shows empty state
   - Navigate to file with 3 pipelines → shows all 3
   - Pipeline list shows correct step counts

3. **Switch Pipeline**
   - Click pipeline A → loads A's steps
   - Click pipeline B → loads B's steps
   - Preview updates to show B's transformed data
   - Active indicator moves to B

4. **Delete Pipeline**
   - Click delete on pipeline → shows confirmation
   - Confirm → pipeline removed from sidebar
   - Cancel → pipeline remains

5. **Sidebar Collapse**
   - Click collapse icon → sidebar collapses
   - Click expand icon → sidebar expands
   - State persists during session

6. **Multi-Upload Isolation**
   - Upload file X, save pipeline "Clean"
   - Upload file Y, save pipeline "Clean"
   - Navigate to file X → only shows X's pipelines
   - Navigate to file Y → only shows Y's pipelines

## Acceptance Criteria

- [ ] User can save current pipeline with a name
- [ ] User can see list of all saved pipelines for current file
- [ ] User can click a pipeline to load it
- [ ] User can delete a pipeline with confirmation
- [ ] Sidebar can be collapsed and expanded
- [ ] Active pipeline is visually indicated
- [ ] Pipeline list shows step count for each pipeline
- [ ] Empty state shown when no pipelines saved
- [ ] Pipelines are isolated per upload (not shared across files)
- [ ] All Convex mutations succeed
- [ ] No console errors or warnings

## Dependencies
- Convex database (already set up)
- shadcn/ui components (Dialog, Button, already installed)
- Current preview page structure

## Rollout Plan
1. Create Convex schema and functions
2. Build PipelineSidebar component
3. Build SavePipelineDialog component  
4. Integrate into preview page
5. Manual testing
6. Update MEMORY.md
