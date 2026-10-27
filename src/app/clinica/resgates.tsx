import { View } from 'react-native';

import { ListRow } from '@/components/clinic';
import { Button, Card, Chip, H2, H3, Muted, Row, Screen, Txt, useToast } from '@/components/ui';
import { catalog } from '@/data/mock';
import { useStore } from '@/state/store';
import { useColors } from '@/theme';

export default function Resgates() {
  const c = useColors();
  const toast = useToast();
  const { vouchers, pById, set } = useStore();
  return (
    <Screen who="clinica">
      <H2>Resgates de pontos</H2>
      <Muted size={14}>O programa de pontos é só da clínica: as pacientes não veem pontos no app. Para resgatar, abra a ficha da paciente e use Resgatar recompensa. Valide o voucher aqui quando o serviço for feito.</Muted>
      <View style={{ gap: 10 }}>
        {vouchers.map((v) => (
          <ListRow key={v.code} patient={pById(v.who)} title={v.name} detail={`${pById(v.who).name} · ${v.code} · ${v.date}`}
            right={v.used ? <Chip label="Usado" tone="ok" /> : <Button label="Validar" small onPress={() => { set((s) => ({ ...s, used: { ...s.used, [v.code]: true } })); toast('Voucher validado.'); }} />} />
        ))}
      </View>
      <Card style={{ gap: 8 }}>
        <H3>Catálogo de recompensas</H3>
        {catalog.map((k) => <Row between key={k.id}><Txt size={14}>{k.name}</Txt><Txt w="bold" size={14} color={c.wine}>{k.cost} pts</Txt></Row>)}
        <Button label="Editar catálogo" variant="ghost" small style={{ alignSelf: 'flex-start', marginTop: 4 }} onPress={() => toast('No app final, aqui a clínica cria e edita recompensas.')} />
      </Card>
    </Screen>
  );
}
