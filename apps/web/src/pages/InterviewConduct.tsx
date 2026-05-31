import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  App as AntApp,
  Button,
  Empty,
  Input,
  Modal,
  Result,
  Space,
  Spin,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  PlayCircleOutlined,
  ThunderboltOutlined,
  StopOutlined,
  RobotOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  finalizeInterview,
  generateFollowUp,
  generateMoreQuestions,
  getConductState,
  startConducting,
  upsertResponse,
} from '../api/conduct';
import type { ConductState, FinalizeReport, QuestionConduct } from '../api/conduct';
import { EXPERIENCE_LABEL, ROLE_LABEL } from '../types';
import type { ExperienceLevel, RoleType } from '../types';
import ScoreSelector from '../components/conduct/ScoreSelector';
import ChecklistRow from '../components/conduct/ChecklistRow';
import CoverageBar from '../components/conduct/CoverageBar';
import SidebarRow from '../components/conduct/SidebarRow';
import SectionLabel from '../components/conduct/SectionLabel';
import GenerateMorePanel from '../components/conduct/GenerateMorePanel';
import TimeBadge from '../components/TimeBadge';

const { Title, Paragraph, Text } = Typography;

interface LocalState {
  score: number | null;
  notes: string;
  coverage: Set<string>;
  liveFollowUps: string[];
}

const blankLocal = (q: QuestionConduct | undefined): LocalState => ({
  score: q?.score ?? null,
  notes: q?.notes ?? '',
  coverage: new Set(q?.coverage ?? []),
  liveFollowUps: [],
});

