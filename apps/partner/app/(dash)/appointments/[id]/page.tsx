'use client';

import type { Booking, LabUpload, ParsedLabRow, PartnerUserDetail } from '@vital/shared';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';

import { useToast } from '@/components/toast';
import { Button, Card, Field, Input, Spinner, StatusPill } from '@/components/ui';
import { ApiError, api } from '@/lib/api';

export default function AppointmentDetailPage() {
  // useSearchParams must sit under a Suspense boundary for the production build.
  return (
    <Suspense fallback={<Spinner />}>
      <AppointmentDetail />
    </Suspense>
  );
}

function AppointmentDetail() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const userId = params.id;
  const bookingId = search.get('booking');
  const { push } = useToast();

  const [detail, setDetail] = useState<PartnerUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'details' | 'upload'>('details');

  const load = () => {
    setLoading(true);
    api
      .userDetail(userId)
      .then(setDetail)
      .catch((e) => push('error', e instanceof ApiError ? e.message : 'Failed'))
      .finally(() => setLoading(false));
  };
  useEffect(load, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const appointment: Booking | null = useMemo(() => {
    if (!detail) return null;
    return (
      detail.appointments.find((b) => b.id === bookingId) ??
      detail.appointments.find((b) => b.status === 'booked') ??
      detail.appointments[0] ??
      null
    );
  }, [detail, bookingId]);

  if (loading) return <Spinner />;
  if (!detail) return <div className="text-sm text-inkMuted">Patient not found.</div>;

  const { user, plan } = detail;

  return (
    <div>
      <Link href="/" className="mb-3 inline-block text-sm text-greenInk hover:underline">
        ← Appointments
      </Link>

      <div className="mb-4 flex items-end gap-4">
        <h1 className="font-display text-3xl font-bold text-ink">{user.full_name}</h1>
        {/* Tabs next to the patient name */}
        <div className="mb-1 flex gap-1 rounded-lg bg-panel p-1">
          {(['details', 'upload'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                tab === t ? 'bg-card text-greenInk shadow-sm' : 'text-inkSoft'
              }`}
            >
              {t === 'details' ? 'Details' : 'Upload Results'}
            </button>
          ))}
        </div>
      </div>

      {tab === 'details' ? (
        <div className="grid gap-4 md:grid-cols-2">
          {/* 1a. Patient details */}
          <Card className="p-4">
            <h3 className="mb-2 font-display text-sm font-bold uppercase tracking-wide text-inkMuted">Patient</h3>
            <Row label="Name" value={user.full_name} />
            <Row label="Email" value={user.email} />
            <Row label="Phone" value={user.phone ?? '—'} />
            <Row label="Date of birth" value={user.date_of_birth ?? '—'} />
            <Row label="Gender" value={user.gender ?? '—'} />
          </Card>

          {/* 1b. Lab tests required (from subscription plan) */}
          <Card className="p-4">
            <h3 className="mb-2 font-display text-sm font-bold uppercase tracking-wide text-inkMuted">Lab tests required</h3>
            {plan ? (
              <>
                <Row label="Plan" value={plan.name} />
                <Row label="Biomarkers" value={`${plan.biomarker_count} markers`} />
                <Row label="Annual tests" value={String(plan.annual_tests_count)} />
                {plan.features.length > 0 ? (
                  <ul className="mt-2 list-disc pl-5 text-sm text-inkSoft">
                    {plan.features.map((f, i) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                ) : null}
              </>
            ) : (
              <div className="text-sm text-inkMuted">No active subscription plan.</div>
            )}
          </Card>

          {/* 1c. Scheduled appointment */}
          <Card className="p-4">
            <h3 className="mb-2 font-display text-sm font-bold uppercase tracking-wide text-inkMuted">Scheduled appointment</h3>
            {appointment ? (
              <>
                <Row label="Date" value={appointment.date} />
                <Row label="Time" value={`${appointment.start_time}–${appointment.end_time}`} />
                <Row label="Area" value={appointment.area_name} />
                <Row label="Address" value={appointment.address ?? '—'} />
                <div className="mt-1">
                  <StatusPill status={appointment.status === 'booked' ? 'active' : appointment.status === 'cancelled' ? 'expired' : 'cancelled'} />
                </div>
              </>
            ) : (
              <div className="text-sm text-inkMuted">No appointment found.</div>
            )}
          </Card>

          {/* 1d. Notes */}
          <Card className="p-4">
            <h3 className="mb-2 font-display text-sm font-bold uppercase tracking-wide text-inkMuted">Notes</h3>
            <div className="text-sm text-ink">{appointment?.notes?.trim() || 'No notes provided.'}</div>
            <div className="mt-4 text-xs text-inkMuted">
              {detail.results.length} result(s) on file · {detail.lab_uploads.length} upload(s)
            </div>
          </Card>
        </div>
      ) : (
        <UploadTab userId={userId} defaultTestedAt={appointment?.date} onImported={load} />
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-line py-1.5 text-sm last:border-0">
      <span className="text-inkMuted">{label}</span>
      <span className="text-ink">{value}</span>
    </div>
  );
}

interface ReviewRow extends ParsedLabRow {
  _value: string;
}

function UploadTab({
  userId,
  defaultTestedAt,
  onImported,
}: {
  userId: string;
  defaultTestedAt?: string;
  onImported: () => void;
}) {
  const { push } = useToast();
  const today = new Date().toISOString().slice(0, 10);
  const [labName, setLabName] = useState('');
  const [testedAt, setTestedAt] = useState(defaultTestedAt ?? today);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [upload, setUpload] = useState<LabUpload | null>(null);
  const [rows, setRows] = useState<ReviewRow[]>([]);

  const err = (e: unknown) => push('error', e instanceof ApiError ? e.message : 'Failed');

  const doUpload = async () => {
    if (!file) return push('error', 'Choose a PDF first');
    setBusy(true);
    try {
      const { upload } = await api.uploadLab(userId, file, {
        lab_name: labName || undefined,
        tested_at: testedAt || undefined,
      });
      setUpload(upload);
      setRows(upload.parsed.map((p) => ({ ...p, _value: p.value != null ? String(p.value) : '' })));
      if (upload.parsed.length === 0) push('info', 'Stored, but no values could be auto-detected');
      else push('success', `Parsed ${upload.parsed.length} values — review to import`);
    } catch (e) {
      err(e);
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    if (!upload) return;
    const importable = rows.filter((r) => r.include && r.biomarker_id && r._value !== '');
    if (importable.length === 0) return push('error', 'Select at least one matched result to import');
    setBusy(true);
    try {
      const { imported } = await api.confirmLab(upload.id, {
        tested_at: testedAt,
        lab_name: labName || undefined,
        rows: importable.map((r) => ({
          biomarker_id: r.biomarker_id as string,
          value: Number(r._value),
          include: true,
        })),
      });
      push('success', `Imported ${imported} result(s) — the patient has been notified`);
      setUpload(null);
      setRows([]);
      setFile(null);
      onImported();
    } catch (e) {
      err(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-4">
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <Field label="Lab PDF">
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="text-sm text-inkSoft"
          />
        </Field>
        <Field label="Lab name">
          <Input className="w-44" value={labName} onChange={(e) => setLabName(e.target.value)} placeholder="Cairo Labs" />
        </Field>
        <Field label="Test date">
          <Input type="date" value={testedAt} onChange={(e) => setTestedAt(e.target.value)} />
        </Field>
        <Button onClick={doUpload} disabled={busy || !file}>
          {busy && !upload ? 'Uploading…' : 'Upload & parse'}
        </Button>
      </div>

      {upload && rows.length > 0 ? (
        <div>
          <h3 className="mb-2 font-display text-sm font-bold text-ink">Review parsed results</h3>
          <p className="mb-3 text-xs text-inkMuted">
            Only rows matched to a VITAL biomarker can be imported. Uncheck anything that looks wrong.
          </p>
          <div className="space-y-1">
            {rows.map((r, i) => {
              const matched = Boolean(r.biomarker_id);
              return (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded border border-line px-3 py-2 text-sm"
                  style={{ opacity: matched ? 1 : 0.5 }}
                >
                  <input
                    type="checkbox"
                    disabled={!matched}
                    checked={r.include && matched}
                    onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, include: e.target.checked } : x)))}
                  />
                  <span className="flex-1 text-ink">
                    {r.matched_name ?? r.biomarker_name}
                    {!matched ? <span className="ml-2 text-xs text-rust">(unmatched)</span> : null}
                  </span>
                  <Input
                    className="w-24"
                    value={r._value}
                    onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, _value: e.target.value } : x)))}
                  />
                  <span className="w-12 text-xs text-inkMuted">{r.unit ?? ''}</span>
                  <span className="w-14 text-right text-xs text-inkMuted">{Math.round(r.confidence * 100)}%</span>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={confirm} disabled={busy}>
              {busy ? 'Importing…' : 'Import selected'}
            </Button>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
