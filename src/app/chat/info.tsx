import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getChatRoomMembers, getChatRooms, leaveChatRoom, updateChatRoomName } from '@/api/chat';
import { Avatar, Button, Card, ErrorBanner, Header, Loading, Screen, TextField } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth';
import { useAsync } from '@/hooks/use-async';
import { errorMessage } from '@/lib/api';

/** 채팅방 정보: 참여자 목록, 그룹 이름 변경, 멤버 초대, 나가기 */
export default function ChatInfoScreen() {
  const { roomId: roomIdParam } = useLocalSearchParams<{ roomId: string }>();
  const roomId = Number(roomIdParam);
  const router = useRouter();
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  const { data, loading, refreshing, refresh, error } = useAsync(
    async () => {
      const [members, rooms] = await Promise.all([getChatRoomMembers(roomId), getChatRooms()]);
      return { members, room: rooms.find((r) => r.roomId === roomId) ?? null };
    },
    [roomId],
    { refetchOnFocus: true },
  );

  const room = data?.room;
  const members = data?.members ?? [];
  const isGroup = room?.type === 'GROUP';

  const handleRename = async () => {
    setBusy(true);
    try {
      await updateChatRoomName(roomId, name);
      setEditing(false);
      refresh();
    } catch (e) {
      Alert.alert('이름 변경 실패', errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const handleLeave = () =>
    Alert.alert('채팅방 나가기', '채팅방을 나가면 대화 내용을 더 이상 볼 수 없습니다.', [
      { text: '취소', style: 'cancel' },
      {
        text: '나가기',
        style: 'destructive',
        onPress: async () => {
          try {
            await leaveChatRoom(roomId);
            router.dismissTo('/chat');
          } catch (e) {
            Alert.alert('나가기 실패', errorMessage(e));
          }
        },
      },
    ]);

  if (loading) {
    return (
      <Screen>
        <Header title="채팅방 정보" back />
        <Loading />
      </Screen>
    );
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <Header title="채팅방 정보" subtitle={room?.name} back />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Colors.primary} />}>
        {error ? <ErrorBanner message={error} onRetry={refresh} /> : null}

        {isGroup ? (
          <Card style={{ gap: 12 }}>
            <View style={styles.titleRow}>
              <Text style={styles.sectionTitle}>그룹 이름</Text>
              {!editing ? (
                <Text
                  style={styles.link}
                  onPress={() => {
                    setName(room?.name ?? '');
                    setEditing(true);
                  }}>
                  변경
                </Text>
              ) : null}
            </View>
            {editing ? (
              <>
                <TextField
                  value={name}
                  onChangeText={setName}
                  placeholder="비워두면 참여자 이름으로 표시됩니다"
                  autoFocus
                  maxLength={50}
                />
                <View style={styles.buttons}>
                  <Button title="취소" variant="secondary" small style={{ flex: 1 }} onPress={() => setEditing(false)} />
                  <Button title="저장" small style={{ flex: 1 }} loading={busy} onPress={handleRename} />
                </View>
              </>
            ) : (
              <Text style={styles.roomName}>{room?.name}</Text>
            )}
          </Card>
        ) : null}

        <Card>
          <View style={styles.titleRow}>
            <Text style={styles.sectionTitle}>참여자 {members.length}</Text>
            <Text
              style={styles.link}
              onPress={() =>
                router.push({
                  pathname: '/chat/invite',
                  params: { roomId, existing: members.map((m) => m.empNo).join(',') },
                })
              }>
              <Feather name="user-plus" size={13} /> 초대
            </Text>
          </View>
          {members.map((m) => (
            <View key={m.empNo} style={styles.member}>
              <Avatar name={m.name} size={38} />
              <Text style={styles.memberName}>
                {m.name}
                {m.empNo === user?.empNo ? <Text style={styles.me}> (나)</Text> : null}
              </Text>
              <Text style={styles.empNo}>{m.empNo}</Text>
            </View>
          ))}
        </Card>

        <Button title="채팅방 나가기" icon="log-out" variant="danger" onPress={handleLeave} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.xl },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: Colors.text },
  link: { fontSize: 13, fontWeight: '600', color: Colors.primary },
  roomName: { fontSize: 15, color: Colors.text },
  buttons: { flexDirection: 'row', gap: 8 },
  member: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  memberName: { flex: 1, fontSize: 15, fontWeight: '600', color: Colors.text },
  me: { fontSize: 13, fontWeight: '400', color: Colors.textMuted },
  empNo: { fontSize: 12, color: Colors.textSubtle },
});
