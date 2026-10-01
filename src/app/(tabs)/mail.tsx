import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import {
  cancelMail,
  deleteMail,
  getMails,
  permanentDeleteMail,
  restoreMail,
  toggleMailFavorite,
  type MailBox,
  type MailSummary,
} from '@/api/mail';
import { Avatar, EmptyState, ErrorBanner, Header, Loading, PillTabs, Screen } from '@/components/ui';
import { Colors, Shadow, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth';
import { errorMessage } from '@/lib/api';
import { formatListDate } from '@/lib/format';

const BOXES: { key: MailBox; label: string; empty: string }[] = [
  { key: 'inbox', label: '받은메일함', empty: '받은 메일이 없습니다.' },
  { key: 'sent', label: '보낸메일함', empty: '보낸 메일이 없습니다.' },
  { key: 'favorites', label: '중요메일함', empty: '중요 표시한 메일이 없습니다.' },
  { key: 'draft', label: '임시보관함', empty: '임시 저장된 메일이 없습니다.' },
  { key: 'trash', label: '휴지통', empty: '휴지통이 비어 있습니다.' },
];

export default function MailListScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const myEmpNo = user?.empNo;
  const [box, setBox] = useState<MailBox>('inbox');
  const [items, setItems] = useState<MailSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const pageRef = useRef(0);
  const hasNextRef = useRef(false);
  const boxRef = useRef(box);
  boxRef.current = box;

  const load = useCallback(async (target: MailBox, mode: 'initial' | 'refresh' | 'silent') => {
    if (mode === 'initial') setLoading(true);
    if (mode === 'refresh') setRefreshing(true);
    try {
      const res = await getMails(target, 0, 20, myEmpNo);
      if (boxRef.current !== target) return;
      setItems(res.items);
      hasNextRef.current = res.hasNext;
      pageRef.current = 0;
      setError('');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [myEmpNo]);

  useEffect(() => {
    setItems([]);
    load(box, 'initial');
  }, [box, load]);

  const firstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      load(boxRef.current, 'silent');
    }, [load]),
  );

  const loadMore = async () => {
    if (loadingMore || !hasNextRef.current) return;
    setLoadingMore(true);
    try {
      const res = await getMails(box, pageRef.current + 1, 20, myEmpNo);
      pageRef.current += 1;
      hasNextRef.current = res.hasNext;
      setItems((prev) => [...prev, ...res.items.filter((m) => !prev.some((p) => p.mailId === m.mailId))]);
    } finally {
      setLoadingMore(false);
    }
  };

  const toggleStar = async (mail: MailSummary) => {
    const target = mail.box === 'sent' ? 'sent' : 'inbox';
    setItems((prev) => prev.map((m) => (m.mailId === mail.mailId ? { ...m, isFavorite: !m.isFavorite } : m)));
    try {
      await toggleMailFavorite(mail.mailId, target);
      if (box === 'favorites') load(box, 'silent');
    } catch {
      setItems((prev) => prev.map((m) => (m.mailId === mail.mailId ? { ...m, isFavorite: mail.isFavorite } : m)));
    }
  };

  /** 실패 메시지를 띄우고, 성공하면 목록을 조용히 새로고침 */
  const act = (fn: () => Promise<unknown>, failTitle: string) => async () => {
    try {
      await fn();
      load(boxRef.current, 'silent');
    } catch (e) {
      Alert.alert(failTitle, errorMessage(e));
    }
  };

  /** 길게 누르기 메뉴 (AngApp MailList 와 동일한 동작) */
  const showActions = (mail: MailSummary) => {
    const origin = mail.box === 'sent' ? 'sent' : 'inbox';
    const buttons: Parameters<typeof Alert.alert>[2] = [];
    if (box === 'trash') {
      buttons.push({ text: '복원', onPress: act(() => restoreMail(mail.mailId, origin), '복원 실패') });
      buttons.push({
        text: '완전 삭제',
        style: 'destructive',
        onPress: () =>
          Alert.alert('완전 삭제', '이 메일을 완전히 삭제할까요? 복원할 수 없습니다.', [
            { text: '취소', style: 'cancel' },
            { text: '삭제', style: 'destructive', onPress: act(() => permanentDeleteMail(mail.mailId, origin), '삭제 실패') },
          ]),
      });
    } else if (mail.box === 'draft') {
      buttons.push({ text: '이어쓰기', onPress: () => router.push({ pathname: '/mail/compose', params: { draftId: mail.mailId } }) });
      buttons.push({ text: '삭제', style: 'destructive', onPress: act(() => deleteMail(mail.mailId, 'draft'), '삭제 실패') });
    } else {
      if (mail.box === 'sent' && mail.status === 'SENT') {
        buttons.push({
          text: '발송 취소',
          onPress: act(() => cancelMail(mail.mailId), '발송 취소 실패'),
        });
      }
      buttons.push({ text: '휴지통으로 이동', style: 'destructive', onPress: act(() => deleteMail(mail.mailId, origin), '삭제 실패') });
    }
    buttons.push({ text: '닫기', style: 'cancel' });
    Alert.alert(mail.title || '(제목 없음)', undefined, buttons);
  };

  const openMail = (mail: MailSummary) => {
    if (box === 'trash') return showActions(mail);
    if (mail.box === 'draft') return router.push({ pathname: '/mail/compose', params: { draftId: mail.mailId } });
    router.push(`/mail/${mail.mailId}`);
  };

  const meta = BOXES.find((b) => b.key === box)!;
  const unread = box === 'inbox' ? items.filter((m) => !m.isRead).length : 0;

  return (
    <Screen>
      <Header title="메일" subtitle={box === 'inbox' && unread ? `안 읽은 메일 ${unread}개` : undefined} />
      <PillTabs items={BOXES.map((b) => ({ key: b.key, label: b.label }))} value={box} onChange={setBox} />
      {error ? <ErrorBanner message={error} onRetry={() => load(box, 'initial')} /> : null}
      {loading ? (
        <Loading />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(m) => String(m.mailId)}
          contentContainerStyle={items.length ? { paddingBottom: 90 } : { flexGrow: 1 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(box, 'refresh')} tintColor={Colors.primary} />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={loadingMore ? <ActivityIndicator color={Colors.primary} style={{ margin: 16 }} /> : null}
          ListEmptyComponent={<EmptyState icon="mail" title={meta.empty} />}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          renderItem={({ item }) => (
            <MailRow
              mail={item}
              box={box}
              onPress={() => openMail(item)}
              onLongPress={() => showActions(item)}
              onStar={() => toggleStar(item)}
            />
          )}
        />
      )}
      <Pressable style={[styles.fab, Shadow.primary]} onPress={() => router.push('/mail/compose')}>
        <Feather name="edit-3" size={18} color={Colors.white} />
        <Text style={styles.fabText}>메일 쓰기</Text>
      </Pressable>
    </Screen>
  );
}

