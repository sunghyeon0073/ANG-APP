import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  addApprovalComment,
  approveApprovalDoc,
  getApprovalComments,
  getApprovalDoc,
  parseFormData,
  rejectApprovalDoc,
} from '@/api/approval';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Divider,
  ErrorBanner,
  Header,
  IconButton,
  InfoRow,
  Loading,
  Screen,
  SectionHeader,
  TextField,
} from '@/components/ui';
import { APPROVAL_STATUS, LINE_STATUS, LINE_TYPE } from '@/constants/meta';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth';
import { useAsync } from '@/hooks/use-async';
import { Alert } from '@/lib/alert';
import { errorMessage } from '@/lib/api';
import { formatDate, formatDateTime, stripHtml } from '@/lib/format';

/** 웹 기안 양식(formData) 필드 라벨 */
const FORM_FIELDS: { key: string; label: string; multiline?: boolean }[] = [
  { key: 'department', label: '기안부서' },
  { key: 'requester', label: '기안자' },
  { key: 'purpose', label: '목적' },
  { key: 'summary', label: '요약' },
  { key: 'budget', label: '예산' },
  { key: 'targetDate', label: '시행일자' },
  { key: 'content', label: '내용', multiline: true },
  { key: 'notes', label: '비고', multiline: true },
  { key: 'raw', label: '내용', multiline: true },
];

type ActionType = 'approve' | 'reject';

