/**
 * Fallback lab-test packages. The live catalogue is managed in the Admin
 * dashboard (uploaded via Excel) and fetched from `GET /lab-packages`; this
 * bundled list is only used if that request returns nothing (e.g. offline or
 * before any packages have been uploaded).
 */
import type { LabPackage } from '@vital/shared';

export const LAB_PACKAGES: LabPackage[] = [
  {
    id: 'metabolic',
    name: 'Metabolic & Diabetes',
    description: 'Blood sugar, lipids and metabolic markers',
    is_active: true,
    tests: [
      { id: 'fasting-glucose', name: 'Fasting Blood Glucose', price_egp: 90 },
      { id: 'hba1c', name: 'HbA1c', price_egp: 220 },
      { id: 'lipid-profile', name: 'Lipid Profile', price_egp: 260 },
      { id: 'insulin-fasting', name: 'Fasting Insulin', price_egp: 300 },
      { id: 'uric-acid', name: 'Uric Acid', price_egp: 80 },
    ],
  },
  {
    id: 'thyroid',
    name: 'Thyroid Panel',
    description: 'Full thyroid function',
    is_active: true,
    tests: [
      { id: 'tsh', name: 'TSH', price_egp: 180 },
      { id: 'free-t3', name: 'Free T3', price_egp: 200 },
      { id: 'free-t4', name: 'Free T4', price_egp: 200 },
    ],
  },
  {
    id: 'vitamins',
    name: 'Vitamins & Minerals',
    description: 'Common deficiency markers',
    is_active: true,
    tests: [
      { id: 'vitamin-d', name: 'Vitamin D (25-OH)', price_egp: 350 },
      { id: 'vitamin-b12', name: 'Vitamin B12', price_egp: 260 },
      { id: 'ferritin', name: 'Ferritin', price_egp: 240 },
      { id: 'magnesium', name: 'Magnesium', price_egp: 150 },
      { id: 'zinc', name: 'Zinc', price_egp: 220 },
    ],
  },
];

/** Sum of every test in a package (the package's full price). */
export function labPackageTotal(pkg: LabPackage): number {
  return pkg.tests.reduce((sum, t) => sum + t.price_egp, 0);
}

/** All test ids in a package. */
export function labPackageTestIds(pkg: LabPackage): string[] {
  return pkg.tests.map((t) => t.id);
}
