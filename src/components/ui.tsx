import { router } from 'expo-router';
import { createContext, ReactNode, useCallback, useContext, useRef, useState } from 'react';
import {
  ActivityIndicator, Image, Modal, Pressable, ScrollView, StyleProp, StyleSheet, Text, TextInput, TextProps, TextStyle, View, ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { initials } from '@/data/model';
import { useAuth } from '@/state/auth';
import { useStore } from '@/state/store';
import { Fonts, MaxWidth, Radius, useColors } from '@/theme';

// ---------- texto
type TxtProps = TextProps & { w?: keyof typeof Fonts; size?: number; color?: string; style?: StyleProp<TextStyle> };
export function Txt({ w = 'regular', size = 15, color, style, ...rest }: TxtProps) {
  const c = useColors();
  return <Text {...rest} style={[{ fontFamily: Fonts[w], fontSize: size, color: color ?? c.ink, lineHeight: size * 1.4 }, style]} />;
}
export const H1 = (p: TxtProps) => <Txt w="semibold" size={27} {...p} style={[{ letterSpacing: -0.3, lineHeight: 32 }, p.style]} />;
export const H2 = (p: TxtProps) => <Txt w="semibold" size={23} {...p} style={[{ lineHeight: 28 }, p.style]} />;
export const H3 = (p: TxtProps) => <Txt w="semibold" size={15} {...p} />;
export function Muted(p: TxtProps) {
  const c = useColors();
  return <Txt size={13} color={c.muted} {...p} />;
}

// ---------- ícones (traço, 24x24)
const ICONS = {
  home: 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  plan: 'M4 19V9M10 19V5M16 19v-7M22 19H2',
  calendar: 'M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zM3 10h18M8 3v4M16 3v4',
  doc: 'M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8zM14 3v5h5M9 13h6M9 17h4',
  users: 'M9 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.8c1.8.7 3 2.4 3.5 5.2',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  star: 'M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z',
  chevron: 'M9 6l6 6-6 6',
  back: 'M15 6l-6 6 6 6',
  check: 'M5 12.5l4.5 4.5L19 7.5',
};
export type IconName = keyof typeof ICONS;
export function Icon({ name, size = 22, color, stroke = 1.8 }: { name: IconName; size?: number; color?: string; stroke?: number }) {
  const c = useColors();
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d={ICONS[name]} stroke={color ?? c.ink} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// ---------- blocos
export function Card({ children, style, dark, onPress }: { children: ReactNode; style?: StyleProp<ViewStyle>; dark?: boolean; onPress?: () => void }) {
  const c = useColors();
  const base: ViewStyle = { backgroundColor: dark ? c.noir : c.surface, borderRadius: dark ? 24 : Radius.card, padding: 18, gap: 12 };
  if (onPress) {
    return <Pressable onPress={onPress} style={({ pressed }) => [base, pressed && { opacity: 0.85 }, style]}>{children}</Pressable>;
  }
  return <View style={[base, style]}>{children}</View>;
}

export function Row({ children, style, between }: { children: ReactNode; style?: StyleProp<ViewStyle>; between?: boolean }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 12 }, between && { justifyContent: 'space-between' }, style]}>{children}</View>;
}

type BtnVariant = 'primary' | 'ghost' | 'dark' | 'ghostLight';
export function Button({ label, onPress, variant = 'primary', small, disabled, style }: {
  label: string; onPress?: () => void; variant?: BtnVariant; small?: boolean; disabled?: boolean; style?: StyleProp<ViewStyle>;
}) {
  const c = useColors();
  const bg = { primary: c.nude, ghost: 'transparent', dark: c.noir, ghostLight: 'transparent' }[variant];
  const fg = { primary: c.onNude, ghost: c.ink, dark: c.onNoir, ghostLight: c.onNoir }[variant];
  const border = variant === 'ghost' ? c.line : variant === 'ghostLight' ? 'rgba(247,242,239,0.35)' : 'transparent';
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        { backgroundColor: bg, borderColor: border, borderWidth: 1, borderRadius: Radius.pill, paddingVertical: small ? 8 : 13, paddingHorizontal: small ? 14 : 20, alignItems: 'center', justifyContent: 'center' },
        pressed && { opacity: 0.8 }, disabled && { opacity: 0.45 }, style,
      ]}>
      <Txt w="semibold" size={small ? 13 : 15} color={fg}>{label}</Txt>
    </Pressable>
  );
}

