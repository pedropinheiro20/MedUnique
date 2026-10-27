import { View } from 'react-native';

import { ListRow } from '@/components/clinic';
import { Button, Card, H2, H3, Muted, Row, Screen, Txt, useToast } from '@/components/ui';
import { brl, Patient } from '@/data/mock';
import { useStore } from '@/state/store';
import { useColors } from '@/theme';

export default function Financeiro() {
  const c = useColors();
  const toast = useToast();
  const { allPatients, pBol, set, received } = useStore();
  const rows = allPatients.map((p) => ({ p, b: pBol(p) })).filter((r) => r.b.s && r.b.s !== 'pago');
  const proofs = rows.filter((r) => r.b.s === 'analise');
  const late = rows.filter((r) => r.b.s === 'vencido');
  const open = rows.filter((r) => r.b.s === 'aberto');

  const baixar = (p: Patient, n?: number) => {
    if (p.id === 'jp' && n) set((s) => ({ ...s, paid: { ...s.paid, [n]: true }, proof: { ...s.proof, [n]: false } }));
    else set((s) => ({ ...s, finOk: { ...s.finOk, [p.id]: true } }));
    toast('Pagamento baixado. Créditos liberados para a paciente.');
  };
  const line = (r: (typeof rows)[number], action: 'baixar' | 'lembrar') => (
    <ListRow key={r.p.id} patient={r.p} title={r.p.name} detail={`${r.b.info} · ${brl(r.b.value ?? 650)}`}
      right={action === 'baixar'
        ? <Button label="Baixar" small onPress={() => baixar(r.p, r.b.n)} />
        : <Button label="Lembrar" small variant="ghost" onPress={() => toast('No app final, a paciente recebe um lembrete por WhatsApp e no app.')} />} />
  );
  const kpi = (label: string, value: string, color?: string) => (
    <Card style={{ flex: 1, padding: 14, gap: 2 }}>
      <Muted size={12}>{label}</Muted>
      <Txt w="semibold" size={17} color={color}>{value}</Txt>
    </Card>
  );

  return (
    <Screen who="clinica">
      <H2>Financeiro</H2>
      <Row style={{ alignItems: 'stretch', gap: 10 }}>
        {kpi('Recebido (out)', brl(received).replace(',00', ''))}
        {kpi('A receber (30 dias)', 'R$ 18.200')}
        {kpi('Em atraso', brl(late.length * 650).replace(',00', ''), c.wine)}
      </Row>
      {proofs.length ? <><H3>Comprovantes para conferir</H3><View style={{ gap: 10 }}>{proofs.map((r) => line(r, 'baixar'))}</View></> : null}
      <H3>Boletos vencidos</H3>
      <View style={{ gap: 10 }}>{late.length ? late.map((r) => line(r, 'lembrar')) : <Card><Muted>Nenhum boleto vencido.</Muted></Card>}</View>
      <H3>Em aberto</H3>
      <View style={{ gap: 10 }}>{open.length ? open.map((r) => line(r, 'baixar')) : <Card><Muted>Nenhum boleto em aberto.</Muted></Card>}</View>
      <Muted>Ao baixar um boleto, o valor pago vira créditos para a paciente na hora. No app final, a baixa acontece sozinha quando o banco confirma o pagamento.</Muted>
    </Screen>
  );
}
