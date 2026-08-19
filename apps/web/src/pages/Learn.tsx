import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api, type LevelSummary, type Me } from "../lib/api";
import { PageHeader } from "../components/Layout";
import { Badge, Bar, Card, ErrorNote, Loading } from "../components/ui";

/**
 * The course map (§1): six CEFR levels, each with modules and lessons.
 * Locked lessons state exactly what is blocking them rather than being greyed
 * out with no explanation.
 */
export function LearnPage() {
  const me = useQuery({ queryKey: ["me"], queryFn: () => api.get<Me>("/auth/me") });
  const curriculum = useQuery({
    queryKey: ["curriculum"],
    queryFn: () => api.get<{ levels: LevelSummary[] }>("/curriculum"),
  });

  const [openLevel, setOpenLevel] = useState<string | null>(null);
  const currentLevel = me.data?.level ?? "A1";
  const expanded = openLevel ?? currentLevel;

  if (curriculum.isLoading) return <div className="page"><Loading /></div>;
  if (curriculum.error) return <div className="page"><ErrorNote error={curriculum.error} /></div>;

  return (
    <div className="page">
      <PageHeader
        title="Learn"
        description="Six CEFR levels from complete beginner to mastery. Each lesson builds on the ones before it, so nothing unlocks until you have what it depends on."
      />

      <div className="col" style={{ gap: 12 }}>
        {curriculum.data?.levels.map((level) => {
          const lessons = level.courses.flatMap((c) => c.modules.flatMap((m) => m.lessons));
          const completed = lessons.filter((l) => l.status === "completed").length;
          const percent = lessons.length ? (completed / lessons.length) * 100 : 0;
          const isOpen = expanded === level.code;

          return (
            <Card key={level.code}>
              <div
                className="row-between"
                style={{ cursor: "pointer" }}
                onClick={() => setOpenLevel(isOpen ? "" : level.code)}
              >
                <div className="row" style={{ gap: 12 }}>
                  <Badge tone={level.code === currentLevel ? "accent" : undefined}>{level.code}</Badge>
                  <div>
                    <h2>{level.name}</h2>
                    <div className="tiny muted">
                      {completed} / {lessons.length} lessons
                    </div>
                  </div>
                </div>
                <div className="row" style={{ gap: 12, minWidth: 130 }}>
                  <div style={{ flex: 1 }}>
                    <Bar value={percent} tone={percent === 100 ? "success" : undefined} />
                  </div>
                  <span className="tiny muted">{isOpen ? "▾" : "▸"}</span>
                </div>
              </div>

              {isOpen && (
                <>
                  <p className="small secondary" style={{ margin: "14px 0 0" }}>{level.canDo}</p>
                  <div className="col mt" style={{ gap: 18 }}>
                    {level.courses.flatMap((course) =>
                      course.modules.map((module) => (
                        <div key={module.slug}>
                          <div className="row-between mb">
                            <div>
                              <h3>{module.title}</h3>
                              <div className="tiny muted">{module.description}</div>
                            </div>
                            <Badge>{module.theme}</Badge>
                          </div>
                          <div className="col" style={{ gap: 6 }}>
                            {module.lessons.map((lesson) => (
                              <LessonRow key={lesson.slug} lesson={lesson} />
                            ))}
                          </div>
                        </div>
                      )),
                    )}
                  </div>
                </>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function LessonRow({ lesson }: { lesson: LevelSummary["courses"][number]["modules"][number]["lessons"][number] }) {
  const status =
    lesson.status === "completed" ? "✓" : lesson.status === "in_progress" ? "◐" : lesson.unlocked ? "○" : "🔒";

  const inner = (
    <div
      className="row-between"
      style={{
        padding: "9px 12px",
        borderRadius: 9,
        background: "var(--surface-2)",
        opacity: lesson.unlocked ? 1 : 0.62,
      }}
    >
      <div className="row" style={{ gap: 10, minWidth: 0 }}>
        <span style={{ color: lesson.status === "completed" ? "var(--success)" : "var(--text-muted)" }}>
          {status}
        </span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: "0.9rem", fontWeight: 520 }}>{lesson.title}</div>
          <div className="tiny muted">{lesson.lockReason ?? lesson.objective}</div>
        </div>
      </div>
      <div className="row" style={{ gap: 8 }}>
        {lesson.status === "completed" && lesson.score > 0 && (
          <span className="tiny mono muted">{Math.round(lesson.score)}%</span>
        )}
        <span className="tiny muted">{lesson.estimatedMinutes}m</span>
      </div>
    </div>
  );

  if (!lesson.unlocked) return inner;

  return (
    <Link to="/lesson/$slug" params={{ slug: lesson.slug }}>
      {inner}
    </Link>
  );
}
