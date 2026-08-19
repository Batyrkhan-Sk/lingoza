import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type CefrLevel } from "../lib/api";
import { PageHeader } from "../components/Layout";
import { Badge, Bar, Card, Loading, SpeakButton } from "../components/ui";

/**
 * The placement test (§2).
 *
 * Item levels are deliberately hidden while answering — telling someone "this
 * is a C1 question" changes how hard they try and biases the estimate. The
 * "Start from A1" escape hatch is always available.
 */

interface PlacementQuestion {
  id: string;
  section: string;
  prompt: string;
  context: string | null;
  audioText: string | null;
  options: { id: string; text: string }[];
}

interface PlacementOutcome {
  estimatedLevel: CefrLevel;
  confidence: number;
  correctCount: number;
  questionCount: number;
  sectionScores: Record<string, number>;
  recommendation: string;
  startingLesson: { slug: string; title: string; moduleTitle: string } | null;
}

const SECTION_LABELS: Record<string, string> = {
  vocabulary: "Vocabulary",
  grammar: "Grammar",
  reading: "Reading comprehension",
  listening: "Listening comprehension",
  sentence_construction: "Sentence construction",
  speaking: "Speaking",
};

export function PlacementPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [draft, setDraft] = useState("");
  const [outcome, setOutcome] = useState<PlacementOutcome | null>(null);

  const test = useQuery({
    queryKey: ["placement"],
    queryFn: () => api.get<{ questions: PlacementQuestion[] }>("/placement"),
  });

  const finish = useMutation({
    mutationFn: (final: Record<string, string>) =>
      api.post<PlacementOutcome>("/placement/submit", {
        answers: Object.entries(final).map(([questionId, answer]) => ({ questionId, answer })),
      }),
    onSuccess: async (result) => {
      setOutcome(result);
      await queryClient.invalidateQueries();
    },
  });

  const skip = useMutation({
    mutationFn: () => api.post<PlacementOutcome>("/placement/skip"),
    onSuccess: async (result) => {
      setOutcome(result);
      await queryClient.invalidateQueries();
    },
  });

  if (test.isLoading) return <div className="page"><Loading /></div>;

  const questions = test.data?.questions ?? [];
  const question = questions[index];

  if (outcome) {
    return (
      <div className="page">
        <PageHeader title="Your level" />
        <Card>
          <div className="center" style={{ padding: "16px 0" }}>
            <div className="stat-label">Estimated level</div>
            <div style={{ fontSize: "3rem", fontWeight: 680, letterSpacing: "-0.03em" }}>
              {outcome.estimatedLevel}
            </div>
            {outcome.questionCount > 0 && (
              <div className="small muted">
                {outcome.correctCount} / {outcome.questionCount} correct ·{" "}
                {Math.round(outcome.confidence * 100)}% confidence
              </div>
            )}
          </div>

          <p className="secondary">{outcome.recommendation}</p>

          {outcome.questionCount > 0 && (
            <div className="grid grid-2 mt-lg">
              {Object.entries(outcome.sectionScores)
                .filter(([, value]) => value > 0)
                .map(([section, value]) => (
                  <div key={section} className="col" style={{ gap: 5 }}>
                    <div className="row-between">
                      <span className="small secondary">{SECTION_LABELS[section] ?? section}</span>
                      <span className="small mono">{Math.round(value)}%</span>
                    </div>
                    <Bar value={value} tone={value >= 70 ? "success" : value >= 40 ? "warning" : "danger"} />
                  </div>
                ))}
            </div>
          )}

          <div className="row mt-lg wrap">
            {outcome.startingLesson && (
              <button
                className="btn btn-primary btn-lg"
                onClick={() => navigate({ to: "/lesson/$slug", params: { slug: outcome.startingLesson!.slug } })}
              >
                Start: {outcome.startingLesson.title}
              </button>
            )}
            <button className="btn" onClick={() => navigate({ to: "/learn" })}>
              See the whole course
            </button>
          </div>
        </Card>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="page">
        <Card>
          <p>No placement questions are available.</p>
          <button className="btn mt" onClick={() => navigate({ to: "/learn" })}>Go to the course</button>
        </Card>
      </div>
    );
  }

  const answer = (value: string) => {
    const next = { ...answers, [question.id]: value };
    setAnswers(next);
    setDraft("");
    if (index === questions.length - 1) finish.mutate(next);
    else setIndex(index + 1);
  };

  return (
    <div className="page">
      <PageHeader
        title="Placement test"
        description="About 15 minutes. Answer what you can and skip what you cannot — guessing wildly makes the result worse, not better."
      />

      <div className="row-between mb">
        <span className="tiny muted">Question {index + 1} of {questions.length}</span>
        <Badge>{SECTION_LABELS[question.section] ?? question.section}</Badge>
      </div>
      <div className="mb"><Bar value={((index + 1) / questions.length) * 100} /></div>

      <Card>
        {question.audioText && (
          <div className="example mb">
            <div className="row-between">
              <span className="small secondary">Listen and answer</span>
              <SpeakButton text={question.audioText} label="Play" />
            </div>
          </div>
        )}

        {question.context && !question.audioText && (
          <div className="example mb">
            <div className="es">{question.context}</div>
          </div>
        )}

        <div style={{ fontSize: "1.05rem", fontWeight: 530, marginBottom: 14 }}>{question.prompt}</div>

        {question.options.length > 0 ? (
          question.options.map((option) => (
            <button key={option.id} className="option" onClick={() => answer(option.text)}>
              {option.text}
            </button>
          ))
        ) : (
          <form
            className="row"
            onSubmit={(event) => {
              event.preventDefault();
              answer(draft.trim() || "—");
            }}
          >
            <input
              className="input"
              autoFocus
              value={draft}
              placeholder="Type your answer…"
              onChange={(event) => setDraft(event.target.value)}
            />
            <button className="btn btn-primary" type="submit">Next</button>
          </form>
        )}

        <div className="row-between mt-lg">
          <button className="btn btn-sm btn-ghost" onClick={() => answer("—")}>
            Skip this question
          </button>
          <button className="btn btn-sm btn-ghost" onClick={() => skip.mutate()} disabled={skip.isPending}>
            I'm a complete beginner — start from A1
          </button>
        </div>
      </Card>

      {finish.isPending && <Loading label="Working out your level" />}
    </div>
  );
}
