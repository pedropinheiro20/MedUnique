// Dados de exemplo do protótipo. No app final, tudo isto vem da API da clínica.

export const TODAY = new Date(2026, 9, 25);

export type StepStatus = 'done' | 'next' | 'plan';
export type Step = {
  phase: number;
  title: string;
  price: number; // em créditos (1 crédito = R$ 1,00)
  date: Date;
  hour: string;
  status: StepStatus;
  what: string;
  care: string[];
};

const d = (y: number, m: number, day: number) => new Date(y, m - 1, day);

export const plan = {
  name: 'Protocolo Harmonia Facial',
  start: d(2026, 8, 10),
  end: d(2027, 2, 8),
  professional: 'Dra. Camila Rezende · CRM 123456',
  phases: ['Preparação', 'Estruturação', 'Qualidade da pele'],
  steps: [
    { phase: 0, title: 'Avaliação e planejamento', price: 600, date: d(2026, 8, 10), hour: '09:00', status: 'done',
      what: 'Fotos padronizadas, análise facial e definição das metas do protocolo.',
      care: ['Trazer lista de medicamentos em uso', 'Vir sem maquiagem'] },
    { phase: 1, title: 'Bioestimulador de colágeno · 1ª sessão', price: 1500, date: d(2026, 8, 24), hour: '10:00', status: 'done',
      what: 'Aplicação de bioestimulador para firmeza e sustentação. O colágeno começa a se formar entre 30 e 90 dias.',
      care: ['Massagear a região 5×5×5 (5 min, 5 vezes ao dia, por 5 dias)', 'Evitar sol direto por 48 h'] },
    { phase: 1, title: 'Toxina botulínica', price: 1200, date: d(2026, 9, 14), hour: '14:30', status: 'done',
      what: 'Suavização de linhas de expressão na testa e entre as sobrancelhas. Efeito completo em 15 dias.',
      care: ['Não deitar por 4 h', 'Sem atividade física intensa por 24 h'] },
    { phase: 1, title: 'Retorno da toxina', price: 0, date: d(2026, 9, 28), hour: '14:30', status: 'done',
      what: 'Avaliação do resultado e ajuste fino, se necessário.', care: ['Sem cuidados especiais'] },
    { phase: 1, title: 'Bioestimulador de colágeno · 2ª sessão', price: 1500, date: d(2026, 10, 29), hour: '10:00', status: 'next',
      what: 'Segunda aplicação para potencializar a produção de colágeno iniciada em agosto.',
      care: ['Evitar anti-inflamatórios 3 dias antes', 'Comer algo leve antes da sessão'] },
    { phase: 2, title: 'Skinbooster · 1ª sessão', price: 900, date: d(2026, 11, 19), hour: '16:00', status: 'plan',
      what: 'Hidratação profunda com ácido hialurônico de baixa densidade, para viço e textura.',
      care: ['Pequenas pápulas somem em 24 a 48 h'] },
    { phase: 2, title: 'Skinbooster · 2ª sessão', price: 900, date: d(2026, 12, 17), hour: '16:00', status: 'plan',
      what: 'Reforço da hidratação.', care: ['Mesmos cuidados da 1ª sessão'] },
    { phase: 2, title: 'Skinbooster · 3ª sessão', price: 900, date: d(2027, 1, 14), hour: '16:00', status: 'plan',
      what: 'Última sessão de hidratação do protocolo.', care: ['Mesmos cuidados da 1ª sessão'] },
    { phase: 2, title: 'Reavaliação final', price: 300, date: d(2027, 2, 8), hour: '09:00', status: 'plan',
      what: 'Fotos comparativas com o dia da avaliação, resultado final e plano de manutenção.',
      care: ['Vir sem maquiagem'] },
  ] as Step[],
  // indicadores da avaliação clínica (0–100)
  metrics: [
    { name: 'Firmeza da pele', base: 52, now: 68, goal: 80 },
    { name: 'Hidratação', base: 41, now: 47, goal: 75 },
    { name: 'Linhas de expressão', base: 30, now: 78, goal: 80 },
  ],
};

export type Boleto = { n: number; due: Date; value: number; paidAt?: Date; code: string };

// entrada de R$ 3.800 + 8 parcelas de R$ 500, vencendo todo dia 10
export const boletos: Boleto[] = Array.from({ length: 9 }, (_, i) => ({
  n: i + 1,
  due: new Date(2026, 7 + i, 10),
  value: i === 0 ? 3800 : 500,
  paidAt: [d(2026, 8, 8), d(2026, 9, 9), d(2026, 10, 10)][i],
  code: `23793.38128 6008${i}.635804 31000.0633${String(i).padStart(2, '0')} ${(i % 9) + 1} ${15960 + i * 30}0000${i === 0 ? '380000' : '050000'}`,
}));

