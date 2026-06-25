/**
 * Customer-facing lab packages — the admin-managed "Book Extra Lab Tests" /
 * "Add-on Lab Tests" catalogue. Requires auth (any signed-in user can browse to
 * book); not gated behind a subscription.
 */
import { Hono } from 'hono';

import { listLabPackages } from '../lib/lab-packages.js';
import { type AuthVariables, requireAuth } from '../middleware/auth.js';

export const labPackageRoutes = new Hono<{ Variables: AuthVariables }>();

labPackageRoutes.use('*', requireAuth);

labPackageRoutes.get('/lab-packages', async (c) => {
  const packages = await listLabPackages({ activeOnly: true });
  return c.json({ lab_packages: packages });
});
