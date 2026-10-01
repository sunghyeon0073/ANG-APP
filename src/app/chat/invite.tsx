import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { inviteChatMembers, type UserSummary } from '@/api/chat';
import { Button, Header, Screen } from '@/components/ui';
import { UserSearch } from '@/components/user-search';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { errorMessage } from '@/lib/api';

/** 기존 채팅방에 멤버 초대 */
export default function ChatInviteScreen() {
  const { roomId, existing } = useLocalSearchParams<{ roomId: string; existing?: string }>();
  const router = useRouter();
  const [selected, setSelected] = useState<UserSummary[]>([]);
  const [busy, setBusy] = useState(false);
  const existingEmpNos = existing ? existing.split(',') : [];

  const toggle = (u: UserSummary) =>
    setSelected((prev) => (prev.some((p) => p.empNo === u.empNo) ? prev.filter((p) => p.empNo !== u.empNo) : [...prev, u]));

  const handleInvite = async () => {
    if (!selected.length) return Alert.alert('멤버 초대', '초대할 멤버를 선택해주세요.');
    setBusy(true);
    try {
      await inviteChatMembers(roomId, selected.map((u) => u.empNo));
      router.back();
    } catch (e) {
      Alert.alert('초대 실패', errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <Header
        title="멤버 초대"
        back
        right={<Button title={`초대 ${selected.length || ''}`.trim()} small loading={busy} onPress={handleInvite} />}
      />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {selected.length ? (
          <View style={styles.chips}>
            {selected.map((u) => (
              <Pressable key={u.empNo} style={styles.chip} onPress={() => toggle(u)}>
                <Text style={styles.chipText}>{u.name}</Text>
                <Feather name="x" size={12} color={Colors.white} />
              </Pressable>
            ))}
          </View>
        ) : null}
        <UserSearch
          autoFocus
          onSelect={toggle}
          excludeEmpNos={existingEmpNos}
          selectedEmpNos={selected.map((u) => u.empNo)}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.md, gap: 12 },
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
