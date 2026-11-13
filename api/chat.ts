// Assistente com IA (Groq) do MedUnique. Roda como função da Vercel em /api/chat.
//
// - Área da paciente ("paciente"): chat de conversa. Responde sobre a clínica e sobre os dados DELA (só leitura).
// - Painel da clínica ("clinica"): agente com ferramentas. Consulta o banco e PROPÕE ações; a ação só acontece
//   quando a pessoa clica em Confirmar no app (quem grava é o próprio app, com o login dela).
//
// A chave do Groq fica só aqui no servidor (variável GROQ_API_KEY na Vercel). O banco é lido com o login de quem
// pergunta, então as regras de acesso (RLS) do Supabase continuam valendo: a paciente só enxerga os próprios dados.
import { createClient, SupabaseClient } from '@supabase/supabase-js';

declare const process: { env: Record<string, string | undefined> };

// Mesmos dados públicos de src/lib/supabase.ts (a chave publicável pode ficar no código).
const SUPABASE_URL = 'https://bmmfynfqiurpogbdxszd.supabase.co';
const SUPABASE_KEY = 'sb_publishable_RmIyzZ6V8CUwJMHOiAtX1w_iIXN1PW3';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
const TZ = 'America/Sao_Paulo';

export const maxDuration = 30;

type Row = Record<string, any>;
type Msg = { role: 'system' | 'user' | 'assistant' | 'tool'; content: string | null; tool_calls?: ToolCall[]; tool_call_id?: string };
type ToolCall = { id: string; type: 'function'; function: { name: string; arguments: string } };
export type Action = {
  id: string;
  type: 'agendar' | 'desmarcar' | 'feita' | 'baixa';
  label: string;
  patientId: string;
  stepId?: string;
  boletoId?: string;
  date?: string; // AAAA-MM-DD
  time?: string; // HH:MM
};

class Fail extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}

// ---------- datas no horário de Parnaíba
const todayISO = () => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date());
const weekday = () => new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, weekday: 'long' }).format(new Date());
const brDay = (iso: string) => iso.slice(0, 10).split('-').reverse().join('/');
function when(ts: string | null) {
  if (!ts) return 'sem data marcada';
  const d = new Date(ts);
  const day = new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' }).format(d);
  const hour = new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, hour: '2-digit', minute: '2-digit' }).format(d);
  return `${day} às ${hour}`;
}
const dayOfTs = (ts: string) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date(ts));
const brl = (v: number) => 'R$ ' + Number(v).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// ---------- regras do plano (iguais às de src/state/store.tsx)
function boletoState(b: Row, today: string) {
  if (b.paid_at) return `pago em ${brDay(b.paid_at.length > 10 ? dayOfTs(b.paid_at) : b.paid_at)}`;
  if (b.proof_sent_at) return 'comprovante enviado, aguardando a clínica conferir';
  return b.due_date < today ? 'VENCIDO' : 'a vencer';
}
function credits(steps: Row[], boletos: Row[]) {
  const paid = boletos.filter((b) => b.paid_at).reduce((a, b) => a + Number(b.amount), 0);
  const used = steps.filter((s) => s.status === 'done' || s.status === 'missed').reduce((a, s) => a + Number(s.price_credits), 0);
  return { paid, used, balance: paid - used };
}
const stepState = (s: Row) => (s.status === 'done' ? 'realizada' : s.status === 'missed' ? 'falta' : s.scheduled_at ? 'marcada' : 'a marcar');

async function must<T>(p: PromiseLike<{ data: T | null; error: { message: string } | null }>): Promise<T> {
  const { data, error } = await p;
  if (error) throw new Fail(502, 'Não consegui ler os dados agora. Tente de novo em instantes.');
  return (data ?? []) as T;
}

