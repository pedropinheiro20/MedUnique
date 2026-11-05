# MedUnique · documento do projeto

Sistema web da Clínica Med Unique (saúde e estética): área da paciente e painel da clínica, com login próprio.
Leia também `AGENTS.md` (regras do Expo) e `README.md` (como rodar).

## Onde fica cada coisa

| Peça | Onde | Observação |
| --- | --- | --- |
| Site no ar | https://medunique.vercel.app | Vercel, projeto `medunique`; cada envio para `main` publica sozinho |
| Prévia | Link da Vercel para cada branch | Testar ali, nunca direto no site do ar |
| Código | github.com/pedropinheiro20/MedUnique | Fonte única da verdade |
| Banco e login | Supabase `medunique` (ref `bmmfynfqiurpogbdxszd`, São Paulo, grátis) | Regras de acesso (RLS) em todas as tabelas |
| Mudanças do banco | `supabase/migrations/` | Numeradas por data; o dono roda no SQL Editor do Supabase |
| Telas | `src/app/` (Expo Router) | `paciente/`, `clinica/`, `clinica/ficha/[id]`, `clinica/plano/[patientId]` (novo plano), `entrar` |
| Arquivos | Supabase Storage: `contratos`, `boletos`, `comprovantes` (privados) | Caminho `<plan_id>/<arquivo>`; abertos por link de 5 min (`src/lib/files.ts`) |
| Dados e ações | `src/state/store.tsx`, `src/state/auth.tsx` | |
| Visual | `src/theme.ts`, `src/components/` | Paleta bege-rosado + símbolo da logo; no computador (≥ 900 px) o menu fica na lateral |

## Decisões do dono (Pedro)

- Login com e-mail e senha. A primeira conta é criada com o código de acesso de 6 dígitos que a clínica passa. Ninguém cria conta sozinho.
- Cargos: `admin`, `reception`, `finance`, `professional` e `patient`. A equipe é cadastrada na tela Equipe (só admin).
- 1 crédito = R$ 1 pago. O procedimento consome créditos iguais ao seu preço.
- Pontos = valor do plano em R$, creditados conforme os boletos são pagos. A paciente não vê pontos.
- Boletos são emitidos no banco da clínica. A equipe anexa o boleto e dá baixa manual.
- Publicação só de graça: Vercel + ícone na tela do celular, sem lojas por enquanto.

## Como mudar sem quebrar

1. Pedido do dono por escrito e plano aprovado.
2. Trabalho numa branch, com PR no GitHub.
3. `npx tsc --noEmit` e `npx expo export --platform web` sem erro; telas conferidas no navegador (computador e celular).
4. Se houver SQL novo, o dono roda no Supabase **antes** de publicar.
5. Só com "pode publicar" do dono o PR entra na `main`.
6. Atualizar a seção "Histórico" abaixo.
7. **Para desfazer:** na Vercel, "Promote" na publicação anterior; ou "Revert" do PR no GitHub.

## Histórico

| Data | Mudança | SQL |
| --- | --- | --- |
| 2026-11-05 | Etapa 2: criar plano, marcar/remarcar sessões, lançar e editar boletos, anexar PDF do boleto e do contrato, comprovante salvo de verdade | — |
| 2026-11-05 | Menu lateral no computador, tela Equipe, ficha dentro da clínica, recarregar mantém a tela (PR #4) | `20261105120000_equipe_no_sistema.sql` |
| 2026-11-03 | Ícone para "Adicionar à Tela de Início" (PR #3) | — |
| 2026-10-30 | Pontos conforme a paciente paga (PR #2) e catálogo de resgates com 48 itens (PR #1) | `20261030*.sql` |
| 2026-10-28 | Login com senha e código, 477 procedimentos, convites da equipe | `20261028*.sql` |
