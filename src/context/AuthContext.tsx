import { createContext, useContext, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthCtx {
  session: Session | null;
  user: User | null;
  username: string | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({
  session: null, user: null, username: null, loading: true, signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) fetchUsername(data.session.user.id);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s) fetchUsername(s.user.id);
      else { setUsername(null); setLoading(false); }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchUsername(userId: string) {
    const { data } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', userId)
      .single();

    if (data?.username) {
      setUsername(data.username);
      setLoading(false);
      return;
    }

    // Profile missing (signup upsert failed before email verification) — create it now
    const { data: { user: authUser } } = await supabase.auth.getUser();
    const derivedUsername =
      authUser?.user_metadata?.username ??
      authUser?.email?.split('@')[0] ??
      'user';
    const derivedEmail = authUser?.email ?? '';
    await supabase.from('profiles').upsert({
      id: userId,
      username: derivedUsername,
      email: derivedEmail,
    });
    setUsername(derivedUsername);
    setLoading(false);
  }

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <Ctx.Provider value={{ session, user: session?.user ?? null, username, loading, signOut }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
