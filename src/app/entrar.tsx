import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Card, H1, Muted, Txt } from '@/components/ui';
import { useAuth } from '@/state/auth';
import { Fonts, MaxWidth, useColors } from '@/theme';

// Login sem senha: a pessoa digita o e-mail e entra pelo link do e-mail ou pelo código de 6 dígitos.
export default function Entrar() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { ready, session, isStaff, sendCode, verifyCode } = useAuth();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (ready && session) return <Redirect href={isStaff ? '/clinica' : '/paciente'} />;

  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const send = async () => {
    setBusy(true); setError(null);
    const e = await sendCode(email);
    setBusy(false);
    if (e) setError(e); else { setSent(true); setCode(''); }
  };
  const verify = async () => {
    setBusy(true); setError(null);
    const e = await verifyCode(email, code);
    setBusy(false);
    if (e) setError(e);
  };
  const input = {
    backgroundColor: c.sunk, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16,
    fontFamily: Fonts.regular, fontSize: 17, color: c.ink,
  } as const;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
        <View style={{ width: '100%', maxWidth: MaxWidth, alignSelf: 'center', padding: 20, paddingTop: insets.top + 20, gap: 18 }}>
          <Button label="‹ Voltar" variant="ghost" small style={{ alignSelf: 'flex-start' }}
            onPress={() => (sent ? setSent(false) : router.canGoBack() ? router.back() : router.replace('/'))} />
          <Image source={require('@/assets/images/logo-mark.png')} style={{ width: 52, height: 52 }} />
          <View style={{ gap: 6 }}>
            <H1>{sent ? 'Confira seu e-mail' : 'Entrar'}</H1>
            <Muted size={15}>
              {sent ? `Enviamos um e-mail para ${email.trim().toLowerCase()}. Toque no link do e-mail neste aparelho para entrar, ou digite abaixo o código, se ele vier no e-mail. Chega em até 1 minuto; confira também o spam.`
                : 'Use o e-mail que você informou à clínica. Vamos enviar um e-mail para confirmar que é você.'}
            </Muted>
          </View>
          <Card style={{ gap: 14 }}>
            {sent ? (
              <TextInput
                value={code} onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 8))}
                placeholder="Código" placeholderTextColor={c.muted} accessibilityLabel="Código recebido por e-mail"
                keyboardType="number-pad" textContentType="oneTimeCode" autoComplete="one-time-code" autoFocus
                style={[input, { letterSpacing: 6, textAlign: 'center', fontSize: 24 }]}
                onSubmitEditing={() => code.length >= 6 && verify()}
              />
            ) : (
              <TextInput
                value={email} onChangeText={setEmail}
                placeholder="seuemail@exemplo.com" placeholderTextColor={c.muted} accessibilityLabel="E-mail"
                keyboardType="email-address" autoCapitalize="none" autoCorrect={false} textContentType="emailAddress" autoComplete="email" autoFocus
                style={input}
                onSubmitEditing={() => validEmail && send()}
              />
            )}
            {error ? <Txt size={14} color={c.wine}>{error}</Txt> : null}
            {sent ? (
              <>
                <Button label={busy ? 'Conferindo…' : 'Entrar'} disabled={busy || code.length < 6} onPress={verify} />
                <Button label="Reenviar código" variant="ghost" small disabled={busy} onPress={send} />
              </>
            ) : (
              <Button label={busy ? 'Enviando…' : 'Enviar e-mail de acesso'} disabled={busy || !validEmail} onPress={send} />
            )}
          </Card>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
