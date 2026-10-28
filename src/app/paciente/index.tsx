import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { CreditCard } from '@/components/patient';
import { Button, Card, H1, H3, Muted, Ring, Row, Screen, StateView, Txt, useToast } from '@/components/ui';
import { brl, careTasks, firstName, fmt, MES, num } from '@/data/model';
import { useMyPlan } from '@/state/store';
import { useColors } from '@/theme';

export default function Inicio() {
  const c = useColors();
  const toast = useToast();
  const { plan, info, me, loading, error, reload, confirmStep } = useMyPlan();
  const [care, setCare] = useState<Record<string, boolean>>({});
  if (!plan || !info) {
    return <StateView who="paciente" loading={loading} error={error} onRetry={reload}
      empty={me ? 'Seu plano ainda não foi cadastrado pela clínica. Assim que for, ele aparece aqui.' : 'Não encontramos um cadastro de paciente com o seu e-mail. Fale com a recepção da clínica.'} />;
  }
  const { nextStep: n, doneCount, creditPlan, nextBoleto: nb, boletoStatus } = info;
  const total = plan.steps.length;
  const pct = total ? Math.round((doneCount / total) * 100) : 0;
  const cred = n ? creditPlan.get(n.id)! : null;
  return (
    <Screen who="paciente">
      <View>
        <H1>Olá, {firstName(me!.name)}!</H1>
        <Muted size={14}>Seu protocolo está {pct >= 50 ? 'passando da metade' : 'em andamento'}. Que bom ter você aqui.</Muted>
      </View>

      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 18 }}>
        <Ring pct={pct} label={`${pct}%`} sub={`${doneCount} de ${total} etapas`} />
        <View style={{ flex: 1, gap: 6 }}>
          <Muted size={12}>{plan.name}</Muted>
          {n && plan.phases[n.phase] ? <Muted size={14}>Fase atual: <Txt w="bold" size={14}>{plan.phases[n.phase]}</Txt></Muted> : null}
          {plan.end ? <Muted size={14}>Término previsto em {fmt(plan.end)}</Muted> : null}
          <Button label="Ver jornada" variant="ghost" small style={{ alignSelf: 'flex-start' }} onPress={() => router.navigate('/paciente/plano')} />
        </View>
      </Card>

      {n ? (
        <Card dark style={{ gap: 14 }}>
          <Row>
            {n.date ? (
              <View style={{ minWidth: 56, alignItems: 'center', backgroundColor: c.nude, borderRadius: 16, paddingVertical: 8 }}>
                <Txt w="medium" size={26} color={c.onNude} style={{ lineHeight: 28 }}>{n.date.getDate()}</Txt>
                <Txt size={11} color={c.onNude}>{MES[n.date.getMonth()].toUpperCase()}</Txt>
              </View>
            ) : null}
            <View style={{ flex: 1 }}>
              <Txt size={12} color={c.onNoir} style={{ opacity: 0.65 }}>Próxima sessão{n.hour ? ` · ${n.hour}` : ''}</Txt>
              <H3 size={17} color={c.onNoir}>{n.title}</H3>
            </View>
          </Row>
          {cred?.ok ? (
            <Row>
              {n.confirmed
                ? <Txt w="semibold" color={c.onNoir}>Presença confirmada ✓</Txt>
                : <Button label="Confirmar presença" onPress={async () => { const e = await confirmStep(n.id); toast(e ?? 'Presença confirmada. Até lá!'); }} />}
              <Button label="Agenda" variant="ghostLight" onPress={() => router.navigate('/paciente/agenda')} />
            </Row>
          ) : (
            <>
              <Txt size={14} color={c.onNoir}>Faltam {num(cred?.need ?? 0)} créditos para esta sessão. Pague o próximo boleto para liberar.</Txt>
              <Button label="Ver boletos" onPress={() => router.navigate('/paciente/contrato')} style={{ alignSelf: 'flex-start' }} />
            </>
          )}
        </Card>
      ) : null}

      <CreditCard plan={plan} info={info} />

      <Row style={{ alignItems: 'stretch' }}>
        <Card style={{ flex: 1, gap: 4 }} onPress={() => router.navigate('/paciente/plano')}>
          <Muted size={12}>Meu plano</Muted>
          <Txt w="medium" size={28}>{doneCount}/{total}</Txt>
          <Muted>etapas concluídas</Muted>
        </Card>
        <Card style={{ flex: 1, gap: 4 }} onPress={() => router.navigate('/paciente/contrato')}>
          <Muted size={12}>Próximo boleto</Muted>
          <Txt w="medium" size={28}>{nb ? `${String(nb.due.getDate()).padStart(2, '0')}/${MES[nb.due.getMonth()]}` : 'Em dia'}</Txt>
          <Muted>{nb ? `${brl(nb.value)} · ${boletoStatus(nb) === 'vencido' ? 'vencido' : 'em aberto'}` : 'nada a pagar agora'}</Muted>
        </Card>
      </Row>

      <Card>
        <Row between>
          <H3>Cuidados de hoje</H3>
          <Muted>{careTasks.filter((t) => care[t.id]).length} de {careTasks.length}</Muted>
        </Row>
        {careTasks.map((t, i) => {
          const on = !!care[t.id];
          return (
            <Pressable
              key={t.id}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              onPress={() => { setCare((s) => ({ ...s, [t.id]: !on })); if (!on) toast('Cuidado registrado. Continue assim!'); }}
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
