'use client';

import { useEffect, useRef, useState } from 'react';

import { api, ApiError } from '@/lib/api';
import { useToast } from '@/components/toast';
import { Button, EmptyRow, Spinner, Table, Td, Th } from '@/components/ui';
import type { LabPackage, LabPackageImportResult } from '@vital/shared';

const egp = (n: number) => `EGP ${n.toLocaleString('en-US')}`;
const packageTotal = (p: LabPackage) => p.tests.reduce((s, t) => s + t.price_egp, 0);

export default function LabPackagesPage() {
  const { push } = useToast();
  const [packages, setPackages] = useState<LabPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [lastResult, setLastResult] = useState<LabPackageImportResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = () =>
    api
      .labPackages()
      .then((r) => setPackages(r.lab_packages))
      .catch(() => push('error', 'Failed to load packages'))
      .finally(() => setLoading(false));

  useEffect(() => {
    void load();
  }, []);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setLastResult(null);
    try {
      const result = await api.importLabPackages(file);
      setLastResult(result);
      push('success', `Imported ${result.tests_imported} tests into ${result.packages_upserted} packages`);
      await load();
    } catch (err) {
      push('error', err instanceof ApiError ? err.message : 'Import failed');
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const remove = async (p: LabPackage) => {
    if (!confirm(`Delete package "${p.name}" and its ${p.tests.length} tests?`)) return;
    try {
      await api.deleteLabPackage(p.id);
      push('success', 'Package deleted');
      await load();
    } catch {
      push('error', 'Delete failed');
    }
  };

  return (
    <div>
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink">Lab Packages</h1>
          <p className="mt-1 text-sm text-inkSoft">
            The bookable “Book Extra Lab Tests” / “Add-on Lab Tests” catalogue. Upload an Excel/CSV
            sheet with columns <b>package name</b>, <b>test name</b>, <b>price</b> — one row per test.
            Each package is matched by name and its tests are replaced.
          </p>
        </div>
        <div className="shrink-0">
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={onFile}
            className="hidden"
          />
          <Button onClick={() => fileRef.current?.click()} disabled={importing}>
            {importing ? 'Importing…' : 'Upload Excel'}
          </Button>
        </div>
      </div>

      {lastResult && lastResult.errors.length > 0 ? (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          <b>{lastResult.errors.length} row(s) skipped:</b>
          <ul className="mt-1 list-inside list-disc">
            {lastResult.errors.slice(0, 8).map((e, i) => (
              <li key={i}>
                Row {e.row}: {e.message}
              </li>
            ))}
            {lastResult.errors.length > 8 ? <li>…and {lastResult.errors.length - 8} more</li> : null}
          </ul>
        </div>
      ) : null}

      {loading ? (
        <Spinner />
      ) : packages.length === 0 ? (
        <div className="rounded-lg border border-line bg-panel/40 p-8 text-center text-inkSoft">
          No packages yet. Upload an Excel sheet to get started.
        </div>
      ) : (
        <div className="space-y-5">
          {packages.map((p) => (
            <div key={p.id} className="rounded-xl border border-line bg-panel/40">
              <div className="flex items-center justify-between border-b border-line px-4 py-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-display text-lg font-bold text-ink">{p.name}</span>
                    {!p.is_active ? (
                      <span className="rounded bg-inkMuted/15 px-1.5 py-0.5 text-xs text-inkMuted">inactive</span>
                    ) : null}
                  </div>
                  <div className="text-xs text-inkSoft">
                    {p.tests.length} tests · total {egp(packageTotal(p))}
                  </div>
                </div>
                <button onClick={() => remove(p)} className="text-sm text-rust hover:underline">
                  Delete
                </button>
              </div>
              <Table
                head={
                  <>
                    <Th>Test</Th>
                    <Th className="text-right">Price</Th>
                  </>
                }
              >
                {p.tests.length === 0 ? (
                  <EmptyRow colSpan={2} label="No tests" />
                ) : (
                  p.tests.map((t) => (
                    <tr key={t.id} className="border-b border-line/60">
                      <Td>{t.name}</Td>
                      <Td className="text-right tabular-nums">{egp(t.price_egp)}</Td>
                    </tr>
                  ))
                )}
              </Table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
