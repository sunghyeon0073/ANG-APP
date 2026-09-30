# ANG 모바일 앱

`C:\JDEV\Ang` 웹 포털(React + Spring Boot)의 모바일 버전입니다. Expo SDK 57 / expo-router 기반이며,
**웹과 같은 Spring Boot 백엔드 API를 호출**하므로 DB(MariaDB RDS)·S3·AI 서비스를 그대로 공유합니다.

## 실행

```bash
npm install
npx expo start        # Expo Go 또는 개발 빌드에서 QR 스캔
```

## 백엔드 주소 설정

`.env` 의 `EXPO_PUBLIC_API_URL` 을 수정한 뒤 `npx expo start -c` 로 재시작합니다.

| 환경 | 값 |
|------|-----|
| 배포 서버 (nginx 프록시) | `http://<EC2-IP>:5500/api` |
| 로컬 백엔드 | `http://<PC의 LAN IP>:9090/api` (기기에서 `localhost` 는 기기 자신) |

채팅 웹소켓은 같은 주소의 `/ws/websocket` (SockJS raw websocket) 으로 자동 연결됩니다.

## 화면 구성

| 탭/화면 | 경로 | 사용 API |
|---------|------|----------|
| 로그인 | `app/login.tsx` | `POST /auth/login`, `/auth/refresh` |
| 메인 대시보드 | `app/(tabs)/index.tsx` | 결재 요약, 주간 일정, 공지, 받은 메일, 알림 수 |
| 전자결재 / 상세 | `app/(tabs)/approval.tsx`, `app/approval/[id].tsx` | `/approvals/*` (승인·반려·댓글) |
| 채팅 / 채팅방 / 새 채팅 | `app/(tabs)/chat.tsx`, `app/chat/*` | `/chat/*` + STOMP `/topic/room.{id}`, `/app/chat.send` |
| 메일 / 상세 / 작성 | `app/(tabs)/mail.tsx`, `app/mail/*` | `/mail/*` |
| 공지사항 / 상세 | `app/notices/*` | `/board?type=NOTICE` |
| 알림 | `app/notifications.tsx` | `/notifications` + `/user/queue/notification` |
| 문서함 / 상세 | `app/documents/*` | `/documents/{my,department,favorites}` |
| 캘린더 | `app/calendar.tsx` | `/schedules` |
| AI 비서 | `app/assistant.tsx` | `POST /ai-assistant/ask` |

디자인 토큰(`src/constants/theme.ts`)은 웹 `Frontend/src/index.css` 의 Soft UI 값(primary `#3a5cad`, 배경 `#e8eef2`, pill 버튼, 20px 카드)을 그대로 옮겼습니다.