function MailRow({
  mail,
  box,
  onPress,
  onLongPress,
  onStar,
}: {
  mail: MailSummary;
  box: MailBox;
  onPress: () => void;
  onLongPress: () => void;
  onStar: () => void;
}) {
  const mine = mail.box === 'sent' || mail.box === 'draft';
  const unread = box === 'inbox' && !mail.isRead;
  const cancelled = mail.status === 'CANCELLED';
  return (
    <Pressable onPress={onPress} onLongPress={onLongPress} style={({ pressed }) => [styles.row, pressed && { backgroundColor: Colors.primarySoft }]}>
      <View>
        <Avatar name={mail.senderName} size={42} />
        {unread ? <View style={styles.unreadDot} /> : null}
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <View style={styles.rowTop}>
          <Text style={[styles.sender, unread && styles.bold]} numberOfLines={1}>
            {mine ? '나' : mail.senderName}
          </Text>
          <Text style={styles.date}>{formatListDate(mail.sentAt)}</Text>
        </View>
        <Text style={[styles.title, unread && styles.bold, cancelled && styles.cancelled]} numberOfLines={1}>
          {cancelled ? '[발송취소] ' : ''}
          {mail.title || '(제목 없음)'}
        </Text>
      </View>
      {box !== 'draft' && box !== 'trash' ? (
        <Pressable onPress={onStar} hitSlop={10} style={{ padding: 4 }}>
          <Feather name="star" size={18} color={mail.isFavorite ? Colors.pending : Colors.borderStrong} />
        </Pressable>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    backgroundColor: Colors.surface,
  },
  sep: { height: 1, backgroundColor: Colors.border },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sender: { flex: 1, fontSize: 14, color: Colors.text },
  bold: { fontWeight: '800' },
  date: { fontSize: 12, color: Colors.textSubtle },
  title: { fontSize: 14, color: Colors.textMuted },
  cancelled: { textDecorationLine: 'line-through' },
  unreadDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: Colors.primary,
    borderWidth: 2,
    borderColor: Colors.surface,
  },
  fab: {
    position: 'absolute',
    right: Spacing.md,
    bottom: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 999,
  },
  fabText: { color: Colors.white, fontWeight: '700', fontSize: 14 },
});
