import { call, toList, type Page } from '@/lib/api';

export type MailSummary = {
  mailId: number;
  title: string;
  senderName: string;
  senderEmpNo: string;
  status: 'DRAFT' | 'SENT' | 'CANCELLED';
  sentAt?: string | null;
  isRead: boolean;
  isFavorite: boolean;
};

export type MailDetail = {
  mailId: number;
  title: string;
  body: string;
  senderName: string;
  senderEmpNo: string;
  status: string;
  sentAt?: string | null;
  cancelledAt?: string | null;
  createdAt?: string | null;
  recipients: { recipientName: string; recipientEmpNo: string; isRead: boolean; readAt?: string | null }[];
  attachments: { attachmentId: number; fileUrl: string; fileName: string }[];
};

export type MailBox = 'inbox' | 'sent' | 'favorites' | 'draft';

export const getMails = async (box: MailBox, page = 0, size = 20) => {
  const data = await call<Page<MailSummary>>(`/mail/${box}`, { params: { page, size } });
  return { items: toList<MailSummary>(data), hasNext: Boolean(data?.hasNext) };
};

export const getMailDetail = (mailId: number | string) => call<MailDetail>(`/mail/${mailId}`);

export const toggleMailFavorite = (mailId: number, box: 'inbox' | 'sent') =>
  call(`/mail/${mailId}/favorite/${box}`, { method: 'POST' });

export const deleteMail = (mailId: number, box: 'inbox' | 'sent' | 'draft') =>
  call(`/mail/${mailId}/${box}`, { method: 'DELETE' });

export const replyMail = (mailId: number, body: string) =>
  call(`/mail/${mailId}/reply`, { method: 'POST', body: { body } });

/**
 * 메일 발송. POST /mail 은 multipart 의 JSON 파트(Content-Type 필수)를 요구하는데
 * RN FormData 로는 파트 Content-Type 을 지정할 수 없어, 임시저장 → 발송 순서로 처리한다.
 */
export const sendMail = async (payload: { title: string; body: string; recipientEmpNos: string[] }) => {
  const mailId = await call<number>('/mail/draft', { method: 'POST', body: payload });
  return call<number>(`/mail/${mailId}/send`, { method: 'POST' });
};

export const sendDraftMail = (mailId: number) => call<number>(`/mail/${mailId}/send`, { method: 'POST' });
