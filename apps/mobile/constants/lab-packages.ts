/**
 * Lab-test packages shown on the "Book Lab Tests" tab and the "Add-on Lab Tests"
 * step of the booking flow.
 *
 * ▸ THIS IS THE LIST YOU UPLOAD/EDIT. Replace the sample packages below with your
 *   real packages, tests, and EGP prices. Each package is rendered as its own
 *   group with a "select all" control and a package total; the customer can also
 *   tick individual tests. Keep `id`s unique and stable.
 */
export interface LabTest {
  id: string;
  name: string;
  price_egp: number;
}

export interface LabPackage {
  id: string;
  name: string;
  description?: string;
  tests: LabTest[];
}

export const LAB_PACKAGES: LabPackage[] = [
  {
    id: 'metabolic',
    name: 'Metabolic & Diabetes',
    description: 'Blood sugar, lipids and metabolic markers',
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
