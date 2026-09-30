/**
 * ANG 웹(Frontend/src/index.css)의 Soft UI 디자인 토큰을 앱으로 옮긴 값.
 */
import { Platform } from 'react-native';

export const Colors = {
  bg: '#e8eef2',
  surface: '#ffffff',
  surfaceMuted: '#f4f8fa',
  border: 'rgba(15, 35, 52, 0.06)',
  borderStrong: '#dde5eb',
  primary: '#3a5cad',
  primaryHover: '#2d4a8e',
  primarySoft: 'rgba(58, 92, 173, 0.08)',
  primarySoftStrong: 'rgba(58, 92, 173, 0.16)',
  text: '#2a3a45',
  textMuted: '#6b7c88',
  textSubtle: '#94a3b8',
  inputBg: '#f0f4f7',
  white: '#ffffff',

  // 상태 색상 (웹 전자결재/홈 요약과 동일)
  pending: '#f59e0b',
  success: '#10b981',
  approved: '#16a34a',
  danger: '#ef4444',
  rejected: '#dc2626',
  mine: '#6366f1',
  cancelled: '#d97706',
  delegated: '#7c3aed',
} as const;

export const Radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 24,
  pill: 9999,
} as const;

export const Spacing = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

/** --shadow-soft-sm / md 를 플랫폼별 그림자로 근사 */
export const Shadow = {
  sm: Platform.select({
    ios: {
      shadowColor: '#0f2334',
      shadowOpacity: 0.06,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
    },
    android: { elevation: 2 },
    default: { boxShadow: '0 4px 14px rgba(15,35,52,0.06), 0 2px 6px rgba(15,35,52,0.04)' },
  }),
  md: Platform.select({
    ios: {
      shadowColor: '#0f2334',
      shadowOpacity: 0.1,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 8 },
    },
    android: { elevation: 5 },
    default: { boxShadow: '0 8px 28px rgba(15,35,52,0.08), 0 4px 12px rgba(15,35,52,0.05)' },
  }),
  primary: Platform.select({
    ios: {
      shadowColor: '#3a5cad',
      shadowOpacity: 0.28,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 6 },
    },
    android: { elevation: 4 },
    default: { boxShadow: '0 12px 32px rgba(58,92,173,0.18), 0 6px 16px rgba(15,35,52,0.08)' },
  }),
} as const;
