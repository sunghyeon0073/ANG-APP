import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { askAiAssistant, type AiAction, type AiResultItem } from '@/api/misc';
import { Header, Screen, type IconName } from '@/components/ui';
import { Colors, Radius, Shadow, Spacing } from '@/constants/theme';
import { errorMessage } from '@/lib/api';

const MASCOT = require('@/assets/images/mascot/mascot-idle.png');

/** 웹 FloatingMascot 의 TYPE_ICONS */
const TYPE_ICONS: Record<string, IconName> = {
  schedule: 'calendar',
  mail: 'mail',
  document: 'file-text',
  file: 'folder',
  approval: 'check',
};

const SUGGESTIONS = ['오늘 일정 알려줘', '안 읽은 메일 보여줘', '결재 대기 문서 있어?', '내일 오후 3시에 팀장님께 회의 알림 채팅 예약해줘'];

type Message = {
  id: string;
  role: 'user' | 'bot';
  content: string;
  results?: AiResultItem[];
  actions?: AiAction[];
  hasMore?: boolean;
};

/** 백엔드 route / 웹 페이지 id → 앱 경로 */
const toAppRoute = (route?: string | null, targetId?: number | null): string | null => {
  if (!route) return null;
  if (route.startsWith('approval') || route.startsWith('esignature')) return targetId ? `/approval/${targetId}` : '/approval';
  if (route.startsWith('mail')) return targetId ? `/mail/${targetId}` : '/mail';
  if (route.startsWith('calendar')) return '/calendar';
  if (route.startsWith('document')) return targetId ? `/documents/${targetId}` : '/documents';
  if (route.startsWith('file')) return '/documents';
  if (route.startsWith('board')) return '/notices';
  if (route.startsWith('chat')) return '/chat';
  if (route.startsWith('home')) return '/';
  return null;
};

let seq = 0;
const nextId = () => `m${++seq}`;

