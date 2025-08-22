# WebApp

A minimal Node.js + Express server that serves a static page initializing the AeroSync widget. It supports three launch modes and can coordinate with the React Native app via postMessage.

- Entrypoint: `WebApp/index.js` (Express server)
- Page: `WebApp/public/index.html`
- AeroSync CDN: `<script src="https://cdn.qa-sync.aero.inc/2.1.5/aerosync-widget.js" defer></script>`

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

## Launch Modes

- Host (iframe)
  - The widget is launched inside the page via `widgetControls.launch()`.
- In‑App Browser
  - The page computes `getLaunchUrl()` and sends it to the React Native app using `window.ReactNativeWebView.postMessage(...)`.
- System Browser
  - The page itself opens the widget (popup) and manages lifecycle events directly.

The current mode is selected via the `workflow` query param: `?workflow=inAppBrowser|systemBrowser`. If omitted or invalid, it defaults to `host`.

## Integration Points

- `public/index.html`
  - Initializes the widget using `window.aerosync.initWidget({...})`
  - Key options:
    - `environment`: `sandbox | production`
    - `token`: AeroSync token 
    - `deeplink`: `aerodonutapp://` (need in mobile flow for in-app browser and system browser)
    - `widgetLaunchType`: `host | inAppBrowser | systemBrowser`
  - Events:
    - `onEvent(e)` – lifecycle events
    - `onLoad()` – widget loaded
    - `onSuccess(event)` – successful completion
    - `onClose()` – user closed
    - `onError(error)` – error occurred

- Local SDK vs CDN
  - CDN: `<script src="https://cdn.qa-sync.aero.inc/2.1.5/aerosync-widget.js" defer></script>`