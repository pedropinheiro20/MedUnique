import { AssistantChat } from '@/components/chat';

export default function AssistenteClinica() {
  return (
    <AssistantChat
      who="clinica"
      intro="Olá! Consulto agenda, pacientes e financeiro, e preparo ações como marcar sessão ou dar baixa em boleto. Nada é gravado sem você clicar em Confirmar."
      suggestions={['Qual a agenda de hoje?', 'Quais boletos estão vencidos?', 'Quem está com a próxima sessão sem data?', 'Resumo do financeiro do mês']}
    />
  );
}
