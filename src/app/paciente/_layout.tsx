import { Tabs } from 'expo-router/js-tabs';

import { TabBar } from '@/components/tab-bar';

export default function PacienteLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <TabBar {...props} icons={{ index: 'home', plano: 'plan', agenda: 'calendar', contrato: 'doc' }} />}>
      <Tabs.Screen name="index" options={{ title: 'Início' }} />
      <Tabs.Screen name="plano" options={{ title: 'Meu plano' }} />
      <Tabs.Screen name="agenda" options={{ title: 'Agenda' }} />
      <Tabs.Screen name="contrato" options={{ title: 'Contrato' }} />
    </Tabs>
  );
}
