import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MaxWidth, useColors } from '@/theme';

import { Icon, IconName, Txt } from './ui';

// Barra de abas no estilo do modelo: ícones de traço, aba ativa em negrito.
export function TabBar({ state, descriptors, navigateToTab, icons }: BottomTabBarProps & { icons: Record<string, IconName> }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const visible = state.routes.filter((r) => icons[r.name]);
  return (
    <View style={{ backgroundColor: c.surface, borderTopWidth: 1, borderTopColor: c.line, paddingBottom: insets.bottom + 6, paddingTop: 6 }}>
      <View style={{ flexDirection: 'row', width: '100%', maxWidth: MaxWidth, alignSelf: 'center' }}>
        {visible.map((route) => {
          const focusedName = state.routes[state.index].name;
          const focused = focusedName === route.name;
          const label = (descriptors[route.key].options.title ?? route.name) as string;
          const color = focused ? c.ink : c.muted;
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              onPress={() => {
                if (!focused) navigateToTab(route.key);
              }}
              style={{ flex: 1, alignItems: 'center', gap: 2, paddingVertical: 6 }}>
              <Icon name={icons[route.name]} color={color} stroke={focused ? 2.3 : 1.8} />
              <Txt w={focused ? 'bold' : 'medium'} size={11} color={color}>{label}</Txt>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
