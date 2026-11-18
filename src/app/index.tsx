import { Redirect } from 'expo-router';

import { useAuth } from '@/state/auth';

// Início do app. No navegador, o endereço / abre o site institucional (vercel.json), então esta tela só aparece
// no celular ou quando o app navega para /: quem já entrou vai para a sua área e os demais para o login.
export default function Inicio() {
  const { ready, session, isStaff } = useAuth();
  if (!ready) return null;
  return <Redirect href={session ? (isStaff ? '/clinica' : '/paciente') : '/entrar'} />;
}
