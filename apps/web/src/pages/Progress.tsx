import { useQuery } from "@tanstack/react-query";
import { api, type Dashboard, type HomeData } from "../lib/api";
import { PageHeader } from "../components/Layout";
import { Badge, Bar, Card, Loading, SkillMeter, Stat } from "../components/ui";

/**
 * The progress dashboard (§11).
 *
 * Every number here is one the learner can act on, and the page ends by saying
 * what to study next — a dashboard that only reports is a dashboard nobody
 * opens twice.
 */
export function ProgressPage() {
  const dashboard = useQuery({ queryKey: ["dashboard"], queryFn: () => api.get<Dashboard>("/dashboard") });
  const home = useQuery({ queryKey: ["home"], queryFn: () => api.get<HomeData>("/home") });
  const achievements = useQuery({
    queryKey: ["achievements"],
    queryFn: () =>
      api.get<{ achievements: { slug: string; title: string; description: string; icon: string; unlocked: boolean; category: string }[] }>(
        "/achievements",
      ),
  });
  const mistakes = useQuery({
    queryKey: ["mistakes"],
    queryFn: () =>
      api.get<{ patterns: { patternKey: string; label: string; occurrences: number; severity: number }[] }>("/mistakes"),
  });

  if (dashboard.isLoading) return <div className="page"><Loading /></div>;
  if (!dashboard.data) return null;
  const data = dashboard.data;

  const hours = Math.floor(data.totalStudyMinutes / 60);
  const minutes = data.totalStudyMinutes % 60;

  return (
    <div className="page">
      <PageHeader title="Progress" description="Where you are, what is working, and what to do next." />

      <div className="grid grid-2 mb">
        <Card>
          <div className="row-between">
            <Stat label="Spanish level" value={data.level} sub={`${Math.round(data.overall)}% overall proficiency`} />
            <Badge tone="accent">Level {data.playerLevel}</Badge>
          </div>
          <div className="mt-lg col" style={{ gap: 6 }}>
            <div className="row-between">
              <span className="small secondary">Course progress</span>
              <span className="small mono">{Math.round(data.courseProgress)}%</span>
            </div>
            <Bar value={data.courseProgress} />
          </div>
        </Card>

        <Card>
          <div className="grid grid-2">
            <Stat label="Streak" value={`${data.currentStreak}`} sub={`best ${data.longestStreak} days`} />
            <Stat label="XP" value={data.xp} sub={`${data.xpForNextLevel} to next level`} />
            <Stat label="Studied" value={`${hours}h ${minutes}m`} sub={`${data.minutesToday} min today`} />
            <Stat label="Lessons" value={data.lessonsCompleted} sub="completed" />
          </div>
        </Card>
      </div>

      <Card className="mb">
        <h2 className="mb">Skills</h2>
        <div className="grid grid-3">
          <SkillMeter label="Vocabulary" value={data.skills.vocabulary} sub={`${data.wordsLearned} words · ${data.wordsMastered} mastered`} />
          <SkillMeter label="Grammar" value={data.skills.grammar} sub={`${data.grammarMastered} topics mastered`} />
          <SkillMeter label="Listening" value={data.skills.listening} />
          <SkillMeter label="Reading" value={data.skills.reading} />
          <SkillMeter label="Speaking" value={data.skills.speaking} />
          <SkillMeter label="Writing" value={data.skills.writing} />
        </div>
      </Card>

      <div className="grid grid-2 mb">
        <Card>
          <h2 className="mb">What to study next</h2>
          {home.data?.recommendations.slice(0, 4).map((rec, index) => (
            <div key={index} className="correction">
              <div style={{ fontWeight: 550, fontSize: "0.9rem" }}>{rec.title}</div>
              <div className="tiny muted">{rec.reason}</div>
            </div>
          ))}
        </Card>

        <Card>
          <h2 className="mb">Recurring mistakes</h2>
          {(mistakes.data?.patterns.length ?? 0) === 0 ? (
            <p className="small muted">
              No repeated mistakes recorded yet. They appear here once you have done some writing or
              speaking, and your daily sessions then target them.
            </p>
          ) : (
            <div className="col" style={{ gap: 8 }}>
              {mistakes.data?.patterns.map((pattern) => (
                <div key={pattern.patternKey} className="row-between">
                  <span className="small">{pattern.label}</span>
                  <Badge tone={pattern.severity > 1 ? "danger" : "warning"}>×{pattern.occurrences}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card>
        <h2 className="mb">Achievements</h2>
        <div className="grid grid-3">
          {achievements.data?.achievements.map((achievement) => (
            <div
              key={achievement.slug}
              className="example"
              style={{ opacity: achievement.unlocked ? 1 : 0.45 }}
            >
              <div className="row-between">
                <span style={{ fontWeight: 550, fontSize: "0.88rem" }}>{achievement.title}</span>
                {achievement.unlocked && <span>✓</span>}
              </div>
              <div className="tiny muted">{achievement.description}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
