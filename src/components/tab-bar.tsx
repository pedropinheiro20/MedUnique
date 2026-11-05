import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Image, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/state/auth';
import { Fonts, MaxWidth, useColors, useWide } from '@/theme';

import { Icon, IconName, Txt } from './ui';

const ROLE_LABEL: Record<string, string> = {
  admin: 'Administrador', reception: 'Recepção', finance: 'Financeiro', professional: 'Profissional', patient: 'Paciente',
};

// Barra de abas no estilo do modelo: ícones de traço, aba ativa em negrito.
// No computador vira um menu lateral com a marca no topo.
export function TabBar({ state, descriptors, navigateToTab, icons }: BottomTabBarProps & { icons: Partial<Record<string, IconName>> }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const wide = useWide();
  const { profile } = useAuth();
  const visible = state.routes.filter((r) => icons[r.name]);
  const current = state.routes[state.index].name;
  // Telas fora do menu (como a ficha da paciente) deixam marcada a aba de Pacientes
  const focusedName = current.startsWith('ficha') || current.startsWith('plano') ? 'pacientes' : current;

  const items = visible.map((route) => {
    const focused = focusedName === route.name;
    const label = (descriptors[route.key].options.title ?? route.name) as string;
    const color = focused ? (wide ? c.onNoir : c.ink) : c.muted;
    return (
      <Pressable
        key={route.key}
        accessibilityRole="tab"
        accessibilityState={{ selected: focused }}
        onPress={() => {
          if (!focused) navigateToTab(route.key);
        }}
        style={(st) => wide
          ? { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, paddingHorizontal: 14, borderRadius: 14,
              backgroundColor: focused ? c.noir : (st as { hovered?: boolean }).hovered ? c.sunk : 'transparent' }
          : { flex: 1, alignItems: 'center', gap: 2, paddingVertical: 6 }}>
        <Icon name={icons[route.name]!} color={color} stroke={focused ? 2.3 : 1.8} size={wide ? 20 : 22} />
        <Txt w={focused ? 'bold' : 'medium'} size={wide ? 15 : 11} color={color}>{label}</Txt>
      </Pressable>
    );
  });

  if (wide) {
    return (
      <View style={{ width: 248, backgroundColor: c.surface, borderRightWidth: 1, borderRightColor: c.line, paddingTop: insets.top + 24, paddingBottom: 20, paddingHorizontal: 16, gap: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 6, marginBottom: 26 }}>
          <Image source={require('@/assets/images/logo-mark.png')} style={{ width: 38, height: 38 }} />
          <View>
            <Text style={{ fontFamily: Fonts.regular, fontSize: 20, color: c.ink }}>
              Med <Text style={{ fontFamily: Fonts.bold }}>Unique</Text>
            </Text>
            <Txt w="semibold" size={10} color={c.muted} style={{ letterSpacing: 1.4 }}>SAÚDE E ESTÉTICA</Txt>
          </View>
        </View>
        {items}
        <View style={{ flex: 1 }} />
        {profile ? (
          <View style={{ paddingHorizontal: 8, gap: 2 }}>
            <Txt w="semibold" size={14} numberOfLines={1}>{profile.full_name || 'Minha conta'}</Txt>
            <Txt size={12} color={c.muted}>{ROLE_LABEL[profile.role] ?? ''}</Txt>
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <View style={{ backgroundColor: c.surface, borderTopWidth: 1, borderTopColor: c.line, paddingBottom: insets.bottom + 6, paddingTop: 6 }}>
      <View style={{ flexDirection: 'row', width: '100%', maxWidth: MaxWidth, alignSelf: 'center' }}>{items}</View>
    </View>
  );
}
