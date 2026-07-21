/* ---------------------------------------------------------------------------
   Bank Onboarding Demo — Vue 3 (CDN global build, no build step).

   Five screens driven by a stepper:
     0. Welcome   — branding + Continue
     1. Enroll    — name, email, phone, PIN, T&Cs
     2. Address   — street, city, state, zip, DOB
     3. Banking   — Instant (AeroSync) or Manual (routing/account stub)
     4. Congrats  — "Account linked!" success

   The AeroSync widget is launched on the Banking step via widgetControls.launch().
--------------------------------------------------------------------------- */

const { createApp } = Vue;

/* ---------------------------------------------------------------------------
   Native integration mode — driven by URL params passed by the RN app.

   Option 1 (Embedded / RN WebView):  ?handleOAuthManually=true
     - AeroSync runs with handleOAuthManually=true. It emits the OAuth URL via
       onEvent; we forward it to the native app, which opens it in a secure
       session (ASWebAuthenticationSession). onSuccess arrives after OAuth.
     - Handoff to the native Wallet happens via a postMessage from the
       Congratulations screen ("Go to Wallet").

   Option 2 (Direct Sign-up / native InAppBrowser):  ?sessionId=<id>
     - handleOAuthManually=false. We only log onEvent. On onSuccess we POST to
       the demo webhook (/api/boarded) so the native app (which is polling)
       can route to its Wallet screen.
--------------------------------------------------------------------------- */
const NATIVE = (function () {
  let handleOAuthManually = false;
  let sessionId = null;
  try {
    const q = new URLSearchParams(window.location.search);
    handleOAuthManually = q.get('handleOAuthManually') === 'true';
    sessionId = q.get('sessionId');
    // Persist the sessionId so it survives full-page OAuth redirects that drop
    // the query param; recover it on a later load that lacks the param.
    if (sessionId) {
      localStorage.setItem('demo_sessionId', sessionId);
    } else {
      sessionId = localStorage.getItem('demo_sessionId');
    }
  } catch (_) {
    /* ignore malformed URL / storage errors */
  }
  // We can only postMessage to the RN app when hosted inside its WebView.
  const inReactNativeWebView = !!(window.ReactNativeWebView && window.ReactNativeWebView.postMessage);
  return { handleOAuthManually, sessionId, inReactNativeWebView };
})();
console.log('native integration:', NATIVE);

/** Post a JSON message to the hosting RN WebView, if present. */
function postToNative(message) {
  if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
    window.ReactNativeWebView.postMessage(JSON.stringify(message));
  }
}

/** The merchant-side contact info shown on the native Wallet screen. */
function contactFromForm(form) {
  return {
    name: [form.firstName, form.lastName].filter(Boolean).join(' ').trim(),
    email: form.email,
    phone: form.phone,
  };
}

/** Report a completed boarding to the demo webhook (Option 2). */
function reportBoarding(contact) {
  if (!NATIVE.sessionId) {
    console.warn('[webhook] skipped — no sessionId in URL (not Option 2?)');
    return Promise.resolve();
  }
  console.log('[webhook] POST /api/boarded', { sessionId: NATIVE.sessionId, contact });
  return fetch('/api/boarded', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId: NATIVE.sessionId, contact }),
  })
    .then((res) => console.log('[webhook] server responded', res.status))
    .catch((err) => console.warn('[webhook] failed:', err));
}

/**
 * Option 2 only: bring the native app back to the foreground via deep link.
 * The app is running an InAppBrowser (system tab) in front, which pauses the
 * app's JS poll timer on Android — so we wake it, and its poll then closes the
 * browser and routes to the Wallet.
 */
function returnToNativeApp() {
  if (NATIVE.handleOAuthManually || !NATIVE.sessionId) return;
  console.log('[option2] waking native app via deep link');
  window.location.href = 'aerodonutapp://boarded?sessionId=' + encodeURIComponent(NATIVE.sessionId);
}

/** Demo form defaults so the flow always has data even when you skip typing. */
function defaultForm() {
  return {
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane.doe@example.com',
    phone: '(555) 123-4567',
    pin: '1234',
    acceptedTerms: true,
    street: '123 Main St',
    city: 'San Francisco',
    state: 'CA',
    zip: '94105',
    dob: '1990-01-01',
    routing: '',
    account: '',
  };
}

