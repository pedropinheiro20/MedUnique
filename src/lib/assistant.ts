import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

// Conversa com o assistente (Groq) pela função /api/chat da Vercel. A chave da IA fica só no servidor.
export type ChatAction = {
  id: string;
  type: 'agendar' | 'desmarcar' | 'feita' | 'baixa';
  label: string;
  patientId: string;
  stepId?: string;
  boletoId?: string;
  date?: string; // AAAA-MM-DD
  time?: string; // HH:MM
};
export type ChatMsg = { role: 'user' | 'assistant'; content: string; actions?: ChatAction[] };

// No navegador usa o mesmo endereço do site (inclusive nas prévias); no celular nativo, o site no ar.
const BASE = Platform.OS === 'web' ? '' : 'https://medunique.vercel.app';

export async function askAssistant(mode: 'paciente' | 'clinica', messages: ChatMsg[]): Promise<{ reply?: string; actions?: ChatAction[]; error?: string }> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return { error: 'Entre no sistema para usar o assistente.' };
  try {
    const r = await fetch(`${BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ mode, messages: messages.map((m) => ({ role: m.role, content: m.content })) }),
    });
    const j = await r.json().catch(() => null);
    if (!r.ok || !j) return { error: j?.error ?? 'O assistente não respondeu. Confira a conexão e tente de novo.' };
    return { reply: j.reply, actions: j.actions ?? [] };
  } catch {
    return { error: 'Sem conexão com o assistente. Confira a internet e tente de novo.' };
  }
}
