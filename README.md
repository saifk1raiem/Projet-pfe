# Projet PFE

This repository is organized as a small full-stack project:

- `backend/`: FastAPI backend
- `frontend/`: React + Vite frontend source
- Root `package.json`: shared frontend toolchain entrypoint

## Frontend commands

Run these commands from the repository root:

```bash
npm install
npm run dev
npm run build
npm run lint
```

The Vite config is rooted at `frontend/`, so the production build is generated in `frontend/dist`.

## Backend database config

The backend reads `DATABASE_URL` from `backend/.env`.

- For local Postgres, use a localhost connection string.
- For Supabase, replace `DATABASE_URL` with your Supabase pooler connection string.

`backend/alembic.ini` only contains a placeholder URL. Alembic uses the runtime value loaded from `backend/.env` in `backend/alembic/env.py`.
