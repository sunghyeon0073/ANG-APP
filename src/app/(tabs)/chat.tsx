import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { getChatRooms, type ChatRoom } from '@/api/chat';
import { Avatar, EmptyState, ErrorBanner, Header, IconButton, Loading, Screen, TextField } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { useSocket } from '@/contexts/socket';
import { useAsync } from '@/hooks/use-async';
import { formatListDate } from '@/lib/format';

export default function ChatListScreen() {
  const router = useRouter();
  const { status, subscribeRoom, onInvite } = useSocket();
  const [keyword, setKeyword] = useState('');
  const { data, loading, refreshing, refresh, reload, error } = useAsync(getChatRooms, [], { refetchOnFocus: true });

  // 목록에 있는 모든 방을 구독해 새 메시지가 오면 목록을 갱신
  const roomIds = useMemo(() => (data ?? []).map((r) => r.roomId).join(','), [data]);
  useEffect(() => {
    if (!roomIds) return;
    const offs = roomIds.split(',').map((id) => subscribeRoom(Number(id), () => reload()));
    return () => offs.forEach((off) => off());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomIds, subscribeRoom]);

  // 다른 사람이 나를 방에 초대하면 목록을 갱신
  useEffect(() => onInvite(() => reload()), [onInvite, reload]);

  const rooms = useMemo(() => {
    const k = keyword.trim().toLowerCase();
    const list = data ?? [];
    if (!k) return list;
    return list.filter(
      (r) => r.name?.toLowerCase().includes(k) || r.members?.some((m) => m.name.toLowerCase().includes(k)),
    );
  }, [data, keyword]);

  return (
    <Screen>
      <Header
        title="채팅"
        subtitle={status === 'connected' ? '실시간 연결됨' : status === 'connecting' ? '연결 중…' : undefined}
        right={<IconButton name="edit" onPress={() => router.push('/chat/new')} />}
      />
      <TextField
        icon="search"
        placeholder="채팅방, 이름 검색"
        value={keyword}
        onChangeText={setKeyword}
        style={{ padding: Spacing.md, paddingBottom: 6 }}
        inputStyle={{ paddingVertical: 10 }}
      />
      {error ? <ErrorBanner message={error} onRetry={refresh} /> : null}
      {loading ? (
        <Loading />
      ) : (
        <FlatList
          data={rooms}
          keyExtractor={(r) => String(r.roomId)}
          contentContainerStyle={rooms.length ? { paddingVertical: 6 } : { flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Colors.primary} />}
          ListEmptyComponent={
            <EmptyState
              icon="message-circle"
              title="참여 중인 채팅방이 없습니다."
              description="오른쪽 위 버튼으로 새 대화를 시작하세요."
            />
          }
          renderItem={({ item }) => <RoomRow room={item} onPress={() => router.push(`/chat/${item.roomId}`)} />}
        />
      )}
    </Screen>
  );
}

function RoomRow({ room, onPress }: { room: ChatRoom; onPress: () => void }) {
  const isGroup = room.type === 'GROUP';
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && { backgroundColor: Colors.primarySoft }]}>
      {isGroup ? (
        <View style={styles.groupAvatar}>
          <Feather name="users" size={18} color={Colors.primary} />
        </View>
      ) : (
        <Avatar name={room.name} size={48} />
      )}
      <View style={{ flex: 1, gap: 4 }}>
        <View style={styles.rowTop}>
          <Text style={styles.name} numberOfLines={1}>
            {room.name}
          </Text>
          {isGroup ? <Text style={styles.memberCount}>{room.members?.length ?? 0}</Text> : null}
          <Text style={styles.time}>{formatListDate(room.lastMessageAt)}</Text>
        </View>
        <View style={styles.rowTop}>
          <Text style={styles.preview} numberOfLines={1}>
            {room.lastMessageContent || '대화를 시작해보세요.'}
          </Text>
          {room.unreadCount > 0 ? (
            <View style={styles.unread}>
              <Text style={styles.unreadText}>{room.unreadCount > 99 ? '99+' : room.unreadCount}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: Spacing.md, paddingVertical: 12 },
  groupAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primarySoftStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { flexShrink: 1, fontSize: 15, fontWeight: '700', color: Colors.text },
  memberCount: { fontSize: 13, color: Colors.textSubtle, flex: 1 },
  time: { marginLeft: 'auto', fontSize: 12, color: Colors.textSubtle },
  preview: { flex: 1, fontSize: 13, color: Colors.textMuted },
  unread: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    backgroundColor: Colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadText: { color: Colors.white, fontSize: 11, fontWeight: '700' },
});
