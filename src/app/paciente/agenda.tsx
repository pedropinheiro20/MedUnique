import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { CreditChip, stepChip } from '@/components/patient';
import { Button, Card, H2, H3, Icon, Muted, Row, Screen, Sheet, StateView, Txt, useToast } from '@/components/ui';
import { MES, MESF, num, sameDay, Step, today } from '@/data/model';
import { useMyPlan } from '@/state/store';
import { useColors } from '@/theme';

export default function Agenda() {
  const c = useColors();
  const toast = useToast();
  const { plan, info, loading, error, reload, confirmStep } = useMyPlan();
  const TODAY = today();
  const [month, setMonth] = useState(new Date(TODAY.getFullYear(), TODAY.getMonth(), 1));
  const [resched, setResched] = useState(false);
  if (!plan || !info) return <StateView who="paciente" loading={loading} error={error} onRetry={reload} empty="Seu plano ainda não foi cadastrado pela clínica." />;
  const { creditPlan } = info;

  const first = month.getDay();
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];

  const row = (s: Step, i: number) => {
    const isNext = s.status === 'next' && creditPlan.get(s.id)?.ok;
    return (
      <View key={s.id} style={{ flexDirection: 'row', gap: 12, paddingVertical: 12, borderTopWidth: i ? 1 : 0, borderTopColor: c.line }}>
        <View style={{ width: 48 }}>
          <Txt w="medium" size={22} style={{ lineHeight: 24 }}>{s.date ? s.date.getDate() : '–'}</Txt>
          <Muted size={11}>{s.date ? MES[s.date.getMonth()] : 'a definir'}</Muted>
          <View style={{ position: 'absolute', right: 6, top: 6, width: 6, height: 6, borderRadius: 3, backgroundColor: c.rose }} />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Row between style={{ alignItems: 'flex-start' }}><Txt w="semibold" style={{ flex: 1 }}>{s.title}</Txt>{stepChip(s)}</Row>
          <Muted>{s.hour ? `${s.hour} · ` : ''}{s.price ? `${num(s.price)} créditos` : 'incluída'}</Muted>
          <CreditChip step={s} info={info} />
          {isNext ? (
            <Row style={{ flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
              {s.confirmed
                ? <Txt w="semibold" color={c.ok}>Presença confirmada</Txt>
                : <Button label="Confirmar presença" small onPress={async () => { const e = await confirmStep(s.id); toast(e ?? 'Presença confirmada. Até lá!'); }} />}
              <Button label="Reagendar" small variant="ghost" onPress={() => setResched(true)} />
            </Row>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <Screen who="paciente">
      <View><Muted size={12}>Agenda</Muted><H2>Suas sessões</H2></View>
      <Card>
        <Row between>
          <Pressable accessibilityLabel="Mês anterior" onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center' }}><Icon name="back" size={16} /></Pressable>
          <Txt w="bold">{MESF[month.getMonth()]} {month.getFullYear()}</Txt>
          <Pressable accessibilityLabel="Próximo mês" onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center' }}><Icon name="chevron" size={16} /></Pressable>
        </Row>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((x, i) => <View key={i} style={{ width: `${100 / 7}%`, alignItems: 'center' }}><Muted size={11}>{x}</Muted></View>)}
          {cells.map((day, i) => {
            if (!day) return <View key={i} style={{ width: `${100 / 7}%`, aspectRatio: 1 }} />;
            const dt = new Date(month.getFullYear(), month.getMonth(), day);
            const ev = plan.steps.find((s) => sameDay(s.date, dt));
            const isToday = dt.getTime() === TODAY.getTime();
            const bg = ev ? (ev.status === 'done' ? c.nude : c.noir) : 'transparent';
            const fg = ev ? (ev.status === 'done' ? c.onNude : c.onNoir) : c.ink;
            return (
              <View key={i} style={{ width: `${100 / 7}%`, aspectRatio: 1, padding: 3 }}>
                <View style={{ flex: 1, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: bg, borderWidth: isToday ? 1 : 0, borderStyle: 'dashed', borderColor: c.muted }}>
                  <Txt w={ev ? 'bold' : 'regular'} size={13} color={fg}>{day}</Txt>
                </View>
              </View>
            );
          })}
        </View>
      </Card>
      <Card style={{ gap: 0 }}><H3 style={{ marginBottom: 4 }}>Próximas</H3>{plan.steps.filter((s) => s.status !== 'done').map(row)}</Card>
      <Card style={{ gap: 0 }}><H3 style={{ marginBottom: 4 }}>Realizadas</H3>{plan.steps.filter((s) => s.status === 'done').reverse().map(row)}</Card>
      <Sheet
        visible={resched}
        onClose={() => setResched(false)}
        title="Reagendar sessão"
        text="Para reagendar, fale com a recepção da clínica pelo WhatsApp ou telefone. Pedidos com menos de 24 h de antecedência contam como falta, conforme o contrato."
      />
    </Screen>
  );
}
