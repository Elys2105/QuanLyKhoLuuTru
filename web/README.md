# Archive Management Frontend

Frontend and desktop shell for the Archive Management System.

## Tech stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- TanStack Query
- TanStack Table
- React Hook Form + Zod
- Zustand
- Axios
- Electron + electron-builder

## Development

Install dependencies:

```bash
npm ci
```

Start the Next.js development server:

```bash
npm run dev
```

The web application is available at `http://localhost:3000` by default.

The backend API should be started separately from the `api/` directory.

## Quality checks

```bash
npx tsc --noEmit
npm run lint
npm run build
```

## Desktop application

Run the Electron shell during development:

```bash
npm run electron
```

Build the Windows desktop package:

```bash
npm run dist
```

Generated desktop packages are written to `dist-desktop/` and are excluded from version control.

## Repository structure

```text
web/
├── electron/       # Electron desktop shell
├── public/         # Static assets
├── src/            # Next.js application source
├── package.json    # Scripts and dependencies
└── next.config.*   # Next.js configuration
```

For the project overview, architecture, setup instructions and feature summary, see the repository-level `README.md`.
