# RTTA API

S02 exposes a raw WebSocket audio ingest endpoint at:

```text
ws://localhost:8080/ws/audio
```

Run it with Java 21:

```sh
./mvnw spring-boot:run
```

The endpoint accepts the S02 `START`/binary PCM/`STOP` sequence, records only
transport metrics, and discards each PCM payload. The older spike runner is
disabled by default so the WebSocket server remains running.

For local extension development, `/ws/audio` intentionally accepts origins
matching `chrome-extension://*`. This narrow development allowance supports
unpacked extension IDs; it is not a production origin or authentication policy.
