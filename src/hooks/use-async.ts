import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import { errorMessage } from '@/lib/api';

type Options = {
  /** 화면에 다시 포커스될 때 자동 새로고침 */
  refetchOnFocus?: boolean;
};

/**
 * 간단한 비동기 데이터 로더.
 * loading: 최초 로딩, refreshing: 당겨서 새로고침
 */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[], options: Options = {}) {
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const loadedOnce = useRef(false);
  const reqId = useRef(0);

  const run = useCallback(async (mode: 'initial' | 'refresh' | 'silent') => {
    const id = ++reqId.current;
    if (mode === 'initial') setLoading(true);
    if (mode === 'refresh') setRefreshing(true);
    try {
      const result = await fnRef.current();
      if (id !== reqId.current) return;
      setData(result);
      setError(null);
    } catch (e) {
      if (id !== reqId.current) return;
      setError(errorMessage(e));
    } finally {
      if (id === reqId.current) {
        setLoading(false);
        setRefreshing(false);
        loadedOnce.current = true;
      }
    }
  }, []);

  useEffect(() => {
    run('initial');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useFocusEffect(
    useCallback(() => {
      if (options.refetchOnFocus && loadedOnce.current) run('silent');
    }, [options.refetchOnFocus, run]),
  );

  const refresh = useCallback(() => run('refresh'), [run]);
  const reload = useCallback(() => run('silent'), [run]);

  return { data, setData, error, loading, refreshing, refresh, reload };
}
