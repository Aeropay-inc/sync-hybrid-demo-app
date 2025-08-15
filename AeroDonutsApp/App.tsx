/**
 * AeroDonutsApp
 * Home screen with a button that opens a full-screen WebView loading the local web app.
 */

import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Button, Image, Linking, Platform, Pressable, SafeAreaView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { WebView } from 'react-native-webview';

type WorkflowType = 'in-app' | 'out-of-app';

type RootStackParamList = {
  Home: undefined;
  PaymentWebView: { workflow: WorkflowType };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function HomeScreen({ navigation }: { navigation: any }) {
  const [workflow, setWorkflow] = useState<WorkflowType>('in-app');

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
            <Radio label="In-App" value="in-app" />
            <Radio label="Out-of-App" value="out-of-app" />
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
    if (workflow === 'out-of-app') {
      Linking.openURL(url).catch((err) => console.warn('Failed to open URL:', err));
    }
  }, [workflow, url]);

  if (workflow === 'out-of-app') {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#7c3aed" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const onWebViewMessage = (e: any) => {
    const raw = e?.nativeEvent?.data;
    let payload: any = raw;
    try {
      payload = JSON.parse(raw);
    } catch { }
    console.log('WebView message:', payload);
    if (payload && payload.type === 'launchExternalWindow') {
      console.log('launchExternalWindow payload from webapp:', payload.data);
      // If desired, we could open this externally:
      // if (payload?.data?.url) Linking.openURL(payload.data.url);
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
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Home' }} />
        <Stack.Screen
          name="PaymentWebView"
          component={PaymentWebViewScreen}
          options={{ title: 'Payment' }}
        />
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
