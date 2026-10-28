import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';

import { TabBar } from '@/components/tab-bar';
import { useAuth } from '@/state/auth';

export default function ClinicaLayout() {
  const { ready, session, isStaff } = useAuth();
  if (ready && !session) return <Redirect href="/" />;
  if (ready && !isStaff) return <Redirect href="/paciente" />;
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
