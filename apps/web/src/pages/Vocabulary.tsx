import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type Word } from "../lib/api";
import { PageHeader } from "../components/Layout";
import { Badge, Card, Empty, Loading, SpeakButton } from "../components/ui";
import { MemoryHook } from "../components/MemoryHook";

/**
 * Vocabulary (§4): a spaced-repetition review session plus a browsable list of
 * everything the learner has met, with its current strength.
 */
export function VocabularyPage() {
  const [mode, setMode] = useState<"review" | "browse">("review");

  return (
    <div className="page">
      <PageHeader
        title="Vocabulary"
        description="Words come back exactly when you are about to forget them. Reviewing on the day they are due is what turns them into long-term memory."
        action={
          <div className="row" style={{ gap: 6 }}>
            <button className={`btn btn-sm ${mode === "review" ? "btn-primary" : ""}`} onClick={() => setMode("review")}>
              Review
            </button>
            <button className={`btn btn-sm ${mode === "browse" ? "btn-primary" : ""}`} onClick={() => setMode("browse")}>
              Browse
            </button>
          </div>
        }
      />
      {mode === "review" ? <ReviewSession /> : <BrowseList />}
    </div>
  );
}

interface DueItem {
  word: Word;
  isNew: boolean;
  state: { strength: number; status: string } | null;
}

interface PlannedBlock {
  title: string;
  quantity: number | null;
  progress: number;
}

interface PlanAdvance {
  justCompleted: boolean;
  remaining: number | null;
  item: { title: string };
  next: { title: string; rationale: string; minutes: number } | null;
}

