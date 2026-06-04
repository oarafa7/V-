/**
 * Admin dashboard API. All routes require an authenticated user whose role is
 * 'admin'. Mounted at /api/v1/admin.
 *
 * Modules: overview analytics · users + lab results · plans & pricing ·
 * biomarkers & categories.
 */
import {
  type AdminOverview,
  type AdminUserDetail,
  type AdminUserSummary,
  adminCreateResultSchema,
  adminUpdateUserSchema,
  biomarkerInputSchema,
  categoryInputSchema,
  categoryUpdateSchema,
  confirmLabUploadSchema,
  planInputSchema,
  planUpdateSchema,
} from '@vital/shared';
import { and, asc, desc, eq, gt, ilike, inArray, or, sql } from 'drizzle-orm';
import { Hono } from 'hono';

import { db } from '../db/client.js';
import {
  biomarkerCategories,
  biomarkers,
  labUploads,
  subscriptionPlans,
  subscriptions,
  userBiomarkerResults,
  users,
} from '../db/schema.js';
import { errorResponse } from '../lib/http.js';
import { parseLabPdf } from '../lib/lab-pdf.js';
import {
  serializeBiomarker,
  serializeCategory,
  serializeLabUpload,
  serializePlan,
  serializeResult,
  serializeSubscription,
  serializeUser,
} from '../lib/serialize.js';
import { signLabFile, uploadLabFile } from '../lib/storage.js';
import { type AuthVariables, requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/admin.js';
import { validate } from '../middleware/validate.js';

export const adminRoutes = new Hono<{ Variables: AuthVariables }>();

adminRoutes.use('*', requireAuth, requireAdmin);

// ─────────────────────────────────────────────────────────────────────────────
// Overview analytics
// ─────────────────────────────────────────────────────────────────────────────

adminRoutes.get('/overview', async (c) => {
  const [usersTotal] = await db.select({ n: sql<number>`count(*)::int` }).from(users);
  const [adminsTotal] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(users)
    .where(eq(users.role, 'admin'));
  const [resultsTotal] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(userBiomarkerResults);
  const [uploadsTotal] = await db.select({ n: sql<number>`count(*)::int` }).from(labUploads);
  const [pendingUploads] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(labUploads)
    .where(eq(labUploads.status, 'parsed'));

  // Active subscriptions + revenue from their plans.
  const activeRows = await db
    .select({ priceEgp: subscriptionPlans.priceEgp, planName: subscriptionPlans.name })
    .from(subscriptions)
    .innerJoin(subscriptionPlans, eq(subscriptions.planId, subscriptionPlans.id))
    .where(and(eq(subscriptions.status, 'active'), gt(subscriptions.expiresAt, new Date())));

  const revenue = activeRows.reduce((sum, r) => sum + r.priceEgp, 0);
  const planCounts = activeRows.reduce<Record<string, number>>((acc, r) => {
    acc[r.planName] = (acc[r.planName] ?? 0) + 1;
    return acc;
  }, {});

  const overview: AdminOverview = {
    users_total: usersTotal?.n ?? 0,
    admins_total: adminsTotal?.n ?? 0,
    active_subscriptions: activeRows.length,
    revenue_egp: revenue,
    results_total: resultsTotal?.n ?? 0,
    lab_uploads_total: uploadsTotal?.n ?? 0,
    pending_uploads: pendingUploads?.n ?? 0,
    plan_breakdown: Object.entries(planCounts).map(([plan, count]) => ({
      plan: plan as AdminOverview['plan_breakdown'][number]['plan'],
      count,
    })),
  };

  return c.json({ overview });
});

// ─────────────────────────────────────────────────────────────────────────────
// Users
// ─────────────────────────────────────────────────────────────────────────────

adminRoutes.get('/users', async (c) => {
  const search = c.req.query('search')?.trim();
  const limit = Math.min(Number(c.req.query('limit') ?? 50), 200);
  const offset = Math.max(Number(c.req.query('offset') ?? 0), 0);

  const where = search
    ? or(ilike(users.email, `%${search}%`), ilike(users.fullName, `%${search}%`))
    : undefined;

  const [{ total } = { total: 0 }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(users)
    .where(where);

  const rows = await db
    .select()
    .from(users)
    .where(where)
    .orderBy(desc(users.createdAt))
    .limit(limit)
    .offset(offset);

  const ids = rows.map((r) => r.id);

  // Active subscription (+plan) and result counts for this page of users.
  const subs = ids.length
    ? await db
        .select({
          userId: subscriptions.userId,
          status: subscriptions.status,
          planName: subscriptionPlans.name,
        })
        .from(subscriptions)
        .innerJoin(subscriptionPlans, eq(subscriptions.planId, subscriptionPlans.id))
        .where(
          and(
            inArray(subscriptions.userId, ids),
            eq(subscriptions.status, 'active'),
            gt(subscriptions.expiresAt, new Date()),
          ),
        )
    : [];
  const subByUser = new Map(subs.map((s) => [s.userId, s]));

  const counts = ids.length
    ? await db
        .select({
          userId: userBiomarkerResults.userId,
          n: sql<number>`count(*)::int`,
        })
        .from(userBiomarkerResults)
        .where(inArray(userBiomarkerResults.userId, ids))
        .groupBy(userBiomarkerResults.userId)
    : [];
  const countByUser = new Map(counts.map((r) => [r.userId, r.n]));

  const list: AdminUserSummary[] = rows.map((u) => {
    const sub = subByUser.get(u.id);
    return {
      id: u.id,
      email: u.email,
      full_name: u.fullName,
      role: (u.role as AdminUserSummary['role']) ?? 'user',
      phone: u.phone,
      subscription_status: (sub?.status as AdminUserSummary['subscription_status']) ?? null,
      plan_name: (sub?.planName as AdminUserSummary['plan_name']) ?? null,
      result_count: countByUser.get(u.id) ?? 0,
      created_at: u.createdAt.toISOString(),
    };
  });

  return c.json({ users: list, total });
});

adminRoutes.get('/users/:id', async (c) => {
  const id = c.req.param('id');
  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!user) return errorResponse(c, 'not_found', 'User not found');

  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, id))
    .orderBy(desc(subscriptions.startedAt))
    .limit(1);

  let subscriptionPayload: AdminUserDetail['subscription'] = null;
  if (sub) {
    const [plan] = await db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.id, sub.planId))
      .limit(1);
    if (plan) {
      subscriptionPayload = { ...serializeSubscription(sub), plan: serializePlan(plan) };
    }
  }

  const results = await db
    .select()
    .from(userBiomarkerResults)
    .where(eq(userBiomarkerResults.userId, id))
    .orderBy(desc(userBiomarkerResults.testedAt));

  const uploads = await db
    .select()
    .from(labUploads)
    .where(eq(labUploads.userId, id))
    .orderBy(desc(labUploads.createdAt));

  const detail: AdminUserDetail = {
    user: serializeUser(user),
    subscription: subscriptionPayload,
    results: results.map(serializeResult),
    lab_uploads: uploads.map(serializeLabUpload),
  };

  return c.json(detail);
});

