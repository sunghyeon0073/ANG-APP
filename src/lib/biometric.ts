import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';

import { storage } from './storage';

/**
 * 앱 잠금 사용 설정. 세션 키(api.ts KEYS)와 분리돼 있어 로그아웃해도 유지된다.
 * 'on' | 'off' | null(아직 묻지 않음)
 */
const PREF_KEY = 'ang.biometric';

export type BiometricPref = 'on' | 'off' | null;

export const getBiometricPref = async (): Promise<BiometricPref> => {
  const v = await storage.getItem(PREF_KEY);
  return v === 'on' || v === 'off' ? v : null;
};

export const setBiometricPref = (value: 'on' | 'off') => storage.setItem(PREF_KEY, value);

/** 생체인증 하드웨어가 있고, 기기에 지문/얼굴이 등록돼 있는지 */
export async function isBiometricAvailable() {
  if (Platform.OS === 'web') return false;
  try {
    const [hardware, enrolled] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
    ]);
    return hardware && enrolled;
  } catch {
    return false;
  }
}

const ERROR_MESSAGES: Partial<Record<LocalAuthentication.LocalAuthenticationError, string>> = {
  lockout: '시도 횟수를 초과했습니다. 잠시 후 다시 시도하거나 비밀번호로 로그인해주세요.',
  not_enrolled: '기기에 등록된 지문/얼굴이 없습니다. 기기 설정에서 먼저 등록해주세요.',
  not_available: '이 기기에서는 생체인증을 사용할 수 없습니다.',
  passcode_not_set: '기기 잠금(PIN/패턴)을 먼저 설정해주세요.',
  timeout: '인증 시간이 초과되었습니다. 다시 시도해주세요.',
};

/** 취소 계열은 메시지 없이 조용히 실패 처리 */
const SILENT_ERRORS: LocalAuthentication.LocalAuthenticationError[] = ['user_cancel', 'system_cancel', 'app_cancel'];

/** 생체인증. 지문이 안 되면 기기 PIN/패턴으로도 풀 수 있다 */
export async function authenticate(promptMessage = 'ANG 잠금 해제'): Promise<{ success: boolean; message?: string }> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel: '취소',
      disableDeviceFallback: false,
    });
    if (result.success) return { success: true };
    if (SILENT_ERRORS.includes(result.error)) return { success: false };
    return { success: false, message: ERROR_MESSAGES[result.error] ?? '인증에 실패했습니다. 다시 시도해주세요.' };
  } catch {
    return { success: false, message: '인증에 실패했습니다. 다시 시도해주세요.' };
  }
}
