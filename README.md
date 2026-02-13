# CSV Detox

A transformation pipeline engine for cleaning and transforming CSV/XLSX files.

## Quick Start

```bash
npm install              # Install dependencies
npx convex dev           # Initialize Convex (first time only)
npm run dev              # Start development server
```

Visit [http://localhost:3000](http://localhost:3000) to use the app.

## Documentation

**For developers:** Start at **[AGENTS.md](AGENTS.md)** or **[docs/agent-guides/INDEX.md](docs/agent-guides/INDEX.md)**

**For users:** See **[docs/public/USAGE.md](docs/public/USAGE.md)**

**For product info:** See **[docs/public/PRODUCT.md](docs/public/PRODUCT.md)**

## Tech Stack

Next.js 15 · React 19 · TypeScript · Convex · SQLite · Playwright

See [ARCHITECTURE.md](docs/agent-guides/ARCHITECTURE.md) for details.

## Multi-Agent System

CSV Detox uses OpenCode with specialized agents:
- **Build** (default) — Features, bugs, refactoring
- **Plan** — Design, architecture
- **Test** — Testing, coverage
- **Maintenance** — Housekeeping, docs
- **Review** — Automated PR reviews

See [AGENTS.md](AGENTS.md) for agent instructions.

## Automated PR Reviews

Every pull request gets an automated review checking:
- ✅ Tests, linting, and build
- 🔍 Code quality and best practices
- 💬 Actionable feedback

See [docs/PR_REVIEW.md](docs/PR_REVIEW.md) for details.
