import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { UserSummary } from '@/api/chat';
import { sendMail } from '@/api/mail';
import { Button, Card, Header, Screen, TextField } from '@/components/ui';
import { UserSearch } from '@/components/user-search';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { Alert } from '@/lib/alert';
import { errorMessage } from '@/lib/api';

export default function MailComposeScreen() {
  const router = useRouter();
  const [recipients, setRecipients] = useState<UserSummary[]>([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [picking, setPicking] = useState(true);
  const [sending, setSending] = useState(false);

  const toggleRecipient = (u: UserSummary) =>
    setRecipients((prev) => (prev.some((p) => p.empNo === u.empNo) ? prev.filter((p) => p.empNo !== u.empNo) : [...prev, u]));

  const handleSend = async () => {
    if (!recipients.length) return Alert.alert('받는 사람', '받는 사람을 한 명 이상 선택해주세요.');
    if (!title.trim()) return Alert.alert('제목', '제목을 입력해주세요.');
    setSending(true);
    try {
      await sendMail({ title: title.trim(), body, recipientEmpNos: recipients.map((r) => r.empNo) });
      Alert.alert('발송 완료', '메일을 발송했습니다.');
      router.back();
    } catch (e) {
      Alert.alert('발송 실패', errorMessage(e));
    } finally {
      setSending(false);
    }
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <Header
        title="메일 쓰기"
        back
        right={<Button title="보내기" icon="send" small loading={sending} onPress={handleSend} />}
      />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Card>
            <View style={styles.labelRow}>
              <Text style={styles.label}>받는 사람</Text>
              <Pressable onPress={() => setPicking((v) => !v)} hitSlop={8}>
                <Text style={styles.link}>{picking ? '검색 닫기' : '추가'}</Text>
              </Pressable>
            </View>
            <View style={styles.chips}>
              {recipients.length === 0 ? <Text style={styles.placeholder}>선택된 사람이 없습니다.</Text> : null}
              {recipients.map((r) => (
                <Pressable key={r.empNo} style={styles.chip} onPress={() => toggleRecipient(r)}>
                  <Text style={styles.chipText}>{r.name}</Text>
                  <Feather name="x" size={12} color={Colors.white} />
                </Pressable>
              ))}
            </View>
            {picking ? (
              <View style={{ marginTop: 12 }}>
                <UserSearch onSelect={toggleRecipient} selectedEmpNos={recipients.map((r) => r.empNo)} />
              </View>
            ) : null}
          </Card>

          <Card style={{ gap: 14 }}>
            <TextField label="제목" value={title} onChangeText={setTitle} placeholder="제목을 입력하세요" maxLength={200} />
            <TextField
              label="내용"
              value={body}
              onChangeText={setBody}
              placeholder="내용을 입력하세요"
              multiline
              inputStyle={{ minHeight: 220 }}
            />
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.xl },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  label: { fontSize: 14, fontWeight: '500', color: '#555' },
  link: { fontSize: 13, fontWeight: '600', color: Colors.primary },
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
  placeholder: { fontSize: 13, color: Colors.textSubtle },
});
