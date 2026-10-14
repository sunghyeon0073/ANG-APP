import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import type { ComponentProps, ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { Colors, Radius, Shadow, Spacing } from '@/constants/theme';

export type IconName = ComponentProps<typeof Feather>['name'];

/* ─────────────── 레이아웃 ─────────────── */

export function Screen({
  children,
  edges = ['top'],
  style,
}: {
  children: ReactNode;
  edges?: Edge[];
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <SafeAreaView edges={edges} style={[styles.screen, style]}>
      {children}
    </SafeAreaView>
  );
}

/** 웹 TopNavBar 느낌의 흰색 상단 바 */
export function Header({
  title,
  subtitle,
  back,
  right,
  brand,
}: {
  title: string;
  subtitle?: string;
  back?: boolean;
  right?: ReactNode;
  brand?: boolean;
}) {
  const router = useRouter();
  return (
    <View style={styles.header}>
      {back && (
        <IconButton
          name="chevron-left"
          size={24}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          style={{ marginLeft: -8 }}
        />
      )}
      <View style={{ flex: 1 }}>
        {brand ? (
          <Text style={styles.brand}>ANG</Text>
        ) : (
          <Text style={styles.headerTitle} numberOfLines={1}>
            {title}
          </Text>
        )}
        {subtitle ? (
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right ? <View style={styles.headerRight}>{right}</View> : null}
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionHeader({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {actionLabel ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={styles.sectionAction}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/* ─────────────── 입력/버튼 ─────────────── */

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

export function Button({
  title,
  onPress,
  variant = 'primary',
  icon,
  loading,
  disabled,
  style,
  small,
}: {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  small?: boolean;
}) {
  const palette = {
    primary: { bg: Colors.primary, fg: Colors.white },
    secondary: { bg: Colors.surface, fg: Colors.text },
    danger: { bg: Colors.danger, fg: Colors.white },
    ghost: { bg: Colors.primarySoft, fg: Colors.primary },
  }[variant];
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        small && styles.buttonSmall,
        { backgroundColor: palette.bg },
        variant === 'primary' && Shadow.primary,
        variant === 'secondary' && [Shadow.sm, styles.buttonSecondary],
        pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
        isDisabled && { opacity: 0.5 },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={palette.fg} size="small" />
      ) : (
        <>
          {icon ? <Feather name={icon} size={small ? 14 : 16} color={palette.fg} /> : null}
          <Text style={[styles.buttonText, small && { fontSize: 13 }, { color: palette.fg }]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

export function IconButton({
  name,
  onPress,
  size = 20,
  color = Colors.text,
  badge,
  style,
}: {
  name: IconName;
  onPress?: () => void;
  size?: number;
  color?: string;
  badge?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [styles.iconButton, pressed && { backgroundColor: Colors.primarySoft }, style]}>
      <Feather name={name} size={size} color={color} />
      {badge ? (
        <View style={styles.iconBadge}>
          <Text style={styles.iconBadgeText}>{badge > 99 ? '99+' : badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export function TextField({
  label,
  icon,
  style,
  inputStyle,
  multiline,
  ...props
}: TextInputProps & {
  label?: string;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
}) {
  return (
    <View style={style}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.inputWrap, multiline && styles.inputWrapMultiline]}>
        {icon ? <Feather name={icon} size={16} color={Colors.textMuted} /> : null}
        <TextInput
          placeholderTextColor={Colors.textSubtle}
          multiline={multiline}
          style={[styles.input, multiline && styles.inputMultiline, inputStyle]}
          {...props}
        />
      </View>
    </View>
  );
}

/** 웹 상단 메뉴의 pill 활성 스타일을 그대로 가져온 가로 탭 */
export function PillTabs<T extends string>({
  items,
  value,
  onChange,
  style,
}: {
  items: { key: T; label: string; count?: number }[];
  value: T;
  onChange: (key: T) => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={[{ flexGrow: 0 }, style]}
      contentContainerStyle={styles.pillTabs}>
      {items.map((item) => {
        const active = item.key === value;
        return (
          <Pressable
            key={item.key}
            onPress={() => onChange(item.key)}
            style={[styles.pill, active ? [styles.pillActive, Shadow.primary] : styles.pillIdle]}>
            <Text style={[styles.pillText, active && { color: Colors.white }]}>{item.label}</Text>
            {item.count !== undefined ? (
              <View style={[styles.pillCount, active && { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
                <Text style={[styles.pillCountText, active && { color: Colors.white }]}>{item.count}</Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/* ─────────────── 표시 요소 ─────────────── */

export function Badge({ label, color = Colors.primary, style }: { label: string; color?: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.badge, { backgroundColor: `${color}1A`, borderColor: `${color}40` }, style]}>
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

const AVATAR_COLORS = ['#3a5cad', '#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6'];

export function Avatar({ name, size = 40, color }: { name?: string | null; size?: number; color?: string }) {
  const text = (name || '?').trim();
  const code = [...text].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const bg = color || AVATAR_COLORS[code % AVATAR_COLORS.length];
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: bg }]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.38 }]}>{text.slice(0, 1)}</Text>
    </View>
  );
}

export function Loading({ label }: { label?: string }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={Colors.primary} />
      {label ? <Text style={styles.centerText}>{label}</Text> : null}
    </View>
  );
}

export function EmptyState({
  icon = 'inbox',
  title,
  description,
  action,
}: {
  icon?: IconName;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <View style={styles.center}>
      <View style={styles.emptyIcon}>
        <Feather name={icon} size={28} color={Colors.primary} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {description ? <Text style={styles.centerText}>{description}</Text> : null}
      {action}
    </View>
  );
}

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={styles.errorBanner}>
      <Feather name="alert-circle" size={16} color={Colors.rejected} />
      <Text style={styles.errorText}>{message}</Text>
      {onRetry ? (
        <Pressable onPress={onRetry} hitSlop={8}>
          <Text style={styles.errorRetry}>다시 시도</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.divider, style]} />;
}

export function InfoRow({ label, value }: { label: string; value?: ReactNode }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      {typeof value === 'string' || typeof value === 'number' || value == null ? (
        <Text style={styles.infoValue}>{value ?? '-'}</Text>
      ) : (
        <View style={{ flex: 1 }}>{value}</View>
      )}
    </View>
  );
}

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: Spacing.md,
    minHeight: 60,
    paddingVertical: 8,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  brand: { fontSize: 24, fontWeight: '800', color: Colors.primary, letterSpacing: -0.5 },
  headerTitle: { fontSize: 19, fontWeight: '700', color: Colors.text },
  headerSubtitle: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    ...Shadow.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  sectionAction: { fontSize: 13, fontWeight: '600', color: Colors.primary },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: Radius.pill,
  },
  buttonSmall: { paddingVertical: 9, paddingHorizontal: 16 },
  buttonSecondary: { borderWidth: 1, borderColor: Colors.borderStrong },
  buttonText: { fontSize: 15, fontWeight: '600' },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBadge: {
    position: 'absolute',
    top: 4,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    backgroundColor: Colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.surface,
  },
  iconBadgeText: { color: Colors.white, fontSize: 9, fontWeight: '700' },
  label: { fontSize: 14, fontWeight: '500', color: '#555', marginBottom: 8 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.inputBg,
    borderRadius: Radius.pill,
    paddingHorizontal: 18,
  },
  inputWrapMultiline: { borderRadius: Radius.md, alignItems: 'flex-start', paddingTop: 4 },
  input: { flex: 1, paddingVertical: 13, fontSize: 15, color: Colors.text },
  inputMultiline: { minHeight: 140, textAlignVertical: 'top' },
  pillTabs: { gap: 8, paddingHorizontal: Spacing.md, paddingVertical: 10 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: Radius.pill,
  },
  pillIdle: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  pillActive: { backgroundColor: Colors.primary },
  pillText: { fontSize: 13, fontWeight: '600', color: Colors.text },
  pillCount: {
    minWidth: 20,
    paddingHorizontal: 6,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillCountText: { fontSize: 11, fontWeight: '700', color: Colors.primary },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
  },
  badgeText: { fontSize: 11, fontWeight: '600' },
  avatar: { alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: Colors.white, fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: 10 },
  centerText: { fontSize: 14, color: Colors.textMuted, textAlign: 'center' },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    margin: Spacing.md,
    padding: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: '#fff1f0',
    borderWidth: 1,
    borderColor: '#ffa39e',
  },
  errorText: { flex: 1, fontSize: 13, color: Colors.rejected },
  errorRetry: { fontSize: 13, fontWeight: '700', color: Colors.primary },
  divider: { height: 1, backgroundColor: Colors.border },
  infoRow: { flexDirection: 'row', paddingVertical: 8, gap: 12 },
  infoLabel: { width: 76, fontSize: 13, color: Colors.textMuted },
  infoValue: { flex: 1, fontSize: 14, color: Colors.text, fontWeight: '500' },
});
