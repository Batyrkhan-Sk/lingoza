import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api, setToken, type Dashboard, type Me } from "../lib/api";

/**
 * The application shell.
 *
 * Navigation mirrors the sections a learner thinks in (§22): the course path
 * first, then the individual skills, then the tools. The vocabulary badge
 * shows what is due, because a review queue nobody can see is a review queue
 * nobody clears.
 */

const COURSE_NAV = [
  { to: "/", label: "Home", icon: "◆" },
  { to: "/learn", label: "Learn", icon: "▤" },
  { to: "/daily", label: "Today", icon: "◷" },
  { to: "/practice", label: "Practice", icon: "◈" },
] as const;

const SKILL_NAV = [
  { to: "/vocabulary", label: "Vocabulary", icon: "❖" },
  { to: "/grammar", label: "Grammar", icon: "▦" },
  { to: "/listening", label: "Listening", icon: "♪" },
  { to: "/reading", label: "Reading", icon: "▭" },
  { to: "/writing", label: "Writing", icon: "✎" },
  { to: "/speaking", label: "Speaking", icon: "◉" },
  { to: "/media", label: "Real Spanish", icon: "▶" },
] as const;

const TOOL_NAV = [
  { to: "/tutor", label: "AI Tutor", icon: "✦" },
  { to: "/progress", label: "Progress", icon: "▲" },
  { to: "/settings", label: "Settings", icon: "⚙" },
] as const;

export function Layout() {
  const { location } = useRouterState();

  const { data: me } = useQuery({ queryKey: ["me"], queryFn: () => api.get<Me>("/auth/me") });
  const { data: dashboard } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api.get<Dashboard>("/dashboard"),
    refetchInterval: 60_000,
  });

  const isActive = (to: string) =>
    to === "/" ? location.pathname === "/" : location.pathname.startsWith(to);

  return (
    <div className="app">
      <nav className="sidebar">
        <div className="brand">
          <span className="brand-mark">L</span>
          <span>Lingoza</span>
        </div>

        <NavGroup label="Course" items={COURSE_NAV} isActive={isActive} />
        <NavGroup
          label="Skills"
          items={SKILL_NAV}
          isActive={isActive}
          badges={{ "/vocabulary": dashboard?.wordsDue }}
        />
        <NavGroup label="Tools" items={TOOL_NAV} isActive={isActive} />

        {me && (
          <div style={{ marginTop: 20, padding: "12px 10px 0", borderTop: "1px solid var(--border)" }}>
            <div className="row" style={{ gap: 8 }}>
              <span className="badge badge-accent">{dashboard?.level ?? me.level}</span>
              {dashboard && dashboard.currentStreak > 0 && (
                <span className="tiny muted">🔥 {dashboard.currentStreak}d</span>
              )}
            </div>
            <div className="tiny muted" style={{ marginTop: 6 }}>
              {me.displayName}
            </div>
            <button
              className="btn btn-sm btn-ghost"
              style={{ marginTop: 6, paddingLeft: 0 }}
              onClick={() => {
                setToken(null);
                window.location.href = "/login";
              }}
            >
              Sign out
            </button>
          </div>
        )}
      </nav>

      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}

function NavGroup({
  label,
  items,
  isActive,
  badges = {},
}: {
  label: string;
  items: readonly { to: string; label: string; icon: string }[];
  isActive: (to: string) => boolean;
  badges?: Record<string, number | undefined>;
}) {
  return (
    <div className="nav-group">
      <div className="nav-label">{label}</div>
      {items.map((item) => {
        const badge = badges[item.to];
        return (
          <Link key={item.to} to={item.to} className={`nav-item ${isActive(item.to) ? "active" : ""}`}>
            <span className="nav-icon">{item.icon}</span>
            <span>{item.label}</span>
            {badge !== undefined && badge > 0 && <span className="nav-badge">{badge}</span>}
          </Link>
        );
      })}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="page-header">
      <div className="row-between">
        <div>
          <h1>{title}</h1>
          {description && <p>{description}</p>}
        </div>
        {action}
      </div>
    </header>
  );
}
