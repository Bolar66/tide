/**
 * Supabase project (EU, Frankfurt). The publishable key is public by design: it only grants
 * what Row Level Security allows, and the server only ever holds ciphertext.
 * Never put a service_role / secret key in the app.
 */
export const SUPABASE_URL = 'https://dlqqkiixculrqjfegjsq.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_eFa5s3yRraUlm5-7eWBjNA_1weyZB_4';

/** Minimum account password length. The password also protects the encryption key. */
export const MIN_PASSWORD_LENGTH = 10;
