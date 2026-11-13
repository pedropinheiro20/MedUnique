import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import {
  Image as RNImage, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, TextInputProps, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Txt } from '@/components/ui';
import { useAuth } from '@/state/auth';
import { Fonts, useColors, useWide } from '@/theme';

type Mode = 'entrar' | 'criar' | 'link' | 'link-enviado';

const SITE = 'https://clinicamedunique.vercel.app';
const FOTO = require('@/assets/images/entrar.jpg');
const PONTOS = [
  'Sessões, créditos e boletos sempre à mão',
  'Contrato e comprovantes guardados com cuidado',
  'Acesso protegido por e-mail e senha',
];

const abrirSite = () => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') window.location.href = '/'; // o site fica no mesmo endereço
  else Linking.openURL(SITE);
};

// Tela de entrada do sistema. No computador: foto da clínica à esquerda e o formulário à direita.
// No celular: a foto vira uma faixa no alto. No primeiro acesso, a pessoa cria a conta com o código que a clínica entregou.
export default function Entrar() {
  const c = useColors();
  const wide = useWide();
  const insets = useSafeAreaInsets();
  const { ready, session, isStaff, signIn, signUp, sendCode, verifyCode } = useAuth();
  const [mode, setMode] = useState<Mode>('entrar');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [show, setShow] = useState(false);
  const [access, setAccess] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focus, setFocus] = useState<string | null>(null);

  if (ready && session) return <Redirect href={isStaff ? '/clinica' : '/paciente'} />;

  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const go = (m: Mode) => { setMode(m); setError(null); setPassword(''); setPassword2(''); setShow(false); };
  const run = async (f: () => Promise<string | null>, after?: () => void) => {
    setBusy(true); setError(null);
    const e = await f();
    setBusy(false);
    if (e) setError(e); else after?.();
  };
  const submit = () => {
    if (mode === 'entrar') return run(() => signIn(email, password));
    if (mode === 'criar') {
      if (password !== password2) { setError('As duas senhas estão diferentes.'); return; }
      return run(() => signUp(email, password, access));
    }
    if (mode === 'link') return run(() => sendCode(email), () => { setMode('link-enviado'); setCode(''); });
    return run(() => verifyCode(email, code));
  };
  const canSubmit = !busy && validEmail && (
    mode === 'entrar' ? password.length > 0
      : mode === 'criar' ? password.length >= 6 && password2.length > 0 && access.length === 6
        : mode === 'link' ? true : code.length >= 6);

  const title = { entrar: 'Acesse a sua conta', criar: 'Primeiro acesso', link: 'Esqueci a senha', 'link-enviado': 'Confira seu e-mail' }[mode];
  const intro = {
    entrar: 'Entre com o e-mail cadastrado na clínica e a sua senha.',
    criar: 'Use o e-mail que você informou à clínica e o código de acesso de 6 dígitos que a clínica te passou. Depois, crie a sua senha.',
    link: 'Informe o seu e-mail. Enviamos um link para você entrar.',
    'link-enviado': `Enviamos um e-mail para ${email.trim().toLowerCase()}. Toque no link do e-mail neste aparelho para entrar, ou digite abaixo o código, se ele vier no e-mail.`,
  }[mode];
  const okLabel = busy ? 'Aguarde…' : { entrar: 'Entrar', criar: 'Criar conta e entrar', link: 'Enviar link', 'link-enviado': 'Entrar' }[mode];

  // Campo com rótulo em cima, borda que acende ao tocar e, na senha, o botão Mostrar
  const field = (id: string, label: string, props: TextInputProps, toggle?: boolean) => (
    <View style={{ gap: 7 }}>
      <Txt w="semibold" size={14}>{label}</Txt>
      <View style={[styles.input, { backgroundColor: c.surface, borderColor: focus === id ? c.rose : c.line },
        focus === id && Platform.OS === 'web' && ({ boxShadow: `0 0 0 4px ${c.wineSoft}` } as object)]}>
        <TextInput
          placeholderTextColor={c.muted} accessibilityLabel={label}
          onFocus={() => setFocus(id)} onBlur={() => setFocus(null)}
          onSubmitEditing={() => canSubmit && submit()}
          {...props}
          style={[styles.inputText, { color: c.ink }, Platform.OS === 'web' && ({ outlineStyle: 'none' } as object), props.style]}
        />
        {toggle ? (
          <Pressable onPress={() => setShow((s) => !s)} hitSlop={8} accessibilityRole="button" accessibilityLabel={show ? 'Esconder senha' : 'Mostrar senha'}>
            <Txt w="semibold" size={14} color={c.wine}>{show ? 'Esconder' : 'Mostrar'}</Txt>
          </Pressable>
        ) : null}
      </View>
    </View>
  );

  const link = (label: string, onPress: () => void, strong?: boolean) => (
    <Pressable onPress={onPress} disabled={busy} hitSlop={6} accessibilityRole="link" style={({ pressed }) => [pressed && { opacity: 0.6 }]}>
      <Txt w={strong ? 'semibold' : 'regular'} size={14} color={strong ? c.wine : c.muted}>{label}</Txt>
    </Pressable>
  );

  const marca = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <RNImage source={require('@/assets/images/logo-mark.png')} style={{ width: 44, height: 44 }} />
      <View>
        <Text style={{ fontFamily: Fonts.serif, fontSize: 28, lineHeight: 30, color: c.ink }}>Med Unique</Text>
        <Txt w="semibold" size={10} color={c.wine} style={{ letterSpacing: 2.6, lineHeight: 14 }}>SAÚDE E ESTÉTICA</Txt>
      </View>
    </View>
  );

  const form = (
    <View style={{ width: '100%', maxWidth: 400, alignSelf: 'center', gap: 22 }}>
      {marca}
      <View style={{ gap: 6, marginTop: wide ? 18 : 4 }}>
        <Text style={{ fontFamily: Fonts.serif, fontSize: wide ? 42 : 36, lineHeight: wide ? 46 : 40, color: c.ink }}>{title}</Text>
        <Txt size={15} color={c.muted}>{intro}</Txt>
      </View>
      <View style={{ gap: 16 }}>
        {mode === 'link-enviado' ? field('codigo', 'Código recebido', {
          value: code, onChangeText: (t) => setCode(t.replace(/\D/g, '').slice(0, 8)), placeholder: '••••••',
          keyboardType: 'number-pad', textContentType: 'oneTimeCode', autoComplete: 'one-time-code', autoFocus: true,
          style: { letterSpacing: 6, textAlign: 'center', fontSize: 22 },
        }) : (
          <>
            {field('email', 'E-mail', {
              value: email, onChangeText: setEmail, placeholder: 'voce@exemplo.com',
              keyboardType: 'email-address', autoCapitalize: 'none', autoCorrect: false, textContentType: 'emailAddress', autoComplete: 'email',
            })}
            {mode === 'criar' ? field('acesso', 'Código de acesso', {
              value: access, onChangeText: (t) => setAccess(t.replace(/\D/g, '').slice(0, 6)), placeholder: '6 dígitos que a clínica passou',
              keyboardType: 'number-pad',
            }) : null}
            {mode !== 'link' ? field('senha', mode === 'criar' ? 'Crie uma senha' : 'Senha', {
              value: password, onChangeText: setPassword, placeholder: mode === 'criar' ? 'Mínimo de 6 caracteres' : 'Sua senha',
              secureTextEntry: !show, autoCapitalize: 'none',
              textContentType: mode === 'criar' ? 'newPassword' : 'password', autoComplete: mode === 'criar' ? 'new-password' : 'current-password',
            }, true) : null}
            {mode === 'criar' ? field('senha2', 'Repita a senha', {
              value: password2, onChangeText: setPassword2, placeholder: 'Digite a senha de novo',
              secureTextEntry: !show, autoCapitalize: 'none', textContentType: 'newPassword', autoComplete: 'new-password',
            }) : null}
          </>
        )}
        {mode === 'entrar' ? (
          <View style={{ alignSelf: 'flex-end', marginTop: -4 }}>{link('Esqueci a senha', () => go('link'), true)}</View>
        ) : null}
        {error ? (
          <View style={{ backgroundColor: c.wineSoft, borderRadius: 12, padding: 12 }}>
            <Txt size={14} color={c.wine}>{error}</Txt>
          </View>
        ) : null}
        <Pressable
          accessibilityRole="button" disabled={!canSubmit} onPress={submit}
          style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
            styles.botao, { backgroundColor: c.noir },
            Platform.OS === 'web' && ({ boxShadow: '0 14px 30px -14px rgba(23,21,21,0.55)', transition: 'transform .15s ease, opacity .15s ease' } as object),
            hovered && canSubmit && ({ transform: [{ translateY: -1 }] }),
            pressed && { opacity: 0.85 }, !canSubmit && { opacity: 0.45 },
          ]}>
          <Txt w="semibold" size={16} color={c.onNoir}>{okLabel}</Txt>
        </Pressable>
      </View>

      <View style={{ height: 1, backgroundColor: c.line }} />
      <View style={{ gap: 12 }}>
        {mode === 'entrar' ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            <Txt size={14} color={c.muted}>Primeiro acesso?</Txt>
            {link('Criar minha conta', () => go('criar'), true)}
          </View>
        ) : null}
        {mode === 'link-enviado' ? link('Reenviar e-mail', () => run(() => sendCode(email)), true) : null}
        {mode !== 'entrar' ? link('‹ Voltar para entrar', () => go('entrar'), true) : null}
        {link('←  Voltar para o site', abrirSite)}
      </View>
    </View>
  );

  // Foto com o texto da clínica (no computador ocupa a metade esquerda; no celular, uma faixa no alto)
  const painel = (
    <>
      <Image source={FOTO} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition={wide ? 'center' : 'top'} />
      <LinearGradient style={StyleSheet.absoluteFill}
        colors={['rgba(23,21,21,0.25)', 'rgba(23,21,21,0.35)', 'rgba(23,21,21,0.92)']} locations={[0, 0.45, 1]} />
      <View style={{ position: 'absolute', left: wide ? 56 : 22, right: wide ? 56 : 22, bottom: wide ? 56 : 46, gap: wide ? 18 : 8 }}>
        <Txt w="semibold" size={wide ? 12 : 11} color={c.nude} style={{ letterSpacing: 2.8 }}>ÁREA DA PACIENTE E DA EQUIPE</Txt>
        <Text style={{ fontFamily: Fonts.serif, color: '#F7F2EF', fontSize: wide ? 54 : 32, lineHeight: wide ? 58 : 35, maxWidth: 520 }}>
          Seu cuidado e seu plano em um só lugar.
        </Text>
        {wide ? (
          <View style={{ gap: 12, marginTop: 6 }}>
            {PONTOS.map((p) => (
              <View key={p} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: 'rgba(229,190,182,0.28)', alignItems: 'center', justifyContent: 'center' }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.nude }} />
                </View>
                <Txt size={16} color="#EDE4E0">{p}</Txt>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </>
  );

  if (wide) {
    return (
      <View style={{ flex: 1, flexDirection: 'row', backgroundColor: c.bg }}>
        <StatusBar style="light" />
        <View style={{ flex: 1.05, overflow: 'hidden', backgroundColor: c.noir }}>{painel}</View>
        <KeyboardAvoidingView style={{ flex: 1 }}>
          <LinearGradient style={StyleSheet.absoluteFill} colors={[c.surface, c.bg]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 56 }}>
            {form}
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar style="light" />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1 }}>
        <View style={{ height: 250 + insets.top, backgroundColor: c.noir, overflow: 'hidden' }}>{painel}</View>
        <View style={{ padding: 22, paddingTop: 28, paddingBottom: insets.bottom + 32, borderTopLeftRadius: 28, borderTopRightRadius: 28, marginTop: -24, backgroundColor: c.bg }}>
          {form}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  input: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 16 },
  inputText: { flex: 1, paddingVertical: 15, fontFamily: Fonts.regular, fontSize: 16 },
  botao: { borderRadius: 14, paddingVertical: 17, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
});
