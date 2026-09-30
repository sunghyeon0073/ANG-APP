import { call, toList } from '@/lib/api';

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

export const createPrivateChatRoom = (recipientEmpNo: string) =>
  call<ChatRoom>('/chat/rooms/private', { method: 'POST', body: { recipientEmpNo } });

export const searchUsers = (q: string) =>
  call<unknown>('/users/search', { params: { q } }).then((d) => toList<UserSummary>(d));
