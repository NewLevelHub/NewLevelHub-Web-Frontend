# NewLevelHub Frontend — Agent Instructions

This is a **Vite + React** project, NOT Next.js. There is no `pages/` router, no server components, no App Router, and no `getServerSideProps`.

Read `CLAUDE.md` for the full project context before writing any code.

## Quick Reference

- **Framework:** React 18 + Vite 6 (SPA)
- **Router:** React Router v7 (`src/app/router.tsx`)
- **Styling:** Tailwind CSS v4 via `@tailwindcss/vite` — not PostCSS
- **State:** TanStack React Query (server), Zustand (auth only)
- **Path alias:** `@/` → `./src/`
- **API proxy:** `/api` → `http://localhost:8000` (Django backend, trailing slashes required)

## Before Writing Code

1. Read `CLAUDE.md` for conventions, architecture, and patterns
2. Use `@/shared/api/endpoints.ts` for all API paths — never hardcode URLs
3. Use `@/shared/config/constants.ts` for all enum values
4. Use `@/shared/types/index.ts` for entity interfaces
5. Use `cn()` from `@/shared/lib/cn.ts` for all classname logic
