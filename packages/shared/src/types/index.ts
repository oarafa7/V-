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

export type UserRole = 'user' | 'admin';

export type ResultSource = 'manual' | 'admin' | 'lab_upload';

export type LabUploadStatus = 'parsed' | 'confirmed' | 'failed';

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

/** Default goal slugs used to seed the (now admin-managed) health_goals table. */
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

/**
 * A user's stored health goal is a slug. Goals are managed in the dashboard, so
 * this is a plain string rather than a fixed union.
 */
export type HealthGoal = string;

/** An admin-managed onboarding goal option. */
export interface HealthGoalOption {
  id: UUID;
  slug: string;
  label: string;
  icon: string;
  display_order: number;
  is_active: boolean;
}

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
  role: UserRole;
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
  source: ResultSource;
  lab_upload_id: UUID | null;
  created_at: ISODateTimeString;
}

// ─────────────────────────────────────────────────────────────────────────────
// Admin
// ─────────────────────────────────────────────────────────────────────────────

/** One row of values extracted from a lab PDF, pending admin confirmation. */
export interface ParsedLabRow {
  biomarker_id: UUID | null;
  biomarker_name: string; // as written in the PDF
  matched_name: string | null; // the VITAL biomarker it matched, if any
  value: number | null;
  unit: string | null;
  confidence: number; // 0..1
  include: boolean;
}

export interface LabUpload {
  id: UUID;
  user_id: UUID;
  file_path: string;
  original_name: string;
  lab_name: string | null;
  tested_at: ISODateString | null;
  status: LabUploadStatus;
  parsed: ParsedLabRow[];
  result_count: number;
  uploaded_by: UUID | null;
  created_at: ISODateTimeString;
  /** Signed URL to view the original PDF (populated on demand). */
  file_url?: string;
}

/** Compact row for the admin user list. */
export interface AdminUserSummary {
  id: UUID;
  email: string;
  full_name: string;
  role: UserRole;
  phone: string | null;
  subscription_status: SubscriptionStatus | null;
  plan_name: PlanName | null;
  result_count: number;
  created_at: ISODateTimeString;
}

/** Full admin view of a single user. */
export interface AdminUserDetail {
  user: User;
  subscription: SubscriptionWithPlan | null;
  results: UserBiomarkerResult[];
  lab_uploads: LabUpload[];
}

export interface AdminOverview {
  users_total: number;
  admins_total: number;
  active_subscriptions: number;
  revenue_egp: number;
  results_total: number;
  lab_uploads_total: number;
  pending_uploads: number;
  plan_breakdown: { plan: PlanName; count: number }[];
}

// ─────────────────────────────────────────────────────────────────────────────
// App content / settings (admin-managed, surfaced in the mobile app)
// ─────────────────────────────────────────────────────────────────────────────

export interface LabPartnerInfo {
  name: string;
  description: string;
  phone: string;
  url: string;
}

/** The structured, mobile-facing content bundle. Keys map to app_settings rows. */
export interface AppContent {
  welcome_tagline: string;
  support_email: string;
  lab_partner: LabPartnerInfo;
}

export const DEFAULT_APP_CONTENT: AppContent = {
  welcome_tagline: 'Know your body.\nBefore it fails you.',
  support_email: 'support@vital.app',
  lab_partner: {
    name: 'VITAL Lab Partners',
    description: 'Book your comprehensive panel at a partner lab near you.',
    phone: '',
    url: '',
  },
};

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
