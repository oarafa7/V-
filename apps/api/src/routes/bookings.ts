/**
 * Test booking — customer routes (Phase 2). Gated behind an active subscription.
 *   GET  /areas                       → active service areas
 *   GET  /areas/:id/availability      → resolved slots for the next N days
 *   GET  /bookings/me                 → the user's bookings
 *   POST /bookings                    → book a slot (atomic capacity)
 *   POST /bookings/:id/cancel         → cancel a booking
 */
import { createBookingSchema } from '@vital/shared';
import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import { Hono } from 'hono';

import { db } from '../db/client.js';
import { bookings, serviceAreas } from '../db/schema.js';
import { cancelBooking, createBooking, resolveRange } from '../lib/booking.js';
import { errorResponse } from '../lib/http.js';
import { notifyUser } from '../lib/notifications.js';
import { serializeArea, serializeBooking } from '../lib/serialize.js';
import { type AuthVariables, requireAuth } from '../middleware/auth.js';
import { requireActiveSubscription } from '../middleware/subscription.js';
import { validate } from '../middleware/validate.js';

export const bookingRoutes = new Hono<{ Variables: AuthVariables }>();

bookingRoutes.use('*', requireAuth, requireActiveSubscription);

bookingRoutes.get('/areas', async (c) => {
  const rows = await db
    .select()
    .from(serviceAreas)
    .where(eq(serviceAreas.isActive, true))
    .orderBy(asc(serviceAreas.displayOrder));
  return c.json({ areas: rows.map(serializeArea) });
});

bookingRoutes.get('/areas/:id/availability', async (c) => {
  const areaId = c.req.param('id');
  const from = c.req.query('from') ?? new Date().toISOString().slice(0, 10);
  const days = Math.min(Math.max(Number(c.req.query('days') ?? 14), 1), 60);
  const availability = await resolveRange(areaId, from, days);
  return c.json({ availability });
});

bookingRoutes.get('/bookings/me', async (c) => {
  const userId = c.get('userId');
  const rows = await db
    .select()
    .from(bookings)
    .where(eq(bookings.userId, userId))
    .orderBy(desc(bookings.date));
  const areaIds = [...new Set(rows.map((r) => r.areaId))];
  const areas = areaIds.length
    ? await db.select().from(serviceAreas).where(inArray(serviceAreas.id, areaIds))
    : [];
  const nameById = new Map(areas.map((a) => [a.id, a.name]));
  return c.json({
    bookings: rows.map((r) => serializeBooking(r, nameById.get(r.areaId) ?? '')),
  });
});

bookingRoutes.post('/bookings', validate('json', createBookingSchema), async (c) => {
  const userId = c.get('userId');
  const { booking, areaName } = await createBooking(userId, c.req.valid('json'));

  await notifyUser(userId, {
    type: 'booking',
    severity: 'info',
    title: 'Test booked ✓',
    body: `Your home test in ${areaName} is confirmed for ${booking.date}, ${booking.startTime}–${booking.endTime}.`,
    link: '/booking',
    dedupeKey: `booking-confirmed:${booking.id}`,
  });

  return c.json({ booking: serializeBooking(booking, areaName) }, 201);
});

bookingRoutes.post('/bookings/:id/cancel', async (c) => {
  const userId = c.get('userId');
  const booking = await cancelBooking(userId, c.req.param('id'));
  if (!booking) return errorResponse(c, 'not_found', 'Booking not found or not cancellable');

  await notifyUser(userId, {
    type: 'booking',
    severity: 'info',
    title: 'Booking cancelled',
    body: `Your test booking on ${booking.date} at ${booking.startTime} was cancelled.`,
    link: '/booking',
    dedupeKey: `booking-cancelled:${booking.id}`,
  });

  return c.json({ success: true });
});
