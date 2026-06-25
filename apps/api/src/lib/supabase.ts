/**
 * Server-side Supabase admin client (uses the service-role key — never expose
 * this to the client). Used for auth operations and verifying JWTs.
 *
 * Null in local mode (no Supabase configured); callers branch on `flags.supabase`.
 */
import { createClient } from '@supabase/supabase-js';

import { env, flags } from './env.js';

export const supabaseAdmin = flags.supabase
  ? createClient(env.SUPABASE_URL!, env.SUPABASE_SERVICE_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : null;
