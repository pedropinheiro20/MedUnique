import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { BoletoCard, CreditCard } from '@/components/patient';
import { Button, Card, Chev, Chip, H2, H3, Icon, Muted, Row, Screen, StateView, Txt, useToast } from '@/components/ui';
import { brl, contractClauses, fmt, hhmm } from '@/data/model';
import { useMyPlan } from '@/state/store';
import { Fonts, useColors } from '@/theme';

export default function Contrato() {
  const c = useColors();
  const toast = useToast();
  const { plan, info, me, loading, error, reload, acceptContract } = useMyPlan();
  const [open, setOpen] = useState<number | null>(null);
  if (!plan || !info) return <StateView who="paciente" loading={loading} error={error} onRetry={reload} empty="Seu contrato aparece aqui quando a clínica cadastrar o seu plano." />;
  const { paidCount, nextUnpaid } = info;
  const boletos = plan.boletos;
  const rest = boletos.filter((b) => !b.paidAt).reduce((a, b) => a + b.value, 0);
  const kv: [string, string][] = [
    ['Valor total', brl(plan.total)],
    ['Forma de pagamento', 'Boleto bancário'], ['Boletos pagos', `${paidCount} de ${boletos.length}`],
    ['Próximo vencimento', nextUnpaid ? fmt(nextUnpaid.due) : '—'], ['Saldo a pagar', brl(rest)],
  ];
  const clauses = contractClauses(plan);
  return (
    <Screen who="paciente">
      <View>{plan.contractNumber ? <Muted size={12}>Contrato nº {plan.contractNumber}</Muted> : null}<H2>{plan.name}</H2></View>
      <Card>
        <Row between>
          <Chip label={plan.acceptedAt ? 'Aceito e vigente' : 'Aguardando seu aceite'} tone={plan.acceptedAt ? 'ok' : 'next'} />
          {plan.start ? <Muted>{fmt(plan.start)}{plan.end ? ` a ${fmt(plan.end)}` : ''}</Muted> : null}
        </Row>
        {kv.map(([k, v]) => <Row between key={k}><Muted size={14}>{k}</Muted><Txt w="semibold">{v}</Txt></Row>)}
        {boletos.length ? <Row style={{ gap: 3 }}>{boletos.map((b) => <View key={b.id} style={{ flex: b.n === 1 && boletos.length > 1 ? 2 : 1, height: 22, borderRadius: 4, backgroundColor: b.paidAt ? c.noir : c.sunk }} />)}</Row> : null}
      </Card>

      <Card onPress={() => router.push('/contrato-pdf')} style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <View style={{ width: 46, height: 54, borderRadius: 10, backgroundColor: c.noir, alignItems: 'center', justifyContent: 'center', gap: 1 }}>
          <Icon name="doc" size={20} color={c.onNoir} stroke={1.6} />
          <Txt w="bold" size={9} color={c.onNoir}>PDF</Txt>
        </View>
        <View style={{ flex: 1 }}>
          <Txt w="semibold">Contrato completo</Txt>
          <Muted>{plan.contractNumber ? `Nº ${plan.contractNumber}` : 'Documento do seu plano'}</Muted>
        </View>
        <Chev />
      </Card>

      <CreditCard plan={plan} info={info} full />
      <BoletoCard plan={plan} info={info} />

      <Card style={{ gap: 0 }}>
        <H3 style={{ marginBottom: 6 }}>Cláusulas em linguagem simples</H3>
        {clauses.map(([t, p], i) => (
          <View key={t} style={{ borderTopWidth: i ? 1 : 0, borderTopColor: c.line, paddingVertical: 12 }}>
            <Pressable onPress={() => setOpen(open === i ? null : i)} accessibilityRole="button" accessibilityState={{ expanded: open === i }}>
              <Row between><Txt w="semibold">{t}</Txt><Muted size={18}>{open === i ? '–' : '+'}</Muted></Row>
            </Pressable>
            {open === i ? <Muted size={14} style={{ marginTop: 8, lineHeight: 20 }}>{p}</Muted> : null}
          </View>
        ))}
      </Card>

      <Card style={{ gap: 6 }}>
        <Muted size={12}>Aceite eletrônico</Muted>
        {plan.acceptedAt ? (
          <>
            <Txt size={22} color={c.wine} style={{ fontFamily: Fonts.serif, fontStyle: 'italic' }}>{me?.name}</Txt>
            <Muted>Aceito em {fmt(plan.acceptedAt)} às {hhmm(plan.acceptedAt)} pelo app</Muted>
          </>
        ) : (
          <>
            <Muted size={14}>Leia o contrato completo e as cláusulas acima. Ao tocar no botão, você confirma que leu e concorda.</Muted>
            <Button label="Li e aceito o contrato" onPress={async () => { const e = await acceptContract(plan.id); toast(e ?? 'Contrato aceito. Obrigada!'); }} />
          </>
        )}
      </Card>
    </Screen>
  );
}
