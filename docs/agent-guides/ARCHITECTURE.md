# Architecture Guide — CSV Detox

Comprehensive system architecture documentation for CSV Detox.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [System Architecture](#system-architecture)
- [Data Flow](#data-flow)
- [Folder Structure](#folder-structure)
- [Database Schema](#database-schema)
- [Key Components](#key-components)
- [Integration Patterns](#integration-patterns)
- [Performance Considerations](#performance-considerations)

---

## Overview

CSV Detox is a **transformation pipeline engine** for cleaning and transforming CSV/XLSX files.

### Core Capabilities

1. **File Upload** — CSV and XLSX files up to 50MB
2. **Parsing** — Flexible parsing with configurable options
3. **Transformation Pipelines** — Chain multiple operations
4. **Preview** — Server-side preview (5,000 row limit)
5. **Export** — Client-side processing for unlimited rows
6. **AI Assistant** — Help users build transformation pipelines

### Design Principles

- **Server-side for preview** — Fast, 5,000 row limit
- **Client-side for export** — Handles large files in-browser
- **Type-safe** — TypeScript strict mode throughout
- **Modular** — Clear separation of concerns
- **Testable** — Pure functions, minimal side effects

---

## Tech Stack

### Frontend

- **Next.js** — React framework (App Router)
- **React** — UI library
- **TypeScript** — Type safety (strict mode)
- **Tailwind CSS** — Styling
- **shadcn/ui** — UI component library

### Backend

- **Convex** — Backend-as-a-service (database + storage + functions)
- **SQLite** (via better-sqlite3) — Server-side data transformation

### Data Processing

- **better-sqlite3** — Server-side SQLite (preview, fast queries)
- **xlsx** — XLSX file parsing
- **Papa Parse** — CSV parsing (future)

### AI & Assistant

- **AI SDK** — Vercel AI SDK for streaming
- **Azure OpenAI** — GPT models via @ai-sdk/azure

### Testing

- **Node.js test runner** — Unit/integration tests
- **tsx** — TypeScript test execution
- **Playwright** — E2E browser testing

---

## System Architecture

### Architecture Layers

**Browser Layer**:
- Next.js pages (React UI)
- Client-side export processing
- AI assistant chat interface

**Next.js Server Layer**:
- API routes (file upload, data operations)
- SQLite processing (preview operations)
- AI SDK routes (streaming chat)

**Convex Layer**:
- Database (project metadata, pipeline definitions)
- File storage (raw uploaded files)
- Server functions (mutations and queries)

### Request Flows

#### File Upload
1. User uploads file via Next.js UI
2. UI calls Convex generateUploadUrl mutation
3. File uploads directly to Convex Storage
4. uploadFile mutation stores metadata in Convex database
5. UI displays uploaded file

#### Preview (Server-Side, 5K rows)
1. User selects pipeline in UI
2. Next.js API route receives request
3. File downloaded from Convex Storage
4. Data loaded into SQLite in-memory database
5. Transformations applied via SQL operations
6. Results limited to 5,000 rows
7. JSON returned to React UI

#### Export (Client-Side, Unlimited)
1. User clicks Export button
2. Browser downloads file from Convex Storage
3. Client-side processing initializes in browser
4. File parsed and transformations applied
5. CSV/XLSX generated in-browser
6. File downloaded to user's machine

#### AI Assistant
1. User types message in chat UI
2. Message sent to `/api/assistant/chat` route
3. AI SDK converts UI messages to model format
4. Request streamed to Azure OpenAI
5. AI calls tools (getDataSummary, listSheets, getSheetSummary, etc.) as needed
6. Tools query Convex metadata and SQLite
7. Pipeline changes require explicit user confirmation before tool execution
7. Response streamed back to UI
8. useChat hook renders messages in real-time

---

## Data Flow

### Upload → Parse → Transform → Export

**1. Upload**: User uploads CSV/XLSX file via browser

**2. Store**: File stored in Convex Storage, metadata saved in Convex Database

**3. Parse**: File parsed (CSV or XLSX), headers extracted, parse config saved (sheet selection, cell range, etc.)

**4. Pipeline**: User builds transformation pipeline using UI (Trim, Filter, Sort, Cast operations), steps stored in Convex Database

**5. Preview**: SQLite processes first 5,000 rows server-side for fast real-time preview

**6. Export**: Client-side processing of full file in browser (unlimited rows), downloads as CSV/XLSX

---

## Folder Structure

### Key Directories

```
csv-detox-opencode-starter/
├── convex/
│   ├── schema.ts            # Database schema definitions
│   ├── mutations.ts         # Write operations
│   ├── queries.ts           # Read operations
│   └── _generated/          # Auto-generated TypeScript types
├── docs/
│   ├── agent-guides/        # Agent documentation
│   └── internal/            # Internal docs (PATTERNS.md, etc.)
├── e2e/                     # Playwright E2E tests
└── src/
    ├── app/                 # Next.js App Router
    │   ├── api/             # API routes
    │   ├── projects/[id]/   # Dynamic routes (projects)
    │   ├── layout.tsx       # Root layout
    │   └── page.tsx         # Home page
    ├── components/          # React components
    │   └── ui/              # shadcn/ui components
    └── lib/                 # Pure business logic
        ├── transformations/ # Transformation functions
        ├── sqlite/          # SQLite operations
        └── __tests__/       # Unit tests (co-located)
```

### Directory Patterns

| Directory | Purpose | Guidelines |
|-----------|---------|------------|
| `src/lib/**` | Pure business logic | No React, no side effects, highly testable |
| `src/app/**` | Next.js pages/routes | Thin handlers, delegate to `lib/` |
| `src/app/api/**` | API endpoints | RESTful routes (e.g., `api/upload/route.ts`) |
| `src/app/[param]/` | Dynamic routes | Use Next.js conventions for params |
| `src/components/**` | React components | Application-specific UI |
| `src/components/ui/**` | shadcn/ui primitives | Auto-generated, can customize after install |
| `convex/**` | Backend functions | Mutations (write), queries (read) |
| `e2e/**` | E2E tests | `*.spec.ts` files |
| `**/__tests__/**` | Unit tests | `*.test.ts` files, co-located with code |

---

## Database Schema

### Convex Database (Metadata)

Convex stores project metadata, pipeline definitions, and file references.

**Schema location**: `convex/schema.ts`

**Key tables**:
- `uploads` — File metadata and Convex storage references
- `projects` — Project definitions linked to uploads
- `pipelines` — Transformation pipeline steps
- `sqliteArtifacts` — SQLite snapshot metadata (Convex storage ID + checksum)

See `convex/schema.ts` for complete type definitions and validators.

### SQLite (Server-Side Data Storage)

**Purpose**: Server-side data transformation and preview

**How it works**:
1. Raw file data is downloaded from Convex Storage
2. Parsed into structured format (headers + rows)
3. Loaded into SQLite file on `/tmp` (serverless-safe)
4. SQLite database file is uploaded to Convex Storage as an artifact
5. Future requests download the artifact into `/tmp` if missing/outdated
6. Transformations applied via SQL operations
7. Results queried and returned (preview limited to 5,000 rows)

**Storage modes**:
- **Artifact-backed** (`/tmp/<projectId>.db`) — Cached per request, hydrated from Convex Storage
- **Ephemeral sheet previews** — On-demand Excel sheet parsing into a temporary SQLite DB (not persisted)

**Artifact cache behavior**:
- Source of truth: `sqliteArtifacts` metadata + Convex storage file
- `/tmp` cache is rehydrated when metadata mismatch is detected
- Safe to rebuild at any time (serverless ephemeral storage)

**On-demand sheet access (Excel)**:
- The assistant can list sheets from the original upload via server-side services (not Convex actions).
- When a user asks about a specific sheet, the assistant:
  1. Checks if the current SQLite artifact already matches that sheet.
  2. Looks for a cached artifact for that sheet.
  3. If missing, parses only the requested sheet into a temporary SQLite DB.
  4. Uses SQLite-backed tools to summarize columns/rows.
  5. Cleans up the temporary DB after the request.
- This keeps full-sheet data out of the prompt and relies on sampling/aggregation.

**Convex memory rule**:
- Do not open uploaded files inside Convex actions.
- Convex actions have a 64MB memory limit; large Excel files will fail when loaded into memory.
- File access (downloads/parsing) must happen in server-side API routes or shared services.

**Pipeline mutation confirmation UX**:
- The assistant must summarize intended pipeline changes and ask for explicit confirmation.
- Create/update/delete tools require a `confirmed: true` flag after user approval.

**Table structure**:
```sql
CREATE TABLE data (
  [column1] TEXT,
  [column2] TEXT,
  [column3] TEXT,
  -- Dynamic columns based on file headers
  -- All values stored as TEXT for flexibility
);
```

**Pipeline tables** (for transformation steps):
```sql
CREATE TABLE pipeline_<id> (
  [column1] TEXT,
  [column2] TEXT,
  -- Same structure as source data table
);
```

**Lifetime**:
- In-memory databases: Request duration only
- File-based databases: Cleaned up after request or on error
- Temporary sheet databases: Created per request and deleted after use

**Transformations**:
- Applied as SQL UPDATE/DELETE/INSERT statements
- Example: `UPDATE data SET "Name" = TRIM("Name")`
- Results stored in pipeline tables for multi-step transformations

---

## Key Components

### Frontend

- **`src/components/`** — React UI components (AI assistant, data tables, pipeline builders)
- **`src/components/ui/`** — shadcn/ui primitives (Button, Card, Dialog, etc.)
  - Install via: `npx shadcn@latest add <component>`
  - Customizable after installation

### Backend

- **`convex/mutations.ts`** — Write operations (create/update/delete)
- **`convex/queries.ts`** — Read operations (list/get data)
- **`src/app/api/`** — Next.js API routes
  - `api/assistant/chat/route.ts` — AI assistant streaming endpoint
  - `api/upload/route.ts` — File upload handling (if needed)

### Core Logic

- **`src/lib/sqlite/`** — SQLite operations (preview, transformations)
- **`src/lib/transformations/`** — Transformation functions (trim, filter, sort, etc.)
- **`src/lib/csv-parser.ts`** — CSV/XLSX parsing utilities

---

## Integration Patterns

See `docs/internal/PATTERNS.md` for detailed integration patterns including:
- Convex queries and mutations
- File upload flow
- AI SDK streaming
- React component patterns

---

## Performance Considerations

### Preview vs Export

| Aspect | Preview (SQLite) | Export (Client-Side) |
|--------|------------------|----------------------|
| **Location** | Server | Browser |
| **Row Limit** | 5,000 | Unlimited |
| **Speed** | Very fast | Fast (depends on file size) |
| **Use Case** | Real-time preview | Final download |
| **Memory** | Server RAM | Browser RAM (4GB max) |

### Memory Optimization

**Server-Side (SQLite)**
- In-memory database (fast)
- 5,000 row hard limit
- Automatically cleaned up after request

**Client-Side (Export)**
- In-browser processing
- Streaming file download
- Memory-efficient transformations
- Cleanup on errors

### File Size Limits

- **Upload**: 50MB max (Convex limit)
- **Preview**: 5,000 rows (performance)
- **Export**: Browser memory limit (~4GB)

### Scaling Considerations

**Current Scale**
- Single user per browser session
- Files up to 50MB
- Thousands of rows processed client-side

**Future Scale** (if needed)
- Server-side export for very large files
- Background job processing
- Chunked processing
- CDN for file downloads

---

## Security Considerations

### File Upload
- Size validation (50MB max)
- MIME type validation
- Sanitized filenames
- Convex handles storage security

### Data Privacy
- **Never log raw user data**
- Files processed in-memory (no persistence beyond Convex)
- Client-side processing (data never leaves browser for export)

### API Security
- Convex handles authentication (when configured)
- Rate limiting via Convex
- Input validation at boundaries

---

## Future Architecture Considerations

### Potential Enhancements

1. **Streaming Export** — For files >4GB
2. **Web Workers** — Offload processing to worker thread
3. **Incremental Processing** — Process file in chunks
4. **Caching** — Cache parsed results
5. **Real-time Collaboration** — Multiple users per project

### Technology Migrations

If needed in future:
- Postgres for relational queries (available via Convex)
- Separate backend API (if needed)
- CDN for static assets

---

## Reference

### Related Documentation

- [PATTERNS.md](../internal/PATTERNS.md) — Coding patterns
- [COMMON_TASKS.md](./COMMON_TASKS.md) — Implementation examples
- [TESTING.md](./TESTING.md) — Testing patterns

### External Resources

- [Next.js App Router Docs](https://nextjs.org/docs/app)
- [Convex Documentation](https://docs.convex.dev)
- [AI SDK Docs](https://sdk.vercel.ai/docs)
- [shadcn/ui](https://ui.shadcn.com/docs)

---

**Questions about architecture?** Check [INDEX.md](./INDEX.md) for other guides or ask the Plan Agent.
