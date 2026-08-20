# Lingoza

A complete Spanish learning ecosystem — from *"I know absolutely no Spanish"* to understanding native speech, writing complex texts and communicating confidently.

One learning engine drives three interfaces: a web app, a Telegram bot, and any future mobile client. Start a lesson in the browser, finish it in a chat, and the progress is the same progress.

---

## Deploy

Link to bot: [https://t.me/lingoza_bot](https://t.me/lingoza_bot)

## Quick start

```bash
npm install
cp .env.example .env       # optional: add GEMINI_API_KEY for the AI tutor
npm run db:up              # Postgres in Docker (host port 5434)
npm run db:generate
npm run db:deploy          # apply migrations
npm run db:seed            # verifies the curriculum, then loads it
npm run dev                # API on :4000, web on :5173
```

Or in one step: `npm run setup`.

Open <http://localhost:5173> and create an account. Everything works without any API key — the AI features fall back to deterministic rule-based evaluation and say so.

---

## What is here

| Section of the brief | Where it lives |
|---|---|
| CEFR levels A1→C2, modules, lessons | `packages/content/src/curriculum/` |
| Placement test and level estimation | `packages/engine/src/learning/placement.ts` |
| Nine-section lesson structure | `packages/engine/src/learning/lesson-session.ts` |
| Spaced repetition | `packages/engine/src/learning/srs.ts` |
| Grammar, incl. ser/estar, por/para… | `packages/content/src/grammar/` |
| Listening, reading, click-to-translate | `apps/api/src/services/media.ts` |
| Songs: coverage, vocabulary, grammar, quiz | `apps/api/src/services/songs.ts` |
| Line-by-line reading of pasted Spanish | `apps/api/src/services/breakdown.ts` |
| Speaking evaluation | `packages/engine/src/ai/speaking.ts` |
| AI tutor | `packages/engine/src/ai/tutor.ts` |
| Writing evaluation | `packages/engine/src/ai/writing.ts` |
| Progress dashboard | `apps/api/src/services/progress.ts` |
| Personalised adaptation | `packages/engine/src/learning/adaptivity.ts` |
| Daily session generator | `packages/engine/src/learning/daily.ts` |
| Culture & regional variation | `packages/content/src/culture/` |
| Real-world scenarios | `packages/content/src/culture/scenarios.ts` |
| Gamification | `packages/engine/src/learning/gamification.ts` |
| Telegram bot | `apps/api/src/telegram/` |
| Backend & database | `apps/api/`, `prisma/schema.prisma` |
| Web UI | `apps/web/` |

---

## Architecture

```
packages/engine    Pure TypeScript. No HTTP, no database, no React.
                   SRS · placement · scoring · adaptivity · daily planning
                   · gamification · lesson state machine · AI evaluation
        ▲
packages/content   The curriculum as data: courses, vocabulary, grammar,
                   placement bank, culture, scenarios — plus live sourcing
                   (Tatoeba, Spanish press) and a verification suite.
        ▲
apps/api           Hono REST API. Thin routes → services → engine + Prisma.
                   Also hosts the Telegram webhook, which calls the *same*
                   services the web app calls.
        ▲
apps/web           Vite + React 19 SPA (TanStack Router + Query).
```

The dependency arrows only point upward. The engine cannot import the API; the content package cannot import the database. That is what makes the same learning system usable by a browser, a chat bot and a mobile app without forking the logic.

See [ARCHITECTURE.md](ARCHITECTURE.md) for the layering rules and how to extend each layer.

---

## Content verification

Learning material that is subtly wrong is worse than none: a learner cannot tell, and will reproduce the error confidently. So the curriculum is machine-checked, and the seed refuses to run if it fails.

```bash
npm run content:verify
```

It checks three classes of problem:

- **Structural** — do references resolve, are slugs unique, is the prerequisite graph acyclic and forward-only.
- **Pedagogical** — is every lesson taught with material at or below its own level; does every lesson have practice; does every question explain *why*.
- **Linguistic** — paired `¿…?` and `¡…!`, accented interrogatives, multiple-choice answers actually present among their options, examples that contain the word they illustrate.

This caught five real errors during development, including an A1 lesson linking A2 grammar and a B2 lesson linking a C1 topic.

---

## Where content comes from

- **Curriculum, grammar, exercises** — authored in `packages/content`, reviewable in diffs, verified in CI.
- **Vocabulary examples** — supplemented by [Tatoeba](https://tatoeba.org) (CC-BY 2.0 FR), so learners see attested native usage rather than invented sentences.
- **Reading and listening at B1+** — today's actual Spanish press (El País, elDiario.es, Infobae, BBC Mundo), filtered by a Fernández-Huerta readability estimate so a B1 reader is not handed a dense C2 editorial. Headlines and links only; full articles are read on the publisher's site.
- **Audio** — browser speech synthesis, so every word has audio immediately. The schema has an `audioUrl` slot for recorded audio.

Sourcing never blocks a request. If a source is unreachable, the learner sees the authored material and nothing breaks.

---

## AI providers

`GEMINI_API_KEY` → `GROQ_API_KEY` → deterministic rules, tried in that order.

```bash
GEMINI_API_KEY="…"
GEMINI_MODEL="gemini-flash-latest"   # or a pinned Flash revision
GROQ_API_KEY="…"
GROQ_MODEL="openai/gpt-oss-120b"
```

With no key at all, the tutor cannot converse and says so plainly, while writing still gets mechanical checking and speaking still gets transcript-based analysis. The UI always states which produced a score, and never presents a fallback result as a full assessment.

---

## Telegram

```bash
# 1. Create a bot with @BotFather, put the token in .env
# 2. Expose the API over HTTPS (dev: cloudflared tunnel --url http://localhost:4000)
# 3. Set PUBLIC_API_URL to that URL, then:
npm run telegram:register --workspace @lingoza/api
```

Commands: `/start` `/register` `/daily` `/lesson` `/review` `/vocabulary` `/practice` `/speak` `/progress` `/stats` `/remind` — almost everything is driven by inline buttons rather than typing.

A chat that has never been linked gets its own account, so someone can start learning entirely in Telegram. `/link CODE` (code from the web app's Settings) attaches the chat to an existing account.

### Daily reminders

The bot nudges three times a day, at hours the learner chooses (`/remind 8 13 21`, or the presets in the web app's Settings), interpreted in their own timezone. Position in the day decides what each one is, so a learner who studies nights gets the same three *kinds* of message at their own hours:

| Slot | What arrives |
|---|---|
| First | Today's plan — how long it takes, what's due, one button to start |
| Middle | A single vocabulary card, answerable in the chat. The reminder *is* the review |
| Last | Only if the day is still empty: how close the streak is to breaking. A finished day gets a one-line recap, or nothing at all |

The API sweeps every 10 minutes and delivers whichever slot a learner has just passed — one at a time, so an outage never produces a burst of stale nudges. Delivery is claimed through a unique key on `Notification`, which is what makes a restart, a manual run and a second replica all safe.

```bash
REMINDERS=off                  # stop the sweep entirely
REMINDER_INTERVAL_MINUTES=10   # how often it looks

npm run reminders:run --workspace @lingoza/api   # send one sweep now
```

---

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | API and web together |
| `npm run build` | Build every workspace |
| `npm run reminders:run -w @lingoza/api` | Send one round of due reminders and exit |
| `npm run typecheck` | Typecheck everything |
| `npm test` | Engine test suite |
| `npm run content:verify` | Verify the curriculum |
| `npm run db:up` / `db:down` | Start/stop the local Postgres |
| `npm run db:migrate` | Create a migration from schema changes |
| `npm run db:deploy` | Apply pending migrations |
| `npm run db:studio` | Browse the database |
| `npm run deploy:up` | Run the full production stack locally |

---

## Deploying

Everything runs as three containers — Postgres, the API (which also serves the built SPA), and Caddy for automatic HTTPS:

```bash
docker compose up -d --build
```

The API container applies migrations and seeds the curriculum on start, so a deploy is "pull and restart".

For a step-by-step walkthrough on an Oracle Cloud VPS — including the two separate firewall layers that catch everyone, and pointing the Telegram webhook at a permanent HTTPS URL so the bot runs with your laptop shut down — see **[DEPLOYMENT.md](DEPLOYMENT.md)**.
