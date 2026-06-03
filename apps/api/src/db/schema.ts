/**
 * VITAL — Drizzle ORM schema (Phase 1)
 *
 * PostgreSQL (Supabase). All Phase 1 tables: users, subscription_plans,
 * subscriptions, biomarker_categories, biomarkers, user_biomarker_results.
 */
import { relations } from 'drizzle-orm';
import {
  boolean,
  date,
  decimal,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

// ─────────────────────────────────────────────────────────────────────────────
// users
// ─────────────────────────────────────────────────────────────────────────────

export const users = pgTable('users', {
  // Mirrors the Supabase auth.users id (UUID) so the two stay in lockstep.
  id: uuid('id').primaryKey(),
  email: text('email').notNull().unique(),
  fullName: text('full_name').notNull(),
  phone: text('phone'),
  dateOfBirth: date('date_of_birth'),
  gender: text('gender'),
  heightCm: integer('height_cm'),
  weightKg: integer('weight_kg'),
  chronicConditions: text('chronic_conditions').array().notNull().default([]),
  familyHistory: text('family_history').array().notNull().default([]),
  healthGoals: text('health_goals').array().notNull().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─────────────────────────────────────────────────────────────────────────────
// subscription_plans
// ─────────────────────────────────────────────────────────────────────────────

export const subscriptionPlans = pgTable('subscription_plans', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(), // 'basic' | 'premium'
  priceEgp: integer('price_egp').notNull(),
  priceDisplay: text('price_display').notNull(),
  annualTestsCount: integer('annual_tests_count').notNull(),
  biomarkerCount: integer('biomarker_count').notNull(),
  features: jsonb('features').$type<string[]>().notNull().default([]),
  isActive: boolean('is_active').notNull().default(true),
});

// ─────────────────────────────────────────────────────────────────────────────
// subscriptions
// ─────────────────────────────────────────────────────────────────────────────

export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  planId: uuid('plan_id')
    .notNull()
    .references(() => subscriptionPlans.id),
  status: text('status').notNull().default('active'), // active | expired | cancelled
  startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  paymentReference: text('payment_reference'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─────────────────────────────────────────────────────────────────────────────
// biomarker_categories
// ─────────────────────────────────────────────────────────────────────────────

export const biomarkerCategories = pgTable('biomarker_categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description').notNull().default(''),
  icon: text('icon').notNull().default(''),
  color: text('color').notNull().default('#C9A84C'),
  displayOrder: integer('display_order').notNull().default(0),
});

// ─────────────────────────────────────────────────────────────────────────────
// biomarkers
// ─────────────────────────────────────────────────────────────────────────────

export const biomarkers = pgTable(
  'biomarkers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => biomarkerCategories.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    unit: text('unit').notNull(),
    description: text('description').notNull().default(''),
    whyItMatters: text('why_it_matters').notNull().default(''),
    whatAffectsIt: text('what_affects_it').notNull().default(''),
    optimalLow: decimal('optimal_low', { precision: 12, scale: 4 }).notNull(),
    optimalHigh: decimal('optimal_high', { precision: 12, scale: 4 }).notNull(),
    normalLow: decimal('normal_low', { precision: 12, scale: 4 }).notNull(),
    normalHigh: decimal('normal_high', { precision: 12, scale: 4 }).notNull(),
    minPlausible: decimal('min_plausible', { precision: 12, scale: 4 }).notNull(),
    maxPlausible: decimal('max_plausible', { precision: 12, scale: 4 }).notNull(),
    isActive: boolean('is_active').notNull().default(true),
    displayOrder: integer('display_order').notNull().default(0),
    tags: text('tags').array().notNull().default([]),
  },
  (table) => ({
    slugIdx: uniqueIndex('biomarkers_slug_idx').on(table.slug),
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// user_biomarker_results
// ─────────────────────────────────────────────────────────────────────────────

export const userBiomarkerResults = pgTable('user_biomarker_results', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  biomarkerId: uuid('biomarker_id')
    .notNull()
    .references(() => biomarkers.id, { onDelete: 'cascade' }),
  value: decimal('value', { precision: 12, scale: 4 }).notNull(),
  testedAt: date('tested_at').notNull(),
  labName: text('lab_name'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─────────────────────────────────────────────────────────────────────────────
// Relations
// ─────────────────────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  subscriptions: many(subscriptions),
  results: many(userBiomarkerResults),
}));

export const subscriptionPlansRelations = relations(subscriptionPlans, ({ many }) => ({
  subscriptions: many(subscriptions),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  user: one(users, { fields: [subscriptions.userId], references: [users.id] }),
  plan: one(subscriptionPlans, {
    fields: [subscriptions.planId],
    references: [subscriptionPlans.id],
  }),
}));

export const biomarkerCategoriesRelations = relations(biomarkerCategories, ({ many }) => ({
  biomarkers: many(biomarkers),
}));

export const biomarkersRelations = relations(biomarkers, ({ one, many }) => ({
  category: one(biomarkerCategories, {
    fields: [biomarkers.categoryId],
    references: [biomarkerCategories.id],
  }),
  results: many(userBiomarkerResults),
}));

export const userBiomarkerResultsRelations = relations(userBiomarkerResults, ({ one }) => ({
  user: one(users, { fields: [userBiomarkerResults.userId], references: [users.id] }),
  biomarker: one(biomarkers, {
    fields: [userBiomarkerResults.biomarkerId],
    references: [biomarkers.id],
  }),
}));

// Convenience inferred types
export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;
export type SubscriptionPlanRow = typeof subscriptionPlans.$inferSelect;
export type SubscriptionRow = typeof subscriptions.$inferSelect;
export type BiomarkerCategoryRow = typeof biomarkerCategories.$inferSelect;
export type BiomarkerRow = typeof biomarkers.$inferSelect;
export type UserBiomarkerResultRow = typeof userBiomarkerResults.$inferSelect;
