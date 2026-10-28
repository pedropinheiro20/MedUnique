import { View } from 'react-native';

import { ListRow } from '@/components/clinic';
import { Button, Card, H2, H3, Muted, Row, Screen, Txt, useToast } from '@/components/ui';
import { Boleto, brl, dayOf, fmt, MES, num, today } from '@/data/model';
import { useStore } from '@/state/store';
import { useColors } from '@/theme';

export default function Financeiro() {
  const c = useColors();
  const toast = useToast();
  const { plans, pById, markPaid } = useStore();
  const t = today();
  const in30 = new Date(t.getFullYear(), t.getMonth(), t.getDate() + 30);
  const all = plans.flatMap((p) => p.boletos.map((b) => ({ b, patientId: p.patientId })));
  const unpaid = all.filter((x) => !x.b.paidAt).sort((a, b) => a.b.due.getTime() - b.b.due.getTime());
  const proofs = unpaid.filter((x) => x.b.proofSent);
  const late = unpaid.filter((x) => !x.b.proofSent && dayOf(x.b.due) < t);
  const open = unpaid.filter((x) => !x.b.proofSent && dayOf(x.b.due) >= t && x.b.due <= in30);
  const sum = (l: { b: Boleto }[]) => l.reduce((a, x) => a + x.b.value, 0);
  const received = all.filter((x) => x.b.paidAt && x.b.paidAt.getMonth() === t.getMonth() && x.b.paidAt.getFullYear() === t.getFullYear());

  const baixar = async (b: Boleto) => {
    const e = await markPaid(b.id);
    toast(e ?? `Pagamento baixado. ${num(b.value)} créditos liberados para a paciente.`);
  };
  const line = (x: { b: Boleto; patientId: string }, action: 'baixar' | 'lembrar') => {
    const p = pById(x.patientId);
    const label = x.b.n === 1 ? 'Entrada' : `Parcela ${x.b.n - 1}`;
    return (
      <ListRow key={x.b.id} patient={p} title={p?.name ?? 'Paciente'} detail={`${label} · vence ${fmt(x.b.due)} · ${brl(x.b.value)}`}
        right={action === 'baixar'
          ? <Button label="Baixar" small onPress={() => baixar(x.b)} />
          : <Button label="Baixar" small variant="ghost" onPress={() => baixar(x.b)} />} />
    );
  };
  const kpi = (label: string, value: string, color?: string) => (
    <Card style={{ flex: 1, padding: 14, gap: 2 }}>
      <Muted size={12}>{label}</Muted>
      <Txt w="semibold" size={17} color={color}>{value}</Txt>
    </Card>
  );
  const short = (v: number) => brl(v).replace(',00', '');

  return (
    <Screen who="clinica">
      <H2>Financeiro</H2>
      <Row style={{ alignItems: 'stretch', gap: 10 }}>
        {kpi(`Recebido (${MES[t.getMonth()]})`, short(sum(received)))}
        {kpi('A receber (30 dias)', short(sum(open) + sum(proofs)))}
        {kpi('Em atraso', short(sum(late)), late.length ? c.wine : undefined)}
      </Row>
      {proofs.length ? <><H3>Comprovantes para conferir</H3><View style={{ gap: 10 }}>{proofs.map((x) => line(x, 'baixar'))}</View></> : null}
      <H3>Boletos vencidos</H3>
      <View style={{ gap: 10 }}>{late.length ? late.map((x) => line(x, 'lembrar')) : <Card><Muted>Nenhum boleto vencido.</Muted></Card>}</View>
      <H3>Vencem em 30 dias</H3>
      <View style={{ gap: 10 }}>{open.length ? open.map((x) => line(x, 'baixar')) : <Card><Muted>Nenhum boleto em aberto.</Muted></Card>}</View>
      <Muted>Os boletos são emitidos no banco da clínica. Quando a paciente pagar, dê baixa aqui: o valor pago vira créditos para ela na hora.</Muted>
    </Screen>
  );
}
