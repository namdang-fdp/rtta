# RTTA API

S05 exposes two independent raw WebSocket channels:

```text
Chrome extension -- PCM --> ws://localhost:8080/ws/audio
RTTA Web        <-- events -- ws://localhost:8080/ws/live
```

The extension owns the audio/translation session. RTTA Web is a subscriber: opening,
refreshing, or closing a web tab never stops audio capture or the provider session.
New `/ws/live` subscribers immediately receive `SESSION_STATE`, so a refreshed page
can discover the current local meeting without showing a session UUID to the user.

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
use `RTTA_TRANSLATION_DEVELOPMENT_SESSION_LIMIT=0s` to disable the local
120-second quota guard in a non-development environment. PhraseList is
intentionally disabled by default; it remains an opt-in domain-context
enhancement to be revisited in S06. When enabled, its default low-bias weight
is `1.1`.

Native Azure Speech SDK file logging is disabled by default. For a short local
diagnostic run, set `RTTA_TRANSLATION_AZURE_SDK_LOG_FILE=./azure-speech-sdk-diagnostic.log`.
The generated diagnostic log is ignored by Git.

The older spike runner remains disabled by default, so normal startup never
streams benchmark audio.

For local extension development, `/ws/audio` intentionally accepts origins
matching `chrome-extension://*`. This narrow development allowance supports
unpacked extension IDs; it is not a production origin or authentication policy.
For local web development, `/ws/live` accepts localhost and `127.0.0.1` HTTP
origins on any port.
