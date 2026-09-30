import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { getBoardPosts, incrementBoardViews } from '@/api/misc';
import { Avatar, Badge, Card, Divider, ErrorBanner, Header, Loading, Screen } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { useAsync } from '@/hooks/use-async';
import { formatDateTime, formatFileSize, stripHtml } from '@/lib/format';

export default function NoticeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  // 게시판 API 에 단건 조회가 없어 목록에서 찾는다
  const { data: post, loading, error, refresh } = useAsync(
    () => getBoardPosts().then((list) => list.find((p) => String(p.id) === id) ?? null),
    [id],
  );

  useEffect(() => {
    if (id) incrementBoardViews(Number(id)).catch(() => {});
  }, [id]);

  return (
    <Screen>
      <Header title="공지사항" back />
      {loading ? (
        <Loading />
      ) : !post ? (
        <ErrorBanner message={error || '게시글을 찾을 수 없습니다.'} onRetry={refresh} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Card>
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 8 }}>
              {post.pinned ? <Badge label="필독" color={Colors.danger} /> : null}
              <Badge label={post.type === 'NOTICE' ? '공지' : '자유'} color={Colors.primary} />
            </View>
            <Text style={styles.title}>{post.title}</Text>
            <View style={styles.author}>
              <Avatar name={post.author} size={34} />
              <View style={{ flex: 1 }}>
                <Text style={styles.authorName}>{post.author}</Text>
                <Text style={styles.meta}>{formatDateTime(post.createdAt)}</Text>
              </View>
              <Feather name="eye" size={13} color={Colors.textSubtle} />
              <Text style={styles.meta}>{post.views + 1}</Text>
            </View>
            <Divider style={{ marginVertical: 16 }} />
            <Text style={styles.body} selectable>
              {stripHtml(post.content) || '내용 없음'}
            </Text>
          </Card>
          {post.attachments?.length ? (
            <Card>
              <Text style={styles.section}>첨부파일 {post.attachments.length}</Text>
              {post.attachments.map((a) => (
                <View key={a.attachmentId} style={styles.attachment}>
                  <Feather name="paperclip" size={14} color={Colors.primary} />
                  <Text style={styles.attachmentName} numberOfLines={1}>
                    {a.fileName}
                  </Text>
                  <Text style={styles.meta}>{formatFileSize(a.fileSize)}</Text>
                </View>
              ))}
            </Card>
          ) : null}
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.xl },
  title: { fontSize: 20, fontWeight: '800', color: Colors.text, lineHeight: 28 },
  author: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 },
  authorName: { fontSize: 14, fontWeight: '600', color: Colors.text },
  meta: { fontSize: 12, color: Colors.textSubtle },
  body: { fontSize: 15, color: Colors.text, lineHeight: 25 },
  section: { fontSize: 14, fontWeight: '700', color: Colors.text },
  attachment: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  attachmentName: { flex: 1, fontSize: 14, color: Colors.text },
});
