import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api, type HomeData } from "../lib/api";
import { PageHeader } from "../components/Layout";
import { Badge, Card, Empty, Loading } from "../components/ui";

/**
 * Practice: mixed drilling, driven by what the learner is actually getting
 * wrong rather than by a fixed rotation.
 */

interface Scenario {
  id: string; slug: string; title: string; levelCode: string;
  setting: string; goal: string; icon: string; usefulPhrases: string[];
}

export function PracticePage() {
  const home = useQuery({ queryKey: ["home"], queryFn: () => api.get<HomeData>("/home") });
  const scenarios = useQuery({
    queryKey: ["scenarios"],
    queryFn: () => api.get<{ scenarios: Scenario[] }>("/scenarios"),
  });
  const mistakes = useQuery({
    queryKey: ["mistakes"],
    queryFn: () =>
      api.get<{ patterns: { patternKey: string; label: string; occurrences: number }[] }>("/mistakes"),
  });

  if (home.isLoading) return <div className="page"><Loading /></div>;

  return (
    <div className="page">
      <PageHeader
        title="Practice"
        description="Targeted drilling and real-world role-play. What appears here follows your weak spots."
      />

      <Card className="mb">
        <h2 className="mb">Target your weak points</h2>
        {(mistakes.data?.patterns.length ?? 0) === 0 ? (
          <p className="small muted">
            Nothing recorded yet. Do some writing or talk to the tutor, and the mistakes you repeat
            will show up here as drills.
          </p>
        ) : (
          <div className="col" style={{ gap: 8 }}>
            {mistakes.data?.patterns.map((pattern) => (
              <div key={pattern.patternKey} className="row-between">
                <div>
                  <div style={{ fontWeight: 540, fontSize: "0.9rem" }}>{pattern.label}</div>
                  <div className="tiny muted">{pattern.occurrences} times</div>
                </div>
                <Link to="/grammar" className="btn btn-sm">Review the rule</Link>
              </div>
            ))}
          </div>
        )}
      </Card>

      <h2 className="mb">Real-world scenarios</h2>
      {scenarios.isLoading ? (
        <Loading />
      ) : (
        <div className="grid grid-2">
          {scenarios.data?.scenarios.map((scenario) => (
            <Card key={scenario.id}>
              <div className="row-between">
                <h3>{scenario.title}</h3>
                <Badge>{scenario.levelCode}</Badge>
              </div>
              <p className="small secondary" style={{ margin: "6px 0" }}>{scenario.goal}</p>
              <div className="row wrap tiny muted" style={{ gap: 6 }}>
                {scenario.usefulPhrases.slice(0, 2).map((phrase) => (
                  <span key={phrase} className="badge">{phrase}</span>
                ))}
              </div>
              <Link to="/tutor" className="btn btn-sm btn-primary mt">Role-play this →</Link>
            </Card>
          ))}
        </div>
      )}
      {scenarios.data?.scenarios.length === 0 && <Empty title="No scenarios at your level yet" />}
    </div>
  );
}
