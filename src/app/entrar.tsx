import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Card, H1, Muted, Txt } from '@/components/ui';
import { useAuth } from '@/state/auth';
import { Fonts, MaxWidth, useColors } from '@/theme';

type Mode = 'entrar' | 'criar' | 'link' | 'link-enviado';

// Login com e-mail e senha. No primeiro acesso, a pessoa cria a conta com o código que a clínica entregou.
export default function Entrar() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { ready, session, isStaff, signIn, signUp, sendCode, verifyCode } = useAuth();
  const [mode, setMode] = useState<Mode>('entrar');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [access, setAccess] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (ready && session) return <Redirect href={isStaff ? '/clinica' : '/paciente'} />;

  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const go = (m: Mode) => { setMode(m); setError(null); setPassword(''); setPassword2(''); };
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

  const input = {
    backgroundColor: c.sunk, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16,
    fontFamily: Fonts.regular, fontSize: 17, color: c.ink,
  } as const;
  const field = (props: React.ComponentProps<typeof TextInput>) => (
    <TextInput placeholderTextColor={c.muted} style={input} onSubmitEditing={() => canSubmit && submit()} {...props} />
  );

  const title = { entrar: 'Entrar', criar: 'Criar conta', link: 'Entrar pelo e-mail', 'link-enviado': 'Confira seu e-mail' }[mode];
  const intro = {
    entrar: 'Use o e-mail que você informou à clínica e a sua senha.',
    criar: 'Primeiro acesso? Use o e-mail que você informou à clínica e o código de acesso de 6 dígitos que a clínica te passou. Depois, crie a sua senha.',
    link: 'Enviamos um link de acesso para o seu e-mail.',
    'link-enviado': `Enviamos um e-mail para ${email.trim().toLowerCase()}. Toque no link do e-mail neste aparelho para entrar, ou digite abaixo o código, se ele vier no e-mail.`,
  }[mode];
  const okLabel = busy ? 'Aguarde…' : { entrar: 'Entrar', criar: 'Criar conta e entrar', link: 'Enviar link', 'link-enviado': 'Entrar' }[mode];

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
        <View style={{ width: '100%', maxWidth: MaxWidth, alignSelf: 'center', padding: 20, paddingTop: insets.top + 20, gap: 18 }}>
          <Button label="‹ Voltar" variant="ghost" small style={{ alignSelf: 'flex-start' }}
            onPress={() => (mode !== 'entrar' ? go('entrar') : router.canGoBack() ? router.back() : router.replace('/'))} />
          <Image source={require('@/assets/images/logo-mark.png')} style={{ width: 52, height: 52 }} />
          <View style={{ gap: 6 }}>
            <H1>{title}</H1>
            <Muted size={15}>{intro}</Muted>
          </View>
          <Card style={{ gap: 14 }}>
            {mode === 'link-enviado' ? (
              <TextInput
                value={code} onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 8))}
                placeholder="Código" placeholderTextColor={c.muted} accessibilityLabel="Código recebido por e-mail"
                keyboardType="number-pad" textContentType="oneTimeCode" autoComplete="one-time-code" autoFocus
                style={[input, { letterSpacing: 6, textAlign: 'center', fontSize: 24 }]}
                onSubmitEditing={() => canSubmit && submit()}
              />
            ) : (
              <>
                {field({
                  value: email, onChangeText: setEmail, placeholder: 'seuemail@exemplo.com', accessibilityLabel: 'E-mail',
                  keyboardType: 'email-address', autoCapitalize: 'none', autoCorrect: false, textContentType: 'emailAddress', autoComplete: 'email',
                })}
                {mode === 'criar' ? field({
                  value: access, onChangeText: (t) => setAccess(t.replace(/\D/g, '').slice(0, 6)), placeholder: 'Código de acesso (6 dígitos)',
                  accessibilityLabel: 'Código de acesso', keyboardType: 'number-pad',
                }) : null}
                {mode !== 'link' ? field({
                  value: password, onChangeText: setPassword, placeholder: mode === 'criar' ? 'Crie uma senha (mínimo 6 caracteres)' : 'Senha',
                  accessibilityLabel: 'Senha', secureTextEntry: true, autoCapitalize: 'none',
                  textContentType: mode === 'criar' ? 'newPassword' : 'password', autoComplete: mode === 'criar' ? 'new-password' : 'current-password',
                }) : null}
                {mode === 'criar' ? field({
                  value: password2, onChangeText: setPassword2, placeholder: 'Repita a senha', accessibilityLabel: 'Repita a senha',
                  secureTextEntry: true, autoCapitalize: 'none', textContentType: 'newPassword', autoComplete: 'new-password',
                }) : null}
              </>
            )}
            {error ? <Txt size={14} color={c.wine}>{error}</Txt> : null}
            <Button label={okLabel} disabled={!canSubmit} onPress={submit} />
            {mode === 'entrar' ? (
              <>
                <Button label="Primeiro acesso? Criar conta" variant="ghost" small disabled={busy} onPress={() => go('criar')} />
                <Button label="Esqueci a senha" variant="ghost" small disabled={busy} onPress={() => go('link')} />
              </>
            ) : null}
            {mode === 'criar' ? <Button label="Já tenho conta. Entrar" variant="ghost" small disabled={busy} onPress={() => go('entrar')} /> : null}
            {mode === 'link-enviado' ? <Button label="Reenviar e-mail" variant="ghost" small disabled={busy} onPress={() => run(() => sendCode(email))} /> : null}
          </Card>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
