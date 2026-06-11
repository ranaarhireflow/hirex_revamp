import { useEffect } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import '../styles/nexus.css';

interface NavItem {
  to: string;
  end?: boolean;
  label: string;
}

const PRIMARY_NAV: NavItem[] = [
  { to: '/recruiter', end: true, label: 'Interviews' },
  { to: '/recruiter/new', label: 'New interview' },
  { to: '/recruiter/screening', label: 'Resume screening' },
  { to: '/recruiter/questions', label: 'Question bank' },
];

const SECONDARY_NAV: NavItem[] = [
  { to: '/recruiter/settings', label: 'Settings' },
  { to: '/recruiter/help', label: 'Help' },
];

export default function RecruiterLayout() {
  useEffect(() => {
    document.body.classList.add('nexus-shell');
    return () => document.body.classList.remove('nexus-shell');
  }, []);

  return (
    <div className="nexus nexus-dashboard" style={{ minHeight: '100vh' }}>
      {/* ---------- Glass top bar ---------- */}
      <header className="nx-shell-header">
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
          <span className="nx-shell-brand-mark">H</span>
          <span className="nx-shell-brand">HIREX</span>
        </Link>
        <span
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 10,
            letterSpacing: '0.28em',
            textTransform: 'uppercase',
            color: 'var(--ink-faint)',
            marginLeft: 4,
          }}
        >
          // OPERATOR CONSOLE
        </span>
        <div style={{ flex: 1 }} />
        <div className="nx-shell-account">
          <div
            aria-hidden
            style={{
              width: 28,
              height: 28,
              borderRadius: 999,
              background: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
              color: '#FFFFFF',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              fontWeight: 700,
              boxShadow: 'inset 0 -1px 1px rgba(0,0,0,0.18)',
            }}
          >
            YO
          </div>
          <div className="nx-shell-account-lines">
            <span className="name">YOU</span>
            <span className="email">recruiter@hirex.dev</span>
          </div>
        </div>
      </header>

      <div style={{ display: 'flex', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
        {/* ---------- Glass sidebar ---------- */}
        <aside className="nx-shell-sider">
          <div className="nx-shell-section">
            <span className="nx-shell-section-label">// WORKSPACE</span>
            {PRIMARY_NAV.map((n) => (
              <NavItemLink key={n.to} {...n} />
            ))}
          </div>
          <div className="nx-shell-section" style={{ marginTop: 16 }}>
            <span className="nx-shell-section-label">// SYSTEM</span>
            {SECONDARY_NAV.map((n) => (
              <NavItemLink key={n.to} {...n} />
            ))}
          </div>
          <div className="nx-shell-sider-foot">All systems nominal</div>
        </aside>

        {/* ---------- Content ---------- */}
        <main className="nx-shell-content" style={{ flex: 1, minWidth: 0 }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function NavItemLink({ to, end, label }: NavItem) {
  return (
    <NavLink to={to} end={end} style={{ textDecoration: 'none' }}>
      {({ isActive }) => (
        <div className={`nx-shell-nav-item ${isActive ? 'is-active' : ''}`}>
          {label}
        </div>
      )}
    </NavLink>
  );
}
