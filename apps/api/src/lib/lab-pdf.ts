/**
 * Heuristic lab-PDF parser.
 *
 * Extracts text from an uploaded lab PDF and matches lines against the VITAL
 * biomarker library to produce DRAFT result rows. This is intentionally
 * conservative — every row is returned for admin review/correction before any
 * result is persisted. It never auto-saves.
 */
// Import the inner lib path to avoid pdf-parse's debug block that reads a test
// file from disk when imported as the main module.
import pdfParse from 'pdf-parse/lib/pdf-parse.js';

import type { ParsedLabRow } from '../db/schema.js';

interface BiomarkerLike {
  id: string;
  name: string;
  unit: string;
  slug: string;
  minPlausible: number;
  maxPlausible: number;
  tags?: string[];
}

/** Common lab abbreviations → biomarker slug, to lift match rates. */
const SLUG_ALIASES: Record<string, string[]> = {
  hba1c: ['hba1c', 'a1c', 'glycated hemoglobin', 'glycated haemoglobin'],
  'fasting-glucose': ['glucose', 'fasting glucose', 'fbs', 'fpg'],
  'ldl-cholesterol': ['ldl', 'ldl cholesterol', 'ldl-c'],
  'hdl-cholesterol': ['hdl', 'hdl cholesterol', 'hdl-c'],
  triglycerides: ['triglycerides', 'tg'],
  'total-cholesterol': ['total cholesterol', 'cholesterol total'],
  tsh: ['tsh', 'thyroid stimulating hormone'],
  'free-t4': ['free t4', 'ft4'],
  'free-t3': ['free t3', 'ft3'],
  'vitamin-d3-25-oh': ['vitamin d', '25-oh', '25 oh vitamin d', '25-hydroxyvitamin d'],
  'vitamin-b12': ['vitamin b12', 'b12', 'cobalamin'],
  ferritin: ['ferritin'],
  hemoglobin: ['hemoglobin', 'haemoglobin', 'hgb', 'hb'],
  hematocrit: ['hematocrit', 'haematocrit', 'hct'],
  wbc: ['wbc', 'white blood cell', 'leukocyte'],
  rbc: ['rbc', 'red blood cell'],
  platelets: ['platelets', 'plt'],
  creatinine: ['creatinine', 'creat'],
  alt: ['alt', 'sgpt', 'alanine aminotransferase'],
  ast: ['ast', 'sgot', 'aspartate aminotransferase'],
  'uric-acid': ['uric acid'],
  'hscrp-cardiac': ['hs-crp', 'hscrp', 'high sensitivity crp'],
  'alkaline-phosphatase': ['alkaline phosphatase', 'alp', 'alk phos'],
  'blood-urea-nitrogen': ['blood urea nitrogen', 'bun'],
  'serum-urea': ['serum urea', 'urea', 'blood urea'],
  'psa-total': ['psa', 'psa total', 'prostate specific antigen', 'total psa'],
  'indirect-bilirubin': ['indirect bilirubin', 'unconjugated bilirubin'],
  'total-bilirubin': ['total bilirubin'],
  'direct-bilirubin': ['direct bilirubin', 'conjugated bilirubin'],
  'total-protein': ['total protein', 'serum total protein'],
  albumin: ['albumin', 'serum albumin'],
};

