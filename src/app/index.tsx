import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Image as RNImage, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Txt } from '@/components/ui';
import { useAuth } from '@/state/auth';
import { Fonts, MaxWidth, useWide } from '@/theme';

// Tela de abertura: foto da clínica, título serifado e entrada. Quem já entrou vai direto para a sua área.
// No computador, a foto fica à esquerda e a entrada à direita.
export default function Abertura() {
  const insets = useSafeAreaInsets();
  const wide = useWide();
  const { ready, session, isStaff } = useAuth();
  if (ready && session) return <Redirect href={isStaff ? '/clinica' : '/paciente'} />;

  const brand = (
    <View style={[styles.brand, { top: insets.top + (wide ? 32 : 18), left: wide ? 40 : 24 }]}>
      <RNImage source={require('@/assets/images/logo-mark.png')} style={{ width: 30, height: 30 }} />
      <Text style={{ fontFamily: Fonts.regular, fontSize: 17, color: '#F7F2EF' }}>
        Med <Text style={{ fontFamily: Fonts.bold }}>Unique</Text>
      </Text>
    </View>
  );
  const entry = (
    <>
      <Text style={[styles.title, wide && { fontSize: 60, lineHeight: 62 }]}>Seu cuidado.{'\n'}Seu plano.{'\n'}Seu resultado.</Text>
      <Txt color="#D9CFCA">Clínica Med Unique · Saúde e Estética</Txt>
      <Button label="Entrar no sistema" disabled={!ready} onPress={() => router.push('/entrar')} style={{ backgroundColor: '#E5BEB6', paddingVertical: 16 }} />
      <Txt size={13} color="#BDB3AF" style={{ textAlign: 'center' }}>Pacientes e equipe entram com o e-mail cadastrado na clínica.</Txt>
    </>
  );

  if (wide) {
    return (
      <View style={[styles.root, { flexDirection: 'row' }]}>
        <StatusBar style="light" />
        <View style={{ flex: 1.1 }}>
          <Image source={require('@/assets/images/abertura.jpg')} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition="top" />
          <LinearGradient style={StyleSheet.absoluteFill} colors={['rgba(23,21,21,0)', 'rgba(23,21,21,0)', '#171515']} locations={[0, 0.7, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
          {brand}
        </View>
        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 56 }}>
          <View style={{ gap: 16, width: '100%', maxWidth: 420 }}>{entry}</View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <Image source={require('@/assets/images/abertura.jpg')} style={styles.photo} contentFit="cover" />
      <LinearGradient
        style={StyleSheet.absoluteFill}
        colors={['rgba(23,21,21,0)', 'rgba(23,21,21,0.6)', '#171515']}
        locations={[0.38, 0.6, 0.78]}
      />
      {brand}
      <View style={[styles.bottom, { paddingBottom: insets.bottom + 36 }]}>{entry}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#171515' },
  photo: { position: 'absolute', top: 0, left: 0, width: '100%', aspectRatio: 380 / 646 },
  brand: { position: 'absolute', flexDirection: 'row', alignItems: 'center', gap: 8 },
  bottom: { flex: 1, justifyContent: 'flex-end', paddingHorizontal: 28, gap: 14, width: '100%', maxWidth: MaxWidth, alignSelf: 'center' },
  title: { fontFamily: Fonts.serif, fontSize: 46, lineHeight: 48, color: '#F7F2EF', marginBottom: 4 },
});
