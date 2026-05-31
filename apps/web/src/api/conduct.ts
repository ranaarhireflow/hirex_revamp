import { api } from './client';

export interface FollowUpHistoryEntry {
  q: string;
  a?: string;
  asked_at?: string;
}

export interface QuestionConduct {
  id: string;
  order_index: number;
  question_text: string;
  question_type: 'behavioural' | 'technical' | 'coding' | 'system_design';
  round: 'R1' | 'R2' | 'R3';
  generated_by: string;
  time_minutes: number;
  expected_answer: string | null;
  evaluation_checklist: string[];
  default_follow_ups: string[];
  conduct_status: 'pending' | 'asked' | 'skipped' | 'done';
  score: number | null;
  notes: string | null;
  coverage: string[];
  follow_up_history: FollowUpHistoryEntry[];
}

export interface ConductState {
  interview_id: string;
  candidate_name: string | null;
  candidate_email: string;
  role_type: string;
  current_round: 'R1' | 'R2' | 'R3';
  experience_level: string;
  custom_instructions: string | null;
  tone: string;
  language: string;
  duration_limit_seconds: number;
  question_limit: number;
  status: string;
  questions: QuestionConduct[];
}

export interface ResponseUpsertInput {
  score?: number | null;
  notes?: string | null;
  coverage?: string[];
  follow_up_history?: FollowUpHistoryEntry[];
  conduct_status?: 'asked' | 'skipped' | 'done';
}

export interface FinalizeReport {
  interview_id: string;
  overall_score: number;
  recommendation: 'strong_hire' | 'hire' | 'no_hire' | 'strong_no_hire';
  advance_to_next_round: boolean;
  advance_reasoning: string;
  strengths: string[];
  concerns: string[];
  per_question_summary: { order_index: number; score: number; summary: string }[];
}

export async function getConductState(interviewId: string): Promise<ConductState> {
  const res = await api.get<ConductState>(`/interviews/${interviewId}/conduct`);
  return res.data;
}

export async function startConducting(interviewId: string): Promise<ConductState> {
  const res = await api.post<ConductState>(
    `/interviews/${interviewId}/conduct/start`,
    undefined,
    { timeout: 120_000 },
  );
  return res.data;
}

export async function upsertResponse(
  questionId: string,
  payload: ResponseUpsertInput,
): Promise<QuestionConduct> {
  const res = await api.patch<QuestionConduct>(`/questions/${questionId}/response`, payload);
  return res.data;
}

export async function generateFollowUp(
  questionId: string,
  payload: { notes?: string | null; coverage?: string[] },
): Promise<string> {
  const res = await api.post<{ follow_up: string }>(`/questions/${questionId}/follow-up`, payload, {
    timeout: 30_000,
  });
  return res.data.follow_up;
}

export async function finalizeInterview(interviewId: string): Promise<FinalizeReport> {
  const res = await api.post<FinalizeReport>(
    `/interviews/${interviewId}/conduct/finalize`,
    undefined,
    { timeout: 90_000 },
  );
  return res.data;
}

export interface GenerateMoreInput {
  count: number;
  focus?: string;
}

export async function generateMoreQuestions(
  interviewId: string,
  payload: GenerateMoreInput,
): Promise<ConductState> {
  const res = await api.post<ConductState>(
    `/interviews/${interviewId}/conduct/generate-more`,
    payload,
    { timeout: 120_000 },
  );
  return res.data;
}
