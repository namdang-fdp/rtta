# RTTA production deployment

RTTA production consists of two environment-agnostic images: Spring on loopback port 8080 and Next.js on loopback port 3000. PostgreSQL and S3-compatible storage remain private. Cloudflare Tunnel is the only public ingress; no nginx is required.

## One-time setup

1. In GitHub, configure only `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN`. GHCR uses the workflow-provided `GITHUB_TOKEN`.
2. Create `.env.production` beside `compose.prod.yaml` from `.env.production.example` and replace every placeholder. Never commit it.
3. Set `RTTA_INFRA_NETWORK` to an existing private Docker network that resolves/reaches the configured PostgreSQL and object-storage hosts. Attach the existing infrastructure containers to that network if Docker hostnames such as `postgres` or `minio` are used. RTTA does not create or publish either service.
4. Generate one high-entropy `RTTA_HOUSEHOLD_CODE`. This is the household's **Mã gia đình** for both RTTA Web and the extension.

`RTTA_TRANSLATION_DEVELOPMENT_SESSION_LIMIT` is only a local Azure-F0 quota guard. It is not an Azure service limit. Production defaults to `0s` (unlimited/disabled); local development may opt into `120s`.

## Publish and deploy

1. Push `main` and wait for API, web, and extension validation to finish before the image-publish job.
2. Select `main` for the moving deployment or preferably immutable `sha-<full-commit>` tags for both images.
3. Set `RTTA_API_IMAGE` and `RTTA_WEB_IMAGE` in `.env.production` to matching tags.
4. On the server, run:

   ```sh
   docker compose --env-file .env.production -f compose.prod.yaml pull
   docker compose --env-file .env.production -f compose.prod.yaml up -d
   docker compose --env-file .env.production -f compose.prod.yaml ps
   curl --fail http://127.0.0.1:8080/health
   curl --fail http://127.0.0.1:3000/health
   ```

5. Configure the existing named Cloudflare tunnel with this reference ingress and route the two DNS hostnames to it:

   ```yaml
   ingress:
     - hostname: temthui.dorriss.com
       service: http://127.0.0.1:3000
     - hostname: api-rtta.dorriss.com
       service: http://127.0.0.1:8080
     - service: http_status:404
   ```

   The same API hostname upgrades both `wss://api-rtta.dorriss.com/ws/live` and `wss://api-rtta.dorriss.com/ws/audio`. Spring uses forwarded headers so the externally secure scheme is retained behind the tunnel.

6. Verify the two HTTPS health/application routes externally. The API health response contains only UP state.

## Authentication and CSRF

The browser first calls `GET /api/auth/me` with `credentials: include`. This creates/loads a Spring session CSRF token and returns authentication state plus that token. `POST /api/auth/login`, `POST /api/auth/logout`, and every mutating research request send the token in `X-CSRF-TOKEN`. The API session cookie is host-only, HttpOnly, Secure in production, and SameSite=Strict. Exact credentialed CORS permits only `RTTA_WEB_ALLOWED_ORIGINS`.

`/ws/live` uses the same authenticated API-domain session cookie and independently checks the exact web Origin. Closing the web subscriber does not own or terminate the audio/provider session.

The extension never uses the household session cookie. Its first WebSocket frame is `AUTH` with the locally stored household code. The API compares it with `RTTA_HOUSEHOLD_CODE` using constant-time verification and responds `AUTHENTICATED`; only then does the extension send `START` and PCM. Failed authentication returns a generic error and closes the socket before Azure opens. Chrome extension Origin filtering is defense-in-depth only and is not authentication.

## Extension artifact

1. Download the `rtta-extension-<run>-<sha>` Actions artifact.
2. Extract it.
3. Open `chrome://extensions`.
4. Enable Developer Mode.
5. Select **Load unpacked** and choose the extracted Chrome MV3 directory.
6. Open the RTTA extension.
7. Under **Kết nối RTTA**, enter the same **Mã gia đình** used by RTTA Web and select **Lưu & kết nối**.
8. Done. The code remains only in `chrome.storage.local`, is never displayed after saving, and can be replaced or cleared from the popup.

Installing the artifact requires no server environment edit or API restart.

## Recording privacy

The authenticated `/play` endpoint streams WAV bytes from private storage. Full requests return 200; a valid single `Range: bytes=...` returns 206 with `Accept-Ranges`, `Content-Range`, and exact `Content-Length`; unsatisfiable or multiple ranges return 416. Spring streams a bounded object-storage response and never redirects or returns the storage endpoint.

## Rollback

Pin both image variables to a previously published `sha-<commit>` from the same release, then run:

```sh
docker compose --env-file .env.production -f compose.prod.yaml pull
docker compose --env-file .env.production -f compose.prod.yaml up -d
```

Do not rebuild images on the server.

## Manual acceptance

Local production-like:

1. Start production-like fake/private infrastructure and both containers with non-live provider credentials.
2. Log in with the household code; reload and confirm authentication persists.
3. Confirm an unauthenticated `/api/meetings` request returns 401.
4. Confirm authenticated web live WebSocket connection/reconnection works.
5. Clear the saved household code and confirm the Vietnamese setup state appears.
6. Save an invalid household code and confirm capture is rejected before a meeting starts.
7. Save the valid household code and confirm existing tab capture, PARTIAL/FINAL, and reconnect behavior.
8. Record a short meeting and play it through the API without any redirect.
9. Seek repeatedly in the HTML5 audio control and confirm 206 responses.
10. Log out, confirm research content disappears, and log in again.

Server:

1. Pull matching immutable API/web images and start Compose.
2. Confirm both services are healthy and only `127.0.0.1:8080`/`127.0.0.1:3000` are bound.
3. Apply the two-host tunnel ingress and verify both HTTPS domains.
4. Log in externally and install the CI extension artifact.
5. Enter the same household code used by RTTA Web in the extension; no server-side change is required.
6. Smoke a real Meet/YouTube translation; verify PARTIAL/FINAL and transcript persistence.
7. Smoke recording playback/seeking, bookmark/notes/summary/explanation/RAG, and meeting history.
8. Restart containers; confirm the prior in-memory login session is invalidated and a fresh login works.
9. Pin the prior paired `sha-*` images and perform the rollback smoke check.
