# React Starter

This project uses React 19 + TypeScript + Vite.

## Stack

- React 19 with functional components and hooks
- TypeScript in strict mode
- Vite for dev server and builds
- Vitest + React Testing Library for tests
- TanStack Query for data fetching
- Tailwind CSS v4

## Conventions

- Use named exports, not default exports
- Components go in `src/components/`
- Hooks go in `src/hooks/`
- Use `cn()` from `src/lib/utils.ts` for conditional classNames
- Write tests alongside source files as `*.test.tsx`

## Commands

```bash
npm run dev       # Start dev server
npm run build     # Production build
npm run test      # Run tests
npm run lint      # Lint + format check
```
