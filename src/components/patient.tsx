import * as Clipboard from 'expo-clipboard';
import * as DocumentPicker from 'expo-document-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { BolState, boletos, brl, contract, fmt, num, plan, Step } from '@/data/mock';
import { useStore } from '@/state/store';
import { useColors } from '@/theme';

import { Button, Card, Chip, H3, Muted, Row, Sheet, Txt, useToast } from './ui';

export const BOL_LABEL: Record<BolState, [string, 'ok' | 'next' | 'late' | 'open' | 'plan']> = {
  pago: ['Pago', 'ok'], analise: ['Comprovante em análise', 'next'], vencido: ['Vencido', 'late'], aberto: ['Em aberto', 'open'], futuro: ['A emitir', 'plan'],
};

export function stepChip(s: Step) {
  if (s.status === 'done') return <Chip label="Concluída" tone="ok" />;
  if (s.status === 'next') return <Chip label="Próxima" tone="next" />;
  return <Chip label="Agendada" />;
}

export function CreditChip({ step }: { step: Step }) {
  const { creditPlan } = useStore();
  if (step.status === 'done') return null;
  const c = creditPlan.get(step)!;
  if (c.ok) return <Chip label="Liberada" tone="ok" />;
  if (c.first) return <Chip label={`Faltam ${num(c.need!)} créditos`} tone="late" />;
  return <Chip label="Aguardando pagamento" />;
}

// Créditos: cada R$ 1,00 pago vira 1 crédito, usado nas etapas do plano.
export function CreditCard({ full }: { full?: boolean }) {
  const c = useColors();
  const { credits, creditsIn, creditsUsed, creditPlan, creditLedger, nextUnpaid } = useStore();
  const liberadas = plan.steps.filter((s) => creditPlan.get(s)?.ok);
  const bloqueada = plan.steps.find((s) => creditPlan.get(s) && !creditPlan.get(s)!.ok);
  return (
    <Card>
      <Row between>
        <H3>Meus créditos</H3>
        <Chip label="1 crédito = R$ 1,00" tone="open" />
      </Row>
      <Row style={{ alignItems: 'baseline', gap: 6 }}>
        <Txt w="medium" size={38} style={{ lineHeight: 44 }}>{num(credits)}</Txt>
        <Muted size={15}>disponíveis</Muted>
      </Row>
      <View style={{ height: 12, borderRadius: 12, backgroundColor: c.sunk, overflow: 'hidden' }}>
        <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${(creditsIn / contract.total) * 100}%`, backgroundColor: c.nude }} />
        <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${(creditsUsed / contract.total) * 100}%`, backgroundColor: c.noir }} />
      </View>
      <Row style={{ flexWrap: 'wrap', gap: 14 }}>
        <Legend color={c.noir} label={`Usados ${num(creditsUsed)}`} />
        <Legend color={c.nude} label={`Pagos ${num(creditsIn)}`} />
        <Legend color={c.sunk} label={`Plano ${num(contract.total)}`} />
      </Row>
      <View style={{ backgroundColor: c.sunk, borderRadius: 14, padding: 14, gap: 4 }}>
        <Txt size={14}>
          {liberadas.length
            ? <><Txt w="bold" size={14}>Liberado: </Txt>{liberadas.map((s) => `${s.title} (${num(s.price)})`).join(', ')}</>
            : 'Nenhuma etapa liberada no momento.'}
        </Txt>
        {bloqueada ? (
          <Txt size={14}>
            <Txt w="bold" size={14}>A liberar: </Txt>
            {bloqueada.title}. Faltam {num(creditPlan.get(bloqueada)!.need!)} créditos
            {nextUnpaid ? `, que entram com o pagamento do boleto de ${fmt(nextUnpaid.due)}` : ''}.
          </Txt>
        ) : null}
      </View>
      {full ? (
        <View>
          {creditLedger.map((x, i) => (
            <Row between key={i} style={{ paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: c.line }}>
              <View style={{ flex: 1 }}>
                <Txt size={14}>{x.label}</Txt>
                <Muted size={12}>{fmt(x.date)}</Muted>
              </View>
              <Txt w="semibold" color={x.v > 0 ? c.ok : c.muted}>{x.v > 0 ? '+' : '−'}{num(Math.abs(x.v))}</Txt>
            </Row>
          ))}
          <Muted style={{ marginTop: 6 }}>Créditos vêm dos pagamentos e pagam as etapas do seu plano.</Muted>
        </View>
      ) : (
        <Button label="Ver extrato de créditos" variant="ghost" small style={{ alignSelf: 'flex-start' }} onPress={() => router.navigate('/paciente/contrato')} />
      )}
    </Card>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <Row style={{ gap: 5 }}>
      <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: color }} />
      <Muted size={12}>{label}</Muted>
    </Row>
  );
}

