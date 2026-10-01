import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text } from 'react-native';

import { createPrivateChatRoom } from '@/api/chat';
import { Header, Screen } from '@/components/ui';
import { UserSearch } from '@/components/user-search';
import { Colors, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth';
import { Alert } from '@/lib/alert';
import { errorMessage } from '@/lib/api';

export default function NewChatScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [creating, setCreating] = useState(false);

  return (
    <Screen>
      <Header title="새 채팅" subtitle="대화할 상대를 검색하세요" back />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {creating ? <ActivityIndicator color={Colors.primary} /> : null}
        <UserSearch
          autoFocus
          excludeEmpNos={user ? [user.empNo] : []}
          onSelect={async (target) => {
            if (creating) return;
            setCreating(true);
            try {
              const room = await createPrivateChatRoom(target.empNo);
              router.replace(`/chat/${room.roomId}`);
            } catch (e) {
              Alert.alert('채팅방 생성 실패', errorMessage(e));
            } finally {
              setCreating(false);
            }
          }}
        />
        <Text style={styles.hint}>1:1 채팅방이 이미 있으면 기존 대화방으로 이동합니다.</Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.md, gap: 8 },
  hint: { fontSize: 12, color: Colors.textSubtle, textAlign: 'center', marginTop: Spacing.md },
});
