import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { UserSummary } from '@/api/chat';
import { getMailDetail, mailFilePath, saveDraftWithFiles, sendDraftMail, type MailDetail } from '@/api/mail';
import { Button, Card, Header, Loading, Screen, TextField } from '@/components/ui';
import { UserSearch } from '@/components/user-search';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { errorMessage } from '@/lib/api';
import { pickFiles, showFileActions, type PickedFile } from '@/lib/files';
import { formatFileSize } from '@/lib/format';

/** 새 메일 / 임시보관 메일 이어쓰기(draftId) */
export default function MailComposeScreen() {
  const { draftId: draftIdParam } = useLocalSearchParams<{ draftId?: string }>();
  const router = useRouter();
  const [draftId, setDraftId] = useState<number | null>(draftIdParam ? Number(draftIdParam) : null);
  const [loading, setLoading] = useState(Boolean(draftIdParam));
  const [recipients, setRecipients] = useState<UserSummary[]>([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [savedFiles, setSavedFiles] = useState<MailDetail['attachments']>([]);
  const [pendingFiles, setPendingFiles] = useState<PickedFile[]>([]);
  const [picking, setPicking] = useState(!draftIdParam);
  const [busy, setBusy] = useState<'send' | 'draft' | null>(null);

  // 이어쓰기: 저장된 초안을 불러와 채운다
  useEffect(() => {
    if (!draftIdParam) return;
    getMailDetail(draftIdParam)
      .then((d) => {
        setTitle(d.title || '');
        setBody(d.body || '');
        setRecipients(d.recipients.map((r) => ({ empNo: r.recipientEmpNo, name: r.recipientName })));
        setSavedFiles(d.attachments ?? []);
      })
      .catch((e) => Alert.alert('불러오기 실패', errorMessage(e)))
      .finally(() => setLoading(false));
  }, [draftIdParam]);

  const toggleRecipient = (u: UserSummary) =>
    setRecipients((prev) => (prev.some((p) => p.empNo === u.empNo) ? prev.filter((p) => p.empNo !== u.empNo) : [...prev, u]));

  const handleAttach = async () => {
    try {
      const files = await pickFiles(true);
      if (files.length) setPendingFiles((prev) => [...prev, ...files]);
    } catch (e) {
      Alert.alert('파일 선택 실패', errorMessage(e));
    }
  };

  const payload = () => ({ title: title.trim(), body, recipientEmpNos: recipients.map((r) => r.empNo) });

  /** 저장 + 업로드. 실패한 첨부만 남기고, 하나라도 실패하면 false */
  const save = async () => {
    const { mailId, failedFiles } = await saveDraftWithFiles(payload(), pendingFiles, draftId);
    setDraftId(mailId);
    setPendingFiles(failedFiles);
    if (failedFiles.length) {
      Alert.alert('첨부 업로드 실패', `첨부파일 ${failedFiles.length}개를 올리지 못했습니다. 다시 시도해주세요.`);
    }
    return { mailId, ok: failedFiles.length === 0 };
  };

  const handleSaveDraft = async () => {
    if (!title.trim() && !body.trim() && !recipients.length && !pendingFiles.length) {
      return Alert.alert('임시저장', '임시저장할 내용을 입력해주세요.');
    }
    setBusy('draft');
    try {
      const { ok } = await save();
      if (ok) {
        Alert.alert('임시저장', '임시보관함에 저장했습니다.');
        router.back();
      }
    } catch (e) {
      Alert.alert('임시저장 실패', errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const handleSend = async () => {
    if (!recipients.length) return Alert.alert('받는 사람', '받는 사람을 한 명 이상 선택해주세요.');
    if (!title.trim()) return Alert.alert('제목', '제목을 입력해주세요.');
    setBusy('send');
    try {
      const { mailId, ok } = await save();
      if (!ok) return;
      await sendDraftMail(mailId);
      Alert.alert('발송 완료', '메일을 발송했습니다.');
      router.back();
    } catch (e) {
      Alert.alert('발송 실패', errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <Screen>
        <Header title="메일 이어쓰기" back />
        <Loading />
      </Screen>
    );
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <Header
        title={draftId ? '메일 이어쓰기' : '메일 쓰기'}
        back
        right={
          <>
            <Button
              title="임시저장"
              variant="secondary"
              small
              loading={busy === 'draft'}
              disabled={busy === 'send'}
              onPress={handleSaveDraft}
            />
            <Button
              title="보내기"
              icon="send"
              small
              loading={busy === 'send'}
              disabled={busy === 'draft'}
              onPress={handleSend}
            />
          </>
        }
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

          <Card>
            <View style={styles.labelRow}>
              <Text style={styles.label}>첨부파일 {savedFiles.length + pendingFiles.length || ''}</Text>
              <Pressable onPress={handleAttach} hitSlop={8}>
                <Text style={styles.link}>
                  <Feather name="paperclip" size={13} /> 파일 추가
                </Text>
              </Pressable>
            </View>
            {savedFiles.map((a) => (
              <Pressable key={`saved-${a.attachmentId}`} style={styles.file} onPress={() => showFileActions(mailFilePath(a.attachmentId), a.fileName)}>
                <Feather name="paperclip" size={14} color={Colors.primary} />
                <Text style={styles.fileName} numberOfLines={1}>
                  {a.fileName}
                </Text>
                <Text style={styles.fileMeta}>저장됨</Text>
              </Pressable>
            ))}
            {pendingFiles.map((f, i) => (
              <View key={`${f.uri}-${i}`} style={styles.file}>
                <Feather name="file-plus" size={14} color={Colors.textMuted} />
                <Text style={styles.fileName} numberOfLines={1}>
                  {f.name}
                </Text>
                <Text style={styles.fileMeta}>{formatFileSize(f.size)}</Text>
                <Pressable onPress={() => setPendingFiles((prev) => prev.filter((_, j) => j !== i))} hitSlop={8}>
                  <Feather name="x" size={16} color={Colors.textMuted} />
                </Pressable>
              </View>
            ))}
            {!savedFiles.length && !pendingFiles.length ? <Text style={styles.placeholder}>첨부된 파일이 없습니다.</Text> : null}
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
  file: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  fileName: { flex: 1, fontSize: 14, color: Colors.text },
  fileMeta: { fontSize: 12, color: Colors.textSubtle },
});
