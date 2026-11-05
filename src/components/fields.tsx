import { useEffect, useState } from 'react';
import { TextInput, TextInputProps, View } from 'react-native';

import { supabase } from '@/lib/supabase';
import { Fonts, useColors } from '@/theme';

import { Muted } from './ui';

// Campo com rótulo, no estilo dos formulários do app
export function Field({ label, hint, style, ...props }: TextInputProps & { label: string; hint?: string }) {
  const c = useColors();
  return (
    <View style={{ gap: 4, flexGrow: 1, flexShrink: 1, flexBasis: 'auto', minWidth: 140 }}>
      <Muted size={12}>{label}</Muted>
      <TextInput placeholderTextColor={c.muted} accessibilityLabel={label} {...props}
        style={[{ backgroundColor: c.sunk, borderRadius: 12, paddingVertical: 11, paddingHorizontal: 12, fontFamily: Fonts.regular, fontSize: 15, color: c.ink }, style]} />
      {hint ? <Muted size={11}>{hint}</Muted> : null}
    </View>
  );
}

// ---------- datas, horas e valores digitados (formato brasileiro)
export const maskDate = (t: string) => {
  const d = t.replace(/\D/g, '').slice(0, 8);
  return [d.slice(0, 2), d.slice(2, 4), d.slice(4)].filter(Boolean).join('/');
};
export const maskTime = (t: string) => {
  const d = t.replace(/\D/g, '').slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}:${d.slice(2)}` : d;
};
export function parseBRDate(s: string): Date | null {
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  return d.getDate() === Number(m[1]) && d.getMonth() === Number(m[2]) - 1 ? d : null;
}
export function parseTime(s: string): [number, number] | null {
  const m = s.match(/^(\d{2}):(\d{2})$/);
  if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) return null;
  return [Number(m[1]), Number(m[2])];
}
export const isoDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const brDate = (d: Date) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
// "1.234,56" ou "1234.56" → 1234.56
export function parseMoney(s: string): number | null {
  const t = s.replace(/[^\d,.]/g, '');
  if (!t) return null;
  const norm = t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t;
  const v = Number(norm);
  return Number.isFinite(v) ? Math.round(v * 100) / 100 : null;
}
export const money = (v: number) => v.toFixed(2).replace('.', ',');

// Tabela de procedimentos da clínica (só os ativos, com preço)
export type Procedure = { id: string; name: string; price: number };
export function useProcedures() {
  const [list, setList] = useState<Procedure[]>([]);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    supabase.from('procedures').select('id, name, price_credits').eq('active', true).order('name').then(({ data, error }) => {
      if (!alive) return;
      setFailed(!!error);
      setList(((data as { id: string; name: string; price_credits: number }[]) ?? []).map((r) => ({ id: r.id, name: r.name, price: r.price_credits })));
    });
    return () => { alive = false; };
  }, []);
  return { list, failed };
}

// Busca sem acento e sem diferença de maiúsculas
export const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
