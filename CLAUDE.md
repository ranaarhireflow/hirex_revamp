# CLAUDE.md — Hirex Phase 1

> This file gives Claude Code the full context it needs to build Hirex Phase 1.
> Keep this file at the repository root. Update it as the product evolves.

---

## 1. Project Overview

**Hirex** is an AI-powered **autonomous interviewer** for the Indian hiring market.

Unlike copilots (BarRaiser, etc.) that assist a human interviewer, Hirex's AI **conducts the full interview itself**:
- Speaks and listens in real time (voice in / voice out) — *deferred to Phase 1.5; Phase 1 is text-only chat*
- Cross-questions based on candidate's responses
- Asks role-specific technical and behavioural questions
- Generates a structured evaluation report

**Target users (B2B):** Indian IT services, GCCs, mid-market SaaS, recruitment agencies, coaching institutes running placement drives.

**Wedge:** Live AI interviewer with cross-questioning depth + Indian-context awareness (Hinglish, IT-services roles, GCC interview patterns). Competitors: Apriora, Micro1 (Zara), Ribbon, Pillar, Final Round AI.

---

## 2. Working with Claude Code — Project Rules

### ALWAYS START IN PLAN MODE
Before making **any** code change, file creation, or refactor:
1. Read all relevant files first (don't assume).
2. Present a detailed plan: what files change, why, in what order.
3. **Wait for human approval.**
4. Only then implement.

### Code style
- Language: **TypeScript** everywhere.
- Formatter: Prettier, default config.
- Linter: ESLint with `@typescript-eslint/recommended`.
- No `any` types unless explicitly justified in a comment.
- Functional, composable code. Avoid deep class hierarchies.

### Commit hygiene
- Conventional commits: `feat:`, `fix:`, `chore:`, `refactor:`, `docs:`.
- One concern per commit.
- Never commit `.env`, API keys, recordings, or candidate data.

---

## 3. Phase 1 Scope

| # | Feature |
|---|---------|
| 1 | JD + Resume-driven question generation |
| 2 | Interview time limit + question limit |
| 3 | Seven role interview templates (backend, frontend, data, ml, devops, product, hr) |
| 4 | Candidate join flow via signed-link |
| 5 | Round pipeline R1 / R2 / R3 |
| 6 | Teams / Zoom Chrome extension — **deferred to Phase 1.5** |
| 7 | Feedback output: transcript, scores, recommendation, PDF + JSON |

### Out of scope for Phase 1
- Vendor portal, cheating/stuttering detection, resume-filtering UI, full analytics dashboard, multi-tenant org management, bot scheduling.
- Production auth (use simple token / Clerk fallback).
- **Voice (Realtime API)** — deferred to Phase 1.5.

---

## 4. Architecture (Phase 1, text-only)

```
┌────────────────────────────────────────────────────────────────┐
│                    CANDIDATE BROWSER (Next.js)                  │
│  - Chat transcript pane                                         │
│  - Text input                                                   │
│  - Question counter + countdown timer                           │
│  - SSE stream of AI tokens; HTTP POST for candidate replies     │
└───────────────────────┬─────────────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────────────┐
│                  BACKEND (Fastify + TypeScript)                 │
│                                                                  │
│  Interview Orchestrator FSM (transport-agnostic)                │
│  Question Pipeline (R1/R2/R3) + Cross-Q                         │
│  Scoring + Report Generator                                     │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ OpenRouter (deepseek-chat-v3.1)  │  Postgres + pgvector  │  │
│  │ reasoning + scoring              │  Railway-hosted       │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                        ▲
┌───────────────────────┴─────────────────────────────────────────┐
│           RECRUITER DASHBOARD (Next.js, same app)               │
│  - Create interview, send link, view report                     │
└─────────────────────────────────────────────────────────────────┘
```

Voice (OpenAI Realtime) re-introduced in Phase 1.5 by swapping the FSM's `Transport` from SSE to WebSocket-audio. The pipeline itself does not change.

---

## 5. Tech Stack

### Backend
- **Python 3.11 + FastAPI**, served by Uvicorn
- **SQLAlchemy 2.x** ORM + Alembic for migrations (Stage 1 uses `create_all`; Alembic introduced in Stage 2)
- **psycopg 3** (binary) Postgres driver
- LLM via **OpenRouter** (OpenAI-compatible Python SDK) → `deepseek/deepseek-chat-v3.1`
- Streaming via `StreamingResponse` (SSE) for AI → candidate
- Background jobs: stdlib `asyncio` queue for Phase 1 (graduate to RQ/Celery + Redis only if needed)

### Frontend
- **Vite 5 + React 18 + TypeScript**
- **Ant Design 5** (AntD) for all UI; `@ant-design/icons`
- React Router 6, TanStack Query 5, Zustand 5, Axios

### Infra
- DB → **Railway Postgres** (SSL)
- Hosting: web → Vercel, api → Railway
- Storage: Cloudflare R2 (resumes, future audio) — local-disk fallback in dev
- Auth: Clerk (recruiter), JWT links (candidate)
- Observability: Sentry (DSN-gated)

---

## 6. Repository Structure

```
hirex/
├── CLAUDE.md
├── README.md
├── .env.example / .env (gitignored)
│
└── apps/
    ├── api/                                    # FastAPI backend
    │   ├── pyproject.toml / requirements.txt
    │   ├── .venv/                              (gitignored)
    │   ├── app/
    │   │   ├── main.py                         # FastAPI bootstrap
    │   │   ├── config.py                       # pydantic-settings
    │   │   ├── routes/{health,interviews,reports}.py
    │   │   ├── services/
    │   │   │   ├── llm/openrouter.py           # OpenAI-compatible client
    │   │   │   ├── interview_session.py        # orchestrator FSM
    │   │   │   ├── question_pipeline/          # R1/R2/R3 + cross-Q
    │   │   │   ├── scoring/
    │   │   │   └── report/
    │   │   ├── db/{session,models}.py
    │   │   ├── prompts/                        # versioned LLM prompts
    │   │   └── rubrics/                        # JSON rubrics per role
    │   └── scripts/{smoke,init_db}.py
    │
    └── web/                                    # Vite + React + AntD
        ├── package.json
        ├── vite.config.ts
        ├── index.html
        └── src/
            ├── main.tsx / App.tsx
            ├── api/client.ts                   # axios instance
            ├── pages/                          # recruiter + candidate
            └── types/                          # hand-written wire types
```

---

## 7. Data Model (SQLAlchemy 2.x, Postgres)

`apps/api/app/db/models.py`. Tables: `users`, `interviews`, `questions`, `responses`, `reports`. Postgres enums for `role_type`, `role_variant`, `round`, `interview_status`, `question_type`, `generated_by`, `recommendation`. `pgvector` extension created in `init_db.py`; embedding columns reserved for Phase 1.5 retrieval features.

---

## 8. Key Flows

### Recruiter creates interview
1. Log in (Clerk, or dev fallback).
2. POST `/interviews` with JD + resume + role + round + limits.
3. Backend: upload resume to R2 (or local), extract text via `unpdf`, sign JWT, return `https://hirex.app/interview/<token>`.

### Candidate takes interview (text)
1. Open link → JWT verified → load metadata.
2. SSE stream opens; orchestrator FSM kicks off in `GREETING`.
3. For each question: pipeline picks next → LLM streams to candidate → candidate replies → LLM evaluates (probe or move on) → continue.
4. On end: closing message → background job generates report (transcript + per-question score + PDF).
5. Recruiter notified.

### Question pipeline
- **R1** (screening, ~15 min): 4–6 mixed questions.
- **R2** (deep technical, ~30 min): 3–5 questions; coding round descoped to 1.5.
- **R3** (behavioural / system design, ~30 min): 2–4 scenarios with heavy cross-Q.

---

## 9. Critical Implementation Notes

- **Cross-questioning is the moat.** The `cross-question.ts` prompt is production-critical. Version it, test against recorded transcripts.
- **Rubrics are JSON**, not prose. LLM scorer takes (response + rubric) → structured JSON. Never let it freestyle the rubric.
- **State lives in the DB FSM**, not in the LLM prompt context — prevents drift, lets us swap models.
- **JSON-mode** on OpenRouter: use `response_format: { type: "json_object" }` and instruct the model in the system prompt. Parse defensively.

---

## 10. Phase 1 Acceptance Criteria

- [ ] Recruiter creates interview from JD + resume + role + round.
- [ ] Candidate joins via link and completes a text interview.
- [ ] AI asks ≥4 tailored questions.
- [ ] AI produces ≥1 genuine cross-question grounded in the candidate's words.
- [ ] Time + question limits enforced server-side.
- [ ] All 7 roles have starter rubrics + question pools.
- [ ] Report with transcript + per-Q scores + overall recommendation + PDF.
- [ ] Zero Sentry criticals across a 10-interview smoke run.

---

## 11. Phase 1.5 backlog

- Voice (OpenAI Realtime or Deepgram+Cartesia) via Transport swap.
- Live coding round (Monaco + Judge0).
- Teams/Zoom Chrome extension (or Microsoft Graph / Zoom SDK bot).
- Audio recording → R2, async re-transcribe for fidelity.

---

*Last updated: Phase 1 kickoff, scaffold stage.*
