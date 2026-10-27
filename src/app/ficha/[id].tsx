import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { BOL_LABEL } from '@/components/patient';
import { Avatar, Bar, Button, Card, Chip, H2, H3, Muted, Row, Screen, Sheet, Txt, useToast } from '@/components/ui';
import { boletos, brl, catalog, num } from '@/data/mock';
import { useStore } from '@/state/store';
import { useColors } from '@/theme';

const BONUS: [number, string][] = [[50, 'Bônus de fidelidade'], [100, 'Indicação de amiga'], [200, 'Avaliação no Google']];

export default function Ficha() {
  const c = useColors();
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { pById, pBol, pCred, pCredOk, pPoints, nextStep, set, redeem } = useStore();
  const [sheet, setSheet] = useState<null | 'bonus' | 'redeem' | 'nocred'>(null);
  const [bonus, setBonus] = useState(50);
  const [reward, setReward] = useState<string | null>(null);
  const p = pById(id);
  if (!p) return null;
  const b = pBol(p);
  const pct = Math.round((p.done / p.total) * 100);
  const pts = pPoints(p);

  const kpi = (label: string, value: string) => (
    <View style={{ width: '50%', paddingVertical: 4 }}>
      <Txt size={12} color={c.onNoir} style={{ opacity: 0.6 }}>{label}</Txt>
      <Txt w="medium" size={22} color={c.onNoir}>{value}</Txt>
    </View>
  );
  const pick = (opts: [string, string, boolean?][], val: string | null, setVal: (v: string) => void) => (
    <View style={{ gap: 8 }}>
      {opts.map(([k, label, disabled]) => (
        <Pressable key={k} disabled={disabled} onPress={() => setVal(k)} style={{ borderRadius: 14, padding: 12, backgroundColor: k === val ? c.noir : c.sunk, opacity: disabled ? 0.45 : 1 }}>
          <Txt size={14} color={k === val ? c.onNoir : c.ink}>{label}</Txt>
        </Pressable>
      ))}
    </View>
  );

  return (
    <Screen who="clinica">
      <Button label="‹ Voltar" variant="ghost" small style={{ alignSelf: 'flex-start' }} onPress={() => (router.canGoBack() ? router.back() : router.replace('/clinica/pacientes'))} />
      <View style={{ alignItems: 'center', gap: 6 }}>
        <Avatar ini={p.ini} size={76} tone="nude" />
        <H2>{p.name}</H2>
        <Muted size={14}>Paciente desde {p.since} · {p.phone}</Muted>
      </View>

      <Card dark>
        <Txt size={12} color={c.onNoir} style={{ opacity: 0.65 }}>Protocolo {p.plan}</Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {kpi('Créditos', num(pCred(p)))}
          {kpi('Pontos', num(pts))}
          {kpi('Progresso', `${pct}%`)}
          {kpi('Próxima sessão', p.next ?? 'Concluído')}
        </View>
        <Bar pct={pct} color={c.nude} track="rgba(247,242,239,0.18)" />
      </Card>

      {!pCredOk(p) ? (
        <Card style={{ backgroundColor: c.wineSoft, gap: 6 }}>
          <H3>Sem créditos para a próxima sessão</H3>
          <Txt size={14}>
            A próxima {p.id === 'jp' ? 'etapa' : 'sessão'} usa {num(p.id === 'jp' ? nextStep.price : p.needCred!)} créditos e a paciente tem {num(pCred(p))}. O procedimento só pode ser feito depois do pagamento.
          </Txt>
        </Card>
      ) : null}

      <Card>
        <Row between><H3>Pagamento</H3>{b.s ? <Chip label={BOL_LABEL[b.s][0]} tone={BOL_LABEL[b.s][1]} /> : null}</Row>
        <Muted size={14}>{p.pay} · {b.info}</Muted>
        {p.id === 'jp' && b.n && b.s !== 'pago' ? (
          <Button label={`Dar baixa (${brl(b.value!)} viram ${num(b.value!)} créditos)`} onPress={() => {
            const n = b.n!;
            set((s) => ({ ...s, paid: { ...s.paid, [n]: true }, proof: { ...s.proof, [n]: false } }));
            toast(`Boleto baixado. ${num(boletos[n - 1].value)} créditos liberados para a paciente.`);
          }} />
        ) : null}
        {p.id !== 'jp' && b.s && ['vencido', 'aberto', 'analise'].includes(b.s) ? (
          <Button label="Marcar como pago" onPress={() => { set((s) => ({ ...s, finOk: { ...s.finOk, [p.id]: true } })); toast('Pagamento confirmado. Créditos liberados.'); }} />
        ) : null}
      </Card>

      <Row style={{ flexWrap: 'wrap', gap: 8 }}>
        <Button label="Registrar procedimento" variant="ghost" onPress={() => (pCredOk(p) ? toast(`Procedimento registrado. Créditos debitados e +50 pontos para ${p.name.split(' ')[0]}.`) : setSheet('nocred'))} />
        <Button label="Lançar pontos" variant="ghost" onPress={() => setSheet('bonus')} />
        <Button label="Resgatar recompensa" variant="ghost" onPress={() => { setReward(null); setSheet('redeem'); }} />
        {p.id === 'jp' ? <Button label="Contrato (PDF)" variant="ghost" onPress={() => router.push('/contrato-pdf')} /> : null}
      </Row>

      <Sheet visible={sheet === 'nocred'} onClose={() => setSheet(null)} title="Créditos insuficientes"
        text={`${p.name} tem ${num(pCred(p))} créditos, menos do que o procedimento custa. Regularize o pagamento antes de realizar a sessão.`}
        okLabel="Ir para o financeiro" onOk={() => router.navigate('/clinica/financeiro')} />
      <Sheet visible={sheet === 'bonus'} onClose={() => setSheet(null)} title="Lançar pontos" eyebrow={`${p.name} · ${num(pts)} pontos`} okLabel="Lançar"
        onOk={() => { set((s) => ({ ...s, bonus: { ...s.bonus, [p.id]: (s.bonus[p.id] ?? 0) + bonus } })); toast(`${bonus} pontos lançados.`); }}>
        {pick(BONUS.map(([v, l]) => [String(v), `${v} pontos · ${l}`]), String(bonus), (v) => setBonus(Number(v)))}
      </Sheet>
      <Sheet visible={sheet === 'redeem'} onClose={() => setSheet(null)} title="Resgatar recompensa" eyebrow={`${p.name} · ${num(pts)} pontos`} okLabel="Resgatar" okDisabled={!reward}
        text="Os pontos são descontados da paciente e um voucher é gerado na aba Resgates."
        onOk={() => { const code = redeem(p.id, reward!); toast(`Voucher ${code} gerado.`); }}>
        {pick(catalog.map((k) => [k.id, `${k.name} · ${k.cost} pts`, k.cost > pts]), reward, setReward)}
      </Sheet>
    </Screen>
  );
}
