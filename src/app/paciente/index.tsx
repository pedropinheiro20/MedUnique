import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { CreditCard } from '@/components/patient';
import { Button, Card, H1, H3, Muted, Ring, Row, Screen, Txt, useToast } from '@/components/ui';
import { brl, careTasks, MES, num, plan, fmt } from '@/data/mock';
import { todayKey, useStore } from '@/state/store';
import { useColors } from '@/theme';

export default function Inicio() {
  const c = useColors();
  const toast = useToast();
  const { st, set, nextStep: n, doneCount, creditPlan, nextBoleto, boletoStatus } = useStore();
  const pct = Math.round((doneCount / plan.steps.length) * 100);
  const cred = creditPlan.get(n)!;
  const nb = nextBoleto;
  return (
    <Screen who="paciente">
      <View>
        <H1>Olá, Juliana!</H1>
        <Muted size={14}>Seu protocolo está {pct >= 50 ? 'passando da metade' : 'em andamento'}. Que bom ter você aqui.</Muted>
      </View>

      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 18 }}>
        <Ring pct={pct} label={`${pct}%`} sub={`${doneCount} de ${plan.steps.length} etapas`} />
        <View style={{ flex: 1, gap: 6 }}>
          <Muted size={12}>{plan.name}</Muted>
          <Muted size={14}>Fase atual: <Txt w="bold" size={14}>{plan.phases[n.phase]}</Txt></Muted>
          <Muted size={14}>Término previsto em {fmt(plan.end)}</Muted>
          <Button label="Ver jornada" variant="ghost" small style={{ alignSelf: 'flex-start' }} onPress={() => router.navigate('/paciente/plano')} />
        </View>
      </Card>

      <Card dark style={{ gap: 14 }}>
        <Row>
          <View style={{ minWidth: 56, alignItems: 'center', backgroundColor: c.nude, borderRadius: 16, paddingVertical: 8 }}>
            <Txt w="medium" size={26} color={c.onNude} style={{ lineHeight: 28 }}>{n.date.getDate()}</Txt>
            <Txt size={11} color={c.onNude}>{MES[n.date.getMonth()].toUpperCase()}</Txt>
          </View>
          <View style={{ flex: 1 }}>
            <Txt size={12} color={c.onNoir} style={{ opacity: 0.65 }}>Próxima sessão · {n.hour}</Txt>
            <H3 size={17} color={c.onNoir}>{n.title}</H3>
          </View>
        </Row>
        {cred.ok ? (
          <Row>
            {st.confirmed
              ? <Txt w="semibold" color={c.onNoir}>Presença confirmada ✓</Txt>
              : <Button label="Confirmar presença" onPress={() => { set((s) => ({ ...s, confirmed: true })); toast('Presença confirmada. Até lá!'); }} />}
            <Button label="Agenda" variant="ghostLight" onPress={() => router.navigate('/paciente/agenda')} />
          </Row>
        ) : (
          <>
            <Txt size={14} color={c.onNoir}>Faltam {num(cred.need!)} créditos para esta sessão. Pague o próximo boleto para liberar.</Txt>
            <Button label="Ver boletos" onPress={() => router.navigate('/paciente/contrato')} style={{ alignSelf: 'flex-start' }} />
          </>
        )}
      </Card>

      <CreditCard />

      <Row style={{ alignItems: 'stretch' }}>
        <Card style={{ flex: 1, gap: 4 }} onPress={() => router.navigate('/paciente/plano')}>
          <Muted size={12}>Meu plano</Muted>
          <Txt w="medium" size={28}>{doneCount}/{plan.steps.length}</Txt>
          <Muted>etapas concluídas</Muted>
        </Card>
        <Card style={{ flex: 1, gap: 4 }} onPress={() => router.navigate('/paciente/contrato')}>
          <Muted size={12}>Próximo boleto</Muted>
          <Txt w="medium" size={28}>{nb ? `${String(nb.due.getDate()).padStart(2, '0')}/${MES[nb.due.getMonth()]}` : 'Quitado'}</Txt>
          <Muted>{nb ? `${brl(nb.value)} · ${boletoStatus(nb) === 'vencido' ? 'vencido' : 'em aberto'}` : 'tudo pago'}</Muted>
        </Card>
      </Row>

      <Card>
        <Row between>
          <H3>Cuidados de hoje</H3>
          <Muted>{careTasks.filter((t) => st.care[todayKey + t.id]).length} de {careTasks.length}</Muted>
        </Row>
        {careTasks.map((t, i) => {
          const on = !!st.care[todayKey + t.id];
          return (
            <Pressable
              key={t.id}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              onPress={() => { set((s) => ({ ...s, care: { ...s.care, [todayKey + t.id]: !on } })); if (!on) toast('Cuidado registrado. Continue assim!'); }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: c.line }}>
              <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: on ? c.noir : c.muted, backgroundColor: on ? c.noir : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                {on ? <Txt w="bold" size={13} color={c.onNoir} style={{ lineHeight: 16 }}>✓</Txt> : null}
              </View>
              <Txt style={{ flex: 1 }}>{t.label}</Txt>
            </Pressable>
          );
        })}
      </Card>
    </Screen>
  );
}