export default function ApprovalDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [action, setAction] = useState<ActionType | null>(null);
  const [comment, setComment] = useState('');
  const [sendingComment, setSendingComment] = useState(false);

  const { data, loading, refreshing, refresh, reload, error } = useAsync(async () => {
    const [doc, comments] = await Promise.all([getApprovalDoc(id), getApprovalComments(id).catch(() => [])]);
    return { doc, comments };
  }, [id]);

  const doc = data?.doc;
  const lines = useMemo(
    () => [...(doc?.approvalLines ?? [])].sort((a, b) => (a.lineOrder ?? 0) - (b.lineOrder ?? 0)),
    [doc],
  );
  const form = useMemo(() => parseFormData(doc?.formData), [doc]);

  const activeLine = lines.find(
    (l) => l.status === 'ACTIVE' && (l.approverId === user?.id || l.delegateeId === user?.id),
  );
  const canAct = doc?.status === 'IN_PROGRESS' && Boolean(activeLine);

  const submitComment = async () => {
    if (!comment.trim()) return;
    setSendingComment(true);
    try {
      await addApprovalComment(id, comment.trim());
      setComment('');
      reload();
    } catch (e) {
      Alert.alert('댓글 등록 실패', errorMessage(e));
    } finally {
      setSendingComment(false);
    }
  };

  if (loading) {
    return (
      <Screen>
        <Header title="전자결재 상세" back />
        <Loading label="문서를 불러오는 중입니다." />
      </Screen>
    );
  }

  if (!doc) {
    return (
      <Screen>
        <Header title="전자결재 상세" back />
        <ErrorBanner message={error || '문서를 찾을 수 없습니다.'} onRetry={refresh} />
      </Screen>
    );
  }

  const status = APPROVAL_STATUS[doc.status] ?? { label: doc.status, color: Colors.textMuted };
  const opinions = lines.filter((l) => l.comment);

  return (
    <Screen edges={['top', 'bottom']}>
      <Header title="전자결재 상세" subtitle={`문서번호 ${doc.id}`} back />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Colors.primary} />}>
          {/* 문서 요약 */}
          <Card>
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 10 }}>
              <Badge label={status.label} color={status.color} />
              {doc.templateTitle ? <Badge label={doc.templateTitle} color={Colors.textMuted} /> : null}
            </View>
            <Text style={styles.docTitle}>{doc.title}</Text>
            <Divider style={{ marginVertical: 12 }} />
            <InfoRow label="기안자" value={[doc.drafterName, doc.drafterPosition].filter(Boolean).join(' ')} />
            <InfoRow label="기안일" value={formatDateTime(doc.createdAt)} />
            {doc.completedAt ? <InfoRow label="완료일" value={formatDateTime(doc.completedAt)} /> : null}
            <InfoRow label="보안등급" value={doc.securityLevel || '일반문서'} />
            <InfoRow label="보존기간" value={doc.retentionPeriod || '-'} />
          </Card>

          {/* 결재선 */}
          <Card>
            <SectionHeader title="결재선" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {lines.map((l, i) => {
                const ls = LINE_STATUS[l.status] ?? { label: l.status, color: Colors.textMuted };
                const stamped = l.status === 'APPROVED' || l.status === 'REJECTED' || l.status === 'DELEGATED';
                return (
                  <View key={l.id ?? i} style={[styles.lineBox, l.status === 'ACTIVE' && styles.lineBoxActive]}>
                    <Text style={styles.lineType}>{LINE_TYPE[l.lineType] ?? l.lineType}</Text>
                    <Text style={styles.linePosition}>{l.approverPosition || '-'}</Text>
                    <View style={[styles.stamp, stamped && { borderColor: ls.color }]}>
                      {stamped ? (
                        <Text style={[styles.stampText, { color: ls.color }]}>{ls.label}</Text>
                      ) : (
                        <Text style={[styles.stampIdle, { color: ls.color }]}>{ls.label}</Text>
                      )}
                    </View>
                    <Text style={styles.lineName} numberOfLines={1}>
                      {l.approverName}
                    </Text>
                    {l.delegateeName ? <Text style={styles.lineDate}>대리: {l.delegateeName}</Text> : null}
                    <Text style={styles.lineDate}>{l.processedAt ? formatDate(l.processedAt).slice(5) : '-'}</Text>
                  </View>
                );
              })}
            </ScrollView>
          </Card>

          {/* 본문 */}
          <Card>
            <SectionHeader title="기안 내용" />
            {FORM_FIELDS.filter((f) => form[f.key] && !(f.key === 'raw' && form.content)).map((f) =>
              f.multiline ? (
                <View key={f.key} style={{ marginTop: 6 }}>
                  <Text style={styles.fieldLabel}>{f.label}</Text>
                  <View style={styles.fieldBody}>
                    <Text style={styles.fieldBodyText}>{stripHtml(String(form[f.key]))}</Text>
                  </View>
                </View>
              ) : (
                <InfoRow key={f.key} label={f.label} value={String(form[f.key])} />
              ),
            )}
            {FORM_FIELDS.every((f) => !form[f.key]) ? <Text style={styles.muted}>입력된 본문이 없습니다.</Text> : null}
          </Card>

          {/* 첨부 */}
          {doc.attachments?.length ? (
            <Card>
              <SectionHeader title={`첨부파일 ${doc.attachments.length}`} />
              {doc.attachments.map((a) => (
                <View key={a.id} style={styles.attachment}>
                  <Feather name="paperclip" size={14} color={Colors.primary} />
                  <Text style={styles.attachmentName} numberOfLines={1}>
                    {a.fileName}
                  </Text>
                </View>
              ))}
            </Card>
          ) : null}

          {/* 결재 의견 */}
          {opinions.length ? (
            <Card>
              <SectionHeader title="결재 의견" />
              {opinions.map((l) => (
                <View key={`op-${l.id}`} style={styles.opinion}>
                  <Text style={styles.opinionRole}>
                    {LINE_TYPE[l.lineType] ?? l.lineType} / {l.approverName}
                  </Text>
                  <Text style={styles.opinionText}>{l.comment}</Text>
                  <Text style={styles.lineDate}>{formatDateTime(l.processedAt)}</Text>
                </View>
              ))}
            </Card>
          ) : null}

          {/* 댓글 */}
          <Card>
            <SectionHeader title={`댓글 ${data?.comments.length ?? 0}`} />
            {data?.comments.map((c) => (
              <View key={c.id} style={styles.comment}>
                <Avatar name={c.authorName} size={30} />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                    <Text style={styles.commentAuthor}>{c.authorName}</Text>
                    <Text style={styles.lineDate}>{formatDateTime(c.createdAt)}</Text>
                  </View>
                  <Text style={styles.commentText}>{c.content}</Text>
                </View>
              </View>
            ))}
            <View style={styles.commentInput}>
              <TextInput
                value={comment}
                onChangeText={setComment}
                placeholder="댓글을 입력하세요"
                placeholderTextColor={Colors.textSubtle}
                style={styles.commentField}
                multiline
              />
              <IconButton
                name="send"
                color={comment.trim() ? Colors.primary : Colors.textSubtle}
                onPress={submitComment}
                style={{ opacity: sendingComment ? 0.5 : 1 }}
              />
            </View>
          </Card>
        </ScrollView>

        {canAct ? (
          <View style={styles.actionBar}>
            <Button title="반려" variant="secondary" icon="x" style={{ flex: 1 }} onPress={() => setAction('reject')} />
            <Button title="승인" icon="check" style={{ flex: 2 }} onPress={() => setAction('approve')} />
          </View>
        ) : null}
      </KeyboardAvoidingView>

      <ActionSheet
        type={action}
        docId={doc.id}
        onClose={() => setAction(null)}
        onDone={() => {
          setAction(null);
          reload();
        }}
      />
    </Screen>
  );
}

