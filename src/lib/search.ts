// Busca de nomes tolerante a erros de digitação (sem acento, sem maiúsculas).
// "Raphaela Sousa" acha "Rafaela Souza", "jessica" acha "Jéssica", "tais" acha "Thaís",
// "Mariana Olivera" acha "Mariana Oliveira". Usada na tela Pacientes e no assistente da clínica.

// Sem acento e em minúsculas
export const plain = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Aproxima a pronúncia: letras que soam igual em português viram a mesma
function sound(w: string) {
  return w
    .replace(/ph/g, 'f')
    .replace(/th/g, 't')
    .replace(/ch|sh/g, 'x')
    .replace(/lh/g, 'li')
    .replace(/nh/g, 'ni')
    .replace(/h/g, '')
    .replace(/y/g, 'i')
    .replace(/w/g, 'v')
    .replace(/k/g, 'c')
    .replace(/q(u)?/g, 'c')
    .replace(/c(?=[ei])/g, 's')
    .replace(/z/g, 's')
    .replace(/(.)\1+/g, '$1'); // letras dobradas: "Isabella" = "Isabela"
}

const words = (s: string) => plain(s).replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);

// Distância de edição (trocar, tirar, pôr ou inverter duas letras vizinhas conta 1)
function dist(a: string, b: string, max: number) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    let best = Infinity;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      best = Math.min(best, d[i][j]);
    }
    if (best > max) return max + 1;
  }
  return d[a.length][b.length];
}

// Erros aceitos conforme o tamanho da palavra digitada
const allowed = (len: number) => (len <= 3 ? 0 : len <= 5 ? 1 : 2);

// Nota de 0 (não combina) a 1 (igual) entre uma palavra digitada e uma palavra do nome
function wordScore(q: string, n: string) {
  if (n === q) return 1;
  if (n.startsWith(q)) return 0.95; // ainda digitando: "mari" acha "Mariana"
  if (n.includes(q) && q.length >= 3) return 0.85;
  const qs = sound(q), ns = sound(n);
  if (ns === qs) return 0.9;
  if (qs.length >= 2 && ns.startsWith(qs)) return 0.85;
  const max = allowed(qs.length);
  if (!max) return 0;
  // palavra inteira com erro, ou o começo do nome com erro (ainda digitando)
  const full = dist(qs, ns, max);
  const pre = ns.length > qs.length ? dist(qs, ns.slice(0, qs.length), max) : max + 1;
  const e = Math.min(full, pre + 0.5);
  return e <= max ? 0.8 - e * 0.15 : 0;
}

// Nota do nome para a busca: 0 se alguma palavra digitada não aparece no nome (com tolerância)
export function nameScore(query: string, name: string) {
  const qs = words(query);
  if (!qs.length) return 1;
  const ns = words(name);
  let total = 0;
  for (const q of qs) {
    const best = Math.max(0, ...ns.map((n) => wordScore(q, n)));
    if (!best) return 0;
    total += best;
  }
  return total / qs.length;
}

// Filtra e ordena: os nomes mais parecidos com o que foi digitado vêm primeiro
export function searchByName<T>(list: T[], query: string, nameOf: (x: T) => string): T[] {
  if (!words(query).length) return list;
  return list
    .map((x, i) => ({ x, i, s: nameScore(query, nameOf(x)) }))
    .filter((r) => r.s > 0)
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .map((r) => r.x);
}
