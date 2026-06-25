/**
 * Bearer-token auth middleware. Verifies the Supabase JWT and attaches the
 * authenticated user id + the application user row to the request context.
 */
import { eq } from 'drizzle-orm';
import { createMiddleware } from 'hono/factory';

import { db } from '../db/client.js';
import { users } from '../db/schema.js';
import type { UserRow } from '../db/schema.js';
import { localAuth } from '../lib/env.js';
import { errorResponse } from '../lib/http.js';
import { verifyLocalToken } from '../lib/local-auth.js';
import { supabaseAdmin } from '../lib/supabase.js';

export interface AuthVariables {
  userId: string;
  user: UserRow;
}

export const requireAuth = createMiddleware<{ Variables: AuthVariables }>(
  async (c, next) => {
    const header = c.req.header('Authorization');
    if (!header || !header.startsWith('Bearer ')) {
      return errorResponse(c, 'unauthorized', 'Missing or malformed Authorization header');
    }

    const token = header.slice('Bearer '.length).trim();

    // Resolve the authenticated user id from the token — locally-signed JWT in
    // local mode, otherwise verified against Supabase Auth.
    let userId: string | null;
    if (localAuth) {
      userId = await verifyLocalToken(token);
    } else {
      const { data, error } = await supabaseAdmin!.auth.getUser(token);
      userId = error || !data.user ? null : data.user.id;
    }
    if (!userId) {
      return errorResponse(c, 'unauthorized', 'Invalid or expired session token');
    }

    const [row] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!row) {
      return errorResponse(c, 'unauthorized', 'User profile not found');
    }

    c.set('userId', row.id);
    c.set('user', row);
    await next();
  },
);
