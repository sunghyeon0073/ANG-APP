import { call, toList, type Page } from '@/lib/api';
import { appendFile, type PickedFile } from '@/lib/files';

export type MailSummary = {
  mailId: number;
  title: string;
  senderName: string;
  senderEmpNo: string;
  status: 'DRAFT' | 'SENT' | 'CANCELLED';
  sentAt?: string | null;
  isRead: boolean;
  isFavorite: boolean;
  /** 즐겨찾기/휴지통처럼 받은·보낸 메일이 섞인 목록에서 원래 메일함 (프론트에서 계산) */
  box?: 'inbox' | 'sent' | 'draft';
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

export type MailBox = 'inbox' | 'sent' | 'favorites' | 'draft' | 'trash';

type MailPage = Page<MailSummary> & { number?: number };

const hasNextOf = (data?: MailPage | null) =>
  Boolean(data?.hasNext ?? (data && data.number !== undefined && data.number + 1 < data.totalPages));

const getPage = async (path: string, page: number, size: number) => {
  const data = await call<MailPage>(path, { params: { page, size } });
  return { items: toList<MailSummary>(data), hasNext: hasNextOf(data) };
};

/**
 * 메일함 목록. 휴지통은 받은/보낸 휴지통 두 API 를 합쳐서 보여준다 (AngApp mailUtils 와 동일).
 * 즐겨찾기/휴지통 항목에는 원래 메일함(box)을 붙여 복원·즐겨찾기 API 를 고를 수 있게 한다.
 */
export const getMails = async (box: MailBox, page = 0, size = 20, myEmpNo?: string) => {
  if (box === 'trash') {
    const [inbox, sent] = await Promise.all([
      getPage('/mail/trash/inbox', page, size),
      getPage('/mail/trash/sent', page, size),
    ]);
    const items = [
      ...inbox.items.map((m) => ({ ...m, box: 'inbox' as const })),
      ...sent.items.map((m) => ({ ...m, box: 'sent' as const })),
    ].sort((a, b) => +new Date(b.sentAt || 0) - +new Date(a.sentAt || 0));
    return { items, hasNext: inbox.hasNext || sent.hasNext };
  }
  const res = await getPage(`/mail/${box}`, page, size);
  const items = res.items.map((m) => ({
    ...m,
    box: box === 'favorites' ? (m.senderEmpNo === myEmpNo ? 'sent' : 'inbox') : box,
  })) as MailSummary[];
  return { items, hasNext: res.hasNext };
};

export const getMailDetail = (mailId: number | string) => call<MailDetail>(`/mail/${mailId}`);

export const toggleMailFavorite = (mailId: number, box: 'inbox' | 'sent') =>
  call(`/mail/${mailId}/favorite/${box}`, { method: 'POST' });

/** 휴지통으로 이동 */
export const deleteMail = (mailId: number, box: 'inbox' | 'sent' | 'draft') =>
  call(`/mail/${mailId}/${box}`, { method: 'DELETE' });

export const restoreMail = (mailId: number, box: 'inbox' | 'sent') =>
  call(`/mail/${mailId}/restore/${box}`, { method: 'POST' });

/** 휴지통에서 완전 삭제 */
export const permanentDeleteMail = (mailId: number, box: 'inbox' | 'sent') =>
  call(`/mail/trash/${box}/${mailId}`, { method: 'DELETE' });

/** 발송 취소 (읽은 수신자가 있으면 서버가 거부) */
export const cancelMail = (mailId: number) => call(`/mail/${mailId}/cancel`, { method: 'POST' });

export const replyMail = (mailId: number, body: string) =>
  call(`/mail/${mailId}/reply`, { method: 'POST', body: { body } });

export type MailPayload = { title: string; body: string; recipientEmpNos: string[] };

export const saveMailDraft = (payload: MailPayload) => call<number>('/mail/draft', { method: 'POST', body: payload });

export const updateMailDraft = (mailId: number, payload: MailPayload) =>
  call(`/mail/${mailId}/draft`, { method: 'PUT', body: payload });

export const sendDraftMail = (mailId: number) => call<number>(`/mail/${mailId}/send`, { method: 'POST' });

export const uploadMailFile = (mailId: number, file: PickedFile) => {
  const form = new FormData();
  form.append('mailId', String(mailId));
  appendFile(form, 'file', file);
  return call('/mail/files', { method: 'POST', body: form });
};

export const mailFilePath = (attachmentId: number) => `/mail/files/${attachmentId}`;

/**
 * 임시저장 + 첨부 업로드. 메일 발송도 이 함수로 저장한 뒤 sendDraftMail 을 호출한다.
 * (POST /mail 은 multipart 의 JSON 파트에 Content-Type 이 필요한데 RN FormData 로는 지정할 수 없음)
 * 업로드에 실패한 파일을 돌려주므로, 다시 시도할 때 성공한 파일을 중복으로 올리지 않는다.
 */
export const saveDraftWithFiles = async (payload: MailPayload, files: PickedFile[], draftId?: number | null) => {
  let mailId = draftId ?? null;
  if (mailId) await updateMailDraft(mailId, payload);
  else mailId = await saveMailDraft(payload);
  const results = await Promise.allSettled(files.map((f) => uploadMailFile(mailId, f)));
  return { mailId, failedFiles: files.filter((_, i) => results[i].status === 'rejected') };
};
