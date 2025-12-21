# Repository Guidelines

## Project Structure & Module Organization
- Root uses Vite + React + TypeScript; `index.tsx` mounts `App.tsx`, and `Canvas.tsx` hosts the workflow UI.
- `components/Node.tsx` defines shared node chrome; feature nodes live under `components/nodes/` and modals in `components/modals/`.
- API calls stay in `services/geminiService.ts`; shared config sits in `constants.ts` and types in `types.ts`.
- Static shell and metadata live in `index.html` and `metadata.json`; Vite config is in `vite.config.ts`. Environment keys load from `.env.local`.

## Build, Test, and Development Commands
- `npm install` installs dependencies.
- `npm run dev` starts the Vite dev server.
- `npm run build` produces the production bundle in `dist/`.
- `npm run preview` serves the built bundle locally.

## Coding Style & Naming Conventions
- Use functional React components with hooks; prefer `const` and explicit prop/data typing.
- Follow existing 2-space indentation, single quotes, and trailing semicolons; keep JSX attributes ordered for readability.
- Use PascalCase for components/types/enums, camelCase for variables/functions, and screaming snake case for constants (e.g., `AVAILABLE_MODELS`).
- Keep UI state in components and network logic in `services/`; avoid mixing fetch logic into view nodes.

## Testing Guidelines
- No automated tests yet; prefer Vitest + React Testing Library when adding coverage.
- Co-locate tests as `*.test.tsx` or under `__tests__/` near source; mock `geminiService` calls and assert rendered workflow controls (nodes, handles, zoom/pan).
- Once tests exist, run `npm test` locally before PRs and gate CI on it.

## Commit & Pull Request Guidelines
- With no Git history present, use Conventional Commits (e.g., `feat: add result node status badges`) for clarity.
- Keep commits small and focused; add short bodies describing behavior changes to workflow execution or Gemini calls.
- PRs should include a summary, testing notes (manual steps or commands), and screenshots/GIFs for UI updates; link issues/tasks and tag reviewers for touched areas.

## Security & Configuration Tips
- Set `GEMINI_API_KEY` in `.env.local`; never commit real keys or secrets.
- Centralize API throttling/timeouts in `services/geminiService.ts` to keep components lean.
- Treat user prompts and uploads as untrusted input; validate before sending to Gemini/Imagen endpoints.
