/**
 * AeroDonutsApp — a fake "merchant app" demonstrating two AeroSync integration
 * flows that both end at a shared Wallet screen.
 *
 *  Launcher
 *    ├─ Option 1: Embedded (isNewFlow=true)
 *    │    Full-screen WebView loads the mock SPA with ?handleOAuthManually=true.
 *    │    AeroSync emits the OAuth URL via onEvent -> the SPA postMessages it here
 *    │    -> we open it in a secure session (ASWebAuthenticationSession via
 *    │    InAppBrowser.openAuth). OAuth returns via the aerodonutapp:// deep link,
 *    │    the session closes, AeroSync resumes and fires onSuccess -> the SPA shows
 *    │    Congratulations -> "Go to Wallet" postMessages BOARDING_COMPLETE -> Wallet.
 *    │
 *    └─ Option 2: Direct Sign-up (standalone)
 *         The whole SPA is opened in the system InAppBrowser with a ?sessionId.
 *         handleOAuthManually=false, so AeroSync handles OAuth inline. On onSuccess
 *         the SPA POSTs the boarding to the demo webhook; this app polls that
 *         endpoint and, once boarded, closes the browser and routes to Wallet.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Platform,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  NavigationContainer,
  createNavigationContainerRef,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { WebView } from 'react-native-webview';
import InAppBrowser from 'react-native-inappbrowser-reborn';

import { BASE_URL, DEEP_LINK_SCHEME } from './config';

/* --- Types -------------------------------------------------------------- */

// Merchant-side contact info from the enroll form, shown on the Wallet screen.
type Contact = { name?: string; email?: string; phone?: string } | null;

type RootStackParamList = {
  Launcher: undefined;
  EmbeddedWebView: undefined;
  DirectSignup: undefined;
  Wallet: { contact: Contact };
};

const Stack = createNativeStackNavigator<RootStackParamList>();
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

/* =========================================================================
   Launcher / Home
========================================================================= */
function LauncherScreen({ navigation }: { navigation: any }) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.center}>
        <Image
          source={require('./assets/donut.png')}
          style={styles.donutImage}
          accessibilityLabel="Donut"
        />
        <Text style={styles.title}>AeroDonuts</Text>
        <Text style={styles.subtitle}>Pick a demo flow to run live.</Text>

        <Pressable
          style={({ pressed }) => [styles.optionBtn, pressed && styles.pressed]}
          onPress={() => navigation.navigate('EmbeddedWebView')}
        >
          <Text style={styles.optionTitle}>Demo Option 1: Embedded</Text>
          <Text style={styles.optionSub}>New flow · WebView + secure OAuth session</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.optionBtn, styles.optionBtnAlt, pressed && styles.pressed]}
          onPress={() => navigation.navigate('DirectSignup')}
        >
          <Text style={styles.optionTitle}>Demo Option 2: Direct Sign-up</Text>
          <Text style={styles.optionSub}>Standalone · InAppBrowser + webhook</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

/* =========================================================================
   Option 1 — Embedded WebView (handleOAuthManually = true)
========================================================================= */
function EmbeddedWebViewScreen({ navigation }: { navigation: any }) {
  const url = `${BASE_URL}/?handleOAuthManually=true`;
  const [loading, setLoading] = useState(true);

  const openSecureOAuth = async (oauthUrl: string) => {
    try {
      const available = await InAppBrowser.isAvailable();
      if (!available) {
        Linking.openURL(oauthUrl);
        return;
      }
      // ASWebAuthenticationSession (iOS) / Custom Tabs auth (Android).
      // Resolves when AeroSync redirects back to DEEP_LINK_SCHEME; the session
      // then closes itself and AeroSync resumes inside the WebView.
      const result = await InAppBrowser.openAuth(oauthUrl, DEEP_LINK_SCHEME, {
        ephemeralWebSession: false,
        showTitle: true,
        enableUrlBarHiding: true,
        enableDefaultShare: false,
      });
      console.log('openAuth result:', result);
    } catch (err) {
      console.warn('openAuth failed, falling back to Linking:', err);
      Linking.openURL(oauthUrl);
    }
  };

  const onMessage = (event: any) => {
    let data: any;
    try {
      data = JSON.parse(event.nativeEvent.data);
    } catch (e) {
      console.warn('Non-JSON message from WebView:', event.nativeEvent.data);
      return;
    }
    console.log('WebView message:', data);

    switch (data.type) {
      case 'AEROSYNC_OAUTH_URL':
        if (data.url) openSecureOAuth(data.url);
        break;
      case 'BOARDING_COMPLETE':
        navigation.replace('Wallet', { contact: data.contact ?? null });
        break;
      default:
        break;
    }
  };

  return (
    <View style={styles.webviewContainer}>
      <WebView
        source={{ uri: url }}
        style={styles.webview}
        onMessage={onMessage}
        onLoadEnd={() => setLoading(false)}
      />
      {loading && (
        <View style={styles.webviewLoading}>
          <ActivityIndicator size="large" color="#7c3aed" />
        </View>
      )}
    </View>
  );
}

