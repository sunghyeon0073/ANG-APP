import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui';
import { Colors } from '@/constants/theme';
import { useAppLock } from '@/contexts/app-lock';
import { useAuth } from '@/contexts/auth';

/** 화면 전체를 덮는 잠금 오버레이. 아래 화면(네비게이션 상태)은 그대로 유지된다 */
export function LockScreen() {
  const { unlock } = useAppLock();
  const { user, signOut } = useAuth();
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);

  const tryUnlock = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    const result = await unlock();
    busyRef.current = false;
    setBusy(false);
    setMessage(result.success ? '' : (result.message ?? ''));
  }, [unlock]);

  // 잠금 화면이 뜨면 바로 인증 창을 띄운다
  useEffect(() => {
    tryUnlock();
  }, [tryUnlock]);

  return (
    <LinearGradient
      colors={[Colors.primaryHover, Colors.primary]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={StyleSheet.absoluteFill}>
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.brand}>ANG</Text>
          <View style={styles.iconCircle}>
            <Feather name="lock" size={34} color={Colors.white} />
          </View>
          <Text style={styles.title}>앱이 잠겨 있습니다</Text>
          <Text style={styles.sub}>{user?.name ? `${user.name}님, ` : ''}지문 또는 얼굴 인증으로 잠금을 해제하세요.</Text>
          {message ? <Text style={styles.error}>{message}</Text> : null}
        </View>

        <View style={styles.actions}>
          <Button title="잠금 해제" icon="unlock" variant="secondary" loading={busy} onPress={tryUnlock} />
          <Pressable onPress={() => signOut()} hitSlop={8} style={{ padding: 8 }}>
            <Text style={styles.link}>비밀번호로 로그인</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'space-between' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  brand: { fontSize: 44, fontWeight: '900', color: Colors.white, letterSpacing: -1.5, marginBottom: 24 },
  iconCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 20, fontWeight: '700', color: Colors.white },
  sub: { fontSize: 14, color: 'rgba(255,255,255,0.8)', textAlign: 'center', lineHeight: 20 },
  error: {
    fontSize: 13,
    color: Colors.white,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.18)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  actions: { gap: 12, alignItems: 'stretch' },
  link: { textAlign: 'center', fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.9)' },
});
