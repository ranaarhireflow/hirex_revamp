import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  App as AntApp,
  Button,
  Card,
  Checkbox,
  Collapse,
  Divider,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Spin,
  Tag,
  Tooltip,
  Typography,
  Upload,
} from 'antd';
import {
  DeleteOutlined,
  PlusOutlined,
  ThunderboltOutlined,
  UploadOutlined,
  RobotOutlined,
} from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createInterview, generateQuestions } from '../api/interviews';
import type { CustomQuestionInput } from '../api/interviews';
import { createTemplate, listTemplates } from '../api/question-templates';
import {
  DEFAULT_MINUTES_BY_TYPE,
  DIFFICULTY_COLOR,
  EXPERIENCE_LEVELS,
  LANGUAGES,
  QUESTION_TYPES,
  QUESTION_TYPE_COLOR,
  ROLE_TYPES,
  ROUNDS,
  TONES,
} from '../types';
import type {
  ExperienceLevel,
  GeneratedQuestion,
  Language,
  Round,
  RoleType,
  RoleVariant,
  Tone,
} from '../types';
import TimeBadge from '../components/TimeBadge';
import BudgetMeter from '../components/BudgetMeter';
import PageHeader from '../components/PageHeader';

const { Text } = Typography;

interface FormValues {
  candidate_email: string;
  candidate_name?: string;
  role_type: RoleType;
  role_variant: RoleVariant;
  jd_text: string;
  current_round: Round;
  experience_level: ExperienceLevel;
  years_experience?: number;
  duration_minutes: number;
  custom_instructions?: string;
  tone: Tone;
  language: Language;
}

