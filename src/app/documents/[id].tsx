import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getDocument, getDocumentOriginalContent, toggleDocumentFavorite } from '@/api/misc';
import { FileIcon } from '@/components/file-icon';
import { Badge, Button, Card, ErrorBanner, Header, IconButton, InfoRow, Loading, Screen, SectionHeader } from '@/components/ui';
import { DOC_STATUS } from '@/constants/meta';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useAsync } from '@/hooks/use-async';
import { formatDateTime, formatFileSize, stripHtml } from '@/lib/format';

const PREVIEW_LIMIT = 3000;

export default function DocumentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [expanded, setExpanded] = useState(false);

  const { data, setData, loading, refreshing, refresh, error } = useAsync(async () => {
    const doc = await getDocument(id);
    let content = doc.originalContent ?? null;
    if (!content) content = await getDocumentOriginalContent(id).catch(() => null);
    return { doc, content: stripHtml(content) };
  }, [id]);

  if (loading) {
    return (
      <Screen>
        <Header title="문서 상세" back />
        <Loading label="문서를 불러오는 중입니다." />
      </Screen>
    );
  }
  if (!data) {
    return (
      <Screen>
        <Header title="문서 상세" back />
        <ErrorBanner message={error || '문서를 찾을 수 없습니다.'} onRetry={refresh} />
      </Screen>
    );
  }

  const { doc, content } = data;
  const status = doc.status ? DOC_STATUS[doc.status] : null;
  const long = content.length > PREVIEW_LIMIT;

  const toggleFavorite = async () => {
    setData((prev) => prev && { ...prev, doc: { ...prev.doc, isFavorite: !prev.doc.isFavorite } });
    try {
      await toggleDocumentFavorite(doc.docId);
    } catch {
      refresh();
    }
  };

  return (
    <Screen>
      <Header
        title="문서 상세"
        back
        right={
          <IconButton
            name="star"
            color={doc.isFavorite ? Colors.pending : Colors.textMuted}
            onPress={toggleFavorite}
          />
        }
      />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Colors.primary} />}>
        <Card style={styles.head}>
          <FileIcon name={doc.originalFileName} contentType={doc.fileContentType} size={56} />
          <View style={{ flex: 1, gap: 6 }}>
            {status ? <Badge label={status.label} color={status.color} /> : null}
            <Text style={styles.title}>{doc.title || doc.originalFileName || '제목 없음'}</Text>
          </View>
        </Card>

        <Card>
          <InfoRow label="파일명" value={doc.originalFileName || '-'} />
          <InfoRow label="작성자" value={doc.ownerName || '-'} />
          <InfoRow label="위치" value={doc.scopeName && doc.scopeName !== 'N/A' ? doc.scopeName : '개인 문서'} />
          <InfoRow label="크기" value={formatFileSize(doc.fileSize) || '-'} />
          <InfoRow label="생성일" value={formatDateTime(doc.createdAt)} />
        </Card>

        {doc.aiSummary ? (
          <View style={styles.aiCard}>
            <View style={styles.aiHead}>
              <View style={styles.aiIcon}>
                <Feather name="cpu" size={14} color={Colors.white} />
              </View>
              <Text style={styles.aiTitle}>AI 요약</Text>
            </View>
            <Text style={styles.aiText}>{stripHtml(doc.aiSummary)}</Text>
          </View>
        ) : null}

        <Card>
          <SectionHeader title="문서 내용" />
          {content ? (
            <>
              <Text style={styles.body} selectable>
                {expanded || !long ? content : `${content.slice(0, PREVIEW_LIMIT)}…`}
              </Text>
              {long ? (
                <Button
                  title={expanded ? '접기' : '전체 보기'}
                  variant="ghost"
                  small
                  style={{ marginTop: 12, alignSelf: 'center' }}
                  onPress={() => setExpanded((v) => !v)}
                />
              ) : null}
            </>
          ) : (
            <Text style={styles.muted}>
              텍스트로 표시할 수 없는 문서입니다. 원본 파일은 웹 포털의 문서함에서 확인해주세요.
            </Text>
          )}
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.xl },
  head: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  title: { fontSize: 18, fontWeight: '800', color: Colors.text, lineHeight: 24 },
  aiCard: {
    borderRadius: Radius.lg,
    padding: Spacing.md,
    backgroundColor: 'rgba(99,102,241,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.2)',
    gap: 10,
  },
  aiHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  aiIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.mine,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiTitle: { fontSize: 14, fontWeight: '700', color: Colors.mine },
  aiText: { fontSize: 14, color: Colors.text, lineHeight: 22 },
  body: { fontSize: 14, color: Colors.text, lineHeight: 23 },
  muted: { fontSize: 13, color: Colors.textMuted, lineHeight: 20 },
});
