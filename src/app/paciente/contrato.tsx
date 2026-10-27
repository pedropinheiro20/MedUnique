import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { BoletoCard, CreditCard } from '@/components/patient';
import { Card, Chev, Chip, H2, H3, Icon, Muted, Row, Screen, Txt } from '@/components/ui';
import { boletos, brl, contract, fmt, plan } from '@/data/mock';
import { useStore } from '@/state/store';
import { Fonts, useColors } from '@/theme';

export default function Contrato() {
  const c = useColors();
  const { paidCount, paidOf, nextUnpaid } = useStore();
  const [open, setOpen] = useState<number | null>(null);
  const rest = boletos.filter((b) => !paidOf(b)).reduce((a, b) => a + b.value, 0);
  const kv: [string, string][] = [
    ['Valor total', brl(contract.total)], ['Entrada', brl(contract.entry)], ['Parcelas', `${contract.installments}× ${brl(contract.installment)}`],
    ['Forma de pagamento', 'Boleto bancário'], ['Boletos pagos', `${paidCount} de ${boletos.length}`],
    ['Próximo vencimento', nextUnpaid ? fmt(nextUnpaid.due) : '—'], ['Saldo a pagar', brl(rest)],
  ];
  return (
    <Screen who="paciente">
      <View><Muted size={12}>Contrato nº {contract.number}</Muted><H2>{plan.name}</H2></View>
      <Card>
        <Row between><Chip label="Assinado e vigente" tone="ok" /><Muted>{fmt(plan.start)} a {fmt(plan.end)}</Muted></Row>
        {kv.map(([k, v]) => <Row between key={k}><Muted size={14}>{k}</Muted><Txt w="semibold">{v}</Txt></Row>)}
        <Row style={{ gap: 3 }}>{boletos.map((b) => <View key={b.n} style={{ flex: b.n === 1 ? 2 : 1, height: 22, borderRadius: 4, backgroundColor: paidOf(b) ? c.noir : c.sunk }} />)}</Row>
      </Card>

      <Card onPress={() => router.push('/contrato-pdf')} style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <View style={{ width: 46, height: 54, borderRadius: 10, backgroundColor: c.noir, alignItems: 'center', justifyContent: 'center', gap: 1 }}>
          <Icon name="doc" size={20} color={c.onNoir} stroke={1.6} />
          <Txt w="bold" size={9} color={c.onNoir}>PDF</Txt>
        </View>
        <View style={{ flex: 1 }}>
          <Txt w="semibold">Contrato completo</Txt>
          <Muted>Nº {contract.number} · {contract.pages} páginas · assinado em {fmt(contract.signedAt)}</Muted>
        </View>
        <Chev />
      </Card>

      <CreditCard full />
      <BoletoCard />

      <Card style={{ gap: 0 }}>
        <H3 style={{ marginBottom: 6 }}>Cláusulas em linguagem simples</H3>
        {contract.clauses.map(([t, p], i) => (
          <View key={t} style={{ borderTopWidth: i ? 1 : 0, borderTopColor: c.line, paddingVertical: 12 }}>
            <Pressable onPress={() => setOpen(open === i ? null : i)} accessibilityRole="button" accessibilityState={{ expanded: open === i }}>
              <Row between><Txt w="semibold">{t}</Txt><Muted size={18}>{open === i ? '–' : '+'}</Muted></Row>
            </Pressable>
            {open === i ? <Muted size={14} style={{ marginTop: 8, lineHeight: 20 }}>{p}</Muted> : null}
          </View>
        ))}
      </Card>

      <Card style={{ gap: 6 }}>
        <Muted size={12}>Assinatura digital</Muted>
        <Txt size={22} color={c.wine} style={{ fontFamily: Fonts.serif, fontStyle: 'italic' }}>Juliana M. Prado</Txt>
        <Muted>Assinado em {fmt(contract.signedAt)} às 09:42 · código de verificação 7F3A-91C2</Muted>
      </Card>
    </Screen>
  );
}
