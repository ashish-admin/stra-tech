# Repository Guidelines

## Project Structure & Module Organization
- `backend/`: Flask API (`app:create_app`), SQLAlchemy models, Alembic `migrations/`, Celery (`celery_worker.py`), utilities in `scripts/`, tests in `backend/tests/`.
- `frontend/`: React + Vite app (`src/`, `public/`), Vitest setup in `vitest.config.js` and `package.json`.
- `tests/e2e/`: Playwright specs (auth, dashboard, strategist).
- `Makefile`: One‑shot dev, test, coverage, and quality gate targets.

## Build, Test, and Development Commands
- Install: `make install` (backend `pip install -r requirements.txt`, frontend `npm install`).
- Run locally: `make dev` (Flask API + Vite dev server).
- Database: `make migrate` (Alembic `flask db upgrade`). Seed: `make seed`.
- Tests (all): `make test`. Quality gates: `make quality-gates`. Coverage reports: `make coverage`.
- Direct examples:
  - Backend: `cd backend && python -m pytest tests/ -v --tb=short`
  - Frontend: `cd frontend && npm test`
  - E2E: `npx playwright test e2e/strategist/`

## Coding Style & Naming Conventions
- Python: 4‑space indent, prefer type hints. Format with Black; lint with Ruff. Modules `snake_case`, classes `PascalCase`, constants `UPPER_SNAKE`.
- JS/TS: Prettier + ESLint. Components `PascalCase.jsx/tsx`, hooks `useThing.ts(x)`. Keep pure UI in `src/components/`.
- Run format/lint: `make format` and `make check`.

## Testing Guidelines
- Backend: Pytest configured in `backend/pytest.ini` with coverage; target ≥80% (see `--cov-fail-under`). Test files `test_*.py`, classes `Test*`, functions `test_*`.
- Frontend: Vitest (jsdom). Unit tests colocated under `src/` or `src/test/`. Coverage via `npm test -- --coverage`.
- E2E: Playwright specs in `tests/e2e/`. Run headful when debugging: `npx playwright test --headed`.

## Commit & Pull Request Guidelines
- Commits: concise, imperative subject; optional scope. Example: `feat(api): add ward meta endpoint` or `fix(ui): handle null ward data`.
- PRs: include summary, linked issues, steps to test, screenshots/gifs for UI, and any DB migration notes. Must pass `make quality-gates`.

## Security & Configuration Tips
- Never commit secrets. Copy `.env.sample` → `backend/.env` and `frontend/.env` as needed (see `README.md`). Key vars: `DATABASE_URL`, `REDIS_URL`, `FLASK_ENV`, API keys.
- Validate local health with backend tests and `/api/v1/status` before opening PRs.

