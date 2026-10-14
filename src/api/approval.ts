import { call, toList, toTotal } from '@/lib/api';

export type ApprovalStatus = 'DRAFT' | 'IN_PROGRESS' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'EXPIRED';
export type LineStatus = 'WAITING' | 'ACTIVE' | 'APPROVED' | 'REJECTED' | 'DELEGATED';
export type LineType = 'APPROVAL' | 'AGREEMENT' | 'REFERENCE' | 'RECEIVER';

export type ApprovalBoxItem = {
  id: number;
  title: string;
  drafterName: string;
  status: ApprovalStatus;
  createdAt: string;
  completedAt?: string | null;
};

export type ApprovalLine = {
  id: number;
  approverId: number;
  approverName: string;
  approverPosition?: string;
  delegateeId?: number | null;
  delegateeName?: string | null;
  lineOrder: number;
  lineType: LineType;
  status: LineStatus;
  comment?: string | null;
  processedAt?: string | null;
};

export type ApprovalDoc = {
  id: number;
  templateId?: number | null;
  templateTitle?: string | null;
  drafterId: number;
  drafterName: string;
  drafterPosition?: string | null;
  title: string;
  formData?: string | null;
  status: ApprovalStatus;
  securityLevel?: string | null;
  retentionPeriod?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  completedAt?: string | null;
  approvalLines: ApprovalLine[];
  attachments?: { id: number; fileName: string; contentType?: string }[];
};

export type ApprovalComment = {
  id: number;
  authorId: number;
  authorName: string;
  content: string;
  createdAt: string;
};

export type ApprovalFolder = 'waiting' | 'completed' | 'rejected' | 'my';

const page = { page: 0, size: 30 };
const box = (path: string, size = 30) =>
  call<unknown>(`/approvals/${path}`, { params: { ...page, size } }).then((d) => toList<ApprovalBoxItem>(d));

const dedupe = (docs: ApprovalBoxItem[]) => {
  const map = new Map<number, ApprovalBoxItem>();
  docs.forEach((d) => map.set(d.id, d));
  return [...map.values()].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
};

/** 웹 ESignature.refreshAll 과 같은 기준으로 4개 폴더를 구성 */
export async function getApprovalFolders(): Promise<Record<ApprovalFolder, ApprovalBoxItem[]>> {
  const settled = await Promise.allSettled([
    box('inbox/pending'),
    box('inbox/completed'),
    box('inbox/rejected'),
    box('outbox/rejected'),
    box('outbox/draft'),
    box('outbox/progress'),
    box('outbox/completed'),
  ]);
  const [waiting, completed, rejIn, rejOut, draft, progress, compOut] = settled.map((s) =>
    s.status === 'fulfilled' ? s.value : [],
  );
  return {
    waiting,
    completed,
    rejected: dedupe([...rejIn, ...rejOut]),
    my: dedupe([...draft, ...progress, ...compOut, ...rejOut]),
  };
}

/** 홈 대시보드 요약 카운트 (웹 Home.ApprovalSummary 와 동일한 기준) */
export async function getApprovalCounts() {
  const count = (path: string) =>
    call<unknown>(`/approvals/${path}`, { params: { page: 0, size: 1 } })
      .then(toTotal)
      .catch(() => 0);
  const [waiting, completed, rejected, my] = await Promise.all([
    count('inbox/pending'),
    count('inbox/completed'),
    count('inbox/rejected'),
    count('outbox/progress'),
  ]);
  return { waiting, completed, rejected, my };
}

export const getApprovalDoc =(id: number | string) => call<ApprovalDoc>(`/approvals/documents/${id}`);

export const approveApprovalDoc = (id: number, comment?: string) =>
  call(`/approvals/documents/${id}/approve`, { method: 'POST', body: { comment: comment || null } });

export const rejectApprovalDoc = (id: number, reason: string) =>
  call(`/approvals/documents/${id}/reject`, { method: 'POST', body: { reason } });

export const getApprovalComments = (id: number | string) =>
  call<unknown>(`/approvals/documents/${id}/comments`).then((d) => toList<ApprovalComment>(d));

export const addApprovalComment = (id: number | string, content: string) =>
  call(`/approvals/documents/${id}/comments`, { method: 'POST', body: { content } });

export const parseFormData = (formData?: string | null): Record<string, string> => {
  if (!formData) return {};
  try {
    const parsed = JSON.parse(formData);
    return parsed && typeof parsed === 'object' ? parsed : { raw: String(formData) };
  } catch {
    return { raw: formData };
  }
};
