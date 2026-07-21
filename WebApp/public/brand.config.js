/**
 * Branding configuration for the demo SPA.
 *
 * Each entry is a named brand preset. Switch the active brand by changing
 * `ACTIVE_BRAND` below (or override at runtime with `?brand=<key>` in the URL).
 * This is the "configurable branding, like Spire" knob — reskin the whole
 * onboarding flow without touching component code.
 */
(function () {
  const BRANDS = {
    syncrovibe: {
      name: 'SyncroVibe',
      tagline: 'Seamless bank-linked payments',
      // Optional logo image URL. If null, we render the brand initial in a badge.
      logoUrl: null,
      // Theme colors.
      primary: '#7c3aed',
      primaryDark: '#6d28d9',
      accent: '#a78bfa',
      // Copy used on the Welcome screen.
      welcomeTitle: 'Welcome to SyncroVibe',
      welcomeBody:
        'Link a bank account securely to get started. Your credentials are never stored, shared, or exposed.',
    },

    spire: {
      name: 'Spire',
      tagline: 'Banking, reimagined',
      logoUrl: null,
      primary: '#0ea5e9',
      primaryDark: '#0284c7',
      accent: '#38bdf8',
      welcomeTitle: 'Welcome to Spire',
      welcomeBody:
        'Open your account in minutes. Connect your bank instantly and start moving money with confidence.',
    },
  };

  // Default brand shown when no `?brand=` override is present.
  const ACTIVE_BRAND = 'spire';

  // Allow live switching for demos: ?brand=syncrovibe
  let selected = ACTIVE_BRAND;
  try {
    const q = new URLSearchParams(window.location.search).get('brand');
    if (q && BRANDS[q]) selected = q;
  } catch (_) {
    /* ignore malformed URL */
  }

  window.BRANDS = BRANDS;
  window.BRAND = BRANDS[selected];
})();
