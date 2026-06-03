/**
 * Seed orchestrator. Idempotent: upserts categories, biomarkers, and plans so
 * it can be re-run safely. Run with `pnpm db:seed`.
 *
 * The biomarker + category dataset is the canonical one shared with the mobile
 * client, imported from `@vital/shared/data`.
 */
import { BIOMARKER_SEED, CATEGORY_SEED } from '@vital/shared/data/biomarkers.js';
import { eq } from 'drizzle-orm';

import { db } from '../client.js';
import { biomarkerCategories, biomarkers, subscriptionPlans } from '../schema.js';
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

  console.log('Seed complete.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
