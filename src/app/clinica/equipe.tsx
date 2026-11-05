import * as Clipboard from 'expo-clipboard';
import { Redirect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { Avatar, Button, Card, Chip, H2, H3, Muted, Row, Screen, Sheet, Txt, useToast } from '@/components/ui';
import { initials } from '@/data/model';
import { supabase } from '@/lib/supabase';
import { Role, useAuth } from '@/state/auth';
import { Fonts, useColors, useWide } from '@/theme';

type Member = { email: string; full_name: string; role: Role; access_code: string | null; profile_id: string | null };

const ROLES: [Role, string, string][] = [
  ['reception', 'Recepção', 'Pacientes, agenda e resgates'],
  ['finance', 'Financeiro', 'Boletos e pagamentos'],
  ['professional', 'Profissional', 'Atendimentos e fichas'],
  ['admin', 'Administrador', 'Tudo, inclusive a equipe'],
];
const roleLabel = (r: Role) => ROLES.find((x) => x[0] === r)?.[1] ?? r;

const errText = (m: string) =>
  /próprio/.test(m) ? m : /E-mail inválido/.test(m) ? 'Confira o e-mail digitado.' : 'Não foi possível salvar. Confira a conexão e tente de novo.';

// Equipe e acessos: o administrador cadastra quem trabalha na clínica e escolhe o cargo de cada pessoa.
export default function Equipe() {
  const c = useColors();
  const wide = useWide();
  const toast = useToast();
  const { profile, session, ready } = useAuth();
  const [list, setList] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [form, setForm] = useState<{ open: boolean; edit: boolean; name: string; email: string; role: Role }>({ open: false, edit: false, name: '', email: '', role: 'reception' });
  const [removing, setRemoving] = useState<Member | null>(null);
  const [created, setCreated] = useState<{ name: string; email: string; code: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('team_overview');
    setFailed(!!error);
    setList((data as Member[]) ?? []);
    setLoading(false);
  }, []);
  useEffect(() => { if (profile?.role === 'admin') load(); }, [profile?.role, load]);

  if (ready && profile && profile.role !== 'admin') return <Redirect href="/clinica" />;

  const myEmail = session?.user.email?.toLowerCase();
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim());

  const save = async () => {
    const { data, error } = await supabase.rpc('save_staff', { p_email: form.email, p_name: form.name, p_role: form.role });
    if (error) { toast(errText(error.message)); return; }
    await load();
    const joined = list.find((m) => m.email === form.email.trim().toLowerCase())?.profile_id;
    if (form.edit || joined) toast('Cargo atualizado.');
    else setCreated({ name: form.name.trim(), email: form.email.trim().toLowerCase(), code: data as string });
  };
  const remove = async (m: Member) => {
    const { error } = await supabase.rpc('remove_staff', { p_email: m.email });
    toast(error ? errText(error.message) : `${m.full_name || m.email} não tem mais acesso à área da clínica.`);
    if (!error) load();
  };

  const input = { backgroundColor: c.sunk, borderRadius: 12, padding: 12, fontFamily: Fonts.regular, fontSize: 15, color: c.ink };
  const ativos = list.filter((m) => m.profile_id);
  const pendentes = list.filter((m) => !m.profile_id);

  const card = (m: Member) => {
    const me = m.email === myEmail;
    return (
      <Card key={m.email} style={{ gap: 10, ...(wide ? { width: '48.8%' } : {}) }}>
        <Row style={{ alignItems: 'flex-start' }}>
          <Avatar ini={initials(m.full_name || m.email)} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <H3 numberOfLines={1}>{m.full_name || 'Sem nome'}{me ? ' (você)' : ''}</H3>
            <Muted numberOfLines={1}>{m.email}</Muted>
          </View>
          <Chip label={roleLabel(m.role)} tone={m.role === 'admin' ? 'next' : 'open'} />
        </Row>
        {!m.profile_id && m.access_code ? (
          <Row between style={{ backgroundColor: c.sunk, borderRadius: 12, padding: 10 }}>
            <Muted>Código para criar a senha</Muted>
            <Pressable accessibilityLabel="Copiar código" onPress={async () => { await Clipboard.setStringAsync(m.access_code!); toast('Código copiado.'); }}>
              <Txt w="bold" size={18} color={c.wine} style={{ letterSpacing: 3 }}>{m.access_code}</Txt>
            </Pressable>
          </Row>
        ) : null}
        {!me ? (
          <Row>
            <Button label="Mudar cargo" variant="ghost" small onPress={() => setForm({ open: true, edit: true, name: m.full_name, email: m.email, role: m.role })} />
            <Button label="Retirar acesso" variant="ghost" small onPress={() => setRemoving(m)} />
          </Row>
        ) : null}
      </Card>
    );
  };
  const grid = (items: Member[]) => (
    <View style={wide ? { flexDirection: 'row', flexWrap: 'wrap', gap: 16 } : { gap: 10 }}>{items.map(card)}</View>
  );

  return (
    <Screen who="clinica">
      <Row between>
        <View style={{ flex: 1 }}>
          <H2>Equipe e acessos</H2>
          <Muted size={14}>Quem trabalha na clínica entra no sistema com o próprio e-mail e senha.</Muted>
        </View>
        <Button label="+ Cadastrar" small onPress={() => setForm({ open: true, edit: false, name: '', email: '', role: 'reception' })} />
      </Row>

      {loading && !list.length ? <Muted>Carregando…</Muted> : failed ? (
        <Card><Muted>Não foi possível carregar a equipe.</Muted><Button label="Tentar de novo" small onPress={load} style={{ alignSelf: 'flex-start' }} /></Card>
      ) : (
        <>
          <H3>Com acesso ({ativos.length})</H3>
          {ativos.length ? grid(ativos) : <Card><Muted>Ninguém da equipe entrou ainda.</Muted></Card>}
          <H3>Aguardando o primeiro acesso ({pendentes.length})</H3>
          {pendentes.length ? grid(pendentes) : <Card><Muted>Nenhum cadastro pendente.</Muted></Card>}
          <Muted>
            Como funciona: cadastre a pessoa e passe para ela o código de 6 dígitos. Ela abre o sistema, toca em Entrar, depois em
            &quot;Primeiro acesso? Criar conta&quot;, e cria a própria senha com o e-mail e o código.
          </Muted>
        </>
      )}

      <Sheet visible={form.open} onClose={() => setForm((f) => ({ ...f, open: false }))}
        title={form.edit ? 'Mudar cargo' : 'Cadastrar na equipe'} okLabel={form.edit ? 'Salvar' : 'Cadastrar'}
        okDisabled={!validEmail || (!form.edit && !form.name.trim())} onOk={save}
        text={form.edit ? form.email : 'O sistema gera um código de acesso para a pessoa criar a própria senha.'}>
        {!form.edit ? (
          <>
            <TextInput value={form.name} onChangeText={(name) => setForm((f) => ({ ...f, name }))} placeholder="Nome completo" accessibilityLabel="Nome completo" placeholderTextColor={c.muted} style={input} />
            <TextInput value={form.email} onChangeText={(email) => setForm((f) => ({ ...f, email }))} placeholder="E-mail" accessibilityLabel="E-mail"
              keyboardType="email-address" autoCapitalize="none" autoCorrect={false} placeholderTextColor={c.muted} style={input} />
          </>
        ) : null}
        <View style={{ gap: 8 }}>
          {ROLES.map(([r, label, hint]) => {
            const on = form.role === r;
            return (
              <Pressable key={r} accessibilityRole="radio" accessibilityState={{ checked: on }} onPress={() => setForm((f) => ({ ...f, role: r }))}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, borderWidth: 1.5, borderColor: on ? c.noir : c.line }}>
                <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: on ? c.noir : c.muted, alignItems: 'center', justifyContent: 'center' }}>
                  {on ? <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: c.noir }} /> : null}
                </View>
                <View style={{ flex: 1 }}>
                  <Txt w="semibold">{label}</Txt>
                  <Muted>{hint}</Muted>
                </View>
              </Pressable>
            );
          })}
        </View>
      </Sheet>

      <Sheet visible={!!removing} onClose={() => setRemoving(null)} title="Retirar acesso?" okLabel="Retirar acesso"
        text={removing ? `${removing.full_name || removing.email} não vai mais conseguir abrir a área da clínica. Dá para cadastrar de novo depois.` : ''}
        onOk={() => { if (removing) remove(removing); }} />

      <Sheet visible={!!created} onClose={() => setCreated(null)} title="Cadastro feito"
        text={created ? `Passe para ${created.name || created.email} o código abaixo. No primeiro acesso, ela cria a senha com o e-mail ${created.email} e este código.` : ''}>
        <Txt w="bold" size={34} color={c.wine} style={{ letterSpacing: 8, textAlign: 'center', lineHeight: 44 }}>{created?.code}</Txt>
        <Button label="Copiar mensagem com o código" variant="dark" onPress={async () => {
          if (!created) return;
          await Clipboard.setStringAsync(
            `Olá! Seu acesso ao sistema MedUnique está pronto.\n1. Abra https://medunique.vercel.app\n2. Toque em Entrar e depois em "Primeiro acesso? Criar conta"\n3. Use o e-mail ${created.email} e o código ${created.code}, e crie a sua senha.`,
          );
          toast('Mensagem copiada. Cole no WhatsApp.');
        }} />
      </Sheet>
    </Screen>
  );
}
