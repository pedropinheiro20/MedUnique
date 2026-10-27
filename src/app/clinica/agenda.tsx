import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { ListRow, NoCredit } from '@/components/clinic';
import { Button, Card, H2, Muted, Row, Screen, Txt, useToast } from '@/components/ui';
import { clinicAgenda, WD } from '@/data/mock';
import { useStore } from '@/state/store';
import { useColors } from '@/theme';

export default function AgendaClinica() {
  const c = useColors();
  const toast = useToast();
  const { pById, st } = useStore();
  const [day, setDay] = useState(26);
  const days = [26, 27, 28, 29, 30, 31];
  return (
    <Screen who="clinica">
      <Row between><H2>Agenda</H2><Muted size={14}>Outubro 2026</Muted></Row>
      <Card>
        <Row style={{ gap: 4 }}>
          {days.map((d) => {
            const on = d === day;
            return (
              <Pressable key={d} onPress={() => setDay(d)} accessibilityState={{ selected: on }} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                <Muted size={11}>{WD[new Date(2026, 9, d).getDay()]}</Muted>
                <View style={{ width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? c.noir : 'transparent' }}>
                  <Txt w="medium" color={on ? c.onNoir : c.ink}>{d}</Txt>
                </View>
                <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: clinicAgenda[d].length ? c.rose : 'transparent' }} />
              </Pressable>
            );
          })}
        </Row>
      </Card>
      <View style={{ gap: 10 }}>
        {clinicAgenda[day].length ? clinicAgenda[day].map(([h, id, what]) => {
          const p = id ? pById(id) : null;
          const conf = id === 'jp' ? (st.confirmed ? ' · confirmou presença' : ' · aguardando confirmação') : '';
          return (
            <ListRow key={h} time={h} patient={p} title={p ? p.name : what.split(' · ')[1]}
              detail={<Muted>{p ? what : what.split(' · ')[0]}{conf}{p ? <NoCredit p={p} /> : null}</Muted>} />
          );
        }) : <Card><Muted>Nenhum atendimento neste dia.</Muted></Card>}
      </View>
      <Button label="+ Adicionar atendimento" variant="dark" onPress={() => toast('No app final, abre o formulário de novo atendimento.')} />
    </Screen>
  );
}
