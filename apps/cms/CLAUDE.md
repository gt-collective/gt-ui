# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Payload CMS 3.x application deployed to Cloudflare Workers, using D1 (SQLite) for the database and R2 for media storage. Built with Next.js 15 and React 19. The project serves as a multi-tenant CMS for GT Collective and Surfacelab sites.

## Commands

```bash
# Development
pnpm dev                          # Start dev server (Wrangler auto-binds local Cloudflare services)
pnpm devsafe                      # Clean start (removes .next and .open-next first)

# Build & Deploy
pnpm build                        # Next.js production build
pnpm run deploy                   # Full deploy: run migrations + build + deploy to Cloudflare
CLOUDFLARE_ENV=staging pnpm run deploy  # Deploy to specific environment

# Code Quality
pnpm lint                         # ESLint (next/core-web-vitals + next/typescript)
pnpm tsc --no-emit                # TypeScript type checking (not a script, run directly)

# Type Generation (run after schema changes)
pnpm generate:types               # Generate both Cloudflare and Payload types
pnpm generate:types:payload       # Payload types only → src/payload-types.ts
pnpm generate:importmap           # Regenerate import map after creating/modifying components

# Migrations
pnpm payload migrate:create       # Create a new migration after schema changes

# Testing
pnpm test                         # Run all tests (integration + e2e)
pnpm test:int                     # Integration tests only (vitest)
pnpm test:e2e                     # E2E tests only (playwright, starts dev server)

# Run a single integration test
pnpm vitest run --config ./vitest.config.mts tests/int/api.int.spec.ts

# Run a single e2e test
pnpm playwright test tests/e2e/admin.e2e.spec.ts
```

## Architecture

### Stack
- **Payload CMS 3.77** on **Next.js 15** (App Router) — all `@payloadcms/*` packages pinned to same version
- **Cloudflare Workers** deployment via `@opennextjs/cloudflare`
- **D1 SQLite** database via `@payloadcms/db-d1-sqlite`
- **R2** object storage for media via `@payloadcms/storage-r2`
- **Lexical** rich text editor

### Key Configuration
- **`src/payload.config.ts`** — Main Payload config. Uses `getCloudflareContext` (OpenNext) in production and a Wrangler proxy (`getPlatformProxy`) for CLI/dev. Imports migrations from `src/migrations/`.
- **`wrangler.jsonc`** — Cloudflare bindings: D1 database (`D1`), R2 bucket (`R2`), assets (`ASSETS`)
- **`open-next.config.ts`** — OpenNext adapter for Cloudflare Workers

### Project Structure
```
src/
├── app/
│   ├── (frontend)/          # Public frontend routes
│   └── (payload)/           # Payload admin panel (auto-generated routes + importMap)
├── collections/             # Payload collection configs (Users, Media)
├── fields/                  # Reusable field definitions (e.g., siteField for multi-tenancy)
├── migrations/              # Database migrations (barrel-exported from index.ts)
└── payload.config.ts        # Main Payload config
tests/
├── int/                     # Integration tests (*.int.spec.ts, vitest + jsdom)
├── e2e/                     # E2E tests (*.e2e.spec.ts, Playwright)
└── helpers/                 # Test utilities (seedUser, login)
```

### Multi-Tenant Architecture
The project uses `@payloadcms/plugin-multi-tenant` and a custom `siteField` (`src/fields/site.ts`) with select options for `gtcollective` and `surfacelab`. This field is intended to be added to collections that need per-site content separation.

### Path Aliases
- `@/*` → `./src/*`
- `@payload-config` → `./src/payload.config.ts`

### Cloudflare-Specific Notes
- No `sharp` available on Workers — image crop/focalPoint disabled on Media collection
- Wrangler auto-creates local D1/R2 bindings during `pnpm dev`
- Must run `pnpm wrangler login` before first use
- D1 uses numeric IDs (not UUIDs)
- GraphQL has known upstream issues on Cloudflare Workers
- Custom endpoints are **not authenticated by default** — always check `req.user`

## Payload CMS Patterns

### Critical Security Rules
1. **Local API bypasses access control by default.** When passing `user`, always set `overrideAccess: false`
2. **Always pass `req` to nested operations in hooks** for transaction atomicity
3. **Use `context` flags to prevent infinite hook loops** when hooks trigger operations on the same collection

### After Schema Changes
1. Run `pnpm payload migrate:create` to generate a migration
2. Run `pnpm generate:types` to regenerate `src/payload-types.ts`
3. Run `pnpm generate:importmap` if you added/modified custom admin components

### Code Style
- Prettier: single quotes, no semicolons, trailing commas, 100 char width
- ESLint: `next/core-web-vitals` + `next/typescript`, unused vars prefixed with `_`
- TypeScript: `strictNullChecks: false` — nullable values don't require explicit null checks
- Package manager: **pnpm** (use `pnpm install --ignore-workspace` or alias `pnpm ii`)
- ESM (`"type": "module"` in package.json)

### Reference
- Payload docs: https://payloadcms.com/docs
- LLM context: https://payloadcms.com/llms-full.txt
- Cursor rules in `.cursor/rules/` contain detailed Payload patterns for access control, hooks, fields, queries, endpoints, components, and plugin development
