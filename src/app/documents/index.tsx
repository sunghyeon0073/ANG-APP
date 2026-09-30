import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { getDocuments, toggleDocumentFavorite, type DocumentBox, type DocumentItem } from '@/api/misc';
import { FileIcon } from '@/components/file-icon';
import { Badge, EmptyState, ErrorBanner, Header, Loading, PillTabs, Screen, TextField } from '@/components/ui';
import { DOC_STATUS } from '@/constants/meta';
import { Colors, Radius, Shadow, Spacing } from '@/constants/theme';
import { useAsync } from '@/hooks/use-async';
import { formatDate, formatFileSize } from '@/lib/format';

const BOXES: { key: DocumentBox; label: string; empty: string }[] = [
  { key: 'my', label: '내 문서', empty: '작성한 문서가 없습니다.' },
  { key: 'department', label: '부서 문서', empty: '부서에 공유된 문서가 없습니다.' },
  { key: 'favorites', label: '즐겨찾기', empty: '즐겨찾기한 문서가 없습니다.' },
];

export default function DocumentListScreen() {
  const router = useRouter();
  const [box, setBox] = useState<DocumentBox>('my');
  const [input, setInput] = useState('');
  const [keyword, setKeyword] = useState('');

  // 입력이 멈추면 서버 검색
  useEffect(() => {
    const t = setTimeout(() => setKeyword(input.trim()), 350);
    return () => clearTimeout(t);
  }, [input]);

  const { data, setData, loading, refreshing, refresh, reload, error } = useAsync(
    () => getDocuments(box, keyword || undefined),
    [box, keyword],
    { refetchOnFocus: true },
  );

  const toggleFavorite = async (doc: DocumentItem) => {
    setData((prev) => prev?.map((d) => (d.docId === doc.docId ? { ...d, isFavorite: !d.isFavorite } : d)));
    try {
      await toggleDocumentFavorite(doc.docId);
      if (box === 'favorites') reload();
    } catch {
      reload();
    }
  };

  const meta = BOXES.find((b) => b.key === box)!;

  return (
    <Screen>
      <Header title="문서함" back />
      <PillTabs items={BOXES.map((b) => ({ key: b.key, label: b.label }))} value={box} onChange={setBox} />
      <TextField
        icon="search"
        placeholder="문서 제목 검색"
        value={input}
        onChangeText={setInput}
        style={{ paddingHorizontal: Spacing.md, marginBottom: 6 }}
        inputStyle={{ paddingVertical: 10 }}
      />
      {error ? <ErrorBanner message={error} onRetry={refresh} /> : null}
      {loading ? (
        <Loading />
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(d) => String(d.docId)}
          contentContainerStyle={data?.length ? styles.list : { flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Colors.primary} />}
          ListEmptyComponent={<EmptyState icon="folder" title={keyword ? '검색 결과가 없습니다.' : meta.empty} />}
          renderItem={({ item }) => {
            const status = item.status ? DOC_STATUS[item.status] : null;
            return (
              <Pressable
                onPress={() => router.push(`/documents/${item.docId}`)}
                style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}>
                <FileIcon name={item.originalFileName} contentType={item.fileContentType} />
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={styles.title} numberOfLines={1}>
                    {item.title || item.originalFileName || '제목 없음'}
                  </Text>
                  <View style={styles.metaRow}>
                    {status ? <Badge label={status.label} color={status.color} /> : null}
                    <Text style={styles.meta} numberOfLines={1}>
                      {[
                        item.scopeName && item.scopeName !== 'N/A' ? item.scopeName : '개인 문서',
                        item.ownerName,
                        formatDate(item.createdAt),
                        formatFileSize(item.fileSize),
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </Text>
                  </View>
                </View>
                <Pressable onPress={() => toggleFavorite(item)} hitSlop={10} style={{ padding: 4 }}>
                  <Feather name="star" size={18} color={item.isFavorite ? Colors.pending : Colors.borderStrong} />
                </Pressable>
              </Pressable>
            );
          }}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { padding: Spacing.md, paddingTop: 6, gap: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.sm,
    paddingLeft: Spacing.md,
    ...Shadow.sm,
  },
  title: { fontSize: 15, fontWeight: '700', color: Colors.text },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  meta: { flex: 1, fontSize: 12, color: Colors.textMuted },
});
