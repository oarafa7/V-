/**
 * AI Health Intelligence — Anthropic integration (Phase 2).
 *
 * Builds a grounding context from the user's VITAL Score + biomarker results,
 * then calls Claude (official SDK) to generate clinician-style insights,
 * protocols, and chat replies. All output is wellness guidance, never a
 * diagnosis — the persona + disclaimer come from the admin-managed AiConfig.
 *
 * Every entry point is gated on config.enabled + the relevant feature flag +
 * the presence of ANTHROPIC_API_KEY, and throws `unprocessable` otherwise so
 * the feature degrades gracefully when unconfigured.
 */
import Anthropic from '@anthropic-ai/sdk';
import { type AiConfig } from '@vital/shared';
import { desc, eq } from 'drizzle-orm';

import { db } from '../db/client.js';
import { aiChatMessages, aiInsights } from '../db/schema.js';
import { env } from './env.js';
import { fail } from './http.js';
import { computeUserScore } from './score.js';

let client: Anthropic | null = null;
function anthropic(): Anthropic {
  if (!env.ANTHROPIC_API_KEY) {
    fail('unprocessable', 'AI is not configured on the server (missing API key).');
  }
  if (!client) client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  return client;
}

/** Assemble a compact, factual snapshot of the user's data for grounding. */
export async function buildUserContext(userId: string): Promise<string> {
  const score = await computeUserScore(userId);
  const lines: string[] = [];
  lines.push(`VITAL Score: ${score.score}/100 (${score.band}).`);
  if (score.biological_age != null && score.chronological_age != null) {
    lines.push(
      `Biological age: ${score.biological_age} vs chronological ${score.chronological_age} (${
        score.age_delta != null && score.age_delta <= 0 ? 'younger' : 'older'
      }).`,
    );
  }
  if (score.cardiometabolic_score != null) {
    lines.push(`Cardiometabolic sub-score: ${score.cardiometabolic_score}/100.`);
  }
  lines.push(
    `Coverage: ${score.tested_count} of ${score.total_count} markers tested (confidence ${score.confidence}%).`,
  );
  if (score.category_scores.length) {
    lines.push('Category scores:');
    for (const c of score.category_scores.filter((c) => c.tested > 0)) {
      lines.push(`  - ${c.name}: ${c.score}/100 (${c.tested}/${c.total} tested)`);
    }
  }
  if (score.drivers.negative.length) {
    lines.push('Markers needing attention:');
    for (const d of score.drivers.negative) lines.push(`  - ${d.name} (${d.category}): ${d.score}/100`);
  }
  if (score.drivers.positive.length) {
    lines.push('Strong markers:');
    for (const d of score.drivers.positive) lines.push(`  - ${d.name} (${d.category}): ${d.score}/100`);
  }
  return lines.join('\n');
}

function systemPrompt(config: AiConfig, context: string): string {
  return [
    config.persona,
    '',
    'Rules:',
    '- Ground every statement in the user data provided. Do not invent values.',
    '- Explain what each finding means and what is modifiable through lifestyle.',
    '- Never diagnose disease, name medications, or give dosages.',
    '- Be concise, warm, and specific. Use short paragraphs and bullet points.',
    `- End nothing with false certainty; this is guidance, not medical advice.`,
    '',
    'USER HEALTH DATA:',
    context,
  ].join('\n');
}

function textOf(message: Anthropic.Message): string {
  return message.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim();
}

interface GenerateResult {
  insights: { type: 'summary' | 'protocol'; title: string; body: string }[];
  inputTokens: number;
  outputTokens: number;
  model: string;
}

/** Generate a panel summary and (optionally) a protocol for the user. */
export async function generateInsights(userId: string, config: AiConfig): Promise<GenerateResult> {
  if (!config.enabled || !config.features.insights) {
    fail('unprocessable', 'AI insights are disabled.');
  }
  const context = await buildUserContext(userId);
  const wantProtocol = config.features.protocols;

  const instruction = [
    'Produce a JSON object with this exact shape and nothing else:',
    '{',
    '  "summary": { "title": string, "body": string },',
    wantProtocol ? '  "protocol": { "title": string, "body": string }' : '  "protocol": null',
    '}',
    'The "summary" explains the overall picture and the 2–3 most important findings.',
    wantProtocol
      ? 'The "protocol" gives 3–6 concrete, modifiable lifestyle actions tied to the findings.'
      : '',
    'Bodies are markdown. Do not wrap the JSON in code fences.',
  ]
    .filter(Boolean)
    .join('\n');

  const message = await anthropic().messages.create({
    model: config.model,
    max_tokens: config.max_tokens,
    thinking: { type: 'adaptive' },
    system: systemPrompt(config, context),
    messages: [{ role: 'user', content: instruction }],
  });

  const raw = textOf(message);
  let parsed: { summary?: { title: string; body: string }; protocol?: { title: string; body: string } | null };
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Fallback: treat the whole response as a single summary.
    parsed = { summary: { title: 'Health summary', body: raw } };
  }

  const insights: GenerateResult['insights'] = [];
  if (parsed.summary?.body) {
    insights.push({ type: 'summary', title: parsed.summary.title || 'Health summary', body: parsed.summary.body });
  }
  if (wantProtocol && parsed.protocol?.body) {
    insights.push({ type: 'protocol', title: parsed.protocol.title || 'Your protocol', body: parsed.protocol.body });
  }

  return {
    insights,
    inputTokens: message.usage.input_tokens,
    outputTokens: message.usage.output_tokens,
    model: config.model,
  };
}

/**
 * Generate insights and persist them. `source` records who triggered it;
 * `require_review` decides whether they start as drafts or are auto-published.
 */
export async function generateAndStoreInsights(
  userId: string,
  config: AiConfig,
  source: 'system' | 'admin' | 'user',
): Promise<number> {
  const result = await generateInsights(userId, config);
  if (result.insights.length === 0) return 0;
  const status = config.require_review ? 'draft' : 'published';
  const publishedAt = status === 'published' ? new Date() : null;
  await db.insert(aiInsights).values(
    result.insights.map((i) => ({
      userId,
      type: i.type,
      title: i.title,
      body: i.body,
      status,
      model: result.model,
      source,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      publishedAt,
    })),
  );
  return result.insights.length;
}

/** Grounded chat reply. Persists both the user message and the assistant reply. */
export async function chatReply(userId: string, userMessage: string, config: AiConfig): Promise<string> {
  if (!config.enabled || !config.features.chat) {
    fail('unprocessable', 'AI chat is disabled.');
  }
  const context = await buildUserContext(userId);

  // Last 10 messages for short-term continuity (oldest → newest).
  const history = await db
    .select({ role: aiChatMessages.role, content: aiChatMessages.content })
    .from(aiChatMessages)
    .where(eq(aiChatMessages.userId, userId))
    .orderBy(desc(aiChatMessages.createdAt))
    .limit(10);
  const ordered = history.reverse();

  const messages: Anthropic.MessageParam[] = [
    ...ordered.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user' as const, content: userMessage },
  ];

  const message = await anthropic().messages.create({
    model: config.model,
    max_tokens: config.max_tokens,
    thinking: { type: 'adaptive' },
    system: systemPrompt(config, context),
    messages,
  });
  const reply = textOf(message) || 'I could not generate a response. Please try again.';

  await db.insert(aiChatMessages).values([
    { userId, role: 'user', content: userMessage },
    {
      userId,
      role: 'assistant',
      content: reply,
      inputTokens: message.usage.input_tokens,
      outputTokens: message.usage.output_tokens,
    },
  ]);
  return reply;
}
