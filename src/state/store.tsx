import { createContext, ReactNode, useContext, useMemo, useState } from 'react';

import {
  BolState, Boleto, boletos, careTasks, catalog, Patient, patients as seedPatients, plan, seedVouchers, Step, TODAY, fmt,
} from '@/data/mock';

// Estado do protótipo em memória. No app final vem da API e é compartilhado entre paciente e clínica.
type State = {
  paid: Record<number, boolean>; // boletos baixados pela clínica
  proof: Record<number, boolean>; // comprovantes enviados pela paciente
  confirmed: boolean;
  rescheduled: boolean;
  care: Record<string, boolean>;
  bonus: Record<string, number>; // pontos lançados/descontados pela clínica
  finOk: Record<string, boolean>; // pagamentos confirmados de outras pacientes
  used: Record<string, boolean>; // vouchers validados
  extraVouchers: { who: string; name: string; code: string; date: string }[];
  newPatients: Patient[];
};

const initial: State = {
  paid: {}, proof: {}, confirmed: false, rescheduled: false, care: {}, bonus: {}, finOk: {}, used: {},
  extraVouchers: [], newPatients: [],
};

export const todayKey = fmt(TODAY);

function derive(st: State) {
  const paidOf = (b: Boleto) => b.paidAt ?? (st.paid[b.n] ? TODAY : undefined);
  const boletoStatus = (b: Boleto): BolState => {
    if (paidOf(b)) return 'pago';
    if (st.proof[b.n]) return 'analise';
    const days = Math.round((b.due.getTime() - TODAY.getTime()) / 864e5);
    if (days < 0) return 'vencido';
    return days <= 30 ? 'aberto' : 'futuro';
  };
  const daysTo = (b: Boleto) => Math.round((b.due.getTime() - TODAY.getTime()) / 864e5);
  const paidCount = boletos.filter((b) => paidOf(b)).length;
  const nextBoleto = boletos.find((b) => ['aberto', 'vencido', 'analise'].includes(boletoStatus(b)));
  const nextUnpaid = boletos.find((b) => !paidOf(b));

  // créditos: cada R$ 1,00 pago vira 1 crédito; cada etapa realizada consome o seu valor
  const creditsIn = boletos.filter((b) => paidOf(b)).reduce((a, b) => a + b.value, 0);
  const creditsUsed = plan.steps.filter((s) => s.status === 'done').reduce((a, s) => a + s.price, 0);
  const credits = creditsIn - creditsUsed;
  // libera as próximas etapas em ordem enquanto houver saldo
  const creditPlan = new Map<Step, { ok: boolean; first?: boolean; need?: number }>();
  let avail = credits;
  let blocked = false;
  for (const s of plan.steps) {
    if (s.status === 'done') continue;
    if (!blocked && s.price <= avail) {
      avail -= s.price;
      creditPlan.set(s, { ok: true });
    } else {
      creditPlan.set(s, { ok: false, first: !blocked, need: s.price - (blocked ? 0 : avail) });
      blocked = true;
    }
  }
  const creditLedger = [
    ...boletos.filter((b) => paidOf(b)).map((b) => ({
      label: b.n === 1 ? 'Pagamento da entrada' : `Pagamento da parcela ${b.n - 1}`,
      date: paidOf(b)!, v: b.value,
    })),
    ...plan.steps.filter((s) => s.status === 'done' && s.price > 0).map((s) => ({ label: s.title, date: s.date, v: -s.price })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  const nextStep = plan.steps.find((s) => s.status === 'next')!;
  const doneCount = plan.steps.filter((s) => s.status === 'done').length;

  // pontos (só a clínica vê)
  const vouchers = [...seedVouchers, ...st.extraVouchers.map((v) => ({ ...v, used: false }))].map((v) => ({
    ...v, used: v.used || !!st.used[v.code],
  }));
  const jpPoints =
    500 + doneCount * 50 + 85 +
    careTasks.filter((t) => st.care[todayKey + t.id]).reduce((a, t) => a + t.pts, 0) +
    (st.confirmed ? 20 : 0) - 300 + (st.bonus.jp ?? 0);

  const allPatients = [...seedPatients, ...st.newPatients];
  const pById = (id: string) => allPatients.find((p) => p.id === id)!;
  const pPoints = (p: Patient) => (p.id === 'jp' ? jpPoints : (p.points ?? 500) + (st.bonus[p.id] ?? 0));
  const pCred = (p: Patient) => (p.id === 'jp' ? credits : (p.cred ?? 0) + (p.bol && st.finOk[p.id] ? 650 : 0));
  const pCredOk = (p: Patient) => {
    if (p.id === 'jp') return creditPlan.get(nextStep)!.ok;
    return !p.needCred || pCred(p) >= p.needCred;
  };
  const pBol = (p: Patient): { s: BolState | null; info: string; n?: number; value?: number } => {
    if (p.id === 'jp') {
      if (!nextBoleto) return { s: 'pago', info: 'Todas as parcelas pagas' };
      const label = nextBoleto.n === 1 ? 'Entrada' : `Parcela ${nextBoleto.n - 1}`;
      return { s: boletoStatus(nextBoleto), info: `${label} vence em ${fmt(nextBoleto.due).slice(0, 5)}`, n: nextBoleto.n, value: nextBoleto.value };
    }
    if (p.bol && st.finOk[p.id]) return { s: 'pago', info: 'Pagamento confirmado hoje' };
    return p.bol ? { s: p.bol, info: p.bolInfo! } : { s: null, info: p.pay === 'Boleto' ? 'Em dia' : `Pagamento via ${p.pay.toLowerCase()}` };
  };
  const received = 31450 + Object.keys(st.finOk).length * 650 +
    Object.keys(st.paid).reduce((a, n) => a + boletos[Number(n) - 1].value, 0);

  return {
    paidOf, boletoStatus, daysTo, paidCount, nextBoleto, nextUnpaid,
    creditsIn, creditsUsed, credits, creditPlan, creditLedger, nextStep, doneCount,
    vouchers, allPatients, pById, pPoints, pCred, pCredOk, pBol, received,
  };
}

type Store = { st: State; set: (fn: (s: State) => State) => void } & ReturnType<typeof derive> & {
  redeem: (patientId: string, rewardId: string) => string;
};

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [st, setSt] = useState<State>(initial);
  const value = useMemo<Store>(() => {
    const dv = derive(st);
    return {
      st,
      set: (fn) => setSt(fn),
      ...dv,
      redeem: (patientId, rewardId) => {
        const c = catalog.find((k) => k.id === rewardId)!;
        const code = 'MU-' + Math.random().toString(36).slice(2, 6).toUpperCase();
        setSt((s) => ({
          ...s,
          bonus: { ...s.bonus, [patientId]: (s.bonus[patientId] ?? 0) - c.cost },
          extraVouchers: [...s.extraVouchers, { who: patientId, name: c.name, code, date: todayKey }],
        }));
        return code;
      },
    };
  }, [st]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useStore fora do StoreProvider');
  return v;
}