type Tone = 'ok' | 'open' | 'late' | 'next' | 'plan';
export function Chip({ label, tone = 'plan' }: { label: string; tone?: Tone }) {
  const c = useColors();
  const map: Record<Tone, [string, string]> = {
    ok: [c.okSoft, c.ok], open: [c.sunk, c.ink], late: [c.wineSoft, c.wine], next: [c.wineSoft, c.wine], plan: [c.sunk, c.muted],
  };
  const [bg, fg] = map[tone];
  return (
    <View style={{ backgroundColor: bg, borderRadius: Radius.pill, paddingVertical: 3, paddingHorizontal: 10, alignSelf: 'flex-start' }}>
      <Txt w="medium" size={12} color={fg}>{label}</Txt>
    </View>
  );
}

export function Avatar({ ini, size = 42, tone = 'sunk' }: { ini: string; size?: number; tone?: 'sunk' | 'nude' | 'noir' }) {
  const c = useColors();
  const bg = { sunk: c.sunk, nude: c.nude, noir: c.noir }[tone];
  const fg = tone === 'noir' ? c.onNoir : c.ink;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Txt w="semibold" size={size * 0.34} color={fg}>{ini}</Txt>
    </View>
  );
}

export function Chev() {
  const c = useColors();
  return (
    <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: c.nude, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name="chevron" size={14} color={c.onNude} stroke={2.2} />
    </View>
  );
}

export function Bar({ pct, color, track, height = 8 }: { pct: number; color?: string; track?: string; height?: number }) {
  const c = useColors();
  return (
    <View style={{ height, borderRadius: height, backgroundColor: track ?? c.sunk, overflow: 'hidden' }}>
      <View style={{ width: `${Math.max(0, Math.min(100, pct))}%`, height: '100%', backgroundColor: color ?? c.rose, borderRadius: height }} />
    </View>
  );
}

export function Ring({ pct, size = 118, label, sub }: { pct: number; size?: number; label: string; sub: string }) {
  const c = useColors();
  const r = 50, C = 2 * Math.PI * r;
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 120 120" style={{ transform: [{ rotate: '-90deg' }] }}>
        <Defs>
          <LinearGradient id="rg" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={c.rose} />
            <Stop offset="1" stopColor={c.ink} />
          </LinearGradient>
        </Defs>
        <Circle cx={60} cy={60} r={r} stroke={c.sunk} strokeWidth={10} fill="none" />
        <Circle cx={60} cy={60} r={r} stroke="url(#rg)" strokeWidth={10} fill="none" strokeLinecap="round" strokeDasharray={`${C}`} strokeDashoffset={C * (1 - pct / 100)} />
      </Svg>
      <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
        <Txt w="medium" size={30} style={{ lineHeight: 34 }}>{label}</Txt>
        <Muted size={11}>{sub}</Muted>
      </View>
    </View>
  );
}

