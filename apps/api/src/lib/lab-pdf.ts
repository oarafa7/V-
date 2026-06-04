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
};

function normalize(s: string): string {
  return s.toLowerCase().replace(/\s+/g, ' ').trim();
}

/** First number on a line, tolerant of commas and surrounding text. */
function extractNumber(line: string): number | null {
  const m = line.match(/(-?\d{1,3}(?:,\d{3})*(?:\.\d+)?|-?\d+(?:\.\d+)?)/);
  if (!m) return null;
  const n = Number(m[1]!.replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
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

  for (const line of lines) {
    const nline = normalize(line);
    const value = extractNumber(line);
    if (value === null) continue;

    for (const cand of candidates) {
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

      const inRange = value >= cand.bm.minPlausible && value <= cand.bm.maxPlausible;
      const isFullName = matchedNeedle === normalize(cand.bm.name);
      let confidence = isFullName ? 0.85 : 0.6;
      if (inRange) confidence += 0.1;
      confidence = Math.min(confidence, 0.97);

      const existing = best.get(cand.bm.id);
      if (!existing || confidence > existing.confidence) {
        best.set(cand.bm.id, {
          biomarkerId: cand.bm.id,
          biomarkerName: cand.bm.name,
          matchedName: cand.bm.name,
          value,
          unit: cand.bm.unit,
          confidence,
          include: confidence >= 0.6 && inRange,
        });
      }
    }
  }

  return [...best.values()].sort((a, b) => b.confidence - a.confidence);
}
