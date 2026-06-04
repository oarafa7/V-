'use client';

import type { AppContentInput } from '@vital/shared';
import { useEffect, useState } from 'react';

import { useToast } from '@/components/toast';
import { Button, Card, Field, Input, Spinner, Textarea } from '@/components/ui';
import { ApiError, api } from '@/lib/api';

export default function ContentPage() {
  const { push } = useToast();
  const [form, setForm] = useState<AppContentInput | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .content()
      .then((r) => setForm(r.content))
      .catch((e) => push('error', e.message));
  }, [push]);

  if (!form) return <Spinner />;

  const save = async () => {
    setBusy(true);
    try {
      const { content } = await api.saveContent(form);
      setForm(content);
      push('success', 'App content updated');
    } catch (e) {
      push('error', e instanceof ApiError ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <h1 className="mb-2 font-display text-3xl font-bold text-ink">App Content</h1>
      <p className="mb-6 max-w-2xl text-sm text-inkSoft">
        Editable copy and partner info surfaced in the mobile app. Changes appear the next time the
        app loads.
      </p>

      <div className="max-w-2xl space-y-6">
        <Card className="p-5">
          <h3 className="mb-3 font-display text-lg font-bold text-ink">Welcome</h3>
          <Field label="Tagline (welcome screen)">
            <Textarea
              rows={2}
              value={form.welcome_tagline}
              onChange={(e) => setForm({ ...form, welcome_tagline: e.target.value })}
            />
          </Field>
        </Card>

        <Card className="p-5">
          <h3 className="mb-3 font-display text-lg font-bold text-ink">Lab partner (Book a Test)</h3>
          <div className="space-y-4">
            <Field label="Name">
              <Input value={form.lab_partner.name} onChange={(e) => setForm({ ...form, lab_partner: { ...form.lab_partner, name: e.target.value } })} />
            </Field>
            <Field label="Description">
              <Textarea rows={2} value={form.lab_partner.description} onChange={(e) => setForm({ ...form, lab_partner: { ...form.lab_partner, description: e.target.value } })} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Phone">
                <Input value={form.lab_partner.phone} onChange={(e) => setForm({ ...form, lab_partner: { ...form.lab_partner, phone: e.target.value } })} />
              </Field>
              <Field label="Booking URL">
                <Input value={form.lab_partner.url} onChange={(e) => setForm({ ...form, lab_partner: { ...form.lab_partner, url: e.target.value } })} />
              </Field>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="mb-3 font-display text-lg font-bold text-ink">Support</h3>
          <Field label="Support email">
            <Input value={form.support_email} onChange={(e) => setForm({ ...form, support_email: e.target.value })} placeholder="support@vital.app" />
          </Field>
        </Card>

        <Button onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</Button>
      </div>
    </div>
  );
}