// ---------- tela com cabeçalho da marca
export function Screen({ children, who, scroll = true }: { children: ReactNode; who: 'paciente' | 'clinica'; scroll?: boolean }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { profile, isStaff, signOut, changePassword } = useAuth();
  const { me } = useStore();
  const toast = useToast();
  const [menu, setMenu] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [pw, setPw] = useState('');
  const canSwitch = isStaff && !!me;
  const header = (
    <Row between style={{ marginBottom: 18 }}>
      <Row style={{ gap: 10 }}>
        <Image source={require('@/assets/images/logo-mark.png')} style={{ width: 40, height: 40 }} />
        <View>
          <Text style={{ fontFamily: Fonts.regular, fontSize: 21, color: c.ink }}>
            Med <Text style={{ fontFamily: Fonts.bold }}>Unique</Text>
          </Text>
          <Txt w="semibold" size={10} color={c.muted} style={{ letterSpacing: 1.4 }}>SAÚDE E ESTÉTICA</Txt>
        </View>
      </Row>
      <Pressable accessibilityLabel="Minha conta" onPress={() => setMenu(true)}>
        <Avatar ini={initials(profile?.full_name || me?.name || '?')} size={40} tone="noir" />
      </Pressable>
    </Row>
  );
  const body = (
    <View style={{ width: '100%', maxWidth: MaxWidth, alignSelf: 'center', paddingHorizontal: 16, paddingTop: insets.top + 12, paddingBottom: 32, gap: 16 }}>
      {header}
      {children}
    </View>
  );
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      {scroll ? <ScrollView keyboardShouldPersistTaps="handled">{body}</ScrollView> : body}
      <Sheet
        visible={menu}
        onClose={() => setMenu(false)}
        title="Minha conta"
        eyebrow={profile?.full_name || undefined}
        text={canSwitch
          ? `Você está vendo o app como ${who === 'clinica' ? 'equipe da clínica' : 'paciente'}. Como você também tem um plano de paciente, pode alternar entre as duas áreas.`
          : 'Você está conectada ao app MedUnique.'}>
        {canSwitch ? (
          <Button label={who === 'clinica' ? 'Ver como paciente' : 'Ver como clínica'} variant="dark"
            onPress={() => { setMenu(false); router.replace(who === 'clinica' ? '/paciente' : '/clinica'); }} />
        ) : null}
        <Button label="Criar ou trocar senha" variant="ghost" onPress={() => { setMenu(false); setPw(''); setPwOpen(true); }} />
        <Button label="Sair" variant="ghost" onPress={async () => { setMenu(false); await signOut(); router.replace('/'); }} />
      </Sheet>
      <Sheet visible={pwOpen} onClose={() => setPwOpen(false)} title="Criar ou trocar senha"
        text="Escolha uma senha com pelo menos 6 caracteres. Use ela para entrar no app junto com o seu e-mail."
        okLabel="Salvar senha" okDisabled={pw.length < 6}
        onOk={async () => { const e = await changePassword(pw); setPwOpen(false); toast(e ?? 'Senha salva.'); }}>
        <TextInput value={pw} onChangeText={setPw} secureTextEntry autoCapitalize="none" placeholder="Nova senha"
          accessibilityLabel="Nova senha" textContentType="newPassword" autoComplete="new-password" placeholderTextColor={c.muted}
          style={{ backgroundColor: c.sunk, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16, fontFamily: Fonts.regular, fontSize: 17, color: c.ink }} />
      </Sheet>
    </View>
  );
}

// Carregando, erro ou vazio no lugar do conteúdo
export function StateView({ who, loading, error, empty, onRetry }: {
  who: 'paciente' | 'clinica'; loading?: boolean; error?: string | null; empty?: string; onRetry?: () => void;
}) {
  const c = useColors();
  return (
    <Screen who={who}>
      <Card style={{ alignItems: 'center', paddingVertical: 32 }}>
        {loading ? <ActivityIndicator color={c.wine} /> : null}
        <Muted size={14} style={{ textAlign: 'center' }}>{loading ? 'Carregando…' : error ?? empty}</Muted>
        {!loading && error && onRetry ? <Button label="Tentar de novo" small onPress={onRetry} /> : null}
      </Card>
    </Screen>
  );
}

// ---------- folha de confirmação (bottom sheet)
export function Sheet({ visible, onClose, title, eyebrow, text, children, okLabel = 'Confirmar', onOk, okDisabled }: {
  visible: boolean; onClose: () => void; title: string; eyebrow?: string; text?: string; children?: ReactNode;
  okLabel?: string; onOk?: () => void; okDisabled?: boolean;
}) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }} onPress={onClose}>
        <Pressable
          onPress={() => {}}
          style={{ backgroundColor: c.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 22, paddingBottom: 22 + insets.bottom, gap: 14, width: '100%', maxWidth: MaxWidth, alignSelf: 'center' }}>
          {eyebrow ? <Muted size={12}>{eyebrow}</Muted> : null}
          <H2>{title}</H2>
          {text ? <Muted size={14} style={{ lineHeight: 20 }}>{text}</Muted> : null}
          {children}
          <Row>
            <Button label={onOk ? 'Cancelar' : 'Fechar'} variant="ghost" onPress={onClose} style={{ flex: 1 }} />
            {onOk ? <Button label={okLabel} disabled={okDisabled} onPress={() => { onClose(); onOk(); }} style={{ flex: 1 }} /> : null}
          </Row>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ---------- toast
const ToastCtx = createContext<(msg: string) => void>(() => {});
export function ToastProvider({ children }: { children: ReactNode }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const [msg, setMsg] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = useCallback((m: string) => {
    setMsg(m);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMsg(null), 2600);
  }, []);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      {msg ? (
        <View pointerEvents="none" style={{ position: 'absolute', left: 16, right: 16, bottom: insets.bottom + 90, alignItems: 'center' }}>
          <View style={{ backgroundColor: c.ink, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 16, maxWidth: 440 }}>
            <Txt size={14} color={c.bg}>{msg}</Txt>
          </View>
        </View>
      ) : null}
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);
