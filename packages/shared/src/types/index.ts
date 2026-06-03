/**
 * VITAL — Shared domain types (Phase 1)
 *
 * These mirror the database schema and the API contracts. They are the single
 * source of truth for the shapes that cross the API boundary between the Hono
 * backend and the Expo mobile client.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Primitives & enums
// ─────────────────────────────────────────────────────────────────────────────

export type UUID = string;
export type ISODateString = string; // e.g. "2026-06-03"
export type ISODateTimeString = string; // e.g. "2026-06-03T11:37:00.000Z"

export type Gender = 'male' | 'female' | 'other' | 'prefer_not_to_say';

export type PlanName = 'basic' | 'premium';

export type SubscriptionStatus = 'active' | 'expired' | 'cancelled';

export type BiomarkerStatus = 'optimal' | 'suboptimal' | 'alert' | 'untested';

export type CategorySlug =
  | 'metabolic'
  | 'hormonal'
  | 'cardiovascular'
  | 'nutritional'
  | 'inflammatory'
  | 'thyroid'
  | 'hepatic'
  | 'blood';

export const HEALTH_GOALS = [
  'optimize_energy',
  'metabolic_health',
  'balance_hormones',
  'reduce_inflammation',
  'longevity',
  'athletic_performance',
  'weight_management',
  'general_awareness',
] as const;

export type HealthGoal = (typeof HEALTH_GOALS)[number];

export const CHRONIC_CONDITIONS = [
  'diabetes',
  'hypertension',
  'thyroid',
  'none',
  'prefer_not_to_say',
] as const;

export type ChronicCondition = (typeof CHRONIC_CONDITIONS)[number];

// ─────────────────────────────────────────────────────────────────────────────
// User
// ─────────────────────────────────────────────────────────────────────────────

export interface User {
  id: UUID;
  email: string;
  full_name: string;
  phone: string | null;
  date_of_birth: ISODateString | null;
  gender: Gender | null;
  height_cm: number | null;
  weight_kg: number | null;
  chronic_conditions: ChronicCondition[];
  family_history: ChronicCondition[];
  health_goals: HealthGoal[];
  created_at: ISODateTimeString;
  updated_at: ISODateTimeString;
}

// ─────────────────────────────────────────────────────────────────────────────
// Subscription
// ─────────────────────────────────────────────────────────────────────────────

export interface SubscriptionPlan {
  id: UUID;
  name: PlanName;
  price_egp: number;
  price_display: string;
  annual_tests_count: number;
  biomarker_count: number;
  features: string[];
  is_active: boolean;
}

export interface Subscription {
  id: UUID;
  user_id: UUID;
  plan_id: UUID;
  status: SubscriptionStatus;
  started_at: ISODateTimeString;
  expires_at: ISODateTimeString;
  payment_reference: string | null;
  created_at: ISODateTimeString;
}

export interface SubscriptionWithPlan extends Subscription {
  plan: SubscriptionPlan;
}

// ─────────────────────────────────────────────────────────────────────────────
// Biomarkers
// ─────────────────────────────────────────────────────────────────────────────

export interface BiomarkerCategory {
  id: UUID;
  name: string;
  slug: CategorySlug;
  description: string;
  icon: string;
  color: string;
  display_order: number;
}

export interface Biomarker {
  id: UUID;
  category_id: UUID;
  name: string;
  slug: string;
  unit: string;
  description: string;
  why_it_matters: string;
  what_affects_it: string;
  optimal_low: number;
  optimal_high: number;
  normal_low: number;
  normal_high: number;
  min_plausible: number;
  max_plausible: number;
  is_active: boolean;
  display_order: number;
  tags: string[];
}

export interface BiomarkerWithCategory extends Biomarker {
  category: BiomarkerCategory;
}

/** Biomarker plus the requesting user's latest result + computed status. */
export interface BiomarkerWithResult extends Biomarker {
  category?: BiomarkerCategory;
  latest_result: UserBiomarkerResult | null;
  status: BiomarkerStatus;
}

// ─────────────────────────────────────────────────────────────────────────────
// Results
// ─────────────────────────────────────────────────────────────────────────────

export interface UserBiomarkerResult {
  id: UUID;
  user_id: UUID;
  biomarker_id: UUID;
  value: number;
  tested_at: ISODateString;
  lab_name: string | null;
  notes: string | null;
  created_at: ISODateTimeString;
}

// ─────────────────────────────────────────────────────────────────────────────
// API envelopes
// ─────────────────────────────────────────────────────────────────────────────

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface BiomarkerListResponse {
  biomarkers: BiomarkerWithResult[];
  total: number;
  categories: BiomarkerCategory[];
}

export interface PaymentInitiateResponse {
  payment_key: string;
  iframe_url: string;
  order_id: string;
}

export interface AuthSession {
  access_token: string;
  refresh_token: string;
  user: User;
}
