import { router } from 'expo-router';
import { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { Patient } from '@/data/mock';
import { useStore } from '@/state/store';
import { useColors } from '@/theme';

import { Avatar, Chev, Muted, Txt } from './ui';

// Linha de lista no estilo do modelo: horário ou avatar, nome, detalhe e seta rosa.
export function ListRow({ time, patient, title, detail, right, onPress }: {
  time?: string; patient?: Patient | null; title: string; detail?: ReactNode; right?: ReactNode; onPress?: () => void;
}) {
  const c = useColors();
  const press = onPress ?? (patient ? () => router.push(`/ficha/${patient.id}`) : undefined);
  return (
    <Pressable
      disabled={!press}
      onPress={press}
      style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: c.surface, borderRadius: 18, paddingVertical: 12, paddingHorizontal: 14 }, pressed && { opacity: 0.85 }]}>
      {time ? (
        <View style={{ minWidth: 50 }}>
          <Txt w="medium" size={15}>{time}</Txt>
          <View style={{ position: 'absolute', right: 4, top: 2, width: 5, height: 5, borderRadius: 3, backgroundColor: c.rose }} />
        </View>
      ) : (
        <Avatar ini={patient?.ini ?? '+'} />
      )}
      <View style={{ flex: 1, gap: 2 }}>
        <Txt w="semibold">{title}</Txt>
        {typeof detail === 'string' ? <Muted>{detail}</Muted> : detail}
      </View>
      {right}
      {press && !right ? <Chev /> : null}
    </Pressable>
  );
}

export function NoCredit({ p }: { p: Patient }) {
  const c = useColors();
  const { pCredOk } = useStore();
  if (pCredOk(p)) return null;
  return <Txt w="bold" size={13} color={c.wine}> · sem créditos</Txt>;
}
