import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { ListRow } from '@/components/clinic';
import { BOL_LABEL } from '@/components/patient';
import { Bar, Button, Chip, H2, Muted, Row, Screen, Sheet, Txt, useToast } from '@/components/ui';
import { useStore, todayKey } from '@/state/store';
import { Fonts, useColors } from '@/theme';

const FILTERS: [string, string][] = [['todos', 'Todos'], ['andamento', 'Em andamento'], ['pendencia', 'Com pendência'], ['concluidos', 'Concluídos']];
const PLANS = ['Harmonia Facial', 'Pele Radiante', 'Contorno Corporal'];
const PAYS = ['Boleto', 'Cartão', 'Pix'];

export default function Pacientes() {
  const c = useColors();
  const toast = useToast();
  const params = useLocalSearchParams<{ novo?: string }>();
  const { allPatients, pBol, pCredOk, set } = useStore();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('todos');
  const [novo, setNovo] = useState(false);
  const [name, setName] = useState('');
  const [planName, setPlanName] = useState(PLANS[0]);
  const [pay, setPay] = useState(PAYS[0]);

  useEffect(() => {
    if (params.novo) { setNovo(true); router.setParams({ novo: undefined }); }
  }, [params.novo]);

  const list = allPatients.filter((p) => {
    if (q && !p.name.toLowerCase().includes(q.toLowerCase())) return false;
    if (filter === 'andamento') return p.done < p.total;
    if (filter === 'concluidos') return p.done >= p.total;
    if (filter === 'pendencia') return ['vencido', 'analise'].includes(pBol(p).s ?? '') || !pCredOk(p);
    return true;
  });

  const create = () => {
    const ini = name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
    const id = 'n' + Date.now();
    set((s) => ({ ...s, newPatients: [...s.newPatients, { id, name: name.trim(), ini, plan: planName, done: 0, total: 6, next: null, pay, since: todayKey, phone: 'a informar', points: 500, cred: 0 }] }));
    setName('');
    toast('Paciente cadastrada. Convite enviado.');
    router.push(`/ficha/${id}`);
  };

  const choice = (opts: string[], val: string, setVal: (v: string) => void) => (
    <Row style={{ flexWrap: 'wrap', gap: 8 }}>
      {opts.map((o) => (
        <Pressable key={o} onPress={() => setVal(o)} style={{ borderRadius: 999, paddingVertical: 7, paddingHorizontal: 14, backgroundColor: o === val ? c.noir : c.sunk }}>
          <Txt w="medium" size={13} color={o === val ? c.onNoir : c.ink}>{o}</Txt>
        </Pressable>
      ))}
    </Row>
  );

  return (
    <Screen who="clinica">
      <Row between><H2>Pacientes</H2><Button label="+ Novo" small onPress={() => setNovo(true)} /></Row>
      <TextInput
        value={q}
        onChangeText={setQ}
        placeholder="Buscar paciente"
        placeholderTextColor={c.muted}
        accessibilityLabel="Buscar paciente"
        style={{ backgroundColor: c.sunk, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14, fontFamily: Fonts.regular, fontSize: 15, color: c.ink }}
      />
      {choice(FILTERS.map((f) => f[1]), FILTERS.find((f) => f[0] === filter)![1], (l) => setFilter(FILTERS.find((f) => f[1] === l)![0]))}
      <View style={{ gap: 10 }}>
        {list.length ? list.map((p) => {
          const b = pBol(p);
          const chip = !pCredOk(p) ? <Chip label="Sem créditos" tone="late" /> : b.s && b.s !== 'pago' ? <Chip label={BOL_LABEL[b.s][0]} tone={BOL_LABEL[b.s][1]} /> : null;
          return (
            <ListRow key={p.id} patient={p} title={p.name}
              detail={<View style={{ gap: 6 }}><Muted>{p.plan} · {p.done} de {p.total} etapas</Muted><Bar pct={(p.done / p.total) * 100} height={6} /></View>}
              right={chip ?? undefined} />
          );
        }) : <Muted>Nenhum paciente encontrado.</Muted>}
      </View>
      <Sheet visible={novo} onClose={() => setNovo(false)} title="Novo paciente" okLabel="Cadastrar" okDisabled={!name.trim()} onOk={create}
        text="Ao ativar o protocolo, a paciente recebe um convite para o app.">
        <TextInput value={name} onChangeText={setName} placeholder="Nome completo" placeholderTextColor={c.muted}
          style={{ backgroundColor: c.sunk, borderRadius: 12, padding: 12, fontFamily: Fonts.regular, fontSize: 15, color: c.ink }} />
        <Muted>Protocolo</Muted>
        {choice(PLANS, planName, setPlanName)}
        <Muted>Forma de pagamento</Muted>
        {choice(PAYS, pay, setPay)}
      </Sheet>
    </Screen>
  );
}