adminRoutes.put('/users/:id', validate('json', adminUpdateUserSchema), async (c) => {
  const id = c.req.param('id');
  const body = c.req.valid('json');
  const [row] = await db
    .update(users)
    .set({
      ...(body.full_name !== undefined ? { fullName: body.full_name } : {}),
      ...(body.phone !== undefined ? { phone: body.phone } : {}),
      ...(body.role !== undefined ? { role: body.role } : {}),
      updatedAt: new Date(),
    })
    .where(eq(users.id, id))
    .returning();
  if (!row) return errorResponse(c, 'not_found', 'User not found');
  return c.json({ user: serializeUser(row) });
});

adminRoutes.post('/users/:id/results', validate('json', adminCreateResultSchema), async (c) => {
  const userId = c.req.param('id');
  const body = c.req.valid('json');

  const [bm] = await db
    .select()
    .from(biomarkers)
    .where(eq(biomarkers.id, body.biomarker_id))
    .limit(1);
  if (!bm) return errorResponse(c, 'not_found', 'Biomarker not found');

  const [row] = await db
    .insert(userBiomarkerResults)
    .values({
      userId,
      biomarkerId: body.biomarker_id,
      value: String(body.value),
      testedAt: body.tested_at,
      labName: body.lab_name ?? null,
      notes: body.notes ?? null,
      source: 'admin',
    })
    .returning();

  return c.json({ result: serializeResult(row!) }, 201);
});

