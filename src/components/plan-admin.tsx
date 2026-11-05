import { useState } from 'react';
import { View } from 'react-native';

import { Boleto, brl, fmt, num, Plan, Step } from '@/data/model';
import { Bucket, fileName, openFile, pickFile, uploadFile } from '@/lib/files';
import { supabase } from '@/lib/supabase';
import { PlanInfo, useStore } from '@/state/store';
import { useColors } from '@/theme';

import { brDate, Field, isoDay, maskDate, maskTime, money, parseBRDate, parseMoney, parseTime } from './fields';
import { BOL_LABEL } from './patient';
import { ProcedurePicker } from './procedure-picker';
import { Button, Card, Chip, H3, Muted, Row, Sheet, Txt, useToast } from './ui';

type Err = { message: string } | null;
const errMsg = (e: Err) => (!e ? null : /Créditos insuficientes/.test(e.message) ? e.message : 'Não foi possível salvar. Confira a conexão e tente de novo.');

// Grava no servidor, recarrega os dados e avisa o resultado
function useRun() {
  const { reload } = useStore();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const run = async (f: () => PromiseLike<{ error: Err }>, ok: string) => {
    setBusy(true);
    const { error } = await f();
    if (!error) await reload();
    setBusy(false);
    toast(errMsg(error) ?? ok);
    return !error;
  };
  return { run, busy, toast };
}

