import { Redirect } from 'expo-router';

// Endereço que não existe no sistema: volta para o início, que leva cada pessoa para a sua área ou para o login.
export default function NaoEncontrada() {
  return <Redirect href="/" />;
}