export default function AssistantScreen() {
  const router = useRouter();
  const listRef = useRef<FlatList<Message>>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: nextId(), role: 'bot', content: '안녕하세요! 일정·메일·문서·결재·예약발송 뭐든 물어보세요.' },
  ]);

  const send = async (text?: string, confirm = false) => {
    const prompt = (text ?? input).trim();
    if (!prompt || loading) return;
    if (!confirm) setInput('');
    setMessages((prev) => [...prev, { id: nextId(), role: 'user', content: confirm ? '예약 확정' : prompt }]);
    setLoading(true);
    try {
      const data = await askAiAssistant(prompt, confirm);
      setMessages((prev) => [
        ...prev,
        {
          id: nextId(),
          role: 'bot',
          content: data.answer || '',
          results: data.results ?? [],
          actions: data.actions ?? [],
          hasMore: data.hasMore,
        },
      ]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { id: nextId(), role: 'bot', content: errorMessage(e, '오류가 발생했어요. 다시 시도해 주세요.') },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = (action: AiAction) => {
    if (action.actionType === 'navigate') {
      const href = toAppRoute(action.payload);
      if (href) router.push(href as never);
    } else if (action.actionType === 'confirm_send') {
      send(action.payload, true);
    }
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <Header title="ANG 비서" subtitle="AI 업무 도우미" back />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          ListHeaderComponent={
            <View style={styles.intro}>
              <Image source={MASCOT} style={styles.mascot} contentFit="contain" />
              <Text style={styles.introTitle}>무엇을 도와드릴까요?</Text>
              <Text style={styles.introSub}>일정 확인, 메일·문서·결재 검색, 메시지 예약 발송까지 대화로 처리할 수 있어요.</Text>
            </View>
          }
          ListFooterComponent={
            loading ? (
              <View style={[styles.bubble, styles.botBubble, styles.typing]}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={styles.typingText}>생각하는 중…</Text>
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <ChatBubble
              message={item}
              onAction={handleAction}
              onOpenResult={(r) => {
                const href = toAppRoute(r.route ?? r.type, r.targetId);
                if (href) router.push(href as never);
              }}
            />
          )}
        />

        {messages.length <= 1 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.suggestionBar}
            contentContainerStyle={styles.suggestions}>
            {SUGGESTIONS.map((s) => (
              <Pressable key={s} style={styles.suggestion} onPress={() => send(s)}>
                <Text style={styles.suggestionText}>{s}</Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : null}

        <View style={styles.inputBar}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="ANG 비서에게 물어보세요"
            placeholderTextColor={Colors.textSubtle}
            style={styles.input}
            multiline
            onSubmitEditing={() => send()}
          />
          <Pressable
            onPress={() => send()}
            disabled={!input.trim() || loading}
            style={[styles.sendButton, (!input.trim() || loading) && { backgroundColor: Colors.borderStrong }]}>
            <Feather name="send" size={18} color={Colors.white} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function ChatBubble({
  message,
  onAction,
  onOpenResult,
}: {
  message: Message;
  onAction: (a: AiAction) => void;
  onOpenResult: (r: AiResultItem) => void;
}) {
  const isUser = message.role === 'user';
  return (
    <View style={[styles.msgRow, isUser && { justifyContent: 'flex-end' }]}>
      {!isUser ? <Image source={MASCOT} style={styles.avatar} contentFit="contain" /> : null}
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.botBubble]}>
        {message.content ? <Text style={[styles.text, isUser && { color: Colors.white }]}>{message.content}</Text> : null}

        {message.results?.length ? (
          <View style={styles.results}>
            {message.results.map((r, i) => (
              <Pressable key={i} style={styles.result} onPress={() => onOpenResult(r)}>
                <Feather name={TYPE_ICONS[r.type] ?? 'folder'} size={13} color={Colors.primary} style={{ marginTop: 2 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.resultTitle} numberOfLines={1}>
                    {r.title}
                  </Text>
                  {r.summary ? (
                    <Text style={styles.resultSummary} numberOfLines={2}>
                      {r.summary}
                    </Text>
                  ) : null}
                </View>
                <Feather name="chevron-right" size={14} color={Colors.textSubtle} />
              </Pressable>
            ))}
            {message.hasMore ? <Text style={styles.more}>결과가 더 있어요 →</Text> : null}
          </View>
        ) : null}

        {message.actions?.length ? (
          <View style={styles.actions}>
            {message.actions.map((a, i) => {
              const primary = a.actionType === 'confirm_send';
              return (
                <Pressable
                  key={i}
                  onPress={() => onAction(a)}
                  style={[styles.actionBtn, primary ? styles.actionPrimary : styles.actionSecondary]}>
                  <Text style={[styles.actionText, primary && { color: Colors.white }]}>{a.label}</Text>
                  {a.actionType === 'navigate' ? <Feather name="arrow-right" size={12} color={Colors.primary} /> : null}
                </Pressable>
              );
            })}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { padding: Spacing.md, gap: 12 },
  intro: { alignItems: 'center', paddingVertical: Spacing.lg, gap: 6 },
  mascot: { width: 110, height: 120 },
  introTitle: { fontSize: 18, fontWeight: '800', color: Colors.text, marginTop: 6 },
  introSub: { fontSize: 13, color: Colors.textMuted, textAlign: 'center', lineHeight: 19, paddingHorizontal: Spacing.lg },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  avatar: { width: 34, height: 38 },
  bubble: { maxWidth: '82%', paddingHorizontal: 14, paddingVertical: 11, borderRadius: 18 },
  userBubble: { backgroundColor: Colors.primary, borderBottomRightRadius: 6 },
  botBubble: { backgroundColor: Colors.surface, borderBottomLeftRadius: 6, ...Shadow.sm },
  text: { fontSize: 15, color: Colors.text, lineHeight: 22 },
  typing: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', marginLeft: 42 },
  typingText: { fontSize: 13, color: Colors.textMuted },
  results: { marginTop: 10, gap: 6 },
  result: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 10,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surfaceMuted,
  },
  resultTitle: { fontSize: 13, fontWeight: '700', color: Colors.text },
  resultSummary: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  more: { fontSize: 12, color: Colors.primary, fontWeight: '600', marginTop: 2 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.pill,
  },
  actionPrimary: { backgroundColor: Colors.primary },
  actionSecondary: { backgroundColor: Colors.primarySoft },
  actionText: { fontSize: 13, fontWeight: '600', color: Colors.primary },
  /** ScrollView 기본 flexGrow:1 때문에 FlatList 와 높이를 나눠 갖지 않도록 고정 */
  suggestionBar: { flexGrow: 0, flexShrink: 0 },
  suggestions: { gap: 8, alignItems: 'center', paddingHorizontal: Spacing.md, paddingBottom: 10 },
  suggestion: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.primarySoftStrong,
  },
  suggestionText: { fontSize: 13, color: Colors.primary, fontWeight: '600' },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    padding: Spacing.sm,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    minHeight: 42,
    backgroundColor: Colors.inputBg,
    borderRadius: 21,
    paddingHorizontal: 16,
    paddingTop: 11,
    paddingBottom: 11,
    fontSize: 15,
    color: Colors.text,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
