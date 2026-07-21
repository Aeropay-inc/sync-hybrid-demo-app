# WebApp

A minimal Node.js + Express server that serves a small **Vue 3 SPA** onboarding flow. The SPA walks a user through five screens via a stepper, with the AeroSync widget launched (iframe) on the Banking step.

The SPA uses the Vue 3 global build from CDN — **no build step**. The whole app is still just static files served by Express, so it stays trivial to host inside the RN WebView / InAppBrowser flow.

- Entrypoint: `WebApp/index.js` (Express server)
- SPA files (in `WebApp/public/`):
  - `index.html` — mount point; loads Vue, branding config, styles, and the app
  - `app.js` — Vue app: stepper + the five screen components + form state
  - `brand.config.js` — branding presets (the "configurable, like Spire" knob)
  - `styles.css` — styles; brand colors are injected as CSS variables at runtime
- AeroSync CDN: `<script src="https://cdn.sync.aero.inc/2.1.5/aerosync-widget.js" defer></script>`

## Screens (stepper)

1. **Welcome** — logo + brand copy, "Continue". Branding is configurable.
2. **Enroll** — first/last name, email, phone, PIN, T&Cs checkbox.
3. **Address** — street, city, state, ZIP, DOB.
4. **Banking** — the key screen. Two options:
   - **Instant (AeroSync)** — launches the widget (the demo path).
   - **Manual** — routing/account number stub.
5. **Congratulations** — "Account linked!" success + summary.

## Branding

Edit `WebApp/public/brand.config.js`. It exports named presets (`spire`, `syncrovibe`) with name, tagline, colors, and optional logo URL. Set `ACTIVE_BRAND` to change the default, or switch live in a demo with `?brand=<key>` (e.g. `?brand=syncrovibe`).

## Native integration (URL params)

The native app selects the AeroSync behavior via query params:

- `?handleOAuthManually=true` — **Option 1 (embedded / RN WebView)**. AeroSync emits the OAuth URL via `onEvent`; the SPA forwards it to the app with `postMessage({ type: "AEROSYNC_OAUTH_URL", url })`. On the Congratulations screen, "Go to Wallet" posts `{ type: "BOARDING_COMPLETE", account }`.
- `?sessionId=<id>` — **Option 2 (standalone InAppBrowser)**. `handleOAuthManually` stays `false`; on `onSuccess` the SPA POSTs the boarding to the webhook below so the polling native app can continue.

### Boarding webhook (Option 2)

- `POST /api/boarded` — body `{ sessionId, account }`. Called by the SPA on success.
- `GET /api/boarded/:sessionId` — returns `{ boarded, account }`. Polled by the native app.

In-memory only (a demo store); restarting the server clears it.

## Quick Start

- Requirements
  - Node.js >= 18

- Install
```bash
npm i
```

- Run (default http://localhost:3000)
```bash
npm start
```

- Change port
```bash
# PowerShell (Windows)
$env:PORT=4000; npm start
# macOS/Linux
PORT=4000 npm start
```

## Widget Launch

The AeroSync widget is launched inside the page (iframe) on the Banking step via `widgetControls.launch()`.

## Integration Points

- `public/app.js` (Banking screen)
  - Initializes the widget using `window.aerosync.initWidget({...})`
  - Key options:
    - `environment`: `sandbox | production`
    - `token`: AeroSync token
    - `deeplink`: `aerodonutapp://`
  - Events:
    - `onEvent(e)` – lifecycle events
    - `onLoad()` – widget loaded
    - `onSuccess(event)` – successful completion
    - `onClose()` – user closed
    - `onError(error)` – error occurred

- Local SDK vs CDN
  - CDN: `<script src="https://cdn.qa-sync.aero.inc/2.1.5/aerosync-widget.js" defer></script>`