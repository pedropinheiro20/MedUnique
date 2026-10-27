import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, Txt } from '@/components/ui';
import { contract } from '@/data/mock';
import { MaxWidth } from '@/theme';

const PAGES = [
  require('@/assets/contrato/pagina-1.jpg'),
  require('@/assets/contrato/pagina-2.jpg'),
  require('@/assets/contrato/pagina-3.jpg'),
];

// Leitor do contrato completo. No app final, o PDF de cada paciente vem da API (assinado e com código de verificação).
export default function ContratoPdf() {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: '#3A3634' }}>
      <StatusBar style="light" />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#171515', paddingTop: insets.top + 10, paddingBottom: 10, paddingHorizontal: 14 }}>
        <Pressable accessibilityLabel="Fechar" onPress={() => router.back()} style={{ width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: 'rgba(247,242,239,0.3)', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="back" size={18} color="#F7F2EF" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Txt w="semibold" size={14} color="#F7F2EF" numberOfLines={1}>Contrato {contract.number}.pdf</Txt>
          <Txt size={12} color="#BDB3AF">{contract.pages} páginas · assinado eletronicamente</Txt>
        </View>
      </View>
      <ScrollView maximumZoomScale={3} contentContainerStyle={{ padding: 12, paddingBottom: insets.bottom + 24, gap: 14, alignItems: 'center' }}>
        {PAGES.map((p, i) => (
          <Image key={i} source={p} accessibilityLabel={`Página ${i + 1} do contrato`} style={{ width: '100%', maxWidth: MaxWidth * 1.7, aspectRatio: 910 / 1286, backgroundColor: '#fff' }} contentFit="contain" />
        ))}
      </ScrollView>
    </View>
  );
}
