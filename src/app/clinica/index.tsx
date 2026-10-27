import { router } from 'expo-router';
import { View } from 'react-native';

import { ListRow, NoCredit } from '@/components/clinic';
import { Button, Card, Chip, H1, H3, Icon, Muted, Row, Screen, Txt } from '@/components/ui';
import { brl, clinicAgenda } from '@/data/mock';
import { useStore } from '@/state/store';
import { useColors } from '@/theme';

export default function Painel() {
  const c = useColors();
  const { allPatients, pById, pBol, pCredOk, vouchers, received } = useStore();
  const ativos = allPatients.filter((p) => p.done < p.total).length;
  const semana = Object.values(clinicAgenda).reduce((a, d) => a + d.length, 0);

  const attention: { id: string; text: string; go: () => void }[] = [];
  allPatients.forEach((p) => {
    if (!pCredOk(p)) attention.push({ id: p.id, text: `Sem créditos para a próxima sessão (${p.next})`, go: () => router.push(`/ficha/${p.id}`) });
    const b = pBol(p);
    if (b.s === 'vencido') attention.push({ id: p.id, text: `Boleto vencido · ${b.info}`, go: () => router.navigate('/clinica/financeiro') });
    if (b.s === 'analise') attention.push({ id: p.id, text: 'Comprovante de boleto para conferir', go: () => router.navigate('/clinica/financeiro') });
  });
  vouchers.filter((v) => !v.used).forEach((v) => attention.push({ id: v.who, text: `Voucher ${v.code} aguardando uso`, go: () => router.navigate('/clinica/resgates') }));

  return (
    <Screen who="clinica">
      <View>
        <H1>Olá, equipe!</H1>
        <Muted size={14}>Segunda-feira, 26 de outubro tem {clinicAgenda[26].length} atendimentos.</Muted>
      </View>
      <Card dark>
        <Row between style={{ alignItems: 'flex-start' }}>
          <View>
            <Txt size={12} color={c.onNoir} style={{ opacity: 0.65 }}>Recebido em outubro</Txt>
            <Txt w="medium" size={32} color={c.onNoir} style={{ lineHeight: 38 }}>{brl(received)}</Txt>
          </View>
          <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: c.nude, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="chart" color={c.onNude} stroke={1.6} />
          </View>
        </Row>
        <Row>
          <View style={{ flex: 1 }}><Txt size={12} color={c.onNoir} style={{ opacity: 0.6 }}>Pacientes ativos</Txt><Txt w="medium" size={22} color={c.onNoir}>{ativos}</Txt></View>
          <View style={{ flex: 1 }}><Txt size={12} color={c.onNoir} style={{ opacity: 0.6 }}>Sessões nesta semana</Txt><Txt w="medium" size={22} color={c.onNoir}>{semana}</Txt></View>
        </Row>
      </Card>

      <Row between><H3>Precisa de atenção</H3><Chip label={String(attention.length)} tone="late" /></Row>
      <View style={{ gap: 10 }}>
        {attention.length
          ? attention.map((a, i) => <ListRow key={i} patient={pById(a.id)} title={pById(a.id).name} detail={a.text} onPress={a.go} />)
          : <Card><Muted>Tudo em dia por aqui.</Muted></Card>}
      </View>

      <Row between><H3>Próximos atendimentos</H3><Button label="Ver agenda" variant="ghost" small onPress={() => router.navigate('/clinica/agenda')} /></Row>
      <View style={{ gap: 10 }}>
        {clinicAgenda[26].map(([h, id, what]) => {
          const p = id ? pById(id) : null;
          return (
            <ListRow key={h} time={h} patient={p} title={p ? p.name : what.split(' · ')[1]}
              detail={<Muted>{p ? what : what.split(' · ')[0]}{p ? <NoCredit p={p} /> : null}</Muted>} />
          );
        })}
      </View>
      <Button label="Novo paciente +" onPress={() => router.navigate('/clinica/pacientes?novo=1')} />
    </Screen>
  );
}
