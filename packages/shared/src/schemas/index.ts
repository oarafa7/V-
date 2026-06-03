/**
 * VITAL — Shared Zod validation schemas (Phase 1)
 *
 * Used by the API to validate request bodies and by the mobile app to validate
 * forms with React Hook Form. Keeping them here guarantees the client and
 * server agree on what a valid payload looks like.
 */
import { z } from 'zod';

import { CHRONIC_CONDITIONS, HEALTH_GOALS } from '../types/index.js';

// ─────────────────────────────────────────────────────────────────────────────
// Reusable field schemas
// ─────────────────────────────────────────────────────────────────────────────

/** Egyptian phone number: +20 followed by 10 digits, e.g. +201012345678. */
export const egyptianPhoneSchema = z
  .string()
  .regex(/^\+20\d{10}$/, 'Enter a valid Egyptian number, e.g. +201012345678');

export const emailSchema = z.string().email('Enter a valid email address');

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[a-z]/, 'Include at least one lowercase letter')
  .regex(/[A-Z]/, 'Include at least one uppercase letter')
  .regex(/[0-9]/, 'Include at least one number');

export const genderSchema = z.enum(['male', 'female', 'other', 'prefer_not_to_say']);

export const healthGoalSchema = z.enum(HEALTH_GOALS);

export const chronicConditionSchema = z.enum(CHRONIC_CONDITIONS);

/** ISO calendar date (no time component). */
export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD format');

// ─────────────────────────────────────────────────────────────────────────────
// Auth
// ─────────────────────────────────────────────────────────────────────────────

export const signupSchema = z.object({
  full_name: z.string().min(2, 'Enter your full name').max(120),
  email: emailSchema,
  password: passwordSchema,
  phone: egyptianPhoneSchema,
  accepted_terms: z.literal(true, {
    errorMap: () => ({ message: 'You must accept the terms of service' }),
  }),
});
export type SignupInput = z.infer<typeof signupSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Enter your password'),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const resetPasswordSchema = z.object({
  email: emailSchema,
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Users / health profile / goals
// ─────────────────────────────────────────────────────────────────────────────

export const updateUserSchema = z.object({
  full_name: z.string().min(2).max(120).optional(),
  phone: egyptianPhoneSchema.optional(),
});
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const healthProfileSchema = z.object({
  date_of_birth: isoDateSchema,
  gender: genderSchema,
  height_cm: z.number().min(50).max(260).optional(),
  weight_kg: z.number().min(20).max(400).optional(),
  chronic_conditions: z.array(chronicConditionSchema).optional().default([]),
  family_history: z.array(chronicConditionSchema).optional().default([]),
});
export type HealthProfileInput = z.infer<typeof healthProfileSchema>;

export const goalsSchema = z.object({
  health_goals: z
    .array(healthGoalSchema)
    .min(1, 'Pick at least one goal')
    .max(3, 'Pick up to 3 goals'),
});
export type GoalsInput = z.infer<typeof goalsSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Payments / subscriptions
// ─────────────────────────────────────────────────────────────────────────────

export const initiatePaymentSchema = z.object({
  plan_id: z.string().uuid('Invalid plan'),
});
export type InitiatePaymentInput = z.infer<typeof initiatePaymentSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Biomarker queries & results
// ─────────────────────────────────────────────────────────────────────────────

export const biomarkerQuerySchema = z.object({
  category: z.string().optional(),
  search: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});
export type BiomarkerQuery = z.infer<typeof biomarkerQuerySchema>;

export const createResultSchema = z.object({
  biomarker_id: z.string().uuid('Invalid biomarker'),
  value: z.number().finite('Enter a numeric value'),
  tested_at: isoDateSchema,
  lab_name: z.string().max(120).optional(),
  notes: z.string().max(1000).optional(),
});
export type CreateResultInput = z.infer<typeof createResultSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Builds a result schema bound to a biomarker's physiologically plausible
 * window so the client can reject obviously-wrong manual entries before
 * hitting the API.
 */
export function plausibleResultSchema(min: number, max: number) {
  return createResultSchema.extend({
    value: z
      .number()
      .finite()
      .min(min, `Value seems too low (min ${min})`)
      .max(max, `Value seems too high (max ${max})`),
  });
}
