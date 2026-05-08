import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { getAuthMe, postAuthLogout, type AuthMeUser } from '@/lib/api';

interface AuthState {
  user: AuthMeUser | null;
  loading: boolean;
  /** Pass `{ silent: true }` after login to avoid a full-app loading flash. */
  refreshUser: (opts?: { silent?: boolean }) => Promise<void>;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthMeUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    try {
      const me = await getAuthMe();
      setUser(me);
    } catch {
      setUser(null);
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await postAuthLogout();
    let me: AuthMeUser | null = null;
    try {
      me = await getAuthMe();
    } catch {
      // Logout likely succeeded but /me could not be reached; clear client state.
      setUser(null);
      return;
    }
    if (me !== null) {
      throw new Error('Your session could not be cleared on the server. Please try again.');
    }
    setUser(null);
  }, []);

  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  const value = useMemo(
    () => ({ user, loading, refreshUser, logout }),
    [user, loading, refreshUser, logout]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
