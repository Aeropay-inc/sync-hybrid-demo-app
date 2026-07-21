# Sync Hybrid Demo App

Demonstrates two ways a merchant app can integrate the AeroSync widget, both ending at a shared Wallet screen.

- **Web** (`WebApp/`) — a small Vue 3 SPA (5-screen onboarding via a stepper) served by an Express server. The AeroSync widget is launched on the Banking step. Express also hosts a tiny "boarding webhook" used by Option 2.
- **Mobile** (`AeroDonutsApp/`) — a fake merchant app ("AeroDonuts", React Native) with a Launcher that runs either demo option live.

## The two demo options

### Option 1 — Embedded (new flow)
- A full-screen **WebView** loads the SPA with `?handleOAuthManually=true`.
- AeroSync runs with `handleOAuthManually: true`, so it emits the OAuth URL via `onEvent` (`pageTitle === "launchExternalWindow"`, `onLoadApi`).
- The SPA forwards that URL to the app via `window.ReactNativeWebView.postMessage({ type: "AEROSYNC_OAUTH_URL", url })`.
- The app opens it in a **secure session** (`InAppBrowser.openAuth` → ASWebAuthenticationSession on iOS / Custom Tabs on Android).
- OAuth returns via the `aerodonutapp://` deep link; the session closes and AeroSync resumes inside the WebView, eventually firing `onSuccess`.
- The SPA shows **Congratulations**; its "Go to Wallet" button posts `{ type: "BOARDING_COMPLETE", account }`, and the app navigates to the native **Wallet**.

### Option 2 — Direct Sign-up (standalone)
- The whole SPA is opened in the system **InAppBrowser** with a `?sessionId=<id>`.
- AeroSync runs with `handleOAuthManually: false` (handles OAuth inline); the SPA only logs `onEvent`.
- On `onSuccess`, the SPA POSTs the boarding to the demo webhook (`POST /api/boarded`).
- The app **polls** `GET /api/boarded/:sessionId`; once boarded it closes the browser and routes to the native **Wallet**.

## Quick Start

- Requirements: Node.js >= 18 (both projects); Android Studio / Xcode for mobile.

- Web (`WebApp/`):
  - Install: `npm i`
  - Run: `npm start` (binds `0.0.0.0:3000`; prints the LAN URL)

- Mobile (`AeroDonutsApp/`):
  - Set `BASE_URL` in `config.ts` to the machine running the web app
    (physical device: LAN IP; Android emulator: `http://10.0.2.2:3000`; iOS sim: `http://localhost:3000`).
  - Install: `npm i`
  - Metro: `npm start`; then `npm run android` or `npm run ios`.

## Deep link scheme

`aerodonutapp://` — registered in `android/app/src/main/AndroidManifest.xml` and `ios/AeroDonutsApp/Info.plist`. Used as the OAuth redirect target for Option 1's secure session.

## Project Structure

- `WebApp/`
  - `index.js` — Express server (static SPA + `/api/boarded` webhook/poll endpoints)
  - `public/app.js` — Vue SPA (stepper, 5 screens, AeroSync integration, native messaging)
  - `public/brand.config.js` — branding presets
- `AeroDonutsApp/`
  - `App.tsx` — Launcher, Embedded WebView (Option 1), Direct Sign-up (Option 2), Wallet
  - `config.ts` — `BASE_URL` and deep link scheme
