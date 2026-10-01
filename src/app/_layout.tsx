import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { Colors } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/contexts/auth';
import { SocketProvider } from '@/contexts/socket';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}

function RootNavigator() {
  const { user, ready } = useAuth();

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  const loggedIn = Boolean(user);

  return (
    <SocketProvider enabled={loggedIn}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.bg } }}>
        <Stack.Protected guard={loggedIn}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="approval/[id]" />
          <Stack.Screen name="chat/[roomId]" />
          <Stack.Screen name="chat/new" options={{ presentation: 'modal' }} />
          <Stack.Screen name="chat/info" />
          <Stack.Screen name="chat/invite" options={{ presentation: 'modal' }} />
          <Stack.Screen name="mail/[id]" />
          <Stack.Screen name="mail/compose" options={{ presentation: 'modal' }} />
          <Stack.Screen name="notices/index" />
          <Stack.Screen name="notices/[id]" />
          <Stack.Screen name="notifications" />
          <Stack.Screen name="documents/index" />
          <Stack.Screen name="documents/[id]" />
          <Stack.Screen name="calendar" />
          <Stack.Screen name="assistant" />
        </Stack.Protected>
        <Stack.Protected guard={!loggedIn}>
          <Stack.Screen name="login" />
        </Stack.Protected>
      </Stack>
    </SocketProvider>
  );
}