adminRoutes.delete('/results/:id', async (c) => {
  const id = c.req.param('id');
  const [deleted] = await db
    .delete(userBiomarkerResults)
    .where(eq(userBiomarkerResults.id, id))
    .returning();
  if (!deleted) return errorResponse(c, 'not_found', 'Result not found');
  return c.json({ success: true });
});

// ─────────────────────────────────────────────────────────────────────────────
// Lab uploads (PDF → parse → review → confirm)
// ─────────────────────────────────────────────────────────────────────────────

adminRoutes.post('/users/:id/lab-uploads', async (c) => {
  const userId = c.req.param('id');
  const admin = c.get('user');

  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1);
  if (!user) return errorResponse(c, 'not_found', 'User not found');

  const body = await c.req.parseBody();
  const file = body['file'];
  if (!(file instanceof File)) {
    return errorResponse(c, 'validation_error', 'Attach a PDF file under the "file" field');
  }
  if (file.type && !file.type.includes('pdf')) {
    return errorResponse(c, 'unprocessable', 'Only PDF lab reports are supported');
  }

  const labName = typeof body['lab_name'] === 'string' ? (body['lab_name'] as string) : null;
  const testedAt = typeof body['tested_at'] === 'string' ? (body['tested_at'] as string) : null;

  const bytes = await file.arrayBuffer();

  // Store the original PDF.
  const filePath = await uploadLabFile(userId, file.name, bytes, file.type || 'application/pdf');

  // Parse against the active biomarker library to produce draft rows.
  const lib = await db
    .select({
      id: biomarkers.id,
      name: biomarkers.name,
      unit: biomarkers.unit,
      slug: biomarkers.slug,
      minPlausible: biomarkers.minPlausible,
      maxPlausible: biomarkers.maxPlausible,
      tags: biomarkers.tags,
    })
    .from(biomarkers)
    .where(eq(biomarkers.isActive, true));

  const parsed = await parseLabPdf(Buffer.from(bytes), lib.map((b) => ({
    ...b,
    minPlausible: Number(b.minPlausible),
    maxPlausible: Number(b.maxPlausible),
  })));

  const [row] = await db
    .insert(labUploads)
    .values({
      userId,
      filePath,
      originalName: file.name,
      labName,
      testedAt,
      status: parsed.length > 0 ? 'parsed' : 'failed',
      parsed,
      uploadedBy: admin.id,
    })
    .returning();

  const payload = serializeLabUpload(row!);
  payload.file_url = (await signLabFile(filePath)) ?? undefined;
  return c.json({ upload: payload }, 201);
});

adminRoutes.get('/lab-uploads/:id', async (c) => {
  const id = c.req.param('id');
  const [row] = await db.select().from(labUploads).where(eq(labUploads.id, id)).limit(1);
  if (!row) return errorResponse(c, 'not_found', 'Upload not found');
  const payload = serializeLabUpload(row);
  payload.file_url = (await signLabFile(row.filePath)) ?? undefined;
  return c.json({ upload: payload });
});

adminRoutes.post(
  '/lab-uploads/:id/confirm',
  validate('json', confirmLabUploadSchema),
  async (c) => {
    const id = c.req.param('id');
    const { tested_at, lab_name, rows } = c.req.valid('json');

    const [upload] = await db.select().from(labUploads).where(eq(labUploads.id, id)).limit(1);
    if (!upload) return errorResponse(c, 'not_found', 'Upload not found');

    const included = rows.filter((r) => r.include);
    if (included.length === 0) {
      return errorResponse(c, 'unprocessable', 'No rows selected to import');
    }

    const inserted = await db
      .insert(userBiomarkerResults)
      .values(
        included.map((r) => ({
          userId: upload.userId,
          biomarkerId: r.biomarker_id,
          value: String(r.value),
          testedAt: tested_at,
          labName: lab_name ?? upload.labName ?? null,
          source: 'lab_upload' as const,
          labUploadId: upload.id,
        })),
      )
      .returning({ id: userBiomarkerResults.id });

    await db
      .update(labUploads)
      .set({ status: 'confirmed', resultCount: inserted.length, testedAt: tested_at })
      .where(eq(labUploads.id, id));

    return c.json({ success: true, imported: inserted.length });
  },
);

