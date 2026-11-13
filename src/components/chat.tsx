import { useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, ScrollViewInstance, TextInput, View } from 'react-native';

import { askAssistant, ChatAction, ChatMsg } from '@/lib/assistant';
import { useStore } from '@/state/store';
import { Fonts, Radius, useColors } from '@/theme';

import { Button, Chip, H2, Icon, Muted, Row, Screen, Txt } from './ui';

type ActState = 'pending' | 'running' | 'done' | 'cancelled';

// Tela de chat do assistente. Na clínica, as ações sugeridas aparecem como cartões com Confirmar:
// nada é gravado sem o clique da pessoa, e quem grava é o próprio app (com o login e as regras de acesso dela).
export function AssistantChat({ who, intro, suggestions }: { who: 'paciente' | 'clinica'; intro: string; suggestions: string[] }) {
  const c = useColors();
  const store = useStore();
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [acts, setActs] = useState<Record<string, { state: ActState; note?: string }>>({});
  const scroll = useRef<ScrollViewInstance>(null);

  const send = async (raw: string) => {
    const q = raw.trim();
    if (!q || busy) return;
    const next: ChatMsg[] = [...msgs, { role: 'user', content: q }];
    setMsgs(next);
    setText('');
    setError(null);
    setBusy(true);
    const r = await askAssistant(who, next);
    setBusy(false);
    if (r.error) { setError(r.error); return; }
    setMsgs([...next, { role: 'assistant', content: r.reply ?? '', actions: r.actions }]);
  };

  const run = async (a: ChatAction) => {
    setActs((s) => ({ ...s, [a.id]: { state: 'running' } }));
    let err: string | null = null;
    if (a.type === 'agendar') err = await store.scheduleStep(a.stepId!, `${a.date}T${a.time}:00-03:00`);
    else if (a.type === 'desmarcar') err = await store.scheduleStep(a.stepId!, null);
    else if (a.type === 'feita') err = await store.registerStep(a.stepId!, a.patientId);
    else if (a.type === 'baixa') err = await store.markPaid(a.boletoId!);
    setActs((s) => ({ ...s, [a.id]: err ? { state: 'pending', note: err } : { state: 'done' } }));
  };

  const actionCard = (a: ChatAction) => {
    const st = acts[a.id] ?? { state: 'pending' as ActState };
    return (
      <View key={a.id} style={{ backgroundColor: c.surface, borderRadius: Radius.sm, borderWidth: 1, borderColor: c.line, padding: 14, gap: 10 }}>
        <Txt w="semibold" size={14}>{a.label}</Txt>
        {st.note ? <Txt size={13} color={c.wine}>{st.note}</Txt> : null}
        {st.state === 'done' ? <Chip label="Feito" tone="ok" />
          : st.state === 'cancelled' ? <Chip label="Cancelado" tone="plan" />
            : (
              <Row style={{ gap: 8 }}>
                <Button small label={st.state === 'running' ? 'Gravando…' : 'Confirmar'} disabled={st.state === 'running'} onPress={() => run(a)} />
                <Button small variant="ghost" label="Cancelar" disabled={st.state === 'running'}
                  onPress={() => setActs((s) => ({ ...s, [a.id]: { state: 'cancelled' } }))} />
              </Row>
            )}
      </View>
    );
  };

  const bubble = (m: ChatMsg, i: number) => {
    const mine = m.role === 'user';
    return (
      <View key={i} style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '88%', gap: 8 }}>
        <View style={{
          backgroundColor: mine ? c.noir : c.surface, borderRadius: 18,
          borderBottomRightRadius: mine ? 6 : 18, borderBottomLeftRadius: mine ? 18 : 6, paddingVertical: 10, paddingHorizontal: 14,
        }}>
          <Txt size={15} color={mine ? c.onNoir : c.ink} selectable>{m.content}</Txt>
        </View>
        {m.actions?.map(actionCard)}
      </View>
    );
  };

  return (
    <Screen who={who} scroll={false}>
      <KeyboardAvoidingView style={{ flex: 1, gap: 12 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View>
          <Muted size={12}>Assistente com IA</Muted>
          <H2>Assistente</H2>
        </View>
        <ScrollView ref={scroll} style={{ flex: 1 }} contentContainerStyle={{ gap: 12, paddingBottom: 8 }}
          keyboardShouldPersistTaps="handled" onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}>
          {!msgs.length ? (
            <View style={{ gap: 12 }}>
              <View style={{ backgroundColor: c.surface, borderRadius: 18, borderBottomLeftRadius: 6, padding: 14, maxWidth: '88%' }}>
                <Txt size={15}>{intro}</Txt>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {suggestions.map((s) => (
                  <Pressable key={s} onPress={() => send(s)} style={({ pressed }) => ({
                    borderWidth: 1, borderColor: c.line, borderRadius: Radius.pill, paddingVertical: 8, paddingHorizontal: 14,
                    backgroundColor: pressed ? c.sunk : 'transparent',
                  })}>
                    <Txt w="medium" size={13}>{s}</Txt>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : msgs.map(bubble)}
          {busy ? <Row style={{ gap: 8 }}><ActivityIndicator color={c.wine} /><Muted>Pensando…</Muted></Row> : null}
          {error ? <Txt size={14} color={c.wine}>{error}</Txt> : null}
        </ScrollView>
        <Row style={{ gap: 8, alignItems: 'flex-end' }}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Escreva sua pergunta"
            placeholderTextColor={c.muted}
            accessibilityLabel="Pergunta para o assistente"
            multiline
            numberOfLines={1}
            maxLength={1500}
            onKeyPress={(e) => {
              // No computador, Enter envia e Shift+Enter quebra a linha
              const ev = e.nativeEvent as { key: string; shiftKey?: boolean };
              if (Platform.OS === 'web' && ev.key === 'Enter' && !ev.shiftKey) { (e as unknown as { preventDefault: () => void }).preventDefault(); send(text); }
            }}
            style={{ flex: 1, minHeight: 48, maxHeight: 140, backgroundColor: c.surface, borderRadius: 24, borderWidth: 1, borderColor: c.line,
              paddingVertical: 13, paddingHorizontal: 18, fontFamily: Fonts.regular, fontSize: 16, color: c.ink }}
          />
          <Pressable accessibilityRole="button" accessibilityLabel="Enviar" disabled={busy || !text.trim()} onPress={() => send(text)}
            style={({ pressed }) => ({ width: 48, height: 48, borderRadius: 24, backgroundColor: c.noir, alignItems: 'center', justifyContent: 'center',
              opacity: busy || !text.trim() ? 0.4 : pressed ? 0.8 : 1 })}>
            <Icon name="send" size={20} color={c.onNoir} />
          </Pressable>
        </Row>
        <Muted size={11} style={{ textAlign: 'center' }}>
          {who === 'paciente' ? 'Respostas automáticas. Não substituem a orientação da equipe da clínica.' : 'A IA pode errar. Confira antes de confirmar qualquer ação.'}
        </Muted>
      </KeyboardAvoidingView>
    </Screen>
  );
}
