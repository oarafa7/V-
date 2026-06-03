/**
 * VITAL API — Hono application entry point.
 *
 * All routes are versioned under /api/v1. Auth and the Paymob webhook are the
 * only public endpoints; everything else requires a Supabase Bearer token, and
 * biomarker data additionally requires an active subscription.
 */
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

import { env } from './lib/env.js';
import { ApiException, errorResponse } from './lib/http.js';
import { authRoutes } from './routes/auth.js';
import { biomarkerRoutes } from './routes/biomarkers.js';
import { paymentRoutes } from './routes/payments.js';
import { resultRoutes } from './routes/results.js';
import { subscriptionRoutes } from './routes/subscriptions.js';
import { userRoutes } from './routes/users.js';

const app = new Hono();

app.use('*', logger());
app.use('*', cors());

app.get('/health', (c) => c.json({ status: 'ok', service: 'vital-api' }));

const v1 = new Hono();
v1.route('/auth', authRoutes);
v1.route('/users', userRoutes);
v1.route('/results', resultRoutes);
v1.route('/payments', paymentRoutes);
// Subscription + biomarker routes register their own full paths.
v1.route('/', subscriptionRoutes);
v1.route('/', biomarkerRoutes);

app.route('/api/v1', v1);

// Centralised error handling → standard { error: { code, message } } envelope.
app.onError((err, c) => {
  if (err instanceof ApiException) {
    return errorResponse(c, err.code, err.message, err.details);
  }
  console.error('Unhandled error:', err);
  return errorResponse(c, 'server_error', 'An unexpected error occurred');
});

app.notFound((c) => errorResponse(c, 'not_found', 'Route not found'));

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`VITAL API listening on http://localhost:${info.port}`);
});

export { app };
