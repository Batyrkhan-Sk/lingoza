import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api, type Dashboard, type HomeData } from "../lib/api";
import { PageHeader } from "../components/Layout";
import { Badge, Bar, Card, Empty, ErrorNote, Loading, SkillMeter } from "../components/ui";

/**
 * Home (§22): continue learning, today's goal, progress, weak areas and the
 * recommended next step — in that order, because that is the order a returning
 * learner needs them.
 */
export function HomePage() {
  const home = useQuery({ queryKey: ["home"], queryFn: () => api.get<HomeData>("/home") });
  const dashboard = useQuery({ queryKey: ["dashboard"], queryFn: () => api.get<Dashboard>("/dashboard") });

  if (home.isLoading) return <div className="page"><Loading /></div>;
  if (home.error) return <div className="page"><ErrorNote error={home.error} /></div>;
  if (!home.data) return null;

  const data = home.data;
  const stats = dashboard.data;
  const goalPercent = stats ? (stats.minutesToday / stats.dailyTimeBudget) * 100 : 0;

  return (
    <div className="page">
      <PageHeader title={`¡Hola!`} description={data.headline} />

      {!data.hasPlacement && (
        <Card className="mb">
          <div className="row-between wrap">
            <div>
              <h3>We don't know your level yet</h3>
              <p className="small secondary" style={{ margin: "4px 0 0", maxWidth: "52ch" }}>
                Fifteen minutes now means you start in the right place instead of relearning what
                you already know — or drowning in what you don't.
              </p>
            </div>
            <Link to="/placement" className="btn btn-primary">Take the placement test</Link>
          </div>
        </Card>
      )}

      <div className="grid grid-2 mb">
        {/* Continue learning */}
        <Card>
          <div className="stat-label">Continue learning</div>
          {data.continueLesson ? (
            <>
              <h2 style={{ margin: "8px 0 12px" }}>{data.continueLesson.title}</h2>
              <Link
                to="/lesson/$slug"
                params={{ slug: data.continueLesson.slug }}
                className="btn btn-primary"
              >
                Continue →
              </Link>
            </>
          ) : (
            <Empty title="Nothing in progress" hint="Pick a lesson from Learn to get started." />
          )}
        </Card>

        {/* Today's goal */}
        <Card>
          <div className="row-between">
            <div className="stat-label">Today's goal</div>
            <Badge tone={goalPercent >= 100 ? "success" : undefined}>
              {stats ? `${stats.minutesToday} / ${stats.dailyTimeBudget} min` : "—"}
            </Badge>
          </div>
          <div style={{ margin: "12px 0" }}>
            <Bar value={goalPercent} tone={goalPercent >= 100 ? "success" : undefined} />
          </div>
          <div className="row wrap" style={{ gap: 14 }}>
            <span className="small secondary">🔥 {data.streak}-day streak</span>
            <span className="small secondary">⭐ {data.xp} XP</span>
            {data.wordsDue > 0 && (
              <Link to="/vocabulary" className="small" style={{ color: "var(--accent-text)" }}>
                {data.wordsDue} words due →
              </Link>
            )}
          </div>
        </Card>
      </div>

      {/* Progress */}
      <Card className="mb">
        <div className="row-between mb">
          <h2>Your Spanish</h2>
          <Badge tone="accent">{data.level}</Badge>
        </div>
        <div className="col" style={{ gap: 6, marginBottom: 16 }}>
          <div className="row-between">
            <span className="small secondary">Course progress</span>
            <span className="small mono">{Math.round(data.courseProgress)}%</span>
          </div>
          <Bar value={data.courseProgress} />
        </div>
        {stats && (
          <div className="grid grid-3">
            <SkillMeter label="Vocabulary" value={stats.skills.vocabulary} />
            <SkillMeter label="Grammar" value={stats.skills.grammar} />
            <SkillMeter label="Listening" value={stats.skills.listening} />
            <SkillMeter label="Reading" value={stats.skills.reading} />
            <SkillMeter label="Speaking" value={stats.skills.speaking} />
            <SkillMeter label="Writing" value={stats.skills.writing} />
          </div>
        )}
        {data.advancement.ready && (
          <div className="feedback feedback-correct mt">{data.advancement.reason}</div>
        )}
      </Card>

      <div className="grid grid-2">
        {/* Weak areas */}
        <Card>
          <h2 className="mb">Weak areas</h2>
          {data.weakAreas.length === 0 ? (
            <p className="small muted">Nothing is lagging — keep going as you are.</p>
          ) : (
            <div className="col">
              {data.weakAreas.map((area) => (
                <div key={area.key}>
                  <div className="row-between">
                    <span style={{ fontWeight: 550, fontSize: "0.9rem" }}>{area.label}</span>
                    <Badge tone={area.urgency > 60 ? "danger" : "warning"}>
                      {area.urgency > 60 ? "focus" : "watch"}
                    </Badge>
                  </div>
                  <div className="tiny muted">{area.detail}</div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Recommended for you */}
        <Card>
          <h2 className="mb">Recommended for you</h2>
          <div className="col">
            {data.recommendations.slice(0, 5).map((rec, index) => (
              <RecommendationRow key={`${rec.kind}-${index}`} rec={rec} />
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

const ROUTE_FOR: Record<string, string> = {
  lesson: "/learn",
  vocabulary_review: "/vocabulary",
  grammar_drill: "/grammar",
  listening: "/listening",
  speaking: "/speaking",
  reading: "/reading",
  writing: "/writing",
  conversation: "/tutor",
  placement: "/placement",
};

function RecommendationRow({ rec }: { rec: HomeData["recommendations"][number] }) {
  const body = (
    <div className="row-between" style={{ gap: 10 }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 550, fontSize: "0.9rem" }}>{rec.title}</div>
        <div className="tiny muted">{rec.reason}</div>
      </div>
      <span className="tiny muted" style={{ whiteSpace: "nowrap" }}>{rec.minutes} min</span>
    </div>
  );

  if (rec.kind === "lesson" && rec.targetSlug) {
    return (
      <Link to="/lesson/$slug" params={{ slug: rec.targetSlug }}>
        {body}
      </Link>
    );
  }

  return <Link to={ROUTE_FOR[rec.kind] ?? "/learn"}>{body}</Link>;
}