function ActionSheet({
  type,
  docId,
  onClose,
  onDone,
}: {
  type: ActionType | null;
  docId: number;
  onClose: () => void;
  onDone: () => void;
}) {
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const isReject = type === 'reject';

  const submit = async () => {
    if (isReject && !text.trim()) {
      Alert.alert('반려 사유', '반려 사유를 입력해주세요.');
      return;
    }
    setSubmitting(true);
    try {
      if (isReject) await rejectApprovalDoc(docId, text.trim());
      else await approveApprovalDoc(docId, text.trim());
      setText('');
      Alert.alert(isReject ? '반려 완료' : '승인 완료', isReject ? '문서를 반려했습니다.' : '결재를 승인했습니다.');
      onDone();
    } catch (e) {
      Alert.alert('처리 실패', errorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={type !== null} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <SafeAreaView edges={['bottom']} style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>{isReject ? '반려하기' : '승인하기'}</Text>
          <Text style={styles.muted}>
            {isReject ? '반려 사유는 기안자에게 전달됩니다.' : '결재 의견을 남길 수 있습니다. (선택)'}
          </Text>
          <TextField
            value={text}
            onChangeText={setText}
            placeholder={isReject ? '반려 사유를 입력하세요' : '결재 의견 (선택)'}
            multiline
            style={{ marginVertical: 16 }}
            inputStyle={{ minHeight: 100 }}
          />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button title="취소" variant="secondary" style={{ flex: 1 }} onPress={onClose} />
            <Button
              title={isReject ? '반려' : '승인'}
              variant={isReject ? 'danger' : 'primary'}
              style={{ flex: 2 }}
              loading={submitting}
              onPress={submit}
            />
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.xl },
  docTitle: { fontSize: 19, fontWeight: '800', color: Colors.text, lineHeight: 26 },
  lineBox: {
    width: 86,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceMuted,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 4,
  },
  lineBoxActive: { borderColor: Colors.primary, backgroundColor: Colors.primarySoft },
  lineType: { fontSize: 11, fontWeight: '700', color: Colors.primary },
  linePosition: { fontSize: 11, color: Colors.textMuted },
  stamp: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
  },
  stampText: { fontSize: 12, fontWeight: '800', transform: [{ rotate: '-12deg' }] },
  stampIdle: { fontSize: 12, fontWeight: '600' },
  lineName: { fontSize: 13, fontWeight: '700', color: Colors.text },
  lineDate: { fontSize: 11, color: Colors.textSubtle },
  fieldLabel: { fontSize: 13, color: Colors.textMuted, marginBottom: 6 },
  fieldBody: { backgroundColor: Colors.surfaceMuted, borderRadius: Radius.md, padding: Spacing.sm },
  fieldBodyText: { fontSize: 14, color: Colors.text, lineHeight: 21 },
  muted: { fontSize: 13, color: Colors.textMuted },
  attachment: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  attachmentName: { flex: 1, fontSize: 14, color: Colors.text },
  opinion: { paddingVertical: 8, gap: 4, borderBottomWidth: 1, borderBottomColor: Colors.border },
  opinionRole: { fontSize: 12, fontWeight: '700', color: Colors.primary },
  opinionText: { fontSize: 14, color: Colors.text },
  comment: { flexDirection: 'row', gap: 10, paddingVertical: 8 },
  commentAuthor: { fontSize: 13, fontWeight: '700', color: Colors.text },
  commentText: { fontSize: 14, color: Colors.text, marginTop: 2 },
  commentInput: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: Colors.inputBg,
    borderRadius: Radius.lg,
    paddingLeft: 14,
  },
  commentField: { flex: 1, fontSize: 14, color: Colors.text, paddingVertical: 10, maxHeight: 100 },
  actionBar: {
    flexDirection: 'row',
    gap: 10,
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15,35,52,0.35)' },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.lg,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.borderStrong,
    marginBottom: 16,
  },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: Colors.text, marginBottom: 4 },
});
