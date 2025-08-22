# AeroDonutsApp – Project Guide

A React Native app demonstrating in‑app and out‑of‑app flows for the AeroSync widget, with typed deep link handling and a Result screen.

## Requirements

- Node.js >= 18
- Android Studio and/or Xcode (see React Native environment setup)

## Install & Run

```bash
# from AeroDonutsApp/
npm i

# start Metro bundler
npm start

# run Android (emulator/device)
npm run android

# run iOS (Simulator, macOS only)
npm run ios
```

## App Overview

- `App.tsx`
  - Home screen: choose `inAppBrowser` (in‑app) or `systemBrowser` (out‑of‑app)
  - `PaymentWebView` screen: hosts the WebApp or exchanges postMessage with it
  - Deep link listener: parses `aerodonutapp://?...` into typed `DeepLinkParams`
  - Result screen: shows status + payload and a Home button

## Flows

- In‑App Browser
  - Home selects in‑app
  - WebApp computes `getLaunchUrl()` and postMessages it to React Native WebView
  - Mobile opens that URL in an in‑app browser (`react-native-inappbrowser-reborn`)

- System Browser (Out‑of‑App)
  - Home selects out‑of‑app
  - Mobile opens the WebApp in the system browser
  - WebApp launches the widget directly (popup) and completes

In both flows, AeroSync deep‑links back using the `aerodonutapp://` scheme.

## Deep Link Events

- success
  - `status=success`
  - payload: `{ connectionId, clientName, aeroPassUserUuid }`
- error
  - `status=error`
  - payload: `{ AC_CODE, description }`
- close
  - `status=close`

On receipt, the app navigates to `Result` to display status and payload; use the Home button to return.

## Troubleshooting

- Ensure `aerodonutapp://` is registered in native config (Android intent filters; iOS URL types)
- When using system browser, confirm popup permissions and valid token/environment in `WebApp/public/index.html`
- If WebApp runs on a non‑default port/host, update URLs accordingly
