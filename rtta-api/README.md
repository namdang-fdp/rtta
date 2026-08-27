# RTTA API

Spring exposes two independent raw WebSocket channels:

```text
Chrome extension -- PCM --> ws://localhost:8080/ws/audio
RTTA Web        <-- events -- ws://localhost:8080/ws/live
```

The extension owns the audio/translation session. RTTA Web is a subscriber: opening,
refreshing, or closing a web tab never stops audio capture or the provider session.
New `/ws/live` subscribers immediately receive `SESSION_STATE`, so a refreshed page
can discover the current local meeting without showing a session UUID to the user.

Every audio session creates a persisted meeting. Azure `FINAL` events are stored as
ordered, idempotent transcript rows before being broadcast; `PARTIAL` events remain
ephemeral. REST APIs under `/api/meetings` provide history, bookmarks, notes,
contextual Gemini explanations, explicit summaries, opt-in recordings, and private
research-document processing. PostgreSQL/pgvector owns structured and vector data;
MinIO owns WAV recordings and original documents.

Run it with Java 21:

```sh
./mvnw spring-boot:run
```

The audio endpoint accepts the S02 `START`/binary PCM/`STOP` sequence, preserves its
transport metrics, and streams each valid PCM frame into one isolated Azure
Speech translation session. Provider-independent `SESSION_STARTED`, `TRANSLATION`
(`PARTIAL`/`FINAL`), `SESSION_STOPPED`, and `ERROR` events are fanned out directly
to live web subscribers. The existing translation response to the extension remains
available as its developer/fallback surface; the extension is never middleware for
RTTA Web.

Azure credentials and settings are loaded from the optional root `.env` file or
the process environment. The production adapter follows the proven spike and
uses `SPEECH_KEY` plus `SPEECH_REGION`; a populated generic `SPEECH_ENDPOINT`
does not change that mode. Copy `.env.example`, keep `SPEECH_KEY` private, and
use `RTTA_TRANSLATION_DEVELOPMENT_SESSION_LIMIT=120s` only when the local
quota guard is desired. It defaults to `0s` (disabled) in production and is
not an Azure service limit. PhraseList is
intentionally disabled by default as a product policy.

Gemini uses the official Google Gen AI Java client behind `ResearchAiProvider`.
Configure `GEMINI_MODEL`, optional `GEMINI_DEEP_MODEL`, and
`GEMINI_EMBEDDING_MODEL`; the API key is server-only. Explain sends a bounded
utterance window plus relevant annotations and retrieved document chunks. Summary
uses bounded chronological intermediate summaries before final synthesis for long
meetings. Neither flow generates an Action Items section.

Recording starts only after an explicit web command. PCM already accepted by the
translation path is streamed to a temporary WAV, finalized, uploaded to private
MinIO, and removed locally. Playback streams through authenticated Spring with
single-range HTTP seeking; private storage URLs never reach the browser. A
five-hour recording is approximately 576 MB and is never buffered fully in JVM memory.

Native Azure Speech SDK file logging is disabled by default. For a short local
diagnostic run, set `RTTA_TRANSLATION_AZURE_SDK_LOG_FILE=./azure-speech-sdk-diagnostic.log`.
The generated diagnostic log is ignored by Git.

The older spike runner remains disabled by default, so normal startup never
streams benchmark audio.

`RTTA_WEB_ALLOWED_ORIGINS` remains the exact, comma-separated credentialed web
allowlist. `/ws/audio` accepts Chrome extension origins as a defense-in-depth
pattern, but Origin is not authentication: the first frame must be `AUTH` with
`RTTA_HOUSEHOLD_CODE` before START or PCM. Browser REST and `/ws/live` continue
to require the household Spring session.

Run all offline tests, including PostgreSQL/pgvector Testcontainers integration:

```sh
./mvnw test
./mvnw package
```

Tests use fake AI providers and do not consume Azure or Gemini quota.
