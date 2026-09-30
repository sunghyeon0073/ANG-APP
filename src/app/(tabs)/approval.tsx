import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { getApprovalFolders, type ApprovalBoxItem, type ApprovalFolder } from '@/api/approval';
import { Badge, EmptyState, ErrorBanner, Header, Loading, PillTabs, Screen, TextField } from '@/components/ui';
import { APPROVAL_FOLDERS, APPROVAL_STATUS } from '@/constants/meta';
import { Colors, Radius, Shadow, Spacing } from '@/constants/theme';
import { useAsync } from '@/hooks/use-async';
import { formatDate } from '@/lib/format';

export default function ApprovalListScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ folder?: ApprovalFolder }>();
  const [folder, setFolder] = useState<ApprovalFolder>(params.folder ?? 'waiting');
  const [keyword, setKeyword] = useState('');

  useEffect(() => {
    if (params.folder) setFolder(params.folder);
  }, [params.folder]);

  const { data, loading, refreshing, refresh, error } = useAsync(getApprovalFolders, [], { refetchOnFocus: true });

  const meta = APPROVAL_FOLDERS.find((f) => f.key === folder)!;
  const items = useMemo(() => {
    const list = data?.[folder] ?? [];
    const k = keyword.trim().toLowerCase();
    if (!k) return list;
    return list.filter((d) => [d.title, d.drafterName, String(d.id)].some((v) => v?.toLowerCase().includes(k)));
  }, [data, folder, keyword]);

  return (
    <Screen>
      <Header title="전자결재" subtitle={meta.hint} />
      <PillTabs
        items={APPROVAL_FOLDERS.map((f) => ({ key: f.key, label: f.label, count: data?.[f.key]?.length }))}
        value={folder}
        onChange={setFolder}
      />
      <TextField
        icon="search"
        placeholder="제목, 기안자, 문서번호 검색"
        value={keyword}
        onChangeText={setKeyword}
        style={{ paddingHorizontal: Spacing.md, marginBottom: 6 }}
        inputStyle={{ paddingVertical: 10 }}
      />
      {error ? <ErrorBanner message={error} onRetry={refresh} /> : null}
      {loading ? (
        <Loading label="전자결재 문서를 불러오는 중입니다." />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={items.length ? styles.list : { flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Colors.primary} />}
          ListEmptyComponent={
            <EmptyState icon={meta.icon} title={`${meta.label} 문서가 없습니다.`} description={meta.hint} />
          }
          renderItem={({ item }) => (
            <ApprovalRow item={item} accent={meta.color} onPress={() => router.push(`/approval/${item.id}`)} />
          )}
        />
      )}
    </Screen>
  );
}

function ApprovalRow({ item, accent, onPress }: { item: ApprovalBoxItem; accent: string; onPress: () => void }) {
  const status = APPROVAL_STATUS[item.status] ?? { label: item.status, color: Colors.textMuted };
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}>
      <View style={[styles.accent, { backgroundColor: accent }]} />
      <View style={{ flex: 1, gap: 6 }}>
        <View style={styles.rowTop}>
          <Text style={styles.docNo}>No. {item.id}</Text>
          <Badge label={status.label} color={status.color} />
        </View>
        <Text style={styles.title} numberOfLines={2}>
          {item.title || '(제목 없음)'}
        </Text>
        <View style={styles.metaRow}>
          <Feather name="user" size={12} color={Colors.textMuted} />
          <Text style={styles.meta}>{item.drafterName}</Text>
          <Feather name="calendar" size={12} color={Colors.textMuted} style={{ marginLeft: 8 }} />
          <Text style={styles.meta}>{formatDate(item.createdAt)}</Text>
          {item.completedAt ? <Text style={styles.meta}> → {formatDate(item.completedAt)}</Text> : null}
        </View>
      </View>
      <Feather name="chevron-right" size={18} color={Colors.textSubtle} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  list: { padding: Spacing.md, gap: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    paddingLeft: Spacing.md + 4,
    overflow: 'hidden',
    ...Shadow.sm,
  },
  accent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  docNo: { fontSize: 12, color: Colors.textSubtle, fontWeight: '600' },
  title: { fontSize: 15, fontWeight: '700', color: Colors.text },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  meta: { fontSize: 12, color: Colors.textMuted },
});