type PlanBundle = { plan: Row; steps: Row[]; boletos: Row[] };
async function plansOf(db: SupabaseClient, patientId: string): Promise<PlanBundle[]> {
  const plans = await must<Row[]>(db.from('plans').select('*').eq('patient_id', patientId).neq('status', 'cancelled').order('created_at'));
  if (!plans.length) return [];
  const ids = plans.map((p) => p.id);
  const [steps, boletos] = await Promise.all([
    must<Row[]>(db.from('plan_steps').select('*').in('plan_id', ids).neq('status', 'cancelled').order('position')),
    must<Row[]>(db.from('boletos').select('*').in('plan_id', ids).order('number')),
  ]);
  return plans.map((plan) => ({ plan, steps: steps.filter((s) => s.plan_id === plan.id), boletos: boletos.filter((b) => b.plan_id === plan.id) }));
}

// Texto do plano. Para a equipe inclui os códigos internos (para o agente poder propor ações).
function planText({ plan, steps, boletos }: PlanBundle, staff: boolean) {
  const today = todayISO();
  const c = credits(steps, boletos);
  const id = (x: Row) => (staff ? ` [id ${x.id}]` : '');
  const lines = [
    `Plano: ${plan.name}${staff ? ` [id ${plan.id}] (situação: ${plan.status})` : ''}`,
    plan.professional ? `Profissional: ${plan.professional}` : '',
    plan.start_date ? `Período: ${brDay(plan.start_date)}${plan.end_date ? ` a ${brDay(plan.end_date)}` : ''}` : '',
    `Valor total: ${brl(plan.total_value)}. Contrato: ${plan.contract_accepted_at ? 'aceito' : 'aguardando aceite da paciente'}.`,
    `Créditos: ${brl(c.paid)} pagos, ${brl(c.used)} usados, saldo de ${c.balance} créditos (1 crédito = R$ 1).`,
    'Sessões (em ordem):',
    ...steps.map((s, i) => {
      const extra = staff ? '' : `${s.what ? ` O que é: ${s.what}` : ''}${s.care?.length ? ` Cuidados: ${s.care.join('; ')}.` : ''}`;
      return `${i + 1}. ${s.title} (${s.price_credits} créditos) - ${stepState(s)}${s.status === 'scheduled' && s.scheduled_at ? `, ${when(s.scheduled_at)}${s.confirmed_at ? ', presença confirmada' : ''}` : ''}${s.status !== 'scheduled' && s.scheduled_at ? `, ${when(s.scheduled_at)}` : ''}${id(s)}${extra}`;
    }),
    'Boletos:',
    ...boletos.map((b) => `${b.number === 1 ? 'Entrada' : `Parcela ${b.number - 1}`}: ${brl(b.amount)}, vence ${brDay(b.due_date)}, ${boletoState(b, today)}${id(b)}`),
  ];
  return lines.filter(Boolean).join('\n');
}

const CLINIC = `Clínica Med Unique (saúde e estética), Rua Ademar Neves, 1626, Parnaíba, PI. WhatsApp (86) 99484-0219.
Tratamentos: toxina botulínica, Radiesse e Diamond, Sculptra e Elleva, fios de PDO, skinbooster, PDRN e Rejuviskin, preenchimento facial e corporal, SPA e bem-estar; também cirurgia plástica e médicos de diversas áreas.
Como funciona o sistema: o plano é pago por boletos; cada R$ 1 pago vira 1 crédito; cada sessão usa créditos iguais ao seu valor e só pode ser feita com saldo. Remarcação sem custo com 24 h de antecedência. A paciente confirma presença e envia comprovante de boleto pelo app (telas Agenda e Contrato).`;