function normalize(s: string): string {
  return s.toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * First standalone number on a line. Requires the number not be embedded in an
 * alphanumeric token, so marker names like "A1C", "B12", "T3" don't yield a
 * bogus value (the "1" in "A1C").
 */
function extractNumber(line: string): number | null {
  const m = line.match(
    /(?:^|[^A-Za-z0-9.])(-?\d{1,3}(?:,\d{3})*(?:\.\d+)?|-?\d+(?:\.\d+)?)(?=[^A-Za-z0-9]|$)/,
  );
  if (!m) return null;
  const n = Number(m[1]!.replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

/** A line that is just a number — the value in "name / value / unit" layouts. */
function pureNumberLine(line: string): number | null {
  return /^[-+]?\d+(?:\.\d+)?$/.test(line.trim()) ? Number(line.trim()) : null;
}

interface RefRange {
  raw: string;
  low: number | null;
  high: number | null;
}

/**
 * Find the reference range printed for a result by scanning the few lines after
 * its value. Labs print these glued to the unit ("U/L40 - 129"), as bounds
 * ("Up to 0.90", "< 5", "> 55"), or on their own line ("60 - 160",
 * "Normal: 4.5 - 5.7"). Returns the first recognisable range, raw + parsed.
 */
function extractRange(lines: string[], valueIdx: number): RefRange | null {
  for (let k = valueIdx; k <= valueIdx + 3 && k < lines.length; k++) {
    const raw = lines[k]!.trim();
    // Skip prose: real reference ranges are short. This avoids treating clinical
    // notes ("Dyslipidemia management; target goals … < 55,70 …") as a range.
    if (raw.length > 40) continue;
    const low = raw.toLowerCase();

    const upTo = low.match(/up\s*to\s*:?\s*(\d+(?:\.\d+)?)/);
    if (upTo) return { raw, low: null, high: Number(upTo[1]) };

    // Worded directional bounds, e.g. HDL "No risk: More than 55".
    const moreThan = low.match(/more than\s*(\d+(?:\.\d+)?)/);
    if (moreThan) return { raw, low: Number(moreThan[1]), high: null };
    const lessThan = low.match(/less than\s*(\d+(?:\.\d+)?)/);
    if (lessThan) return { raw, low: null, high: Number(lessThan[1]) };

    // A bounded "low - high" (drop any leading unit/label like "mg/dl" or "Normal:").
    const dash = raw.replace(/^[^\d<>≤≥]*/, '').match(/^(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)/);
    if (dash) return { raw, low: Number(dash[1]), high: Number(dash[2]) };

    const lt = low.match(/[<≤]\s*(\d+(?:\.\d+)?)/);
    if (lt) return { raw, low: null, high: Number(lt[1]) };

    const gt = low.match(/[>≥]\s*(\d+(?:\.\d+)?)/);
    if (gt) return { raw, low: Number(gt[1]), high: null };
  }
  return null;
}

interface Candidate {
  bm: BiomarkerLike;
  needles: string[];
  base: number; // base confidence for this needle set
}

export async function parseLabPdf(
  data: Buffer | Uint8Array,
  biomarkers: BiomarkerLike[],
): Promise<ParsedLabRow[]> {
  let text: string;
  try {
    const result = await pdfParse(data as Buffer);
    text = result.text ?? '';
  } catch {
    return [];
  }

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  // Build candidate needles per biomarker.
  const candidates: Candidate[] = biomarkers.map((bm) => {
    const needles = new Set<string>();
    const name = normalize(bm.name);
    needles.add(name);
    // Drop a trailing parenthetical, e.g. "Vitamin D3 (25-OH)" → "vitamin d3".
    const noParen = normalize(bm.name.replace(/\(.*?\)/g, ''));
    if (noParen) needles.add(noParen);
    for (const alias of SLUG_ALIASES[bm.slug] ?? []) needles.add(normalize(alias));
    return { bm, needles: [...needles], base: 1 };
  });

  // Best match per biomarker (one row each, highest confidence wins).
  const best = new Map<string, ParsedLabRow>();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const nline = normalize(line);

    // Value: on this line, or — for "name / value / unit" layouts — the next
    // line if it is a standalone number.
    let value = extractNumber(line);
    let valueIdx = i;
    if (value === null) {
      const next = i + 1 < lines.length ? pureNumberLine(lines[i + 1]!) : null;
      value = next;
      valueIdx = i + 1;
    }
    if (value === null) continue;

    // Among all biomarkers whose needle matches this line, keep the single most
    // specific one (full-name match first, then longest needle) so one value is
    // never assigned to several markers.
    let pick: { cand: Candidate; needle: string; full: boolean } | null = null;
    for (const cand of candidates) {
      // Negative context: don't let generic haemoglobin match an HbA1c line.
      // "glycohemoglobin (hba1c)" has no word boundary before "a1c", so match
      // the a1c/glyco substrings directly rather than a bounded \ba1c\b.
      if (cand.bm.slug === 'hemoglobin' && /a1c|glyco/.test(nline)) continue;

      let matchedNeedle: string | null = null;
      for (const needle of cand.needles) {
        if (needle.length < 2) continue;
        // Whole-name match is strong; short alias must be word-bounded.
        if (needle.length <= 4) {
          const re = new RegExp(`(^|[^a-z0-9])${needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`);
          if (re.test(nline)) matchedNeedle = needle;
        } else if (nline.includes(needle)) {
          matchedNeedle = needle;
        }
        if (matchedNeedle) break;
      }
      if (!matchedNeedle) continue;

      const full = matchedNeedle === normalize(cand.bm.name);
      const better =
        !pick ||
        (full && !pick.full) ||
        (full === pick.full && matchedNeedle.length > pick.needle.length);
      if (better) pick = { cand, needle: matchedNeedle, full };
    }
    if (!pick) continue;

    const { cand, full } = pick;
    const inRange = value >= cand.bm.minPlausible && value <= cand.bm.maxPlausible;
    let confidence = full ? 0.85 : 0.6;
    if (inRange) confidence += 0.1;
    confidence = Math.min(confidence, 0.97);

    const existing = best.get(cand.bm.id);
    if (!existing || confidence > existing.confidence) {
      const range = extractRange(lines, valueIdx);
      best.set(cand.bm.id, {
        biomarkerId: cand.bm.id,
        biomarkerName: cand.bm.name,
        matchedName: cand.bm.name,
        value,
        unit: cand.bm.unit,
        confidence,
        include: confidence >= 0.6 && inRange,
        referenceRange: range?.raw ?? null,
        refLow: range?.low ?? null,
        refHigh: range?.high ?? null,
      });
    }
  }

  return [...best.values()].sort((a, b) => b.confidence - a.confidence);
}
