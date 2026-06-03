/**
 * Paymob payment routes.
 *
 *   POST /payments/initiate  (auth)   → creates a Paymob order, returns the
 *                                        payment key + iframe URL for the WebView
 *   POST /payments/webhook   (public) → Paymob transaction callback, HMAC-verified,
 *                                        activates the subscription on success
 */
import { initiatePaymentSchema } from '@vital/shared';
import { eq } from 'drizzle-orm';
import { Hono } from 'hono';

import { db } from '../db/client.js';
import { subscriptionPlans, subscriptions } from '../db/schema.js';
import { errorResponse } from '../lib/http.js';
import { initiatePayment, verifyWebhookHmac } from '../lib/paymob.js';
import { type AuthVariables, requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

export const paymentRoutes = new Hono<{ Variables: AuthVariables }>();

const VAT_RATE = 0.14; // Egyptian VAT

paymentRoutes.post(
  '/initiate',
  requireAuth,
  validate('json', initiatePaymentSchema),
  async (c) => {
    const user = c.get('user');
    const { plan_id } = c.req.valid('json');

    const [plan] = await db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.id, plan_id))
      .limit(1);

    if (!plan || !plan.isActive) {
      return errorResponse(c, 'not_found', 'Subscription plan not found');
    }

    // Total charged = plan price + 14% VAT.
    const totalEgp = Math.round(plan.priceEgp * (1 + VAT_RATE));

    // Create a pending subscription row up front; we reconcile it on webhook.
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    const [pending] = await db
      .insert(subscriptions)
      .values({
        userId: user.id,
        planId: plan.id,
        status: 'expired', // becomes 'active' only after a verified success webhook
        expiresAt,
      })
      .returning();

    if (!pending) return errorResponse(c, 'server_error', 'Could not create order');

    const [firstName, ...rest] = user.fullName.split(' ');
    const result = await initiatePayment({
      amountEgp: totalEgp,
      merchantOrderId: pending.id,
      billing: {
        email: user.email,
        first_name: firstName || user.fullName,
        last_name: rest.join(' ') || 'NA',
        phone_number: user.phone ?? 'NA',
      },
    });

    // Stash the Paymob order id so the webhook can reconcile by merchant_order_id.
    await db
      .update(subscriptions)
      .set({ paymentReference: result.order_id })
      .where(eq(subscriptions.id, pending.id));

    return c.json({
      payment_key: result.payment_key,
      iframe_url: result.iframe_url,
      order_id: result.order_id,
      subscription_id: pending.id,
      amount_egp: totalEgp,
    });
  },
);

paymentRoutes.post('/webhook', async (c) => {
  const hmac = c.req.query('hmac');
  if (!hmac) return errorResponse(c, 'forbidden', 'Missing HMAC');

  const body = (await c.req.json().catch(() => null)) as { obj?: Record<string, unknown> } | null;
  const obj = body?.obj;
  if (!obj) return errorResponse(c, 'validation_error', 'Malformed webhook payload');

  if (!verifyWebhookHmac(obj, hmac)) {
    return errorResponse(c, 'forbidden', 'HMAC verification failed');
  }

  const success = obj.success === true;
  const order = obj.order as { merchant_order_id?: string; id?: number } | undefined;
  const subscriptionId = order?.merchant_order_id;

  if (!subscriptionId) {
    // Acknowledge to stop Paymob retries, but nothing to reconcile.
    return c.json({ received: true });
  }

  if (success) {
    await db
      .update(subscriptions)
      .set({
        status: 'active',
        startedAt: new Date(),
        paymentReference: String(obj.id ?? order?.id ?? subscriptionId),
      })
      .where(eq(subscriptions.id, subscriptionId));
  }

  return c.json({ received: true });
});
