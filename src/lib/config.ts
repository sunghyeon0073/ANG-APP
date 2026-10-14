import { Platform } from 'react-native';

/** 백엔드 서버 주소. `.env` 의 EXPO_PUBLIC_API_URL 로 변경한다. */
const SERVER_API_URL = (process.env.EXPO_PUBLIC_API_URL || 'http://15.168.240.20:5500/api').replace(/\/$/, '');

const isWeb = Platform.OS === 'web';

/**
 * REST 호출 주소.
 * 웹은 CORS 를 피하기 위해 같은 출처의 /api 를 쓴다.
 * - 개발: Metro 프록시(metro.config.js)가 백엔드로 넘긴다
 * - 배포: 웹 빌드를 서빙하는 nginx 가 /api 를 백엔드로 넘긴다
 */
export const API_URL = isWeb ? '/api' : SERVER_API_URL;

/**
 * STOMP 웹소켓 주소. 백엔드는 SockJS 엔드포인트(/ws)를 쓰므로
 * SockJS 의 raw websocket 경로(/ws/websocket)로 직접 접속한다.
 * 웹은 같은 출처로 붙는다 (백엔드가 다른 Origin 의 핸드셰이크를 403 으로 거부하므로).
 * - 개발: Metro 프록시(metro.config.js)가 upgrade 요청도 백엔드로 넘긴다
 * - 배포: nginx 가 넘긴다
 */
const WS_BASE = isWeb ? `${globalThis.location?.origin ?? ''}/api` : SERVER_API_URL;
export const WS_URL = `${WS_BASE.replace(/^http/, 'ws')}/ws/websocket`;

/** 화면 표시용 서버 주소 */
export const SERVER_URL = SERVER_API_URL;
