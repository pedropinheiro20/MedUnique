import { useState } from 'react';
import { View } from 'react-native';

import { ListRow } from '@/components/clinic';
import { PayBoletoSheet } from '@/components/pay-boleto';
import { Button, Card, H2, H3, Muted, Row, Screen, Txt, useToast } from '@/components/ui';
import { bolLabel, Boleto, brl, dayOf, fmt, MES, suggestedInterest, today } from '@/data/model';
import { openFile } from '@/lib/files';
import { useStore } from '@/state/store';
import { useColors } from '@/theme';

export default function Financeiro() {
  const c = useColors();
  const toast = useToast();
  const [paying, setPaying] = useState<Boleto | null>(null);
  const { plans, pById } = useStore();
  const t = today();
  const in30 = new Date(t.getFullYear(), t.getMonth(), t.getDate() + 30);
  const all = plans.flatMap((p) => p.boletos.map((b) => ({ b, patientId: p.patientId })));
  const unpaid = all.filter((x) => !x.b.paidAt).sort((a, b) => a.b.due.getTime() - b.b.due.getTime());
  const proofs = unpaid.filter((x) => x.b.proofSent);
  const late = unpaid.filter((x) => !x.b.proofSent && dayOf(x.b.due) < t);
  const open = unpaid.filter((x) => !x.b.proofSent && dayOf(x.b.due) >= t && x.b.due <= in30);
  const sum = (l: { b: Boleto }[]) => l.reduce((a, x) => a + x.b.value, 0);
  const received = all.filter((x) => x.b.paidAt && x.b.paidAt.getMonth() === t.getMonth() && x.b.paidAt.getFullYear() === t.getFullYear())
    .sort((a, b) => b.b.paidAt!.getTime() - a.b.paidAt!.getTime());
  const interestIn = received.reduce((a, x) => a + x.b.interest, 0);
  const lateInterest = late.reduce((a, x) => a + suggestedInterest(x.b.value, x.b.due, t), 0);
  const line = (x: { b: Boleto; patientId: string }, action: 'baixar' | 'lembrar') => {
    const p = pById(x.patientId);
    const j = dayOf(x.b.due) < t ? suggestedInterest(x.b.value, x.b.due, t) : 0;
    return (
      <ListRow key={x.b.id} patient={p} title={p?.name ?? 'Paciente'}
        detail={`${bolLabel(x.b)} · vence ${fmt(x.b.due)} · ${brl(x.b.value)}${j ? ` · juros ${brl(j)} (total ${brl(x.b.value + j)})` : ''}`}
        right={<Row style={{ gap: 6 }}>
          {x.b.proofPath ? <Button label="Comprovante" small variant="ghost" onPress={async () => { const e = await openFile('comprovantes', x.b.proofPath!); if (e) toast(e); }} /> : null}
          <Button label="Dar baixa" small variant={action === 'baixar' ? 'primary' : 'ghost'} onPress={() => setPaying(x.b)} />
        </Row>} />
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
      <Row style={{ alignItems: 'stretch', gap: 10 }}>
        {kpi(`Juros recebidos (${MES[t.getMonth()]})`, brl(interestIn))}
        {kpi('Juros a cobrar (atrasados)', brl(lateInterest), lateInterest ? c.wine : undefined)}
      </Row>
      {proofs.length ? <><H3>Comprovantes para conferir</H3><View style={{ gap: 10 }}>{proofs.map((x) => line(x, 'baixar'))}</View></> : null}
      <H3>Boletos vencidos</H3>
      <View style={{ gap: 10 }}>{late.length ? late.map((x) => line(x, 'lembrar')) : <Card><Muted>Nenhum boleto vencido.</Muted></Card>}</View>
      <H3>Vencem em 30 dias</H3>
      <View style={{ gap: 10 }}>{open.length ? open.map((x) => line(x, 'baixar')) : <Card><Muted>Nenhum boleto em aberto.</Muted></Card>}</View>
      <H3>Recebidos em {MES[t.getMonth()]}</H3>
      <View style={{ gap: 10 }}>
        {received.length ? received.map((x) => {
          const p = pById(x.patientId);
          return (
            <ListRow key={x.b.id} patient={p} title={p?.name ?? 'Paciente'}
              detail={`${bolLabel(x.b)} · pago em ${fmt(x.b.paidAt!)} · parcela ${brl(x.b.value)} · juros ${brl(x.b.interest)}`}
              right={<Txt w="semibold" size={14}>{brl(x.b.value + x.b.interest)}</Txt>} />
          );
        }) : <Card><Muted>Nenhum pagamento recebido neste mês.</Muted></Card>}
      </View>
      <PayBoletoSheet boleto={paying} onClose={() => setPaying(null)} />
      <Muted>Os boletos são emitidos no banco da clínica. Quando a paciente pagar, dê baixa aqui: o valor da parcela vira créditos para ela na hora. Se pagou em atraso, lance os juros (sugestão: 2% de multa + 1% ao mês). Se pagou só uma parte, o que falta vira um novo boleto com o mesmo vencimento.</Muted>
    </Screen>
  );
}
