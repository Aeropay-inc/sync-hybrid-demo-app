# Sync Hybrid Demo App

This repo demonstrates a hybrid integration of the AeroSync widget across a simple Node.js web app and a React Native mobile app.

- Web: `WebApp/` serves a minimal site that initializes the AeroSync widget and supports multiple launch modes.
- Mobile: `AeroDonutsApp/` loads the web app in a WebView (in‑app) or opens it out‑of‑app (system browser), receives deep links back, and shows a result screen.

## Quick Start

- Requirements
  - Node.js >= 18 (for both projects)
  - Android Studio / Xcode for mobile (see React Native environment setup)

- Start the web app (default http://localhost:3000)
  - Windows PowerShell (or any shell)
  - In `WebApp/`:
    - Install: `npm i`
    - Run: `npm start`

- Start the mobile app (React Native)
  - In `AeroDonutsApp/`:
    - Install: `npm i`
    - Start Metro: `npm start`
    - Android: `npm run android`
    - iOS: `npm run ios` (macOS + Xcode required)

## Integration Flows

- Host (iframe in the web page)
  - The web page launches the widget inside an iframe (no app handoff).
- In‑App Browser (mobile webview)
  - Web page calculates the widget URL and postMessages it to the React Native WebView.
  - Mobile opens that URL in an in‑app browser.
- System Browser (out‑of‑app)
  - Mobile opens the web app URL in the system browser.
  - The web page itself launches AeroSync in a popup and handles return via deep link.

In In‑App Browser and System Browser cases, AeroSync completes with a deep link back to the app using the `aerodonutapp://` scheme.

## Deep Link Contract

- success
  - `aerodonutapp://?status=success&connectionId=...&clientName=...&aeroPassUserUuid=...`
- error
  - `aerodonutapp://?status=error&AC_CODE=...&description=...`
- close
  - `aerodonutapp://?status=close`

The mobile app parses the URL, builds a typed object, and navigates to a Result screen showing status and payload.

## Project Structure

- `WebApp/`
  - `index.js` Express server on port 3000
  - `public/index.html` main page initializing the widget
  - `public/aerosync-widget.js` local UMD build for offline/dev testing (optional)
- `AeroDonutsApp/`
  - `App.tsx` navigation, WebView, deep link handling, and Result screen

## Useful Commands

- Web
  - Install: `npm i` (inside `WebApp/`)
  - Run: `npm start`
  - Change port: `PORT=4000 npm start` (POSIX) or `$env:PORT=4000; npm start` (PowerShell)
- Mobile
  - Metro: `npm start`
  - Android: `npm run android`
  - iOS: `npm run ios`

## Notes

- Ensure your AeroSync token, environment, and deep link scheme are correct in `WebApp/public/index.html`.
- If using system browser mode on iOS/Android, confirm deep link configuration in native manifests (intent filters / URL types).
- For testing, you can manually open deep links via adb/xcrun or the platform UI and observe the Result screen.