adminRoutes.delete('/lab-uploads/:id', async (c) => {
  const id = c.req.param('id');
  const [deleted] = await db.delete(labUploads).where(eq(labUploads.id, id)).returning();
  if (!deleted) return errorResponse(c, 'not_found', 'Upload not found');
  return c.json({ success: true });
});

// ─────────────────────────────────────────────────────────────────────────────
// Plans & pricing
// ─────────────────────────────────────────────────────────────────────────────

adminRoutes.get('/plans', async (c) => {
  const rows = await db.select().from(subscriptionPlans).orderBy(asc(subscriptionPlans.priceEgp));
  return c.json({ plans: rows.map(serializePlan) });
});

adminRoutes.post('/plans', validate('json', planInputSchema), async (c) => {
  const body = c.req.valid('json');
  const [row] = await db
    .insert(subscriptionPlans)
    .values({
      name: body.name,
      priceEgp: body.price_egp,
      priceDisplay: body.price_display,
      annualTestsCount: body.annual_tests_count,
      biomarkerCount: body.biomarker_count,
      features: body.features,
      isActive: body.is_active ?? true,
    })
    .returning();
  return c.json({ plan: serializePlan(row!) }, 201);
});

adminRoutes.put('/plans/:id', validate('json', planUpdateSchema), async (c) => {
  const id = c.req.param('id');
  const b = c.req.valid('json');
  const [row] = await db
    .update(subscriptionPlans)
    .set({
      ...(b.name !== undefined ? { name: b.name } : {}),
      ...(b.price_egp !== undefined ? { priceEgp: b.price_egp } : {}),
      ...(b.price_display !== undefined ? { priceDisplay: b.price_display } : {}),
      ...(b.annual_tests_count !== undefined ? { annualTestsCount: b.annual_tests_count } : {}),
      ...(b.biomarker_count !== undefined ? { biomarkerCount: b.biomarker_count } : {}),
      ...(b.features !== undefined ? { features: b.features } : {}),
      ...(b.is_active !== undefined ? { isActive: b.is_active } : {}),
    })
    .where(eq(subscriptionPlans.id, id))
    .returning();
  if (!row) return errorResponse(c, 'not_found', 'Plan not found');
  return c.json({ plan: serializePlan(row) });
});

adminRoutes.delete('/plans/:id', async (c) => {
  // Soft-deactivate to preserve historical subscriptions referencing the plan.
  const id = c.req.param('id');
  const [row] = await db
    .update(subscriptionPlans)
    .set({ isActive: false })
    .where(eq(subscriptionPlans.id, id))
    .returning();
  if (!row) return errorResponse(c, 'not_found', 'Plan not found');
  return c.json({ success: true, plan: serializePlan(row) });
});

// ─────────────────────────────────────────────────────────────────────────────
// Categories
// ─────────────────────────────────────────────────────────────────────────────

adminRoutes.get('/categories', async (c) => {
  const rows = await db
    .select()
    .from(biomarkerCategories)
    .orderBy(asc(biomarkerCategories.displayOrder));
  return c.json({ categories: rows.map(serializeCategory) });
});

adminRoutes.post('/categories', validate('json', categoryInputSchema), async (c) => {
  const b = c.req.valid('json');
  const [row] = await db
    .insert(biomarkerCategories)
    .values({
      name: b.name,
      slug: b.slug,
      description: b.description ?? '',
      icon: b.icon ?? '',
      color: b.color,
      displayOrder: b.display_order ?? 0,
    })
    .returning();
  return c.json({ category: serializeCategory(row!) }, 201);
});

