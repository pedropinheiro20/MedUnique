import { CormorantGaramond_300Light } from '@expo-google-fonts/cormorant-garamond';
import { Nunito_400Regular, Nunito_500Medium, Nunito_600SemiBold, Nunito_700Bold, useFonts } from '@expo-google-fonts/nunito';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { ToastProvider } from '@/components/ui';
import { StoreProvider } from '@/state/store';
import { useColors } from '@/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const c = useColors();
  const [loaded] = useFonts({
    Nunito_400Regular, Nunito_500Medium, Nunito_600SemiBold, Nunito_700Bold, CormorantGaramond_300Light,
  });
  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);
  if (!loaded) return null;

  return (
    <StoreProvider>
      <ToastProvider>
        <StatusBar style="auto" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="paciente" />
          <Stack.Screen name="clinica" />
          <Stack.Screen name="ficha/[id]" />
          <Stack.Screen name="contrato-pdf" options={{ presentation: 'modal' }} />
        </Stack>
      </ToastProvider>
    </StoreProvider>
  );
}