function ReviewSession() {
  const queryClient = useQueryClient();
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(0);
  // Set when a block of today's plan hits its budget, so the session ends where
  // the plan said it would instead of running the whole queue.
  const [finished, setFinished] = useState<PlanAdvance | null>(null);

  const due = useQuery({
    queryKey: ["vocab-due"],
    queryFn: () =>
      api.get<{
        queue: DueItem[];
        summary: { total: number; reviews: number; learning: number; fresh: number };
        plan: PlannedBlock | null;
      }>("/vocabulary/due?limit=20"),
  });

  const review = useMutation({
    mutationFn: ({ wordId, grade }: { wordId: string; grade: string }) =>
      api.post<{ intervalDays: number; status: string; plan: PlanAdvance | null }>(
        `/vocabulary/${wordId}/review`,
        { grade, source: "web" },
      ),
    onSuccess: async (result) => {
      setRevealed(false);
      setDone((n) => n + 1);
      if (result.plan?.justCompleted) setFinished(result.plan);
      await queryClient.invalidateQueries({ queryKey: ["vocab-due"] });
      await queryClient.invalidateQueries({ queryKey: ["daily"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  if (due.isLoading) return <Loading />;

  if (finished) {
    return (
      <Card>
        <div className="center" style={{ padding: "22px 0" }}>
          <Badge tone="success">Done</Badge>
          <div style={{ fontSize: "1.3rem", fontWeight: 600, margin: "12px 0 4px" }}>
            {finished.item.title}
          </div>
          <div className="small muted">
            That is the whole block — {done} card{done === 1 ? "" : "s"} this session.
          </div>
          {finished.next && (
            <div className="mt-lg">
              <div className="small">Next up: <strong>{finished.next.title}</strong></div>
              <div className="tiny muted">{finished.next.rationale} · {finished.next.minutes} min</div>
            </div>
          )}
          <div className="row mt-lg" style={{ justifyContent: "center", gap: 8 }}>
            <Link to="/daily" className="btn btn-primary">Today's plan</Link>
            <button className="btn" onClick={() => setFinished(null)}>Keep reviewing</button>
          </div>
        </div>
      </Card>
    );
  }

  const item = due.data?.queue[0];

  if (!item) {
    return (
      <Card>
        <Empty
          title="Nothing due right now"
          hint={
            done > 0
              ? `You reviewed ${done} word${done === 1 ? "" : "s"}. Come back tomorrow — spacing is the point.`
              : "Complete a lesson to add words to your queue."
          }
        />
      </Card>
    );
  }

  const word = item.word;
  const plan = due.data?.plan;

  return (
    <>
      <div className="row mb" style={{ gap: 14 }}>
        {plan?.quantity ? (
          <span className="tiny muted">
            {plan.title} — {Math.min(plan.progress + 1, plan.quantity)} of {plan.quantity}
          </span>
        ) : (
          <span className="tiny muted">{due.data?.summary.total ?? 0} due</span>
        )}
        <span className="tiny muted">·</span>
        <span className="tiny muted">{done} done this session</span>
      </div>

      <Card>
        <div className="center" style={{ padding: "22px 0" }}>
          {item.isNew && <Badge tone="info">New word</Badge>}
          <div style={{ fontSize: "2rem", fontWeight: 620, margin: "12px 0 4px" }}>{word.spanish}</div>
          <div className="small muted mono">{word.pronunciation}</div>
          <div className="mt">
            <SpeakButton text={word.spanish} label="Listen" />
          </div>

          {revealed ? (
            <div className="mt-lg">
              <div style={{ fontSize: "1.15rem", fontWeight: 540 }}>{word.english}</div>
              <div className="row" style={{ justifyContent: "center", gap: 8, marginTop: 8 }}>
                {word.gender && <Badge>{word.gender === "m" ? "masculine" : "feminine"}</Badge>}
                {word.pluralForm && <Badge>pl. {word.pluralForm}</Badge>}
                <Badge>{word.levelCode}</Badge>
              </div>
              <div className="example mt-lg" style={{ textAlign: "left" }}>
                <div className="example-es">{word.exampleSentence}</div>
                <div className="example-en">{word.exampleTranslation}</div>
              </div>
              {word.regionalVariant && (
                <div className="tiny muted mt">
                  In {word.region === "es-ES" ? "Latin America" : "Spain"}: {word.regionalVariant}
                </div>
              )}
              {/* Only after the answer is revealed — never before the attempt. */}
              <div className="mt">
                <MemoryHook scope="word" targetId={word.id} />
              </div>
            </div>
          ) : (
            <div className="mt-lg">
              <button className="btn btn-primary btn-lg" onClick={() => setRevealed(true)}>
                Show answer
              </button>
            </div>
          )}
        </div>

        {revealed && (
          <>
            <div className="tiny muted center mb">How well did you know it?</div>
            <div className="row" style={{ gap: 8 }}>
              {[
                { grade: "again", label: "Again", hint: "No idea" },
                { grade: "hard", label: "Hard", hint: "Struggled" },
                { grade: "good", label: "Good", hint: "Knew it" },
                { grade: "easy", label: "Easy", hint: "Instant" },
              ].map((option) => (
                <button
                  key={option.grade}
                  className="btn btn-block"
                  disabled={review.isPending}
                  onClick={() => review.mutate({ wordId: word.id, grade: option.grade })}
                  style={{ flexDirection: "column", gap: 1, padding: "8px 4px" }}
                >
                  <span>{option.label}</span>
                  <span className="tiny muted">{option.hint}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </Card>
    </>
  );
}

function BrowseList() {
  const [search, setSearch] = useState("");
  const [level, setLevel] = useState("");

  const words = useQuery({
    queryKey: ["vocab-list", search, level],
    queryFn: () =>
      api.get<{ words: Word[] }>(
        `/vocabulary?limit=200${search ? `&search=${encodeURIComponent(search)}` : ""}${level ? `&level=${level}` : ""}`,
      ),
  });

  return (
    <>
      <div className="row mb wrap" style={{ gap: 8 }}>
        <input
          className="input"
          style={{ maxWidth: 260 }}
          placeholder="Search Spanish or English…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select className="select" style={{ width: "auto" }} value={level} onChange={(e) => setLevel(e.target.value)}>
          <option value="">All levels</option>
          {["A1", "A2", "B1", "B2", "C1", "C2"].map((code) => (
            <option key={code} value={code}>{code}</option>
          ))}
        </select>
      </div>

      {words.isLoading ? (
        <Loading />
      ) : (
        <div className="grid grid-2">
          {words.data?.words.map((word) => (
            <Card key={word.id}>
              <div className="row-between">
                <div style={{ minWidth: 0 }}>
                  <div className="row" style={{ gap: 6 }}>
                    <span style={{ fontWeight: 570 }}>{word.spanish}</span>
                    {word.gender && <span className="tiny muted">({word.gender})</span>}
                  </div>
                  <div className="small secondary">{word.english}</div>
                </div>
                <div className="row" style={{ gap: 4 }}>
                  <Badge tone={statusTone(word.status)}>{word.status ?? "new"}</Badge>
                  <SpeakButton text={word.spanish} />
                </div>
              </div>
              <div className="tiny muted mt">{word.exampleSentence}</div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

function statusTone(status?: string): "success" | "warning" | "info" | undefined {
  if (status === "mastered") return "success";
  if (status === "learning") return "warning";
  if (status === "review") return "info";
  return undefined;
}
