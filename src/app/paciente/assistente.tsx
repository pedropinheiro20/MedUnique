import { AssistantChat } from '@/components/chat';
import { firstName } from '@/data/model';
import { useStore } from '@/state/store';

export default function AssistentePaciente() {
  const { me } = useStore();
  return (
    <AssistantChat
      who="paciente"
      intro={`Olá${me ? `, ${firstName(me.name)}` : ''}! Sou a assistente da Med Unique. Posso tirar dúvidas sobre a clínica, os tratamentos e o seu plano: sessões, créditos e boletos.`}
      suggestions={['Quando é minha próxima sessão?', 'Quantos créditos eu tenho?', 'Tenho boleto para pagar?', 'Como remarco uma sessão?']}
    />
  );
}
