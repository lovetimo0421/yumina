# Yumina

AI interactive fiction/roleplay platform. Replaces the SillyTavern + JS-Slash-Runner + ST-Prompt-Template stack with a unified engine-driven platform.

## Monorepo Structure

```
packages/
  shared/    — @yumina/shared   — Types, Zod schemas, constants
  engine/    — @yumina/engine   — Framework-agnostic game engine (state, rules, prompts, parser, components)
  server/    — @yumina/server   — Hono + Drizzle (PostgreSQL) + Better Auth
  app/       — @yumina/app      — React 19 + Vite 6 + Tailwind 4 + shadcn/ui + TanStack Router + Zustand
```

`BetterTavern/` is a legacy UI/UX reference only — not part of the build.

## Tech Stack

- **Monorepo**: pnpm workspaces + Turborepo
- **Server**: Hono, Drizzle ORM (PostgreSQL), Better Auth, SSE streaming
- **App**: React 19, Vite 6, Tailwind CSS 4, shadcn/ui, TanStack Router, Zustand
- **Engine**: Pure TypeScript + Zod — no framework dependencies

## Commands

```bash
pnpm build        # Build all packages (Turborepo)
pnpm typecheck    # Typecheck all packages
pnpm dev          # Run all dev servers concurrently
pnpm db:generate  # Generate Drizzle migrations (server)
pnpm db:migrate   # Run Drizzle migrations (server)
pnpm db:seed      # Seed demo data (server)
```

## Key Patterns

- **tsup** outputs `index.js` and `index.d.ts` (not `.mjs`/`.d.mts`) — exports must match
- `types` condition must come FIRST in package.json exports map
- Server exports types via `"types": "./src/index.ts"` so the app can use Hono RPC
- App uses `tsconfig.app.json` for typechecking (Vite scaffold pattern)
- Engine is **framework-agnostic** — no React/Vue imports allowed in engine code
- Engine classes run server-side; `resolveComponents()` is the intentional exception (pure function, runs client-side)
- `better-auth` peer dep warning for zod@^4 from `better-call` is safe to ignore

## Architecture

### Engine (`@yumina/engine`)
- **GameStateManager** — Reactive state with observer pattern, 6 effect operations (set/add/subtract/multiply/toggle/append)
- **RulesEngine** — Priority-based rule evaluation with AND/OR conditions, 7 operators
- **PromptBuilder** — System prompt assembly with `{{var}}` interpolation + structured output mode
- **ResponseParser** — Regex-based `[var: op value]` directive extraction
- **StructuredResponseParser** — JSON mode parsing (`{ narrative, stateChanges, choices }`) with regex fallback
- **Component System** — 6 typed components (stat-bar, text-display, choice-list, image-panel, inventory-grid, toggle-switch) with discriminated unions + Zod schemas
- **resolveComponents()** — Pure function resolving components + state into render-ready descriptors

### Server (`@yumina/server`)
- Hono routes: auth, worlds CRUD, sessions, messages (SSE streaming), models, API keys
- LLM: OpenRouterProvider with `response_format` passthrough for JSON mode
- Encrypted API key storage (AES-256-GCM)
- Message flow: prompt build → LLM stream → parse response (structured or regex) → apply effects → evaluate rules → persist

### App (`@yumina/app`)
- **Chat**: MessageList + MessageInput + GamePanel (replaces legacy StatePanel)
- **GamePanel**: Renders typed components when defined, degrades to raw variable display for backwards compat
- **Editor**: 7 sections — Overview, Characters, Variables, Components, Rules, Settings, Preview
- **Stores**: chat (messages, gameState, streaming, pendingChoices), editor (worldDraft, CRUD), worlds, models, ui

## Deployment

### Railway (Production)
- **Single service** — Dockerfile builds everything, server serves API + static frontend
- **Railway PostgreSQL** — production database, separate from dev
- **Domain**: `yumina2-production.up.railway.app`
- Railway auto-deploys on push to `main`
- Server listens on `PORT` (Railway sets this automatically)

### Database Architecture

Two completely separate PostgreSQL databases:

| | Dev (Neon) | Production (Railway) |
|---|---|---|
| **Used by** | `pnpm dev` locally | Deployed Railway app |
| **Connection** | `DATABASE_URL` in `.env` | `DATABASE_URL` in Railway variables |
| **Data** | Test/dev data | Real user data |

They share the same schema but have independent data.

### Workflow for Changes

1. Make code changes locally
2. Test with `pnpm dev` (uses Neon dev DB)
3. Verify with `pnpm build && pnpm typecheck`
4. Commit + push → Railway auto-deploys
5. **If schema changed**: push to Railway DB from local machine:
   ```bash
   DATABASE_URL="postgresql://...@switchyard.proxy.rlwy.net:12458/railway" pnpm db:push
   ```
   Use Railway Postgres **public** URL (not `railway.internal`).

### Key Files
- `Dockerfile` — multi-stage build, copies app dist into `packages/server/public`
- `railway.toml` — Railway config, healthcheck at `/health`
- `packages/server/src/index.ts` — serves static frontend in production (`NODE_ENV=production`)

## Hard Requirements

- Engine core MUST be framework-agnostic TypeScript
- AI never executes code — state changes applied by engine from structured data
- Two app versions from one codebase — offline (Tauri, future) + hosted (web)
