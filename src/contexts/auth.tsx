import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { getMyInfo, login } from '@/api/misc';
import { session, type User } from '@/lib/api';

type AuthState = {
  user: User | null;
  /** 저장된 세션 복원이 끝났는지 */
  ready: boolean;
  signIn: (empNo: string, password: string) => Promise<User>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    session.setOnExpired(() => setUser(null));
    session
      .load()
      .then((saved) => {
        setUser(saved);
        // 저장된 정보가 오래됐을 수 있으니 백그라운드에서 최신화
        if (saved) getMyInfo().then((fresh) => fresh && setUser({ ...saved, ...fresh })).catch(() => {});
      })
      .finally(() => setReady(true));
    return () => session.setOnExpired(null);
  }, []);

  const signIn = useCallback(async (empNo: string, password: string) => {
    const result = await login(empNo, password);
    await session.save(result.accessToken, result.refreshToken, result.user);
    setUser(result.user);
    return result.user;
  }, []);

  const signOut = useCallback(async () => {
    await session.clear();
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, ready, signIn, signOut }), [user, ready, signIn, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
