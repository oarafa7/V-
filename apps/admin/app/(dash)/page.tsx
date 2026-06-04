'use client';

import type { AdminOverview } from '@vital/shared';
import { useEffect, useState } from 'react';

import { useToast } from '@/components/toast';
import { Card, Spinner } from '@/components/ui';
import { api } from '@/lib/api';

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="p-5">
      <div className="text-xs font-medium uppercase tracking-wide text-inkMuted">{label}</div>
      <div className="mt-2 font-display text-4xl font-extrabold text-ink">{value}</div>
      {hint ? <div className="mt-1 text-sm text-inkSoft">{hint}</div> : null}
    </Card>
  );
}

export default function OverviewPage() {
  const { push } = useToast();
  const [data, setData] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .overview()
      .then((r) => setData(r.overview))
      .catch((e) => push('error', e.message))
      .finally(() => setLoading(false));
  }, [push]);

  if (loading) return <Spinner />;
  if (!data) return <div className="text-inkSoft">No data.</div>;

  return (
    <div>
      <h1 className="mb-6 font-display text-3xl font-bold text-ink">Overview</h1>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Users" value={data.users_total.toLocaleString()} hint={`${data.admins_total} admins`} />
        <Stat label="Active subscriptions" value={data.active_subscriptions.toLocaleString()} />
        <Stat label="Revenue (active)" value={`${data.revenue_egp.toLocaleString()} EGP`} />
        <Stat label="Results logged" value={data.results_total.toLocaleString()} />
        <Stat label="Lab uploads" value={data.lab_uploads_total.toLocaleString()} />
        <Stat label="Pending review" value={data.pending_uploads.toLocaleString()} hint="uploads awaiting confirmation" />
      </div>

      <h2 className="mb-3 mt-8 font-display text-xl font-bold text-ink">Active plans</h2>
      <Card className="divide-y divide-line">
        {data.plan_breakdown.length === 0 ? (
          <div className="p-5 text-inkMuted">No active subscriptions yet.</div>
        ) : (
          data.plan_breakdown.map((p) => (
            <div key={p.plan} className="flex items-center justify-between p-4">
              <span className="font-medium capitalize text-ink">{p.plan}</span>
              <span className="font-display text-2xl font-bold text-greenInk">{p.count}</span>
            </div>
          ))
        )}
      </Card>
    </div>
  );
}
