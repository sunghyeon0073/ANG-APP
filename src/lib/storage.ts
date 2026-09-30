import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/** 토큰/사용자 정보 저장소. 네이티브는 SecureStore, 웹은 localStorage 사용 */
const isWeb = Platform.OS === 'web';

async function getItem(key: string): Promise<string | null> {
  if (isWeb) {
    try {
      return globalThis.localStorage?.getItem(key) ?? null;
    } catch {
      return null;
    }
  }
  return SecureStore.getItemAsync(key);
}

async function setItem(key: string, value: string): Promise<void> {
  if (isWeb) {
    try {
      globalThis.localStorage?.setItem(key, value);
    } catch {}
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function removeItem(key: string): Promise<void> {
  if (isWeb) {
    try {
      globalThis.localStorage?.removeItem(key);
    } catch {}
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export const storage = { getItem, setItem, removeItem };
