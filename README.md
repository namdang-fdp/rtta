# RTTA

RTTA is a local, single-user research meeting workspace for live English-to-Vietnamese translation.

```text
Google Meet / lecture
  → Chrome extension (16 kHz mono s16le PCM)
  → Spring Boot /ws/audio
  → Azure Speech Translation
  → PostgreSQL + pgvector / private MinIO
  → RTTA Web /ws/live + REST
```

The web app is the primary product. The extension is only the audio transport and a developer/fallback display; it is never middleware between Spring and RTTA Web.

PostgreSQL stores meetings, final transcript utterances, bookmarks, notes, AI explanations, summaries, document metadata/chunks, and recording metadata. pgvector performs exact semantic retrieval. Private MinIO buckets store original research documents and WAV recordings. Gemini runs only in Spring and provides contextual explanations, meeting summaries, and embeddings.

## Daily local workflow

Copy the example configuration once and replace the development passwords locally:

```sh
cp .env.example .env
cp rtta-api/.env.example rtta-api/.env
cp rtta-web/.env.example rtta-web/.env.local
```

Start infrastructure, then run Spring and Next.js natively:

```sh
docker compose up -d
cd rtta-api && ./mvnw spring-boot:run
cd rtta-web && bun install && bun run dev
```

MinIO serves its private S3 API at <http://localhost:9000> and local console at <http://localhost:9001>. Stop services with `docker compose stop`; named volumes preserve data. Use `docker compose down` only when the containers should be removed as well (named data volumes remain unless explicitly requested).

## Server-only configuration

Keep `SPEECH_KEY`, `GEMINI_API_KEY`, database credentials, and MinIO credentials in the backend environment. Never expose them through `NEXT_PUBLIC_*`, browser code, or extension configuration.

- `GEMINI_MODEL` selects normal Explain and Summary generation.
- `GEMINI_DEEP_MODEL` optionally selects explicit deeper explanations; normal Explain remains available when blank.
- `GEMINI_EMBEDDING_MODEL` selects document embeddings.
- `RTTA_TRANSLATION_PHRASE_LIST_ENABLED` remains `false` by product policy.
- Recording is opt-in and uses 16 kHz mono 16-bit WAV, about 32 KB/s or roughly 576 MB for five hours.

See each application README for its development and validation commands.