export default function InterviewConduct() {
  const { id } = useParams<{ id: string }>();
  const { message } = AntApp.useApp();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const conductQuery = useQuery({
    queryKey: ['conduct', id],
    queryFn: () => getConductState(id!),
    enabled: !!id,
  });

  const [activeIdx, setActiveIdx] = useState(0);
  const [local, setLocal] = useState<LocalState>(blankLocal(undefined));
  const [finalizing, setFinalizing] = useState(false);
  const [report, setReport] = useState<FinalizeReport | null>(null);

  const state = conductQuery.data;
  const isEnriched = !!state?.questions.every((q) => q.expected_answer);
  const currentQ = state?.questions[activeIdx];

  useEffect(() => {
    if (currentQ) setLocal(blankLocal(currentQ));
  }, [currentQ?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const startMut = useMutation({
    mutationFn: () => startConducting(id!),
    onSuccess: (next) => {
      qc.setQueryData(['conduct', id], next);
      message.success('Interview ready');
      setActiveIdx(0);
    },
    onError: (e: unknown) => message.error((e as Error)?.message ?? 'Failed to start'),
  });

  const upsertMut = useMutation({
    mutationFn: async (input: { conduct_status?: 'done' | 'skipped' | 'asked'; advance?: boolean }) => {
      if (!currentQ) throw new Error('no question');
      const updated = await upsertResponse(currentQ.id, {
        score: local.score,
        notes: local.notes || null,
        coverage: Array.from(local.coverage),
        conduct_status: input.conduct_status,
      });
      return { updated, advance: input.advance };
    },
    onSuccess: ({ updated, advance }) => {
      qc.setQueryData<ConductState | undefined>(['conduct', id], (prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          questions: prev.questions.map((q) => (q.id === updated.id ? updated : q)),
        };
      });
      if (advance && state && activeIdx < state.questions.length - 1) {
        setActiveIdx(activeIdx + 1);
      }
    },
    onError: (e: unknown) => message.error((e as Error)?.message ?? 'Save failed'),
  });

  const followUpMut = useMutation({
    mutationFn: async () => {
      if (!currentQ) throw new Error('no question');
      return generateFollowUp(currentQ.id, {
        notes: local.notes || null,
        coverage: Array.from(local.coverage),
      });
    },
    onSuccess: (text) => {
      setLocal((prev) => ({ ...prev, liveFollowUps: [...prev.liveFollowUps, text] }));
    },
    onError: (e: unknown) => message.error((e as Error)?.message ?? 'Follow-up failed'),
  });

  const finalizeMut = useMutation({
    mutationFn: () => finalizeInterview(id!),
    onSuccess: (r) => {
      setReport(r);
      setFinalizing(false);
      qc.invalidateQueries({ queryKey: ['interviews'] });
      qc.invalidateQueries({ queryKey: ['interview', id] });
    },
    onError: (e: unknown) => {
      setFinalizing(false);
      message.error((e as Error)?.message ?? 'Finalize failed');
    },
  });

  const generateMoreMut = useMutation({
    mutationFn: (values: { count: number; focus?: string }) =>
      generateMoreQuestions(id!, { count: values.count, focus: values.focus }),
    onSuccess: (next) => {
      const added = next.questions.length - (state?.questions.length ?? 0);
      qc.setQueryData(['conduct', id], next);
      message.success(`Added ${added} new question${added === 1 ? '' : 's'}`);
    },
    onError: (e: unknown) => message.error((e as Error)?.message ?? 'Generation failed'),
  });

  const doneCount = useMemo(
    () =>
      state?.questions.filter(
        (q) => q.conduct_status === 'done' || q.conduct_status === 'skipped',
      ).length ?? 0,
    [state?.questions],
  );

  // -------- Early returns --------

  if (!id) return null;

  if (conductQuery.isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (conductQuery.isError || !state) {
    return (
      <div style={shellContainer}>
        <Empty description="Interview not found" />
      </div>
    );
  }

  if (!isEnriched && !startMut.isPending) {
    return (
      <div style={preStartContainer}>
        <Title level={3} style={{ marginTop: 0, marginBottom: 8 }}>
          Ready to conduct {state.candidate_name || state.candidate_email}'s interview?
        </Title>
        <Paragraph style={{ color: 'var(--hx-text-3)', marginBottom: 16 }}>
          {ROLE_LABEL[state.role_type as RoleType] ?? state.role_type} ·{' '}
          {EXPERIENCE_LABEL[state.experience_level as ExperienceLevel] ?? state.experience_level} ·{' '}
          {state.current_round} · {state.questions.length} questions
        </Paragraph>
        <Paragraph type="secondary" style={{ marginBottom: 24 }}>
          When you click Start, the AI reads every question and prepares an evaluation guide — what a great answer covers, a checklist you tick as the candidate speaks, and default follow-ups. ~15–25s.
        </Paragraph>
        <Space>
          <Button type="primary" size="large" icon={<PlayCircleOutlined />} onClick={() => startMut.mutate()}>
            Start conducting
          </Button>
          <Link to={`/recruiter/${id}`}>
            <Button>Back</Button>
          </Link>
        </Space>
      </div>
    );
  }

  if (startMut.isPending) {
    return (
      <div style={{ ...preStartContainer, textAlign: 'center' }}>
        <Spin size="large" />
        <Title level={4} style={{ marginTop: 24, marginBottom: 8 }}>
          Preparing evaluation guides
        </Title>
        <Paragraph type="secondary">
          AI is reading each question and generating expected answers, checklists, and follow-ups.
        </Paragraph>
      </div>
    );
  }

  if (report) {
    return <FinalReport report={report} onBack={() => navigate(`/recruiter/${id}`)} />;
  }

  if (!currentQ) {
    return <div style={shellContainer}><Empty description="No questions configured." /></div>;
  }

  // -------- Live conduct UI --------

  const checklist = currentQ.evaluation_checklist ?? [];
  const coveredCount = local.coverage.size;
  const followUpsToShow = [...currentQ.default_follow_ups, ...local.liveFollowUps];

  const toggleCoverage = (point: string) =>
    setLocal((prev) => {
      const next = new Set(prev.coverage);
      if (next.has(point)) next.delete(point);
      else next.add(point);
      return { ...prev, coverage: next };
    });

  const handleNext = () => upsertMut.mutate({ conduct_status: 'done', advance: true });
  const handleSkip = () => upsertMut.mutate({ conduct_status: 'skipped', advance: true });
  const handleSave = () => upsertMut.mutate({ conduct_status: 'done', advance: false });

  return (
    <>
      {/* -------- Sticky top bar -------- */}
      <div style={topBarStyle}>
        <div style={topBarLeft}>
          <Link to={`/recruiter/${id}`} style={backLinkStyle}>
            <ArrowLeftOutlined style={{ fontSize: 12 }} /> Back
          </Link>
          <div style={topBarDivider} />
          <span style={candidateNameStyle}>{state.candidate_name || state.candidate_email}</span>
          <span style={metaSeparator}>·</span>
          <span style={metaTextStyle}>{ROLE_LABEL[state.role_type as RoleType] ?? state.role_type}</span>
          <span style={metaSeparator}>·</span>
          <span style={metaTextStyle}>
            {EXPERIENCE_LABEL[state.experience_level as ExperienceLevel] ?? state.experience_level}
          </span>
          <span style={metaSeparator}>·</span>
          <span style={metaTextStyle}>{state.current_round}</span>
        </div>
        <div style={topBarRight}>
          <div style={progressPillStyle}>
            <div
              style={{
                ...progressFillStyle,
                width: `${Math.max(2, (doneCount / Math.max(1, state.questions.length)) * 100)}%`,
              }}
            />
            <span style={{ fontFamily: 'var(--hx-font-mono)', fontSize: 11, color: 'var(--hx-text-2)', position: 'relative', zIndex: 1 }}>
              {doneCount} / {state.questions.length}
            </span>
          </div>
          <Button
            type="primary"
            icon={<CheckCircleOutlined />}
            disabled={doneCount === 0}
            onClick={() => setFinalizing(true)}
          >
            Finalize
          </Button>
        </div>
      </div>

      <div style={layoutStyle}>
        {/* -------- Sidebar queue -------- */}
        <aside style={sidebarStyle}>
          <div style={sidebarHeaderStyle}>
            <span className="hx-section-label">Question queue</span>
            <span style={{ fontFamily: 'var(--hx-font-mono)', fontSize: 11, color: 'var(--hx-text-3)' }}>
              {state.questions.length}
            </span>
          </div>
          <div style={{ overflowY: 'auto', flex: 1, minHeight: 0 }}>
            {state.questions.map((q, idx) => (
              <SidebarRow
                key={q.id}
                question={q}
                index={idx}
                active={idx === activeIdx}
                onClick={() => setActiveIdx(idx)}
              />
            ))}
          </div>
          <GenerateMorePanel
            isPending={generateMoreMut.isPending}
            onGenerate={(input) => generateMoreMut.mutate(input)}
          />
        </aside>

        {/* -------- Main pane -------- */}
        <main style={mainPaneStyle}>
          <div key={currentQ.id} className="hx-fade-in" style={{ paddingBottom: 76 }}>
            {/* Hero question */}
            <div style={heroStyle}>
              <div style={heroAccentStyle} />
              <div style={{ flex: 1, padding: '20px 24px' }}>
                <div style={heroMetaStyle}>
                  <span style={{ fontFamily: 'var(--hx-font-mono)', fontSize: 12, color: 'var(--hx-text-3)' }}>
                    Q{activeIdx + 1} of {state.questions.length}
                  </span>
                  <span style={metaSeparator}>·</span>
                  <span style={questionTypeStyle}>{currentQ.question_type.replace('_', ' ')}</span>
                  <span style={metaSeparator}>·</span>
                  <span style={{ fontSize: 11, color: 'var(--hx-text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
                    {currentQ.round}
                  </span>
                  {currentQ.generated_by === 'llm' && (
                    <>
                      <span style={metaSeparator}>·</span>
                      <span style={aiBadgeStyle}>
                        <RobotOutlined style={{ fontSize: 10 }} /> AI
                      </span>
                    </>
                  )}
                  <span style={metaSeparator}>·</span>
                  <TimeBadge minutes={currentQ.time_minutes} size="sm" />
                </div>
                <h1 style={heroTitleStyle}>{currentQ.question_text}</h1>
              </div>
            </div>

            {/* Expected answer */}
            {currentQ.expected_answer && (
              <section style={sectionStyle}>
                <SectionLabel>What a great answer covers</SectionLabel>
                <p style={expectedAnswerStyle}>{currentQ.expected_answer}</p>
              </section>
            )}

            {/* Coverage checklist */}
            {checklist.length > 0 && (
              <section style={sectionStyle}>
                <SectionLabel
                  trailing={`${coveredCount} of ${checklist.length} covered`}
                >
                  Coverage
                </SectionLabel>
                <div style={{ marginBottom: 12 }}>
                  <CoverageBar total={checklist.length} covered={coveredCount} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {checklist.map((point) => (
                    <ChecklistRow
                      key={point}
                      point={point}
                      checked={local.coverage.has(point)}
                      onToggle={() => toggleCoverage(point)}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Score */}
            <section style={sectionStyle}>
              <SectionLabel>Score</SectionLabel>
              <ScoreSelector
                value={local.score}
                onChange={(v) => setLocal((prev) => ({ ...prev, score: v }))}
              />
            </section>

            {/* Notes */}
            <section style={sectionStyle}>
              <SectionLabel>Notes</SectionLabel>
              <Input.TextArea
                value={local.notes}
                onChange={(e) => setLocal((prev) => ({ ...prev, notes: e.target.value }))}
                autoSize={{ minRows: 4, maxRows: 14 }}
                placeholder="What did they say? Specific quotes are gold."
                style={{ background: 'var(--hx-surface)', fontSize: 14 }}
              />
            </section>

            {/* Follow-ups */}
            <section style={sectionStyle}>
              <SectionLabel
                trailing={followUpsToShow.length > 0 ? `${followUpsToShow.length} suggested` : undefined}
                action={
                  <Tooltip title="Generate one more tuned to your notes + uncovered checklist points">
                    <Button
                      size="small"
                      icon={<ThunderboltOutlined />}
                      onClick={() => followUpMut.mutate()}
                      loading={followUpMut.isPending}
                    >
                      Another
                    </Button>
                  </Tooltip>
                }
              >
                Suggested follow-ups
              </SectionLabel>
              {followUpsToShow.length === 0 ? (
                <Text style={{ color: 'var(--hx-text-3)', fontSize: 13 }}>None yet.</Text>
              ) : (
                <ol style={followUpListStyle}>
                  {followUpsToShow.map((f, i) => (
                    <li key={i} style={followUpItemStyle}>
                      <span style={followUpBulletStyle}>{i + 1}</span>
                      <div style={{ flex: 1 }}>
                        <span>{f}</span>
                        {i >= currentQ.default_follow_ups.length && (
                          <span style={justGeneratedTagStyle}>
                            <ThunderboltOutlined style={{ fontSize: 10 }} /> just generated
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>
        </main>
      </div>

      {/* -------- Sticky bottom bar -------- */}
      <div style={bottomBarStyle}>
        <div style={bottomBarInner}>
          <Space size={8}>
            <Button danger icon={<StopOutlined />} onClick={handleSkip} loading={upsertMut.isPending}>
              Skip
            </Button>
            <Button onClick={handleSave} loading={upsertMut.isPending}>
              Save
            </Button>
          </Space>
          <Space size={8}>
            <Button
              disabled={activeIdx === 0}
              onClick={() => setActiveIdx(Math.max(0, activeIdx - 1))}
            >
              ← Previous
            </Button>
            <Button
              type="primary"
              size="large"
              icon={<ArrowRightOutlined />}
              iconPosition="end"
              onClick={handleNext}
              loading={upsertMut.isPending}
              disabled={local.score == null}
            >
              {activeIdx === state.questions.length - 1 ? 'Save (last)' : 'Save & next'}
            </Button>
          </Space>
        </div>
      </div>

      {/* -------- Finalize modal -------- */}
      <Modal
        open={finalizing}
        title="Finalize this interview?"
        onCancel={() => setFinalizing(false)}
        onOk={() => finalizeMut.mutate()}
        okText="Finalize & get recommendation"
        confirmLoading={finalizeMut.isPending}
        width={560}
      >
        <Paragraph>
          AI will synthesise the per-question scores, coverage, and your notes into a hire / no-hire recommendation. ~10–20 seconds.
        </Paragraph>
        <Alert
          type="info"
          showIcon
          message={`You've completed ${doneCount} of ${state.questions.length} questions. ${
            doneCount < state.questions.length
              ? `${state.questions.length - doneCount} are still pending or unscored.`
              : 'All done.'
          }`}
        />
      </Modal>

    </>
  );
}

// ------------------------------------------------------------------
// Final report screen
// ------------------------------------------------------------------

function FinalReport({ report, onBack }: { report: FinalizeReport; onBack: () => void }) {
  const advance = report.advance_to_next_round;
  const recColor: Record<FinalizeReport['recommendation'], string> = {
    strong_hire: 'success',
    hire: 'success',
    no_hire: 'warning',
    strong_no_hire: 'error',
  };
  return (
    <div style={{ maxWidth: 880, margin: '0 auto', padding: 24 }}>
      <Result
        status={advance ? 'success' : 'warning'}
        icon={advance ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
        title={advance ? 'Advance to next round' : "Don't advance"}
        subTitle={report.advance_reasoning}
        extra={
          <Space>
            <Tag color={recColor[report.recommendation]} style={{ fontSize: 14, padding: '4px 12px' }}>
              {report.recommendation.replace('_', ' ')}
            </Tag>
            <Tag color="blue" style={{ fontSize: 14, padding: '4px 12px' }}>
              Overall {report.overall_score} / 5
            </Tag>
          </Space>
        }
      />
      <section style={{ marginTop: 32 }}>
        <SectionLabel>Strengths</SectionLabel>
        <ul style={reportListStyle}>
          {report.strengths.map((s, i) => (
            <li key={i} style={reportItemStyle}>
              <CheckCircleOutlined style={{ color: 'var(--hx-success)', marginTop: 5 }} />
              <span>{s}</span>
            </li>
          ))}
        </ul>
      </section>
      <section style={{ marginTop: 24 }}>
        <SectionLabel>Concerns</SectionLabel>
        <ul style={reportListStyle}>
          {report.concerns.map((c, i) => (
            <li key={i} style={reportItemStyle}>
              <CloseCircleOutlined style={{ color: 'var(--hx-warn)', marginTop: 5 }} />
              <span>{c}</span>
            </li>
          ))}
        </ul>
      </section>
      <section style={{ marginTop: 24 }}>
        <SectionLabel>Per-question summary</SectionLabel>
        <ul style={reportListStyle}>
          {report.per_question_summary.map((item, i) => (
            <li key={i} style={{ ...reportItemStyle, alignItems: 'flex-start' }}>
              <span style={{ fontFamily: 'var(--hx-font-mono)', fontSize: 12, color: 'var(--hx-text-3)', marginTop: 2 }}>
                Q{item.order_index + 1}
              </span>
              <Tag color={item.score >= 4 ? 'green' : item.score >= 3 ? 'gold' : 'red'}>{item.score}/5</Tag>
              <span style={{ flex: 1 }}>{item.summary}</span>
            </li>
          ))}
        </ul>
      </section>
      <Space style={{ marginTop: 32 }}>
        <Button onClick={onBack}>Back to interview detail</Button>
        <Link to="/recruiter">
          <Button>All interviews</Button>
        </Link>
      </Space>
    </div>
  );
}

// ------------------------------------------------------------------
// Styles
// ------------------------------------------------------------------

const shellContainer: React.CSSProperties = {
  background: 'var(--hx-surface)',
  border: '1px solid var(--hx-border)',
  borderRadius: 10,
  padding: 32,
};

const preStartContainer: React.CSSProperties = {
  maxWidth: 640,
  margin: '40px auto',
  background: 'var(--hx-surface)',
  border: '1px solid var(--hx-border)',
  borderRadius: 12,
  padding: 32,
};

// Recruiter shell header is 60px sticky. Conduct top bar sticks just below it.
// NEXUS-themed: deep indigo glass.
const topBarStyle: React.CSSProperties = {
  position: 'sticky',
  top: 60,
  zIndex: 50,
  background: 'rgba(6, 6, 26, 0.78)',
  backdropFilter: 'saturate(180%) blur(18px)',
  WebkitBackdropFilter: 'saturate(180%) blur(18px)',
  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
  margin: '-32px -40px 0',
  padding: '12px 24px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 16,
  minHeight: 56,
};

const topBarLeft: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  flexWrap: 'wrap',
  minWidth: 0,
};
const topBarRight: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
};
const topBarDivider: React.CSSProperties = {
  width: 1,
  height: 18,
  background: 'var(--hx-border)',
};
const backLinkStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  fontSize: 13,
  color: 'var(--hx-text-3)',
  fontWeight: 500,
};

const candidateNameStyle: React.CSSProperties = {
  fontWeight: 600,
  fontSize: 14,
  color: 'var(--hx-text)',
};
const metaTextStyle: React.CSSProperties = {
  fontSize: 13,
  color: 'var(--hx-text-3)',
};
const metaSeparator: React.CSSProperties = {
  fontSize: 13,
  color: 'var(--hx-text-4)',
};

const progressPillStyle: React.CSSProperties = {
  position: 'relative',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: 28,
  minWidth: 120,
  padding: '0 14px',
  background: 'rgba(255, 255, 255, 0.04)',
  border: '1px solid rgba(255, 255, 255, 0.10)',
  borderRadius: 999,
  overflow: 'hidden',
};
const progressFillStyle: React.CSSProperties = {
  position: 'absolute',
  left: 0,
  top: 0,
  bottom: 0,
  background: 'linear-gradient(90deg, rgba(94, 233, 255, 0.35) 0%, rgba(155, 107, 255, 0.35) 100%)',
  borderRight: '1px solid rgba(94, 233, 255, 0.5)',
  transition: 'width 200ms ease-out',
};

const layoutStyle: React.CSSProperties = {
  display: 'flex',
  gap: 0,
  alignItems: 'flex-start',
  // Negative margins pull the layout to the edges of the parent content area
  // so the sidebar borders flush with the viewport. The conduct page content
  // sits inside `padding: 32px 40px`, so we cancel it here.
  margin: '0 -40px',
  minHeight: 'calc(100vh - 112px)',
};

// Sidebar sticks below recruiter header (56px) AND conduct top bar (56px) =
// 112px from viewport top. Height fills the remaining viewport so the queue
// scrolls inside its flex section and the Generate panel stays visible.
const sidebarStyle: React.CSSProperties = {
  width: 320,
  flexShrink: 0,
  display: 'flex',
  flexDirection: 'column',
  borderRight: '1px solid rgba(255, 255, 255, 0.08)',
  background: 'rgba(6, 6, 26, 0.5)',
  backdropFilter: 'blur(14px)',
  WebkitBackdropFilter: 'blur(14px)',
  position: 'sticky',
  top: 116,
  height: 'calc(100vh - 116px)',
};
const sidebarHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '14px 16px 12px',
  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
  fontFamily: 'var(--f-mono, JetBrains Mono)',
  fontSize: 10,
  letterSpacing: '0.28em',
  textTransform: 'uppercase',
};

const mainPaneStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  padding: '32px 40px 0',
  maxWidth: 840,
};

const heroStyle: React.CSSProperties = {
  display: 'flex',
  background: 'rgba(255, 255, 255, 0.04)',
  border: '1px solid rgba(255, 255, 255, 0.10)',
  borderRadius: 14,
  overflow: 'hidden',
  marginBottom: 32,
  backdropFilter: 'blur(20px) saturate(180%)',
  WebkitBackdropFilter: 'blur(20px) saturate(180%)',
  boxShadow:
    '0 30px 80px -30px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.06)',
};
const heroAccentStyle: React.CSSProperties = {
  width: 3,
  background: 'linear-gradient(180deg, #5ee9ff 0%, #9b6bff 50%, #ff4fd8 100%)',
  flexShrink: 0,
  boxShadow: '0 0 14px rgba(94, 233, 255, 0.35)',
};
const heroMetaStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  marginBottom: 10,
};
const heroTitleStyle: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 600,
  lineHeight: 1.35,
  letterSpacing: '-0.014em',
  color: 'var(--hx-text)',
  margin: 0,
};

const questionTypeStyle: React.CSSProperties = {
  fontSize: 11,
  color: 'var(--hx-accent)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  fontWeight: 600,
};

const aiBadgeStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  fontSize: 10,
  fontWeight: 600,
  color: 'var(--hx-ai)',
  background: 'var(--hx-ai-bg)',
  padding: '2px 8px',
  borderRadius: 999,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const sectionStyle: React.CSSProperties = {
  marginBottom: 24,
};

const expectedAnswerStyle: React.CSSProperties = {
  fontSize: 14,
  lineHeight: 1.65,
  color: 'var(--hx-text-2)',
  margin: 0,
  padding: '16px 18px',
  background: 'rgba(255, 255, 255, 0.025)',
  borderRadius: 10,
  border: '1px solid rgba(255, 255, 255, 0.06)',
};

const followUpListStyle: React.CSSProperties = {
  listStyle: 'none',
  padding: 0,
  margin: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
};
const followUpItemStyle: React.CSSProperties = {
  display: 'flex',
  gap: 12,
  padding: '12px 16px',
  background: 'rgba(255, 255, 255, 0.025)',
  border: '1px solid rgba(255, 255, 255, 0.06)',
  borderRadius: 10,
  fontSize: 14,
  color: 'var(--hx-text-2)',
  lineHeight: 1.5,
};
const followUpBulletStyle: React.CSSProperties = {
  fontFamily: 'var(--hx-font-mono)',
  fontSize: 11,
  fontWeight: 500,
  color: 'var(--hx-text-3)',
  flexShrink: 0,
  marginTop: 2,
};
const justGeneratedTagStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 3,
  fontSize: 10,
  fontWeight: 600,
  color: 'var(--hx-ai)',
  background: 'var(--hx-ai-bg)',
  padding: '1px 7px',
  borderRadius: 999,
  marginLeft: 8,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const bottomBarStyle: React.CSSProperties = {
  position: 'fixed',
  // 240px = recruiter global nav, 320px = conduct sidebar. Action bar only
  // spans the main (question) pane so it never covers the sidebar's
  // Generate-more panel.
  left: 240 + 320,
  right: 0,
  bottom: 0,
  background: 'rgba(6, 6, 26, 0.85)',
  backdropFilter: 'saturate(180%) blur(18px)',
  WebkitBackdropFilter: 'saturate(180%) blur(18px)',
  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
  zIndex: 40,
};
const bottomBarInner: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '12px 24px',
};

const reportListStyle: React.CSSProperties = {
  listStyle: 'none',
  padding: 0,
  margin: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
};
const reportItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '12px 14px',
  background: 'var(--hx-surface)',
  border: '1px solid var(--hx-border-soft)',
  borderRadius: 8,
  fontSize: 14,
  color: 'var(--hx-text-2)',
  lineHeight: 1.5,
};
