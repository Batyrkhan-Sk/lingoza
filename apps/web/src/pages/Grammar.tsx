import { useState } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api, type ExerciseView } from "../lib/api";
import { PageHeader } from "../components/Layout";
import { Badge, Bar, Card, Loading, Prose } from "../components/ui";
import { Quiz } from "../components/Quiz";
import { MemoryHook } from "../components/MemoryHook";

/**
 * Grammar (§5): a progression from basic to advanced, plus the explicit
 * head-to-head contrasts (ser vs estar, por vs para…) that account for most
 * persistent errors.
 */

interface TopicSummary {
  id: string; slug: string; title: string; levelCode: string;
  category: string; formula: string; mastery: number; status: string;
}

interface Contrast {
  id: string; slug: string; title: string; summary: string; detail: string;
  labelA: string; labelB: string;
  rows: { id: string; dimension: string; sideA: string; sideB: string; exampleA: string; exampleB: string }[];
}

export function GrammarPage() {
  const [tab, setTab] = useState<"topics" | "contrasts">("topics");

  const topics = useQuery({
    queryKey: ["grammar"],
    queryFn: () => api.get<{ topics: TopicSummary[] }>("/grammar"),
  });
  const contrasts = useQuery({
    queryKey: ["contrasts"],
    queryFn: () => api.get<{ contrasts: Contrast[] }>("/grammar/contrasts"),
  });

  return (
    <div className="page">
      <PageHeader
        title="Grammar"
        description="Every structure with its pattern, its real uses, and the mistakes learners actually make with it."
        action={
          <div className="row" style={{ gap: 6 }}>
            <button className={`btn btn-sm ${tab === "topics" ? "btn-primary" : ""}`} onClick={() => setTab("topics")}>
              Topics
            </button>
            <button className={`btn btn-sm ${tab === "contrasts" ? "btn-primary" : ""}`} onClick={() => setTab("contrasts")}>
              Easily confused
            </button>
          </div>
        }
      />

      {tab === "topics" ? (
        topics.isLoading ? <Loading /> : (
          <div className="col" style={{ gap: 10 }}>
            {["A1", "A2", "B1", "B2", "C1", "C2"].map((level) => {
              const group = topics.data?.topics.filter((t) => t.levelCode === level) ?? [];
              if (group.length === 0) return null;
              return (
                <div key={level}>
                  <div className="row mb" style={{ gap: 8 }}>
                    <Badge tone="accent">{level}</Badge>
                    <span className="tiny muted">{group.length} topics</span>
                  </div>
                  <div className="grid grid-2">
                    {group.map((topic) => (
                      <Link key={topic.slug} to="/grammar/$slug" params={{ slug: topic.slug }}>
                        <Card hover>
                          <div className="row-between">
                            <h3>{topic.title}</h3>
                            <Badge tone={topic.mastery >= 85 ? "success" : topic.mastery > 0 ? "warning" : undefined}>
                              {topic.mastery > 0 ? `${Math.round(topic.mastery)}%` : "new"}
                            </Badge>
                          </div>
                          <div className="mono tiny muted mt">{topic.formula}</div>
                          {topic.mastery > 0 && <div className="mt"><Bar value={topic.mastery} /></div>}
                        </Card>
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : contrasts.isLoading ? <Loading /> : (
        <div className="col" style={{ gap: 14 }}>
          {contrasts.data?.contrasts.map((contrast) => (
            <Card key={contrast.id}>
              <h2>{contrast.title}</h2>
              <p className="secondary" style={{ margin: "6px 0 12px" }}>{contrast.summary}</p>
              <Prose text={contrast.detail} />
              <div className="table-scroll mt">
                <table className="contrast-table">
                  <thead>
                    <tr>
                      <th></th>
                      <th>{contrast.labelA}</th>
                      <th>{contrast.labelB}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contrast.rows.map((row) => (
                      <tr key={row.id}>
                        <td className="tiny muted">{row.dimension}</td>
                        <td>
                          <div>{row.sideA}</div>
                          <div className="tiny" style={{ color: "var(--accent-text)", marginTop: 3 }}>{row.exampleA}</div>
                        </td>
                        <td>
                          <div>{row.sideB}</div>
                          <div className="tiny" style={{ color: "var(--accent-text)", marginTop: 3 }}>{row.exampleB}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

interface TopicDetail extends TopicSummary {
  explanation: string;
  whenToUse: string;
  examples: { id: string; spanish: string; english: string; note: string | null; realWorld: boolean }[];
  mistakes: { id: string; wrong: string; right: string; explanation: string }[];
  exercises: ExerciseView[];
  contrasts: Contrast[];
}

export function GrammarTopicPage() {
  const { slug } = useParams({ from: "/grammar/$slug" });
  const topic = useQuery({
    queryKey: ["grammar", slug],
    queryFn: () => api.get<TopicDetail>(`/grammar/${slug}`),
  });

  if (topic.isLoading) return <div className="page"><Loading /></div>;
  if (!topic.data) return null;
  const data = topic.data;

  return (
    <div className="page">
      <Link to="/grammar" className="tiny muted">← Grammar</Link>
      <div className="row-between" style={{ marginTop: 6, marginBottom: 18 }}>
        <h1>{data.title}</h1>
        <Badge tone="accent">{data.levelCode}</Badge>
      </div>

      <Card className="mb">
        <div className="stat-label mb">The pattern</div>
        <div className="mono example">{data.formula}</div>
        <div className="mt-lg"><Prose text={data.explanation} /></div>
        <div className="stat-label mt-lg mb">When to use it</div>
        <p className="secondary">{data.whenToUse}</p>
        <div className="mt">
          <MemoryHook scope="grammar" targetId={data.id} autoOpen />
        </div>
      </Card>

      <Card className="mb">
        <h2 className="mb">Examples</h2>
        <div className="col">
          {data.examples.map((example) => (
            <div key={example.id} className="example">
              <div className="row-between">
                <span className="example-es">{example.spanish}</span>
                {example.realWorld && <Badge tone="info">real use</Badge>}
              </div>
              <div className="example-en">{example.english}</div>
              {example.note && <div className="example-note">{example.note}</div>}
            </div>
          ))}
        </div>
      </Card>

      {data.mistakes.length > 0 && (
        <Card className="mb">
          <h2 className="mb">Common mistakes</h2>
          {data.mistakes.map((mistake) => (
            <div key={mistake.id} className="correction">
              <span className="correction-wrong">{mistake.wrong}</span>
              {" → "}
              <span className="correction-right">{mistake.right}</span>
              <div className="tiny muted" style={{ marginTop: 4 }}>{mistake.explanation}</div>
            </div>
          ))}
        </Card>
      )}

      {data.exercises.length > 0 && (
        <Card>
          <h2>Practice</h2>
          {data.exercises.map((exercise) => (
            <Quiz key={exercise.id} exercise={exercise} />
          ))}
        </Card>
      )}
    </div>
  );
}
