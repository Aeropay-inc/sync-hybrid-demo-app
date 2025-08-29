/**
 * AeroDonutsApp
 * Home screen with a button that opens a full-screen WebView loading the local web app.
 */

import React from 'react';
import { Button, Image, Platform, SafeAreaView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { WebView } from 'react-native-webview';


type RootStackParamList = {
  Home: undefined;
  PaymentWebView: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function HomeScreen({ navigation }: { navigation: any }) {

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

        <Button
          title="Make a payment"
          onPress={() => navigation.navigate('PaymentWebView')}
        />
      </View>
    </SafeAreaView>
  );
}

function PaymentWebViewScreen({ navigation }: { navigation: any }) {
  const baseUrl = 'http://192.168.5.108:3000/';

  const onWebViewMessage = async (event: any) => {
  };

  return (
    <View style={styles.webviewContainer}>
      <WebView
        source={{ uri: baseUrl }}
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
  donutImage: { width: 180, height: 180, borderRadius: 12, marginBottom: 16 },
  webviewContainer: { flex: 1, backgroundColor: '#000' },
  webview: { flex: 1 },
});
