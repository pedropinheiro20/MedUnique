import { Tabs } from 'expo-router/js-tabs';

import { TabBar } from '@/components/tab-bar';

export default function ClinicaLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => (
        <TabBar {...props} icons={{ index: 'home', agenda: 'calendar', pacientes: 'users', financeiro: 'chart', resgates: 'star' }} />
      )}>
      <Tabs.Screen name="index" options={{ title: 'Painel' }} />
      <Tabs.Screen name="agenda" options={{ title: 'Agenda' }} />
      <Tabs.Screen name="pacientes" options={{ title: 'Pacientes' }} />
      <Tabs.Screen name="financeiro" options={{ title: 'Financeiro' }} />
      <Tabs.Screen name="resgates" options={{ title: 'Resgates' }} />
    </Tabs>
  );
}
