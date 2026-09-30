import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getApprovalCounts } from '@/api/approval';
import { getMails } from '@/api/mail';
import { getBoardPosts, getNotifications, getSchedules, type Schedule } from '@/api/misc';
import { Card, Header, IconButton, Screen, SectionHeader, type IconName } from '@/components/ui';
import { APPROVAL_FOLDERS } from '@/constants/meta';
import { Colors, Radius, Shadow, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth';
import { useSocket } from '@/contexts/socket';
import { useAsync } from '@/hooks/use-async';
import { formatListDate, isSameDay, shortTime, WEEKDAYS, ymd } from '@/lib/format';

const QUICK_MENU: { label: string; icon: IconName; href: string; color: string }[] = [
  { label: '문서함', icon: 'folder', href: '/documents', color: '#0ea5e9' },
  { label: '캘린더', icon: 'calendar', href: '/calendar', color: Colors.success },
  { label: 'AI 비서', icon: 'cpu', href: '/assistant', color: Colors.mine },
  { label: '공지사항', icon: 'clipboard', href: '/notices', color: Colors.pending },
];

/** 이번 주(일~토) 날짜 */
const getWeek = (base: Date) => {
  const start = new Date(base);
  start.setDate(base.getDate() - base.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
};

const coversDay = (s: Schedule, day: string) => s.startDate <= day && day <= (s.endDate || s.startDate);

export default function DashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { onNotification } = useSocket();
  const today = useMemo(() => new Date(), []);
  const week = useMemo(() => getWeek(today), [today]);
  const [selectedDay, setSelectedDay] = useState(ymd(today));

  const { data, refreshing, refresh, reload } = useAsync(
    async () => {
      const [counts, schedules, notices, mails, notifications] = await Promise.allSettled([
        getApprovalCounts(),
        getSchedules(ymd(week[0]), ymd(week[6])),
        getBoardPosts('NOTICE'),
        getMails('inbox', 0, 5),
        getNotifications(0, 30),
      ]);
      const pick = <T,>(r: PromiseSettledResult<T>, fb: T) => (r.status === 'fulfilled' ? r.value : fb);
      return {
        counts: pick(counts, null),
        schedules: pick(schedules, [] as Schedule[]),
        notices: pick(notices, []).slice(0, 3),
        mails: pick(mails, { items: [], hasNext: false }).items.slice(0, 3),
        unreadNotifications: pick(notifications, []).filter((n) => !n.isRead).length,
      };
    },
    [],
    { refetchOnFocus: true },
  );

  useEffect(() => onNotification(() => reload()), [onNotification, reload]);

  const daySchedules = (data?.schedules || [])
    .filter((s) => coversDay(s, selectedDay))
    .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

  const primaryDept = user?.departments?.[0];
  const dateLabel = `${today.getMonth() + 1}월 ${today.getDate()}일 ${WEEKDAYS[today.getDay()]}요일`;

  return (
    <Screen>
      <Header
        title="홈"
        brand
        right={
          <>
            <IconButton name="cpu" onPress={() => router.push('/assistant')} />
            <IconButton
              name="bell"
              badge={data?.unreadNotifications}
              onPress={() => router.push('/notifications')}
            />
          </>
        }
      />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Colors.primary} />}>
        {/* 인사 카드 */}
        <LinearGradient
          colors={[Colors.primaryHover, Colors.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.hero, Shadow.primary]}>
          <View style={styles.heroBlob} />
          <Text style={styles.heroDate}>{dateLabel}</Text>
          <Text style={styles.heroTitle}>{user?.name ?? '사용자'}님, 안녕하세요 👋</Text>
          <Text style={styles.heroSub}>
            {[primaryDept?.scopeName ?? user?.dept, primaryDept?.position ?? user?.position].filter(Boolean).join(' · ') ||
              '오늘도 좋은 하루 보내세요.'}
          </Text>
          <Pressable style={styles.heroAi} onPress={() => router.push('/assistant')}>
            <Feather name="message-circle" size={14} color={Colors.primary} />
            <Text style={styles.heroAiText}>ANG 비서에게 물어보기</Text>
          </Pressable>
        </LinearGradient>

        {/* 전자결재 요약 */}
        <Card>
          <SectionHeader title="전자결재" actionLabel="더보기" onAction={() => router.push('/approval')} />
          <View style={styles.approvalGrid}>
            {APPROVAL_FOLDERS.map((f) => (
              <Pressable
                key={f.key}
                style={({ pressed }) => [styles.approvalCard, pressed && { backgroundColor: Colors.primarySoft }]}
                onPress={() => router.push({ pathname: '/approval', params: { folder: f.key } })}>
                <Text style={[styles.approvalCount, { color: f.color }]}>{data?.counts ? data.counts[f.key] : '-'}</Text>
                <Text style={styles.approvalLabel}>{f.key === 'my' ? '내 요청' : f.label}</Text>
              </Pressable>
            ))}
          </View>
        </Card>

        {/* 빠른 메뉴 */}
        <View style={styles.quickRow}>
          {QUICK_MENU.map((m) => (
            <Pressable key={m.label} style={styles.quickItem} onPress={() => router.push(m.href as never)}>
              <View style={[styles.quickIcon, { backgroundColor: `${m.color}1A` }]}>
                <Feather name={m.icon} size={22} color={m.color} />
              </View>
              <Text style={styles.quickLabel}>{m.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* 이번 주 일정 */}
        <Card>
          <SectionHeader title="이번 주 일정" actionLabel="캘린더" onAction={() => router.push('/calendar')} />
          <View style={styles.weekRow}>
            {week.map((d) => {
              const key = ymd(d);
              const active = key === selectedDay;
              const isToday = isSameDay(d, today);
              const hasEvent = (data?.schedules || []).some((s) => coversDay(s, key));
              return (
                <Pressable key={key} style={[styles.weekDay, active && styles.weekDayActive]} onPress={() => setSelectedDay(key)}>
                  <Text
                    style={[
                      styles.weekLabel,
                      d.getDay() === 0 && { color: Colors.danger },
                      d.getDay() === 6 && { color: Colors.primary },
                      active && { color: 'rgba(255,255,255,0.8)' },
                    ]}>
                    {WEEKDAYS[d.getDay()]}
                  </Text>
                  <Text style={[styles.weekNum, isToday && !active && { color: Colors.primary }, active && { color: Colors.white }]}>
                    {d.getDate()}
                  </Text>
                  <View style={[styles.weekDot, { opacity: hasEvent ? 1 : 0 }, active && { backgroundColor: Colors.white }]} />
                </Pressable>
              );
            })}
          </View>
          {daySchedules.length === 0 ? (
            <Text style={styles.emptyText}>등록된 일정이 없습니다.</Text>
          ) : (
            daySchedules.slice(0, 4).map((s) => (
              <View key={`${s.id}-${s.startDate}`} style={styles.scheduleItem}>
                <View
                  style={[styles.scheduleBar, { backgroundColor: s.type === 'DEPARTMENT' ? Colors.success : Colors.primary }]}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemTitle, s.isCompleted && styles.done]} numberOfLines={1}>
                    {s.title}
                  </Text>
                  <Text style={styles.itemMeta}>
                    {s.startTime ? `${shortTime(s.startTime)} - ${shortTime(s.endTime)}` : '종일'} ·{' '}
                    {s.type === 'DEPARTMENT' ? '부서' : '개인'}
                    {s.isTodo ? ' · 할 일' : ''}
                  </Text>
                </View>
              </View>
            ))
          )}
        </Card>

        {/* 공지사항 */}
        <Card>
          <SectionHeader title="공지사항" actionLabel="더보기" onAction={() => router.push('/notices')} />
          {(data?.notices || []).length === 0 ? (
            <Text style={styles.emptyText}>등록된 공지가 없습니다.</Text>
          ) : (
            data!.notices.map((n) => (
              <Pressable key={n.id} style={styles.listItem} onPress={() => router.push(`/notices/${n.id}`)}>
                {n.pinned ? <Feather name="bookmark" size={14} color={Colors.danger} /> : <View style={styles.bullet} />}
                <Text style={styles.itemTitle} numberOfLines={1}>
                  {n.title}
                </Text>
                <Text style={styles.itemDate}>{formatListDate(n.createdAt)}</Text>
              </Pressable>
            ))
          )}
        </Card>

        {/* 최근 메일 */}
        <Card>
          <SectionHeader title="받은 메일" actionLabel="더보기" onAction={() => router.push('/mail')} />
          {(data?.mails || []).length === 0 ? (
            <Text style={styles.emptyText}>받은 메일이 없습니다.</Text>
          ) : (
            data!.mails.map((m) => (
              <Pressable key={m.mailId} style={styles.listItem} onPress={() => router.push(`/mail/${m.mailId}`)}>
                <View style={[styles.bullet, !m.isRead && { backgroundColor: Colors.primary }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemTitle, !m.isRead && { fontWeight: '700' }]} numberOfLines={1}>
                    {m.title || '(제목 없음)'}
                  </Text>
                  <Text style={styles.itemMeta}>{m.senderName}</Text>
                </View>
                <Text style={styles.itemDate}>{formatListDate(m.sentAt)}</Text>
              </Pressable>
            ))
          )}
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.xl },
  hero: { borderRadius: Radius.xl, padding: Spacing.lg, overflow: 'hidden' },
  heroBlob: {
    position: 'absolute',
    right: -40,
    top: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  heroDate: { color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: '500' },
  heroTitle: { color: Colors.white, fontSize: 22, fontWeight: '800', marginTop: 6 },
  heroSub: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 4 },
  heroAi: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    backgroundColor: Colors.white,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: Radius.pill,
  },
  heroAiText: { color: Colors.primary, fontWeight: '700', fontSize: 13 },
  approvalGrid: { flexDirection: 'row', gap: 8 },
  approvalCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceMuted,
    gap: 4,
  },
  approvalCount: { fontSize: 24, fontWeight: '800' },
  approvalLabel: { fontSize: 12, color: Colors.textMuted, fontWeight: '600' },
  quickRow: { flexDirection: 'row', justifyContent: 'space-between' },
  quickItem: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 4,
    paddingVertical: 14,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    ...Shadow.sm,
  },
  quickIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { fontSize: 12, fontWeight: '600', color: Colors.text },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  weekDay: { alignItems: 'center', paddingVertical: 8, width: 40, borderRadius: Radius.md, gap: 3 },
  weekDayActive: { backgroundColor: Colors.primary },
  weekLabel: { fontSize: 11, color: Colors.textMuted, fontWeight: '600' },
  weekNum: { fontSize: 16, fontWeight: '700', color: Colors.text },
  weekDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: Colors.primary },
  scheduleItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  scheduleBar: { width: 4, alignSelf: 'stretch', borderRadius: 2 },
  listItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  bullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.borderStrong },
  itemTitle: { flex: 1, fontSize: 14, color: Colors.text, fontWeight: '500' },
  itemMeta: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  itemDate: { fontSize: 12, color: Colors.textSubtle },
  done: { textDecorationLine: 'line-through', color: Colors.textSubtle },
  emptyText: { fontSize: 13, color: Colors.textMuted, textAlign: 'center', paddingVertical: 14 },
});
