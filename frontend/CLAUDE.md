# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server
npm run build    # Build for production
```

No linting or test tooling is configured.

## Architecture

This is a frontend-only React 18 + TypeScript SPA (AI-for-Bharat hackathon project) built with Vite. It is a procurement management dashboard ("Procure AI") originally exported from a Figma design.

### Navigation model

There is **no router**. All navigation is state-driven in `src/app/App.tsx`:
- The `Screen` union type defines every possible view.
- `App` holds `currentScreen` state and renders the matching screen component.
- `onNavigate(screen: Screen)` is passed down to `Sidebar` and to screens that need to navigate (e.g., clicking a proposal navigates to `'proposal-details'`).
- Adding a new screen requires: adding its name to the `Screen` type, adding a case in `App.tsx`'s render logic, and optionally adding it to the `Sidebar` menu items.

### Component layout

```
src/
  app/
    App.tsx                      # Root: state, screen routing, notifications panel
    components/
      Sidebar.tsx                # Collapsible fixed sidebar, driven by Screen type
      ProjectNameModal.tsx       # Modal for creating a new project
      screens/                   # One file per top-level view
      ui/                        # shadcn/ui primitives (Radix-based)
        utils.ts                 # cn() helper (clsx + tailwind-merge)
      figma/                     # Figma-exported helpers (e.g. ImageWithFallback)
  styles/
    index.css                    # Global imports
    theme.css                    # CSS custom properties (design tokens) + base styles
    tailwind.css                 # Tailwind directives
    fonts.css                    # Font face declarations
```

### UI stack

- **Tailwind CSS v4** via `@tailwindcss/vite` (no `tailwind.config` file; configured through CSS)
- **shadcn/ui** components in `src/app/components/ui/` (Radix UI primitives + CVA variants)
- **MUI** (`@mui/material`) used alongside shadcn in some screens
- **lucide-react** for icons
- **recharts** for charts, **sonner** for toasts, **motion** for animations

### Theming

Design tokens are CSS custom properties defined in `src/styles/theme.css` (`:root` for light, `.dark` for dark mode). Tailwind consumes them via `@theme inline`. The primary brand color for Procure AI is `#3B82F6` (blue-500).

### Path alias

`@` resolves to `./src` (configured in `vite.config.ts`).

### Key state in App.tsx

- `currentScreen` / `setCurrentScreen` — active view
- `projects` / `setProjects` — list of `Project` objects (id, projectName, status, rfpData, createdAt)
- `selectedProjectId` — which project the user is viewing in detail screens
- `showNotifications` — notification panel visibility
