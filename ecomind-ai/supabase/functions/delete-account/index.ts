// =============================================================================
// Supabase Edge Function: delete-account
// Fshin PLOTËSISHT llogarinë e përdoruesit — të dhënat (bills, devices, users)
// DHE vetë llogarinë Auth (auth.users), gjë që klienti nuk mund ta bëjë vetë.
//
// Deploy:  supabase functions deploy delete-account
// Kërkon:  variablat e mjedisit SUPABASE_URL dhe SUPABASE_SERVICE_ROLE_KEY
//          (i vendos automatikisht Supabase kur bën deploy).
// Thirrja nga app-i:  supabase.functions.invoke('delete-account')
// =============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization') || '';
    const jwt = authHeader.replace('Bearer ', '').trim();
    if (!jwt) {
      return new Response(JSON.stringify({ error: 'Mungon autorizimi.' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // 1) Verifiko kush është përdoruesi nga JWT-ja e tij
    const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Sesion i pavlefshëm.' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const uid = userData.user.id;

    // 2) Fshi të dhënat e tij (service role e anashkalon RLS-në)
    await admin.from('bills').delete().eq('user_id', uid);
    await admin.from('devices').delete().eq('user_id', uid);
    await admin.from('users').delete().eq('id', uid);

    // 3) Fshi vetë llogarinë Auth
    const { error: delErr } = await admin.auth.admin.deleteUser(uid);
    if (delErr) {
      return new Response(JSON.stringify({ error: delErr.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
