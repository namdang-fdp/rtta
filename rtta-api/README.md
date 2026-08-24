# RTTA API

S03 exposes a raw WebSocket audio ingest endpoint at:

```text
ws://localhost:8080/ws/audio
```

Run it with Java 21:

```sh
./mvnw spring-boot:run
```

The endpoint accepts the S02 `START`/binary PCM/`STOP` sequence, preserves its
transport metrics, and streams each valid PCM frame into one isolated Azure
Speech translation session. Provider-independent partial and final translation
events are logged by the backend only; no translation result is sent to the
extension in S03.

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
