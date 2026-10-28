import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import {
  BolState, Boleto, dayOf, initials, parseDate, Patient, Plan, Reward, Step, today, Voucher,
} from '@/data/model';
import { supabase } from '@/lib/supabase';

import { useAuth } from './auth';

// Dados do servidor. A paciente recebe só os próprios dados e a equipe recebe todos (regras do banco).

type Row = Record<string, any>;
type Raw = {
  patients: Row[]; plans: Row[]; steps: Row[]; boletos: Row[];
  points: Row[]; rewards: Row[]; vouchers: Row[];
};
const EMPTY: Raw = { patients: [], plans: [], steps: [], boletos: [], points: [], rewards: [], vouchers: [] };

export type CreditInfo = { ok: boolean; first?: boolean; need?: number };

// Regras de créditos e boletos de um plano
export function planInfo(p: Plan) {
  const t = today();
  const paidOf = (b: Boleto) => b.paidAt;
  const boletoStatus = (b: Boleto): BolState => {
    if (b.paidAt) return 'pago';
    if (b.proofSent) return 'analise';
    const days = Math.round((dayOf(b.due).getTime() - t.getTime()) / 864e5);
    if (days < 0) return 'vencido';
    return days <= 30 ? 'aberto' : 'futuro';
  };
  const daysTo = (b: Boleto) => Math.round((dayOf(b.due).getTime() - t.getTime()) / 864e5);
  const paid = p.boletos.filter((b) => b.paidAt);
  const paidCount = paid.length;
  const nextBoleto = p.boletos.find((b) => ['aberto', 'vencido', 'analise'].includes(boletoStatus(b)));
  const nextUnpaid = p.boletos.find((b) => !b.paidAt);

  const creditsIn = paid.reduce((a, b) => a + b.value, 0);
  const creditsUsed = p.steps.filter((s) => s.status === 'done').reduce((a, s) => a + s.price, 0);
  const credits = creditsIn - creditsUsed;
  // libera as próximas etapas em ordem enquanto houver saldo
  const creditPlan = new Map<string, CreditInfo>();
  let avail = credits;
  let blocked = false;
  for (const s of p.steps) {
    if (s.status === 'done') continue;
    if (!blocked && s.price <= avail) {
      avail -= s.price;
      creditPlan.set(s.id, { ok: true });
    } else {
      creditPlan.set(s.id, { ok: false, first: !blocked, need: s.price - (blocked ? 0 : avail) });
      blocked = true;
    }
  }
  const creditLedger = [
    ...paid.map((b) => ({ label: b.n === 1 ? 'Pagamento da entrada' : `Pagamento da parcela ${b.n - 1}`, date: b.paidAt!, v: b.value })),
    ...p.steps.filter((s) => s.status === 'done' && s.price > 0).map((s) => ({ label: s.title, date: s.date ?? t, v: -s.price })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  const nextStep = p.steps.find((s) => s.status === 'next') ?? null;
  const doneCount = p.steps.filter((s) => s.status === 'done').length;
  const nextOk = nextStep ? creditPlan.get(nextStep.id)!.ok : true;

  return {
    paidOf, boletoStatus, daysTo, paidCount, nextBoleto, nextUnpaid,
    creditsIn, creditsUsed, credits, creditPlan, creditLedger, nextStep, doneCount, nextOk,
  };
}
export type PlanInfo = ReturnType<typeof planInfo>;

function build(raw: Raw) {
  const patients: Patient[] = raw.patients.map((r) => ({
    id: r.id, profileId: r.profile_id, name: r.full_name, ini: initials(r.full_name),
    email: r.email, phone: r.phone, since: new Date(r.created_at), accessCode: r.access_code ?? '',
  })).sort((a, b) => a.name.localeCompare(b.name));

  const plans: Plan[] = raw.plans.map((r) => {
    const rows = raw.steps.filter((s) => s.plan_id === r.id && s.status !== 'cancelled').sort((a, b) => a.position - b.position);
    const firstOpen = rows.find((s) => s.status === 'scheduled');
    const steps: Step[] = rows.map((s) => {
      const at = parseDate(s.scheduled_at);
      return {
        id: s.id, planId: r.id, position: s.position, phase: s.phase, title: s.title, price: s.price_credits,
        date: at, hour: at ? `${String(at.getHours()).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')}` : '',
        status: s.status === 'done' || s.status === 'missed' ? 'done' : s === firstOpen ? 'next' : 'plan',
        what: s.what ?? '', care: s.care ?? [], confirmed: !!s.confirmed_at,
      };
    });
    const boletos: Boleto[] = raw.boletos.filter((b) => b.plan_id === r.id).sort((a, b) => a.number - b.number).map((b) => ({
      id: b.id, planId: r.id, n: b.number, due: parseDate(b.due_date)!, value: Number(b.amount),
      paidAt: parseDate(b.paid_at) ?? undefined, code: b.barcode, proofSent: !!b.proof_sent_at,
    }));
    return {
      id: r.id, patientId: r.patient_id, name: r.name, professional: r.professional ?? '', phases: r.phases ?? [],
      start: parseDate(r.start_date), end: parseDate(r.end_date), total: Number(r.total_value),
      contractNumber: r.contract_number, acceptedAt: parseDate(r.contract_accepted_at), steps, boletos,
      status: r.status as string,
    } as Plan & { status: string };
  });

  const rewards: Reward[] = raw.rewards.filter((r) => r.active).map((r) => ({ id: r.id, name: r.name, cost: r.cost_points }))
    .sort((a, b) => a.cost - b.cost);
  const vouchers: Voucher[] = raw.vouchers.map((v) => ({
    id: v.id, patientId: v.patient_id, code: v.code, date: new Date(v.created_at), used: !!v.used_at,
    name: raw.rewards.find((r) => r.id === v.reward_id)?.name ?? 'Recompensa',
  })).sort((a, b) => Number(a.used) - Number(b.used) || b.date.getTime() - a.date.getTime());
  const points = new Map<string, number>();
  raw.points.forEach((p) => points.set(p.patient_id, (points.get(p.patient_id) ?? 0) + p.delta));

  return { patients, plans, rewards, vouchers, points };
}

type Store = ReturnType<typeof build> & {
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  me: Patient | null; // cadastro de paciente ligado ao login
  planOf: (patientId: string) => Plan | null;
  pById: (id: string) => Patient | undefined;
  pPoints: (id: string) => number;
  // ações (gravam no servidor e recarregam)
  confirmStep: (stepId: string) => Promise<string | null>;
  sendProof: (boletoId: string) => Promise<string | null>;
  acceptContract: (planId: string) => Promise<string | null>;
  markPaid: (boletoId: string) => Promise<string | null>;
  registerStep: (stepId: string, patientId: string) => Promise<string | null>;
  addPoints: (patientId: string, delta: number, reason: string) => Promise<string | null>;
  redeem: (patientId: string, reward: Reward) => Promise<{ code?: string; error?: string }>;
  validateVoucher: (voucherId: string) => Promise<string | null>;
  createPatient: (v: { name: string; email: string; phone: string }) => Promise<{ id?: string; error?: string }>;
};

const Ctx = createContext<Store | null>(null);

const errText = (e: { message: string } | null) =>
  !e ? null : /Créditos insuficientes/.test(e.message) ? e.message : /duplicate|unique/i.test(e.message) ? 'Já existe um cadastro com esses dados.' : 'Não foi possível salvar. Confira a conexão e tente de novo.';

export function StoreProvider({ children }: { children: ReactNode }) {
  const { session, isStaff, ready } = useAuth();
  const [raw, setRaw] = useState<Raw>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const uid = session?.user.id ?? null;

  const reload = useCallback(async () => {
    if (!uid) { setRaw(EMPTY); setLoading(false); return; }
    setLoading(true);
    const q = <T,>(p: PromiseLike<{ data: T | null; error: { message: string } | null }>) => p;
    const [pa, pl, st, bo, po, rw, vo] = await Promise.all([
      q(supabase.from('patients').select('*')),
      q(supabase.from('plans').select('*').neq('status', 'cancelled').order('created_at')),
      q(supabase.from('plan_steps').select('*')),
      q(supabase.from('boletos').select('*')),
      isStaff ? q(supabase.from('points_ledger').select('patient_id, delta')) : Promise.resolve({ data: [], error: null }),
      isStaff ? q(supabase.from('rewards').select('*')) : Promise.resolve({ data: [], error: null }),
      isStaff ? q(supabase.from('vouchers').select('*')) : Promise.resolve({ data: [], error: null }),
    ]);
    const firstErr = [pa, pl, st, bo, po, rw, vo].find((r) => r.error)?.error ?? null;
    setError(firstErr ? 'Não foi possível carregar os dados. Confira a conexão.' : null);
    setRaw({
      patients: (pa.data as Row[]) ?? [], plans: (pl.data as Row[]) ?? [], steps: (st.data as Row[]) ?? [],
      boletos: (bo.data as Row[]) ?? [], points: (po.data as Row[]) ?? [], rewards: (rw.data as Row[]) ?? [],
      vouchers: (vo.data as Row[]) ?? [],
    });
    setLoading(false);
  }, [uid, isStaff]);

  useEffect(() => { if (ready) reload(); }, [ready, reload]);

  const value = useMemo<Store>(() => {
    const b = build(raw);
    const act = async (p: PromiseLike<{ error: { message: string } | null }>) => {
      const { error: e } = await p;
      if (!e) await reload();
      return errText(e);
    };
    return {
      ...b,
      loading,
      error,
      reload,
      me: b.patients.find((p) => p.profileId === uid) ?? null,
      // plano ativo mais recente da paciente
      planOf: (patientId) => {
        const list = b.plans.filter((p) => p.patientId === patientId);
        return list.find((p) => (p as Plan & { status: string }).status === 'active') ?? list[list.length - 1] ?? null;
      },
      pById: (id) => b.patients.find((p) => p.id === id),
      pPoints: (id) => b.points.get(id) ?? 0,
      confirmStep: (id) => act(supabase.rpc('confirm_step', { p_step: id })),
      sendProof: (id) => act(supabase.rpc('send_boleto_proof', { p_boleto: id, p_path: 'enviado-pelo-app' })),
      acceptContract: (id) => act(supabase.rpc('accept_contract', { p_plan: id })),
      markPaid: (id) => act(supabase.from('boletos').update({ paid_at: new Date().toISOString(), paid_by: uid }).eq('id', id)),
      registerStep: async (stepId, patientId) => {
        const { error: e } = await supabase.from('plan_steps').update({ status: 'done' }).eq('id', stepId);
        if (e) return errText(e);
        // cada sessão realizada rende 50 pontos de fidelidade
        await supabase.from('points_ledger').insert({ patient_id: patientId, delta: 50, reason: 'Sessão realizada', created_by: uid });
        await reload();
        return null;
      },
      addPoints: (patientId, delta, reason) =>
        act(supabase.from('points_ledger').insert({ patient_id: patientId, delta, reason, created_by: uid })),
      redeem: async (patientId, reward) => {
        const code = 'MU-' + Math.random().toString(36).slice(2, 6).toUpperCase();
        const v = await supabase.from('vouchers').insert({ patient_id: patientId, reward_id: reward.id, code });
        if (v.error) return { error: errText(v.error)! };
        await supabase.from('points_ledger').insert({ patient_id: patientId, delta: -reward.cost, reason: `Resgate: ${reward.name}`, created_by: uid });
        await reload();
        return { code };
      },
      validateVoucher: (id) => act(supabase.from('vouchers').update({ used_at: new Date().toISOString(), used_by: uid }).eq('id', id)),
      createPatient: async ({ name, email, phone }) => {
        const r = await supabase.from('patients')
          .insert({ full_name: name.trim(), email: email.trim().toLowerCase() || null, phone: phone.trim() || null })
          .select('id').single();
        if (r.error) return { error: errText(r.error)! };
        await reload();
        return { id: r.data.id as string };
      },
    };
  }, [raw, loading, error, reload, uid]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useStore fora do StoreProvider');
  return v;
}

// Plano da paciente logada, com as regras de créditos já calculadas
export function useMyPlan() {
  const s = useStore();
  const plan = s.me ? s.planOf(s.me.id) : null;
  return { ...s, plan, info: plan ? planInfo(plan) : null };
}
