# MedUnique · app do paciente e da clínica (front-end)

Protótipo de front-end em **Expo (React Native) + Expo Router + TypeScript**. Roda em iPhone, Android e navegador a partir do mesmo código. Ainda **não tem servidor**: todos os dados são de exemplo (`src/data/mock.ts`) e as ações ficam só na memória do app.

## Como rodar

```bash
npm install
npx expo start
```

- **No celular:** instale o app **Expo Go** (App Store / Google Play) e leia o QR code que aparece no terminal.
- **No navegador:** aperte `w` no terminal.

## O que tem

**Abertura:** foto da clínica, "Entrar como paciente" ou "Sou da equipe da clínica". O avatar no canto superior direito troca de lado a qualquer momento (no app final, cada pessoa entra com o próprio login).

**Paciente** (`src/app/paciente/`)
- **Início:** progresso do protocolo, próxima sessão (confirmar presença só se houver créditos), créditos, próximo boleto e cuidados do dia.
- **Meu plano:** jornada por etapas com valor em créditos e status (liberada / faltam X créditos / aguardando pagamento), evolução e conquistas.
- **Agenda:** calendário, próximas sessões e realizadas, confirmar e reagendar.
- **Contrato:** resumo, contrato completo em PDF (`src/app/contrato-pdf.tsx`), extrato de créditos, boletos (copiar código, enviar comprovante) e cláusulas em linguagem simples.
- A paciente **não vê pontos**.

**Clínica** (`src/app/clinica/` e `src/app/ficha/[id].tsx`)
- **Painel:** recebido no mês, pacientes ativos, pendências (sem créditos, boleto vencido, voucher) e próximos atendimentos.
- **Agenda:** semana com atendimentos e alerta de "sem créditos".
- **Pacientes:** busca, filtros, cadastro e ficha (créditos, pontos, pagamento, registrar procedimento, lançar pontos, resgatar recompensa, contrato).
- **Financeiro:** vencidos, em aberto e comprovantes. Dar baixa libera os créditos na hora.
- **Resgates:** validar vouchers e catálogo de recompensas.

## Instalar no celular (Android, sem loja)

1. Crie uma conta grátis em https://expo.dev.
2. Na pasta do projeto: `npm install`, depois `npx eas-cli@latest login`.
3. Rode `npx eas-cli@latest build -p android --profile preview`.
4. Em uns 15 minutos o Expo mostra um link e um QR code. Abra no celular Android e instale o APK (permita "instalar apps desconhecidos").

No iPhone, instalar fora da loja exige conta Apple Developer (US$ 99/ano) e distribuição pelo TestFlight: `npx eas-cli@latest build -p ios` e `npx eas-cli@latest submit -p ios`.

## Regras de negócio

- **Créditos:** cada R$ 1,00 pago vira 1 crédito. Cada etapa consome créditos iguais ao seu preço e só pode ser feita se houver saldo (`src/state/store.tsx`, função `derive`).
- **Pontos:** programa de fidelidade separado dos créditos, visível e gerenciado só pela clínica.

## Estrutura

```
src/app/            telas (cada arquivo é uma rota do Expo Router)
src/components/     ui.tsx (botões, cartões, folhas, ícones), patient.tsx, clinic.tsx, tab-bar.tsx
src/data/mock.ts    dados de exemplo (trocar pela API)
src/state/store.tsx estado e regras de créditos, boletos e pontos
src/theme.ts        cores (claro/escuro) e fontes
assets/             logo, foto da abertura, ícones e páginas do contrato
```

## Próximos passos para o app real

1. Backend (sugestão: Supabase) com login separado para paciente e equipe.
2. Integração com o emissor de boletos (Asaas, Iugu, Pagar.me…) para baixa automática e créditos.
3. Contrato em PDF gerado e assinado por paciente.
4. Notificações de lembrete de sessão e de boleto.
5. Publicação nas lojas com EAS (`npx eas-cli@latest build` e `submit`).
