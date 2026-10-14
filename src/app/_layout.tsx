import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { LockScreen } from '@/components/lock-screen';
import { Colors } from '@/constants/theme';
import { AppLockProvider, useAppLock } from '@/contexts/app-lock';
import { AuthProvider, useAuth } from '@/contexts/auth';
import { SocketProvider } from '@/contexts/socket';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <AuthProvider>
      <AppLockProvider>
        <RootNavigator />
      </AppLockProvider>
    </AuthProvider>
  );
}

function RootNavigator() {
  const { user, ready: authReady } = useAuth();
  const { ready: lockReady, locked } = useAppLock();
  // 잠금 여부를 확인하기 전까지 스플래시를 유지해 내용이 잠깐 보이지 않게 한다
  const ready = authReady && lockReady;

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
      {locked ? <LockScreen /> : null}
    </SocketProvider>
  );
}