// ---------- área da paciente
async function patientPrompt(db: SupabaseClient, uid: string) {
  const me = await must<Row | null>(db.from('patients').select('id, full_name').eq('profile_id', uid).maybeSingle());
  let data = 'Esta pessoa ainda não tem cadastro de paciente ligado ao login.';
  if (me) {
    const all = await plansOf(db, me.id);
    const plan = all.find((p) => p.plan.status === 'active') ?? all[all.length - 1];
    data = `Paciente: ${me.full_name}.\n${plan ? planText(plan, false) : 'Ainda não há plano cadastrado pela clínica.'}`;
  }
  return `Você é a assistente virtual da Clínica Med Unique, dentro da área da paciente do app. Fale em português do Brasil, com carinho e objetividade, em frases curtas. Hoje é ${weekday()}, ${brDay(todayISO())}.

Regras:
- Responda só sobre a clínica, os tratamentos e os dados abaixo. Não invente datas, valores nem sessões.
- Nunca dê diagnóstico, prescrição ou orientação médica individual. Para dúvidas de saúde, efeitos, dor ou reações, oriente falar com a equipe pelo WhatsApp (86) 99484-0219; em emergência, procurar atendimento médico.
- Você não marca, remarca nem altera nada: explique como fazer no app ou pelo WhatsApp da clínica.
- Não fale sobre pontos ou programa de pontos.
- Texto simples, sem markdown, tabelas ou asteriscos. Use listas com hífen quando ajudar.

Sobre a clínica:
${CLINIC}

Dados da paciente (atualizados agora):
${data}`;
}

// ---------- painel da clínica: ferramentas
const fn = (name: string, description: string, properties: Row = {}, required: string[] = []) =>
  ({ type: 'function', function: { name, description, parameters: { type: 'object', properties, required } } });
const TOOLS = [
  fn('buscar_pacientes', 'Procura pacientes pelo nome (ignora acentos). Sem nome, lista as primeiras.', { nome: { type: 'string' } }),
  fn('ficha_paciente', 'Ficha completa: contato, planos, sessões (com id), boletos (com id), créditos e pontos.', { paciente_id: { type: 'string' } }, ['paciente_id']),
  fn('agenda', 'Sessões marcadas entre duas datas (inclusive).', {
    de: { type: 'string', description: 'AAAA-MM-DD' }, ate: { type: 'string', description: 'AAAA-MM-DD' },
  }, ['de', 'ate']),
  fn('sessoes_a_marcar', 'Pacientes com plano ativo cuja próxima sessão ainda não tem data.'),
  fn('boletos_pendentes', 'Boletos não pagos: vencidos, a vencer nos próximos dias, ou com comprovante aguardando conferência.', {
    situacao: { type: 'string', enum: ['vencidos', 'a_vencer', 'em_analise'] }, dias: { type: 'number', description: 'Para a_vencer. Padrão 30.' },
  }, ['situacao']),
  fn('resumo_financeiro', 'Recebido no mês, total vencido, a vencer em 30 dias e comprovantes a conferir.', { mes: { type: 'string', description: 'AAAA-MM. Padrão: mês atual.' } }),
  fn('propor_agendamento', 'Propõe marcar ou remarcar uma sessão. NÃO grava: mostra um botão Confirmar para a pessoa.', {
    etapa_id: { type: 'string' }, data: { type: 'string', description: 'AAAA-MM-DD' }, hora: { type: 'string', description: 'HH:MM (24 h)' },
  }, ['etapa_id', 'data', 'hora']),
  fn('propor_desmarcar', 'Propõe tirar a data de uma sessão. NÃO grava: mostra um botão Confirmar.', { etapa_id: { type: 'string' } }, ['etapa_id']),
  fn('propor_sessao_realizada', 'Propõe registrar uma sessão como realizada (usa os créditos). NÃO grava: mostra um botão Confirmar.', { etapa_id: { type: 'string' } }, ['etapa_id']),
  fn('propor_baixa_boleto', 'Propõe dar baixa (marcar como pago) em um boleto. NÃO grava: mostra um botão Confirmar.', { boleto_id: { type: 'string' } }, ['boleto_id']),
];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