export const contract = {
  number: 'MU-2026-0418',
  signedAt: d(2026, 8, 10),
  total: 7800,
  entry: 3800,
  installment: 500,
  installments: 8,
  pages: 3,
  clauses: [
    ['Objeto', 'Prestação dos procedimentos do Protocolo Harmonia Facial, em 9 etapas, conforme planejamento individual.'],
    ['Vigência', 'De 10/08/2026 a 08/02/2027. Etapas podem ser reagendadas com 24 h de antecedência sem custo.'],
    ['Pagamento', 'R$ 7.800,00 por boleto bancário: entrada de R$ 3.800,00 e 8 parcelas de R$ 500,00, com vencimento todo dia 10. Após o vencimento há multa de 2% e juros de 1% ao mês.'],
    ['Créditos', 'Cada R$ 1,00 pago vira 1 crédito. Cada etapa usa a quantidade de créditos igual ao seu valor e só pode ser feita quando houver créditos suficientes. Se faltar crédito, você pode antecipar um boleto ou reagendar a etapa.'],
    ['Cancelamento', 'Pode ser solicitado a qualquer momento. São cobradas apenas as etapas realizadas, e os créditos pagos e não usados são devolvidos em até 30 dias.'],
    ['Faltas', 'Faltas sem aviso prévio de 24 h contam como etapa realizada, limitado a uma ocorrência por protocolo.'],
    ['Consentimento e imagem', 'Termo de consentimento assinado para cada procedimento. Fotos clínicas usadas apenas no prontuário, salvo autorização expressa.'],
  ] as [string, string][],
};

export const careTasks = [
  { id: 'fps', label: 'Protetor solar FPS 50 pela manhã', pts: 5 },
  { id: 'hid', label: 'Hidratante à noite', pts: 5 },
  { id: 'agua', label: '2 litros de água', pts: 5 },
];

// Recompensas do programa de pontos (visível só para a clínica)
export const catalog = [
  { id: 'limpeza', name: 'Limpeza de pele profunda', cost: 300 },
  { id: 'drenagem', name: 'Drenagem linfática', cost: 400 },
  { id: 'peeling', name: 'Peeling de diamante', cost: 600 },
  { id: 'led', name: 'LEDterapia facial', cost: 250 },
  { id: 'nutri', name: 'Consulta com nutricionista', cost: 800 },
  { id: 'desc', name: '10% de desconto no próximo plano', cost: 1200 },
];

export type BolState = 'pago' | 'analise' | 'vencido' | 'aberto' | 'futuro';
export type Patient = {
  id: string; name: string; ini: string; plan: string; done: number; total: number;
  next: string | null; pay: string; since: string; phone: string;
  points?: number; cred?: number; needCred?: number; bol?: BolState; bolInfo?: string;
};

// "jp" é a paciente com dados completos; as demais têm só o resumo
export const patients: Patient[] = [
  { id: 'jp', name: 'Juliana M. Prado', ini: 'JP', plan: 'Harmonia Facial', done: 4, total: 9, next: '29/10 · 10:00', pay: 'Boleto', since: '10/08/2026', phone: '(11) 98765-4321' },
  { id: 'mc', name: 'Mariana Costa', ini: 'MC', plan: 'Contorno Corporal', done: 7, total: 10, next: '26/10 · 09:00', pay: 'Cartão', since: '02/06/2026', phone: '(11) 99812-3344', points: 620, cred: 2100 },
  { id: 'ba', name: 'Beatriz Almeida', ini: 'BA', plan: 'Pele Radiante', done: 2, total: 6, next: '26/10 · 11:00', pay: 'Boleto', since: '18/08/2026', phone: '(11) 97654-1188', points: 560, cred: 300, needCred: 800, bol: 'vencido', bolInfo: 'Parcela 3 venceu em 20/10' },
  { id: 'rs', name: 'Renata Siqueira', ini: 'RS', plan: 'Contorno Corporal', done: 1, total: 10, next: '26/10 · 14:30', pay: 'Boleto', since: '05/10/2026', phone: '(11) 98111-2020', points: 550, cred: 900, bol: 'aberto', bolInfo: 'Parcela 2 vence em 05/11' },
  { id: 'fl', name: 'Fernanda Lopes', ini: 'FL', plan: 'Pele Radiante', done: 3, total: 6, next: '28/10 · 09:30', pay: 'Pix', since: '30/07/2026', phone: '(11) 99300-7766', points: 690, cred: 1200 },
  { id: 'cm', name: 'Carla Menezes', ini: 'CM', plan: 'Harmonia Facial', done: 9, total: 9, next: null, pay: 'Cartão', since: '12/01/2026', phone: '(11) 98420-5511', points: 1210, cred: 0 },
];

export const clinicAgenda: Record<number, [string, string | null, string][]> = {
  26: [['09:00', 'mc', 'Drenagem pós-procedimento'], ['11:00', 'ba', 'Peeling químico · 3ª sessão'], ['14:30', 'rs', 'Criolipólise · 2ª sessão'], ['16:00', null, 'Avaliação · Paula Nogueira (novo contato)']],
  27: [['10:30', 'cm', 'Retorno de manutenção']],
  28: [['09:30', 'fl', 'Microagulhamento · 4ª sessão'], ['13:00', 'mc', 'Radiofrequência']],
  29: [['10:00', 'jp', 'Bioestimulador de colágeno · 2ª sessão'], ['15:00', 'rs', 'Drenagem linfática']],
  30: [['11:00', 'ba', 'Limpeza de pele (resgate de pontos)']],
  31: [],
};

export const seedVouchers = [
  { who: 'jp', name: 'Limpeza de pele profunda', code: 'MU-LP7Q', date: '12/10/2026', used: true },
  { who: 'mc', name: 'Drenagem linfática', code: 'MU-D82K', date: '20/10/2026', used: true },
  { who: 'fl', name: 'LEDterapia facial', code: 'MU-L5TW', date: '23/10/2026', used: false },
];

export const MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
export const MESF = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
export const WD = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export const fmt = (x: Date) =>
  `${String(x.getDate()).padStart(2, '0')}/${String(x.getMonth() + 1).padStart(2, '0')}/${x.getFullYear()}`;
export const brl = (v: number) => 'R$ ' + v.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
export const num = (v: number) => String(v).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
