import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { getBoardPosts, type BoardPost } from '@/api/misc';
import { Badge, EmptyState, ErrorBanner, Header, Loading, Screen, TextField } from '@/components/ui';
import { Colors, Radius, Shadow, Spacing } from '@/constants/theme';
import { useAsync } from '@/hooks/use-async';
import { formatDate, stripHtml } from '@/lib/format';

export default function NoticeListScreen() {
  const router = useRouter();
  const [keyword, setKeyword] = useState('');
  const { data, loading, refreshing, refresh, error } = useAsync(() => getBoardPosts('NOTICE'), [], {
    refetchOnFocus: true,
  });

  const posts = useMemo(() => {
    const k = keyword.trim().toLowerCase();
    return (data ?? []).filter((p) => !k || p.title.toLowerCase().includes(k) || p.author?.toLowerCase().includes(k));
  }, [data, keyword]);

  return (
    <Screen>
      <Header title="공지사항" subtitle={data ? `전체 ${data.length}건` : undefined} back />
      <TextField
        icon="search"
        placeholder="제목, 작성자 검색"
        value={keyword}
        onChangeText={setKeyword}
        style={{ padding: Spacing.md, paddingBottom: 0 }}
        inputStyle={{ paddingVertical: 10 }}
      />
      {error ? <ErrorBanner message={error} onRetry={refresh} /> : null}
      {loading ? (
        <Loading />
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(p) => String(p.id)}
          contentContainerStyle={posts.length ? styles.list : { flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Colors.primary} />}
          ListEmptyComponent={<EmptyState icon="clipboard" title="등록된 공지사항이 없습니다." />}
          renderItem={({ item }) => <NoticeRow post={item} onPress={() => router.push(`/notices/${item.id}`)} />}
        />
      )}
    </Screen>
  );
}

function NoticeRow({ post, onPress }: { post: BoardPost; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, post.pinned && styles.pinned, pressed && { opacity: 0.85 }]}>
      <View style={styles.top}>
        {post.pinned ? <Badge label="필독" color={Colors.danger} /> : <Badge label="공지" color={Colors.primary} />}
        {post.attachments?.length ? <Feather name="paperclip" size={13} color={Colors.textMuted} /> : null}
      </View>
      <Text style={styles.title} numberOfLines={2}>
        {post.title}
      </Text>
      <Text style={styles.preview} numberOfLines={2}>
        {stripHtml(post.content)}
      </Text>
      <View style={styles.meta}>
        <Text style={styles.metaText}>{post.author}</Text>
        <Text style={styles.metaText}>·</Text>
        <Text style={styles.metaText}>{formatDate(post.createdAt)}</Text>
        <View style={{ flex: 1 }} />
        <Feather name="eye" size={12} color={Colors.textSubtle} />
        <Text style={styles.metaText}>{post.views}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  list: { padding: Spacing.md, gap: 10 },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md, gap: 6, ...Shadow.sm },
  pinned: { borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)' },
  top: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontSize: 15, fontWeight: '700', color: Colors.text },
  preview: { fontSize: 13, color: Colors.textMuted, lineHeight: 19 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  metaText: { fontSize: 12, color: Colors.textSubtle },
});
