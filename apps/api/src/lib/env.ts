/**
 * Zod-validated environment configuration.
 *
 * In production the backend fails fast if any external integration (Supabase,
 * Paymob) is missing — we never run a half-configured prod server. In
 * development those are OPTIONAL: with only a local DATABASE_URL the API boots
 * in "local mode" — auth uses locally-signed JWTs, lab files are written to
 * disk, and payment endpoints are disabled — so the stack runs end-to-end
 * without any cloud credentials.
 */
import 'dotenv/config';
import { z } from 'zod';

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(3000),

    DATABASE_URL: z.string().url(),

    // Supabase — required in production, optional locally.
    SUPABASE_URL: z.string().url().optional(),
    SUPABASE_SERVICE_KEY: z.string().min(1).optional(),
    SUPABASE_JWT_SECRET: z.string().min(1).optional(),
    SUPABASE_STORAGE_BUCKET: z.string().min(1).default('lab-results'),

    // Paymob — required in production, optional locally.
    PAYMOB_API_KEY: z.string().min(1).optional(),
    PAYMOB_INTEGRATION_ID: z.string().min(1).optional(),
    PAYMOB_IFRAME_ID: z.string().min(1).optional(),
    PAYMOB_HMAC_SECRET: z.string().min(1).optional(),
    PAYMOB_BASE_URL: z.string().url().default('https://accept.paymob.com/api'),

    // Where Paymob should redirect the WebView after payment.
    PAYMENT_RETURN_URL: z.string().url().default('https://vital.app/payment/return'),

    // AI Health Intelligence (optional — features degrade gracefully if absent).
    ANTHROPIC_API_KEY: z.string().min(1).optional(),

    // HS256 secret for locally-issued dev tokens (local mode only; never used
    // when Supabase is configured).
    LOCAL_JWT_SECRET: z.string().min(8).default('vital-local-dev-only-change-me'),
    // Directory for lab PDFs when Supabase Storage is not configured.
    LOCAL_STORAGE_DIR: z.string().min(1).default('.local-storage'),
  })
  .superRefine((val, ctx) => {
    // Production must be fully configured — keep the original fail-fast there.
    if (val.NODE_ENV !== 'production') return;
    const required = [
      'SUPABASE_URL',
      'SUPABASE_SERVICE_KEY',
      'PAYMOB_API_KEY',
      'PAYMOB_INTEGRATION_ID',
      'PAYMOB_IFRAME_ID',
      'PAYMOB_HMAC_SECRET',
    ] as const;
    for (const key of required) {
      if (!val[key]) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: 'is required when NODE_ENV=production',
        });
      }
    }
  });

function loadEnv() {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return parsed.data;
}

export const env = loadEnv();
export type Env = z.infer<typeof envSchema>;

/** Which external integrations are wired up in this environment. */
export const flags = {
  supabase: Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_KEY),
  payments: Boolean(
    env.PAYMOB_API_KEY &&
      env.PAYMOB_INTEGRATION_ID &&
      env.PAYMOB_IFRAME_ID &&
      env.PAYMOB_HMAC_SECRET,
  ),
} as const;

/**
 * Local auth mode: no Supabase configured (only allowed outside production,
 * which the schema enforces). Auth is handled with locally-signed JWTs.
 */
export const localAuth = !flags.supabase;
