import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { getChatMessages, getChatRooms, markChatRoomAsRead, type ChatMessage, type ChatRoom } from '@/api/chat';
import { Avatar, ErrorBanner, Header, Loading, Screen } from '@/components/ui';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth';
import { useSocket } from '@/contexts/socket';
import { errorMessage } from '@/lib/api';
import { formatTime, isSameDay, WEEKDAYS } from '@/lib/format';

const PAGE_SIZE = 30;

/** 웹 Chat.jsx isSameMessage: 소켓 수신과 목록 조회가 겹칠 때 중복 제거 */
const isSameMessage = (a: ChatMessage, b: ChatMessage) =>
  a.messageId === b.messageId ||
  (a.senderEmpNo === b.senderEmpNo &&
    a.content === b.content &&
    Math.abs(+new Date(a.sentAt) - +new Date(b.sentAt)) <= 1500);

const dayLabel = (d: Date) => `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 ${WEEKDAYS[d.getDay()]}요일`;

export default function ChatRoomScreen() {
  const { roomId: roomIdParam } = useLocalSearchParams<{ roomId: string }>();
  const roomId = Number(roomIdParam);
  const { user } = useAuth();
  const { status, subscribeRoom, sendMessage } = useSocket();

  const [room, setRoom] = useState<ChatRoom | null>(null);
  // 최신 메시지가 앞에 오는 내림차순 (inverted FlatList)
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState('');
  const [text, setText] = useState('');
  const pageRef = useRef(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [list, rooms] = await Promise.all([getChatMessages(roomId, 0, PAGE_SIZE), getChatRooms()]);
      setMessages(list);
      setHasMore(list.length >= PAGE_SIZE);
      setRoom(rooms.find((r) => r.roomId === roomId) ?? null);
      pageRef.current = 0;
      markChatRoomAsRead(roomId).catch(() => {});
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(
    () =>
      subscribeRoom(roomId, (message) => {
        setMessages((prev) => (prev.some((m) => isSameMessage(m, message)) ? prev : [message, ...prev]));
        markChatRoomAsRead(roomId).catch(() => {});
      }),
    [roomId, subscribeRoom],
  );

  const loadMore = async () => {
    if (loadingMore || !hasMore || loading) return;
    setLoadingMore(true);
    try {
      const next = pageRef.current + 1;
      const list = await getChatMessages(roomId, next, PAGE_SIZE);
      pageRef.current = next;
      setHasMore(list.length >= PAGE_SIZE);
      setMessages((prev) => [...prev, ...list.filter((m) => !prev.some((p) => isSameMessage(p, m)))]);
    } catch {
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleSend = () => {
    const content = text.trim();
    if (!content) return;
    if (!sendMessage(roomId, content)) {
      setError('실시간 연결이 아직 준비되지 않았습니다. 잠시 후 다시 시도해주세요.');
      return;
    }
    setError('');
    setText('');
  };

  const title = room?.name ?? '채팅';
  const subtitle =
    room?.type === 'GROUP'
      ? `${room.members?.length ?? 0}명 참여`
      : status !== 'connected'
        ? '연결 중…'
        : undefined;

  return (
    <Screen edges={['top', 'bottom']}>
      <Header title={title} subtitle={subtitle} back />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
        {error ? <ErrorBanner message={error} onRetry={messages.length ? undefined : load} /> : null}
        {loading ? (
          <Loading />
        ) : (
          <FlatList
            data={messages}
            inverted
            keyExtractor={(m, i) => `${m.messageId}-${i}`}
            contentContainerStyle={styles.list}
            onEndReached={loadMore}
            onEndReachedThreshold={0.3}
            ListFooterComponent={loadingMore ? <ActivityIndicator color={Colors.primary} style={{ margin: 12 }} /> : null}
            renderItem={({ item, index }) => {
              const older = messages[index + 1];
              const newer = messages[index - 1];
              const d = new Date(item.sentAt);
              const showDay = !older || !isSameDay(new Date(older.sentAt), d);
              const mine = item.senderEmpNo === user?.empNo;
              // 같은 사람이 연달아 보낸 첫 메시지에만 이름/아바타 표시
              const firstOfGroup = !older || older.senderEmpNo !== item.senderEmpNo || showDay || older.messageType === 'SYSTEM';
              const lastOfGroup =
                !newer ||
                newer.senderEmpNo !== item.senderEmpNo ||
                formatTime(newer.sentAt) !== formatTime(item.sentAt) ||
                !isSameDay(new Date(newer.sentAt), d);
              return (
                <View>
                  {showDay ? (
                    <View style={styles.dayDivider}>
                      <Text style={styles.dayText}>{dayLabel(d)}</Text>
                    </View>
                  ) : null}
                  <MessageBubble message={item} mine={mine} showName={firstOfGroup} showTime={lastOfGroup} />
                </View>
              );
            }}
          />
        )}

        <View style={styles.inputBar}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="메시지를 입력하세요"
            placeholderTextColor={Colors.textSubtle}
            style={styles.input}
            multiline
          />
          <Pressable
            onPress={handleSend}
            disabled={!text.trim()}
            style={[styles.sendButton, !text.trim() && { backgroundColor: Colors.borderStrong }]}>
            <Feather name="send" size={18} color={Colors.white} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function MessageBubble({
  message,
  mine,
  showName,
  showTime,
}: {
  message: ChatMessage;
  mine: boolean;
  showName: boolean;
  showTime: boolean;
}) {
  if (message.messageType === 'SYSTEM') {
    return (
      <View style={styles.system}>
        <Text style={styles.systemText}>{message.content}</Text>
      </View>
    );
  }

  const body = message.fileUrl ? (
    <View style={styles.fileRow}>
      <Feather name="file" size={16} color={mine ? Colors.white : Colors.primary} />
      <Text style={[styles.bubbleText, mine && { color: Colors.white }]} numberOfLines={2}>
        {message.fileName || '파일'}
      </Text>
    </View>
  ) : (
    <Text style={[styles.bubbleText, mine && { color: Colors.white }]}>{message.content}</Text>
  );

  const time = showTime ? <Text style={styles.time}>{formatTime(message.sentAt)}</Text> : null;

  if (mine) {
    return (
      <View style={[styles.row, styles.rowMine, !showName && { marginTop: 2 }]}>
        {time}
        <View style={[styles.bubble, styles.bubbleMine]}>{body}</View>
      </View>
    );
  }

  return (
    <View style={[styles.row, !showName && { marginTop: 2 }]}>
      <View style={{ width: 36 }}>{showName ? <Avatar name={message.senderName} size={36} /> : null}</View>
      <View style={{ flexShrink: 1 }}>
        {showName ? <Text style={styles.sender}>{message.senderName}</Text> : null}
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6 }}>
          <View style={[styles.bubble, styles.bubbleOther]}>{body}</View>
          {time}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  dayDivider: { alignItems: 'center', marginVertical: 14 },
  dayText: {
    fontSize: 12,
    color: Colors.textMuted,
    backgroundColor: 'rgba(15,35,52,0.06)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 10, maxWidth: '85%' },
  rowMine: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  sender: { fontSize: 12, color: Colors.textMuted, marginBottom: 4, fontWeight: '600' },
  bubble: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18, flexShrink: 1 },
  bubbleMine: { backgroundColor: Colors.primary, borderTopRightRadius: 6 },
  bubbleOther: { backgroundColor: Colors.surface, borderTopLeftRadius: 6 },
  bubbleText: { fontSize: 15, color: Colors.text, lineHeight: 21 },
  fileRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  time: { fontSize: 11, color: Colors.textSubtle, marginBottom: 2 },
  system: { alignItems: 'center', marginVertical: 10 },
  systemText: { fontSize: 12, color: Colors.textMuted },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    padding: Spacing.sm,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    minHeight: 42,
    backgroundColor: Colors.inputBg,
    borderRadius: 21,
    paddingHorizontal: 16,
    paddingTop: 11,
    paddingBottom: 11,
    fontSize: 15,
    color: Colors.text,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
