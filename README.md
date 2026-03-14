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