/* --- Apply brand colors as CSS variables -------------------------------- */
function applyBrand(brand) {
  const root = document.documentElement.style;
  root.setProperty('--brand', brand.primary);
  root.setProperty('--brand-dark', brand.primaryDark);
  root.setProperty('--brand-accent', brand.accent);
}

/* =========================================================================
   Stepper
========================================================================= */
const Stepper = {
  props: {
    steps: { type: Array, required: true },
    current: { type: Number, required: true },
  },
  template: /* html */ `
    <div class="stepper">
      <template v-for="(step, i) in steps" :key="step">
        <div
          class="stepper-node"
          :class="{ active: i === current, done: i < current }"
        >
          <div class="stepper-dot">
            <span v-if="i < current">&#10003;</span>
            <span v-else>{{ i + 1 }}</span>
          </div>
          <div class="stepper-label">{{ step }}</div>
        </div>
        <div
          v-if="i < steps.length - 1"
          class="stepper-line"
          :class="{ done: i < current }"
        ></div>
      </template>
    </div>
  `,
};

/* =========================================================================
   Screen 0 — Welcome
========================================================================= */
const WelcomeScreen = {
  props: { brand: Object },
  emits: ['next'],
  template: /* html */ `
    <div class="card">
      <div class="welcome-hero">
        <div class="welcome-logo">
          <img v-if="brand.logoUrl" :src="brand.logoUrl" :alt="brand.name" />
          <span v-else>{{ brand.name.charAt(0) }}</span>
        </div>
        <h1 class="screen-title">{{ brand.welcomeTitle }}</h1>
        <p class="screen-subtitle">{{ brand.welcomeBody }}</p>
      </div>
      <button class="btn" @click="$emit('next')">Continue</button>
    </div>
  `,
};

/* =========================================================================
   Screen 1 — Enroll
========================================================================= */
const EnrollScreen = {
  props: { form: Object },
  emits: ['next', 'back'],
  data() {
    return { errors: {} };
  },
  methods: {
    submit() {
      // Validation disabled for demo — always advance.
      this.$emit('next');
    },
  },
  template: /* html */ `
    <div class="card">
      <h2 class="screen-title">Create your account</h2>
      <p class="screen-subtitle">Tell us a bit about yourself.</p>

      <div class="field-row">
        <div class="field" :class="{ invalid: errors.firstName }">
          <label>First name</label>
          <input type="text" v-model="form.firstName" placeholder="Jane" />
          <div v-if="errors.firstName" class="field-error">{{ errors.firstName }}</div>
        </div>
        <div class="field" :class="{ invalid: errors.lastName }">
          <label>Last name</label>
          <input type="text" v-model="form.lastName" placeholder="Doe" />
          <div v-if="errors.lastName" class="field-error">{{ errors.lastName }}</div>
        </div>
      </div>

      <div class="field" :class="{ invalid: errors.email }">
        <label>Email</label>
        <input type="email" v-model="form.email" placeholder="jane@example.com" />
        <div v-if="errors.email" class="field-error">{{ errors.email }}</div>
      </div>

      <div class="field" :class="{ invalid: errors.phone }">
        <label>Phone</label>
        <input type="tel" v-model="form.phone" placeholder="(555) 123-4567" />
        <div v-if="errors.phone" class="field-error">{{ errors.phone }}</div>
      </div>

      <div class="field" :class="{ invalid: errors.pin }">
        <label>Create a PIN</label>
        <input type="password" v-model="form.pin" inputmode="numeric" placeholder="••••" maxlength="6" />
        <div v-if="errors.pin" class="field-error">{{ errors.pin }}</div>
      </div>

      <div class="field" :class="{ invalid: errors.acceptedTerms }">
        <label class="checkbox">
          <input type="checkbox" v-model="form.acceptedTerms" />
          <span>I agree to the <a href="#" @click.prevent>Terms &amp; Conditions</a> and Privacy Policy.</span>
        </label>
        <div v-if="errors.acceptedTerms" class="field-error">{{ errors.acceptedTerms }}</div>
      </div>

      <button class="btn" @click="submit">Continue</button>
      <div class="nav-back">
        <button class="btn btn-ghost" @click="$emit('back')">Back</button>
      </div>
    </div>
  `,
};

