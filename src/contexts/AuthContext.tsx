import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { isAllowedEmail } from '@/lib/allowedUsers';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

function rejectUnauthorized(email: string | null | undefined) {
  toast.error('승인되지 않은 계정입니다. 관리자에게 문의하세요.');
  // onAuthStateChange 데드락 방지
  setTimeout(() => {
    void supabase.auth.signOut();
  }, 0);
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      const email = nextSession?.user?.email;
      if (nextSession && !isAllowedEmail(email)) {
        setSession(null);
        setUser(null);
        setLoading(false);
        rejectUnauthorized(email);
        return;
      }
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session: current } }) => {
      const email = current?.user?.email;
      if (current && !isAllowedEmail(email)) {
        setSession(null);
        setUser(null);
        setLoading(false);
        rejectUnauthorized(email);
        return;
      }
      setSession(current);
      setUser(current?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>{children}</AuthContext.Provider>
  );
};
