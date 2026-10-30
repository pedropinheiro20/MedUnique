import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { useSummaries } from '@/components/clinic';
import { BOL_LABEL } from '@/components/patient';
import { Avatar, Bar, Button, Card, Chip, H2, H3, Muted, Row, Screen, Sheet, StateView, Txt, useToast } from '@/components/ui';
import { brl, firstName, fmt, num } from '@/data/model';
import { useStore } from '@/state/store';
import { useColors } from '@/theme';

const BONUS: [number, string][] = [[50, 'Bônus de fidelidade'], [100, 'Indicação de amiga'], [200, 'Avaliação no Google']];

export default function Ficha() {
  const c = useColors();
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { pById, pPoints, rewards, registerStep, markPaid, addPoints, redeem, loading } = useStore();
  const { one } = useSummaries();
  const [sheet, setSheet] = useState<null | 'bonus' | 'redeem' | 'nocred' | 'register'>(null);
  const [bonus, setBonus] = useState(50);
  const [reward, setReward] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const p = pById(id);
  if (!p) return <StateView who="clinica" loading={loading} empty="Paciente não encontrada." />;
  const sum = one(p);
  const { plan, info, bol: b } = sum;
  const pct = sum.total ? Math.round((sum.done / sum.total) * 100) : 0;
  const pts = pPoints(p.id);
  const n = info?.nextStep ?? null;
  const nextPay = info?.nextUnpaid ?? null;

  const run = async (f: () => Promise<string | null>, ok: string) => {
    setBusy(true);
    const e = await f();
    setBusy(false);
    toast(e ?? ok);
  };

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
        <Muted size={14}>Paciente desde {fmt(p.since)}{p.phone ? ` · ${p.phone}` : ''}</Muted>
        {p.email ? <Muted size={13}>{p.email}{p.profileId ? ' · já entrou no app' : ' · ainda não entrou no app'}</Muted> : null}
      </View>

      {p.email && !p.profileId && p.accessCode ? (
        <Card style={{ gap: 6 }}>
          <Row between><H3>Código de acesso</H3><Txt w="bold" size={22} color={c.wine} style={{ letterSpacing: 4 }}>{p.accessCode}</Txt></Row>
          <Muted size={14}>Passe este código para {firstName(p.name)}. No app, ela toca em Entrar, depois em "Primeiro acesso? Criar conta", e informa o e-mail {p.email}, o código e uma senha.</Muted>
        </Card>
      ) : null}

      <Card dark>
        <Txt size={12} color={c.onNoir} style={{ opacity: 0.65 }}>{plan ? plan.name : 'Sem plano ativo'}</Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {kpi('Créditos', num(info?.credits ?? 0))}
          {kpi('Pontos', num(pts))}
          {kpi('Progresso', `${pct}%`)}
          {kpi('Próxima sessão', sum.next ?? (plan ? 'Concluído' : '—'))}
        </View>
        <Bar pct={pct} color={c.nude} track="rgba(247,242,239,0.18)" />
      </Card>

      {!plan ? (
        <Card style={{ gap: 6 }}>
          <H3>Plano ainda não cadastrado</H3>
          <Muted size={14}>O cadastro do plano, das etapas e dos boletos pela equipe entra no passo 5. Por enquanto, me envie os dados que eu lanço no servidor.</Muted>
        </Card>
      ) : null}

      {n && !sum.credOk ? (
        <Card style={{ backgroundColor: c.wineSoft, gap: 6 }}>
          <H3>Sem créditos para a próxima sessão</H3>
          <Txt size={14}>
            A próxima etapa ({n.title}) usa {num(n.price)} créditos e a paciente tem {num(info!.credits)}. O procedimento só pode ser feito depois do pagamento.
          </Txt>
        </Card>
      ) : null}

      {plan ? (
        <Card>
          <Row between><H3>Pagamento</H3>{b.s ? <Chip label={BOL_LABEL[b.s][0]} tone={BOL_LABEL[b.s][1]} /> : null}</Row>
          <Muted size={14}>Boleto · {b.info}</Muted>
          {nextPay ? (
            <Button label={`Dar baixa (${brl(nextPay.value)} viram ${num(nextPay.value)} créditos)`} disabled={busy}
              onPress={() => run(() => markPaid(nextPay.id), `Boleto baixado. ${num(nextPay.value)} créditos liberados para a paciente.`)} />
          ) : null}
        </Card>
      ) : null}

      <Row style={{ flexWrap: 'wrap', gap: 8 }}>
        {n ? <Button label="Registrar procedimento" variant="ghost" disabled={busy} onPress={() => setSheet(sum.credOk ? 'register' : 'nocred')} /> : null}
        <Button label="Lançar pontos" variant="ghost" onPress={() => setSheet('bonus')} />
        <Button label="Resgatar recompensa" variant="ghost" onPress={() => { setReward(null); setSheet('redeem'); }} />
        {plan ? <Button label="Contrato (PDF)" variant="ghost" onPress={() => router.push('/contrato-pdf')} /> : null}
      </Row>

      {n ? (
        <Sheet visible={sheet === 'register'} onClose={() => setSheet(null)} title="Registrar procedimento" eyebrow={p.name}
          text={`Marcar "${n.title}" como realizado. Serão usados ${num(n.price)} créditos e ${firstName(p.name)} ganha 50 pontos.`}
          okLabel="Registrar" onOk={() => run(() => registerStep(n.id, p.id), `Procedimento registrado. ${num(n.price)} créditos usados e +50 pontos.`)} />
      ) : null}
      <Sheet visible={sheet === 'nocred'} onClose={() => setSheet(null)} title="Créditos insuficientes"
        text={`${p.name} tem ${num(info?.credits ?? 0)} créditos, menos do que o procedimento custa. Regularize o pagamento antes de realizar a sessão.`}
        okLabel="Ir para o financeiro" onOk={() => router.navigate('/clinica/financeiro')} />
      <Sheet visible={sheet === 'bonus'} onClose={() => setSheet(null)} title="Lançar pontos" eyebrow={`${p.name} · ${num(pts)} pontos`} okLabel="Lançar"
        onOk={() => run(() => addPoints(p.id, bonus, BONUS.find(([v]) => v === bonus)![1]), `${bonus} pontos lançados.`)}>
        {pick(BONUS.map(([v, l]) => [String(v), `${v} pontos · ${l}`]), String(bonus), (v) => setBonus(Number(v)))}
      </Sheet>
      <Sheet visible={sheet === 'redeem'} onClose={() => setSheet(null)} title="Resgatar recompensa" eyebrow={`${p.name} · ${num(pts)} pontos`} okLabel="Resgatar" okDisabled={!reward}
        text="Os pontos são descontados da paciente e um voucher é gerado na aba Resgates."
        onOk={async () => {
          const r = rewards.find((k) => k.id === reward)!;
          setBusy(true);
          const res = await redeem(p.id, r);
          setBusy(false);
          toast(res.error ?? `Voucher ${res.code} gerado.`);
        }}>
        {pick(rewards.map((k) => [k.id, `${k.name} · ${num(k.cost)} pts`, k.cost > pts]), reward, setReward)}
      </Sheet>
    </Screen>
  );
}
