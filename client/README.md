# FridgeTrack Client

React frontend for FridgeTrack — a smart kitchen inventory tracker that uses AI-powered receipt scanning to manage groceries, reduce food waste, and suggest recipes.

## Tech Stack

- **React 19** with TypeScript 5.9
- **Vite 7** for dev server and bundling
- **Tailwind CSS v4** with custom Sage design tokens
- **React Router v7** for client-side routing
- **TanStack Query v5** for server state management
- **Axios** for HTTP requests

## Prerequisites

- Node.js 18+
- npm 9+
- Backend server running on `http://localhost:8000` (see `../server/`)

## Getting Started

### 1. Install dependencies

```bash
cd client
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local` with your values:

| Variable | Description | Default |
|---|---|---|
| `VITE_API_URL` | Backend API base URL | `http://localhost:8000` |
| `VITE_ENV` | `development` or `production` | `development` |

### 3. Start development server

```bash
npm run dev
```

The app runs at `http://localhost:5173` with hot module replacement.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Type-check with `tsc` then build for production |
| `npm run preview` | Preview the production build locally |
| `npm run type-check` | Run TypeScript type-checking without emitting |
| `npm run lint` | Lint source files with ESLint |
| `npm run format` | Format source files with Prettier |

## Project Structure

```
src/
├── api/                 # API client and endpoint modules
│   ├── client.ts        # Axios instance with interceptors
│   └── endpoints/       # Typed API functions (inventory, recipes, scan)
├── components/
│   ├── ui/              # Design system primitives (Button, Card, Input, etc.)
│   ├── features/        # Feature-specific components
│   ├── layout/          # Layout shell and navigation
│   └── ErrorBoundary.tsx
├── config/
│   └── env.ts           # Typed, validated environment config
├── hooks/               # React Query hooks (useInventory, useRecipes)
├── pages/               # Route-level page components
├── styles/
│   └── globals.css      # Tailwind config, design tokens, base styles
└── types/
    └── index.ts         # Shared TypeScript types
```

## Build & Deployment

### Production build

```bash
npm run build
```

Output goes to `dist/`. The build includes:

- TypeScript type-checking before bundling
- Vendor chunk splitting (React, TanStack Query)
- ES2020 target for modern browsers
- Source maps excluded in production

### Preview locally

```bash
npm run preview
```

### Deploy

Serve the `dist/` directory with any static file server. Configure your server to redirect all routes to `index.html` for client-side routing.

## Environment Variables

Environment variables are validated at startup via `src/config/env.ts`. Missing required variables throw descriptive errors with setup instructions.

All client-side variables must be prefixed with `VITE_` to be exposed by Vite. Never put secrets (API keys, tokens) in client environment variables — they are bundled into the JavaScript and visible to users.

## Path Aliases

The project supports `@/` as an alias for `src/`:

```typescript
import { Button } from '@/components/ui/Button'
import { env } from '@/config/env'
```

Configured in both `tsconfig.json` and `vite.config.js`.
