import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mibwoiofocgtteyxcezs.supabase.co';
const supabaseAnonKey = 'sb_publishable_PHXNYPAwoblop48bZ6IANg_w32xh1YB';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});