export default function InterviewCreate() {
  const [form] = Form.useForm<FormValues>();
  const { message } = AntApp.useApp();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const roleType = Form.useWatch('role_type', form) ?? 'backend';
  const round = Form.useWatch('current_round', form) ?? 'R1';
  const experienceLevel = Form.useWatch('experience_level', form) ?? 'mid';
  const durationMinutes = Form.useWatch('duration_minutes', form) ?? 30;

  const [resumeFiles, setResumeFiles] = useState<UploadFile[]>([]);
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<Set<string>>(new Set());
  const [generated, setGenerated] = useState<GeneratedQuestion[]>([]);
  const [selectedGenerated, setSelectedGenerated] = useState<Set<number>>(new Set());
  const [saveGeneratedToBank, setSaveGeneratedToBank] = useState(true);
  const [customQuestions, setCustomQuestions] = useState<CustomQuestionInput[]>([]);

  const { data: templates, isLoading: templatesLoading } = useQuery({
    queryKey: ['question-templates', roleType, round, experienceLevel],
    queryFn: () =>
      listTemplates({ role_type: roleType, round, experience_level: experienceLevel }),
  });

  // When role / round / experience changes, default to selecting questions
  // until we approximately fill the budget (greedy, in template order).
  useEffect(() => {
    if (!templates) return;
    const ids = new Set<string>();
    let total = 0;
    for (const t of templates) {
      if (total + t.time_minutes > durationMinutes) break;
      ids.add(t.id);
      total += t.time_minutes;
    }
    setSelectedTemplateIds(ids);
  }, [templates, durationMinutes]);

  // ----- running totals --------------------------------------------------
  const selectedTemplates = useMemo(
    () => (templates ?? []).filter((t) => selectedTemplateIds.has(t.id)),
    [templates, selectedTemplateIds],
  );
  const selectedGeneratedQs = useMemo(
    () => generated.filter((_, i) => selectedGenerated.has(i)),
    [generated, selectedGenerated],
  );
  const customMinutes = useMemo(
    () =>
      customQuestions
        .filter((q) => q.question_text.trim())
        .reduce(
          (acc, q) => acc + (q.time_minutes ?? DEFAULT_MINUTES_BY_TYPE[q.question_type]),
          0,
        ),
    [customQuestions],
  );
  const totalMinutes =
    selectedTemplates.reduce((a, t) => a + t.time_minutes, 0) +
    selectedGeneratedQs.reduce((a, g) => a + (g.time_minutes ?? 5), 0) +
    customMinutes;
  const totalQuestions =
    selectedTemplates.length + selectedGeneratedQs.length + customQuestions.filter((q) => q.question_text.trim()).length;

  // ----- mutations -------------------------------------------------------
  const generateMut = useMutation({
    mutationFn: async () => {
      const valid = await form
        .validateFields(['role_type', 'current_round', 'experience_level', 'jd_text'])
        .catch(() => null);
      if (!valid) throw new Error('Fill role, round, experience, and JD first.');
      const v = form.getFieldsValue();
      const remainingBudget = Math.max(durationMinutes - totalMinutes, 6);
      const targetCount = Math.max(2, Math.min(8, Math.round(remainingBudget / 6)));
      return generateQuestions({
        role_type: v.role_type,
        round: v.current_round,
        experience_level: v.experience_level,
        years_experience: v.years_experience ?? null,
        jd_text: v.jd_text,
        custom_instructions: v.custom_instructions ?? null,
        count: targetCount,
      });
    },
    onSuccess: (qs) => {
      message.success(`AI generated ${qs.length} questions`);
      setGenerated(qs);
      setSelectedGenerated(new Set(qs.map((_, i) => i)));
    },
    onError: (err: unknown) => {
      const detail =
        (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
      const msg = typeof detail === 'string' ? detail : (err as Error).message ?? 'Generation failed';
      message.error(msg);
    },
  });

  const createMut = useMutation({
    mutationFn: async (values: FormValues) => {
      const chosenGenerated = generated.filter((_, i) => selectedGenerated.has(i));
      const interview = await createInterview({
        candidate_email: values.candidate_email,
        candidate_name: values.candidate_name,
        role_type: values.role_type,
        role_variant: values.role_variant,
        jd_text: values.jd_text,
        current_round: values.current_round,
        duration_limit_seconds: values.duration_minutes * 60,
        // No longer recruiter-set; auto-derive a generous cap so the backend
        // never rejects on count. The budget meter is the real signal.
        question_limit: 20,
        custom_instructions: values.custom_instructions,
        tone: values.tone,
        language: values.language,
        experience_level: values.experience_level,
        years_experience: values.years_experience ?? null,
        template_ids: Array.from(selectedTemplateIds),
        custom_questions: [
          ...chosenGenerated.map((g) => ({
            question_text: g.question_text,
            question_type: g.question_type,
            time_minutes: g.time_minutes,
          })),
          ...customQuestions
            .filter((q) => q.question_text.trim())
            .map((q) => ({
              ...q,
              time_minutes: q.time_minutes ?? DEFAULT_MINUTES_BY_TYPE[q.question_type],
            })),
        ],
        resume: resumeFiles[0]?.originFileObj as File | undefined,
      });

      if (saveGeneratedToBank && chosenGenerated.length > 0) {
        await Promise.allSettled(
          chosenGenerated.map((g) =>
            createTemplate({
              role_type: values.role_type,
              round: values.current_round,
              question_text: g.question_text,
              question_type: g.question_type,
              difficulty: typeof g.difficulty === 'string' ? g.difficulty : 'medium',
              experience_levels: g.experience_levels,
              time_minutes: g.time_minutes,
            }),
          ),
        );
        qc.invalidateQueries({ queryKey: ['question-templates'] });
      }
      return interview;
    },
    onSuccess: (interview) => {
      message.success('Interview created');
      qc.invalidateQueries({ queryKey: ['interviews'] });
      navigate(`/recruiter/${interview.id}`);
    },
    onError: (err: unknown) => {
      const detail =
        (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
      const msg = typeof detail === 'string' ? detail : (err as Error).message ?? 'Create failed';
      message.error(msg);
    },
  });

  const uploadProps: UploadProps = {
    accept: '.pdf,.txt,.md',
    maxCount: 1,
    fileList: resumeFiles,
    beforeUpload: () => false,
    onChange: ({ fileList }) => setResumeFiles(fileList.slice(-1)),
    onRemove: () => setResumeFiles([]),
  };

  // ----- handlers --------------------------------------------------------
  const toggleTemplate = (id: string) =>
    setSelectedTemplateIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleGenerated = (idx: number) =>
    setSelectedGenerated((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });

  const addCustomQuestion = () =>
    setCustomQuestions((p) => [...p, { question_text: '', question_type: 'behavioural' }]);
  const updateCustomQuestion = (idx: number, patch: Partial<CustomQuestionInput>) =>
    setCustomQuestions((p) => p.map((q, i) => (i === idx ? { ...q, ...patch } : q)));
  const removeCustomQuestion = (idx: number) =>
    setCustomQuestions((p) => p.filter((_, i) => i !== idx));

  const overBudget = totalMinutes > durationMinutes;

  // ----- render ----------------------------------------------------------
  return (
    <Form<FormValues>
      form={form}
      layout="vertical"
      initialValues={{
        role_type: 'backend',
        role_variant: 'marquee',
        current_round: 'R1',
        experience_level: 'mid',
        duration_minutes: 30,
        tone: 'professional',
        language: 'english',
      }}
      onFinish={(v) => createMut.mutate(v)}
    >
      <PageHeader
        title="New interview"
        description="Configure the interview, let AI build a tailored question set, then share the candidate link."
      />

      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        {/* ------- Candidate + Role ------- */}
        <Card>
          <Space size="middle" style={{ width: '100%' }} wrap>
            <Form.Item label="Candidate name" name="candidate_name" style={{ flex: 1, minWidth: 240, marginBottom: 0 }}>
              <Input placeholder="Asha Iyer" />
            </Form.Item>
            <Form.Item
              label="Email"
              name="candidate_email"
              rules={[{ required: true, type: 'email' }]}
              style={{ flex: 1, minWidth: 240, marginBottom: 0 }}
            >
              <Input placeholder="candidate@example.com" />
            </Form.Item>
          </Space>

          <Divider style={{ margin: '20px 0' }} />

          <Space size="middle" style={{ width: '100%' }} wrap>
            <Form.Item label="Role" name="role_type" rules={[{ required: true }]} style={{ minWidth: 220, marginBottom: 0 }}>
              <Select options={ROLE_TYPES} />
            </Form.Item>
            <Form.Item
              label={
                <Tooltip title="Calibrates the questions. A senior won't get fresher fundamentals.">
                  <span>Experience level</span>
                </Tooltip>
              }
              name="experience_level"
              rules={[{ required: true }]}
              style={{ minWidth: 220, marginBottom: 0 }}
            >
              <Select
                optionLabelProp="label"
                options={EXPERIENCE_LEVELS.map((e) => ({ value: e.value, label: e.label, hint: e.hint }))}
                optionRender={(option) => (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span>{option.data.label}</span>
                    <Text type="secondary" style={{ fontSize: 12 }}>{option.data.hint}</Text>
                  </div>
                )}
              />
            </Form.Item>
            <Form.Item label="Round" name="current_round" rules={[{ required: true }]} style={{ minWidth: 180, marginBottom: 0 }}>
              <Select options={ROUNDS} />
            </Form.Item>
            <Form.Item
              label={
                <Tooltip title="Total interview duration. AI picks questions whose time-estimates fit this budget.">
                  <span>Duration (min)</span>
                </Tooltip>
              }
              name="duration_minutes"
              rules={[{ required: true }]}
              style={{ marginBottom: 0 }}
            >
              <InputNumber min={5} max={180} step={5} style={{ width: 130 }} />
            </Form.Item>
          </Space>
        </Card>

        {/* ------- JD ------- */}
        <Card>
          <Form.Item
            label="Job description"
            name="jd_text"
            rules={[{ required: true, min: 20, message: 'At least 20 characters of JD.' }]}
            style={{ marginBottom: 16 }}
          >
            <Input.TextArea rows={6} placeholder="Paste the JD here…" />
          </Form.Item>

          <Form.Item label="Resume (PDF / text — optional but improves AI generation)" style={{ marginBottom: 0 }}>
            <Upload {...uploadProps}>
              <Button icon={<UploadOutlined />}>Select file</Button>
            </Upload>
          </Form.Item>
        </Card>

        {/* ------- Custom instructions (visible by default; key feature) ------- */}
        <Card>
          <Form.Item
            label="Custom instructions for the AI"
            name="custom_instructions"
            extra={
              <Text style={{ fontSize: 12, color: 'var(--hx-text-3)' }}>
                Steers both question generation and the AI's live behaviour. e.g. <Text italic>"Probe deeply on Postgres internals — candidate claims 8 years."</Text>
              </Text>
            }
            style={{ marginBottom: 0 }}
          >
            <Input.TextArea rows={3} placeholder="Optional but powerful — guides what the AI focuses on." />
          </Form.Item>
        </Card>

        {/* ------- Advanced (collapsed) ------- */}
        <Collapse
          ghost
          items={[
            {
              key: 'advanced',
              label: <span style={{ fontWeight: 500, color: 'var(--hx-text-2)' }}>Advanced</span>,
              children: (
                <Card>
                  <Space size="middle" style={{ width: '100%' }} wrap>
                    <Form.Item label="Variant" name="role_variant" style={{ minWidth: 200, marginBottom: 0 }}>
                      <Select
                        options={[
                          { value: 'marquee', label: 'Marquee (pre-built pool)' },
                          { value: 'new', label: 'New (generate on the fly)' },
                        ]}
                      />
                    </Form.Item>
                    <Form.Item label="Years (optional)" name="years_experience" style={{ marginBottom: 0 }}>
                      <InputNumber min={0} max={40} style={{ width: 120 }} />
                    </Form.Item>
                    <Form.Item label="Tone" name="tone" style={{ minWidth: 200, marginBottom: 0 }}>
                      <Select
                        optionLabelProp="label"
                        options={TONES.map((t) => ({ value: t.value, label: t.label, description: t.description }))}
                        optionRender={(option) => (
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span>{option.data.label}</span>
                            <Text type="secondary" style={{ fontSize: 12 }}>{option.data.description}</Text>
                          </div>
                        )}
                      />
                    </Form.Item>
                    <Form.Item label="Language" name="language" style={{ minWidth: 200, marginBottom: 0 }}>
                      <Select options={LANGUAGES} />
                    </Form.Item>
                  </Space>
                </Card>
              ),
            },
          ]}
        />

        {/* ------- Budget meter ------- */}
        <BudgetMeter used={totalMinutes} budget={durationMinutes} count={totalQuestions} />

        {/* ------- Question picker ------- */}
        <Card>
          {/* AI Generate CTA */}
          <div style={generateCtaStyle}>
            <Space align="start">
              <RobotOutlined style={{ fontSize: 22, color: 'var(--hx-accent)', marginTop: 2 }} />
              <Space direction="vertical" size={0}>
                <Text strong>Generate questions with AI</Text>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  Uses JD + role + experience + custom instructions. Time-budgets each question.
                </Text>
              </Space>
            </Space>
            <Button
              type="primary"
              icon={<ThunderboltOutlined />}
              loading={generateMut.isPending}
              onClick={() => generateMut.mutate()}
            >
              Generate
            </Button>
          </div>

          {/* AI-generated section */}
          {generated.length > 0 && (
            <>
              <Divider style={{ margin: '16px 0' }} />
              <Space style={{ marginBottom: 8, width: '100%', justifyContent: 'space-between' }}>
                <Text strong>
                  <RobotOutlined style={{ color: 'var(--hx-ai)' }} /> AI-generated for this candidate
                </Text>
                <Checkbox checked={saveGeneratedToBank} onChange={(e) => setSaveGeneratedToBank(e.target.checked)}>
                  Save selected to bank
                </Checkbox>
              </Space>
              <Space direction="vertical" style={{ width: '100%' }}>
                {generated.map((g, i) => {
                  const checked = selectedGenerated.has(i);
                  return (
                    <QuestionPickRow
                      key={i}
                      checked={checked}
                      onToggle={() => toggleGenerated(i)}
                      text={g.question_text}
                      questionType={g.question_type}
                      difficulty={String(g.difficulty)}
                      timeMinutes={g.time_minutes}
                      aiGenerated
                    />
                  );
                })}
              </Space>
            </>
          )}

          <Divider style={{ margin: '16px 0' }} />

          {/* Bank section */}
          <Space style={{ marginBottom: 8, width: '100%', justifyContent: 'space-between' }}>
            <Text strong>From your bank</Text>
            <Space>
              <Text type="secondary" style={{ fontSize: 13 }}>
                {roleType} · {round} · {experienceLevel}
              </Text>
              <Button
                size="small"
                onClick={() => setSelectedTemplateIds(new Set((templates ?? []).map((t) => t.id)))}
              >
                All
              </Button>
              <Button size="small" onClick={() => setSelectedTemplateIds(new Set())}>
                None
              </Button>
            </Space>
          </Space>

          {overBudget && (
            <Alert
              type="warning"
              showIcon
              style={{ marginBottom: 12 }}
              message={`${totalMinutes - durationMinutes} min over the ${durationMinutes}-min budget. Deselect some questions or extend the duration.`}
            />
          )}

          {templatesLoading ? (
            <Spin />
          ) : (templates ?? []).length === 0 ? (
            <Alert
              type="info"
              showIcon
              message={`No bank questions for ${roleType} · ${round} · ${experienceLevel}. Use AI generation above, or add to the Question bank.`}
            />
          ) : (
            <Space direction="vertical" style={{ width: '100%' }}>
              {(templates ?? []).map((t) => {
                const checked = selectedTemplateIds.has(t.id);
                return (
                  <QuestionPickRow
                    key={t.id}
                    checked={checked}
                    onToggle={() => toggleTemplate(t.id)}
                    text={t.question_text}
                    questionType={t.question_type}
                    difficulty={t.difficulty}
                    timeMinutes={t.time_minutes}
                    isStarter={t.is_starter}
                  />
                );
              })}
            </Space>
          )}
        </Card>

        {/* ------- Custom one-off questions ------- */}
        <Card
          title={<Text strong>Custom one-off questions</Text>}
          extra={
            <Button icon={<PlusOutlined />} size="small" onClick={addCustomQuestion}>
              Add
            </Button>
          }
        >
          {customQuestions.length === 0 ? (
            <Text type="secondary" style={{ fontSize: 13 }}>
              One-off questions only this candidate will get. They won't be saved to the bank.
            </Text>
          ) : (
            <Space direction="vertical" style={{ width: '100%' }}>
              {customQuestions.map((q, idx) => (
                <Space.Compact key={idx} style={{ width: '100%' }}>
                  <Input
                    placeholder="Question text…"
                    value={q.question_text}
                    onChange={(e) => updateCustomQuestion(idx, { question_text: e.target.value })}
                  />
                  <Select
                    style={{ width: 160 }}
                    value={q.question_type}
                    onChange={(v) => updateCustomQuestion(idx, { question_type: v })}
                    options={QUESTION_TYPES}
                  />
                  <InputNumber
                    min={2}
                    max={20}
                    style={{ width: 80 }}
                    value={q.time_minutes ?? DEFAULT_MINUTES_BY_TYPE[q.question_type]}
                    onChange={(v) => updateCustomQuestion(idx, { time_minutes: typeof v === 'number' ? v : undefined })}
                    addonAfter="m"
                  />
                  <Button icon={<DeleteOutlined />} danger onClick={() => removeCustomQuestion(idx)} />
                </Space.Compact>
              ))}
            </Space>
          )}
        </Card>

        {/* ------- Submit ------- */}
        <Card>
          <Space style={{ justifyContent: 'space-between', width: '100%' }} wrap>
            <Space direction="vertical" size={0}>
              <Text>
                Sending to <Text strong>{form.getFieldValue('candidate_email') || 'candidate'}</Text>
              </Text>
              <Text type="secondary" style={{ fontSize: 13 }}>
                {totalQuestions} questions · {totalMinutes} / {durationMinutes} min · {experienceLevel}
              </Text>
            </Space>
            <Button type="primary" size="large" htmlType="submit" loading={createMut.isPending}>
              Create interview
            </Button>
          </Space>
        </Card>
      </Space>
    </Form>
  );
}

// ----------------------------------------------------------------------------
// QuestionPickRow — used for both bank templates and AI-generated questions.
// Clickable card with checkbox + question text + tag row including time badge.
// ----------------------------------------------------------------------------

function QuestionPickRow({
  checked,
  onToggle,
  text,
  questionType,
  difficulty,
  timeMinutes,
  aiGenerated,
  isStarter,
}: {
  checked: boolean;
  onToggle: () => void;
  text: string;
  questionType: keyof typeof QUESTION_TYPE_COLOR;
  difficulty: string;
  timeMinutes: number;
  aiGenerated?: boolean;
  isStarter?: boolean;
}) {
  return (
    <div
      onClick={onToggle}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        padding: '12px 14px',
        border: '1px solid',
        borderColor: checked ? 'var(--hx-accent)' : 'var(--hx-border-soft)',
        background: checked ? 'var(--hx-accent-bg)' : 'transparent',
        borderRadius: 8,
        cursor: 'pointer',
        transition: 'all 120ms ease-out',
      }}
      onMouseEnter={(e) => {
        if (!checked) {
          e.currentTarget.style.borderColor = 'var(--hx-border)';
          e.currentTarget.style.background = 'var(--hx-surface-2)';
        }
      }}
      onMouseLeave={(e) => {
        if (!checked) {
          e.currentTarget.style.borderColor = 'var(--hx-border-soft)';
          e.currentTarget.style.background = 'transparent';
        }
      }}
    >
      <Checkbox checked={checked} onChange={onToggle} style={{ marginTop: 2 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ marginBottom: 6 }}>{text}</div>
        <Space size={6} wrap>
          <Tag color={QUESTION_TYPE_COLOR[questionType]} style={{ marginInlineEnd: 0 }}>
            {questionType.replace('_', ' ')}
          </Tag>
          <Tag color={DIFFICULTY_COLOR[difficulty] ?? 'default'} style={{ marginInlineEnd: 0 }}>
            {difficulty}
          </Tag>
          <TimeBadge minutes={timeMinutes} />
          {aiGenerated && (
            <Tag color="purple" style={{ marginInlineEnd: 0 }}>
              <ThunderboltOutlined /> AI-generated
            </Tag>
          )}
          {isStarter && (
            <Tag color="blue" style={{ marginInlineEnd: 0 }}>
              Starter
            </Tag>
          )}
        </Space>
      </div>
    </div>
  );
}

const generateCtaStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  background:
    'linear-gradient(135deg, rgba(94, 233, 255, 0.10) 0%, rgba(155, 107, 255, 0.08) 100%)',
  border: '1px solid rgba(94, 233, 255, 0.28)',
  borderRadius: 12,
  padding: '16px 18px',
  gap: 16,
  flexWrap: 'wrap',
  boxShadow:
    'inset 0 1px 0 rgba(255, 255, 255, 0.06), 0 12px 40px -12px rgba(94, 233, 255, 0.18)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
};
