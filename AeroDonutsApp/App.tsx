/**
 * AeroDonutsApp
 * Home screen with a button that opens a full-screen WebView loading the local web app.
 */

import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Button, Image, Linking, Platform, Pressable, SafeAreaView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { WebView } from 'react-native-webview';
import InAppBrowser from 'react-native-inappbrowser-reborn';

type WorkflowType = 'inAppBrowser' | 'systemBrowser';

type RootStackParamList = {
  Home: undefined;
  PaymentWebView: { workflow: WorkflowType };
  Result: { result: DeepLinkParams };
};

interface SuccessPayload {
  connectionId: string;
  clientName: string;
  aeroPassUserUuid: string;
}

function ResultScreen({ route, navigation }: { route: { params: { result: DeepLinkParams } }, navigation: any }) {
  const { result } = route.params;
  const status = result.status;
  const payload = (result as any).payload;

  return (
    <SafeAreaView style={[styles.safeArea, { alignItems: 'center', justifyContent: 'center' }]}>
      <View style={{ padding: 24, alignItems: 'center', gap: 12 }}>
        <Text style={{ fontSize: 22, fontWeight: '700' }}>Status: {status}</Text>
        <Text style={{ fontSize: 16, color: '#444', textAlign: 'center' }}>
          {payload ? JSON.stringify(payload, null, 2) : 'No payload'}
        </Text>
        <View style={{ height: 12 }} />
        <Button title="Home" onPress={() => navigation.navigate('Home')} />
      </View>
    </SafeAreaView>
  );
}

type ErrorMessage = {
  AC_CODE: string;
  description: string;
};

type DeepLinkParams =
  | { status: 'success'; payload: SuccessPayload }
  | { status: 'error'; payload: ErrorMessage }
  | { status: 'close' };

const Stack = createNativeStackNavigator<RootStackParamList>();
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

function HomeScreen({ navigation }: { navigation: any }) {
  const [workflow, setWorkflow] = useState<WorkflowType>('inAppBrowser');

  const Radio = ({ label, value }: { label: string; value: WorkflowType }) => {
    const selected = workflow === value;
    return (
      <Pressable
        onPress={() => setWorkflow(value)}
        style={({ pressed }) => [styles.radioRow, pressed && { opacity: 0.6 }]}
        accessibilityRole="radio"
        accessibilityState={{ selected }}
      >
        <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
          {selected ? <View style={styles.radioInner} /> : null}
        </View>
        <Text style={styles.radioLabel}>{label}</Text>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={Platform.OS === 'ios' ? 'dark-content' : 'light-content'} />
      <View style={styles.center}>
        <Text style={styles.title}>AeroDonutsApp</Text>
        <Image
          // Local asset bundled with the app
          source={require('./assets/donut.png')}
          style={styles.donutImage}
          accessible
          accessibilityLabel="Delicious donut"
        />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Workflow</Text>
          <View accessibilityRole="radiogroup" style={styles.radioGroup}>
            <Radio label="In-App" value="inAppBrowser" />
            <Radio label="Out-of-App" value="systemBrowser" />
          </View>
        </View>

        <Button
          title="Make a payment"
          onPress={() => navigation.navigate('PaymentWebView', { workflow })}
        />
      </View>
    </SafeAreaView>
  );
}

function PaymentWebViewScreen({ route, navigation }: { route: { params: { workflow: WorkflowType } }, navigation: any }) {
  const { workflow } = route.params;
  const baseUrl = 'http://192.168.5.108:3000/';
  const url = `${baseUrl}?workflow=${encodeURIComponent(workflow)}`;

  useEffect(() => {
    if (workflow === 'systemBrowser') {
      Linking.openURL(url).catch((err) => console.warn('Failed to open URL:', err));
    }
  }, [workflow, url]);

  if (workflow === 'systemBrowser') {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#7c3aed" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const onWebViewMessage = async (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);

      /*
       * If the workflow is inAppBrowser, open the widgetUrl in inAppBrowser
       */
      if (data.type === 'inAppBrowser' && data.url) {
        const targetUrl = data.url;

        try {
          const available = await InAppBrowser.isAvailable();

          if (available) {
            await InAppBrowser.open(targetUrl, {
              dismissButtonStyle: 'close',
              animated: true,
              modalEnabled: true,
              enableBarCollapsing: true,
              showTitle: true,
              toolbarColor: Platform.OS === 'android' ? '#ffffff' : undefined,
            });
          } else {
            Linking.openURL(targetUrl);
          }
        } catch (err) {
          console.warn('Failed to open InAppBrowser, falling back to Linking:', err);
          Linking.openURL(targetUrl);
        }
      }
    } catch (error) {
      console.error('Invalid message from WebView:', error);
    }
  };

  return (
    <View style={styles.webviewContainer}>
      <WebView
        source={{ uri: url }}
        style={styles.webview}
        onMessage={onWebViewMessage}
      />
    </View>
  );
}

