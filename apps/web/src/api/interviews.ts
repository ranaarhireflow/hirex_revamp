import { api } from './client';
import type {
  ExperienceLevel,
  GeneratedQuestion,
  Interview,
  InterviewSummary,
  Language,
  QuestionType,
  RoleType,
  RoleVariant,
  Round,
  Tone,
} from '../types';

export interface CustomQuestionInput {
  question_text: string;
  question_type: QuestionType;
  time_minutes?: number;
}

export interface CreateInterviewInput {
  candidate_email: string;
  candidate_name?: string;
  role_type: RoleType;
  role_variant: RoleVariant;
  jd_text: string;
  current_round: Round;
  duration_limit_seconds: number;
  question_limit: number;
  custom_instructions?: string;
  tone: Tone;
  language: Language;
  experience_level: ExperienceLevel | string;
  years_experience?: number | null;
  template_ids: string[];
  custom_questions: CustomQuestionInput[];
  resume?: File;
}

export async function createInterview(input: CreateInterviewInput): Promise<Interview> {
  const fd = new FormData();
  fd.append('candidate_email', input.candidate_email);
  if (input.candidate_name) fd.append('candidate_name', input.candidate_name);
  fd.append('role_type', input.role_type);
  fd.append('role_variant', input.role_variant);
  fd.append('jd_text', input.jd_text);
  fd.append('current_round', input.current_round);
  fd.append('duration_limit_seconds', String(input.duration_limit_seconds));
  fd.append('question_limit', String(input.question_limit));
  if (input.custom_instructions) fd.append('custom_instructions', input.custom_instructions);
  fd.append('tone', input.tone);
  fd.append('language', input.language);
  fd.append('experience_level', input.experience_level);
  if (input.years_experience != null) fd.append('years_experience', String(input.years_experience));
  fd.append('template_ids_json', JSON.stringify(input.template_ids));
  fd.append('custom_questions_json', JSON.stringify(input.custom_questions));
  if (input.resume) fd.append('resume', input.resume);

  const res = await api.post<Interview>('/interviews', fd);
  return res.data;
}

export async function listInterviews(): Promise<InterviewSummary[]> {
  const res = await api.get<InterviewSummary[]>('/interviews');
  return res.data;
}

export async function getInterview(id: string): Promise<Interview> {
  const res = await api.get<Interview>(`/interviews/${id}`);
  return res.data;
}

export interface GenerateQuestionsInput {
  role_type: RoleType;
  round: Round;
  experience_level: ExperienceLevel | string;
  years_experience?: number | null;
  jd_text: string;
  resume_text?: string | null;
  custom_instructions?: string | null;
  count?: number;
}

export async function generateQuestions(
  input: GenerateQuestionsInput,
): Promise<GeneratedQuestion[]> {
  const res = await api.post<{ questions: GeneratedQuestion[] }>(
    '/interviews/generate-questions',
    {
      role_type: input.role_type,
      round: input.round,
      experience_level: input.experience_level,
      years_experience: input.years_experience ?? null,
      jd_text: input.jd_text,
      resume_text: input.resume_text ?? null,
      custom_instructions: input.custom_instructions ?? null,
      count: input.count ?? 6,
    },
    { timeout: 60_000 },
  );
  return res.data.questions;
}
