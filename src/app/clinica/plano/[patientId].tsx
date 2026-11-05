import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { brDate, Field, isoDay, money, parseBRDate, parseMoney } from '@/components/fields';
import { ProcedurePicker } from '@/components/procedure-picker';
import { Button, Card, Col, Cols, H2, H3, Muted, Row, Screen, StateView, Txt, useToast } from '@/components/ui';
import { brl, fmt, num, today } from '@/data/model';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/state/store';
import { useColors } from '@/theme';

type Item = { key: string; procedureId: string; title: string; price: string };

const addMonths = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth() + n, d.getDate());

// Parcelas: entrada + N parcelas iguais (os centavos que sobram vão na última)
function splitInstallments(total: number, down: number, n: number, first: Date, start: Date) {
  const rest = Math.round((total - down) * 100);
  const out: { number: number; due: Date; amount: number }[] = [{ number: 1, due: start, amount: down }];
  if (n > 0 && rest > 0) {
    const each = Math.floor(rest / n);
    for (let i = 0; i < n; i++) {
      const cents = i === n - 1 ? rest - each * (n - 1) : each;
      out.push({ number: i + 2, due: addMonths(first, i), amount: cents / 100 });
    }
  }
  return out;
}

// Novo plano: procedimentos da tabela da clínica, valor e boletos (entrada + parcelas)
export default function NovoPlano() {
  const c = useColors();
  const toast = useToast();
  const { patientId } = useLocalSearchParams<{ patientId: string }>();
  const { pById, reload, loading } = useStore();
  const t = today();
  const [name, setName] = useState('Plano de acompanhamento estético');
  const [pro, setPro] = useState('');
  const [contract, setContract] = useState('');
  const [start, setStart] = useState(brDate(t));
  const [items, setItems] = useState<Item[]>([]);
  const [down, setDown] = useState('');
  const [count, setCount] = useState('0');
  const [first, setFirst] = useState(brDate(addMonths(t, 1)));
  const [busy, setBusy] = useState(false);

  const p = pById(patientId);
  if (!p) return <StateView who="clinica" loading={loading} empty="Paciente não encontrada." />;

  const prices = items.map((i) => parseMoney(i.price));
  const total = prices.reduce<number>((a, v) => a + Math.round(v ?? 0), 0);
  const startD = parseBRDate(start);
  const firstD = parseBRDate(first);
  const n = Math.max(0, Math.min(36, Number(count.replace(/\D/g, '')) || 0));
  const downV = parseMoney(down) ?? (n === 0 ? total : 0);
  const plan = startD && firstD ? splitInstallments(total, downV, n, firstD, startD) : [];

  const problems = [
    !name.trim() && 'Dê um nome ao plano.',
    !items.length && 'Inclua pelo menos um procedimento.',
    prices.some((v) => v === null) && 'Confira o valor de cada procedimento.',
    !startD && 'Confira a data de início (dd/mm/aaaa).',
    n > 0 && !firstD && 'Confira o vencimento da 1ª parcela (dd/mm/aaaa).',
    downV <= 0 && 'A entrada precisa ter valor. Se for à vista, coloque o total na entrada e 0 parcelas.',
    downV > total && 'A entrada não pode passar do valor total.',
    n === 0 && downV < total && 'Sem parcelas, a entrada precisa ser o valor total.',
  ].filter(Boolean) as string[];

  const save = async () => {
    setBusy(true);
    const pl = await supabase.from('plans').insert({
      patient_id: p.id, name: name.trim(), professional: pro.trim(), start_date: isoDay(startD!),
      end_date: plan.length ? isoDay(plan[plan.length - 1].due) : null,
      total_value: total, contract_number: contract.trim() || null,
    }).select('id').single();
    if (pl.error) {
      setBusy(false);
      toast(/duplicate|unique/i.test(pl.error.message) ? 'Já existe um contrato com esse número.' : 'Não foi possível salvar o plano.');
      return;
    }
    const planId = pl.data.id as string;
    const st = await supabase.from('plan_steps').insert(items.map((i, k) => ({
      plan_id: planId, position: k + 1, phase: 0, procedure_id: i.procedureId || null, title: i.title, price_credits: Math.round(prices[k]!),
    })));
    const bo = st.error ? st : await supabase.from('boletos').insert(plan.map((b) => ({
      plan_id: planId, number: b.number, due_date: isoDay(b.due), amount: b.amount,
    })));
    if (st.error || bo.error) {
      await supabase.from('plans').delete().eq('id', planId); // desfaz o plano incompleto
      setBusy(false);
      toast('Não foi possível salvar o plano. Nada foi gravado.');
      return;
    }
    await reload();
    setBusy(false);
    toast('Plano criado. Agora marque as sessões e anexe os boletos na ficha.');
    router.replace(`/clinica/ficha/${p.id}`);
  };

  return (
    <Screen who="clinica">
      <Button label="‹ Voltar" variant="ghost" small style={{ alignSelf: 'flex-start' }} onPress={() => (router.canGoBack() ? router.back() : router.replace(`/clinica/ficha/${p.id}`))} />
      <View>
        <H2>Novo plano</H2>
        <Muted size={14}>{p.name}</Muted>
      </View>
      <Cols>
        <Col>
          <Card>
            <H3>Dados do plano</H3>
            <Field label="Nome do plano" value={name} onChangeText={setName} />
            <Row style={{ flexWrap: 'wrap', alignItems: 'flex-start' }}>
              <Field label="Profissional (opcional)" value={pro} onChangeText={setPro} />
              <Field label="Nº do contrato (opcional)" value={contract} onChangeText={setContract} />
            </Row>
            <Field label="Início" value={start} onChangeText={(v) => setStart(v.replace(/[^\d/]/g, '').slice(0, 10))} placeholder="dd/mm/aaaa" keyboardType="number-pad" />
          </Card>

          <Card>
            <Row between><H3>Procedimentos</H3><Muted>{items.length} {items.length === 1 ? 'sessão' : 'sessões'}</Muted></Row>
            <Muted>Cada procedimento vira uma sessão do plano. Para repetir, inclua de novo. O valor pode ter desconto.</Muted>
            {items.map((i, k) => (
              <Row key={i.key} style={{ gap: 8, alignItems: 'flex-end', paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: c.line }}>
                <View style={{ flex: 2, gap: 2 }}>
                  <Muted size={11}>Sessão {k + 1}</Muted>
                  <Txt size={14}>{i.title}</Txt>
                </View>
                <View style={{ width: 120 }}>
                  <Field label="Valor (R$)" value={i.price} keyboardType="decimal-pad"
                    onChangeText={(v) => setItems((l) => l.map((x) => (x.key === i.key ? { ...x, price: v } : x)))} />
                </View>
                <Pressable accessibilityLabel={`Tirar ${i.title}`} onPress={() => setItems((l) => l.filter((x) => x.key !== i.key))} style={{ padding: 10 }}>
                  <Txt w="bold" color={c.wine}>×</Txt>
                </Pressable>
              </Row>
            ))}
            <ProcedurePicker onPick={(pr) => setItems((l) => [...l, { key: `${pr.id}-${Date.now()}`, procedureId: pr.id, title: pr.name, price: String(pr.price) }])} />
          </Card>
        </Col>

        <Col>
          <Card dark>
            <Txt size={12} color={c.onNoir} style={{ opacity: 0.65 }}>Valor do plano</Txt>
            <Txt w="medium" size={32} color={c.onNoir} style={{ lineHeight: 38 }}>{brl(total)}</Txt>
            <Txt size={13} color={c.onNoir} style={{ opacity: 0.7 }}>A paciente recebe {num(total)} créditos conforme paga. Também ganha {num(total)} pontos.</Txt>
          </Card>
          <Card>
            <H3>Pagamento por boleto</H3>
            <Row style={{ flexWrap: 'wrap', alignItems: 'flex-start' }}>
              <Field label="Entrada (R$)" value={down} onChangeText={setDown} keyboardType="decimal-pad" placeholder={n === 0 ? money(total) : '0,00'} hint="Vence na data de início" />
              <Field label="Parcelas" value={count} onChangeText={(v) => setCount(v.replace(/\D/g, '').slice(0, 2))} keyboardType="number-pad" hint="0 = à vista" />
            </Row>
            {n > 0 ? <Field label="Vencimento da 1ª parcela" value={first} onChangeText={(v) => setFirst(v.replace(/[^\d/]/g, '').slice(0, 10))} placeholder="dd/mm/aaaa" keyboardType="number-pad" hint="As outras vencem no mesmo dia dos meses seguintes" /> : null}
            {plan.length && !problems.length ? (
              <View style={{ gap: 6 }}>
                {plan.map((b) => (
                  <Row between key={b.number}>
                    <Muted size={14}>{b.number === 1 ? 'Entrada' : `Parcela ${b.number - 1}`} · {fmt(b.due)}</Muted>
                    <Txt w="semibold" size={14}>{brl(b.amount)}</Txt>
                  </Row>
                ))}
              </View>
            ) : null}
          </Card>
          {problems.length ? <Card style={{ backgroundColor: c.wineSoft, gap: 4 }}>{problems.map((m) => <Txt key={m} size={14}>{m}</Txt>)}</Card> : null}
          <Button label={busy ? 'Salvando…' : 'Criar plano'} disabled={busy || !!problems.length} onPress={save} />
          <Muted>Os boletos são emitidos no banco da clínica. Depois de criar o plano, anexe o PDF ou o código de cada boleto na ficha.</Muted>
        </Col>
      </Cols>
    </Screen>
  );
}
