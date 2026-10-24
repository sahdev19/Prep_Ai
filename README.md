# PrepAI

AI-powered placement preparation platform (MERN + LLM + RAG). See `docs/ARCHITECTURE.md`.

## Quick start
```bash
cp .env.example server/.env
docker compose up --build          # API on :4000 + MongoDB
cd client && npm install && npm run dev   # UI on :5173
```
Check: `curl localhost:4000/health` and `curl localhost:4000/ready`.

## Development
```bash
cd server && npm install
npm run dev | typecheck | test | build
```

## Status
- [x] Phase 1 Requirements, Phase 2 Architecture
- [x] Phase 5 Foundation: config validation, logging, error contract, health/readiness, security headers, rate limit, Docker, CI
- [ ] Phase 3 Data and API design, Phase 4 UI/UX, Phase 6 Auth, Phase 7 Features
