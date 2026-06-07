/**
 * VITAL Score (Phase 2) — the composite 0–100 health score.
 *
 * Single canonical implementation, used by the API (to compute and persist the
 * score) and available to the client. Pure and deterministic — no I/O.
 *
 * Design:
 * - Each tested marker scores by status: optimal 1.0, suboptimal 0.6, alert 0.0.
 * - `untested` markers are excluded from the score but counted for coverage.
 * - We aggregate at the CATEGORY level first (average of a category's tested
 *   markers), then take a weighted mean across categories. This keeps the score
 *   from being dominated by categories that happen to have many markers.
 * - Biological age is a transparent heuristic offset from chronological age,
 *   only produced when the date of birth is known.
 */
import type {
  BiomarkerStatus,
  CategoryScore,
  ISODateString,
  ScoreBand,
  VitalScore,
} from './types/index.js';

/** Points awarded per status. `untested` contributes nothing and is excluded. */
const STATUS_POINTS: Record<Exclude<BiomarkerStatus, 'untested'>, number> = {
  optimal: 1,
  suboptimal: 0.6,
  alert: 0,
};

/** Band thresholds (inclusive lower bound), highest first. */
export const SCORE_BANDS: ReadonlyArray<{
  band: ScoreBand;
  min: number;
  label: string;
  color: string;
}> = [
  { band: 'excellent', min: 85, label: 'Excellent', color: '#6FA97D' },
  { band: 'good', min: 70, label: 'Good', color: '#3E7A53' },
  { band: 'fair', min: 50, label: 'Fair', color: '#CDA24E' },
  { band: 'attention', min: 0, label: 'Needs attention', color: '#C2603C' },
];

/** Map a 0–100 score to its band descriptor. */
export function scoreBand(score: number): (typeof SCORE_BANDS)[number] {
  const clamped = Math.max(0, Math.min(100, score));
  return SCORE_BANDS.find((b) => clamped >= b.min) ?? SCORE_BANDS[SCORE_BANDS.length - 1]!;
}

/** Max years the biological-age estimate can deviate from chronological age. */
const MAX_AGE_DELTA = 10;

/** Whole years between a date of birth and `now`. */
export function ageFromDateOfBirth(
  dateOfBirth: ISODateString,
  now: Date = new Date(),
): number | null {
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return null;
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age -= 1;
  return age >= 0 ? age : null;
}

export interface ScoreItem {
  status: BiomarkerStatus;
  categorySlug: string;
  categoryName: string;
}

export interface ScoreOptions {
  /** ISO date of birth, used for the biological-age estimate. */
  dateOfBirth?: ISODateString | null;
  /** Optional per-category weights (slug → weight). Missing categories default to 1. */
  weights?: Record<string, number>;
  /** Override "now" for deterministic computation/testing. */
  now?: Date;
}

/**
 * Compute the VITAL Score from a user's biomarker statuses.
 *
 * `items` should include EVERY active biomarker the user is eligible for, with
 * `status: 'untested'` for those without a result — that drives coverage.
 */
export function computeVitalScore(items: ScoreItem[], opts: ScoreOptions = {}): VitalScore {
  const now = opts.now ?? new Date();
  const totalCount = items.length;
  const testedItems = items.filter((i) => i.status !== 'untested');
  const testedCount = testedItems.length;

  // Aggregate tested markers per category.
  const byCategory = new Map<
    string,
    { name: string; sum: number; tested: number; total: number }
  >();
  for (const item of items) {
    const entry =
      byCategory.get(item.categorySlug) ??
      byCategory.set(item.categorySlug, {
        name: item.categoryName,
        sum: 0,
        tested: 0,
        total: 0,
      }).get(item.categorySlug)!;
    entry.total += 1;
    if (item.status !== 'untested') {
      entry.sum += STATUS_POINTS[item.status];
      entry.tested += 1;
    }
  }

  const categoryScores: CategoryScore[] = [];
  let weightedSum = 0;
  let weightTotal = 0;
  for (const [slug, e] of byCategory) {
    if (e.tested === 0) {
      categoryScores.push({ slug, name: e.name, score: 0, band: 'attention', tested: 0, total: e.total });
      continue;
    }
    const catScore = Math.round((e.sum / e.tested) * 100);
    const weight = opts.weights?.[slug] ?? 1;
    weightedSum += catScore * weight;
    weightTotal += weight;
    categoryScores.push({
      slug,
      name: e.name,
      score: catScore,
      band: scoreBand(catScore).band,
      tested: e.tested,
      total: e.total,
    });
  }
  // Stable order: highest-scoring categories first, untested last.
  categoryScores.sort((a, b) => (b.tested > 0 ? b.score : -1) - (a.tested > 0 ? a.score : -1));

  const score = weightTotal > 0 ? Math.round(weightedSum / weightTotal) : 0;
  const coverage = totalCount > 0 ? testedCount / totalCount : 0;

  // Biological age (heuristic): a perfect score trims years, a poor score adds them.
  let chronological: number | null = null;
  let biological: number | null = null;
  let ageDelta: number | null = null;
  if (opts.dateOfBirth) {
    chronological = ageFromDateOfBirth(opts.dateOfBirth, now);
    if (chronological !== null && testedCount > 0) {
      const delta = Math.round(((50 - score) / 50) * MAX_AGE_DELTA);
      biological = Math.max(18, chronological + delta);
      ageDelta = biological - chronological;
    }
  }

  return {
    score,
    band: scoreBand(score).band,
    tested_count: testedCount,
    total_count: totalCount,
    coverage,
    category_scores: categoryScores,
    chronological_age: chronological,
    biological_age: biological,
    age_delta: ageDelta,
    computed_at: now.toISOString(),
  };
}
