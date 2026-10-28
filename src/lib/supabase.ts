import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

// Servidor MedUnique (Supabase, São Paulo). A chave publicável pode ficar no app:
// o que cada pessoa vê é decidido pelas regras de segurança do banco.
export const SUPABASE_URL = 'https://bmmfynfqiurpogbdxszd.supabase.co';
const SUPABASE_KEY = 'sb_publishable_RmIyzZ6V8CUwJMHOiAtX1w_iIXN1PW3';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storage: Platform.OS === 'web' ? undefined : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
