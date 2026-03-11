# COSC 360 Demo Code

A full-stack React + Express application demonstrating data flow, layered architecture, and scalable module organization.

---

## Quick Start

### 1. Install Dependencies

Install packages for the root, client, and server:

```bash
npm install && npm install --prefix client && npm install --prefix server
```

This command:

- Installs root-level dependencies
- Installs dependencies in `client/` folder
- Installs dependencies in `server/` folder

### 2. Start the Server

From the root directory:

```bash
npm start
```

This runs both the React development server and Express server concurrently:

- **React app:** `http://localhost:5173`
- **Express server:** `http://localhost:4000`
- **API proxy:** `/api` requests are proxied from React to Express

---

## Project Structure

```
.
├── client/                 # React application
│   ├── src/
│   │   ├── app/           # Root App component
│   │   ├── components/    # Shared UI components
│   │   ├── features/      # Feature modules (auth, tweets)
│   │   ├── lib/           # Utilities (api-client, auth context)
│   │   └── types/         # Shared types
│   └── package.json
│
├── server/                # Express server
│   ├── src/
│   │   ├── modules/       # Feature modules with domain, routes, controller, service, repository
│   │   ├── middleware/    # Global middleware
│   │   ├── data/          # JSON data files
│   │   └── index.ts       # Server entry point
│   └── package.json
│
├── docs/                  # Documentation
│   ├── POST-endpoint-walkthrough.md
│   ├── bulletproof-react-setup.md
│   └── server-architecture.md
│
└── README.md              # This file
```

---

## Documentation

- **[POST Endpoint Walkthrough](./docs/POST-endpoint-walkthrough.md)** — Step-by-step guide showing how data flows from React to Express and back
- **[Bulletproof React Setup](./docs/bulletproof-react-setup.md)** — React architecture, feature isolation, and scaling patterns
- **[Server Architecture](./docs/server-architecture.md)** — Server layers, module-scoped domains, and how to add new features

---

## Development

### Scripts

- `npm start` — Run both client and server concurrently
- `npm run server` — Run Express server only
- `npm run client` — Run React dev server only

### Architecture Overview

**React Client:**

- Components never call `fetch` directly — they use Feature API functions
- All HTTP requests go through `lib/api-client.ts` for consistent auth handling
- Features are self-contained modules with `api/`, `components/`, and `types/`

**Express Server:**

- Layered architecture: Router → Middleware → Controller → Service → Repository
- Each module owns its domain logic (classes, types, constants)
- Easy to add new modules without touching existing code

---

## Key Concepts

### Feature Isolation

Each feature module (auth, tweets, etc.) is completely self-contained and doesn't import from other features.

### Centralized HTTP Client

All network requests use `lib/api-client.ts`, making it easy to add global interceptors, error handling, or authentication.

### Module-Scoped Domain

Each server module owns its domain classes, types, and constants. No shared "domain" folder means modules can scale independently.

### Layered Responsibilities

- **Controller** — Validates input, chooses HTTP status
- **Service** — Business logic and orchestration
- **Repository** — Data persistence
- **Middleware** — Cross-cutting concerns (auth)

---

## Adding a New Feature

1. Create `client/src/features/[name]/` with `api/`, `components/`, `types/`
2. Create `server/src/modules/[name]/` with `domain/`, routes, controller, service, repository
3. Add routes to Express app
4. No need to modify existing code

See [Server Architecture](./docs/server-architecture.md) for detailed examples.

---

## Troubleshooting

**Port 4000 already in use?**

```bash
lsof -i :4000  # Find what's using the port
kill -9 <PID>  # Kill it
```

**Port 5173 already in use?**
The Vite dev server will use the next available port (5174, 5175, etc.)

**Build errors after adding files?**
Make sure to `npm install` in the root and the affected directory.
