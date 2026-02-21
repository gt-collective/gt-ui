# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
pnpm dev                        # Run all apps (web :3000, docs :3001)
pnpm dev --filter=web           # Run only the web app
pnpm dev --filter=docs          # Run only the docs app

# Build
pnpm build                      # Build all apps and packages
pnpm build --filter=web         # Build a specific app

# Linting & Formatting
pnpm lint                       # ESLint across all packages (--max-warnings 0)
pnpm check-types                # TypeScript type checking (tsc --noEmit)
pnpm format                     # Prettier on all .ts, .tsx, .md files
```

## Architecture

This is a **Turborepo monorepo** using **pnpm workspaces**.

### Apps

- **`apps/web`** — Primary Next.js 16 app (App Router, React 19, port 3000)
- **`apps/docs`** — Documentation Next.js 16 app (App Router, React 19, port 3001)

### Packages

- **`packages/ui`** (`@repo/ui`) — Shared React component library. Exports `.tsx` files directly (no build step). Components use `"use client"` directive.
- **`packages/eslint-config`** (`@repo/eslint-config`) — Shared ESLint configs: `base.js`, `next.js`, `react-internal.js`
- **`packages/typescript-config`** (`@repo/typescript-config`) — Shared tsconfigs: `base.json`, `nextjs.json`, `react-library.json`

### Key Conventions

- **TypeScript strict mode** is enabled everywhere
- **CSS Modules** for component styling, global CSS with CSS variables for theming
- **No Tailwind** — plain CSS with `prefers-color-scheme` for dark mode
- Workspace dependencies use `workspace:*` protocol
- ESLint is configured with zero warnings tolerance
- Apps use Next.js App Router (not Pages Router)
