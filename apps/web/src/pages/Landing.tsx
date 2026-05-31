import { useEffect, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import '../styles/nexus.css';
import NebulaBackground from '../components/nexus/NebulaBackground';
import CustomCursor from '../components/nexus/CustomCursor';
import HudCorners from '../components/nexus/HudCorners';
import CountUp from '../components/nexus/CountUp';
import Reveal from '../components/nexus/Reveal';

export default function Landing() {
  // Attach .nexus body class so the theme is scoped — other pages stay untouched.
  useEffect(() => {
    document.body.classList.add('nexus-active');
    return () => document.body.classList.remove('nexus-active');
  }, []);

  return (
    <div className="nexus">
      <NebulaBackground />
      <div className="nx-vignette" />
      <div className="nx-scanlines" />
      <div className="nx-grain" />
      <CustomCursor />
      <HudCorners />

      <Nav />

      <main style={{ position: 'relative', zIndex: 10 }}>
        <Hero />
        <Marquee />
        <Mesh />
        <Capabilities />
        <Stats />
        <Terminal />
        <FinalCTA />
      </main>

      <Footer />
    </div>
  );
}

// ----------------------------------------------------------------------------
// NAV
// ----------------------------------------------------------------------------

function Nav() {
  return (
    <nav className="nx-nav">
      <div className="nx-nav-inner">
        <Link to="/" className="nx-nav-brand">HIREX</Link>
        <a href="#mesh" className="nx-nav-link is-active">The Mesh</a>
        <a href="#capabilities" className="nx-nav-link">Capabilities</a>
        <a href="#signal" className="nx-nav-link">Signal</a>
        <Link to="/recruiter" className="nx-nav-cta">Open console</Link>
      </div>
    </nav>
  );
}

// ----------------------------------------------------------------------------
// HERO
// ----------------------------------------------------------------------------

function Hero() {
  return (
    <section className="nx-hero">
      <Reveal>
        <div className="nx-chip" style={{ marginBottom: 32 }}>
          <span className="nx-chip-dot" />
          MESH ONLINE · 01-B · NEXUS // INTERVIEW
        </div>
      </Reveal>

      <Reveal delay={100}>
        <h1 className="nx-hero-headline">
          <span className="row">Six minds.</span>
          <span className="row nx-gradient-text">One mesh.</span>
          <span className="row nx-stroke-text">Zero latency.</span>
        </h1>
      </Reveal>

      <Reveal delay={200}>
        <p className="nx-hero-sub">
          A constellation of AI agents that watches every interview, listens for
          the signal, and synthesises a hire/no-hire call before you close the tab.
          You stay the operator. The mesh handles the work.
        </p>
      </Reveal>

      <Reveal delay={300}>
        <div className="nx-hero-cta-row">
          <Link to="/recruiter" className="nx-btn-primary">
            Activate the mesh
            <span className="nx-btn-arrow">→</span>
          </Link>
          <a href="#mesh" className="nx-btn-ghost">Open queue</a>
        </div>
      </Reveal>

      <Reveal delay={400}>
        <div className="nx-hero-meta">
          Ω · 06 channels · 71 questions in lattice · sync 100%
        </div>
      </Reveal>
    </section>
  );
}

// ----------------------------------------------------------------------------
// MARQUEE — capability words scrolling sideways
// ----------------------------------------------------------------------------

function Marquee() {
  const items = ['Question Lattice', 'Coverage Signal', 'Follow-up Drift', 'Hire Synthesis', 'Operator Console', 'Mesh Sync'];
  const stream = [...items, ...items];
  return (
    <div className="nx-marquee">
      <div className="nx-marquee-track">
        {stream.map((s, i) => (
          <span key={i} className="nx-marquee-item">{s}</span>
        ))}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// MESH — bento featuring the six agents
// ----------------------------------------------------------------------------

function Mesh() {
  return (
    <section id="mesh" className="nx-section">
      <Reveal>
        <div className="nx-section-head">
          <div className="nx-eyebrow">// 02 · THE MESH</div>
          <h2 className="nx-section-title">
            Six <span className="nx-gradient-text">specialised agents.</span>
            <br />One thread.
          </h2>
          <p className="nx-section-sub">
            Each agent owns a phase of the interview. They hand off signal in real time.
            You see only the synthesised result.
          </p>
        </div>
      </Reveal>

      <div className="nx-bento">
        <Reveal>
          <GlassTile className="feat" big>
            <Eyebrow num="01" label="QUESTION-AGENT" />
            <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', marginTop: 24 }}>
              <div>
                <div className="nx-feat-title">Lattice generation</div>
                <p className="nx-feat-body">
                  Reads the JD, the resume, your custom prompt. Builds a question set
                  calibrated to seniority, fits to your time budget. Avoids the same
                  question twice across rounds.
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 24 }}>
              <span className="nx-chip"><span className="nx-chip-dot" /> JD-MAPPED</span>
              <span className="nx-chip"><span className="nx-chip-dot lime" /> TIME-BUDGETED</span>
              <span className="nx-chip"><span className="nx-chip-dot magenta" /> DRIFT-AWARE</span>
            </div>
          </GlassTile>
        </Reveal>

        <Reveal delay={100}>
          <GlassTile className="a">
            <Eyebrow num="02" label="COVERAGE-AGENT" />
            <div className="nx-feat-title">Live signal</div>
            <p className="nx-feat-body">Atomic checkpoints. Tick what they covered as they speak.</p>
          </GlassTile>
        </Reveal>

        <Reveal delay={200}>
          <GlassTile className="b">
            <Eyebrow num="03" label="PROBE-AGENT" />
            <div className="nx-feat-title">Drift detection</div>
            <p className="nx-feat-body">Senses a dodge. Suggests the exact next question.</p>
          </GlassTile>
        </Reveal>

        <Reveal delay={100}>
          <GlassTile className="c">
            <Eyebrow num="04" label="SCORE-AGENT" />
            <div className="nx-feat-title">Five-band quantiser</div>
            <p className="nx-feat-body">
              1 = no-go through 5 = strong yes. Semantic colour. Decisive. No five-star ambiguity.
            </p>
          </GlassTile>
        </Reveal>

        <Reveal delay={200}>
          <GlassTile className="d">
            <Eyebrow num="05" label="SYNTH-AGENT" />
            <div className="nx-feat-title">Verdict synthesis</div>
            <p className="nx-feat-body">
              Reads every checkpoint, every note, every score. Returns advance / hold with
              reasoning grounded in the candidate's own words.
            </p>
          </GlassTile>
        </Reveal>
      </div>
    </section>
  );
}

// ----------------------------------------------------------------------------
// CAPABILITIES — 3 stacked rows
// ----------------------------------------------------------------------------

function Capabilities() {
  return (
    <section id="capabilities" className="nx-section">
      <Reveal>
        <div className="nx-section-head">
          <div className="nx-eyebrow">// 03 · CAPABILITIES</div>
          <h2 className="nx-section-title">
            Built for the
            <br /><span className="nx-gradient-text">post-resume era.</span>
          </h2>
        </div>
      </Reveal>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {CAPABILITIES.map((c, i) => (
          <Reveal key={c.title} delay={(i * 100) as 0 | 100 | 200 | 300 | 400}>
            <CapabilityRow {...c} />
          </Reveal>
        ))}
      </div>
    </section>
  );
}

const CAPABILITIES = [
  {
    n: '06',
    title: 'Question lattice',
    line: 'Tailored to JD + experience + your custom prompts. Auto-fits the duration budget.',
    tags: ['LATTICE', 'TIME-BUDGETED', 'CONTEXTUAL'],
  },
  {
    n: '07',
    title: 'Coverage checkpoints',
    line: 'Atomic. Tickable. Drives the final verdict. No more vague gut calls.',
    tags: ['SIGNAL', 'STRUCTURED', 'AUDITABLE'],
  },
  {
    n: '08',
    title: 'Drift response',
    line: 'When a candidate dodges, the probe-agent surfaces the exact follow-up — quoting their own words back.',
    tags: ['ADAPTIVE', 'GROUNDED'],
  },
];

function CapabilityRow({ n, title, line, tags }: typeof CAPABILITIES[number]) {
  return (
    <div className="nx-glass" style={{ padding: '28px 32px', display: 'grid', gridTemplateColumns: '120px 1fr auto', gap: 32, alignItems: 'center' }}>
      <div style={{ fontFamily: 'var(--f-mono)', fontSize: 12, color: 'var(--cyan)', letterSpacing: '0.24em' }}>// {n}</div>
      <div>
        <div className="nx-feat-title" style={{ fontSize: 22 }}>{title}</div>
        <p className="nx-feat-body" style={{ marginTop: 6 }}>{line}</p>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        {tags.map((t) => (
          <span key={t} className="nx-chip">{t}</span>
        ))}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// STATS
// ----------------------------------------------------------------------------

function Stats() {
  return (
    <section className="nx-section">
      <Reveal>
        <div className="nx-section-head">
          <div className="nx-eyebrow">// 04 · TELEMETRY</div>
          <h2 className="nx-section-title">Numbers <span className="nx-gradient-text">from the mesh.</span></h2>
        </div>
      </Reveal>
      <div className="nx-stats">
        {[
          { num: <CountUp to={71} />, lab: 'QUESTIONS IN LATTICE' },
          { num: <CountUp to={8} />, lab: 'ROLE-TYPES INDEXED' },
          { num: <CountUp to={24} suffix=" MIN" />, lab: 'TIME RECLAIMED · PER INTERVIEW' },
          { num: <><span>&lt;</span><CountUp to={30} suffix="s" /></>, lab: 'JD → READY-STATE' },
        ].map((s, i) => (
          <Reveal key={i} delay={(i * 100) as 0 | 100 | 200 | 300 | 400}>
            <div className="nx-stat">
              <div className="nx-stat-num">{s.num}</div>
              <div className="nx-stat-label">{s.lab}</div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

// ----------------------------------------------------------------------------
// TERMINAL — sci-fi readout
// ----------------------------------------------------------------------------

function Terminal() {
  return (
    <section id="signal" className="nx-section">
      <Reveal>
        <div className="nx-section-head">
          <div className="nx-eyebrow">// 05 · OBSERVER LOG</div>
          <h2 className="nx-section-title">
            A real candidate, <span className="nx-gradient-text">scored in 32 minutes.</span>
          </h2>
        </div>
      </Reveal>
      <Reveal>
        <div className="nx-terminal" style={{ maxWidth: 980 }}>
          <div className="nx-terminal-bar">
            <span className="nx-terminal-dot" style={{ background: '#FF5F57' }} />
            <span className="nx-terminal-dot" style={{ background: '#FEBC2E' }} />
            <span className="nx-terminal-dot" style={{ background: '#28C840' }} />
            <span className="nx-terminal-title">operator@nexus · ~/observer/log</span>
          </div>
          <div className="nx-terminal-body">
            <div><span className="nx-terminal-prompt">nexus &gt;</span> mesh.activate("fullstack-senior-r2")</div>
            <div className="nx-terminal-ok">[OK] question-agent: 9 questions assembled · 28m budget · drift-tagged</div>
            <div className="nx-terminal-ok">[OK] coverage-agent: 6-checkpoint matrix loaded</div>
            <div className="nx-terminal-ok">[OK] probe-agent: 3 default follow-ups primed</div>
            <div style={{ marginTop: 14 }}><span className="nx-terminal-prompt">nexus &gt;</span> session.start()</div>
            <div>candidate · vikram_rao · 5.6y experience · razorpay</div>
            <div>q1 · system-design · scored 5 · "names webockets, kafka fanout, idempotency uuids"</div>
            <div className="nx-terminal-warn">q2 · coding · scored 2 · "missed idempotency entirely, hand-wavy under probe"</div>
            <div className="nx-terminal-warn">q3 · skipped</div>
            <div>q4-q9 · pending</div>
            <div style={{ marginTop: 14 }}><span className="nx-terminal-prompt">nexus &gt;</span> session.finalize()</div>
            <div className="nx-terminal-err">[VERDICT] no-hire · do not advance to R3</div>
            <div>"strong on architecture, but core payment-flow primitive missing — too critical for the role"</div>
            <div style={{ marginTop: 14 }}><span className="nx-terminal-prompt">nexus &gt;</span> <span className="nx-terminal-cursor" /></div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

// ----------------------------------------------------------------------------
// FINAL CTA
// ----------------------------------------------------------------------------

function FinalCTA() {
  return (
    <section className="nx-final">
      <Reveal>
        <div className="nx-eyebrow" style={{ justifyContent: 'center', display: 'inline-flex' }}>// 06 · BOOT</div>
      </Reveal>
      <Reveal delay={100}>
        <h2 className="nx-final-title">
          <span style={{ display: 'block' }}>Six minds.</span>
          <span style={{ display: 'block' }} className="nx-gradient-text">One mesh.</span>
          <span style={{ display: 'block' }} className="nx-stroke-text">Activate.</span>
        </h2>
      </Reveal>
      <Reveal delay={200}>
        <p className="nx-final-sub">
          Hirex turns live interviews into structured signal. No more interviewing from memory.
        </p>
      </Reveal>
      <Reveal delay={300}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
          <Link to="/recruiter" className="nx-btn-primary">
            Activate the mesh
            <span className="nx-btn-arrow">→</span>
          </Link>
          <a href="mailto:hello@hirex.ai" className="nx-btn-ghost">Open channel</a>
        </div>
      </Reveal>
    </section>
  );
}

// ----------------------------------------------------------------------------
// FOOTER
// ----------------------------------------------------------------------------

function Footer() {
  return (
    <footer className="nx-footer">
      <div className="nx-footer-top">
        <div>
          <div className="nx-nav-brand" style={{ borderRight: 'none', padding: 0, marginBottom: 14 }}>HIREX</div>
          <p style={{ color: 'var(--ink-dim)', fontSize: 13, lineHeight: 1.55, margin: 0 }}>
            The AI mesh for live interviews. Built in India for Indian hiring.
          </p>
        </div>
        <div className="nx-footer-cols">
          <FooterCol title="Mesh"      links={[['Activate', '/recruiter'], ['Open queue', '/recruiter'], ['Question lattice', '/recruiter/questions']]} />
          <FooterCol title="Channel"   links={[['Customers', '#'], ['About', '#'], ['Contact', 'mailto:hello@hirex.ai']]} />
          <FooterCol title="Frequency" links={[['Privacy', '#'], ['Terms', '#'], ['DPDP', '#']]} />
        </div>
      </div>
      <div className="nx-footer-bottom">
        <span>© 2026 HIREX TECHNOLOGIES</span>
        <span><span style={{ color: 'var(--lime)' }}>● </span> ALL SYSTEMS NOMINAL</span>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div className="nx-footer-col">
      <h4>{title}</h4>
      {links.map(([label, href]) => (
        <a key={label} href={href}>{label}</a>
      ))}
    </div>
  );
}

// ----------------------------------------------------------------------------
// Shared primitives
// ----------------------------------------------------------------------------

function GlassTile({ className = '', children, big }: { className?: string; children: ReactNode; big?: boolean }) {
  return (
    <div className={`nx-glass ${className}`} style={{ display: 'flex', flexDirection: 'column', minHeight: big ? '100%' : 200 }}>
      {children}
    </div>
  );
}

function Eyebrow({ num, label }: { num: string; label: string }) {
  return (
    <div className="nx-eyebrow" style={{ marginBottom: 0 }}>
      // {num} · {label}
    </div>
  );
}
