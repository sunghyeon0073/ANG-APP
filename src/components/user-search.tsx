import { Feather } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { searchUsers, type UserSummary } from '@/api/chat';
import { Avatar, TextField } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';

export const userSubtitle = (u: UserSummary) =>
  [u.departments?.[0]?.scopeName ?? u.dept, u.departments?.[0]?.position ?? u.position, u.empNo]
    .filter(Boolean)
    .join(' · ');

/** 이름/사번으로 사용자 검색 (웹 RecipientSelector 와 동일한 /users/search 사용) */
export function UserSearch({
  onSelect,
  excludeEmpNos = [],
  selectedEmpNos = [],
  autoFocus,
}: {
  onSelect: (user: UserSummary) => void;
  excludeEmpNos?: string[];
  selectedEmpNos?: string[];
  autoFocus?: boolean;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserSummary[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      return;
    }
    let alive = true;
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const list = await searchUsers(q);
        if (alive) setResults(list);
      } catch {
        if (alive) setResults([]);
      } finally {
        if (alive) setSearching(false);
      }
    }, 280);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [query]);

  const visible = results.filter((u) => !excludeEmpNos.includes(u.empNo)).slice(0, 20);

  return (
    <View>
      <TextField
        icon="search"
        placeholder="이름 또는 사번으로 검색"
        value={query}
        onChangeText={setQuery}
        autoFocus={autoFocus}
        autoCapitalize="none"
        inputStyle={{ paddingVertical: 11 }}
      />
      {searching ? <ActivityIndicator color={Colors.primary} style={{ marginTop: 12 }} /> : null}
      {!searching && query.trim() && visible.length === 0 ? (
        <Text style={styles.empty}>검색 결과가 없습니다.</Text>
      ) : null}
      {visible.map((u) => {
        const selected = selectedEmpNos.includes(u.empNo);
        return (
          <Pressable
            key={u.empNo}
            style={({ pressed }) => [styles.row, pressed && { backgroundColor: Colors.primarySoft }]}
            onPress={() => onSelect(u)}>
            <Avatar name={u.name} size={38} />
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{u.name}</Text>
              <Text style={styles.sub} numberOfLines={1}>
                {userSubtitle(u)}
              </Text>
            </View>
            <Feather
              name={selected ? 'check-circle' : 'plus-circle'}
              size={20}
              color={selected ? Colors.primary : Colors.textSubtle}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 4, borderRadius: 12 },
  name: { fontSize: 15, fontWeight: '600', color: Colors.text },
  sub: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  empty: { textAlign: 'center', color: Colors.textMuted, fontSize: 13, marginTop: Spacing.md },
});
