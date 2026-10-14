const pad = (n: number) => String(n).padStart(2, '0');

const toDate = (value?: string | number | Date | null) => {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

export const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/** YYYY-MM-DD (로컬 기준) */
export const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const formatDate = (value?: string | null) => {
  const d = toDate(value);
  return d ? `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}` : '-';
};

export const formatDateTime = (value?: string | null) => {
  const d = toDate(value);
  return d ? `${formatDate(value)} ${pad(d.getHours())}:${pad(d.getMinutes())}` : '-';
};

export const formatTime = (value?: string | null) => {
  const d = toDate(value);
  if (!d) return '';
  const h = d.getHours();
  return `${h < 12 ? '오전' : '오후'} ${h % 12 === 0 ? 12 : h % 12}:${pad(d.getMinutes())}`;
};

/** 목록용: 오늘이면 시간, 올해면 M/D, 아니면 YYYY.MM.DD */
export const formatListDate = (value?: string | null) => {
  const d = toDate(value);
  if (!d) return '';
  const now = new Date();
  if (isSameDay(d, now)) return formatTime(value);
  if (d.getFullYear() === now.getFullYear()) return `${d.getMonth() + 1}/${d.getDate()}`;
  return formatDate(value);
};

export const formatRelative = (value?: string | null) => {
  const d = toDate(value);
  if (!d) return '';
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return '방금 전';
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}일 전`;
  return formatDate(value);
};

/** "09:00:00" → "09:00" */
export const shortTime = (t?: string | null) => (t ? t.slice(0, 5) : '');

export const formatFileSize = (size?: number | null) => {
  if (!size) return '';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
};

export const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

/** HTML 태그가 섞인 본문을 평문으로 */
export const stripHtml = (html?: string | null) =>
  (html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h\d)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
