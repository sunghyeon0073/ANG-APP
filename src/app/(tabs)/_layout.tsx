import { Feather } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useEffect, useState } from 'react';
import type { ColorValue } from 'react-native';

import { getChatRooms } from '@/api/chat';
import { getMails } from '@/api/mail';
import type { IconName } from '@/components/ui';
import { Colors } from '@/constants/theme';
import { useSocket } from '@/contexts/socket';

const tabIcon =
  (name: IconName) =>
  ({ color, size }: { color: ColorValue; size: number }) => <Feather name={name} size={size - 2} color={color as string} />;

/** 채팅/메일 미읽음 배지. 알림 수신 시와 1분 주기로 갱신 */
function useUnreadBadges() {
  const { onNotification } = useSocket();
  const [counts, setCounts] = useState({ chat: 0, mail: 0 });

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const [rooms, inbox] = await Promise.allSettled([getChatRooms(), getMails('inbox', 0, 30)]);
      if (!alive) return;
      setCounts({
        chat: rooms.status === 'fulfilled' ? rooms.value.reduce((s, r) => s + (r.unreadCount || 0), 0) : 0,
        mail: inbox.status === 'fulfilled' ? inbox.value.items.filter((m) => !m.isRead).length : 0,
      });
    };
    load();
    const timer = setInterval(load, 60000);
    const off = onNotification(() => load());
    return () => {
      alive = false;
      clearInterval(timer);
      off();
    };
  }, [onNotification]);

  return counts;
}

export default function TabsLayout() {
  const badges = useUnreadBadges();
  const badgeStyle = { backgroundColor: Colors.danger, fontSize: 10 };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
        },
        sceneStyle: { backgroundColor: Colors.bg },
      }}>
      <Tabs.Screen name="index" options={{ title: '홈', tabBarIcon: tabIcon('home') }} />
      <Tabs.Screen name="approval" options={{ title: '전자결재', tabBarIcon: tabIcon('check-circle') }} />
      <Tabs.Screen
        name="chat"
        options={{
          title: '채팅',
          tabBarIcon: tabIcon('message-circle'),
          tabBarBadge: badges.chat ? (badges.chat > 99 ? '99+' : badges.chat) : undefined,
          tabBarBadgeStyle: badgeStyle,
        }}
      />
      <Tabs.Screen
        name="mail"
        options={{
          title: '메일',
          tabBarIcon: tabIcon('mail'),
          tabBarBadge: badges.mail ? badges.mail : undefined,
          tabBarBadgeStyle: badgeStyle,
        }}
      />
      <Tabs.Screen name="more" options={{ title: '전체', tabBarIcon: tabIcon('grid') }} />
    </Tabs>
  );
}
