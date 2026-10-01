import { call, toList } from '@/lib/api';
import { appendFile, type PickedFile } from '@/lib/files';

export type ChatMember = { userId: number; name: string; empNo: string; profileImageUrl?: string | null };

export type ChatRoom = {
  roomId: number;
  type: 'PRIVATE' | 'GROUP';
  name: string;
  lastMessageContent?: string | null;
  lastMessageAt?: string | null;
  lastMessageSender?: string | null;
  unreadCount: number;
  members: ChatMember[];
};

export type ChatMessage = {
  messageId: number | string;
  roomId?: number;
  senderId?: number;
  senderName: string;
  senderEmpNo: string;
  content?: string | null;
  messageType: 'TEXT' | 'FILE' | 'SYSTEM';
  fileUrl?: string | null;
  fileName?: string | null;
  sentAt: string;
};

export type UserSummary = {
  id?: number;
  empNo: string;
  name: string;
  position?: string;
  dept?: string;
  departments?: { scopeName: string; position?: string }[];
};

export const getChatRooms = () =>
  call<unknown>('/chat/rooms').then((d) =>
    toList<ChatRoom>(d).sort((a, b) => +new Date(b.lastMessageAt || 0) - +new Date(a.lastMessageAt || 0)),
  );

/** 최신순(내림차순)으로 반환된다 */
export const getChatMessages = (roomId: number | string, page = 0, size = 30) =>
  call<unknown>(`/chat/rooms/${roomId}/messages`, { params: { page, size } }).then((d) => toList<ChatMessage>(d));

export const getChatRoomMembers = (roomId: number | string) =>
  call<unknown>(`/chat/rooms/${roomId}/members`).then((d) => toList<ChatMember>(d));

export const markChatRoomAsRead = (roomId: number | string) =>
  call(`/chat/rooms/${roomId}/read`, { method: 'POST' });

/** 방 생성 API 는 roomId 숫자 또는 방 객체를 돌려줄 수 있어 둘 다 처리 (AngApp normalizeRoomId) */
const toRoomId = (value: unknown): number => {
  const raw =
    value && typeof value === 'object'
      ? ((value as Record<string, unknown>).roomId ?? (value as Record<string, unknown>).id)
      : value;
  const id = Number(raw);
  if (!Number.isFinite(id)) throw new Error('채팅방 정보를 받지 못했습니다.');
  return id;
};

export const createPrivateChatRoom = (recipientEmpNo: string) =>
  call<unknown>('/chat/rooms/private', { method: 'POST', body: { recipientEmpNo } }).then(toRoomId);

export const createGroupChatRoom = (name: string, memberEmpNos: string[]) =>
  call<unknown>('/chat/rooms/group', { method: 'POST', body: { name: name.trim() || null, memberEmpNos } }).then(toRoomId);

export const inviteChatMembers = (roomId: number | string, empNos: string[]) =>
  call(`/chat/rooms/${roomId}/invite`, { method: 'POST', body: { empNos, name: null } });

export const leaveChatRoom = (roomId: number | string) => call(`/chat/rooms/${roomId}/leave`, { method: 'POST' });

export const updateChatRoomName = (roomId: number | string, name: string) =>
  call(`/chat/rooms/${roomId}/name`, { method: 'PATCH', body: { name: name.trim() || null } });

/** 파일 업로드 후 STOMP 로 보낼 fileUrl/fileName 을 돌려준다 */
export const uploadChatFile = (roomId: number | string, file: PickedFile) => {
  const form = new FormData();
  form.append('roomId', String(roomId));
  appendFile(form, 'file', file);
  return call<{ fileUrl: string; fileName?: string }>('/chat/files', { method: 'POST', body: form });
};

/** 다운로드 경로 (웹과 동일하게 fileUrl 을 key 로 사용) */
export const chatFilePath = (fileUrl: string) => `/chat/files?key=${encodeURIComponent(fileUrl)}`;

export const searchUsers = (q: string) =>
  call<unknown>('/users/search', { params: { q } }).then((d) => toList<UserSummary>(d));
