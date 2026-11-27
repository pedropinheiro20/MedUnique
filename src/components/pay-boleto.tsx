import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { bolLabel, Boleto, brl, dayOf, fmt, num, suggestedInterest, today } from '@/data/model';
import { useStore } from '@/state/store';
import { useColors } from '@/theme';

import { Field, money, parseMoney } from './fields';
import { Muted, Row, Sheet, Txt, useToast } from './ui';

// Dar baixa num boleto: valor pago da parcela (pode ser parcial) e juros/multa de atraso.
// Pago só uma parte? O restante vira outro boleto com o mesmo vencimento.
export function PayBoletoSheet({ boleto, onClose }: { boleto: Boleto | null; onClose: () => void }) {
  const c = useColors();
  const toast = useToast();
  const { markPaid } = useStore();
  const [paid, setPaid] = useState('');
  const [interest, setInterest] = useState('');

  const t = today();
  const lateDays = boleto ? Math.round((t.getTime() - dayOf(boleto.due).getTime()) / 864e5) : 0;
  const suggestion = boleto ? suggestedInterest(boleto.value, boleto.due, t) : 0;

  useEffect(() => {
    if (!boleto) return;
    setPaid(money(boleto.value));
    setInterest(suggestion ? money(suggestion) : '');
  }, [boleto?.id]);

  const p = parseMoney(paid);
  const j = interest.trim() ? parseMoney(interest) : 0;
  const valid = !!boleto && p !== null && p > 0 && p <= boleto.value && j !== null && j >= 0;
  const rest = boleto && p !== null ? Math.round((boleto.value - p) * 100) / 100 : 0;

  const ok = async () => {
    if (!boleto || !valid) return;
    const e = await markPaid(boleto.id, { paid: p!, interest: j! });
    if (e) { toast(e); return; }
    toast(rest > 0
      ? `Baixa parcial feita. ${num(p!)} créditos liberados e um novo boleto de ${brl(rest)} ficou em aberto.`
      : `Pagamento baixado. ${num(p!)} créditos liberados para a paciente.`);
  };

  return (
    <Sheet visible={!!boleto} onClose={onClose} title="Dar baixa no boleto" okLabel="Dar baixa" okDisabled={!valid} onOk={ok}
      text={boleto ? `${bolLabel(boleto)} de ${brl(boleto.value)}, vencimento ${fmt(boleto.due)}${lateDays > 0 ? ` (${lateDays} ${lateDays === 1 ? 'dia' : 'dias'} em atraso)` : ''}.` : ''}>
      <Row style={{ alignItems: 'flex-start' }}>
        <Field label="Valor pago da parcela (R$)" value={paid} onChangeText={setPaid} placeholder="0,00" keyboardType="decimal-pad"
          hint="Se pagou só uma parte, digite quanto pagou." />
        <Field label="Juros / multa (R$)" value={interest} onChangeText={setInterest} placeholder="0,00" keyboardType="decimal-pad"
          hint={lateDays > 0 ? `Sugestão: 2% de multa + 1% ao mês = ${brl(suggestion)}` : 'Só se pagou em atraso.'} />
      </Row>
      {boleto && valid ? (
        <View style={{ backgroundColor: c.sunk, borderRadius: 12, padding: 12, gap: 4 }}>
          <Txt size={14} w="semibold">Total recebido: {brl(p! + j!)}</Txt>
          <Muted size={13}>A paciente recebe {num(p!)} créditos e {num(Math.floor(p!))} pontos. Juros não viram créditos.</Muted>
          {rest > 0 ? <Txt size={13} color={c.wine}>Falta {brl(rest)}: um novo boleto com esse valor fica em aberto, com o mesmo vencimento ({fmt(boleto.due)}).</Txt> : null}
        </View>
      ) : boleto && p !== null && p > boleto.value ? (
        <Txt size={13} color={c.wine}>O valor pago não pode ser maior que o do boleto ({brl(boleto.value)}). Juros vão no campo ao lado.</Txt>
      ) : null}
    </Sheet>
  );
}