/* =========================================================================
   Option 2 — Direct Sign-up (standalone InAppBrowser + webhook polling)
========================================================================= */
function DirectSignupScreen({ navigation }: { navigation: any }) {
  const doneRef = useRef(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Correlates this run with the boarding the SPA reports to the webhook.
    const sessionId = `sess_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
    const url = `${BASE_URL}/?sessionId=${encodeURIComponent(sessionId)}`;
    console.log('[option2] opening', url);

    const finish = (contact: Contact) => {
      if (doneRef.current) return;
      doneRef.current = true;
      if (pollRef.current) clearInterval(pollRef.current);
      console.log('[option2] boarded! contact =', contact);
      InAppBrowser.close();
      navigation.replace('Wallet', { contact });
    };

    const startPolling = () => {
      pollRef.current = setInterval(async () => {
        try {
          const res = await fetch(`${BASE_URL}/api/boarded/${sessionId}`);
          const json = await res.json();
          console.log('[option2] poll', sessionId, '->', json);
          if (json.boarded) finish(json.contact ?? null);
        } catch (err) {
          console.warn('[option2] poll failed:', err);
        }
      }, 1500);
    };

    const run = async () => {
      try {
        const available = await InAppBrowser.isAvailable();
        startPolling();
        if (available) {
          // Resolves when the browser is dismissed (by us on success, or by the user).
          await InAppBrowser.open(url, {
            dismissButtonStyle: 'close',
            animated: true,
            modalEnabled: true,
            enableBarCollapsing: true,
            showTitle: true,
            toolbarColor: Platform.OS === 'android' ? '#ffffff' : undefined,
          });
        } else {
          Linking.openURL(url);
        }
      } catch (err) {
        console.warn('InAppBrowser.open failed:', err);
      } finally {
        // The browser was dismissed — often because boarding completed and the
        // deep link woke the app (which also closes the tab). Do one final
        // status check before falling back to Home, to avoid racing the poll.
        if (!doneRef.current) {
          if (pollRef.current) clearInterval(pollRef.current);
          try {
            const res = await fetch(`${BASE_URL}/api/boarded/${sessionId}`);
            const json = await res.json();
            console.log('[option2] final check ->', json);
            if (json.boarded) {
              finish(json.contact ?? null);
              return;
            }
          } catch (err) {
            console.warn('[option2] final check failed:', err);
          }
          navigation.goBack();
        }
      }
    };

    run();

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      InAppBrowser.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color="#7c3aed" />
      <Text style={styles.loadingText}>Complete sign-up in the browser…</Text>
    </View>
  );
}

/* =========================================================================
   Wallet / Success (shared)
========================================================================= */
function WalletScreen({ route, navigation }: { route: any; navigation: any }) {
  const contact: Contact = route.params?.contact ?? null;

  const Row = ({ k, v }: { k: string; v?: string }) =>
    v ? (
      <View style={styles.walletRow}>
        <Text style={styles.walletKey}>{k}</Text>
        <Text style={styles.walletVal} numberOfLines={2}>{v}</Text>
      </View>
    ) : null;

  const hasAny = !!(contact && (contact.name || contact.email || contact.phone));

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.center}>
        <View style={styles.successBadge}>
          <Text style={{ fontSize: 34 }}>✅</Text>
        </View>
        <Text style={styles.title}>Account linked &amp; boarded</Text>
        <Text style={styles.subtitle}>Your account is ready to use.</Text>

        <View style={styles.walletCard}>
          <Row k="Name" v={contact?.name} />
          <Row k="Email" v={contact?.email} />
          <Row k="Phone" v={contact?.phone} />
          {!hasAny && <Text style={styles.walletVal}>No contact details provided.</Text>}
        </View>

        <Pressable
          style={({ pressed }) => [styles.optionBtn, pressed && styles.pressed]}
          onPress={() => navigation.popToTop()}
        >
          <Text style={styles.optionTitle}>Done</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

/* =========================================================================
   App
========================================================================= */
export default function App() {
  // Light deep-link logging for debugging (OAuth return is handled by openAuth).
  useEffect(() => {
    const log = (url: string | null) => url && console.log('Deep link:', url);
    Linking.getInitialURL().then(log).catch(() => {});
    const sub = Linking.addEventListener('url', ({ url }) => log(url));
    return () => sub.remove();
  }, []);

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator>
        <Stack.Screen name="Launcher" component={LauncherScreen} options={{ title: 'AeroDonuts' }} />
        <Stack.Screen name="EmbeddedWebView" component={EmbeddedWebViewScreen} options={{ title: 'Sign up' }} />
        <Stack.Screen name="DirectSignup" component={DirectSignupScreen} options={{ title: 'Direct sign-up' }} />
        <Stack.Screen name="Wallet" component={WalletScreen} options={{ title: 'Wallet', headerBackVisible: false }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 26, fontWeight: '800', marginBottom: 6, textAlign: 'center' },
  subtitle: { fontSize: 15, color: '#64748b', marginBottom: 28, textAlign: 'center' },
  donutImage: { width: 140, height: 140, borderRadius: 12, marginBottom: 12 },

  optionBtn: {
    width: '100%',
    backgroundColor: '#7c3aed',
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 20,
    marginTop: 14,
    alignItems: 'center',
  },
  optionBtnAlt: { backgroundColor: '#0ea5e9' },
  pressed: { opacity: 0.85 },
  optionTitle: { color: '#fff', fontSize: 17, fontWeight: '700' },
  optionSub: { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 4 },

  webviewContainer: { flex: 1, backgroundColor: '#fff' },
  webview: { flex: 1 },
  webviewLoading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },

  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  loadingText: { color: '#334155', marginTop: 14, fontSize: 16 },

  successBadge: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: 'rgba(22,163,74,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  walletCard: {
    width: '100%',
    backgroundColor: '#f4f5f7',
    borderRadius: 14,
    padding: 18,
    marginBottom: 24,
  },
  walletRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7, gap: 12 },
  walletKey: { color: '#64748b', fontSize: 14, flexShrink: 0 },
  walletVal: { color: '#0f172a', fontSize: 14, fontWeight: '700', flex: 1, textAlign: 'right' },
});