export function BoletoCard() {
  const c = useColors();
  const toast = useToast();
  const { nextBoleto: nb, boletoStatus, daysTo, paidOf, paidCount, set } = useStore();
  const [proofFor, setProofFor] = useState<number | null>(null);
  const [file, setFile] = useState<string | null>(null);
  const stt = nb ? boletoStatus(nb) : null;

  const pick = async () => {
    const r = await DocumentPicker.getDocumentAsync({ type: ['image/*', 'application/pdf'], copyToCacheDirectory: false });
    if (!r.canceled) setFile(r.assets[0].name);
  };

  return (
    <Card>
      <Row between>
        <H3>Meus boletos</H3>
        <Muted>{paidCount} de {boletos.length} pagos</Muted>
      </Row>
      {nb && stt ? (
        <View style={{ backgroundColor: stt === 'vencido' ? c.wineSoft : c.sunk, borderRadius: 18, padding: 16, gap: 12 }}>
          <Row between>
            <Muted size={12}>{nb.n === 1 ? 'Entrada' : `Parcela ${nb.n - 1} de ${boletos.length - 1}`} · libera {num(nb.value)} créditos</Muted>
            <Chip label={BOL_LABEL[stt][0]} tone={BOL_LABEL[stt][1]} />
          </Row>
          <View>
            <Txt w="medium" size={30} style={{ lineHeight: 36 }}>{brl(nb.value)}</Txt>
            <Muted>
              Vence em {fmt(nb.due)}
              {stt === 'aberto' ? ` · faltam ${daysTo(nb)} dias` : stt === 'vencido' ? ` · ${-daysTo(nb)} dias em atraso` : ''}
            </Muted>
          </View>
          {stt === 'analise' ? (
            <Muted size={14}>Recebemos seu comprovante. A compensação leva até 3 dias úteis e o status muda aqui sozinho.</Muted>
          ) : (
            <>
              <View style={{ backgroundColor: c.surface, borderRadius: 10, borderWidth: 1, borderStyle: 'dashed', borderColor: c.line, padding: 12 }}>
                <Txt size={13} selectable>{nb.code}</Txt>
              </View>
              <Row style={{ flexWrap: 'wrap', gap: 8 }}>
                <Button label="Copiar código" small onPress={async () => { await Clipboard.setStringAsync(nb.code); toast('Código copiado. Cole no app do seu banco.'); }} />
                <Button label="Ver boleto" small variant="ghost" onPress={() => toast('No app final, o PDF do boleto abre aqui.')} />
                <Button label="Já paguei" small variant="ghost" onPress={() => { setFile(null); setProofFor(nb.n); }} />
              </Row>
            </>
          )}
        </View>
      ) : (
        <Chip label="Todas as parcelas foram pagas" tone="ok" />
      )}
      <View>
        {boletos.map((b, i) => {
          const s = boletoStatus(b);
          const pd = paidOf(b);
          return (
            <Row key={b.n} style={{ paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: c.line, gap: 10 }}>
              <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: c.sunk, alignItems: 'center', justifyContent: 'center' }}>
                <Txt w="bold" size={11} color={c.muted}>{b.n === 1 ? 'E' : String(b.n - 1).padStart(2, '0')}</Txt>
              </View>
              <View style={{ flex: 1 }}>
                <Txt w="semibold" size={14}>{fmt(b.due)} · {brl(b.value)}</Txt>
                <Muted size={12}>{pd ? `Pago em ${fmt(pd)}` : s === 'futuro' ? 'Disponível 10 dias antes' : 'Aguardando pagamento'}</Muted>
              </View>
              <Chip label={BOL_LABEL[s][0]} tone={BOL_LABEL[s][1]} />
            </Row>
          );
        })}
      </View>
      <Sheet
        visible={proofFor !== null}
        onClose={() => setProofFor(null)}
        title="Enviar comprovante"
        text="Envie a foto ou o PDF do comprovante. A equipe financeira confere e o boleto aparece como pago após a compensação."
        okLabel="Enviar"
        okDisabled={!file}
        onOk={() => { const n = proofFor!; set((s) => ({ ...s, proof: { ...s.proof, [n]: true } })); toast('Comprovante enviado para a equipe financeira.'); }}>
        <Button label={file ? `Arquivo: ${file}` : 'Escolher arquivo'} variant="ghost" onPress={pick} />
      </Sheet>
    </Card>
  );
}
