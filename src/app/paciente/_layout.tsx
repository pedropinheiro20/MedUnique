import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';

import { TabBar } from '@/components/tab-bar';
import { useAuth } from '@/state/auth';
import { useWide } from '@/theme';

export default function PacienteLayout() {
  const { ready, session } = useAuth();
  const wide = useWide();
  if (ready && !session) return <Redirect href="/" />;
  return (
    <Tabs
      screenOptions={{ headerShown: false, tabBarPosition: wide ? 'left' : 'bottom' }}
      tabBar={(props) => <TabBar {...props} icons={{ index: 'home', plano: 'plan', agenda: 'calendar', contrato: 'doc', assistente: 'chat' }} />}>
      <Tabs.Screen name="index" options={{ title: 'Início' }} />
      <Tabs.Screen name="plano" options={{ title: 'Meu plano' }} />
      <Tabs.Screen name="agenda" options={{ title: 'Agenda' }} />
      <Tabs.Screen name="contrato" options={{ title: 'Contrato' }} />
      <Tabs.Screen name="assistente" options={{ title: 'Assistente' }} />
    </Tabs>
  );
}
