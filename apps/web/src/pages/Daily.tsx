import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { PageHeader } from "../components/Layout";
import { Badge, Bar, Card, Loading } from "../components/ui";

/**
 * Today's session (§13): a personalised plan sized to the learner's time
 * budget, with each item stating why it is there.
 */

interface DailySession {
  id: string;
  date: string;
  targetMinutes: number;
  status: string;
  completedItems: number;
  totalItems: number;
  items: {
    id: string;
    kind: string;
    title: string;
    rationale: string;
    minutes: number;
    completed: boolean;
    lessonId: string | null;
  }[];
}

const DESTINATION: Record<string, string> = {
  vocabulary: "/vocabulary",
  review: "/vocabulary",
  grammar: "/grammar",
  exercise: "/practice",
  listening: "/listening",
  speaking: "/speaking",
  conversation: "/tutor",
  lesson: "/learn",
};

export function DailyPage() {
  const queryClient = useQueryClient();

  const session = useQuery({ queryKey: ["daily"], queryFn: () => api.get<DailySession>("/daily") });

  const complete = useMutation({
    mutationFn: (itemId: string) => api.post<DailySession>(`/daily/items/${itemId}/complete`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["daily"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const regenerate = useMutation({
    mutationFn: () => api.get<DailySession>("/daily?regenerate=true"),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ["daily"] }),
  });

  if (session.isLoading) return <div className="page"><Loading /></div>;
  if (!session.data) return null;

  const data = session.data;
  const percent = data.totalItems ? (data.completedItems / data.totalItems) * 100 : 0;

  return (
    <div className="page">
      <PageHeader
        title="Today"
        description="Built this morning from what you know, what is due, and where you are weakest."
        action={
          <button className="btn btn-sm" onClick={() => regenerate.mutate()} disabled={regenerate.isPending}>
            Rebuild plan
          </button>
        }
      />

      <Card className="mb">
        <div className="row-between mb">
          <div>
            <div className="stat-value">{data.targetMinutes} min</div>
            <div className="tiny muted">
              {data.completedItems} of {data.totalItems} done
            </div>
          </div>
          <Badge tone={data.status === "completed" ? "success" : undefined}>{data.status}</Badge>
        </div>
        <Bar value={percent} tone={percent === 100 ? "success" : undefined} />
      </Card>

      <div className="col" style={{ gap: 8 }}>
        {data.items.map((item) => (
          <Card key={item.id}>
            <div className="row-between wrap" style={{ gap: 10 }}>
              <div style={{ minWidth: 0 }}>
                <div className="row" style={{ gap: 8 }}>
                  <span style={{ color: item.completed ? "var(--success)" : "var(--text-muted)" }}>
                    {item.completed ? "✓" : "○"}
                  </span>
                  <span style={{ fontWeight: 550 }}>{item.title}</span>
                  <Badge>{item.minutes} min</Badge>
                </div>
                <div className="tiny muted" style={{ marginLeft: 22 }}>{item.rationale}</div>
              </div>
              <div className="row" style={{ gap: 6 }}>
                <Link to={DESTINATION[item.kind] ?? "/learn"} className="btn btn-sm btn-primary">
                  Start
                </Link>
                {!item.completed && (
                  <button className="btn btn-sm" onClick={() => complete.mutate(item.id)}>
                    Mark done
                  </button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