adminRoutes.put('/categories/:id', validate('json', categoryUpdateSchema), async (c) => {
  const id = c.req.param('id');
  const b = c.req.valid('json');
  const [row] = await db
    .update(biomarkerCategories)
    .set({
      ...(b.name !== undefined ? { name: b.name } : {}),
      ...(b.slug !== undefined ? { slug: b.slug } : {}),
      ...(b.description !== undefined ? { description: b.description } : {}),
      ...(b.icon !== undefined ? { icon: b.icon } : {}),
      ...(b.color !== undefined ? { color: b.color } : {}),
      ...(b.display_order !== undefined ? { displayOrder: b.display_order } : {}),
    })
    .where(eq(biomarkerCategories.id, id))
    .returning();
  if (!row) return errorResponse(c, 'not_found', 'Category not found');
  return c.json({ category: serializeCategory(row) });
});

adminRoutes.delete('/categories/:id', async (c) => {
  const id = c.req.param('id');
  const [child] = await db
    .select({ id: biomarkers.id })
    .from(biomarkers)
    .where(eq(biomarkers.categoryId, id))
    .limit(1);
  if (child) {
    return errorResponse(c, 'conflict', 'Reassign or remove this category’s biomarkers first');
  }
  const [deleted] = await db
    .delete(biomarkerCategories)
    .where(eq(biomarkerCategories.id, id))
    .returning();
  if (!deleted) return errorResponse(c, 'not_found', 'Category not found');
  return c.json({ success: true });
});

// ─────────────────────────────────────────────────────────────────────────────
// Biomarkers
// ─────────────────────────────────────────────────────────────────────────────

adminRoutes.get('/biomarkers', async (c) => {
  const search = c.req.query('search')?.trim().toLowerCase();
  const category = c.req.query('category');

  const conditions = [] as ReturnType<typeof eq>[];
  if (category && category !== 'all') {
    const [cat] = await db
      .select({ id: biomarkerCategories.id })
      .from(biomarkerCategories)
      .where(eq(biomarkerCategories.slug, category))
      .limit(1);
    if (cat) conditions.push(eq(biomarkers.categoryId, cat.id));
  }

  const rows = await db
    .select()
    .from(biomarkers)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(asc(biomarkers.displayOrder), asc(biomarkers.name));

  const filtered = search
    ? rows.filter(
        (b) =>
          b.name.toLowerCase().includes(search) ||
          (b.tags ?? []).some((t) => t.toLowerCase().includes(search)),
      )
    : rows;

  return c.json({ biomarkers: filtered.map(serializeBiomarker), total: filtered.length });
});

function biomarkerValues(b: ReturnType<typeof biomarkerInputSchema.parse>) {
  return {
    categoryId: b.category_id,
    name: b.name,
    slug: b.slug,
    unit: b.unit,
    description: b.description ?? '',
    whyItMatters: b.why_it_matters ?? '',
    whatAffectsIt: b.what_affects_it ?? '',
    optimalLow: String(b.optimal_low),
    optimalHigh: String(b.optimal_high),
    normalLow: String(b.normal_low),
    normalHigh: String(b.normal_high),
    minPlausible: String(b.min_plausible),
    maxPlausible: String(b.max_plausible),
    isActive: b.is_active ?? true,
    displayOrder: b.display_order ?? 0,
    tags: b.tags ?? [],
  };
}

adminRoutes.post('/biomarkers', validate('json', biomarkerInputSchema), async (c) => {
  const b = c.req.valid('json');
  const [row] = await db.insert(biomarkers).values(biomarkerValues(b)).returning();
  return c.json({ biomarker: serializeBiomarker(row!) }, 201);
});

adminRoutes.put('/biomarkers/:id', validate('json', biomarkerInputSchema), async (c) => {
  const id = c.req.param('id');
  const b = c.req.valid('json');
  const [row] = await db
    .update(biomarkers)
    .set(biomarkerValues(b))
    .where(eq(biomarkers.id, id))
    .returning();
  if (!row) return errorResponse(c, 'not_found', 'Biomarker not found');
  return c.json({ biomarker: serializeBiomarker(row) });
});

adminRoutes.delete('/biomarkers/:id', async (c) => {
  // Soft-deactivate so historical results keep their reference.
  const id = c.req.param('id');
  const [row] = await db
    .update(biomarkers)
    .set({ isActive: false })
    .where(eq(biomarkers.id, id))
    .returning();
  if (!row) return errorResponse(c, 'not_found', 'Biomarker not found');
  return c.json({ success: true });
});
