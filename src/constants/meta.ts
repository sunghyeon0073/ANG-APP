import type { ApprovalFolder, ApprovalStatus, LineStatus, LineType } from '@/api/approval';
import type { NotificationType } from '@/api/misc';
import type { IconName } from '@/components/ui';
import { Colors } from '@/constants/theme';

/** 웹 ESignature.jsx 의 statusMeta / lineStatusMeta 와 동일 */
export const APPROVAL_STATUS: Record<ApprovalStatus, { label: string; color: string }> = {
  DRAFT: { label: '임시저장', color: '#64748b' },
  IN_PROGRESS: { label: '진행중', color: Colors.primary },
  APPROVED: { label: '승인완료', color: Colors.approved },
  REJECTED: { label: '반려', color: Colors.rejected },
  CANCELLED: { label: '회수', color: Colors.cancelled },
  EXPIRED: { label: '만료', color: '#334155' },
};

export const LINE_STATUS: Record<LineStatus, { label: string; color: string }> = {
  WAITING: { label: '대기', color: Colors.textSubtle },
  ACTIVE: { label: '진행', color: Colors.primary },
  APPROVED: { label: '승인', color: Colors.approved },
  REJECTED: { label: '반려', color: Colors.rejected },
  DELEGATED: { label: '대리결재', color: Colors.delegated },
};

export const LINE_TYPE: Record<LineType, string> = {
  APPROVAL: '결재',
  AGREEMENT: '합의',
  REFERENCE: '참조',
  RECEIVER: '수신',
};

/** 웹 FOLDER_META + 홈 요약 카드 색상 */
export const APPROVAL_FOLDERS: { key: ApprovalFolder; label: string; hint: string; color: string; icon: IconName }[] = [
  { key: 'waiting', label: '결재대기', hint: '내가 결재해야 할 문서', color: Colors.pending, icon: 'clock' },
  { key: 'completed', label: '완료', hint: '처리 완료된 문서', color: Colors.success, icon: 'check-circle' },
  { key: 'rejected', label: '반려', hint: '반려된 문서', color: Colors.danger, icon: 'x-circle' },
  { key: 'my', label: '내가 요청', hint: '내가 기안한 문서', color: Colors.mine, icon: 'send' },
];

export const NOTIFICATION_META: Record<NotificationType, { label: string; icon: IconName; color: string }> = {
  CHAT: { label: '채팅', icon: 'message-circle', color: '#0ea5e9' },
  MAIL: { label: '메일', icon: 'mail', color: Colors.primary },
  APPROVAL: { label: '전자결재', icon: 'check-circle', color: Colors.pending },
  BOARD: { label: '공지', icon: 'clipboard', color: Colors.success },
  AI: { label: 'AI', icon: 'cpu', color: Colors.mine },
};

export const DOC_STATUS: Record<string, { label: string; color: string }> = {
  DRAFT: { label: '작성중', color: Colors.textMuted },
  IN_APPROVAL: { label: '결재중', color: Colors.pending },
  FINAL: { label: '확정', color: Colors.success },
};
