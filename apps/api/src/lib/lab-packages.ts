/**
 * Lab-package catalogue: list for the apps, and an Excel/CSV batch importer for
 * the admin dashboard. The sheet has three columns — package name, test name,
 * price — one row per test. Rows are grouped by package name; each package in
 * the sheet is upserted (created or matched by name) and its tests are replaced
 * with the sheet rows. Packages not present in the sheet are left untouched.
 */
import type { LabPackage, LabPackageImportResult } from '@vital/shared';
import { asc, eq, sql } from 'drizzle-orm';
import * as XLSX from 'xlsx';

import { db } from '../db/client.js';
import { labPackages, labTests } from '../db/schema.js';

/** Active packages (with tests) for the customer apps. */
export async function listLabPackages(opts: { activeOnly?: boolean } = {}): Promise<LabPackage[]> {
  const pkgs = await db
    .select()
    .from(labPackages)
    .where(opts.activeOnly ? eq(labPackages.isActive, true) : undefined)
    .orderBy(asc(labPackages.displayOrder), asc(labPackages.name));

  const tests = await db.select().from(labTests).orderBy(asc(labTests.displayOrder));
  const byPkg = new Map<string, typeof tests>();
  for (const t of tests) {
    const arr = byPkg.get(t.packageId) ?? [];
    arr.push(t);
    byPkg.set(t.packageId, arr);
  }

  return pkgs.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    is_active: p.isActive,
    tests: (byPkg.get(p.id) ?? []).map((t) => ({ id: t.id, name: t.name, price_egp: t.priceEgp })),
  }));
}

const norm = (s: unknown) => String(s ?? '').trim();

/** Find a column value by trying several header aliases (case-insensitive). */
function pick(row: Record<string, unknown>, aliases: string[]): unknown {
  const keys = Object.keys(row);
  for (const alias of aliases) {
    const k = keys.find((key) => key.trim().toLowerCase() === alias);
    if (k !== undefined) return row[k];
  }
  return undefined;
}

function parsePrice(raw: unknown): number | null {
  if (raw === undefined || raw === null || raw === '') return null;
  // Strip currency words/symbols and thousands separators.
  const n = Number(String(raw).replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) ? Math.round(n) : null;
}

/**
 * Parse an uploaded spreadsheet (.xlsx/.xls/.csv) and upsert packages + tests.
 */
export async function importLabPackagesFromBuffer(
  buffer: Buffer,
): Promise<LabPackageImportResult> {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const sheet = wb.Sheets[wb.SheetNames[0]!];
  if (!sheet) return { packages_upserted: 0, tests_imported: 0, errors: [{ row: 0, message: 'Empty workbook' }] };
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

  // Group valid rows by package name (preserve first-seen order).
  const grouped = new Map<string, { name: string; price: number }[]>();
  const order: string[] = [];
  const errors: { row: number; message: string }[] = [];

  rows.forEach((row, i) => {
    const lineNo = i + 2; // +1 header, +1 to 1-based
    const pkg = norm(pick(row, ['package name', 'package', 'package_name']));
    const test = norm(pick(row, ['test name', 'test', 'test_name', 'biomarker']));
    const price = parsePrice(pick(row, ['price', 'price egp', 'price_egp', 'price (egp)', 'cost']));

    if (!pkg && !test) return; // blank line
    if (!pkg) return errors.push({ row: lineNo, message: 'Missing package name' });
    if (!test) return errors.push({ row: lineNo, message: 'Missing test name' });
    if (price === null) return errors.push({ row: lineNo, message: `Invalid price for "${test}"` });

    if (!grouped.has(pkg)) {
      grouped.set(pkg, []);
      order.push(pkg);
    }
    grouped.get(pkg)!.push({ name: test, price });
  });

  let testsImported = 0;
  let pkgsUpserted = 0;

  await db.transaction(async (tx) => {
    for (let p = 0; p < order.length; p++) {
      const pkgName = order[p]!;
      const tests = grouped.get(pkgName)!;

      // Upsert the package by (case-insensitive) name.
      const [existing] = await tx
        .select({ id: labPackages.id })
        .from(labPackages)
        .where(sql`lower(${labPackages.name}) = ${pkgName.toLowerCase()}`)
        .limit(1);

      let packageId: string;
      if (existing) {
        packageId = existing.id;
        await tx.update(labPackages).set({ displayOrder: p }).where(eq(labPackages.id, packageId));
        await tx.delete(labTests).where(eq(labTests.packageId, packageId));
      } else {
        const [created] = await tx
          .insert(labPackages)
          .values({ name: pkgName, displayOrder: p })
          .returning({ id: labPackages.id });
        packageId = created!.id;
      }
      pkgsUpserted++;

      if (tests.length > 0) {
        await tx.insert(labTests).values(
          tests.map((t, ti) => ({ packageId, name: t.name, priceEgp: t.price, displayOrder: ti })),
        );
        testsImported += tests.length;
      }
    }
  });

  return { packages_upserted: pkgsUpserted, tests_imported: testsImported, errors };
}