/* =========================================================================
   Screen 2 — Address
========================================================================= */
const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA',
  'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT',
  'VA', 'WA', 'WV', 'WI', 'WY',
];
const AddressScreen = {
  props: { form: Object },
  emits: ['next', 'back'],
  data() {
    return { errors: {}, states: US_STATES };
  },
  methods: {
    submit() {
      // Validation disabled for demo — always advance.
      this.$emit('next');
    },
  },
  template: /* html */ `
    <div class="card">
      <h2 class="screen-title">Your address</h2>
      <p class="screen-subtitle">We need this to verify your identity.</p>

      <div class="field" :class="{ invalid: errors.street }">
        <label>Street address</label>
        <input type="text" v-model="form.street" placeholder="123 Main St" />
        <div v-if="errors.street" class="field-error">{{ errors.street }}</div>
      </div>

      <div class="field-row">
        <div class="field" :class="{ invalid: errors.city }">
          <label>City</label>
          <input type="text" v-model="form.city" placeholder="San Francisco" />
          <div v-if="errors.city" class="field-error">{{ errors.city }}</div>
        </div>
        <div class="field" :class="{ invalid: errors.state }" style="flex:0 0 110px">
          <label>State</label>
          <select v-model="form.state">
            <option value="" disabled>—</option>
            <option v-for="s in states" :key="s" :value="s">{{ s }}</option>
          </select>
          <div v-if="errors.state" class="field-error">{{ errors.state }}</div>
        </div>
      </div>

      <div class="field-row">
        <div class="field" :class="{ invalid: errors.zip }">
          <label>ZIP code</label>
          <input type="text" v-model="form.zip" inputmode="numeric" placeholder="94105" />
          <div v-if="errors.zip" class="field-error">{{ errors.zip }}</div>
        </div>
        <div class="field" :class="{ invalid: errors.dob }">
          <label>Date of birth</label>
          <input type="date" v-model="form.dob" />
          <div v-if="errors.dob" class="field-error">{{ errors.dob }}</div>
        </div>
      </div>

      <button class="btn" @click="submit">Continue</button>
      <div class="nav-back">
        <button class="btn btn-ghost" @click="$emit('back')">Back</button>
      </div>
    </div>
  `,
};