// ---------- sessões do plano: marcar, remarcar, desmarcar e incluir procedimento
export function StepsAdmin({ plan, info }: { plan: Plan; info: PlanInfo }) {
  const c = useColors();
  const { run, busy } = useRun();
  const [edit, setEdit] = useState<Step | null>(null);
  const [day, setDay] = useState('');
  const [hour, setHour] = useState('');
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<Step | null>(null);

  const open = (s: Step) => {
    setEdit(s);
    setDay(s.date ? brDate(s.date) : '');
    setHour(s.hour || '');
  };
  const dayD = parseBRDate(day);
  const hm = parseTime(hour);

  const schedule = () => {
    if (!edit || !dayD || !hm) return;
    const at = new Date(dayD.getFullYear(), dayD.getMonth(), dayD.getDate(), hm[0], hm[1]);
    run(() => supabase.from('plan_steps').update({ scheduled_at: at.toISOString(), confirmed_at: null }).eq('id', edit.id),
      `Sessão marcada para ${fmt(at)} às ${hour}.`);
  };
  const unschedule = (s: Step) =>
    run(() => supabase.from('plan_steps').update({ scheduled_at: null, confirmed_at: null }).eq('id', s.id), 'Sessão desmarcada.');

  const addStep = async (pr: { id: string; name: string; price: number }) => {
    const position = Math.max(0, ...plan.steps.map((s) => s.position)) + 1;
    const ok = await run(() => supabase.from('plan_steps').insert({
      plan_id: plan.id, position, phase: 0, procedure_id: pr.id, title: pr.name, price_credits: pr.price,
    }), `${pr.name} incluído no plano.`);
    if (ok) await supabase.from('plans').update({ total_value: plan.total + pr.price }).eq('id', plan.id);
  };
  // Nada é apagado de vez: a sessão fica como "cancelada" e some do plano
  const removeStep = async (s: Step) => {
    const ok = await run(() => supabase.from('plan_steps').update({ status: 'cancelled', scheduled_at: null }).eq('id', s.id), `${s.title} tirado do plano.`);
    if (ok) await supabase.from('plans').update({ total_value: Math.max(0, plan.total - s.price) }).eq('id', plan.id);
  };

  return (
    <Card>
      <Row between><H3>Sessões do plano</H3><Muted>{info.doneCount} de {plan.steps.length} feitas</Muted></Row>
      {plan.steps.map((s, i) => {
        const cred = info.creditPlan.get(s.id);
        return (
          <View key={s.id} style={{ gap: 8, paddingTop: 10, borderTopWidth: i ? 1 : 0, borderTopColor: c.line }}>
            <Row between style={{ alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <Txt w="semibold" size={14}>{i + 1}. {s.title}</Txt>
                <Muted>
                  {num(s.price)} créditos · {s.status === 'done' ? 'feita' : s.date ? `${fmt(s.date)} às ${s.hour}${s.confirmed ? ' · confirmou' : ''}` : 'sem data'}
                </Muted>
              </View>
              {s.status === 'done' ? <Chip label="Feita" tone="ok" /> : cred && !cred.ok ? <Chip label="Sem créditos" tone="late" /> : null}
            </Row>
            {s.status !== 'done' ? (
              <Row style={{ flexWrap: 'wrap', gap: 8 }}>
                <Button label={s.date ? 'Remarcar' : 'Marcar data'} small variant={s.date ? 'ghost' : 'primary'} disabled={busy} onPress={() => open(s)} />
                {s.date ? <Button label="Desmarcar" small variant="ghost" disabled={busy} onPress={() => unschedule(s)} /> : null}
                <Button label="Tirar do plano" small variant="ghost" disabled={busy} onPress={() => setRemoving(s)} />
              </Row>
            ) : null}
          </View>
        );
      })}
      {!plan.steps.length ? <Muted>Nenhuma sessão no plano.</Muted> : null}
      <Button label="+ Incluir procedimento" variant="ghost" small style={{ alignSelf: 'flex-start' }} onPress={() => setAdding(true)} />

      <Sheet visible={!!edit} onClose={() => setEdit(null)} title={edit?.date ? 'Remarcar sessão' : 'Marcar sessão'} eyebrow={edit?.title}
        text="A paciente vê a nova data na agenda dela e pode confirmar a presença." okLabel="Salvar" okDisabled={!dayD || !hm} onOk={schedule}>
        <Row style={{ alignItems: 'flex-start' }}>
          <Field label="Dia" value={day} onChangeText={(v) => setDay(maskDate(v))} placeholder="dd/mm/aaaa" keyboardType="number-pad" />
          <Field label="Horário" value={hour} onChangeText={(v) => setHour(maskTime(v))} placeholder="hh:mm" keyboardType="number-pad" />
        </Row>
      </Sheet>
      <Sheet visible={adding} onClose={() => setAdding(false)} title="Incluir procedimento" text="O procedimento entra como nova sessão no fim do plano, e o valor do plano aumenta.">
        <ProcedurePicker onPick={(pr) => { setAdding(false); addStep(pr); }} />
      </Sheet>
      <Sheet visible={!!removing} onClose={() => setRemoving(null)} title="Tirar do plano?" okLabel="Tirar do plano"
        text={removing ? `${removing.title} sai do plano e o valor do plano diminui ${brl(removing.price)}. Os boletos não mudam sozinhos: ajuste-os se precisar.` : ''}
        onOk={() => { if (removing) removeStep(removing); }} />
    </Card>
  );
}

// ---------- boletos: código, PDF, vencimento, comprovante e baixa
export function BoletosAdmin({ plan, info }: { plan: Plan; info: PlanInfo }) {
  const c = useColors();
  const { markPaid } = useStore();
  const { run, busy, toast } = useRun();
  const [edit, setEdit] = useState<Boleto | 'novo' | null>(null);
  const [due, setDue] = useState('');
  const [value, setValue] = useState('');
  const [code, setCode] = useState('');
  const [paying, setPaying] = useState<Boleto | null>(null);

  const open = (b: Boleto | 'novo') => {
    setEdit(b);
    setDue(b === 'novo' ? '' : brDate(b.due));
    setValue(b === 'novo' ? '' : money(b.value));
    setCode(b === 'novo' ? '' : b.code ?? '');
  };
  const dueD = parseBRDate(due);
  const v = parseMoney(value);

  const save = () => {
    if (!edit || !dueD || !v) return;
    const row = { due_date: isoDay(dueD), amount: v, barcode: code.trim() || null };
    if (edit === 'novo') {
      const number = Math.max(0, ...plan.boletos.map((b) => b.n)) + 1;
      run(() => supabase.from('boletos').insert({ ...row, plan_id: plan.id, number }), 'Boleto lançado.');
    } else run(() => supabase.from('boletos').update(row).eq('id', edit.id), 'Boleto atualizado.');
  };
  const attach = async (b: Boleto) => {
    const f = await pickFile(['application/pdf', 'image/*']);
    if (!f) return;
    toast('Enviando o PDF…');
    const path = `${plan.id}/${fileName(`boleto-${b.n}`, f)}`;
    const e = await uploadFile('boletos', path, f);
    if (e) { toast(e); return; }
    run(() => supabase.from('boletos').update({ pdf_path: path }).eq('id', b.id), 'PDF anexado. A paciente já pode abrir o boleto.');
  };
  const view = async (bucket: Bucket, path: string) => { const e = await openFile(bucket, path); if (e) toast(e); };
  const label = (b: Boleto) => (b.n === 1 ? 'Entrada' : `Parcela ${b.n - 1}`);
  const total = plan.boletos.reduce((a, b) => a + b.value, 0);

  return (
    <Card>
      <Row between><H3>Boletos</H3><Muted>{info.paidCount} de {plan.boletos.length} pagos</Muted></Row>
      {Math.round(total * 100) !== Math.round(plan.total * 100) ? (
        <Txt size={13} color={c.wine}>A soma dos boletos ({brl(total)}) é diferente do valor do plano ({brl(plan.total)}).</Txt>
      ) : null}
      {plan.boletos.map((b, i) => {
        const s = info.boletoStatus(b);
        return (
          <View key={b.id} style={{ gap: 8, paddingTop: 10, borderTopWidth: i ? 1 : 0, borderTopColor: c.line }}>
            <Row between style={{ alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <Txt w="semibold" size={14}>{label(b)} · {brl(b.value)}</Txt>
                <Muted>
                  Vence {fmt(b.due)}{b.paidAt ? ` · pago em ${fmt(b.paidAt)}` : ''}
                  {!b.paidAt ? ` · ${b.pdfPath ? 'PDF anexado' : 'sem PDF'}${b.code ? ' · com código' : ''}` : ''}
                </Muted>
              </View>
              <Chip label={BOL_LABEL[s][0]} tone={BOL_LABEL[s][1]} />
            </Row>
            <Row style={{ flexWrap: 'wrap', gap: 8 }}>
              {!b.paidAt ? <Button label={b.pdfPath ? 'Trocar PDF' : 'Anexar PDF'} small variant={b.pdfPath ? 'ghost' : 'primary'} disabled={busy} onPress={() => attach(b)} /> : null}
              {b.pdfPath ? <Button label="Ver PDF" small variant="ghost" onPress={() => view('boletos', b.pdfPath!)} /> : null}
              {b.proofPath ? <Button label="Ver comprovante" small variant="ghost" onPress={() => view('comprovantes', b.proofPath!)} /> : null}
              {!b.paidAt ? <Button label="Editar" small variant="ghost" disabled={busy} onPress={() => open(b)} /> : null}
              {!b.paidAt ? <Button label="Dar baixa" small variant={b.proofSent ? 'dark' : 'ghost'} disabled={busy} onPress={() => setPaying(b)} /> : null}
            </Row>
          </View>
        );
      })}
      {!plan.boletos.length ? <Muted>Nenhum boleto lançado.</Muted> : null}
      <Button label="+ Novo boleto" variant="ghost" small style={{ alignSelf: 'flex-start' }} onPress={() => open('novo')} />

      <Sheet visible={!!edit} onClose={() => setEdit(null)} title={edit === 'novo' ? 'Novo boleto' : `Editar ${edit ? label(edit) : ''}`}
        text="Cole a linha digitável do boleto emitido no banco da clínica. A paciente copia o código para pagar." okLabel="Salvar" okDisabled={!dueD || !v} onOk={save}>
        <Row style={{ alignItems: 'flex-start' }}>
          <Field label="Vencimento" value={due} onChangeText={(t) => setDue(maskDate(t))} placeholder="dd/mm/aaaa" keyboardType="number-pad" />
          <Field label="Valor (R$)" value={value} onChangeText={setValue} placeholder="0,00" keyboardType="decimal-pad" />
        </Row>
        <Field label="Linha digitável (opcional)" value={code} onChangeText={setCode} placeholder="00190.00009 01234.567890 …" autoCapitalize="none" />
      </Sheet>
      <Sheet visible={!!paying} onClose={() => setPaying(null)} title="Dar baixa no boleto?" okLabel="Dar baixa"
        text={paying ? `${label(paying)} de ${brl(paying.value)}. A paciente recebe ${num(paying.value)} créditos e ${num(Math.floor(paying.value))} pontos na hora.` : ''}
        onOk={async () => { if (!paying) return; const e = await markPaid(paying.id); toast(e ?? 'Pagamento baixado. Créditos liberados.'); }} />
    </Card>
  );
}

// ---------- contrato da paciente em PDF
export function ContractAdmin({ plan }: { plan: Plan }) {
  const { run, busy, toast } = useRun();
  const attach = async () => {
    const f = await pickFile(['application/pdf']);
    if (!f) return;
    toast('Enviando o contrato…');
    const path = `${plan.id}/${fileName('contrato', f)}`;
    const e = await uploadFile('contratos', path, f);
    if (e) { toast(e); return; }
    run(() => supabase.from('plans').update({ contract_pdf_path: path }).eq('id', plan.id), 'Contrato anexado. A paciente já pode ler e aceitar.');
  };
  return (
    <Card>
      <Row between>
        <H3>Contrato</H3>
        <Chip label={plan.acceptedAt ? `Aceito em ${fmt(plan.acceptedAt)}` : plan.contractPath ? 'Aguardando aceite' : 'Sem PDF'} tone={plan.acceptedAt ? 'ok' : plan.contractPath ? 'next' : 'plan'} />
      </Row>
      <Muted>{plan.contractNumber ? `Nº ${plan.contractNumber} · ` : ''}Anexe o contrato da paciente em PDF. Ela lê no sistema e toca em "Li e aceito".</Muted>
      <Row style={{ flexWrap: 'wrap', gap: 8 }}>
        <Button label={plan.contractPath ? 'Trocar PDF' : 'Anexar contrato (PDF)'} small variant={plan.contractPath ? 'ghost' : 'primary'} disabled={busy} onPress={attach} />
        {plan.contractPath ? <Button label="Ver contrato" small variant="ghost" onPress={async () => { const e = await openFile('contratos', plan.contractPath!); if (e) toast(e); }} /> : null}
      </Row>
    </Card>
  );
}