async function namesByPlan(db: SupabaseClient, planIds: string[]) {
  const ids = [...new Set(planIds)];
  if (!ids.length) return new Map<string, { patientId: string; name: string; plan: string }>();
  const plans = await must<Row[]>(db.from('plans').select('id, name, patient_id').in('id', ids));
  const pats = await must<Row[]>(db.from('patients').select('id, full_name').in('id', [...new Set(plans.map((p) => p.patient_id))]));
  const pn = new Map(pats.map((p) => [p.id, p.full_name as string]));
  return new Map(plans.map((p) => [p.id, { patientId: p.patient_id as string, name: pn.get(p.patient_id) ?? 'Paciente', plan: p.name as string }]));
}

async function stepWithOwner(db: SupabaseClient, stepId: string) {
  if (!UUID.test(stepId)) throw new Fail(400, 'id de sessão inválido; consulte a ficha da paciente primeiro');
  const s = await must<Row | null>(db.from('plan_steps').select('*').eq('id', stepId).maybeSingle());
  if (!s || s.status === 'cancelled') throw new Fail(404, 'sessão não encontrada');
  const owner = (await namesByPlan(db, [s.plan_id])).get(s.plan_id)!;
  return { s, owner };
}

async function runTool(db: SupabaseClient, name: string, a: Row, actions: Action[]): Promise<string> {
  const today = todayISO();
  switch (name) {
    case 'buscar_pacientes': {
      const all = await must<Row[]>(db.from('patients').select('id, full_name, phone, email').order('full_name'));
      const q = norm(String(a.nome ?? '').trim());
      const hits = q ? all.filter((p) => norm(p.full_name).includes(q)) : all;
      if (!hits.length) return 'Nenhuma paciente encontrada com esse nome.';
      return hits.slice(0, 15).map((p) => `${p.full_name} [id ${p.id}] ${p.phone ?? ''} ${p.email ?? ''}`.trim()).join('\n')
        + (hits.length > 15 ? `\n(+${hits.length - 15} outras; refine o nome)` : '');
    }
    case 'ficha_paciente': {
      if (!UUID.test(String(a.paciente_id))) return 'id inválido; use buscar_pacientes primeiro.';
      const p = await must<Row | null>(db.from('patients').select('*').eq('id', a.paciente_id).maybeSingle());
      if (!p) return 'Paciente não encontrada.';
      const [plans, pts] = await Promise.all([
        plansOf(db, p.id),
        must<Row[]>(db.from('points_ledger').select('delta').eq('patient_id', p.id)),
      ]);
      const points = pts.reduce((x, r) => x + Number(r.delta), 0);
      return [
        `${p.full_name} [id ${p.id}] · tel ${p.phone ?? '—'} · e-mail ${p.email ?? '—'} · ${p.profile_id ? 'já usa o app' : `ainda sem conta no app (código de acesso ${p.access_code ?? '—'})`} · ${points} pontos`,
        ...(plans.length ? plans.map((pl) => planText(pl, true)) : ['Sem plano cadastrado.']),
      ].join('\n\n');
    }
    case 'agenda': {
      const de = DAY.test(a.de) ? a.de : today;
      const ate = DAY.test(a.ate) ? a.ate : de;
      const steps = await must<Row[]>(db.from('plan_steps').select('id, plan_id, title, scheduled_at, status, confirmed_at')
        .gte('scheduled_at', `${de}T00:00:00-03:00`).lte('scheduled_at', `${ate}T23:59:59-03:00`)
        .neq('status', 'cancelled').order('scheduled_at').limit(200));
      if (!steps.length) return `Nenhuma sessão marcada de ${brDay(de)} a ${brDay(ate)}.`;
      const own = await namesByPlan(db, steps.map((s) => s.plan_id));
      return steps.map((s) => `${when(s.scheduled_at)} · ${own.get(s.plan_id)?.name} · ${s.title} · ${stepState(s)}${s.confirmed_at ? ', confirmada pela paciente' : ''} [id ${s.id}]`).join('\n');
    }
    case 'sessoes_a_marcar': {
      const plans = await must<Row[]>(db.from('plans').select('id').eq('status', 'active'));
      if (!plans.length) return 'Nenhum plano ativo.';
      const steps = await must<Row[]>(db.from('plan_steps').select('id, plan_id, title, position, scheduled_at')
        .in('plan_id', plans.map((p) => p.id)).eq('status', 'scheduled').order('position'));
      const next = new Map<string, Row>();
      steps.forEach((s) => { if (!next.has(s.plan_id)) next.set(s.plan_id, s); });
      const open = [...next.values()].filter((s) => !s.scheduled_at);
      if (!open.length) return 'Todas as próximas sessões já têm data.';
      const own = await namesByPlan(db, open.map((s) => s.plan_id));
      return open.map((s) => `${own.get(s.plan_id)?.name} · próxima: ${s.title} [id ${s.id}]`).join('\n');
    }
    case 'boletos_pendentes': {
      const rows = await must<Row[]>(db.from('boletos').select('id, plan_id, number, amount, due_date, proof_sent_at').is('paid_at', null).order('due_date'));
      const limit = new Date(Date.now() + (Number(a.dias) || 30) * 864e5).toISOString().slice(0, 10);
      const list = rows.filter((b) => (a.situacao === 'em_analise' ? b.proof_sent_at
        : a.situacao === 'vencidos' ? !b.proof_sent_at && b.due_date < today
          : !b.proof_sent_at && b.due_date >= today && b.due_date <= limit));
      if (!list.length) return 'Nenhum boleto nessa situação.';
      const own = await namesByPlan(db, list.map((b) => b.plan_id));
      const total = list.reduce((x, b) => x + Number(b.amount), 0);
      return list.slice(0, 40).map((b) => `${own.get(b.plan_id)?.name} · ${b.number === 1 ? 'entrada' : `parcela ${b.number - 1}`} · ${brl(b.amount)} · vence ${brDay(b.due_date)} [id ${b.id}]`).join('\n')
        + `\nTotal: ${list.length} boleto(s), ${brl(total)}${list.length > 40 ? ' (mostrando 40)' : ''}`;
    }
    case 'resumo_financeiro': {
      const mes = /^\d{4}-\d{2}$/.test(a.mes ?? '') ? a.mes : today.slice(0, 7);
      const rows = await must<Row[]>(db.from('boletos').select('amount, due_date, paid_at, proof_sent_at'));
      const in30 = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
      const sum = (l: Row[]) => `${l.length} boleto(s), ${brl(l.reduce((x, b) => x + Number(b.amount), 0))}`;
      const paidMonth = rows.filter((b) => b.paid_at && dayOfTs(b.paid_at).startsWith(mes));
      const open = rows.filter((b) => !b.paid_at);
      return [
        `Recebido em ${mes.slice(5)}/${mes.slice(0, 4)}: ${sum(paidMonth)}`,
        `Vencidos sem pagamento: ${sum(open.filter((b) => !b.proof_sent_at && b.due_date < today))}`,
        `A vencer em 30 dias: ${sum(open.filter((b) => !b.proof_sent_at && b.due_date >= today && b.due_date <= in30))}`,
        `Comprovantes aguardando conferência: ${sum(open.filter((b) => b.proof_sent_at))}`,
      ].join('\n');
    }
    case 'propor_agendamento': {
      const { s, owner } = await stepWithOwner(db, String(a.etapa_id));
      if (s.status !== 'scheduled') return 'Essa sessão já foi realizada; não dá para marcar.';
      const hora = String(a.hora ?? '').padStart(5, '0');
      if (!DAY.test(a.data) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(hora)) return 'Data ou hora inválida. Use AAAA-MM-DD e HH:MM.';
      if (a.data < today) return 'Essa data já passou. Peça outra data.';
      const verb = s.scheduled_at ? `Remarcar (era ${when(s.scheduled_at)})` : 'Marcar';
      actions.push({ id: crypto.randomUUID(), type: 'agendar', stepId: s.id, patientId: owner.patientId, date: a.data, time: hora,
        label: `${verb} ${s.title} de ${owner.name} para ${brDay(a.data)} às ${hora}` });
      return 'Proposta criada. A pessoa precisa clicar em Confirmar no app; ainda NÃO foi gravado.';
    }
    case 'propor_desmarcar': {
      const { s, owner } = await stepWithOwner(db, String(a.etapa_id));
      if (s.status !== 'scheduled' || !s.scheduled_at) return 'Essa sessão não está marcada.';
      actions.push({ id: crypto.randomUUID(), type: 'desmarcar', stepId: s.id, patientId: owner.patientId,
        label: `Desmarcar ${s.title} de ${owner.name} (${when(s.scheduled_at)})` });
      return 'Proposta criada. A pessoa precisa clicar em Confirmar; ainda NÃO foi gravado.';
    }
    case 'propor_sessao_realizada': {
      const { s, owner } = await stepWithOwner(db, String(a.etapa_id));
      if (s.status !== 'scheduled') return 'Essa sessão já está registrada.';
      actions.push({ id: crypto.randomUUID(), type: 'feita', stepId: s.id, patientId: owner.patientId,
        label: `Registrar ${s.title} de ${owner.name} como realizada (usa ${s.price_credits} créditos)` });
      return 'Proposta criada. A pessoa precisa clicar em Confirmar; ainda NÃO foi gravado. Se faltar crédito, o sistema recusa.';
    }
    case 'propor_baixa_boleto': {
      if (!UUID.test(String(a.boleto_id))) return 'id de boleto inválido; consulte a ficha ou os boletos pendentes primeiro.';
      const b = await must<Row | null>(db.from('boletos').select('*').eq('id', a.boleto_id).maybeSingle());
      if (!b) return 'Boleto não encontrado.';
      if (b.paid_at) return 'Esse boleto já está pago.';
      const owner = (await namesByPlan(db, [b.plan_id])).get(b.plan_id)!;
      actions.push({ id: crypto.randomUUID(), type: 'baixa', boletoId: b.id, patientId: owner.patientId,
        label: `Dar baixa no boleto ${b.number === 1 ? 'da entrada' : `da parcela ${b.number - 1}`} de ${owner.name} (${brl(b.amount)}, venc. ${brDay(b.due_date)})` });
      return 'Proposta criada. A pessoa precisa clicar em Confirmar; ainda NÃO foi gravado.';
    }
  }
  return 'Ferramenta desconhecida.';
}

