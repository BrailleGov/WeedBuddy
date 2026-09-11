# WeedBuddy roadmap

Working plan for taking WeedBuddy from a local-only companion to **cloud accounts + sync** and **Luna** as the real chat persona.

## Current state

- Single-page app: chat (“Your buddy”), strain collection, little guide
- Data lives in browser `localStorage` (`weedbuddy.v1`)
- Export JSON for backup; no accounts, no sync
- Chat uses curated keyword replies (“Starter mode”), not a live model
- Tiny Node static server (`server.cjs`) on `127.0.0.1:5173`
- Public repo, early days

## North star

Keep the calm, personal, privacy-first feel — and add:

1. **Accounts** so the journal and chats follow the user across devices
2. **Luna** — a real model companion with a fixed system prompt / persona (see [`docs/luna-system-prompt.md`](docs/luna-system-prompt.md))
3. **Offline / export fallback** so a lost login or offline day doesn’t strand someone’s collection

---

## Phase 0 — Spec (before heavy code)

Lock these so build doesn’t thrash:

| Topic | Decision (default) |
| --- | --- |
| Luna persona | `docs/luna-system-prompt.md` v1; iterate in PRs |
| Data model | `User`, `Strain`, `Chat`, `Message` (+ settings later) |
| Auth | Username + password first; email optional later (reset) |
| Sync | Last-write-wins with timestamps; offer local→cloud import on first login |
| Photos | Object storage (S3/R2); store URLs in DB — not giant base64 blobs |

---

## Phase 1 — Backend skeleton

- Node API (Express or similar) + **Postgres**
- Tables: `users` (id, username, password_hash, created_at), `strains`, `chats`, `messages`
- Auth: register / login / logout; httpOnly session cookie or JWT + refresh
- Password hashing (argon2 or bcrypt); never store plaintext
- CORS, rate limits on auth and chat

**Ship:** authenticated API + health check.

## Phase 2 — Sync the journal

- Strain CRUD matching current fields: name, type, thc, cbd, date, lineage, flavors, effects, rating, source, notes, photo
- Photo upload → object storage → URL on the strain
- Client “signed in” mode: load from API, keep a local cache, keep Export
- First login: “Upload this browser’s collection?”

**Ship:** create account → add strain on phone → see it on desktop.

## Phase 3 — Luna

- Replace client `answer()` keyword tree with `POST /chat` → model call using the Luna system prompt
- Keep safety rails in the system prompt (emergencies, don’t drive, not medical advice)
- Persist messages server-side per chat; one-shot replies fine for v1 (streaming optional)
- UI: rename “Starter mode” → “Luna”; drop “CURATED STARTER RESPONSE”
- Optionally inject a **safe summary** of the user’s saved strains into context (never leak across users)

**Ship:** Luna answers open questions; journal stays the source of truth for personal notes.

## Phase 4 — Hardening

- Password reset; delete account / full export wipe
- README rewrite (current README is stale vs the real app)
- Playwright: auth, strain CRUD, Luna endpoint with a mocked model
- Deploy (Railway or Fly — pick one and stick)

---

## Suggested ticket order

1. Luna system prompt v1 (this repo — done when `docs/luna-system-prompt.md` lands)
2. DB schema + migrations
3. Auth endpoints + client login / register
4. Strain sync + local→cloud import
5. Chat persistence + Luna endpoint
6. Photo uploads
7. Deploy + README

## Open calls

Defaults in parentheses — change deliberately:

- Host: (**Railway** or Fly)
- DB: (**Postgres**)
- Model provider: (swappable — OpenAI / Anthropic / OpenRouter / etc.)
- Age gate: (**soft disclaimer** vs hard “I am of legal age” checkbox at signup)
