const SUPABASE_URL =
  'https://zzbjvstentfhwchfcann.supabase.co';

const SUPABASE_PUBLISHABLE_KEY =
  'sb_publishable_kTGWX9wJwGptg4vRD23mbA_VhEED4_D';

const supabaseClient =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
  );