/* =========================================================================
   Screen 3 — Banking (the key screen: AeroSync instant, or manual stub)
========================================================================= */
const BankingScreen = {
  props: { form: Object },
  emits: ['next', 'back', 'linked'],
  data() {
    return {
      method: 'instant', // 'instant' | 'manual'
      launching: false,
      widgetControls: null,
      manualErrors: {},
    };
  },
  methods: {
    /* --- Instant: launch the AeroSync widget (behavior preserved) ------ */
    linkBank() {
      this.launching = true;
      try {
        const widgetControls = window?.aerosync?.initWidget({
          elementId: 'widgetId',
          iframeTitle: 'Connect',
          environment: 'sandbox',
          token: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJqdGkiOiJlMTY3YjNjNy05OTcwLTRkZTAtYjYxZS0yYTQxZGFkOGNkY2EiLCJleHAiOjE3ODQ2NjU4NDcsInVzZXJJZCI6ImQ1NmRlZDUxOWEyYjRlMGRhMDJiMjE4Y2UzYjY0OTViIiwiY29ubmVjdGlvbklkIjoiZDU2ZGVkNTE5YTJiNGUwZGEwMmIyMThjZTNiNjQ5NWIiLCJhZXJvUGFzc1VzZXJVdWlkIjoiYTViOTZkMDgtNjM3Ny00YWEyLTllZmEtNDE4YjQ1Y2I5ODJiIiwidXNlclBhc3N3b3JkIjoiOTIyYjYzYjU3ZDk4NDQ2Nzg3NjIyNDlhNmI1M2QyNjgiLCJDbGllbnRJZCI6IjUxZTQyZTYxLTY1NGQtNGM2MS04OTZkLWZjYTFlNTc5OTAxNSIsIkNsaWVudE5hbWUiOiJBZXJvcGF5Iiwic2Vzc2lvbklkIjoiZTRjN2M4MWFjNmFhNDE3NDhkM2E1ZTU5ZmVjZGFjYjUiLCJyZWNvbm5lY3RBdHRlbXB0IjpmYWxzZSwibWVyY2hhbnRJZCI6bnVsbH0.psl0kVhN5-BoxC1q_5ja7lD2NTKzA2EAIvS09MwXA1A', // AeroSync token (do NOT use an AeroPay token)
          aeroPassUserUuid: 'a5b96d08-6377-4aa2-9efa-418b45cb982b',
          deeplink: 'aerodonutapp://',
          // Option 1 (embedded) drives OAuth through the native secure session;
          // Option 2 (standalone InAppBrowser) lets AeroSync handle it inline.
          handleOAuthManually: NATIVE.handleOAuthManually,
          onEvent: (event) => {
            console.log('onEvent', JSON.stringify(event));
            // Option 1 only: forward the OAuth URL to the native app so it can
            // open it in a secure session (ASWebAuthenticationSession).
            if (
              NATIVE.handleOAuthManually &&
              event?.payload?.pageTitle === 'launchExternalWindow' &&
              event?.payload?.onLoadApi
            ) {
              postToNative({ type: 'AEROSYNC_OAUTH_URL', url: event.payload.onLoadApi });
            }
          },
          onLoad: () => console.log('Sync onload'),
          onSuccess: (event) => {
            console.log('onSuccess', JSON.stringify(event));
            this.launching = false;
            // Show the onSuccess payload on the web success page. The handoff to
            // the native app happens on the Congratulations "Continue" button.
            this.$emit('linked', { method: 'instant', payload: event });
          },
          onClose: () => {
            console.log('Sync onclose');
            this.launching = false;
          },
          onError: (error) => {
            console.log('onError', error);
            this.launching = false;
          },
        });

        if (!widgetControls) {
          console.error('Failed to initialize widget');
          this.launching = false;
          return;
        }
        this.widgetControls = widgetControls;
        widgetControls.launch();
      } catch (error) {
        console.error('Error initializing widget:', error);
        this.launching = false;
      }
    },

    /* --- Manual: routing/account stub ---------------------------------- */
    submitManual() {
      // Validation disabled for demo — always proceed.
      const payload = {
        method: 'Manual entry',
        routingNumber: this.form.routing,
        accountNumber: this.form.account,
      };
      this.$emit('linked', { method: 'manual', payload });
    },
  },
  template: /* html */ `
    <div class="card">
      <h2 class="screen-title">Link your bank</h2>
      <p class="screen-subtitle">Choose how you'd like to connect your account.</p>

      <button
        class="method-option"
        :class="{ selected: method === 'instant' }"
        @click="method = 'instant'"
      >
        <div class="method-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z"/>
          </svg>
        </div>
        <div class="method-text">
          <div class="method-title">Instant &mdash; Connect with AeroSync</div>
          <div class="method-sub">Securely link in seconds. Recommended.</div>
        </div>
        <span class="method-badge">Instant</span>
      </button>

      <button
        class="method-option"
        :class="{ selected: method === 'manual' }"
        @click="method = 'manual'"
      >
        <div class="method-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M3 10.5L12 5l9 5.5v1.5H3V10.5zM5 12v7h2v-7H5zm4 0v7h2v-7H9zm4 0v7h2v-7h-2zm4 0v7h2v-7h-2zM3 21h18v-2H3v2z"/>
          </svg>
        </div>
        <div class="method-text">
          <div class="method-title">Manual &mdash; Routing &amp; account</div>
          <div class="method-sub">Enter your bank details by hand.</div>
        </div>
      </button>

      <!-- Instant flow -->
      <div v-if="method === 'instant'">
        <button class="btn" :disabled="launching" @click="linkBank">
          {{ launching ? 'Connecting…' : 'Link a Bank' }}
        </button>
        <!-- AeroSync widget mounts here (iframe/host mode) -->
        <div id="widgetId"></div>
      </div>

      <!-- Manual flow (stub) -->
      <div v-else>
        <div class="field" :class="{ invalid: manualErrors.routing }">
          <label>Routing number</label>
          <input type="text" v-model="form.routing" inputmode="numeric" placeholder="123456789" maxlength="9" />
          <div v-if="manualErrors.routing" class="field-error">{{ manualErrors.routing }}</div>
        </div>
        <div class="field" :class="{ invalid: manualErrors.account }">
          <label>Account number</label>
          <input type="text" v-model="form.account" inputmode="numeric" placeholder="000123456789" />
          <div v-if="manualErrors.account" class="field-error">{{ manualErrors.account }}</div>
        </div>
        <button class="btn" @click="submitManual">Link account</button>
      </div>

      <div class="nav-back">
        <button class="btn btn-ghost" @click="$emit('back')">Back</button>
      </div>
    </div>
  `,
};

