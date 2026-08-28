import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = 'https://mibwoiofocgtteyxcezs.supabase.co';
const supabaseAnonKey = 'sb_publishable_PHXNYPAwoblop48bZ6IANg_w32xh1YB';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Persist the JWT session across app restarts using AsyncStorage
    storage: AsyncStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

// Lejon regjistrim/hyrje me çdo tekst si "email": nëse mungon '@', shtohet
// automatikisht një domain i paracaktuar, që të mos kërkohet një email real/valid.
export const toEmail = (value) => {
  const t = (value ?? '').toString().toLowerCase().trim();
  if (!t) return t;
  return t.includes('@') ? t : `${t.replace(/\s+/g, '')}@ecomind.app`;
};
