import { router } from 'expo-router';
import { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { BolState, fmt, MES, Patient, Plan, sameDay } from '@/data/model';
import { planInfo, PlanInfo, useStore } from '@/state/store';
import { useColors } from '@/theme';

import { Avatar, Chev, Muted, Txt } from './ui';

export type Summary = {
  p: Patient; plan: Plan | null; info: PlanInfo | null;
  done: number; total: number; next: string | null; credOk: boolean;
  bol: { s: BolState | null; info: string };
};

// Resumo de cada paciente para as telas da clínica
export function useSummaries() {
  const { patients, planOf } = useStore();
  const one = (p: Patient): Summary => {
    const plan = planOf(p.id);
    const info = plan ? planInfo(plan) : null;
    const n = info?.nextStep;
    const nb = info?.nextBoleto;
    let bol: Summary['bol'] = { s: null, info: plan ? 'Sem boletos em aberto' : 'Sem plano ativo' };
    if (plan && info) {
      if (nb) {
        const label = nb.n === 1 ? 'Entrada' : `Parcela ${nb.n - 1}`;
        const s = info.boletoStatus(nb);
        bol = { s, info: s === 'vencido' ? `${label} venceu em ${fmt(nb.due).slice(0, 5)}` : s === 'analise' ? `${label}: comprovante enviado` : `${label} vence em ${fmt(nb.due).slice(0, 5)}` };
      } else if (info.nextUnpaid) {
        const u = info.nextUnpaid;
        bol = { s: 'futuro', info: `${u.n === 1 ? 'Entrada' : `Parcela ${u.n - 1}`} vence em ${fmt(u.due).slice(0, 5)}` };
      } else if (plan.boletos.length) bol = { s: 'pago', info: 'Todas as parcelas pagas' };
    }
    return {
      p, plan, info,
      done: info?.doneCount ?? 0, total: plan?.steps.length ?? 0,
      next: n?.date ? `${String(n.date.getDate()).padStart(2, '0')}/${MES[n.date.getMonth()]} · ${n.hour}` : null,
      credOk: info ? info.nextOk : true,
      bol,
    };
  };
  return { all: patients.map(one), one };
}

// Sessões agendadas de todas as pacientes, em ordem de horário
export function useClinicAgenda() {
  const { plans } = useStore();
  const steps = plans.flatMap((p) => p.steps.filter((s) => s.status !== 'done' && s.date).map((s) => ({ s, patientId: p.patientId })));
  steps.sort((a, b) => a.s.date!.getTime() - b.s.date!.getTime());
  return (day: Date) => steps.filter((x) => sameDay(x.s.date, day));
}

// Linha de lista no estilo do modelo: horário ou avatar, nome, detalhe e seta rosa.
export function ListRow({ time, patient, title, detail, right, onPress }: {
  time?: string; patient?: Patient | null; title: string; detail?: ReactNode; right?: ReactNode; onPress?: () => void;
}) {
  const c = useColors();
  const press = onPress ?? (patient ? () => router.push(`/ficha/${patient.id}`) : undefined);
  return (
    <Pressable
      disabled={!press}
      onPress={press}
      style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: c.surface, borderRadius: 18, paddingVertical: 12, paddingHorizontal: 14 }, pressed && { opacity: 0.85 }]}>
      {time ? (
        <View style={{ minWidth: 50 }}>
          <Txt w="medium" size={15}>{time}</Txt>
          <View style={{ position: 'absolute', right: 4, top: 2, width: 5, height: 5, borderRadius: 3, backgroundColor: c.rose }} />
        </View>
      ) : (
        <Avatar ini={patient?.ini ?? '+'} />
      )}
      <View style={{ flex: 1, gap: 2 }}>
        <Txt w="semibold">{title}</Txt>
        {typeof detail === 'string' ? <Muted>{detail}</Muted> : detail}
      </View>
      {right}
      {press && !right ? <Chev /> : null}
    </Pressable>
  );
}

export function NoCredit({ ok }: { ok: boolean }) {
  const c = useColors();
  if (ok) return null;
  return <Txt w="bold" size={13} color={c.wine}> · sem créditos</Txt>;
}
