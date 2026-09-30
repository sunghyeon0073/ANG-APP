import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import {
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  type AppNotification,
} from '@/api/misc';
import { Button, EmptyState, ErrorBanner, Header, Loading, Screen } from '@/components/ui';
import { NOTIFICATION_META } from '@/constants/meta';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useSocket } from '@/contexts/socket';
import { useAsync } from '@/hooks/use-async';
import { formatRelative } from '@/lib/format';

/** 알림 유형별 이동 경로 (웹 Dashboard.handleNotificationNavigate 기준 + 상세 이동) */
const routeFor = (n: AppNotification): string | null => {
  switch (n.type) {
    case 'APPROVAL':
      return n.targetId ? `/approval/${n.targetId}` : '/approval';
    case 'MAIL':
      return n.targetId ? `/mail/${n.targetId}` : '/mail';
    case 'BOARD':
      return n.targetId ? `/notices/${n.targetId}` : '/notices';
    case 'CHAT':
      return n.targetId ? `/chat/${n.targetId}` : '/chat';
    case 'AI':
      return '/assistant';
    default:
      return null;
  }
};

export default function NotificationsScreen() {
  const router = useRouter();
  const { onNotification } = useSocket();
  const { data, setData, loading, refreshing, refresh, error } = useAsync(() => getNotifications(0, 50), []);

  useEffect(
    () => onNotification((n) => setData((prev) => [n, ...(prev ?? []).filter((p) => p.id !== n.id)])),
    [onNotification, setData],
  );

  const unread = (data ?? []).filter((n) => !n.isRead).length;

  const open = (n: AppNotification) => {
    if (!n.isRead) {
      setData((prev) => prev?.map((p) => (p.id === n.id ? { ...p, isRead: true } : p)));
      markNotificationAsRead(n.id).catch(() => {});
    }
    const href = routeFor(n);
    if (href) router.push(href as never);
  };

  const readAll = async () => {
    setData((prev) => prev?.map((p) => ({ ...p, isRead: true })));
    await markAllNotificationsAsRead().catch(() => refresh());
  };

  return (
    <Screen>
      <Header
        title="알림"
        subtitle={unread ? `읽지 않은 알림 ${unread}개` : '모든 알림을 확인했어요'}
        back
        right={unread ? <Button title="모두 읽음" variant="ghost" small onPress={readAll} /> : null}
      />
      {error ? <ErrorBanner message={error} onRetry={refresh} /> : null}
      {loading ? (
        <Loading />
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(n) => String(n.id)}
          contentContainerStyle={data?.length ? { paddingVertical: 6 } : { flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Colors.primary} />}
          ListEmptyComponent={<EmptyState icon="bell-off" title="새로운 알림이 없습니다." />}
          renderItem={({ item }) => {
            const meta = NOTIFICATION_META[item.type] ?? NOTIFICATION_META.AI;
            return (
              <Pressable
                onPress={() => open(item)}
                style={({ pressed }) => [
                  styles.row,
                  !item.isRead && styles.unreadRow,
                  pressed && { backgroundColor: Colors.primarySoft },
                ]}>
                <View style={[styles.icon, { backgroundColor: `${meta.color}1A` }]}>
                  <Feather name={meta.icon} size={18} color={meta.color} />
                </View>
                <View style={{ flex: 1, gap: 3 }}>
                  <View style={styles.top}>
                    <Text style={[styles.type, { color: meta.color }]}>{meta.label}</Text>
                    <Text style={styles.time}>{formatRelative(item.createdAt)}</Text>
                  </View>
                  <Text style={[styles.title, !item.isRead && { fontWeight: '700' }]} numberOfLines={1}>
                    {item.title}
                  </Text>
                  {item.body ? (
                    <Text style={styles.body} numberOfLines={2}>
                      {item.body}
                    </Text>
                  ) : null}
                </View>
                {!item.isRead ? <View style={styles.dot} /> : null}
              </Pressable>
            );
          }}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
  },
  unreadRow: { backgroundColor: Colors.surface },
  icon: { width: 40, height: 40, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  type: { fontSize: 12, fontWeight: '700' },
  time: { fontSize: 11, color: Colors.textSubtle },
  title: { fontSize: 14, color: Colors.text },
  body: { fontSize: 13, color: Colors.textMuted, lineHeight: 18 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary, marginTop: 6 },
});
