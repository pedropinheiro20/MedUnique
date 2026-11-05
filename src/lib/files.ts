import * as DocumentPicker from 'expo-document-picker';
import { Linking, Platform } from 'react-native';

import { supabase } from './supabase';

// Arquivos privados do Supabase: contratos, boletos e comprovantes.
// O caminho começa sempre pelo id do plano (<plan_id>/...), que é o que as regras do banco conferem.
export type Bucket = 'contratos' | 'boletos' | 'comprovantes';
export type Picked = DocumentPicker.DocumentPickerAsset;

const MAX_MB = 10;

export async function pickFile(types: string[] = ['application/pdf', 'image/*']): Promise<Picked | null> {
  const r = await DocumentPicker.getDocumentAsync({ type: types, copyToCacheDirectory: true, multiple: false });
  return r.canceled ? null : r.assets[0];
}

export async function uploadFile(bucket: Bucket, path: string, file: Picked): Promise<string | null> {
  if (file.size && file.size > MAX_MB * 1024 * 1024) return `O arquivo passa de ${MAX_MB} MB. Envie um arquivo menor.`;
  // Na web o seletor devolve o próprio arquivo; no celular, lemos pelo endereço local
  const body: Blob | ArrayBuffer = Platform.OS === 'web' && file.file ? file.file : await (await fetch(file.uri)).arrayBuffer();
  const { error } = await supabase.storage.from(bucket).upload(path, body, {
    contentType: file.mimeType ?? 'application/octet-stream', upsert: true,
  });
  return error ? 'Não foi possível enviar o arquivo. Confira a conexão e tente de novo.' : null;
}

// Nome seguro para o arquivo, mantendo a extensão
export function fileName(prefix: string, file: Picked) {
  const ext = (file.name.match(/\.([a-z0-9]{1,5})$/i)?.[1] ?? (file.mimeType === 'application/pdf' ? 'pdf' : 'jpg')).toLowerCase();
  return `${prefix}-${Date.now()}.${ext}`;
}

// Abre o arquivo com um link que vale 5 minutos.
// Na web, a aba nova é aberta antes de esperar o link, senão o Safari do iPhone bloqueia.
export async function openFile(bucket: Bucket, path: string): Promise<string | null> {
  const web = Platform.OS === 'web' && typeof window !== 'undefined';
  const tab = web ? window.open('', '_blank') : null;
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 300);
  if (error || !data) { tab?.close(); return 'Não foi possível abrir o arquivo agora.'; }
  if (web) { if (tab) tab.location.href = data.signedUrl; else window.location.href = data.signedUrl; }
  else await Linking.openURL(data.signedUrl);
  return null;
}
