import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Alert, AppState } from 'react-native';

import { useAuth } from '@/contexts/auth';
import { authenticate, getBiometricPref, isBiometricAvailable, setBiometricPref } from '@/lib/biometric';

/** 백그라운드에 이 시간 이상 있다가 돌아오면 잠근다 (파일 선택기/뷰어 왕복은 잠그지 않음) */
const LOCK_AFTER_MS = 5 * 60_000;

type AuthResult = { success: boolean; message?: string };

type AppLockState = {
  /** 저장된 설정 확인이 끝났는지 (끝나기 전엔 스플래시 유지) */
  ready: boolean;
  locked: boolean;
  enabled: boolean;
  /** 기기에 생체인증이 등록돼 있는지 */
  available: boolean;
  /** 켤 때는 본인 확인(인증 성공) 후에만 저장된다 */
  setEnabled: (on: boolean) => Promise<AuthResult>;
  unlock: () => Promise<AuthResult>;
  /** 로그인 직후: 아직 묻지 않았고 기기에 생체인증이 있으면 사용 여부를 묻는다 */
  offerAfterLogin: () => Promise<void>;
  /** 기기 등록 상태를 다시 확인 (설정 화면 진입 시) */
  refreshAvailability: () => Promise<boolean>;
};

const AppLockContext = createContext<AppLockState | null>(null);

export function AppLockProvider({ children }: { children: ReactNode }) {
  const { user, ready: authReady } = useAuth();
  const [ready, setReady] = useState(false);
  const [locked, setLocked] = useState(false);
  const [enabled, setEnabledState] = useState(false);
  const [available, setAvailable] = useState(false);

  const loggedIn = Boolean(user);
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
  const loggedInRef = useRef(loggedIn);
  loggedInRef.current = loggedIn;

  // 앱 실행 시 한 번: 저장된 세션이 있고 잠금이 켜져 있으면 잠근 상태로 시작
  useEffect(() => {
    if (!authReady) return;
    let alive = true;
    (async () => {
      const [pref, canUse] = await Promise.all([getBiometricPref(), isBiometricAvailable()]);
      if (!alive) return;
      const on = pref === 'on' && canUse;
      setAvailable(canUse);
      setEnabledState(on);
      if (on && loggedInRef.current) setLocked(true);
      setReady(true);
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady]);

  // 로그아웃되면 잠금 해제 (로그인 화면을 가리지 않도록)
  useEffect(() => {
    if (!loggedIn) setLocked(false);
  }, [loggedIn]);

  // 백그라운드에 5분 이상 있다가 돌아오면 잠금
  useEffect(() => {
    let backgroundAt: number | null = null;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background') {
        backgroundAt = Date.now();
      } else if (state === 'active') {
        if (
          backgroundAt !== null &&
          Date.now() - backgroundAt >= LOCK_AFTER_MS &&
          enabledRef.current &&
          loggedInRef.current
        ) {
          setLocked(true);
        }
        backgroundAt = null;
      }
    });
    return () => sub.remove();
  }, []);

  const refreshAvailability = useCallback(async () => {
    const canUse = await isBiometricAvailable();
    setAvailable(canUse);
    return canUse;
  }, []);

  const setEnabled = useCallback(async (on: boolean): Promise<AuthResult> => {
    if (!on) {
      await setBiometricPref('off');
      setEnabledState(false);
      return { success: true };
    }
    const result = await authenticate('생체인증 잠금 사용');
    if (result.success) {
      await setBiometricPref('on');
      setEnabledState(true);
    }
    return result;
  }, []);

  const offerAfterLogin = useCallback(async () => {
    const [pref, canUse] = await Promise.all([getBiometricPref(), isBiometricAvailable()]);
    setAvailable(canUse);
    if (pref !== null || !canUse) return;
    Alert.alert('생체인증 잠금', '다음부터 지문/얼굴 인증으로 앱 잠금을 해제할까요?\n더보기 탭에서 언제든 바꿀 수 있습니다.', [
      { text: '나중에', style: 'cancel', onPress: () => setBiometricPref('off') },
      {
        text: '사용',
        onPress: async () => {
          const result = await setEnabled(true);
          if (!result.success) {
            await setBiometricPref('off');
            if (result.message) Alert.alert('생체인증 잠금', result.message);
          }
        },
      },
    ]);
  }, [setEnabled]);

  const unlock = useCallback(async () => {
    const result = await authenticate();
    if (result.success) setLocked(false);
    return result;
  }, []);

  const value = useMemo(
    () => ({ ready, locked, enabled, available, setEnabled, unlock, offerAfterLogin, refreshAvailability }),
    [ready, locked, enabled, available, setEnabled, unlock, offerAfterLogin, refreshAvailability],
  );
  return <AppLockContext.Provider value={value}>{children}</AppLockContext.Provider>;
}

export function useAppLock() {
  const ctx = useContext(AppLockContext);
  if (!ctx) throw new Error('useAppLock must be used inside AppLockProvider');
  return ctx;
}
