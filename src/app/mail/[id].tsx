import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { deleteMail, getMailDetail, replyMail, sendDraftMail } from '@/api/mail';
import { Avatar, Badge, Button, Card, Divider, ErrorBanner, Header, IconButton, Loading, Screen, TextField } from '@/components/ui';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth';
import { useAsync } from '@/hooks/use-async';
import { errorMessage } from '@/lib/api';
import { formatDateTime } from '@/lib/format';

export default function MailDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [replyOpen, setReplyOpen] = useState(false);
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);
  const [showAllRecipients, setShowAllRecipients] = useState(false);

  const { data: mail, loading, refreshing, refresh, error } = useAsync(() => getMailDetail(id), [id]);

  if (loading) {
    return (
      <Screen>
        <Header title="메일" back />
        <Loading />
      </Screen>
    );
  }
  if (!mail) {
    return (
      <Screen>
        <Header title="메일" back />
        <ErrorBanner message={error || '메일을 찾을 수 없습니다.'} onRetry={refresh} />
      </Screen>
    );
  }

  const isMine = mail.senderEmpNo === user?.empNo;
  const isDraft = mail.status === 'DRAFT';
  const box = isDraft ? 'draft' : isMine ? 'sent' : 'inbox';
  const recipients = showAllRecipients ? mail.recipients : mail.recipients.slice(0, 3);

  const handleDelete = () =>
    Alert.alert('메일 삭제', '이 메일을 휴지통으로 이동할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteMail(mail.mailId, box);
            router.back();
          } catch (e) {
            Alert.alert('삭제 실패', errorMessage(e));
          }
        },
      },
    ]);

  const handleReply = async () => {
    if (!reply.trim()) return;
    setBusy(true);
    try {
      await replyMail(mail.mailId, reply.trim());
      setReply('');
      setReplyOpen(false);
      Alert.alert('답장 완료', '답장을 발송했습니다.');
    } catch (e) {
      Alert.alert('답장 실패', errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const handleSendDraft = async () => {
    setBusy(true);
    try {
      await sendDraftMail(mail.mailId);
      Alert.alert('발송 완료', '메일을 발송했습니다.');
      router.back();
    } catch (e) {
      Alert.alert('발송 실패', errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <Header title="메일" back right={<IconButton name="trash-2" onPress={handleDelete} />} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Colors.primary} />}>
          <Card>
            {mail.status === 'CANCELLED' ? <Badge label="발송 취소됨" color={Colors.cancelled} style={{ marginBottom: 8 }} /> : null}
            {isDraft ? <Badge label="임시저장" color={Colors.textMuted} style={{ marginBottom: 8 }} /> : null}
            <Text style={styles.title}>{mail.title || '(제목 없음)'}</Text>
            <Divider style={{ marginVertical: 14 }} />
            <View style={styles.senderRow}>
              <Avatar name={mail.senderName} size={42} />
              <View style={{ flex: 1 }}>
                <Text style={styles.senderName}>
                  {mail.senderName} <Text style={styles.empNo}>{mail.senderEmpNo}</Text>
                </Text>
                <Text style={styles.date}>{formatDateTime(mail.sentAt || mail.createdAt)}</Text>
              </View>
            </View>

            <View style={styles.recipients}>
              <Text style={styles.recipientLabel}>받는사람</Text>
              <View style={styles.chips}>
                {recipients.map((r) => (
                  <View key={r.recipientEmpNo} style={styles.chip}>
                    <Text style={styles.chipText}>{r.recipientName}</Text>
                    {isMine && !isDraft ? (
                      <Feather
                        name={r.isRead ? 'check-circle' : 'circle'}
                        size={12}
                        color={r.isRead ? Colors.success : Colors.textSubtle}
                      />
                    ) : null}
                  </View>
                ))}
                {mail.recipients.length > 3 ? (
                  <Text style={styles.more} onPress={() => setShowAllRecipients((v) => !v)}>
                    {showAllRecipients ? '접기' : `+${mail.recipients.length - 3}명`}
                  </Text>
                ) : null}
              </View>
            </View>
          </Card>

          <Card style={{ minHeight: 180 }}>
            <Text style={styles.body} selectable>
              {mail.body || '내용 없음'}
            </Text>
          </Card>

          {mail.attachments.length ? (
            <Card>
              <Text style={styles.sectionTitle}>첨부파일 {mail.attachments.length}</Text>
              {mail.attachments.map((a) => (
                <View key={a.attachmentId} style={styles.attachment}>
                  <Feather name="paperclip" size={14} color={Colors.primary} />
                  <Text style={styles.attachmentName} numberOfLines={1}>
                    {a.fileName}
                  </Text>
                </View>
              ))}
            </Card>
          ) : null}

          {replyOpen ? (
            <Card>
              <Text style={styles.sectionTitle}>답장 · {mail.senderName}</Text>
              <TextField
                value={reply}
                onChangeText={setReply}
                multiline
                autoFocus
                placeholder="답장 내용을 입력하세요"
                style={{ marginTop: 10 }}
              />
            </Card>
          ) : null}
        </ScrollView>

        <View style={styles.actionBar}>
          {isDraft ? (
            <Button title="발송하기" icon="send" style={{ flex: 1 }} loading={busy} onPress={handleSendDraft} />
          ) : replyOpen ? (
            <>
              <Button title="취소" variant="secondary" style={{ flex: 1 }} onPress={() => setReplyOpen(false)} />
              <Button title="답장 보내기" icon="send" style={{ flex: 2 }} loading={busy} onPress={handleReply} />
            </>
          ) : !isMine ? (
            <Button title="답장" icon="corner-up-left" style={{ flex: 1 }} onPress={() => setReplyOpen(true)} />
          ) : (
            <Button
              title="새 메일 쓰기"
              icon="edit-3"
              variant="ghost"
              style={{ flex: 1 }}
              onPress={() => router.push('/mail/compose')}
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.xl },
  title: { fontSize: 19, fontWeight: '800', color: Colors.text, lineHeight: 26 },
  senderRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  senderName: { fontSize: 15, fontWeight: '700', color: Colors.text },
  empNo: { fontSize: 12, fontWeight: '400', color: Colors.textSubtle },
  date: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  recipients: { flexDirection: 'row', gap: 10, marginTop: 14 },
  recipientLabel: { fontSize: 12, color: Colors.textMuted, paddingTop: 5 },
  chips: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.surfaceMuted,
    borderRadius: Radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chipText: { fontSize: 12, color: Colors.text, fontWeight: '500' },
  more: { fontSize: 12, color: Colors.primary, fontWeight: '600' },
  body: { fontSize: 15, color: Colors.text, lineHeight: 24 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: Colors.text },
  attachment: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  attachmentName: { flex: 1, fontSize: 14, color: Colors.text },
  actionBar: {
    flexDirection: 'row',
    gap: 10,
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
});
