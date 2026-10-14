import { Platform } from 'react-native';

/** 백엔드 서버 주소. `.env` 의 EXPO_PUBLIC_API_URL 로 변경한다. */
const SERVER_API_URL = (process.env.EXPO_PUBLIC_API_URL || 'http://15.168.240.20:5500/api').replace(/\/$/, '');

/**
 * REST 호출 주소.
 * 웹 개발 모드에서는 CORS 를 피하기 위해 Metro 프록시(metro.config.js)를 거치도록 같은 출처의 /api 를 쓴다.
 */
export const API_URL = Platform.OS === 'web' && __DEV__ ? '/api' : SERVER_API_URL;

/**
 * STOMP 웹소켓 주소. 백엔드는 SockJS 엔드포인트(/ws)를 쓰므로
 * SockJS 의 raw websocket 경로(/ws/websocket)로 직접 접속한다. (웹소켓은 CORS 대상이 아님)
 */
export const WS_URL = `${SERVER_API_URL.replace(/^http/, 'ws')}/ws/websocket`;

/** 화면 표시용 서버 주소 */
export const SERVER_URL = SERVER_API_URL;
