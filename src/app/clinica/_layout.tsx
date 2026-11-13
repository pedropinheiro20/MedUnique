import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';

import { TabBar } from '@/components/tab-bar';
import { useAuth } from '@/state/auth';
import { useWide } from '@/theme';

export default function ClinicaLayout() {
  const { ready, session, isStaff, profile } = useAuth();
  const wide = useWide();
  if (ready && !session) return <Redirect href="/" />;
  if (ready && !isStaff) return <Redirect href="/paciente" />;
  // No celular, "Equipe" fica em Minha conta para não apertar a barra de baixo
  const showTeam = wide && profile?.role === 'admin';
  return (
    <Tabs
      backBehavior="history"
      screenOptions={{ headerShown: false, tabBarPosition: wide ? 'left' : 'bottom' }}
      tabBar={(props) => (
        <TabBar {...props} icons={{
          index: 'home', agenda: 'calendar', pacientes: 'users', financeiro: 'chart', resgates: 'star', assistente: 'chat',
          ...(showTeam ? { equipe: 'key' as const } : {}),
        }} />
      )}>
      <Tabs.Screen name="index" options={{ title: 'Painel' }} />
      <Tabs.Screen name="agenda" options={{ title: 'Agenda' }} />
      <Tabs.Screen name="pacientes" options={{ title: 'Pacientes' }} />
      <Tabs.Screen name="financeiro" options={{ title: 'Financeiro' }} />
      <Tabs.Screen name="resgates" options={{ title: 'Resgates' }} />
      <Tabs.Screen name="assistente" options={{ title: 'Assistente' }} />
      <Tabs.Screen name="equipe" options={{ title: 'Equipe' }} />
      <Tabs.Screen name="ficha/[id]" options={{ title: 'Ficha' }} />
      <Tabs.Screen name="plano/[patientId]" options={{ title: 'Novo plano' }} />
    </Tabs>
  );
}
