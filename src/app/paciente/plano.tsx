import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { CreditChip, stepChip } from '@/components/patient';
import { Bar, Card, H2, H3, Muted, Row, Screen, Txt } from '@/components/ui';
import { fmt, num, plan } from '@/data/mock';
import { useStore } from '@/state/store';
import { useColors } from '@/theme';

export default function Plano() {
  const c = useColors();
  const { doneCount } = useStore();
  const [open, setOpen] = useState<number | null>(null);
  const byPhase = plan.phases.map((_, i) => {
    const s = plan.steps.filter((x) => x.phase === i);
    return (s.filter((x) => x.status === 'done').length / s.length) * 100;
  });
  const badges: [string, boolean, string][] = [
    ['Início', doneCount >= 1, '1ª etapa'], ['Metade', doneCount >= 5, '50% do plano'],
    ['Assídua', doneCount >= 4, '4 presenças'], ['Completo', doneCount >= 9, 'Plano concluído'],
  ];
  return (
    <Screen who="paciente">
      <View>
        <Muted size={12}>Meu plano</Muted>
        <H2>{plan.name}</H2>
        <Muted size={14}>{plan.professional}</Muted>
      </View>

      <Card>
        <Row style={{ gap: 6 }}>{byPhase.map((p, i) => <View key={i} style={{ flex: 1 }}><Bar pct={p} color={[c.rose, c.wine, c.muted][i]} /></View>)}</Row>
        <Row style={{ gap: 6 }}>{plan.phases.map((p) => <Muted key={p} size={12} style={{ flex: 1 }}>{p}</Muted>)}</Row>
      </Card>

      <Card style={{ gap: 0 }}>
        <Row between style={{ marginBottom: 6 }}><H3>Sua jornada</H3><Muted size={12}>Toque numa etapa</Muted></Row>
        {plan.steps.map((s, i) => {
          const done = s.status === 'done';
          const next = s.status === 'next';
          return (
            <View key={i} style={{ flexDirection: 'row', gap: 12 }}>
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
                  <Muted>{fmt(s.date)} · {s.hour} · {s.price ? `${num(s.price)} créditos` : 'incluída'}</Muted>
                  {!done ? <View style={{ marginTop: 4 }}><CreditChip step={s} /></View> : null}
                </Pressable>
                {open === i ? (
                  <View style={{ backgroundColor: c.sunk, borderRadius: 12, padding: 14, marginTop: 8, gap: 4 }}>
                    <Txt w="bold" size={14}>O que acontece</Txt>
                    <Txt size={14}>{s.what}</Txt>
                    <Txt w="bold" size={14} style={{ marginTop: 6 }}>Cuidados</Txt>
                    {s.care.map((x) => <Txt key={x} size={14}>• {x}</Txt>)}
                  </View>
                ) : null}
              </View>
            </View>
          );
        })}
      </Card>

      <Card>
        <View>
          <H3>Sua evolução</H3>
          <Muted>Escala de 0 a 100 da avaliação clínica. Barra escura: hoje · marca: meta</Muted>
        </View>
        {plan.metrics.map((m) => (
          <View key={m.name} style={{ gap: 4 }}>
            <Row between><Txt size={13}>{m.name}</Txt><Muted>{m.base} → <Txt w="bold" size={13}>{m.now}</Txt> / meta {m.goal}</Muted></Row>
            <View>
              <Bar pct={m.now} color={c.noir} height={10} />
              <View style={{ position: 'absolute', left: `${m.goal}%`, top: 0, bottom: 0, width: 2, backgroundColor: c.wine }} />
            </View>
          </View>
        ))}
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
