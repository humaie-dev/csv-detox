# Spec: Project-Based Architecture with Multi-Table Extraction
Date: 2026-02-11
ID: 017
Status: Done

## Objective
Reorganize the application around a **Project** concept where each project has a single file and multiple pipelines, with each pipeline designed to extract one table from the file. This enables users to extract multiple tables from complex CSV/spreadsheet files.

## Scope
### In scope
- Create `projects` table in Convex schema
- Migrate existing `uploads` to be owned by projects
- Refactor `pipelines` to belong to projects (not uploads)
- Update all queries/mutations to work with project-based structure
- Create project management UI (list, create, view)
- Update pipeline UI to show project context
- Data migration strategy for existing uploads/pipelines
- Keep both preview/export modes (stateless + stateful)

### Out of scope
- Multi-file projects (Phase 2 - future)
- Project sharing/collaboration features
- Project templates or duplication
- Advanced project metadata (tags, descriptions beyond name)

## Requirements
### Functional
- FR1: A Project has a name, a single file reference (upload), and many pipelines
- FR2: A Pipeline belongs to a Project and aims to output one table
- FR3: Each pipeline can have different parse configurations (sheet selection, row/column ranges)
- FR4: Users can create multiple pipelines to extract different tables from the same file
- FR5: Pipelines support both preview mode (stateless, on-demand) and execution mode (stateful, stored results)
- FR6: Projects list shows all projects with file names and pipeline counts
- FR7: Project detail page shows the file and all associated pipelines
- FR8: Users can navigate from home → project list → project detail → pipeline editor
- FR9: Existing data (uploads, pipelines) migrates seamlessly to new structure

### Non-functional
- NFR1: Zero data loss during migration
- NFR2: Backward-compatible migration (existing URLs continue working where possible)
- NFR3: Clear separation: Project = organizational unit, Pipeline = extraction strategy
- NFR4: Database queries remain efficient with proper indexing

## Current Architecture (Before)
```
uploads table:
  - _id
  - originalName
  - convexStorageId
  - parseConfig (optional)

pipelines table:
  - _id
  - name
  - uploadId → uploads._id
  - steps[]
```

**Navigation**: Upload file → Transform Data page (uploadId) → Pipeline editor

## New Architecture (After)
```
projects table:
  - _id
  - name (user-defined project name)
  - uploadId → uploads._id (the single file)
  - createdAt
  - updatedAt

uploads table: (unchanged, but now referenced by projects)
  - _id
  - originalName
  - convexStorageId
  - parseConfig (default config, can be overridden per pipeline)

pipelines table:
  - _id
  - name
  - projectId → projects._id (changed from uploadId)
  - parseConfig (optional, overrides project/upload defaults)
  - steps[]
  - createdAt
  - updatedAt
```

**Navigation**: Home → Projects list → Project detail → Pipeline editor

## Implementation Plan

### Phase 1: Database Schema and Backend (2-3 hours)
1. Update `convex/schema.ts`:
   - Add `projects` table with name, uploadId, timestamps
   - Add indexes: `by_upload`, `by_created`
   - Update `pipelines.projectId` (replace `uploadId`)
   - Add `pipelines.parseConfig` field (optional, overrides upload parseConfig)
   - Add index: `by_project`
2. Create `convex/projects.ts`:
   - `list()` - Query all projects (sorted by created date)
   - `get(id)` - Get single project with upload details
   - `create(name, uploadId)` - Create new project
   - `remove(id)` - Delete project (and cascading delete pipelines)
   - `update(id, name)` - Rename project
3. Update `convex/pipelines.ts`:
   - Change `list(uploadId)` → `list(projectId)`
   - Change `create()` to accept `projectId` instead of `uploadId`
   - Update all references to use `projectId`
4. Update `convex/uploads.ts`:
   - Keep existing functions (minimal changes)
   - Add `getUploadByProjectId()` query helper
5. Write comprehensive unit tests for new backend functions

### Phase 2: Data Migration (1 hour)
1. Create migration script: `convex/migrations/001_uploads_to_projects.ts`
   - Create one project per existing upload
   - Project name = sanitized filename (without extension)
   - Migrate all pipelines to use new projectId
   - Validate migration with rollback capability
2. Add migration runner to Convex
3. Test migration with sample data

### Phase 3: Frontend - Project Management UI (3-4 hours)
1. Create `src/app/projects/page.tsx`:
   - List all projects (card-based grid)
   - Show: project name, filename, pipeline count, created date
   - "Create New Project" button → upload flow
   - Click project → navigate to project detail
2. Create `src/app/projects/[projectId]/page.tsx`:
   - Show project name and file info
   - List all pipelines for this project
   - "Create Pipeline" button → opens pipeline creation dialog
   - Click pipeline → navigate to pipeline editor
   - "Delete Project" button (with confirmation)
