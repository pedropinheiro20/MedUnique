// Tipos usados pelas telas e conteúdo fixo do app. Os dados de cada paciente vêm do servidor (src/state/store.tsx).

export type StepStatus = 'done' | 'next' | 'plan';
export type Step = {
  id: string;
  planId: string;
  position: number;
  phase: number;
  title: string;
  price: number; // em créditos (1 crédito = R$ 1,00)
  date: Date | null;
  hour: string;
  status: StepStatus;
  what: string;
  care: string[];
  confirmed: boolean;
};

export type BolState = 'pago' | 'analise' | 'vencido' | 'aberto' | 'futuro';
export type Boleto = {
  id: string;
  planId: string;
  n: number;
  due: Date;
  value: number;
  paidAt?: Date;
  code: string | null;
  proofSent: boolean;
};

export type Plan = {
  id: string;
  patientId: string;
  name: string;
  professional: string;
  phases: string[];
  start: Date | null;
  end: Date | null;
  total: number;
  contractNumber: string | null;
  acceptedAt: Date | null;
  steps: Step[];
  boletos: Boleto[];
};

export type Patient = {
  id: string;
  profileId: string | null;
  name: string;
  ini: string;
  email: string | null;
  phone: string | null;
  since: Date;
  accessCode: string; // código de 6 dígitos para criar a conta no app
};

export type Reward = { id: string; name: string; cost: number };
export type Voucher = { id: string; patientId: string; name: string; code: string; date: Date; used: boolean };

// Cuidados diários sugeridos à paciente (registrados só no aparelho por enquanto)
export const careTasks = [
  { id: 'fps', label: 'Protetor solar FPS 50 pela manhã' },
  { id: 'hid', label: 'Hidratante à noite' },
  { id: 'agua', label: '2 litros de água' },
];

// Cláusulas do contrato em linguagem simples. Texto de exemplo: trocar pelo contrato real da clínica.
export function contractClauses(p: Plan): [string, string][] {
  const n = p.boletos.length;
  return [
    ['Objeto', `Prestação dos procedimentos do ${p.name}, em ${p.steps.length} etapas, conforme planejamento individual.`],
    ['Vigência', `${p.start ? `De ${fmt(p.start)}` : 'A partir da assinatura'}${p.end ? ` a ${fmt(p.end)}` : ''}. Etapas podem ser reagendadas com 24 h de antecedência sem custo.`],
    ['Pagamento', `${brl(p.total)} por boleto bancário, em ${n} ${n === 1 ? 'boleto' : 'boletos'}. Após o vencimento há multa de 2% e juros de 1% ao mês.`],
    ['Créditos', 'Cada R$ 1,00 pago vira 1 crédito. Cada etapa usa a quantidade de créditos igual ao seu valor e só pode ser feita quando houver créditos suficientes. Se faltar crédito, você pode antecipar um boleto ou reagendar a etapa.'],
    ['Cancelamento', 'Pode ser solicitado a qualquer momento. São cobradas apenas as etapas realizadas, e os créditos pagos e não usados são devolvidos em até 30 dias.'],
    ['Faltas', 'Faltas sem aviso prévio de 24 h contam como etapa realizada, limitado a uma ocorrência por protocolo.'],
    ['Consentimento e imagem', 'Termo de consentimento assinado para cada procedimento. Fotos clínicas usadas apenas no prontuário, salvo autorização expressa.'],
  ];
}

export const MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
export const MESF = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
export const WD = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
export const WDF = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];

export const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
export const dayOf = (x: Date) => { const d = new Date(x); d.setHours(0, 0, 0, 0); return d; };
export const sameDay = (a: Date | null, b: Date) => !!a && dayOf(a).getTime() === dayOf(b).getTime();
export const parseDate = (s: string | null) => (s ? new Date(s.length === 10 ? s + 'T00:00:00' : s) : null);
export const initials = (name: string) => name.trim().split(/\s+/).filter((w) => /^[A-Za-zÀ-ÿ]/.test(w)).map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '?';
export const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? '';

export const fmt = (x: Date) =>
  `${String(x.getDate()).padStart(2, '0')}/${String(x.getMonth() + 1).padStart(2, '0')}/${x.getFullYear()}`;
export const hhmm = (x: Date) => `${String(x.getHours()).padStart(2, '0')}:${String(x.getMinutes()).padStart(2, '0')}`;
export const brl = (v: number) => 'R$ ' + v.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
export const num = (v: number) => String(v).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
