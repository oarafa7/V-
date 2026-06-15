'use client';

import type { AppNotification, PartnerAppointment } from '@vital/shared';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { useToast } from '@/components/toast';
import { EmptyRow, FilterBar, Input, Select, Spinner, StatusPill, Table, Td, Th } from '@/components/ui';
import { api } from '@/lib/api';

export default function AppointmentsPage() {
  const { push } = useToast();
  const [rows, setRows] = useState<PartnerAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState('');
  const [status, setStatus] = useState('booked');

  useEffect(() => {
    setLoading(true);
    api
      .appointments({ date: date || undefined, status: status || undefined })
      .then((r) => setRows(r.appointments))
      .catch((e) => push('error', e.message))
      .finally(() => setLoading(false));
  }, [date, status, push]);

  return (
    <div>
      <div className="mb-1 flex items-start justify-between gap-4">
        <h1 className="font-display text-3xl font-bold text-ink">Appointments</h1>
        <AlertsBell />
      </div>
      <p className="mb-5 text-sm text-inkSoft">Scheduled home draws in your service areas.</p>

      <FilterBar>
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-44" />
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-44">
          <option value="booked">Booked</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
          <option value="">All statuses</option>
        </Select>
      </FilterBar>

      {loading ? (
        <Spinner />
      ) : (
        <Table
          head={
            <>
              <Th>Date</Th>
              <Th>Time</Th>
              <Th>Patient</Th>
              <Th>Area</Th>
              <Th>Tests (plan)</Th>
              <Th>Notes</Th>
              <Th>Status</Th>
            </>
          }
        >
          {rows.length === 0 ? (
            <EmptyRow colSpan={7} label="No appointments." />
          ) : (
            rows.map((a) => (
              <tr key={a.id} className="border-b border-line transition-colors last:border-0 hover:bg-panel/50">
                <Td className="text-ink">
                  <Link href={`/appointments/${a.user.id}?booking=${a.id}`} className="block">
                    {a.date}
                  </Link>
                </Td>
                <Td className="text-inkSoft">{a.start_time}–{a.end_time}</Td>
                <Td className="text-ink">
                  <Link href={`/appointments/${a.user.id}?booking=${a.id}`} className="font-medium text-accent hover:underline">
                    {a.user.full_name}
                  </Link>
                  <div className="text-xs text-inkMuted">{a.user.phone ?? a.user.email}</div>
                </Td>
                <Td className="text-inkSoft">{a.area_name}</Td>
                <Td className="text-inkSoft">
                  {a.plan ? `${a.plan.name} · ${a.plan.biomarker_count} markers` : '—'}
                </Td>
                <Td className="max-w-xs text-xs text-inkSoft">{a.notes ?? '—'}</Td>
                <Td>
                  <StatusPill status={a.status === 'booked' ? 'active' : a.status === 'cancelled' ? 'expired' : 'cancelled'} />
                </Td>
              </tr>
            ))
          )}
        </Table>
      )}
    </div>
  );
}

/**
 * Alerts bell — the partner's feed of booking changes (new / rescheduled /
 * cancelled). Opening the panel marks everything read and clears the badge.
 */
function AlertsBell() {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);

  const load = () =>
    api
      .notifications()
      .then((r) => {
        setItems(r.notifications);
        setUnread(r.unread_count);
      })
      .catch(() => {});

  useEffect(() => {
    void load();
    const t = setInterval(load, 60_000); // refresh while the tab is open
    return () => clearInterval(t);
  }, []);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) {
      setUnread(0);
      void api.markNotificationsRead().catch(() => {});
    }
  };

  return (
    <div className="relative">
      <button
        onClick={toggle}
        className="relative rounded-lg border border-line bg-card px-3 py-2 text-sm font-medium text-inkSoft transition hover:border-accent hover:text-ink"
      >
        Alerts
        {unread > 0 ? (
          <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-xs font-semibold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-2 max-h-96 w-80 overflow-y-auto rounded-xl border border-line bg-card p-2 shadow-lg">
            {items.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-inkMuted">No alerts yet.</div>
            ) : (
              items.map((n) => {
                const body = (
                  <div
                    className="rounded-lg px-3 py-2.5 transition hover:bg-panel"
                    style={{ opacity: n.read_at ? 0.7 : 1 }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-ink">{n.title}</span>
                      <span className="shrink-0 text-xs text-inkMuted">
                        {new Date(n.created_at).toLocaleDateString('en-GB')}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs leading-relaxed text-inkSoft">{n.body}</p>
                  </div>
                );
                return n.link ? (
                  <Link key={n.id} href={`/${n.link}`} onClick={() => setOpen(false)} className="block">
                    {body}
                  </Link>
                ) : (
                  <div key={n.id}>{body}</div>
                );
              })
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
