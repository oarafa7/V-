/**
 * Local development auth — locally-signed HS256 JWTs used when Supabase is not
 * configured (see env `localAuth`). Lets the full stack run with no cloud auth.
 * Never active in production (the env schema requires Supabase there).
 */
import { sign, verify } from 'hono/jwt';

import { env } from './env.js';

const TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

/** Issue a local session token for a user id. */
export async function signLocalToken(userId: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return sign({ sub: userId, iat: now, exp: now + TTL_SECONDS }, env.LOCAL_JWT_SECRET, 'HS256');
}

/** Verify a local token, returning the user id or null. */
export async function verifyLocalToken(token: string): Promise<string | null> {
  try {
    const payload = await verify(token, env.LOCAL_JWT_SECRET, 'HS256');
    return typeof payload.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
}
