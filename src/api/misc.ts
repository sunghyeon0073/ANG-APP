import { call, toList, type User } from '@/lib/api';

/* ─────────────── 인증 ─────────────── */
export type LoginResult = { accessToken: string; refreshToken: string; user: User };

export const login = (empNo: string, password: string) =>
  call<LoginResult>('/auth/login', { method: 'POST', body: { empNo, password }, anonymous: true });

export const getMyInfo = () => call<User>('/users/me');

/* ─────────────── 알림 ─────────────── */
export type NotificationType = 'CHAT' | 'MAIL' | 'APPROVAL' | 'BOARD' | 'AI';
export type AppNotification = {
  id: number;
  type: NotificationType;
  title: string;
  body?: string | null;
  targetId?: number | null;
  isRead: boolean;
  createdAt: string;
};

export const getNotifications = (page = 0, size = 30) =>
  call<unknown>('/notifications', { params: { page, size } }).then((d) => toList<AppNotification>(d));
export const markNotificationAsRead = (id: number) => call(`/notifications/${id}/read`, { method: 'POST' });
export const markAllNotificationsAsRead = () => call('/notifications/read-all', { method: 'POST' });

/* ─────────────── 게시판(공지사항) ─────────────── */
export type BoardPost = {
  id: number;
  authorId: number;
  author: string;
  type: 'NOTICE' | 'GENERAL';
  title: string;
  content: string;
  pinned: boolean;
  views: number;
  attachments?: { attachmentId: number; fileName: string; fileSize?: number; contentType?: string }[];
  createdAt: string;
  updatedAt?: string;
};

export const getBoardPosts = (type?: 'NOTICE' | 'GENERAL') =>
  call<unknown>('/board', { params: { type } }).then((d) =>
    toList<BoardPost>(d).sort(
      (a, b) => Number(b.pinned) - Number(a.pinned) || +new Date(b.createdAt) - +new Date(a.createdAt),
    ),
  );
export const incrementBoardViews = (id: number) => call(`/board/${id}/views`, { method: 'POST' });

/* ─────────────── 문서함 ─────────────── */
export type DocumentItem = {
  docId: number;
  title: string;
  originalContent?: string | null;
  aiSummary?: string | null;
  status?: 'DRAFT' | 'IN_APPROVAL' | 'FINAL';
  originalFileName?: string | null;
  fileId?: number | null;
  fileContentType?: string | null;
  fileSize?: number | null;
  ownerName?: string | null;
  scopeName?: string | null;
  createdAt: string;
  isFavorite?: boolean;
};

export type DocumentBox = 'my' | 'department' | 'favorites';

export const getDocuments = (box: DocumentBox, keyword?: string) =>
  call<unknown>(`/documents/${box}`, { params: { keyword, page: 0, size: 50 } }).then((d) =>
    toList<DocumentItem>(d),
  );
export const getDocument = (id: number | string) => call<DocumentItem>(`/documents/${id}`);
export const getDocumentOriginalContent = (id: number | string) =>
  call<string>(`/documents/${id}/original-content`);
export const toggleDocumentFavorite = (id: number) =>
  call<boolean>(`/documents/${id}/favorite`, { method: 'POST' });

/* ─────────────── 일정 ─────────────── */
export type Schedule = {
  id: number;
  startDate: string;
  endDate: string;
  title: string;
  startTime?: string | null;
  endTime?: string | null;
  description?: string | null;
  type: 'PERSONAL' | 'DEPARTMENT';
  isTodo: boolean;
  isCompleted: boolean;
  repeatType?: string;
};

export type ScheduleInput = {
  title: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  description?: string;
  type: 'PERSONAL' | 'DEPARTMENT';
  isTodo: boolean;
  repeatType?: string;
};

export const getSchedules = (startDate: string, endDate: string) =>
  call<unknown>('/schedules', { params: { startDate, endDate } }).then((d) => toList<Schedule>(d));
export const createSchedule = (payload: ScheduleInput) =>
  call<Schedule>('/schedules', { method: 'POST', body: { repeatType: 'NONE', ...payload } });
export const toggleCompleteSchedule = (id: number) => call(`/schedules/${id}/complete`, { method: 'PATCH' });
export const deleteSchedule = (id: number) => call(`/schedules/${id}`, { method: 'DELETE' });

/* ─────────────── AI 비서 ─────────────── */
export type AiResultItem = {
  type: string;
  title: string;
  summary?: string;
  date?: string;
  targetId?: number;
  route?: string;
  sourceLabel?: string;
};
export type AiAction = { label: string; actionType: 'navigate' | 'confirm_send' | string; payload: string };
export type AiAskResponse = {
  answer: string;
  intent?: string;
  results?: AiResultItem[];
  actions?: AiAction[];
  missingFields?: string[];
  hasMore?: boolean;
};

export const askAiAssistant = (prompt: string, confirm = false) =>
  call<AiAskResponse>('/ai-assistant/ask', { method: 'POST', body: { prompt, confirm } });