const ROLE: Record<string, string> = { admin: 'administração', reception: 'recepção', finance: 'financeiro', professional: 'profissional' };
const clinicPrompt = (name: string, role: string) => `Você é o assistente do painel da Clínica Med Unique. Quem fala com você: ${name || 'equipe'} (${ROLE[role] ?? role}). Hoje é ${weekday()}, ${brDay(todayISO())} (horário de Parnaíba).

Como trabalhar:
- Use as ferramentas para consultar o sistema antes de responder. Nunca invente pacientes, datas, valores ou ids.
- Para achar alguém, use buscar_pacientes e depois ficha_paciente. Se houver mais de uma paciente com o nome, pergunte qual.
- Para alterar algo (marcar, remarcar, desmarcar, registrar sessão realizada, dar baixa em boleto) use as ferramentas propor_*. Elas NÃO gravam: mostram um botão Confirmar. Diga que é só confirmar no botão abaixo; nunca diga que já foi feito.
- Se faltar informação (data, hora, qual sessão), pergunte antes de propor.
- Datas relativas ("amanhã", "sexta") são calculadas a partir de hoje.
- Pontos são só para a equipe; nunca sugira contar pontos à paciente.
- Responda em português do Brasil, curto e direto, texto simples sem markdown nem asteriscos. Use listas com hífen.

${CLINIC}`;

