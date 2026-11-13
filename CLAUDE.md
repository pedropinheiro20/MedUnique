# MedUnique · documento do projeto

Sistema web da Clínica Med Unique (saúde e estética): área da paciente e painel da clínica, com login próprio.
Leia também `AGENTS.md` (regras do Expo) e `README.md` (como rodar).

## Onde fica cada coisa

| Peça | Onde | Observação |
| --- | --- | --- |
| Site no ar | https://clinicamedunique.vercel.app | Vercel, projeto `clinicamedunique` (Root Directory vazio); cada envio para `main` publica sozinho. Site em `/`, sistema em `/entrar`, `/paciente`, `/clinica`, assistente em `/api/chat` |
| Site institucional | Pasta `site/` (HTML e CSS, sem build) | O build (`vercel.json`) copia o site para a raiz e guarda o app em `app.html`; o botão Entrar leva a `/entrar` |
| Prévia | Link da Vercel para cada branch | Testar ali, nunca direto no site do ar |
| Código | github.com/pedropinheiro20/MedUnique | Fonte única da verdade |
| Banco e login | Supabase `medunique` (ref `bmmfynfqiurpogbdxszd`, São Paulo, grátis) | Regras de acesso (RLS) em todas as tabelas |
| Mudanças do banco | `supabase/migrations/` | Numeradas por data; o dono roda no SQL Editor do Supabase |
| Telas | `src/app/` (Expo Router) | `paciente/`, `clinica/`, `clinica/ficha/[id]`, `clinica/plano/[patientId]` (novo plano), `entrar` |
| Arquivos | Supabase Storage: `contratos`, `boletos`, `comprovantes` (privados) | Caminho `<plan_id>/<arquivo>`; abertos por link de 5 min (`src/lib/files.ts`) |
| Dados e ações | `src/state/store.tsx`, `src/state/auth.tsx` | |
| Assistente com IA | `api/chat.ts` (função da Vercel), `src/components/chat.tsx` | Groq (grátis). Chave `GROQ_API_KEY` só na Vercel; `GROQ_MODEL` troca o modelo. Na clínica, ações só com Confirmar |
| Visual | `src/theme.ts`, `src/components/` | Paleta bege-rosado + símbolo da logo; no computador (≥ 900 px) o menu fica na lateral |

## Decisões do dono (Pedro)

- Login com e-mail e senha. A primeira conta é criada com o código de acesso de 6 dígitos que a clínica passa. Ninguém cria conta sozinho.
- Cargos: `admin`, `reception`, `finance`, `professional` e `patient`. A equipe é cadastrada na tela Equipe (só admin).
- 1 crédito = R$ 1 pago. O procedimento consome créditos iguais ao seu preço.
- Pontos = valor do plano em R$, creditados conforme os boletos são pagos. A paciente não vê pontos.
- Boletos são emitidos no banco da clínica. A equipe anexa o boleto e dá baixa manual.
- Publicação só de graça: Vercel + ícone na tela do celular, sem lojas por enquanto.
- Assistente com IA do Groq (plano grátis). A paciente consulta só os próprios dados e não vê pontos; o agente da clínica só propõe ações, que a pessoa confirma.

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
| 2026-11-13 | Site e sistema num só projeto da Vercel (`clinicamedunique`); o projeto `medunique` foi apagado | — |
| 2026-11-13 | Assistente com IA (Groq): chat na área da paciente e agente com ações confirmadas no painel da clínica | — |
| 2026-11-05 | Nova tela de entrada do sistema (foto da clínica + formulário), e o site leva direto a ela | — |
| 2026-11-05 | Site institucional em `site/`, com os dados e fotos do site antigo (medunique.com.br) | — |
| 2026-11-05 | Etapa 2: criar plano, marcar/remarcar sessões, lançar e editar boletos, anexar PDF do boleto e do contrato, comprovante salvo de verdade | — |
| 2026-11-05 | Menu lateral no computador, tela Equipe, ficha dentro da clínica, recarregar mantém a tela (PR #4) | `20261105120000_equipe_no_sistema.sql` |
| 2026-11-03 | Ícone para "Adicionar à Tela de Início" (PR #3) | — |
| 2026-10-30 | Pontos conforme a paciente paga (PR #2) e catálogo de resgates com 48 itens (PR #1) | `20261030*.sql` |
| 2026-10-28 | Login com senha e código, 477 procedimentos, convites da equipe | `20261028*.sql` |
