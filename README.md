# Hirex

**An AI copilot for live interviews — built for the Indian hiring market.**

Hirex is a recruiter copilot, not an autonomous interviewer. You run the interview; Hirex builds the question set, surfaces what to look for, lets you tick coverage as the candidate speaks, generates targeted follow-ups, and synthesises a hire / no-hire recommendation with reasoning grounded in your own notes.

> Six minds. One mesh. Zero latency.

---

## What's in the box

- **Question lattice** — paste a JD, pick role + level + round, AI builds a tailored question set that fits your time budget. 71+ pre-seeded starter questions for backend, frontend, full-stack, data, ML, DevOps, product, HR — across R1 / R2 / R3.
- **Live conduct copilot** — for each question, AI shows an expected-answer guide, a 4–6 point coverage checklist you tick during the call, three default follow-ups, and a 1-5 score selector with semantic colour. On-demand "generate another follow-up" when a candidate dodges.
- **Generate more mid-interview** — sidebar panel: count + custom focus prompt, appends new tailored questions to the queue without interrupting the live session.
- **Synthesised report** — Finalize → DeepSeek reads every score, coverage tick, and recruiter note → returns advance / hold with reasoning, strengths, concerns, per-question summary.

---

## Stack

- **Backend**: Python 3.11 + FastAPI + SQLAlchemy 2 + Postgres (pgvector) + OpenRouter (DeepSeek V3.1)
- **Frontend**: Vite + React 18 + TypeScript + AntD 5 (themed) + Three.js (landing nebula scene)
- **Hosted DB**: Railway Postgres
- **Repo layout**: pnpm workspace style, two apps

```
apps/
  api/    FastAPI — routes, services (llm, enricher, follow-up, report), models
  web/    Vite + React — landing (NEXUS theme) + recruiter dashboard (NEXUS dashboard variant)
```

---

## Quickstart (local dev)

```bash
# 1. clone + env
cp .env.example .env   # fill in OPENROUTER_API_KEY and DATABASE_URL

# 2. backend
cd apps/api
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python scripts/init_db.py          # creates tables + pgvector + idempotent migrations
python scripts/seed.py             # 71 starter questions
uvicorn app.main:app --reload --port 5050

# 3. frontend (new shell)
cd apps/web
pnpm install
pnpm dev                           # opens http://localhost:3000
```

Hit **http://localhost:3000/** for the NEXUS landing, or **/recruiter** for the operator console.

---

## Required env vars

See `.env.example` at the repo root. The non-optional ones:

| Var | Purpose |
|---|---|
| `OPENROUTER_API_KEY` | DeepSeek V3.1 via OpenRouter — question generation, enricher, follow-ups, report synthesis |
| `DATABASE_URL` | Postgres connection string (Railway-hosted in this build) |
| `JWT_SIGNING_SECRET` | Signs candidate share links |
| `OPENROUTER_MODEL` | Defaults to `deepseek/deepseek-chat-v3.1` |

Optional: Clerk auth keys (falls back to dev mode), R2 storage (falls back to local `./uploads/`).

---

## Deploying

### Frontend → Vercel

The Vite app builds to `apps/web/dist`. `apps/web/vercel.json` configures SPA fallback so the React Router routes work after refresh.

1. Connect this repo at https://vercel.com/new
2. Project settings:
   - **Root directory**: `apps/web`
   - **Build command**: `pnpm build`
   - **Output directory**: `dist`
3. Env vars: `VITE_API_URL` pointing at your deployed FastAPI host
4. Deploy

### Backend → Railway

The FastAPI app is in `apps/api/`. `apps/api/Procfile` boots uvicorn for Railway.

1. New project at https://railway.app → Deploy from GitHub
2. Pick this repo, set root directory `apps/api/`
3. Add env vars from `.env.example` (Railway Postgres URL is already provisioned via its plugin)
4. Add a custom domain or use the generated `.up.railway.app` URL — that's your `VITE_API_URL` on Vercel

DB migrations: run `python scripts/init_db.py && python scripts/seed.py` once after first deploy (Railway has a one-off command runner).

---

## Design system

The full visual spec lives in [`.interface-design/system.md`](./.interface-design/system.md) — direction is **NEXUS** (sci-fi operator console): dark indigo canvas, neon cyan / violet / magenta accents, Orbitron display + Space Grotesk body + JetBrains Mono labels, glass cards over a Three.js volumetric nebula. The recruiter dashboard uses a quieter dashboard variant (no full nebula, system cursor preserved) so it stays productive for click-heavy work.

---

## What's not here yet

This is a Phase 1 prototype. Out of scope so far:
- Production auth (Clerk wired but optional; defaults to dev single-user)
- Candidate-side voice flow (the original spec called for it; the product evolved to a recruiter copilot, so the candidate joins your video call as normal — Hirex is the copilot you run alongside)
- Multi-tenant org management
- Production analytics dashboard

---

## License

Proprietary — internal prototype.
