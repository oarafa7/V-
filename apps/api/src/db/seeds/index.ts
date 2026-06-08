/**
 * Seed orchestrator. Idempotent: upserts categories, biomarkers, and plans so
 * it can be re-run safely. Run with `pnpm db:seed`.
 *
 * The biomarker + category dataset is the canonical one shared with the mobile
 * client, imported from `@vital/shared/data`.
 */
import { BIOMARKER_SEED, CATEGORY_SEED } from '@vital/shared/data/biomarkers.js';
import { DEFAULT_APP_CONTENT } from '@vital/shared';
import { eq } from 'drizzle-orm';

import { db } from '../client.js';
import {
  appSettings,
  biomarkerCategories,
  biomarkers,
  healthGoals,
  interventions,
  subscriptionPlans,
} from '../schema.js';
import { HEALTH_GOAL_SEED } from './goals.js';
import { INTERVENTION_SEED } from './interventions.js';
import { PLAN_SEED } from './plans.js';

async function seedCategories() {
  const slugToId = new Map<string, string>();
  for (const cat of CATEGORY_SEED) {
    const [existing] = await db
      .select({ id: biomarkerCategories.id })
      .from(biomarkerCategories)
      .where(eq(biomarkerCategories.slug, cat.slug))
      .limit(1);

    if (existing) {
      await db
        .update(biomarkerCategories)
        .set({
          name: cat.name,
          description: cat.description,
          icon: cat.icon,
          color: cat.color,
          displayOrder: cat.display_order,
        })
        .where(eq(biomarkerCategories.id, existing.id));
      slugToId.set(cat.slug, existing.id);
    } else {
      const [inserted] = await db
        .insert(biomarkerCategories)
        .values({
          name: cat.name,
          slug: cat.slug,
          description: cat.description,
          icon: cat.icon,
          color: cat.color,
          displayOrder: cat.display_order,
        })
        .returning({ id: biomarkerCategories.id });
      slugToId.set(cat.slug, inserted!.id);
    }
  }
  return slugToId;
}

async function seedBiomarkers(slugToId: Map<string, string>) {
  let count = 0;
  for (const bm of BIOMARKER_SEED) {
    const categoryId = slugToId.get(bm.category);
    if (!categoryId) {
      console.warn(`Skipping ${bm.slug}: unknown category ${bm.category}`);
      continue;
    }

    const values = {
      categoryId,
      name: bm.name,
      slug: bm.slug,
      unit: bm.unit,
      description: bm.description,
      whyItMatters: bm.why_it_matters,
      whatAffectsIt: bm.what_affects_it,
      optimalLow: String(bm.optimal_low),
      optimalHigh: String(bm.optimal_high),
      normalLow: String(bm.normal_low),
      normalHigh: String(bm.normal_high),
      minPlausible: String(bm.min_plausible),
      maxPlausible: String(bm.max_plausible),
      displayOrder: bm.display_order,
      tags: bm.tags,
      isActive: true,
    };

    const [existing] = await db
      .select({ id: biomarkers.id })
      .from(biomarkers)
      .where(eq(biomarkers.slug, bm.slug))
      .limit(1);

    if (existing) {
      await db.update(biomarkers).set(values).where(eq(biomarkers.id, existing.id));
    } else {
      await db.insert(biomarkers).values(values);
    }
    count += 1;
  }
  return count;
}

async function seedPlans() {
  for (const plan of PLAN_SEED) {
    const [existing] = await db
      .select({ id: subscriptionPlans.id })
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.name, plan.name))
      .limit(1);

    const values = {
      name: plan.name,
      priceEgp: plan.price_egp,
      priceDisplay: plan.price_display,
      annualTestsCount: plan.annual_tests_count,
      biomarkerCount: plan.biomarker_count,
      features: plan.features,
      isActive: plan.is_active,
    };

    if (existing) {
      await db.update(subscriptionPlans).set(values).where(eq(subscriptionPlans.id, existing.id));
    } else {
      await db.insert(subscriptionPlans).values(values);
    }
  }
}

async function seedGoals() {
  for (const goal of HEALTH_GOAL_SEED) {
    const [existing] = await db
      .select({ id: healthGoals.id })
      .from(healthGoals)
      .where(eq(healthGoals.slug, goal.slug))
      .limit(1);
    const values = {
      slug: goal.slug,
      label: goal.label,
      icon: goal.icon,
      displayOrder: goal.display_order,
      isActive: true,
    };
    if (existing) {
      await db.update(healthGoals).set(values).where(eq(healthGoals.id, existing.id));
    } else {
      await db.insert(healthGoals).values(values);
    }
  }
}

async function seedInterventions() {
  for (const iv of INTERVENTION_SEED) {
    const [existing] = await db
      .select({ id: interventions.id })
      .from(interventions)
      .where(eq(interventions.slug, iv.slug))
      .limit(1);
    const values = {
      name: iv.name,
      slug: iv.slug,
      category: iv.category,
      summary: iv.summary,
      detail: iv.detail,
      dosage: iv.dosage,
      evidenceLevel: iv.evidence_level,
      url: iv.url,
      targetBiomarkerSlugs: iv.target_biomarker_slugs,
      triggerStatuses: iv.trigger_statuses,
      isActive: iv.is_active,
      displayOrder: iv.display_order,
    };
    if (existing) {
      await db.update(interventions).set(values).where(eq(interventions.id, existing.id));
    } else {
      await db.insert(interventions).values(values);
    }
  }
}

async function seedContent() {
  // Only set defaults for keys that don't exist yet (never clobber admin edits).
  const entries: { key: string; value: unknown }[] = [
    { key: 'welcome_tagline', value: DEFAULT_APP_CONTENT.welcome_tagline },
    { key: 'support_email', value: DEFAULT_APP_CONTENT.support_email },
    { key: 'lab_partner', value: DEFAULT_APP_CONTENT.lab_partner },
  ];
  for (const e of entries) {
    await db
      .insert(appSettings)
      .values({ key: e.key, value: e.value, updatedAt: new Date() })
      .onConflictDoNothing({ target: appSettings.key });
  }
}

async function main() {
  console.log('Seeding categories…');
  const slugToId = await seedCategories();
  console.log(`  ${slugToId.size} categories.`);

  console.log('Seeding biomarkers…');
  const count = await seedBiomarkers(slugToId);
  console.log(`  ${count} biomarkers.`);

  console.log('Seeding plans…');
  await seedPlans();
  console.log(`  ${PLAN_SEED.length} plans.`);

  console.log('Seeding health goals…');
  await seedGoals();
  console.log(`  ${HEALTH_GOAL_SEED.length} goals.`);

  console.log('Seeding interventions…');
  await seedInterventions();
  console.log(`  ${INTERVENTION_SEED.length} interventions.`);

  console.log('Seeding app content defaults…');
  await seedContent();

  console.log('Seed complete.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
