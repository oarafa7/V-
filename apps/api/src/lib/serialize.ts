/**
 * Row → API-type serializers. Drizzle returns `decimal` columns as strings and
 * `timestamp`/`date` as Date|string; these helpers normalise to the shapes
 * declared in `@vital/shared`.
 */
import type {
  Biomarker,
  BiomarkerCategory,
  Subscription,
  SubscriptionPlan,
  User,
  UserBiomarkerResult,
} from '@vital/shared';

import type {
  BiomarkerCategoryRow,
  BiomarkerRow,
  SubscriptionPlanRow,
  SubscriptionRow,
  UserBiomarkerResultRow,
  UserRow,
} from '../db/schema.js';

function iso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function num(value: string | number): number {
  return typeof value === 'number' ? value : Number(value);
}

export function serializeUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    full_name: row.fullName,
    phone: row.phone,
    date_of_birth: row.dateOfBirth,
    gender: (row.gender as User['gender']) ?? null,
    height_cm: row.heightCm,
    weight_kg: row.weightKg,
    chronic_conditions: (row.chronicConditions as User['chronic_conditions']) ?? [],
    family_history: (row.familyHistory as User['family_history']) ?? [],
    health_goals: (row.healthGoals as User['health_goals']) ?? [],
    created_at: iso(row.createdAt),
    updated_at: iso(row.updatedAt),
  };
}

export function serializePlan(row: SubscriptionPlanRow): SubscriptionPlan {
  return {
    id: row.id,
    name: row.name as SubscriptionPlan['name'],
    price_egp: row.priceEgp,
    price_display: row.priceDisplay,
    annual_tests_count: row.annualTestsCount,
    biomarker_count: row.biomarkerCount,
    features: row.features ?? [],
    is_active: row.isActive,
  };
}

export function serializeSubscription(row: SubscriptionRow): Subscription {
  return {
    id: row.id,
    user_id: row.userId,
    plan_id: row.planId,
    status: row.status as Subscription['status'],
    started_at: iso(row.startedAt),
    expires_at: iso(row.expiresAt),
    payment_reference: row.paymentReference,
    created_at: iso(row.createdAt),
  };
}

export function serializeCategory(row: BiomarkerCategoryRow): BiomarkerCategory {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug as BiomarkerCategory['slug'],
    description: row.description,
    icon: row.icon,
    color: row.color,
    display_order: row.displayOrder,
  };
}

export function serializeBiomarker(row: BiomarkerRow): Biomarker {
  return {
    id: row.id,
    category_id: row.categoryId,
    name: row.name,
    slug: row.slug,
    unit: row.unit,
    description: row.description,
    why_it_matters: row.whyItMatters,
    what_affects_it: row.whatAffectsIt,
    optimal_low: num(row.optimalLow),
    optimal_high: num(row.optimalHigh),
    normal_low: num(row.normalLow),
    normal_high: num(row.normalHigh),
    min_plausible: num(row.minPlausible),
    max_plausible: num(row.maxPlausible),
    is_active: row.isActive,
    display_order: row.displayOrder,
    tags: row.tags ?? [],
  };
}

export function serializeResult(row: UserBiomarkerResultRow): UserBiomarkerResult {
  return {
    id: row.id,
    user_id: row.userId,
    biomarker_id: row.biomarkerId,
    value: num(row.value),
    tested_at: row.testedAt,
    lab_name: row.labName,
    notes: row.notes,
    created_at: iso(row.createdAt),
  };
}
