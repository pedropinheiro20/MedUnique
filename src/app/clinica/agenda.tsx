import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { ListRow, NoCredit, useClinicAgenda, useSummaries } from '@/components/clinic';
import { Card, H2, Muted, Row, Screen, Txt } from '@/components/ui';
import { MESF, today, WD } from '@/data/model';
import { useStore } from '@/state/store';
import { useColors } from '@/theme';

export default function AgendaClinica() {
  const c = useColors();
  const { pById } = useStore();
  const { one } = useSummaries();
  const agendaOf = useClinicAgenda();
  const t = today();
  const days = Array.from({ length: 7 }, (_, i) => new Date(t.getFullYear(), t.getMonth(), t.getDate() + i));
  const [sel, setSel] = useState(0);
  const list = agendaOf(days[sel]);
  return (
    <Screen who="clinica">
      <Row between><H2>Agenda</H2><Muted size={14}>{MESF[days[sel].getMonth()]} {days[sel].getFullYear()}</Muted></Row>
      <Card>
        <Row style={{ gap: 4 }}>
          {days.map((d, i) => {
            const on = i === sel;
            return (
              <Pressable key={i} onPress={() => setSel(i)} accessibilityState={{ selected: on }} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                <Muted size={11}>{WD[d.getDay()]}</Muted>
                <View style={{ width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? c.noir : 'transparent' }}>
                  <Txt w="medium" color={on ? c.onNoir : c.ink}>{d.getDate()}</Txt>
                </View>
                <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: agendaOf(d).length ? c.rose : 'transparent' }} />
              </Pressable>
            );
          })}
        </Row>
      </Card>
      <View style={{ gap: 10 }}>
        {list.length ? list.map(({ s, patientId }) => {
          const p = pById(patientId);
          const sum = p ? one(p) : null;
          const blocked = !!sum && sum.info?.nextStep?.id === s.id && !sum.credOk;
          return (
            <ListRow key={s.id} time={s.hour} patient={p} title={p?.name ?? 'Paciente'}
              detail={<Muted>{s.title}{s.status === 'next' ? (s.confirmed ? ' · confirmou presença' : ' · aguardando confirmação') : ''}<NoCredit ok={!blocked} /></Muted>} />
          );
        }) : <Card><Muted>Nenhum atendimento neste dia.</Muted></Card>}
      </View>
      <Muted>As sessões vêm dos planos das pacientes. Para marcar uma nova, edite o plano na ficha da paciente (em breve).</Muted>
    </Screen>
  );
}
