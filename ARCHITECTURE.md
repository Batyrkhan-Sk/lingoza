# Architecture

The single organising rule: **the learning system is independent of every interface**. A learner's level, streak, review queue and lesson position are computed by one engine and stored once. The web app, the Telegram bot and a future mobile client are all just renderers over it.

## Layers

```
┌─ apps/web ──────────────┐   ┌─ apps/api/src/telegram ─┐   ┌─ mobile (future) ─┐
│  React SPA              │   │  Bot webhook            │   │                   │
└───────────┬─────────────┘   └───────────┬─────────────┘   └─────────┬─────────┘
            └───────────────────┬─────────┴───────────────────────────┘
                                ▼
                   ┌─ apps/api/src/http ────────────┐
                   │  REST routes (thin: validate,  │
                   │  call a service, serialise)    │
                   └───────────────┬────────────────┘
                                   ▼
                   ┌─ apps/api/src/services ────────┐
                   │  Application logic. The only   │
                   │  layer that touches Prisma.    │
                   └───────────────┬────────────────┘
                    ┌──────────────┴───────────────┐
                    ▼                              ▼
      ┌─ packages/engine ────────┐   ┌─ packages/content ────────┐
      │  Domain. Pure functions. │   │  Curriculum as data.      │
      │  No I/O of any kind.     │   │  Sources + verification.  │
      └──────────────────────────┘   └───────────────────────────┘
```

### Rules

1. **`packages/engine` imports nothing from this repo.** No Prisma, no Hono, no React, no `fetch` except in the explicitly-isolated `ai/` provider adapters. Everything is a pure function over plain data, which is why it is directly unit-testable and why the bot and the web app cannot drift apart.
2. **`packages/content` may import `@lingoza/engine`** (for shared domain types) and nothing else. It knows nothing about storage or transport.
3. **Services are the only place that touches the database.** Routes do not query Prisma; neither does the bot.
4. **Interfaces never contain learning logic.** When the Telegram bot grades an answer, it calls `submitExercise` — the same function the web app calls. There is no second scoring path to keep in sync.

### Why this matters in practice

A learner completes lesson section 3 in the browser and section 4 in Telegram. Both write through `completeLessonSection`, which asks the engine's state machine for the next section and stores the result. Neither client holds lesson position in memory, so there is nothing to reconcile.

## Extension points

| To add… | Do this |
|---|---|
| A lesson or module | Add it to `packages/content/src/curriculum/<level>.ts`, run `npm run content:verify`, reseed. Order in the array *is* the teaching order. |
| Vocabulary | Add a row to `packages/content/src/vocabulary/<level>.ts`. Plurals and frequency ranks are derived. |
| A grammar topic | `packages/content/src/grammar/<level>.ts`. A contrast pair goes in `contrasts.ts`. |
| A content source | Implement `ContentSource<Query, Item>` in `packages/content/src/sources/`, wire it into `ContentSources`. Must degrade to empty on failure. |
| An AI provider | Implement `LlmProvider` in `packages/engine/src/ai/`, add it to the `AiClient` chain. |
| Real pronunciation scoring | Implement `PronunciationBackend` (`packages/engine/src/ai/speaking.ts`) against an acoustic service and call it from `submitSpeaking`. |
| A new interface (mobile) | Consume the REST API. Do not reimplement scoring — every write path already exists as a service. |
| A verification rule | `packages/content/src/verify/rules.ts`. Errors block the seed; warnings do not. |

## Deliberate limitations

These are design decisions, not oversights:

- **Speaking pronunciation is a transcript proxy, not phonetic assessment.** Evaluation runs on speech-recognition output, so a strong but intelligible accent scores well. `PronunciationBackend` is the seam for a real acoustic scorer (Azure Pronunciation Assessment, or a self-hosted MFA pipeline). The UI states this rather than implying otherwise.
- **Audio is speech synthesis**, not recordings by native speakers with regional accents. `VocabularyWord.audioUrl` and `ListeningExercise.audioUrl` exist for real audio; synthesis is the honest interim.
- **Re-seeding replaces exercises wholesale**, which discards `QuestionAttempt` links for edited questions. Acceptable while content is being authored; needs a content-versioning strategy before production.
- **Telegram account linking does not merge histories.** A Telegram-only account created before linking is discarded rather than silently combined with the web account, because a merged mixture of two progress histories cannot be explained to the learner.
