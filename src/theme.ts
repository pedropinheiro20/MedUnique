import { useColorScheme } from 'react-native';

// Paleta do modelo de referência (bege-rosado, quase preto e nude) com o símbolo da logo MedUnique.
const light = {
  bg: '#EFE7E3',
  surface: '#FAF7F5',
  sunk: '#EEE5E1',
  ink: '#171515',
  muted: '#857E7B',
  line: '#E7DDD8',
  noir: '#171515',
  onNoir: '#F7F2EF',
  nude: '#E5BEB6',
  onNude: '#171515',
  rose: '#E2A79C',
  wine: '#9C5F55',
  wineSoft: '#F4E4E0',
  ok: '#4C7A5F',
  okSoft: '#E1ECE5',
};

const dark: typeof light = {
  bg: '#100F0F',
  surface: '#1B1919',
  sunk: '#252222',
  ink: '#F3EEEB',
  muted: '#A79F9C',
  line: '#2F2B2A',
  noir: '#272323',
  onNoir: '#F7F2EF',
  nude: '#DDB0A7',
  onNude: '#171515',
  rose: '#E2A79C',
  wine: '#E7AFA4',
  wineSoft: '#36282A',
  ok: '#8CC9A8',
  okSoft: '#1F2E26',
};

export type Palette = typeof light;

export function useColors(): Palette {
  return useColorScheme() === 'dark' ? dark : light;
}

export const Fonts = {
  regular: 'Nunito_400Regular',
  medium: 'Nunito_500Medium',
  semibold: 'Nunito_600SemiBold',
  bold: 'Nunito_700Bold',
  serif: 'CormorantGaramond_300Light',
};

export const Radius = { card: 22, pill: 999, sm: 14 };
export const MaxWidth = 480;
