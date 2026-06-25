/**
 * Lab-PDF storage helpers. Uses Supabase Storage when configured; in local mode
 * (no Supabase) files are written under LOCAL_STORAGE_DIR so uploads + parsing
 * work offline. Local files have no signed URL (the original-PDF viewer is the
 * one feature that degrades locally — parsing reads the bytes at upload time).
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

import { env, flags } from './env.js';
import { fail } from './http.js';
import { supabaseAdmin } from './supabase.js';

const BUCKET = env.SUPABASE_STORAGE_BUCKET;
const LOCAL_ROOT = resolve(env.LOCAL_STORAGE_DIR);

export async function uploadLabFile(
  userId: string,
  fileName: string,
  bytes: ArrayBuffer,
  contentType: string,
): Promise<string> {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${userId}/${Date.now()}_${safeName}`;

  if (!flags.supabase) {
    const abs = join(LOCAL_ROOT, path);
    await mkdir(dirname(abs), { recursive: true });
    await writeFile(abs, Buffer.from(bytes));
    return path;
  }

  const { error } = await supabaseAdmin!.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType, upsert: false });
  if (error) {
    fail('server_error', `Failed to store lab file: ${error.message}`);
  }
  return path;
}

/** Short-lived signed URL so the admin can view/download the original PDF. */
export async function signLabFile(path: string, expiresInSeconds = 3600): Promise<string | null> {
  if (!flags.supabase) return null; // no signed URLs locally
  const { data, error } = await supabaseAdmin!.storage
    .from(BUCKET)
    .createSignedUrl(path, expiresInSeconds);
  if (error || !data) return null;
  return data.signedUrl;
}
