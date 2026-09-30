import { Client, type StompSubscription } from '@stomp/stompjs';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import type { ChatMessage } from '@/api/chat';
import type { AppNotification } from '@/api/misc';
import { session } from '@/lib/api';
import { WS_URL } from '@/lib/config';

type Status = 'idle' | 'connecting' | 'connected' | 'error';
type Listener<T> = (payload: T) => void;

type SocketState = {
  status: Status;
  /** 채팅방 토픽(/topic/room.{id}) 구독. 해제 함수를 반환 */
  subscribeRoom: (roomId: number, listener: Listener<ChatMessage>) => () => void;
  /** 개인 알림 큐(/user/queue/notification) 구독 */
  onNotification: (listener: Listener<AppNotification>) => () => void;
  sendMessage: (roomId: number, content: string) => boolean;
};

const SocketContext = createContext<SocketState | null>(null);

/**
 * 웹 Chat.jsx 의 STOMP 연결을 앱 전역으로 옮긴 Provider.
 * 백엔드 /ws 는 SockJS 엔드포인트라, RN 에서는 SockJS 의 raw websocket 경로로 붙는다.
 */
export function SocketProvider({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  const [status, setStatus] = useState<Status>('idle');
  const clientRef = useRef<Client | null>(null);
  const roomListeners = useRef(new Map<number, Set<Listener<ChatMessage>>>());
  const roomSubs = useRef(new Map<number, StompSubscription>());
  const notificationListeners = useRef(new Set<Listener<AppNotification>>());

  const attachRoom = useCallback((roomId: number) => {
    const client = clientRef.current;
    if (!client?.connected || roomSubs.current.has(roomId)) return;
    const sub = client.subscribe(`/topic/room.${roomId}`, (frame) => {
      try {
        const message = { ...JSON.parse(frame.body), roomId } as ChatMessage;
        roomListeners.current.get(roomId)?.forEach((l) => l(message));
      } catch {}
    });
    roomSubs.current.set(roomId, sub);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const client = new Client({
      brokerURL: WS_URL,
      reconnectDelay: 3000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      // React Native WebSocket 호환 옵션
      forceBinaryWSFrames: true,
      appendMissingNULLonIncoming: true,
      beforeConnect: (c) => {
        c.connectHeaders = { Authorization: `Bearer ${session.getToken() ?? ''}` };
        setStatus('connecting');
      },
      onConnect: () => {
        setStatus('connected');
        roomSubs.current.clear();
        client.subscribe('/user/queue/notification', (frame) => {
          try {
            const n = JSON.parse(frame.body) as AppNotification;
            notificationListeners.current.forEach((l) => l(n));
          } catch {}
        });
        roomListeners.current.forEach((set, roomId) => {
          if (set.size) attachRoom(roomId);
        });
      },
      onStompError: () => setStatus('error'),
      onWebSocketError: () => setStatus('error'),
      onWebSocketClose: () => {
        roomSubs.current.clear();
      },
    });
    clientRef.current = client;
    client.activate();
    return () => {
      clientRef.current = null;
      roomSubs.current.clear();
      client.deactivate();
      setStatus('idle');
    };
  }, [enabled, attachRoom]);

  const subscribeRoom = useCallback(
    (roomId: number, listener: Listener<ChatMessage>) => {
      let set = roomListeners.current.get(roomId);
      if (!set) {
        set = new Set();
        roomListeners.current.set(roomId, set);
      }
      set.add(listener);
      attachRoom(roomId);
      return () => {
        set.delete(listener);
        if (set.size === 0) {
          roomSubs.current.get(roomId)?.unsubscribe();
          roomSubs.current.delete(roomId);
        }
      };
    },
    [attachRoom],
  );

  const onNotification = useCallback((listener: Listener<AppNotification>) => {
    notificationListeners.current.add(listener);
    return () => {
      notificationListeners.current.delete(listener);
    };
  }, []);

  const sendMessage = useCallback((roomId: number, content: string) => {
    const client = clientRef.current;
    if (!client?.connected) return false;
    client.publish({
      destination: '/app/chat.send',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ roomId, content }),
    });
    return true;
  }, []);

  // status 가 바뀌면 이미 등록된 방 리스너를 다시 붙인다 (재연결 대비)
  useEffect(() => {
    if (status === 'connected') roomListeners.current.forEach((set, id) => set.size && attachRoom(id));
  }, [status, attachRoom]);

  const value = useMemo(
    () => ({ status, subscribeRoom, onNotification, sendMessage }),
    [status, subscribeRoom, onNotification, sendMessage],
  );
  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used inside SocketProvider');
  return ctx;
}
