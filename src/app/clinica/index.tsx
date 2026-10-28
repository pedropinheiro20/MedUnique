import { router } from 'expo-router';
import { View } from 'react-native';

import { ListRow, NoCredit, useClinicAgenda, useSummaries } from '@/components/clinic';
import { Button, Card, Chip, H1, H3, Icon, Muted, Row, Screen, StateView, Txt } from '@/components/ui';
import { brl, firstName, MESF, Step, today, WDF } from '@/data/model';
import { useAuth } from '@/state/auth';
import { useStore } from '@/state/store';
import { useColors } from '@/theme';

export default function Painel() {
  const c = useColors();
  const { profile } = useAuth();
  const { plans, vouchers, pById, loading, error, reload, patients } = useStore();
  const { all, one } = useSummaries();
  const agendaOf = useClinicAgenda();
  if (loading && !patients.length) return <StateView who="clinica" loading />;
  if (error) return <StateView who="clinica" error={error} onRetry={reload} />;

  const t = today();
  const ativos = all.filter((x) => x.plan && x.done < x.total).length;
  const semana = Array.from({ length: 7 }, (_, i) => agendaOf(new Date(t.getFullYear(), t.getMonth(), t.getDate() + i)).length).reduce((a, b) => a + b, 0);
  const hoje = agendaOf(t);
  const recebido = plans.flatMap((p) => p.boletos)
    .filter((b) => b.paidAt && b.paidAt.getMonth() === t.getMonth() && b.paidAt.getFullYear() === t.getFullYear())
    .reduce((a, b) => a + b.value, 0);

  const attention: { id: string; text: string; go: () => void }[] = [];
  all.forEach((x) => {
    if (x.info?.nextStep && !x.credOk) attention.push({ id: x.p.id, text: `Sem créditos para a próxima sessão${x.next ? ` (${x.next})` : ''}`, go: () => router.push(`/ficha/${x.p.id}`) });
    if (x.bol.s === 'vencido') attention.push({ id: x.p.id, text: `Boleto vencido · ${x.bol.info}`, go: () => router.navigate('/clinica/financeiro') });
    if (x.bol.s === 'analise') attention.push({ id: x.p.id, text: 'Comprovante de boleto para conferir', go: () => router.navigate('/clinica/financeiro') });
  });
  vouchers.filter((v) => !v.used).forEach((v) => attention.push({ id: v.patientId, text: `Voucher ${v.code} aguardando uso`, go: () => router.navigate('/clinica/resgates') }));

  const row = ({ s, patientId }: { s: Step; patientId: string }) => {
    const p = pById(patientId);
    const sum = p ? one(p) : null;
    const blocked = !!sum && sum.info?.nextStep?.id === s.id && !sum.credOk;
    return (
      <ListRow key={s.id} time={s.hour} patient={p} title={p?.name ?? 'Paciente'}
        detail={<Muted>{s.title}{s.confirmed ? ' · confirmou' : ''}<NoCredit ok={!blocked} /></Muted>} />
    );
  };

  return (
    <Screen who="clinica">
      <View>
        <H1>Olá, {firstName(profile?.full_name || 'equipe')}!</H1>
        <Muted size={14}>
          {WDF[t.getDay()][0].toUpperCase() + WDF[t.getDay()].slice(1)}, {t.getDate()} de {MESF[t.getMonth()].toLowerCase()}{' '}
          {hoje.length ? `tem ${hoje.length} ${hoje.length === 1 ? 'atendimento' : 'atendimentos'}.` : 'não tem atendimentos.'}
        </Muted>
      </View>
      <Card dark>
        <Row between style={{ alignItems: 'flex-start' }}>
          <View>
            <Txt size={12} color={c.onNoir} style={{ opacity: 0.65 }}>Recebido em {MESF[t.getMonth()].toLowerCase()}</Txt>
            <Txt w="medium" size={32} color={c.onNoir} style={{ lineHeight: 38 }}>{brl(recebido)}</Txt>
          </View>
          <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: c.nude, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="chart" color={c.onNude} stroke={1.6} />
          </View>
        </Row>
        <Row>
          <View style={{ flex: 1 }}><Txt size={12} color={c.onNoir} style={{ opacity: 0.6 }}>Pacientes ativos</Txt><Txt w="medium" size={22} color={c.onNoir}>{ativos}</Txt></View>
          <View style={{ flex: 1 }}><Txt size={12} color={c.onNoir} style={{ opacity: 0.6 }}>Sessões em 7 dias</Txt><Txt w="medium" size={22} color={c.onNoir}>{semana}</Txt></View>
        </Row>
      </Card>

      <Row between><H3>Precisa de atenção</H3><Chip label={String(attention.length)} tone={attention.length ? 'late' : 'ok'} /></Row>
      <View style={{ gap: 10 }}>
        {attention.length
          ? attention.map((a, i) => { const p = pById(a.id); return <ListRow key={i} patient={p} title={p?.name ?? 'Paciente'} detail={a.text} onPress={a.go} />; })
          : <Card><Muted>Tudo em dia por aqui.</Muted></Card>}
      </View>

      <Row between><H3>Atendimentos de hoje</H3><Button label="Ver agenda" variant="ghost" small onPress={() => router.navigate('/clinica/agenda')} /></Row>
      <View style={{ gap: 10 }}>
        {hoje.length ? hoje.map(row) : <Card><Muted>Nenhum atendimento hoje.</Muted></Card>}
      </View>
      <Button label="Novo paciente +" onPress={() => router.navigate('/clinica/pacientes?novo=1')} />
    </Screen>
  );
}
