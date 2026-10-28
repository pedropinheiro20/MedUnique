import type { Session } from '@supabase/supabase-js';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';

export type Role = 'patient' | 'admin' | 'reception' | 'finance' | 'professional';
export type Profile = { id: string; role: Role; full_name: string };

type Auth = {
  ready: boolean;
  session: Session | null;
  profile: Profile | null;
  isStaff: boolean;
  sendCode: (email: string) => Promise<string | null>;
  verifyCode: (email: string, code: string) => Promise<string | null>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<Auth | null>(null);

// Mensagens do Supabase em português para a tela de login.
function msg(e: { message: string; status?: number } | null) {
  if (!e) return null;
  if (e.status === 429 || /rate limit|security purposes/i.test(e.message)) return 'Muitas tentativas. Aguarde um minuto e tente de novo.';
  if (/expired|invalid/i.test(e.message)) return 'Código inválido ou vencido. Peça um novo código.';
  if (/email/i.test(e.message)) return 'Confira o e-mail digitado.';
  return 'Não foi possível entrar agora. Tente de novo em instantes.';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let alive = true;
    if (!session) { setProfile(null); setReady(true); return; }
    setReady(false);
    supabase.from('profiles').select('id, role, full_name').eq('id', session.user.id).maybeSingle()
      .then(({ data }) => { if (alive) { setProfile((data as Profile) ?? null); setReady(true); } });
    return () => { alive = false; };
  }, [session?.user.id]);

  const value: Auth = {
    ready,
    session,
    profile,
    isStaff: !!profile && profile.role !== 'patient',
    sendCode: async (email) => {
      const { error } = await supabase.auth.signInWithOtp({ email: email.trim().toLowerCase(), options: { shouldCreateUser: true } });
      return msg(error);
    },
    verifyCode: async (email, code) => {
      const { error } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: code.trim(), type: 'email' });
      return msg(error);
    },
    signOut: async () => { await supabase.auth.signOut(); },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth fora do AuthProvider');
  return v;
}