3. Update `src/app/page.tsx`:
   - Change home page to redirect to `/projects` or show project list
4. Create `src/components/CreateProjectDialog.tsx`:
   - File upload field
   - Project name input (auto-populated from filename, editable)
   - Creates project + upload in one transaction

### Phase 4: Frontend - Pipeline Editor Updates (2 hours)
1. Update `src/app/pipeline/[pipelineId]/page.tsx`:
   - Fetch pipeline → project → upload (nested queries)
   - Show breadcrumb: Projects → [Project Name] → [Pipeline Name]
   - Pass project context to all components
2. Update `src/components/ParseConfigPanel.tsx`:
   - Show that parseConfig can override project defaults
   - Add "Reset to Project Defaults" button
   - Save parseConfig to pipeline (not upload)
3. Update `src/components/SavePipelineDialog.tsx`:
   - Change to accept `projectId` instead of `uploadId`

### Phase 5: Navigation and Routing (1 hour)
1. Update all route structures:
   - `/projects` - Project list
   - `/projects/new` - Create new project (upload file)
   - `/projects/[projectId]` - Project detail
   - `/projects/[projectId]/pipelines/[pipelineId]` - Pipeline editor
2. Update `src/app/upload/page.tsx`:
   - Redirect to "Create Project" flow instead
3. Remove old `/preview/[uploadId]` route (superseded by pipeline editor)

### Phase 6: Testing and Validation (2 hours)
1. End-to-end testing:
   - Create project with file upload
   - Create multiple pipelines for same project
   - Test different parseConfigs per pipeline
   - Verify data isolation between pipelines
2. Migration testing:
   - Run migration on test data
   - Verify all uploads converted to projects
   - Verify all pipelines still work
3. Performance testing:
   - Verify query performance with indexes
   - Test with 100+ projects

## Testing Plan
### Unit Tests
- `convex/projects.ts`: 8 tests (CRUD operations, validation)
- `convex/pipelines.ts`: Update 5 existing tests for projectId
- Migration script: 4 tests (create projects, migrate pipelines, rollback, validation)

### Integration Tests
- Project creation flow (file upload → project created)
- Pipeline creation within project
- ParseConfig override behavior (project default vs pipeline override)

### Manual Testing
1. Create new project from scratch
2. Upload CSV and create 3 pipelines extracting different tables
3. Upload Excel file and create pipelines for different sheets
4. Verify navigation: Projects → Project → Pipeline
5. Delete pipeline, verify project intact
6. Delete project, verify cascading delete of pipelines
7. Test migration: Run on existing data, verify no data loss

## Acceptance Criteria
- AC1: `projects` table exists with proper schema and indexes
- AC2: `pipelines.projectId` replaces `pipelines.uploadId`
- AC3: All existing uploads migrated to projects without data loss
- AC4: Projects list page shows all projects with file info
- AC5: Project detail page shows project + pipelines list
- AC6: Pipeline editor works with new project-based structure
- AC7: Users can create multiple pipelines per project
- AC8: Each pipeline can have its own parseConfig (overriding project defaults)
- AC9: Deleting project cascades to delete all pipelines
- AC10: All 466+ existing tests still pass after migration
- AC11: Navigation flow: Home → Projects → Project Detail → Pipeline Editor
- AC12: Both preview and export modes work with new structure

## Migration Strategy
### Automatic Migration (Preferred)
1. Run migration on Convex deploy:
   - Create projects table
   - For each upload: create project with name = sanitized filename
   - Update all pipelines to reference projectId
   - Validate: COUNT(uploads) = COUNT(projects), all pipelines have valid projectId
2. Keep uploads table unchanged (backward compatibility)
3. Old routes (`/preview/[uploadId]`) redirect to new routes

### Manual Migration (Fallback)
1. Admin UI to trigger migration
2. Show migration progress (projects created, pipelines updated)
3. Rollback capability if errors occur

## Design Decisions
1. **One file per project** (for now): Simplifies initial implementation, can extend later
2. **ParseConfig hierarchy**: Upload default → Pipeline override
3. **Project name auto-populated**: From filename, but user can edit
4. **Cascading deletes**: Delete project → delete all pipelines (user confirms)
5. **Keep uploads table**: Don't merge with projects (separation of concerns)
6. **Migration timing**: Automatic on schema deploy (zero-downtime)

## Future Enhancements (Out of Scope)
- Phase 2: Multi-file projects (join tables from multiple files)
- Project descriptions and metadata
- Project templates (duplicate project with pipelines)
- Sharing projects between users (when auth added)
- Project favorites/pinning
