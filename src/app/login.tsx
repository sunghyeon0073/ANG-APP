import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, TextField } from '@/components/ui';
import { Colors, Radius, Shadow } from '@/constants/theme';
import { useAppLock } from '@/contexts/app-lock';
import { useAuth } from '@/contexts/auth';
import { errorMessage } from '@/lib/api';

/** 웹 Login.jsx + auth.css 레이아웃(좌측 브랜드 / 우측 카드)을 세로로 배치 */
export default function LoginScreen() {
  const { signIn } = useAuth();
  const { offerAfterLogin } = useAppLock();
  const [empNo, setEmpNo] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const passwordRef = useRef<TextInput>(null);

  const handleLogin = async () => {
    if (!empNo.trim() || !password) {
      setError('사번과 비밀번호를 입력해주세요.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await signIn(empNo.trim(), password);
      offerAfterLogin().catch(() => {});
    } catch (e) {
      setError(errorMessage(e, '로그인에 실패했습니다.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={[Colors.primaryHover, Colors.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }}>
      <View style={[styles.blob, { top: -80, right: -60 }]} />
      <View style={[styles.blob, { bottom: -120, left: -80, width: 300, height: 300 }]} />
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <View style={styles.brandArea}>
              <Text style={styles.brandLogo}>ANG</Text>
              <Text style={styles.brandSub}>스마트 업무 포털</Text>
            </View>

            <View style={styles.box}>
              <Text style={styles.title}>로그인</Text>

              <TextField
                label="사번"
                icon="user"
                value={empNo}
                onChangeText={setEmpNo}
                placeholder="사번을 입력하세요"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
                style={{ marginBottom: 20 }}
              />

              <Text style={styles.label}>비밀번호</Text>
              <View style={styles.passwordWrap}>
                <Feather name="lock" size={16} color={Colors.textMuted} />
                <TextInput
                  ref={passwordRef}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="비밀번호를 입력하세요"
                  placeholderTextColor={Colors.textSubtle}
                  secureTextEntry={!showPassword}
                  returnKeyType="go"
                  onSubmitEditing={handleLogin}
                  style={styles.passwordInput}
                />
                <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={8}>
                  <Feather name={showPassword ? 'eye-off' : 'eye'} size={16} color={Colors.textMuted} />
                </Pressable>
              </View>

              {error ? (
                <View style={styles.error}>
                  <Feather name="alert-circle" size={14} color={Colors.rejected} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <Button title="로그인" onPress={handleLogin} loading={loading} style={{ marginTop: 28 }} />

              <View style={styles.footer}>
                <Text style={styles.footerText}>아직 회원이 아니신가요?</Text>
                <Text style={styles.footerHint}>회원가입은 웹 포털에서 진행한 뒤 관리자 승인 후 이용할 수 있습니다.</Text>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  blob: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 150,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  brandArea: { alignItems: 'center', marginBottom: 36, gap: 10 },
  brandLogo: {
    fontSize: 72,
    fontWeight: '900',
    color: Colors.white,
    letterSpacing: -2,
    ...Platform.select({
      web: { textShadow: '0 4px 32px rgba(0,0,0,0.15)' },
      default: {
        textShadowColor: 'rgba(0,0,0,0.15)',
        textShadowOffset: { width: 0, height: 4 },
        textShadowRadius: 24,
      },
    }),
  },
  brandSub: { fontSize: 16, fontWeight: '500', color: 'rgba(255,255,255,0.7)', letterSpacing: 0.8 },
  box: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    paddingVertical: 36,
    paddingHorizontal: 28,
    ...Shadow.md,
  },
  title: { textAlign: 'center', fontSize: 26, fontWeight: '700', color: '#333', marginBottom: 28 },
  label: { fontSize: 14, fontWeight: '500', color: '#555', marginBottom: 8 },
  passwordWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.inputBg,
    borderRadius: Radius.pill,
    paddingHorizontal: 18,
  },
  passwordInput: { flex: 1, paddingVertical: 13, fontSize: 15, color: Colors.text },
  error: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14 },
  errorText: { flex: 1, color: Colors.rejected, fontSize: 13 },
  footer: { alignItems: 'center', marginTop: 24, gap: 4 },
  footerText: { fontSize: 14, color: '#999' },
  footerHint: { fontSize: 12, color: Colors.textSubtle, textAlign: 'center' },
});
