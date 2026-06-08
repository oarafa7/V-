/**
 * Typed API client for the VITAL backend. Attaches the stored Bearer token,
 * normalises the error envelope into a thrown `ApiError`, and exposes a small
 * surface of typed endpoint helpers.
 */
import type {
  AiChatMessage,
  AiInsight,
  AiStatus,
  ApiError as ApiErrorEnvelope,
  AppContent,
  BiomarkerListResponse,
  BiomarkerWithResult,
  CreateResultInput,
  GoalsInput,
  HealthGoalOption,
  HealthProfileInput,
  LoginInput,
  RecommendedIntervention,
  ScoreHistoryPoint,
  SignupInput,
  SubscriptionPlan,
  SubscriptionWithPlan,
  User,
  UserBiomarkerResult,
  VitalScore,
} from '@vital/shared';

import { getAccessToken } from './auth';

const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  auth?: boolean; // default true
  query?: Record<string, string | number | undefined>;
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true, query } = opts;

  const url = new URL(`${BASE_URL}${path}`);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined) url.searchParams.set(k, String(v));
    }
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = await getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(url.toString(), {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const env = data as ApiErrorEnvelope | null;
    throw new ApiError(
      env?.error?.code ?? 'server_error',
      env?.error?.message ?? 'Something went wrong',
      res.status,
      env?.error?.details,
    );
  }

  return data as T;
}

// ── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  signup: (input: SignupInput) =>
    request<{ user: User; access_token: string | null; refresh_token: string | null }>(
      '/auth/signup',
      { method: 'POST', body: input, auth: false },
    ),
  login: (input: LoginInput) =>
    request<{ access_token: string; refresh_token: string; user_id: string }>('/auth/login', {
      method: 'POST',
      body: input,
      auth: false,
    }),
  logout: () => request<{ success: boolean }>('/auth/logout', { method: 'POST' }),
  resetPassword: (email: string) =>
    request<{ success: boolean }>('/auth/reset-password', {
      method: 'POST',
      body: { email },
      auth: false,
    }),
};

// ── Users ────────────────────────────────────────────────────────────────────
export const userApi = {
  me: () => request<{ user: User }>('/users/me'),
  updateHealthProfile: (input: HealthProfileInput) =>
    request<{ user: User }>('/users/me/health-profile', { method: 'PUT', body: input }),
  updateGoals: (input: GoalsInput) =>
    request<{ user: User }>('/users/me/goals', { method: 'PUT', body: input }),
};

// ── Subscriptions / payments ──────────────────────────────────────────────────
export const subscriptionApi = {
  plans: () => request<{ plans: SubscriptionPlan[] }>('/subscription-plans', { auth: false }),
  mine: () => request<{ subscription: SubscriptionWithPlan | null }>('/subscriptions/me'),
  initiatePayment: (planId: string) =>
    request<{
      payment_key: string;
      iframe_url: string;
      order_id: string;
      subscription_id: string;
      amount_egp: number;
    }>('/payments/initiate', { method: 'POST', body: { plan_id: planId } }),
};

// ── Biomarkers ────────────────────────────────────────────────────────────────
export const biomarkerApi = {
  list: (params?: { category?: string; search?: string; limit?: number; offset?: number }) =>
    request<BiomarkerListResponse>('/biomarkers', { query: params }),
  get: (id: string) => request<{ biomarker: BiomarkerWithResult }>(`/biomarkers/${id}`),
  categories: () =>
    request<{ categories: BiomarkerListResponse['categories'] }>('/biomarker-categories'),
};

// ── Public content ────────────────────────────────────────────────────────────
export const contentApi = {
  get: () => request<{ content: AppContent }>('/app-content', { auth: false }),
  goals: () => request<{ goals: HealthGoalOption[] }>('/health-goals', { auth: false }),
};

// ── VITAL Score ───────────────────────────────────────────────────────────────
export const scoreApi = {
  get: () => request<{ score: VitalScore }>('/score/me'),
  history: () => request<{ history: ScoreHistoryPoint[] }>('/score/me/history'),
};

// ── AI Health Intelligence ─────────────────────────────────────────────────────
export const aiApi = {
  status: () => request<{ status: AiStatus }>('/ai-status', { auth: false }),
  insights: () => request<{ insights: AiInsight[] }>('/ai/insights/me'),
  generate: () =>
    request<{ success: boolean; generated: number; pending_review: boolean }>(
      '/ai/insights/me/generate',
      { method: 'POST' },
    ),
  chatHistory: () => request<{ messages: AiChatMessage[] }>('/ai/chat/me'),
  sendChat: (message: string) =>
    request<{ reply: string }>('/ai/chat/me', { method: 'POST', body: { message } }),
};

// ── Recommendations (supplement / protocol guidance) ───────────────────────────
export const recommendationApi = {
  me: () => request<{ recommendations: RecommendedIntervention[] }>('/recommendations/me'),
};

// ── Results ───────────────────────────────────────────────────────────────────
export const resultApi = {
  all: () => request<{ results: UserBiomarkerResult[] }>('/results/me'),
  forBiomarker: (biomarkerId: string) =>
    request<{ results: UserBiomarkerResult[] }>(`/results/me/${biomarkerId}`),
  create: (input: CreateResultInput) =>
    request<{ result: UserBiomarkerResult }>('/results', { method: 'POST', body: input }),
  remove: (id: string) => request<{ success: boolean }>(`/results/${id}`, { method: 'DELETE' }),
};
