# CSV Detox

A transformation pipeline engine for cleaning and transforming CSV/XLSX files.

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Initialize Convex (First Time)
```bash
npx convex dev
```
This will:
- Prompt you to login or create a free Convex account
- Set up your Convex project
- Generate your `.env.local` file with the Convex URL
- Start the Convex development server

### 3. Run the Development Server
In a separate terminal:
```bash
npm run dev
```

### 4. Open the App
Visit [http://localhost:3000](http://localhost:3000) and upload a CSV or XLSX file!

## Features (Current)

- ✅ File upload (CSV and XLSX, up to 50MB)
- ✅ Drag-and-drop interface
- ✅ File validation (type and size)
- ✅ Convex backend with database-generated file IDs
- ✅ Secure file storage in Convex

## Documentation

- **Setup Guide**: `docs/internal/CONVEX_SETUP.md`
- **Architecture**: `docs/internal/PATTERNS.md`
- **Project Memory**: `MEMORY.md`
- **Specs**: `specs/`

## Tech Stack

- Next.js 15 (App Router)
- React 19
- TypeScript (strict mode)
- Convex (backend + database + file storage)
- Postgres (via Convex integration, available for future features)

## Development Guidelines

See `AGENTS.md` for complete development guidelines including:
- Spec-driven development workflow
- Code style and conventions
- Testing requirements
- Quality gates

## GitHub Automation

CSV Detox includes an automated PR agent powered by OpenCode:

- **Auto-triage**: Reviews new PRs, runs tests, provides feedback
- **Auto-implement**: Implements features when PRs are assigned
- **Interactive**: Comment `@opencode <instruction>` on any PR for help

See `.github/workflows/README.md` for setup instructions and usage examples.

## Agent rules (OpenCode)
- Repo rules: `AGENTS.md`
- Project memory: `MEMORY.md`
- Specs: `/specs`
- Pattern registry: `docs/internal/PATTERNS.md`
- Public docs: `docs/public/`
