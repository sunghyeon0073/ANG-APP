import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { createGroupChatRoom, createPrivateChatRoom, type UserSummary } from '@/api/chat';
import { Button, Header, PillTabs, Screen, TextField } from '@/components/ui';
import { UserSearch } from '@/components/user-search';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth';
import { errorMessage } from '@/lib/api';

type Mode = 'private' | 'group';

export default function NewChatScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [mode, setMode] = useState<Mode>('private');
  const [creating, setCreating] = useState(false);
  const [members, setMembers] = useState<UserSummary[]>([]);
  const [groupName, setGroupName] = useState('');

  const startPrivate = async (target: UserSummary) => {
    if (creating) return;
    setCreating(true);
    try {
      const roomId = await createPrivateChatRoom(target.empNo);
      router.replace(`/chat/${roomId}`);
    } catch (e) {
      Alert.alert('채팅방 생성 실패', errorMessage(e));
    } finally {
      setCreating(false);
    }
  };

  const toggleMember = (u: UserSummary) =>
    setMembers((prev) => (prev.some((p) => p.empNo === u.empNo) ? prev.filter((p) => p.empNo !== u.empNo) : [...prev, u]));

  const createGroup = async () => {
    if (!members.length) return Alert.alert('그룹 채팅', '대화 상대를 한 명 이상 선택해주세요.');
    setCreating(true);
    try {
      const roomId = await createGroupChatRoom(groupName, members.map((m) => m.empNo));
      router.replace(`/chat/${roomId}`);
    } catch (e) {
      Alert.alert('채팅방 생성 실패', errorMessage(e));
    } finally {
      setCreating(false);
    }
  };

  const isGroup = mode === 'group';

  return (
    <Screen edges={['top', 'bottom']}>
      <Header
        title="새 채팅"
        subtitle={isGroup ? '그룹에 초대할 사람을 선택하세요' : '대화할 상대를 검색하세요'}
        back
        right={
          isGroup ? (
            <Button title={`만들기 ${members.length || ''}`.trim()} small loading={creating} onPress={createGroup} />
          ) : null
        }
      />
      <PillTabs
        items={[
          { key: 'private', label: '1:1 채팅' },
          { key: 'group', label: '그룹 채팅' },
        ]}
        value={mode}
        onChange={setMode}
      />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {isGroup ? (
          <>
            <TextField
              label="그룹 이름 (선택)"
              value={groupName}
              onChangeText={setGroupName}
              placeholder="비워두면 참여자 이름으로 표시됩니다"
              maxLength={50}
            />
            {members.length ? (
              <View style={styles.chips}>
                {members.map((m) => (
                  <Pressable key={m.empNo} style={styles.chip} onPress={() => toggleMember(m)}>
                    <Text style={styles.chipText}>{m.name}</Text>
                    <Feather name="x" size={12} color={Colors.white} />
                  </Pressable>
                ))}
              </View>
            ) : null}
            <UserSearch
              excludeEmpNos={user ? [user.empNo] : []}
              selectedEmpNos={members.map((m) => m.empNo)}
              onSelect={toggleMember}
            />
          </>
        ) : (
          <>
            {creating ? <ActivityIndicator color={Colors.primary} /> : null}
            <UserSearch autoFocus excludeEmpNos={user ? [user.empNo] : []} onSelect={startPrivate} />
            <Text style={styles.hint}>1:1 채팅방이 이미 있으면 기존 대화방으로 이동합니다.</Text>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.md, gap: 12 },
  hint: { fontSize: 12, color: Colors.textSubtle, textAlign: 'center', marginTop: Spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    borderRadius: Radius.pill,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  chipText: { color: Colors.white, fontSize: 13, fontWeight: '600' },
});
