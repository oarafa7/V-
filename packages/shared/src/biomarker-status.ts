/**
 * VITAL — Biomarker status classification (shared)
 *
 * The single canonical implementation used by both the API (to compute
 * `status` on list/detail responses) and the mobile client (for instant
 * UI feedback on manual entries). Keeping one copy avoids client/server drift.
 */
import type { Biomarker, BiomarkerStatus } from './types/index.js';

type RangeFields = Pick<
  Biomarker,
  'optimal_low' | 'optimal_high' | 'normal_low' | 'normal_high'
>;

/**
 * Classify a measured value against a biomarker's reference ranges.
 *
 * - `optimal`    → within VITAL's functional-medicine optimal window
 * - `suboptimal` → within the standard lab normal window but outside optimal
 * - `alert`      → outside the normal window entirely
 *
 * `untested` is never returned here — it is the state when no value exists,
 * and callers should handle the absence of a value before calling this.
 */
export function classifyBiomarker(
  value: number,
  biomarker: RangeFields,
): Exclude<BiomarkerStatus, 'untested'> {
  if (value >= biomarker.optimal_low && value <= biomarker.optimal_high) {
    return 'optimal';
  }
  if (value >= biomarker.normal_low && value <= biomarker.normal_high) {
    return 'suboptimal';
  }
  return 'alert';
}

/** Convenience: returns 'untested' when value is null/undefined. */
export function classifyBiomarkerSafe(
  value: number | null | undefined,
  biomarker: RangeFields,
): BiomarkerStatus {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return 'untested';
  }
  return classifyBiomarker(value, biomarker);
}

/** Canonical status → color map used across the whole app. */
export const STATUS_COLORS: Record<BiomarkerStatus, string> = {
  optimal: '#4CAF84',
  suboptimal: '#C9A84C',
  alert: '#E05252',
  untested: '#3D5068',
};

export const STATUS_LABELS: Record<BiomarkerStatus, string> = {
  optimal: 'Optimal',
  suboptimal: 'Review',
  alert: 'Alert',
  untested: 'Untested',
};
