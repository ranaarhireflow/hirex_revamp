import { api } from './client';
import type {
  Difficulty,
  QuestionTemplate,
  QuestionType,
  RoleType,
  Round,
} from '../types';

export interface ListTemplatesParams {
  role_type?: RoleType;
  round?: Round;
  experience_level?: string;
}

export interface QuestionTemplateInput {
  role_type: RoleType;
  round: Round;
  question_text: string;
  question_type: QuestionType;
  difficulty?: Difficulty | string;
  experience_levels?: string[];
  rubric?: Record<string, unknown> | null;
}

export async function listTemplates(params: ListTemplatesParams = {}): Promise<QuestionTemplate[]> {
  const res = await api.get<QuestionTemplate[]>('/question-templates', { params });
  return res.data;
}

export async function createTemplate(payload: QuestionTemplateInput): Promise<QuestionTemplate> {
  const res = await api.post<QuestionTemplate>('/question-templates', payload);
  return res.data;
}

export async function updateTemplate(
  id: string,
  payload: Partial<QuestionTemplateInput>,
): Promise<QuestionTemplate> {
  const res = await api.patch<QuestionTemplate>(`/question-templates/${id}`, payload);
  return res.data;
}

export async function deleteTemplate(id: string): Promise<void> {
  await api.delete(`/question-templates/${id}`);
}
