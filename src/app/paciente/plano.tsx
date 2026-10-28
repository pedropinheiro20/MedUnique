import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { CreditChip, stepChip } from '@/components/patient';
import { Bar, Card, H2, H3, Muted, Row, Screen, StateView, Txt } from '@/components/ui';
import { fmt, num } from '@/data/model';
import { useMyPlan } from '@/state/store';
import { useColors } from '@/theme';

export default function Plano() {
  const c = useColors();
  const { plan, info, loading, error, reload } = useMyPlan();
  const [open, setOpen] = useState<number | null>(null);
  if (!plan || !info) return <StateView who="paciente" loading={loading} error={error} onRetry={reload} empty="Seu plano ainda não foi cadastrado pela clínica." />;
  const { doneCount } = info;
  const total = plan.steps.length;
  const byPhase = plan.phases.map((_, i) => {
    const s = plan.steps.filter((x) => x.phase === i);
    return s.length ? (s.filter((x) => x.status === 'done').length / s.length) * 100 : 0;
  });
  const badges: [string, boolean, string][] = [
    ['Início', doneCount >= 1, '1ª etapa'], ['Metade', total > 0 && doneCount >= Math.ceil(total / 2), '50% do plano'],
    ['Assídua', doneCount >= 4, '4 presenças'], ['Completo', total > 0 && doneCount >= total, 'Plano concluído'],
  ];
  return (
    <Screen who="paciente">
      <View>
        <Muted size={12}>Meu plano</Muted>
        <H2>{plan.name}</H2>
        {plan.professional ? <Muted size={14}>{plan.professional}</Muted> : null}
      </View>

      {plan.phases.length ? <Card>
        <Row style={{ gap: 6 }}>{byPhase.map((p, i) => <View key={i} style={{ flex: 1 }}><Bar pct={p} color={[c.rose, c.wine, c.muted][i % 3]} /></View>)}</Row>
        <Row style={{ gap: 6 }}>{plan.phases.map((p) => <Muted key={p} size={12} style={{ flex: 1 }}>{p}</Muted>)}</Row>
      </Card> : null}

      <Card style={{ gap: 0 }}>
        <Row between style={{ marginBottom: 6 }}><H3>Sua jornada</H3><Muted size={12}>Toque numa etapa</Muted></Row>
        {plan.steps.map((s, i) => {
          const done = s.status === 'done';
          const next = s.status === 'next';
          return (
            <View key={s.id} style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ alignItems: 'center', width: 24 }}>
                <View style={{ width: 2, flex: 1, backgroundColor: i ? c.line : 'transparent' }} />
                <View style={{ width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: done ? c.noir : c.surface, borderWidth: 1.5, borderColor: done ? c.noir : next ? c.rose : c.line }}>
                  <Txt w="bold" size={11} color={done ? c.onNoir : next ? c.wine : c.muted}>{done ? '✓' : i + 1}</Txt>
                </View>
                <View style={{ width: 2, flex: 1, backgroundColor: i < plan.steps.length - 1 ? c.line : 'transparent' }} />
              </View>
              <View style={{ flex: 1, paddingVertical: 10 }}>
                <Pressable onPress={() => setOpen(open === i ? null : i)} accessibilityRole="button" accessibilityState={{ expanded: open === i }}>
                  <Row between style={{ alignItems: 'flex-start' }}>
                    <Txt w="semibold" style={{ flex: 1 }}>{s.title}</Txt>
                    {stepChip(s)}
                  </Row>
                  <Muted>{s.date ? `${fmt(s.date)} · ${s.hour} · ` : 'Data a definir · '}{s.price ? `${num(s.price)} créditos` : 'incluída'}</Muted>
                  {!done ? <View style={{ marginTop: 4 }}><CreditChip step={s} info={info} /></View> : null}
                </Pressable>
                {open === i ? (
                  <View style={{ backgroundColor: c.sunk, borderRadius: 12, padding: 14, marginTop: 8, gap: 4 }}>
                    <Txt w="bold" size={14}>O que acontece</Txt>
                    <Txt size={14}>{s.what || 'A clínica vai detalhar esta etapa.'}</Txt>
                    {s.care.length ? <Txt w="bold" size={14} style={{ marginTop: 6 }}>Cuidados</Txt> : null}
                    {s.care.map((x) => <Txt key={x} size={14}>• {x}</Txt>)}
                  </View>
                ) : null}
              </View>
            </View>
          );
        })}
      </Card>

      <Card>
        <H3>Conquistas</H3>
        <Row style={{ alignItems: 'flex-start' }}>
          {badges.map(([n, on, t]) => (
            <View key={n} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
              <View style={{ width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? c.wineSoft : c.sunk, borderWidth: 1, borderColor: on ? c.wine : c.line, borderStyle: on ? 'solid' : 'dashed' }}>
                <Txt size={22} color={on ? c.wine : c.muted}>{on ? '★' : '☆'}</Txt>
              </View>
              <Txt w="bold" size={11} color={on ? c.ink : c.muted}>{n}</Txt>
              <Muted size={11} style={{ textAlign: 'center' }}>{t}</Muted>
            </View>
          ))}
        </Row>
      </Card>
    </Screen>
  );
}
