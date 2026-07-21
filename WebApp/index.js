const path = require('path');
const express = require('express');

const os = require('os');

const app = express();
const PORT = process.env.PORT || 3000;
// Bind all interfaces so the app is reachable over the LAN (e.g. from a phone
// or the RN app). Override with HOST=127.0.0.1 to restrict to localhost.
const HOST = process.env.HOST || '0.0.0.0';

app.use(express.json());

// Serve static assets from /public
app.use(express.static(path.join(__dirname, 'public')));


// Serve index.html at root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

/* ---------------------------------------------------------------------------
   Demo "boarding webhook" store (Option 2 — Direct Sign-up).

   The standalone SPA (opened in the native app's InAppBrowser) POSTs here on
   AeroSync onSuccess. The native app can't see that JS success event because
   the InAppBrowser is a system browser tab, so it polls /api/boarded/:id and
   routes to its Wallet screen once boarding is recorded.

   In-memory only — fine for a demo; restart clears it.
--------------------------------------------------------------------------- */
const boardings = new Map(); // sessionId -> { boarded: true, contact, at }

// Webhook: SPA reports a completed boarding for a session.
app.post('/api/boarded', (req, res) => {
  const { sessionId, contact } = req.body || {};
  if (!sessionId) {
    return res.status(400).json({ error: 'sessionId required' });
  }
  boardings.set(sessionId, { boarded: true, contact: contact || null, at: Date.now() });
  console.log('[boarded] session', sessionId, contact);
  res.json({ ok: true });
});

// Poll: native app checks whether a session has boarded yet.
app.get('/api/boarded/:sessionId', (req, res) => {
  const entry = boardings.get(req.params.sessionId);
  if (!entry) return res.json({ boarded: false });
  res.json(entry);
});

// 404 handler for unknown routes (after other routes)
app.use((req, res) => {
  res.status(404).send('Not Found');
});

app.listen(PORT, HOST, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  if (HOST === '0.0.0.0') {
    // Print LAN addresses so you can open the app from another device.
    const nets = os.networkInterfaces();
    for (const name of Object.keys(nets)) {
      for (const net of nets[name] || []) {
        if (net.family === 'IPv4' && !net.internal) {
          console.log(`  on your network: http://${net.address}:${PORT}`);
        }
      }
    }
  }
});
