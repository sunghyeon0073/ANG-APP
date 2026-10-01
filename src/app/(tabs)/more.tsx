import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Avatar, Card, Header, Screen, type IconName } from '@/components/ui';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth';
import { Alert } from '@/lib/alert';
import { SERVER_URL } from '@/lib/config';

const MENU: { section: string; items: { label: string; icon: IconName; href: string; color: string; desc: string }[] }[] = [
  {
    section: '업무',
    items: [
      { label: '문서함', icon: 'folder', href: '/documents', color: '#0ea5e9', desc: '내 문서 · 부서 문서 · 즐겨찾기' },
      { label: '캘린더', icon: 'calendar', href: '/calendar', color: Colors.success, desc: '개인 · 부서 일정' },
      { label: 'AI 비서', icon: 'cpu', href: '/assistant', color: Colors.mine, desc: '일정 · 메일 · 문서 · 결재 검색' },
    ],
  },
  {
    section: '소식',
    items: [
      { label: '공지사항', icon: 'clipboard', href: '/notices', color: Colors.pending, desc: '사내 공지' },
      { label: '알림', icon: 'bell', href: '/notifications', color: Colors.danger, desc: '채팅 · 메일 · 결재 알림' },
    ],
  },
];

export default function MoreScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const dept = user?.departments?.[0];

  const handleLogout = () =>
    Alert.alert('로그아웃', '로그아웃 하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      { text: '로그아웃', style: 'destructive', onPress: () => signOut() },
    ]);

  return (
    <Screen>
      <Header title="전체" />
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.profile}>
          <Avatar name={user?.name} size={56} />
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>
              {user?.name} <Text style={styles.position}>{dept?.position ?? user?.position ?? ''}</Text>
            </Text>
            <Text style={styles.sub}>{dept?.scopeName ?? user?.dept ?? '소속 없음'}</Text>
            <Text style={styles.sub}>
              사번 {user?.empNo}
              {user?.email ? ` · ${user.email}` : ''}
            </Text>
          </View>
        </Card>

        {MENU.map((group) => (
          <View key={group.section}>
            <Text style={styles.section}>{group.section}</Text>
            <Card style={{ padding: 0 }}>
              {group.items.map((item, i) => (
                <Pressable
                  key={item.label}
                  onPress={() => router.push(item.href as never)}
                  style={({ pressed }) => [
                    styles.item,
                    i > 0 && styles.itemBorder,
                    pressed && { backgroundColor: Colors.primarySoft },
                  ]}>
                  <View style={[styles.icon, { backgroundColor: `${item.color}1A` }]}>
                    <Feather name={item.icon} size={18} color={item.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemLabel}>{item.label}</Text>
                    <Text style={styles.itemDesc}>{item.desc}</Text>
                  </View>
                  <Feather name="chevron-right" size={18} color={Colors.textSubtle} />
                </Pressable>
              ))}
            </Card>
          </View>
        ))}

        <Pressable style={styles.logout} onPress={handleLogout}>
          <Feather name="log-out" size={16} color={Colors.rejected} />
          <Text style={styles.logoutText}>로그아웃</Text>
        </Pressable>
        <Text style={styles.server}>서버 {SERVER_URL}</Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.xl },
  profile: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: Spacing.lg },
  name: { fontSize: 19, fontWeight: '800', color: Colors.text },
  position: { fontSize: 14, fontWeight: '500', color: Colors.textMuted },
  sub: { fontSize: 13, color: Colors.textMuted, marginTop: 3 },
  section: { fontSize: 13, fontWeight: '700', color: Colors.textMuted, marginBottom: 8, marginLeft: 4 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: Spacing.md },
  itemBorder: { borderTopWidth: 1, borderTopColor: Colors.border },
  icon: { width: 38, height: 38, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  itemLabel: { fontSize: 15, fontWeight: '600', color: Colors.text },
  itemDesc: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  logout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: '#ffa39e',
  },
  logoutText: { fontSize: 15, fontWeight: '600', color: Colors.rejected },
  server: { fontSize: 11, color: Colors.textSubtle, textAlign: 'center' },
});
