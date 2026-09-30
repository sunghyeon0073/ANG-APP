import { Feather } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  createSchedule,
  deleteSchedule,
  getSchedules,
  toggleCompleteSchedule,
  type Schedule,
  type ScheduleInput,
} from '@/api/misc';
import { Button, Card, EmptyState, ErrorBanner, Header, IconButton, PillTabs, Screen, TextField } from '@/components/ui';
import { Colors, Radius, Shadow, Spacing } from '@/constants/theme';
import { useAsync } from '@/hooks/use-async';
import { errorMessage } from '@/lib/api';
import { shortTime, WEEKDAYS, ymd } from '@/lib/format';

const TYPE_COLOR = { PERSONAL: Colors.primary, DEPARTMENT: Colors.success } as const;

/** 6주 × 7일 월 그리드 (웹 HomeCalendar.monthGrid 와 동일한 방식) */
const buildMonthGrid = (year: number, month: number) => {
  const first = new Date(year, month, 1);
  const start = new Date(year, month, 1 - first.getDay());
  return Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
};

const coversDay = (s: Schedule, day: string) => s.startDate <= day && day <= (s.endDate || s.startDate);

export default function CalendarScreen() {
  const today = useMemo(() => ymd(new Date()), []);
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [selected, setSelected] = useState(today);
  const [filter, setFilter] = useState<'ALL' | 'PERSONAL' | 'DEPARTMENT'>('ALL');
  const [adding, setAdding] = useState(false);

  const grid = useMemo(() => buildMonthGrid(cursor.year, cursor.month), [cursor]);
  const range = { start: ymd(grid[0]), end: ymd(grid[41]) };

  const { data, setData, loading, refreshing, refresh, reload, error } = useAsync(
    () => getSchedules(range.start, range.end),
    [range.start, range.end],
  );

  const schedules = useMemo(
    () => (data ?? []).filter((s) => filter === 'ALL' || s.type === filter),
    [data, filter],
  );
  const daySchedules = schedules
    .filter((s) => coversDay(s, selected))
    .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

  const moveMonth = (delta: number) =>
    setCursor(({ year, month }) => {
      const d = new Date(year, month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });

  const goToday = () => {
    const d = new Date();
    setCursor({ year: d.getFullYear(), month: d.getMonth() });
    setSelected(today);
  };

  const toggleComplete = async (s: Schedule) => {
    setData((prev) => prev?.map((p) => (p.id === s.id ? { ...p, isCompleted: !p.isCompleted } : p)));
    try {
      await toggleCompleteSchedule(s.id);
    } catch (e) {
      Alert.alert('변경 실패', errorMessage(e));
      reload();
    }
  };

  const remove = (s: Schedule) =>
    Alert.alert('일정 삭제', `'${s.title}' 일정을 삭제할까요?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteSchedule(s.id);
            reload();
          } catch (e) {
            Alert.alert('삭제 실패', errorMessage(e));
          }
        },
      },
    ]);

  const selectedDate = new Date(`${selected}T00:00:00`);

  return (
    <Screen>
      <Header title="캘린더" back right={<IconButton name="plus" onPress={() => setAdding(true)} />} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Colors.primary} />}>
        <Card style={{ paddingHorizontal: 10 }}>
          <View style={styles.monthHeader}>
            <IconButton name="chevron-left" onPress={() => moveMonth(-1)} />
            <Text style={styles.monthTitle}>
              {cursor.year}년 {cursor.month + 1}월
            </Text>
            <IconButton name="chevron-right" onPress={() => moveMonth(1)} />
            <Pressable style={styles.todayBtn} onPress={goToday}>
              <Text style={styles.todayText}>오늘</Text>
            </Pressable>
          </View>
          <View style={styles.weekHeader}>
            {WEEKDAYS.map((w, i) => (
              <Text
                key={w}
                style={[styles.weekday, i === 0 && { color: Colors.danger }, i === 6 && { color: Colors.primary }]}>
                {w}
              </Text>
            ))}
          </View>
          <View style={styles.grid}>
            {grid.map((d) => {
              const key = ymd(d);
              const inMonth = d.getMonth() === cursor.month;
              const isSelected = key === selected;
              const isToday = key === today;
              const events = schedules.filter((s) => coversDay(s, key));
              return (
                <Pressable key={key} style={styles.cell} onPress={() => setSelected(key)}>
                  <View style={[styles.dayCircle, isSelected && styles.daySelected, isToday && !isSelected && styles.dayToday]}>
                    <Text
                      style={[
                        styles.dayText,
                        !inMonth && { color: Colors.borderStrong },
                        inMonth && d.getDay() === 0 && { color: Colors.danger },
                        inMonth && d.getDay() === 6 && { color: Colors.primary },
                        isToday && !isSelected && { color: Colors.primary, fontWeight: '800' },
                        isSelected && { color: Colors.white },
                      ]}>
                      {d.getDate()}
                    </Text>
                  </View>
                  <View style={styles.dots}>
                    {events.slice(0, 3).map((e) => (
                      <View
                        key={`${e.id}-${key}`}
                        style={[styles.dot, { backgroundColor: TYPE_COLOR[e.type] ?? Colors.primary }, !inMonth && { opacity: 0.4 }]}
                      />
                    ))}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </Card>

        <PillTabs
          style={{ marginHorizontal: -Spacing.md }}
          items={[
            { key: 'ALL', label: '전체' },
            { key: 'PERSONAL', label: '개인' },
            { key: 'DEPARTMENT', label: '부서' },
          ]}
          value={filter}
          onChange={setFilter}
        />

        {error ? <ErrorBanner message={error} onRetry={refresh} /> : null}

        <View style={styles.dayHeader}>
          <Text style={styles.dayTitle}>
            {selectedDate.getMonth() + 1}월 {selectedDate.getDate()}일 {WEEKDAYS[selectedDate.getDay()]}요일
          </Text>
          <Text style={styles.dayCount}>{loading ? '불러오는 중…' : `일정 ${daySchedules.length}개`}</Text>
        </View>

        {!loading && daySchedules.length === 0 ? (
          <Card>
            <EmptyState
              icon="calendar"
              title="일정이 없습니다."
              action={<Button title="일정 추가" icon="plus" small variant="ghost" onPress={() => setAdding(true)} />}
            />
          </Card>
        ) : (
          daySchedules.map((s) => (
            <Pressable key={`${s.id}-${s.startDate}`} onLongPress={() => remove(s)} style={[styles.event, Shadow.sm]}>
              <View style={[styles.eventBar, { backgroundColor: TYPE_COLOR[s.type] ?? Colors.primary }]} />
              {s.isTodo ? (
                <Pressable onPress={() => toggleComplete(s)} hitSlop={8}>
                  <Feather
                    name={s.isCompleted ? 'check-square' : 'square'}
                    size={20}
                    color={s.isCompleted ? Colors.success : Colors.textSubtle}
                  />
                </Pressable>
              ) : null}
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={[styles.eventTitle, s.isCompleted && styles.done]} numberOfLines={1}>
                  {s.title}
                </Text>
                <Text style={styles.eventMeta}>
                  {s.startTime ? `${shortTime(s.startTime)} - ${shortTime(s.endTime)}` : '종일'}
                  {s.startDate !== s.endDate ? ` · ${s.startDate.slice(5)} ~ ${s.endDate.slice(5)}` : ''}
                  {' · '}
                  {s.type === 'DEPARTMENT' ? '부서' : '개인'}
                </Text>
                {s.description ? (
                  <Text style={styles.eventDesc} numberOfLines={2}>
                    {s.description}
                  </Text>
                ) : null}
              </View>
              <IconButton name="trash-2" size={16} color={Colors.textSubtle} onPress={() => remove(s)} />
            </Pressable>
          ))
        )}
      </ScrollView>

      <AddScheduleSheet
        visible={adding}
        date={selected}
        onClose={() => setAdding(false)}
        onCreated={() => {
          setAdding(false);
          reload();
        }}
      />
    </Screen>
  );
}

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function AddScheduleSheet({
  visible,
  date,
  onClose,
  onCreated,
}: {
  visible: boolean;
  date: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState<ScheduleInput>({
    title: '',
    startDate: date,
    endDate: date,
    startTime: '09:00',
    endTime: '10:00',
    description: '',
    type: 'PERSONAL',
    isTodo: false,
  });
  const [saving, setSaving] = useState(false);
  const [lastDate, setLastDate] = useState(date);

  // 선택한 날짜가 바뀌면 기본 날짜도 맞춘다
  if (date !== lastDate) {
    setLastDate(date);
    setForm((f) => ({ ...f, startDate: date, endDate: date }));
  }

  const set = <K extends keyof ScheduleInput>(key: K, value: ScheduleInput[K]) => setForm((f) => ({ ...f, [key]: value }));

  const save = async () => {
    if (!form.title.trim()) return Alert.alert('제목', '일정 제목을 입력해주세요.');
    if (!DATE_RE.test(form.startDate) || !DATE_RE.test(form.endDate))
      return Alert.alert('날짜 형식', '날짜는 YYYY-MM-DD 형식으로 입력해주세요.');
    if (!TIME_RE.test(form.startTime) || !TIME_RE.test(form.endTime))
      return Alert.alert('시간 형식', '시간은 HH:mm 형식으로 입력해주세요.');
    if (form.endDate < form.startDate) return Alert.alert('날짜 확인', '종료일이 시작일보다 빠릅니다.');
    setSaving(true);
    try {
      await createSchedule({ ...form, title: form.title.trim() });
      setForm((f) => ({ ...f, title: '', description: '' }));
      onCreated();
    } catch (e) {
      Alert.alert('등록 실패', errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <SafeAreaView edges={['bottom']} style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>일정 추가</Text>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 14, paddingTop: 12 }}>
            <TextField label="제목" value={form.title} onChangeText={(v) => set('title', v)} placeholder="일정 제목" />
            <View style={styles.row2}>
              <TextField
                label="시작일"
                value={form.startDate}
                onChangeText={(v) => set('startDate', v)}
                placeholder="YYYY-MM-DD"
                style={{ flex: 1 }}
              />
              <TextField
                label="종료일"
                value={form.endDate}
                onChangeText={(v) => set('endDate', v)}
                placeholder="YYYY-MM-DD"
                style={{ flex: 1 }}
              />
            </View>
            <View style={styles.row2}>
              <TextField
                label="시작 시간"
                value={form.startTime}
                onChangeText={(v) => set('startTime', v)}
                placeholder="HH:mm"
                style={{ flex: 1 }}
              />
              <TextField
                label="종료 시간"
                value={form.endTime}
                onChangeText={(v) => set('endTime', v)}
                placeholder="HH:mm"
                style={{ flex: 1 }}
              />
            </View>
            <View>
              <Text style={styles.label}>구분</Text>
              <View style={styles.row2}>
                {(['PERSONAL', 'DEPARTMENT'] as const).map((t) => (
                  <Pressable
                    key={t}
                    onPress={() => set('type', t)}
                    style={[styles.typeBtn, form.type === t && { borderColor: TYPE_COLOR[t], backgroundColor: `${TYPE_COLOR[t]}14` }]}>
                    <Feather name={t === 'PERSONAL' ? 'user' : 'users'} size={16} color={form.type === t ? TYPE_COLOR[t] : Colors.textMuted} />
                    <Text style={[styles.typeText, form.type === t && { color: TYPE_COLOR[t] }]}>
                      {t === 'PERSONAL' ? '개인' : '부서'}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <View style={styles.switchRow}>
              <Text style={styles.label}>할 일로 등록</Text>
              <Switch
                value={form.isTodo}
                onValueChange={(v) => set('isTodo', v)}
                trackColor={{ true: Colors.primary, false: Colors.borderStrong }}
              />
            </View>
            <TextField
              label="메모"
              value={form.description}
              onChangeText={(v) => set('description', v)}
              placeholder="설명 (선택)"
              multiline
              inputStyle={{ minHeight: 70 }}
            />
            <View style={styles.row2}>
              <Button title="취소" variant="secondary" style={{ flex: 1 }} onPress={onClose} />
              <Button title="저장" icon="check" style={{ flex: 2 }} loading={saving} onPress={save} />
            </View>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.md, gap: Spacing.sm, paddingBottom: Spacing.xl },
  monthHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  monthTitle: { fontSize: 18, fontWeight: '800', color: Colors.text, minWidth: 110, textAlign: 'center' },
  todayBtn: {
    marginLeft: 'auto',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primarySoft,
  },
  todayText: { color: Colors.primary, fontWeight: '700', fontSize: 13 },
  weekHeader: { flexDirection: 'row', marginBottom: 4 },
  weekday: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '600', color: Colors.textMuted },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 4, height: 50 },
  dayCircle: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  daySelected: { backgroundColor: Colors.primary },
  dayToday: { backgroundColor: Colors.primarySoft },
  dayText: { fontSize: 14, fontWeight: '500', color: Colors.text },
  dots: { flexDirection: 'row', gap: 2, marginTop: 3, height: 5 },
  dot: { width: 5, height: 5, borderRadius: 3 },
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 4 },
  dayTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  dayCount: { fontSize: 12, color: Colors.textMuted },
  event: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    paddingLeft: Spacing.md + 4,
    overflow: 'hidden',
  },
  eventBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  eventTitle: { fontSize: 15, fontWeight: '700', color: Colors.text },
  eventMeta: { fontSize: 12, color: Colors.textMuted },
  eventDesc: { fontSize: 13, color: Colors.textMuted },
  done: { textDecorationLine: 'line-through', color: Colors.textSubtle },
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15,35,52,0.35)' },
  sheet: {
    maxHeight: '90%',
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
    marginBottom: 12,
  },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: Colors.text },
  row2: { flexDirection: 'row', gap: 10 },
  label: { fontSize: 14, fontWeight: '500', color: '#555', marginBottom: 8 },
  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.borderStrong,
  },
  typeText: { fontSize: 14, fontWeight: '600', color: Colors.textMuted },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
