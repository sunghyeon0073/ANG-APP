import { StyleSheet, Text, View } from 'react-native';

import { Radius } from '@/constants/theme';

/** 웹 documentFileUtils 의 확장자 분류를 컬러 라벨로 표현 */
const TYPES: { match: RegExp; label: string; color: string }[] = [
  { match: /pdf/i, label: 'PDF', color: '#e5484d' },
  { match: /hwpx?|hancom/i, label: 'HWP', color: '#0ea5e9' },
  { match: /docx?|word/i, label: 'DOC', color: '#3a5cad' },
  { match: /xlsx?|sheet|excel|csv/i, label: 'XLS', color: '#16a34a' },
  { match: /pptx?|presentation/i, label: 'PPT', color: '#f97316' },
  { match: /png|jpe?g|gif|webp|image/i, label: 'IMG', color: '#8b5cf6' },
  { match: /txt|text|md/i, label: 'TXT', color: '#64748b' },
];

export const fileTypeOf = (name?: string | null, contentType?: string | null) => {
  const ext = name?.split('.').pop() ?? '';
  return TYPES.find((t) => t.match.test(ext) || (contentType ? t.match.test(contentType) : false)) ?? {
    label: 'FILE',
    color: '#94a3b8',
  };
};

export function FileIcon({ name, contentType, size = 44 }: { name?: string | null; contentType?: string | null; size?: number }) {
  const t = fileTypeOf(name, contentType);
  return (
    <View style={[styles.box, { width: size, height: size, backgroundColor: `${t.color}1A` }]}>
      <Text style={[styles.text, { color: t.color, fontSize: size * 0.25 }]}>{t.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  text: { fontWeight: '800' },
});