/* =========================================================================
   Screen 4 — Congratulations
========================================================================= */
const CongratsScreen = {
  props: { form: Object, brand: Object, linkMethod: String, payload: Object },
  emits: ['restart'],
  data() {
    return {
      // Option 1: embedded in the RN WebView — hand off via postMessage.
      embedded: NATIVE.handleOAuthManually && NATIVE.inReactNativeWebView,
      // Option 2: standalone InAppBrowser — hand off via webhook + deep link.
      standalone: !!NATIVE.sessionId && !NATIVE.handleOAuthManually,
      returning: false,
    };
  },
  computed: {
    // Flatten the onSuccess payload into printable key/value rows.
    payloadRows() {
      if (!this.payload || typeof this.payload !== 'object') return [];
      return Object.entries(this.payload).map(([k, v]) => ({
        k,
        v: typeof v === 'object' ? JSON.stringify(v) : String(v),
      }));
    },
  },
  methods: {
    goToWallet() {
      // Option 1: tell the RN WebView host to show the native Wallet, handing
      // over the merchant-side contact info (name/email/phone).
      postToNative({ type: 'BOARDING_COMPLETE', contact: contactFromForm(this.form) });
    },
    continueToApp() {
      // Option 2: fire the webhook now, then wake the native app (which closes
      // the InAppBrowser and routes to its Wallet).
      this.returning = true;
      reportBoarding(contactFromForm(this.form)).finally(returnToNativeApp);
    },
  },
  template: /* html */ `
    <div class="card center">
      <div class="success-check">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M20 6L9 17l-5-5" />
        </svg>
      </div>
      <h2 class="screen-title">Account linked &amp; boarded ✅</h2>
      <p class="screen-subtitle">onSuccess payload received from AeroSync:</p>

      <div class="kv-list">
        <div class="kv" v-for="row in payloadRows" :key="row.k">
          <span class="kv-key">{{ row.k }}</span>
          <span class="kv-val">{{ row.v }}</span>
        </div>
        <div class="kv" v-if="payloadRows.length === 0">
          <span class="kv-val muted">No payload received</span>
        </div>
      </div>

      <button v-if="embedded" class="btn" @click="goToWallet">Go to Wallet</button>
      <button v-else-if="standalone" class="btn" :disabled="returning" @click="continueToApp">
        {{ returning ? 'Returning to app…' : 'Continue' }}
      </button>
      <button v-else class="btn btn-secondary" @click="$emit('restart')">Start over</button>
    </div>
  `,
};

/* =========================================================================
   Root App
========================================================================= */
createApp({
  components: {
    Stepper,
    WelcomeScreen,
    EnrollScreen,
    AddressScreen,
    BankingScreen,
    CongratsScreen,
  },
  data() {
    return {
      brand: window.BRAND,
      stepLabels: ['Welcome', 'Enroll', 'Address', 'Banking', 'Done'],
      current: 0,
      linkMethod: '',
      payload: null,
      // Prefilled with demo defaults so the flow (and the native Wallet) always
      // has data even when you skip the form. Edit freely during a demo.
      form: defaultForm(),
    };
  },
  created() {
    applyBrand(this.brand);
    document.title = this.brand.name + ' — Onboarding';
  },
  methods: {
    next() {
      if (this.current < this.stepLabels.length - 1) this.current++;
    },
    back() {
      if (this.current > 0) this.current--;
    },
    onLinked(result) {
      this.linkMethod = result.method;
      this.payload = result.payload || null;
      this.next();
    },
    restart() {
      this.current = 0;
      this.linkMethod = '';
      this.payload = null;
      Object.assign(this.form, defaultForm());
    },
  },
  template: /* html */ `
    <div class="brand-bar">
      <div class="brand-badge">
        <img v-if="brand.logoUrl" :src="brand.logoUrl" :alt="brand.name" />
        <span v-else>{{ brand.name.charAt(0) }}</span>
      </div>
      <div class="brand-name">{{ brand.name }}</div>
    </div>

    <stepper :steps="stepLabels" :current="current" />

    <welcome-screen v-if="current === 0" :brand="brand" @next="next" />
    <enroll-screen  v-else-if="current === 1" :form="form" @next="next" @back="back" />
    <address-screen v-else-if="current === 2" :form="form" @next="next" @back="back" />
    <banking-screen v-else-if="current === 3" :form="form" @back="back" @linked="onLinked" />
    <congrats-screen v-else :form="form" :brand="brand" :link-method="linkMethod" :payload="payload" @restart="restart" />
  `,
}).mount('#app');
