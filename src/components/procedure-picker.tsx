import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { num } from '@/data/model';
import { useColors } from '@/theme';

import { Field, norm, Procedure, useProcedures } from './fields';
import { Muted, Row, Txt } from './ui';

// Busca na tabela de procedimentos da clínica e devolve o escolhido
export function ProcedurePicker({ onPick }: { onPick: (p: Procedure) => void }) {
  const c = useColors();
  const { list, failed } = useProcedures();
  const [q, setQ] = useState('');
  const words = norm(q).split(/\s+/).filter(Boolean);
  const found = words.length ? list.filter((p) => words.every((w) => norm(p.name).includes(w))).slice(0, 8) : [];
  return (
    <View style={{ gap: 8 }}>
      <Field label="Buscar procedimento" value={q} onChangeText={setQ} placeholder="Ex.: botox, limpeza, laser"
        hint={failed ? 'Não foi possível carregar a tabela de procedimentos.' : list.length ? `${list.length} procedimentos com preço na tabela` : 'Carregando a tabela…'} />
      {found.map((p) => (
        <Pressable key={p.id} accessibilityRole="button" onPress={() => { onPick(p); setQ(''); }}
          style={({ pressed }) => ({ borderRadius: 12, padding: 12, backgroundColor: pressed ? c.line : c.sunk })}>
          <Row between>
            <Txt size={14} style={{ flex: 1 }}>{p.name}</Txt>
            <Txt w="semibold" size={14}>{num(p.price)} cr.</Txt>
          </Row>
        </Pressable>
      ))}
      {words.length && !found.length && list.length ? <Muted>Nenhum procedimento com esse nome.</Muted> : null}
    </View>
  );
}
