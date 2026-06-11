export type RoleType =
  | 'backend'
  | 'frontend'
  | 'fullstack'
  | 'data'
  | 'ml'
  | 'devops'
  | 'product'
  | 'hr';
export type RoleVariant = 'marquee' | 'new';
export type Round = 'R1' | 'R2' | 'R3';
export type InterviewStatus =
  | 'created'
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'expired';
export type QuestionType = 'behavioural' | 'technical' | 'coding' | 'system_design';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type Tone = 'professional' | 'friendly' | 'tough';
export type Language = 'english' | 'hinglish';
export type ExperienceLevel = 'fresher' | 'junior' | 'mid' | 'senior' | 'lead' | 'staff';

export interface InterviewSummary {
  id: string;
  candidate_email: string;
  candidate_name: string | null;
  role_type: RoleType;
  current_round: Round;
  experience_level: ExperienceLevel | string;
  status: InterviewStatus;
  created_at: string;
}

export interface QuestionInInterview {
  id: string;
  order_index: number;
  question_text: string;
  question_type: QuestionType;
  round: Round;
  generated_by: 'template' | 'llm';
  time_minutes: number;
}

export interface Interview extends InterviewSummary {
  role_variant: RoleVariant;
  jd_text: string;
  resume_url: string | null;
  duration_limit_seconds: number;
  question_limit: number;
  custom_instructions: string | null;
  tone: Tone;
  language: Language;
  years_experience: number | null;
  candidate_token: string;
  candidate_url: string;
  updated_at: string;
  questions: QuestionInInterview[];
}

export interface QuestionTemplate {
  id: string;
  role_type: RoleType;
  round: Round;
  question_text: string;
  question_type: QuestionType;
  difficulty: Difficulty | string;
  experience_levels: string[];
  time_minutes: number;
  rubric: Record<string, unknown> | null;
  is_starter: boolean;
  created_at: string;
  updated_at: string;
}

export interface GeneratedQuestion {
  question_text: string;
  question_type: QuestionType;
  difficulty: Difficulty | string;
  experience_levels: string[];
  time_minutes: number;
}

// Default time-in-minutes by question type — used for custom (one-off) questions
// the recruiter types inline that don't have an AI-assigned estimate.
export const DEFAULT_MINUTES_BY_TYPE: Record<QuestionType, number> = {
  behavioural: 4,
  technical: 6,
  coding: 12,
  system_design: 12,
};

export const ROLE_TYPES: { value: RoleType; label: string }[] = [
  { value: 'backend', label: 'Backend Engineer' },
  { value: 'frontend', label: 'Frontend Engineer' },
  { value: 'fullstack', label: 'Full-Stack Engineer' },
  { value: 'data', label: 'Data Engineer / Analyst' },
  { value: 'ml', label: 'ML / AI Engineer' },
  { value: 'devops', label: 'DevOps / SRE' },
  { value: 'product', label: 'Product Manager' },
  { value: 'hr', label: 'HR / Behavioural' },
];

export const ROLE_LABEL: Record<RoleType, string> = Object.fromEntries(
  ROLE_TYPES.map((r) => [r.value, r.label]),
) as Record<RoleType, string>;

export const ROUNDS: { value: Round; label: string }[] = [
  { value: 'R1', label: 'R1 — Screening' },
  { value: 'R2', label: 'R2 — Deep technical' },
  { value: 'R3', label: 'R3 — Behavioural' },
];

export const QUESTION_TYPES: { value: QuestionType; label: string }[] = [
  { value: 'behavioural', label: 'Behavioural' },
  { value: 'technical', label: 'Technical' },
  { value: 'coding', label: 'Coding' },
  { value: 'system_design', label: 'System design' },
];

export const TONES: { value: Tone; label: string; description: string }[] = [
  { value: 'professional', label: 'Professional', description: 'Neutral, business-formal' },
  { value: 'friendly', label: 'Friendly', description: 'Warm, conversational' },
  { value: 'tough', label: 'Tough', description: 'Probes hard on vague answers' },
];

export const LANGUAGES: { value: Language; label: string }[] = [
  { value: 'english', label: 'English' },
  { value: 'hinglish', label: 'Hinglish (English + Hindi mix)' },
];

export const EXPERIENCE_LEVELS: { value: ExperienceLevel; label: string; hint: string }[] = [
  { value: 'fresher', label: 'Fresher', hint: '0 yrs — fundamentals, projects, reasoning' },
  { value: 'junior', label: 'Junior', hint: '1–3 yrs — hands-on, single end-to-end project' },
  { value: 'mid', label: 'Mid-level', hint: '3–6 yrs — production ownership, system tradeoffs' },
  { value: 'senior', label: 'Senior', hint: '6–10 yrs — multi-service systems, technical leadership' },
  { value: 'lead', label: 'Lead', hint: '8+ yrs leading — people, strategy, prioritization' },
  { value: 'staff', label: 'Staff / Principal', hint: '10+ yrs — org-level technical scope' },
];

export const EXPERIENCE_LABEL: Record<ExperienceLevel, string> = Object.fromEntries(
  EXPERIENCE_LEVELS.map((e) => [e.value, e.label]),
) as Record<ExperienceLevel, string>;

export const QUESTION_TYPE_COLOR: Record<QuestionType, string> = {
  behavioural: 'cyan',
  technical: 'blue',
  coding: 'purple',
  system_design: 'magenta',
};

export const DIFFICULTY_COLOR: Record<string, string> = {
  easy: 'green',
  medium: 'gold',
  hard: 'red',
};

// ----------------------------------------------------------------------------
// Resume screening
// ----------------------------------------------------------------------------

export type ScreenStatus = 'processing' | 'completed' | 'failed';
export type CandidateStatus = 'pending' | 'scored' | 'failed';
export type Verdict = 'strong_match' | 'possible' | 'weak';

export interface ScreenCandidate {
  id: string;
  file_name: string;
  candidate_name: string | null;
  match_score: number | null;
  verdict: Verdict | null;
  summary: string | null;
  strengths: string[];
  opportunities: string[];
  status: CandidateStatus;
  error: string | null;
  created_at: string;
}

export interface ScreenSummary {
  id: string;
  title: string;
  status: ScreenStatus;
  candidate_count: number;
  scored_count: number;
  top_score: number | null;
  created_at: string;
}

export interface ScreenDetail extends ScreenSummary {
  jd_text: string;
  updated_at: string;
  candidates: ScreenCandidate[];
}

export const VERDICT_LABEL: Record<Verdict, string> = {
  strong_match: 'Strong match',
  possible: 'Possible',
  weak: 'Weak',
};

export const VERDICT_COLOR: Record<Verdict, string> = {
  strong_match: 'green',
  possible: 'gold',
  weak: 'red',
};

/** Hex colour for a match score, banded to match VERDICT_COLOR. */
export function scoreColor(score: number | null | undefined): string {
  if (score == null) return '#8c8c8c';
  if (score >= 75) return '#52c41a';
  if (score >= 50) return '#faad14';
  return '#ff4d4f';
}
