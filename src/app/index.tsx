import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Image as RNImage, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Txt } from '@/components/ui';
import { Fonts, MaxWidth } from '@/theme';

// Tela de abertura: foto da clínica, título serifado e escolha do tipo de acesso.
export default function Abertura() {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <Image source={require('@/assets/images/abertura.jpg')} style={styles.photo} contentFit="cover" />
      <LinearGradient
        style={StyleSheet.absoluteFill}
        colors={['rgba(23,21,21,0)', 'rgba(23,21,21,0.6)', '#171515']}
        locations={[0.38, 0.6, 0.78]}
      />

      <View style={[styles.brand, { top: insets.top + 18 }]}>
        <RNImage source={require('@/assets/images/logo-mark.png')} style={{ width: 30, height: 30 }} />
        <Text style={{ fontFamily: Fonts.regular, fontSize: 17, color: '#F7F2EF' }}>
          Med <Text style={{ fontFamily: Fonts.bold }}>Unique</Text>
        </Text>
      </View>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + 36 }]}>
        <Text style={styles.title}>Seu cuidado.{'\n'}Seu plano.{'\n'}Seu resultado.</Text>
        <Txt color="#D9CFCA">Clínica Med Unique · Saúde e Estética</Txt>
        <Button label="Entrar como paciente" onPress={() => router.replace('/paciente')} style={{ backgroundColor: '#E5BEB6', paddingVertical: 16 }} />
        <Button label="Sou da equipe da clínica" variant="ghostLight" onPress={() => router.replace('/clinica')} style={{ paddingVertical: 16 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#171515' },
  photo: { position: 'absolute', top: 0, left: 0, width: '100%', aspectRatio: 380 / 646 },
  brand: { position: 'absolute', left: 24, flexDirection: 'row', alignItems: 'center', gap: 8 },
  bottom: { flex: 1, justifyContent: 'flex-end', paddingHorizontal: 28, gap: 14, width: '100%', maxWidth: MaxWidth, alignSelf: 'center' },
  title: { fontFamily: Fonts.serif, fontSize: 46, lineHeight: 48, color: '#F7F2EF', marginBottom: 4 },
});