// ---------- Groq
async function groq(messages: Msg[], tools?: unknown[]) {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Fail(503, 'O assistente ainda não foi ativado: falta a chave do Groq (GROQ_API_KEY) na Vercel.');
  const r = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, messages, temperature: 0.3, max_tokens: 1200, ...(tools ? { tools, tool_choice: 'auto' } : {}) }),
  });
  if (r.status === 429) throw new Fail(429, 'O assistente recebeu muitas perguntas agora. Espere um minuto e tente de novo.');
  if (!r.ok) {
    const detail = await r.text().catch(() => '');
    console.error('groq', r.status, detail.slice(0, 500));
    throw new Fail(502, 'O assistente não conseguiu responder agora. Tente de novo.');
  }
  const j = await r.json();
  return j.choices?.[0]?.message as { content: string | null; tool_calls?: ToolCall[] };
}

const clean = (t: string | null | undefined) => (t ?? '').replace(/\*\*(.+?)\*\*/g, '$1').trim();

export async function POST(req: Request) {
  try {
    const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
    if (!token) throw new Fail(401, 'Entre no sistema para usar o assistente.');
    const body = await req.json().catch(() => null) as { mode?: string; messages?: { role: string; content: string }[] } | null;
    const mode = body?.mode === 'clinica' ? 'clinica' : 'paciente';
    const history: Msg[] = (body?.messages ?? [])
      .filter((m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
      .slice(-12)
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content.slice(0, 2000) }));
    if (!history.length || history[history.length - 1].role !== 'user') throw new Fail(400, 'Escreva uma pergunta.');

    const db = createClient(SUPABASE_URL, SUPABASE_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: u, error: ue } = await db.auth.getUser(token);
    if (ue || !u.user) throw new Fail(401, 'Sua sessão expirou. Entre de novo.');
    const profile = await must<Row | null>(db.from('profiles').select('role, full_name').eq('id', u.user.id).maybeSingle());

    if (mode === 'paciente') {
      const system = await patientPrompt(db, u.user.id);
      const m = await groq([{ role: 'system', content: system }, ...history]);
      return Response.json({ reply: clean(m?.content) || 'Desculpe, não consegui responder. Pode perguntar de outro jeito?', actions: [] });
    }

    if (!profile || profile.role === 'patient') throw new Fail(403, 'O assistente da clínica é só para a equipe.');
    const actions: Action[] = [];
    const msgs: Msg[] = [{ role: 'system', content: clinicPrompt(profile.full_name, profile.role) }, ...history];
    for (let round = 0; round < 6; round++) {
      const m = await groq(msgs, TOOLS);
      if (!m?.tool_calls?.length) {
        return Response.json({ reply: clean(m?.content) || (actions.length ? 'Confira e confirme abaixo.' : 'Não consegui responder. Pode reformular?'), actions });
      }
      msgs.push({ role: 'assistant', content: m.content ?? '', tool_calls: m.tool_calls });
      for (const call of m.tool_calls) {
        let out: string;
        try {
          const args = JSON.parse(call.function.arguments || '{}');
          out = await runTool(db, call.function.name, args, actions);
        } catch (e) {
          out = e instanceof Fail ? `Erro: ${e.message}` : 'Erro ao executar a ferramenta.';
        }
        msgs.push({ role: 'tool', tool_call_id: call.id, content: out.slice(0, 6000) });
      }
    }
    return Response.json({ reply: actions.length ? 'Preparei as ações abaixo. Confira e confirme.' : 'A pergunta ficou longa demais para mim. Pode dividir em partes?', actions });
  } catch (e) {
    const f = e instanceof Fail ? e : new Fail(500, 'Erro inesperado no assistente. Tente de novo.');
    if (!(e instanceof Fail)) console.error(e);
    return Response.json({ error: f.message }, { status: f.status });
  }
}
