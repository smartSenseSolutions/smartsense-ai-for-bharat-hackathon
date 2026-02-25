# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository structure

Monorepo for **Procure AI**, an AI-powered procurement management dashboard built for the AI-for-Bharat hackathon.

```
frontend/   # React 18 + TypeScript SPA (Vite)
backend/    # Backend service (being initialized on feat/backend-init)
```

## Commands

All commands are run from the `frontend/` directory:

```bash
npm install      # Install dependencies
npm run dev      # Start dev server (Vite)
npm run build    # Build for production
```

No linting or test tooling is configured.

## Frontend architecture

### Navigation model

There is **no router**. All navigation is state-driven in `src/app/App.tsx`:
- The `Screen` union type defines every possible view (15 screens total).
- `App` holds `currentScreen` state and renders the matching screen component.
- `onNavigate(screen: Screen)` is passed down to `Sidebar` and any screen that triggers navigation.
- To add a new screen: add its name to the `Screen` type → add a render case in `App.tsx` → optionally add it to the `Sidebar` menu items.

### Key state in App.tsx

- `currentScreen` / `setCurrentScreen` — active view
- `projects` / `setProjects` — list of `Project` objects (`{ id, projectName, status, rfpData, createdAt }`)
- `selectedProjectId` — which project is in context for detail screens
- `showNotifications` — notification panel visibility
- `sidebarCollapsed` / `setSidebarCollapsed` — sidebar state

All state is lifted to `App.tsx` and passed via props; there is no external state management library.

### Component layout

```
src/
  app/
    App.tsx                      # Root: state, screen routing, notifications panel (~2500 LOC)
    components/
      Sidebar.tsx                # Collapsible fixed sidebar, driven by Screen type
      ProjectNameModal.tsx       # Modal for creating a new project
      screens/                   # One file per top-level view (see Screen type for names)
      ui/                        # shadcn/ui primitives (Radix UI + CVA variants)
        utils.ts                 # cn() helper — clsx + tailwind-merge
      figma/                     # Figma-exported helpers (ImageWithFallback)
  styles/
    index.css                    # Global imports
    theme.css                    # CSS custom properties (design tokens) + @theme inline
    tailwind.css                 # Tailwind directives
    fonts.css                    # Font face declarations
```

### UI stack

- **Tailwind CSS v4** via `@tailwindcss/vite` — no `tailwind.config` file; all configuration is in CSS
- **shadcn/ui** in `src/app/components/ui/` — Radix UI primitives with CVA variants
- **MUI** (`@mui/material`) is used alongside shadcn in some screens
- **lucide-react** for icons; **recharts** for charts; **sonner** for toasts; **motion** for animations
- **react-hook-form** for forms; **react-dnd** for drag-and-drop

### Theming

Design tokens are CSS custom properties in `src/styles/theme.css` (`:root` for light mode, `.dark` for dark mode). Tailwind consumes them via `@theme inline`. Primary brand color: `#3B82F6` (blue-500). Colors use the OKLCH color space.

### Path alias

`@` resolves to `./src` (configured in `vite.config.ts`).

## Authentication

### Backend (`POST /api/auth/login`)
- Accepts `{ email, password }` JSON body; returns `{ access_token, token_type, user }`.
- JWT is HS256; secret configured via `JWT_SECRET_KEY` env var (default in `config.py` — change in production).
- On startup (`lifespan` in `main.py`): tables are created via `Base.metadata.create_all` and the superuser is seeded by `seed_superuser()` in `app/services/auth.py`.
- New backend deps: `passlib[bcrypt]`, `python-jose[cryptography]`, `python-multipart`.

### Frontend
- `App.tsx` checks `localStorage` for `auth_token` on mount; renders `<Login>` if absent, otherwise the full app.
- `handleLogin` / `handleLogout` in `App.tsx` manage token + user in `localStorage`.
- The `Sidebar` accepts `userEmail` and `onLogout` props (both optional) — the Logout menu item calls `onLogout?.()`.
- Login API base URL defaults to `http://localhost:8000`; override with `VITE_API_URL` env var.

## Notes

- Screen data is hardcoded/demo — only auth hits a real API.
- `CLAUDE.md` is listed in `.gitignore` and will not be committed.
- A more detailed frontend-specific `CLAUDE.md` exists at `frontend/CLAUDE.md`.
