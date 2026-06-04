'use client';

import type { AdminUserDetail, Biomarker, LabUpload, ParsedLabRow } from '@vital/shared';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { useToast } from '@/components/toast';
import {
  Button,
  Card,
  EmptyRow,
  Field,
  Input,
  Modal,
  Select,
  Spinner,
  StatusPill,
  Table,
  Td,
  Th,
} from '@/components/ui';
import { ApiError, api } from '@/lib/api';

const today = () => new Date().toISOString().slice(0, 10);

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { push } = useToast();

  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [biomarkers, setBiomarkers] = useState<Biomarker[]>([]);
  const [loading, setLoading] = useState(true);

  const [editOpen, setEditOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [review, setReview] = useState<LabUpload | null>(null);

  const bmById = useMemo(() => new Map(biomarkers.map((b) => [b.id, b])), [biomarkers]);

  const load = async () => {
    try {
      const [d, b] = await Promise.all([api.user(id), api.biomarkers()]);
      setDetail(d);
      setBiomarkers(b.biomarkers);
    } catch (e) {
      push('error', e instanceof ApiError ? e.message : 'Failed to load user');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) return <Spinner />;
  if (!detail) return <div className="text-inkSoft">User not found.</div>;

  const { user, subscription, results, lab_uploads } = detail;

  const deleteResult = async (rid: string) => {
    if (!confirm('Delete this result?')) return;
    try {
      await api.deleteResult(rid);
      push('success', 'Result deleted');
      void load();
    } catch (e) {
      push('error', e instanceof ApiError ? e.message : 'Failed');
    }
  };

  const openReview = async (uploadId: string) => {
    try {
      const { upload } = await api.labUpload(uploadId);
      setReview(upload);
    } catch (e) {
      push('error', e instanceof ApiError ? e.message : 'Failed to open upload');
    }
  };

  return (
    <div>
      <a href="/users" className="text-sm text-inkSoft hover:underline">← All users</a>
      <div className="mb-6 mt-2 flex items-start justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink">{user.full_name}</h1>
          <div className="text-inkSoft">{user.email}{user.phone ? ` · ${user.phone}` : ''}</div>
        </div>
        <Button variant="outline" onClick={() => setEditOpen(true)}>Edit profile</Button>
      </div>

      {/* Profile + subscription */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-5">
          <h3 className="mb-3 font-display text-lg font-bold text-ink">Profile</h3>
          <dl className="space-y-2 text-sm">
            <Row k="Role" v={user.role} />
            <Row k="Date of birth" v={user.date_of_birth ?? '—'} />
            <Row k="Gender" v={user.gender ?? '—'} />
            <Row k="Height / Weight" v={`${user.height_cm ?? '—'} cm · ${user.weight_kg ?? '—'} kg`} />
            <Row k="Goals" v={user.health_goals.length ? user.health_goals.join(', ') : '—'} />
            <Row k="Conditions" v={user.chronic_conditions.length ? user.chronic_conditions.join(', ') : '—'} />
          </dl>
        </Card>
        <Card className="p-5">
          <h3 className="mb-3 font-display text-lg font-bold text-ink">Subscription</h3>
          {subscription ? (
            <dl className="space-y-2 text-sm">
              <Row k="Plan" v={subscription.plan.name} />
              <Row k="Status" v={<StatusPill status={subscription.status} />} />
              <Row k="Started" v={new Date(subscription.started_at).toLocaleDateString('en-GB')} />
              <Row k="Expires" v={new Date(subscription.expires_at).toLocaleDateString('en-GB')} />
            </dl>
          ) : (
            <div className="text-inkMuted">No subscription.</div>
          )}
        </Card>
      </div>

      {/* Lab upload */}
      <div className="mt-8">
        <h2 className="mb-3 font-display text-xl font-bold text-ink">Lab results</h2>
        <LabUploadCard userId={id} onUploaded={(u) => { setReview(u); void load(); }} />
      </div>

      {/* Upload history */}
      {lab_uploads.length > 0 ? (
        <Card className="mt-4 divide-y divide-line">
          {lab_uploads.map((u) => (
            <div key={u.id} className="flex items-center justify-between p-4">
              <div>
                <div className="font-medium text-ink">{u.original_name}</div>
                <div className="text-xs text-inkMuted">
                  {new Date(u.created_at).toLocaleDateString('en-GB')} · {u.parsed.length} parsed · {u.result_count} imported
                </div>
              </div>
              <div className="flex items-center gap-3">
                <StatusPill status={u.status === 'confirmed' ? 'active' : u.status === 'failed' ? 'cancelled' : 'expired'} />
                {u.status === 'parsed' ? (
                  <Button variant="outline" onClick={() => openReview(u.id)}>Review</Button>
                ) : null}
              </div>
            </div>
          ))}
        </Card>
      ) : null}

      {/* Results table */}
      <div className="mt-8 flex items-center justify-between">
        <h2 className="font-display text-xl font-bold text-ink">Recorded values</h2>
        <Button onClick={() => setAddOpen(true)}>Add result</Button>
      </div>
      <div className="mt-3">
        <Table head={<><Th>Biomarker</Th><Th>Value</Th><Th>Tested</Th><Th>Source</Th><Th>Lab</Th><Th /></>}>
          {results.length === 0 ? (
            <EmptyRow colSpan={6} label="No results recorded yet." />
          ) : (
            results.map((r) => {
              const bm = bmById.get(r.biomarker_id);
              return (
                <tr key={r.id} className="border-b border-line last:border-0">
                  <Td className="font-medium text-ink">{bm?.name ?? r.biomarker_id}</Td>
                  <Td>{r.value} {bm?.unit ?? ''}</Td>
                  <Td className="text-inkSoft">{r.tested_at}</Td>
                  <Td className="text-inkMuted capitalize">{r.source.replace('_', ' ')}</Td>
                  <Td className="text-inkSoft">{r.lab_name ?? '—'}</Td>
                  <Td><button onClick={() => deleteResult(r.id)} className="text-sm text-rust hover:underline">Delete</button></Td>
                </tr>
              );
            })
          )}
        </Table>
      </div>

      {editOpen ? (
        <EditProfileModal detail={detail} onClose={() => setEditOpen(false)} onSaved={() => { setEditOpen(false); void load(); }} />
      ) : null}
      {addOpen ? (
        <AddResultModal userId={id} biomarkers={biomarkers} onClose={() => setAddOpen(false)} onSaved={() => { setAddOpen(false); void load(); }} />
      ) : null}
      {review ? (
        <ReviewModal upload={review} biomarkers={biomarkers} onClose={() => setReview(null)} onConfirmed={() => { setReview(null); void load(); }} />
      ) : null}
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-inkMuted">{k}</dt>
      <dd className="font-medium capitalize text-ink">{v}</dd>
    </div>
  );
}

// ── Lab upload card ──────────────────────────────────────────────────────────
function LabUploadCard({ userId, onUploaded }: { userId: string; onUploaded: (u: LabUpload) => void }) {
  const { push } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [labName, setLabName] = useState('');
  const [testedAt, setTestedAt] = useState(today());
  const [busy, setBusy] = useState(false);

  const upload = async () => {
    if (!file) return push('error', 'Choose a PDF first');
    setBusy(true);
    try {
      const { upload } = await api.uploadLab(userId, file, { lab_name: labName || undefined, tested_at: testedAt });
      if (upload.parsed.length === 0) {
        push('info', 'Stored, but no values could be auto-detected — add results manually.');
      } else {
        push('success', `Parsed ${upload.parsed.length} values — review to import`);
      }
      setFile(null);
      onUploaded(upload);
    } catch (e) {
      push('error', e instanceof ApiError ? e.message : 'Upload failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-5">
      <div className="grid gap-3 md:grid-cols-3">
        <Field label="Lab PDF">
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="w-full text-sm text-inkSoft file:mr-3 file:rounded-lg file:border-0 file:bg-ink file:px-3 file:py-2 file:text-sm file:text-canvas"
          />
        </Field>
        <Field label="Lab name"><Input value={labName} onChange={(e) => setLabName(e.target.value)} placeholder="Al Borg" /></Field>
        <Field label="Test date"><Input type="date" value={testedAt} onChange={(e) => setTestedAt(e.target.value)} /></Field>
      </div>
      <div className="mt-4">
        <Button onClick={upload} disabled={busy || !file}>{busy ? 'Uploading & parsing…' : 'Upload & parse'}</Button>
      </div>
    </Card>
  );
}

// ── Review parsed rows ───────────────────────────────────────────────────────
function ReviewModal({
  upload,
  biomarkers,
  onClose,
  onConfirmed,
}: {
  upload: LabUpload;
  biomarkers: Biomarker[];
  onClose: () => void;
  onConfirmed: () => void;
}) {
  const { push } = useToast();
  const bmById = useMemo(() => new Map(biomarkers.map((b) => [b.id, b])), [biomarkers]);
  const [rows, setRows] = useState<ParsedLabRow[]>(upload.parsed);
  const [labName, setLabName] = useState(upload.lab_name ?? '');
  const [testedAt, setTestedAt] = useState(upload.tested_at ?? today());
  const [busy, setBusy] = useState(false);

  const setRow = (i: number, patch: Partial<ParsedLabRow>) =>
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const confirm = async () => {
    const payloadRows = rows
      .filter((r) => r.biomarker_id && r.value !== null)
      .map((r) => ({ biomarker_id: r.biomarker_id as string, value: r.value as number, include: r.include }));
    if (!payloadRows.some((r) => r.include)) return push('error', 'Select at least one row to import');
    setBusy(true);
    try {
      const res = await api.confirmLab(upload.id, { tested_at: testedAt, lab_name: labName || undefined, rows: payloadRows });
      push('success', `Imported ${res.imported} results`);
      onConfirmed();
    } catch (e) {
      push('error', e instanceof ApiError ? e.message : 'Failed to import');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="Review parsed results" wide>
      <div className="mb-4 grid grid-cols-2 gap-3">
        <Field label="Test date"><Input type="date" value={testedAt} onChange={(e) => setTestedAt(e.target.value)} /></Field>
        <Field label="Lab name"><Input value={labName} onChange={(e) => setLabName(e.target.value)} /></Field>
      </div>
      {upload.file_url ? (
        <a href={upload.file_url} target="_blank" rel="noreferrer" className="mb-3 inline-block text-sm text-greenInk hover:underline">
          View original PDF ↗
        </a>
      ) : null}
      <div className="max-h-[50vh] overflow-y-auto rounded-lg border border-line">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-panel text-left text-xs uppercase text-inkMuted">
            <tr><th className="px-3 py-2">Import</th><th className="px-3 py-2">Biomarker</th><th className="px-3 py-2">Value</th><th className="px-3 py-2">Unit</th><th className="px-3 py-2">Confidence</th></tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const bm = r.biomarker_id ? bmById.get(r.biomarker_id) : null;
              return (
                <tr key={i} className="border-t border-line">
                  <td className="px-3 py-2">
                    <input type="checkbox" checked={r.include} onChange={(e) => setRow(i, { include: e.target.checked })} />
                  </td>
                  <td className="px-3 py-2 font-medium text-ink">{bm?.name ?? r.biomarker_name}</td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      step="any"
                      value={r.value ?? ''}
                      onChange={(e) => setRow(i, { value: e.target.value === '' ? null : Number(e.target.value) })}
                      className="w-24 rounded border border-line bg-canvas px-2 py-1"
                    />
                  </td>
                  <td className="px-3 py-2 text-inkSoft">{r.unit ?? bm?.unit ?? ''}</td>
                  <td className="px-3 py-2 text-inkMuted">{Math.round(r.confidence * 100)}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={confirm} disabled={busy}>{busy ? 'Importing…' : 'Import selected'}</Button>
      </div>
    </Modal>
  );
}

// ── Add manual result ────────────────────────────────────────────────────────
function AddResultModal({
  userId,
  biomarkers,
  onClose,
  onSaved,
}: {
  userId: string;
  biomarkers: Biomarker[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { push } = useToast();
  const [biomarkerId, setBiomarkerId] = useState(biomarkers[0]?.id ?? '');
  const [value, setValue] = useState('');
  const [testedAt, setTestedAt] = useState(today());
  const [labName, setLabName] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!biomarkerId) return push('error', 'Pick a biomarker');
    if (value === '' || Number.isNaN(Number(value))) return push('error', 'Enter a numeric value');
    setBusy(true);
    try {
      await api.addResult(userId, {
        biomarker_id: biomarkerId,
        value: Number(value),
        tested_at: testedAt,
        lab_name: labName || undefined,
        notes: notes || undefined,
      });
      push('success', 'Result added');
      onSaved();
    } catch (e) {
      push('error', e instanceof ApiError ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  };

  const bm = biomarkers.find((b) => b.id === biomarkerId);

  return (
    <Modal open onClose={onClose} title="Add result">
      <div className="space-y-4">
        <Field label="Biomarker">
          <Select value={biomarkerId} onChange={(e) => setBiomarkerId(e.target.value)}>
            {biomarkers.map((b) => (
              <option key={b.id} value={b.id}>{b.name} ({b.unit})</option>
            ))}
          </Select>
        </Field>
        <Field label={`Value${bm ? ` (${bm.unit})` : ''}`}>
          <Input type="number" step="any" value={value} onChange={(e) => setValue(e.target.value)} />
        </Field>
        <Field label="Test date"><Input type="date" value={testedAt} onChange={(e) => setTestedAt(e.target.value)} /></Field>
        <Field label="Lab name"><Input value={labName} onChange={(e) => setLabName(e.target.value)} placeholder="optional" /></Field>
        <Field label="Notes"><Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="optional" /></Field>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save'}</Button>
        </div>
      </div>
    </Modal>
  );
}

// ── Edit profile / role ──────────────────────────────────────────────────────
function EditProfileModal({
  detail,
  onClose,
  onSaved,
}: {
  detail: AdminUserDetail;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { push } = useToast();
  const [fullName, setFullName] = useState(detail.user.full_name);
  const [phone, setPhone] = useState(detail.user.phone ?? '');
  const [role, setRole] = useState<'user' | 'admin'>(detail.user.role);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      await api.updateUser(detail.user.id, { full_name: fullName, phone: phone || undefined, role });
      push('success', 'Profile updated');
      onSaved();
    } catch (e) {
      push('error', e instanceof ApiError ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="Edit profile">
      <div className="space-y-4">
        <Field label="Full name"><Input value={fullName} onChange={(e) => setFullName(e.target.value)} /></Field>
        <Field label="Phone"><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
        <Field label="Role">
          <Select value={role} onChange={(e) => setRole(e.target.value as 'user' | 'admin')}>
            <option value="user">user</option>
            <option value="admin">admin</option>
          </Select>
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save'}</Button>
        </div>
      </div>
    </Modal>
  );
}
