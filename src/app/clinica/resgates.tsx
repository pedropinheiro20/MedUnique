import { View } from 'react-native';

import { ListRow } from '@/components/clinic';
import { Button, Card, Chip, H2, H3, Muted, Row, Screen, Txt, useToast } from '@/components/ui';
import { fmt, num } from '@/data/model';
import { useStore } from '@/state/store';
import { useColors } from '@/theme';

export default function Resgates() {
  const c = useColors();
  const toast = useToast();
  const { vouchers, rewards, pById, validateVoucher } = useStore();
  return (
    <Screen who="clinica">
      <H2>Resgates de pontos</H2>
      <Muted size={14}>O programa de pontos é só da clínica: as pacientes não veem pontos no app. Para resgatar, abra a ficha da paciente e use Resgatar recompensa. Valide o voucher aqui quando o serviço for feito.</Muted>
      <View style={{ gap: 10 }}>
        {vouchers.length ? vouchers.map((v) => {
          const p = pById(v.patientId);
          return (
            <ListRow key={v.id} patient={p} title={v.name} detail={`${p?.name ?? 'Paciente'} · ${v.code} · ${fmt(v.date)}`}
              right={v.used ? <Chip label="Usado" tone="ok" /> : <Button label="Validar" small onPress={async () => { const e = await validateVoucher(v.id); toast(e ?? 'Voucher validado.'); }} />} />
          );
        }) : <Card><Muted>Nenhum voucher gerado ainda.</Muted></Card>}
      </View>
      <Card style={{ gap: 8 }}>
        <H3>Catálogo de recompensas</H3>
        {rewards.map((k) => <Row between key={k.id}><Txt size={14}>{k.name}</Txt><Txt w="bold" size={14} color={c.wine}>{num(k.cost)} pts</Txt></Row>)}
        <Muted size={12}>Para mudar o catálogo, me envie as recompensas e os pontos de cada uma.</Muted>
      </Card>
    </Screen>
  );
}
