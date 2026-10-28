import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { ListRow, useSummaries } from '@/components/clinic';
import { BOL_LABEL } from '@/components/patient';
import { Bar, Button, Chip, H2, Muted, Row, Screen, Sheet, Txt, useToast } from '@/components/ui';
import { useStore } from '@/state/store';
import { Fonts, useColors } from '@/theme';

const FILTERS: [string, string][] = [['todos', 'Todos'], ['andamento', 'Em andamento'], ['pendencia', 'Com pendência'], ['concluidos', 'Concluídos']];

export default function Pacientes() {
  const c = useColors();
  const toast = useToast();
  const params = useLocalSearchParams<{ novo?: string }>();
  const { createPatient, loading } = useStore();
  const { all } = useSummaries();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('todos');
  const [novo, setNovo] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    if (params.novo) { setNovo(true); router.setParams({ novo: undefined }); }
  }, [params.novo]);

  const list = all.filter((x) => {
    if (q && !x.p.name.toLowerCase().includes(q.toLowerCase())) return false;
    if (filter === 'andamento') return !!x.plan && x.done < x.total;
    if (filter === 'concluidos') return !!x.plan && x.total > 0 && x.done >= x.total;
    if (filter === 'pendencia') return ['vencido', 'analise'].includes(x.bol.s ?? '') || !x.credOk;
    return true;
  });

  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const create = async () => {
    const r = await createPatient({ name, email, phone });
    if (r.error) { toast(r.error); return; }
    setName(''); setEmail(''); setPhone('');
    toast('Paciente cadastrada. Passe para ela o código de acesso que aparece na ficha.');
    router.push(`/ficha/${r.id}`);
  };

  const field = (value: string, set: (v: string) => void, placeholder: string, extra?: object) => (
    <TextInput value={value} onChangeText={set} placeholder={placeholder} placeholderTextColor={c.muted} accessibilityLabel={placeholder}
      style={{ backgroundColor: c.sunk, borderRadius: 12, padding: 12, fontFamily: Fonts.regular, fontSize: 15, color: c.ink }} {...extra} />
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
      <Row style={{ flexWrap: 'wrap', gap: 8 }}>
        {FILTERS.map(([k, l]) => (
          <Pressable key={k} onPress={() => setFilter(k)} style={{ borderRadius: 999, paddingVertical: 7, paddingHorizontal: 14, backgroundColor: k === filter ? c.noir : c.sunk }}>
            <Txt w="medium" size={13} color={k === filter ? c.onNoir : c.ink}>{l}</Txt>
          </Pressable>
        ))}
      </Row>
      <View style={{ gap: 10 }}>
        {list.length ? list.map((x) => {
          const chip = !x.credOk ? <Chip label="Sem créditos" tone="late" />
            : x.bol.s && x.bol.s !== 'pago' && x.bol.s !== 'futuro' ? <Chip label={BOL_LABEL[x.bol.s][0]} tone={BOL_LABEL[x.bol.s][1]} />
            : !x.plan ? <Chip label="Sem plano" /> : null;
          return (
            <ListRow key={x.p.id} patient={x.p} title={x.p.name}
              detail={x.plan
                ? <View style={{ gap: 6 }}><Muted>{x.plan.name} · {x.done} de {x.total} etapas</Muted><Bar pct={x.total ? (x.done / x.total) * 100 : 0} height={6} /></View>
                : <Muted>{x.p.email ?? 'Sem e-mail'}</Muted>}
              right={chip ?? undefined} />
          );
        }) : <Muted>{loading ? 'Carregando…' : 'Nenhum paciente encontrado.'}</Muted>}
      </View>
      <Sheet visible={novo} onClose={() => setNovo(false)} title="Novo paciente" okLabel="Cadastrar" okDisabled={!name.trim() || !validEmail} onOk={create}
        text="A paciente entra no app com este e-mail e recebe um código para confirmar. O plano e os boletos são lançados na ficha.">
        {field(name, setName, 'Nome completo')}
        {field(email, setEmail, 'E-mail', { keyboardType: 'email-address', autoCapitalize: 'none', autoCorrect: false })}
        {field(phone, setPhone, 'Telefone (opcional)', { keyboardType: 'phone-pad' })}
      </Sheet>
    </Screen>
  );
}
