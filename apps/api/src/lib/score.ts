/**
 * VITAL Score computation + persistence (Phase 2).
 *
 * `computeUserScore` builds the score from a user's active biomarkers and their
 * latest results using the shared, canonical `computeVitalScore`.
 * `recordScoreSnapshot` upserts one snapshot per user per day so the history
 * trend builds up as results are added.
 */
import {
  type BiomarkerStatus,
  type ScoreItem,
  type VitalScore,
  classifyBiomarkerSafe,
  computeVitalScore,
} from '@vital/shared';
import { and, asc, desc, eq, inArray } from 'drizzle-orm';

import { db } from '../db/client.js';
import {
  biomarkerCategories,
  biomarkers,
  scoreSnapshots,
  userBiomarkerResults,
  users,
} from '../db/schema.js';

/** Build the current VITAL Score for a user from live data. */
export async function computeUserScore(userId: string): Promise<VitalScore> {
  // Active biomarkers joined to their category (slug + name for aggregation).
  const rows = await db
    .select({
      id: biomarkers.id,
      optimalLow: biomarkers.optimalLow,
      optimalHigh: biomarkers.optimalHigh,
      normalLow: biomarkers.normalLow,
      normalHigh: biomarkers.normalHigh,
      categorySlug: biomarkerCategories.slug,
      categoryName: biomarkerCategories.name,
    })
    .from(biomarkers)
    .innerJoin(biomarkerCategories, eq(biomarkers.categoryId, biomarkerCategories.id))
    .where(eq(biomarkers.isActive, true))
    .orderBy(asc(biomarkers.displayOrder));

  // Latest result per biomarker for this user.
  const ids = rows.map((r) => r.id);
  const latest = new Map<string, number>();
  if (ids.length > 0) {
    const resultRows = await db
      .select({
        biomarkerId: userBiomarkerResults.biomarkerId,
        value: userBiomarkerResults.value,
      })
      .from(userBiomarkerResults)
      .where(
        and(eq(userBiomarkerResults.userId, userId), inArray(userBiomarkerResults.biomarkerId, ids)),
      )
      .orderBy(desc(userBiomarkerResults.testedAt), desc(userBiomarkerResults.createdAt));
    for (const r of resultRows) {
      if (!latest.has(r.biomarkerId)) latest.set(r.biomarkerId, Number(r.value));
    }
  }

  const items: ScoreItem[] = rows.map((r) => {
    const value = latest.get(r.id);
    const status: BiomarkerStatus = classifyBiomarkerSafe(value, {
      optimal_low: Number(r.optimalLow),
      optimal_high: Number(r.optimalHigh),
      normal_low: Number(r.normalLow),
      normal_high: Number(r.normalHigh),
    });
    return { status, categorySlug: r.categorySlug, categoryName: r.categoryName };
  });

  const [user] = await db
    .select({ dateOfBirth: users.dateOfBirth })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return computeVitalScore(items, { dateOfBirth: user?.dateOfBirth ?? null });
}

/**
 * Compute the score and upsert today's snapshot. Best-effort: callers should
 * not let a snapshot failure break the primary mutation, so this swallows
 * errors after logging.
 */
export async function recordScoreSnapshot(userId: string): Promise<void> {
  try {
    const score = await computeUserScore(userId);
    const recordedOn = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    await db
      .insert(scoreSnapshots)
      .values({
        userId,
        score: score.score,
        band: score.band,
        testedCount: score.tested_count,
        totalCount: score.total_count,
        biologicalAge: score.biological_age,
        breakdown: score.category_scores.map((c) => ({
          slug: c.slug,
          name: c.name,
          score: c.score,
          tested: c.tested,
          total: c.total,
        })),
        recordedOn,
      })
      .onConflictDoUpdate({
        target: [scoreSnapshots.userId, scoreSnapshots.recordedOn],
        set: {
          score: score.score,
          band: score.band,
          testedCount: score.tested_count,
          totalCount: score.total_count,
          biologicalAge: score.biological_age,
          breakdown: score.category_scores.map((c) => ({
            slug: c.slug,
            name: c.name,
            score: c.score,
            tested: c.tested,
            total: c.total,
          })),
        },
      });
  } catch (err) {
    console.error('Failed to record score snapshot for user', userId, err);
  }
}