export default function App() {
  // Listen for deep links and log query params
  useEffect(() => {
    const handleUrlString = (url: string) => {
      try {
        console.log('Deep link URL:', url);
        const parsedUrl = new URL(url);
        const params: Record<string, string> = Object.fromEntries(parsedUrl.searchParams.entries());
        console.log('Deep link query params:', params);

        // Branch by status and emit a typed structure
        const status = params.status as string | undefined;
        let deepLink: DeepLinkParams | undefined;
        if (status === 'success') {
          deepLink = {
            status: 'success',
            payload: {
              connectionId: params.connectionId,
              clientName: params.clientName,
              aeroPassUserUuid: params.aeroPassUserUuid,
            },
          };
          console.log('Deep link status: SUCCESS (typed)', deepLink);
        } else if (status === 'error') {
          deepLink = {
            status: 'error',
            payload: {
              AC_CODE: params.AC_CODE,
              description: params.description,
            },
          };
          console.log('Deep link status: ERROR (typed)', deepLink);
        } else if (status === 'close') {
          deepLink = { status: 'close' };
          console.log('Deep link status: CLOSE (typed)', deepLink);
        } else {
          console.log('Deep link status: UNKNOWN', status, params);
        }

        // Navigate to Result screen with typed deepLink
        if (deepLink) {
          const nav = () => navigationRef.navigate('Result', { result: deepLink as DeepLinkParams });
          if (navigationRef.isReady()) nav();
          else setTimeout(() => { if (navigationRef.isReady()) nav(); }, 100);
        }
      } catch (err) {
        console.warn('Failed to parse deep link URL:', err);
      }
    };

    const handleDeepLink = ({ url }: { url: string }) => handleUrlString(url);

    // Handle the initial URL if the app was opened via deep link
    Linking.getInitialURL()
      .then((initialUrl) => {
        if (initialUrl) handleUrlString(initialUrl);
      })
      .catch((err) => console.warn('Error getting initial URL:', err));

    // Subscribe to subsequent deep link events
    const subscription: any = Linking.addEventListener('url', handleDeepLink);

    return () => {
      // RN versions differ in API, support both
      if (subscription && typeof subscription.remove === 'function') {
        subscription.remove();
      } else {
        // @ts-ignore - compat for older RN
        Linking.removeEventListener?.('url', handleDeepLink);
      }
    };
  }, []);

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator>
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Home' }} />
        <Stack.Screen
          name="PaymentWebView"
          component={PaymentWebViewScreen}
          options={{ title: 'Payment' }}
        />
        <Stack.Screen name="Result" component={ResultScreen} options={{ title: 'Result' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 16 },
  section: { width: '100%', marginTop: 12, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  donutImage: { width: 180, height: 180, borderRadius: 12, marginBottom: 16 },
  radioGroup: { gap: 8 },
  radioRow: { flexDirection: 'row', alignItems: 'center' },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#7c3aed',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  radioOuterSelected: { borderColor: '#6d28d9' },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#6d28d9' },
  radioLabel: { fontSize: 16 },
  webviewContainer: { flex: 1, backgroundColor: '#000' },
  webview: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#000' },
  loadingText: { color: '#fff', marginTop: 12, fontSize: 16 },
});
