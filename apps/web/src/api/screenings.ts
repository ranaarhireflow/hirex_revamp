import { api } from './client';
import type { ScreenDetail, ScreenSummary } from '../types';

export interface CreateScreeningInput {
  jd_text: string;
  title?: string;
  files: File[];
}

export async function createScreening(input: CreateScreeningInput): Promise<ScreenDetail> {
  const fd = new FormData();
  fd.append('jd_text', input.jd_text);
  if (input.title && input.title.trim()) fd.append('title', input.title.trim());
  for (const file of input.files) fd.append('files', file);

  // Upload + in-memory extraction of many resumes can take a while; the scoring
  // itself runs in the background and is polled separately.
  const res = await api.post<ScreenDetail>('/screenings', fd, { timeout: 120_000 });
  return res.data;
}

export async function listScreenings(): Promise<ScreenSummary[]> {
  const res = await api.get<ScreenSummary[]>('/screenings');
  return res.data;
}

export async function getScreening(id: string): Promise<ScreenDetail> {
  const res = await api.get<ScreenDetail>(`/screenings/${id}`);
  return res.data;
}

export async function deleteScreening(id: string): Promise<void> {
  await api.delete(`/screenings/${id}`);
}
