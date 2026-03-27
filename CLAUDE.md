# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev          # Start dev server (Express + Vite HMR)
pnpm build        # Build client (Vite) + server (esbuild) to dist/
pnpm start        # Start production server
pnpm check        # TypeScript type checking
pnpm format       # Prettier formatting
pnpm db:push      # Generate Drizzle migrations and apply to MySQL
pnpm test         # Run Vitest tests
```

## Architecture

This is an AI-powered grad school application document customizer. Users upload document templates (CV, SoP, LoR), research target programs via LLM, then generate customized documents with change tracking and iterative refinement via discussion.

**Stack:** React 19 + TypeScript frontend, Express + tRPC backend, MySQL + Drizzle ORM, Manus Forge API (LLM + storage), Manus OAuth (auth).

### Data Flow

1. **Program Research** — User submits university + program name → `programs.researchProgram` mutation → LLM returns structured JSON (courses, faculty, requirements, etc.) → stored in `program_research` table
2. **Document Generation** — User selects doc type → LLM picks best template variant → generates customized content + changelog → stored in `documents` table
3. **Discussion & Regeneration** — User sends feedback → stored in `document_discussions` → full history passed to LLM on regeneration

### tRPC API

All API communication uses tRPC at `/api/trpc`. Key routers in `server/routers.ts`:
- `auth.*` — login/logout, current user
- `templates.*` — CRUD for user document templates
- `programs.*` — CRUD, `researchProgram`, `generateDocument`, `getDiscussions`, `addDiscussionMessage`

### Key Files

| File | Purpose |
|------|---------|
| `server/_core/index.ts` | Express server, port auto-detection (3000–3019), Vite HMR in dev |
| `server/routers.ts` | All tRPC routes + LLM orchestration logic |
| `server/db.ts` | Drizzle query helpers for all entities |
| `server/_core/llm.ts` | `invokeLLM()` wrapper for Manus Forge API |
| `server/_core/trpc.ts` | tRPC setup; `publicProcedure` vs `protectedProcedure` |
| `drizzle/schema.ts` | All table definitions (users, templates, programs, program_research, documents, document_discussions) |
| `client/src/main.tsx` | tRPC client setup, auth error handling |
| `client/src/App.tsx` | wouter routing |
| `client/src/pages/ProgramDetail.tsx` | Research + document generation UI |
| `client/src/pages/DocumentDetail.tsx` | Side-by-side diff view, changelog, discussion |

### Auth & External APIs

- **OAuth:** Manus OAuth server; callback at `/api/oauth/callback` (see `server/_core/oauth.ts`)
- **LLM + Storage:** Manus Forge API — requires `BUILT_IN_FORGE_API_URL` and `BUILT_IN_FORGE_API_KEY` env vars
- **Database:** MySQL — requires `DATABASE_URL`

### UI Language

The UI and LLM prompts are in Traditional Chinese (zh-TW).
