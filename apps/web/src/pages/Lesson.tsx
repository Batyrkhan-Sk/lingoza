import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  api,
  type ExerciseView,
  type LessonDetail,
  type LessonSectionName,
  type QuizOutcome,
} from "../lib/api";
import { Badge, Bar, Card, ErrorNote, Loading, Prose, SpeakButton, speak } from "../components/ui";
import { Quiz } from "../components/Quiz";

/**
 * The lesson player — the nine-section structure from §3.
 *
 * The learner's position is server state, not component state: refreshing,
 * switching device, or finishing the lesson in Telegram all resume at the same
 * place. Sections with no content are skipped by the engine, never shown empty.
 */

const SECTION_LABELS: Record<LessonSectionName, string> = {
  explanation: "Explanation",
  examples: "Examples",
  vocabulary: "Vocabulary",
  grammar: "Grammar",
  listening: "Listening",
  practice: "Practice",
  speaking: "Speaking",
  test: "Test",
  review: "Review",
};

export function LessonPage() {
  const { slug } = useParams({ from: "/lesson/$slug" });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [viewing, setViewing] = useState<LessonSectionName | null>(null);

  const lesson = useQuery({
    queryKey: ["lesson", slug],
    queryFn: () => api.get<LessonDetail>(`/lessons/${slug}`),
  });

  useEffect(() => {
    // Start (or re-touch) the lesson so "continue learning" points here.
    void api.post(`/lessons/${slug}/start`).catch(() => undefined);
  }, [slug]);

  const complete = useMutation({
    mutationFn: (section: LessonSectionName) =>
      api.post<{ nextSection: LessonSectionName | null; completed: boolean }>(
        `/lessons/${slug}/sections/${section}/complete`,
        { source: "web", minutes: 2 },
      ),
    onSuccess: async (result) => {
      setViewing(null);
      await queryClient.invalidateQueries({ queryKey: ["lesson", slug] });
      await queryClient.invalidateQueries({ queryKey: ["home"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      if (result.completed) await navigate({ to: "/learn" });
    },
  });

  if (lesson.isLoading) return <div className="page"><Loading /></div>;
  if (lesson.error) return <div className="page"><ErrorNote error={lesson.error} /></div>;
  if (!lesson.data) return null;

  const data = lesson.data;

  if (!data.unlocked) {
    return (
      <div className="page">
        <Card>
          <h1>{data.title}</h1>
          <p className="secondary mt">{data.lockReason}</p>
          <Link to="/learn" className="btn mt">Back to the course</Link>
        </Card>
      </div>
    );
  }

  const present = data.sections.available.filter((s) => s.present).map((s) => s.section);
  const current = viewing ?? data.sections.current;

  return (
    <div className="page">
      <div className="row-between mb">
        <div>
          <Link to="/learn" className="tiny muted">← {data.moduleTitle}</Link>
          <h1 style={{ marginTop: 4 }}>{data.title}</h1>
          <p className="small secondary" style={{ margin: "4px 0 0" }}>{data.objective}</p>
        </div>
        <Badge tone="accent">{data.level}</Badge>
      </div>

      <div style={{ marginBottom: 16 }}>
        <Bar value={data.sections.progressPercent} />
      </div>

      <div className="lesson-nav">
        {present.map((section) => {
          const done = data.sections.completed.includes(section);
          const isCurrent = section === current;
          return (
            <button
              key={section}
              className={`lesson-step ${isCurrent ? "current" : done ? "done" : ""}`}
              onClick={() => setViewing(section)}
            >
              {done && !isCurrent ? "✓ " : ""}
              {SECTION_LABELS[section]}
            </button>
          );
        })}
      </div>

      <Card>
        <SectionBody lesson={data} section={current} slug={slug} />
      </Card>

      <div className="row-between mt-lg">
        <span className="tiny muted">
          Section {present.indexOf(current) + 1} of {present.length}
        </span>
        {current === data.sections.current ? (
          <button
            className="btn btn-primary btn-lg"
            disabled={complete.isPending}
            onClick={() => complete.mutate(current)}
          >
            {complete.isPending ? "Saving…" : present.at(-1) === current ? "Finish lesson" : "Continue →"}
          </button>
        ) : (
          <button className="btn" onClick={() => setViewing(null)}>
            Back to where I was →
          </button>
        )}
      </div>
    </div>
  );
}

function SectionBody({
  lesson,
  section,
  slug,
}: {
  lesson: LessonDetail;
  section: LessonSectionName;
  slug: string;
}) {
  switch (section) {
    case "explanation":
      return (
        <>
          <Prose text={lesson.explanation} />
          {lesson.culturalNote && (
            <div className="feedback feedback-neutral mt">
              <strong>Culture · </strong>
              {lesson.culturalNote}
            </div>
          )}
        </>
      );

    case "examples":
      return (
        <div className="col">
          {lesson.examples.map((example) => (
            <div key={example.id} className="example">
              <div className="row-between">
                <span className="example-es">{example.spanish}</span>
                <SpeakButton text={example.spanish} />
              </div>
              <div className="example-en">{example.english}</div>
              {example.note && <div className="example-note">{example.note}</div>}
            </div>
          ))}
        </div>
      );

    case "vocabulary":
      return (
        <div className="grid grid-2">
          {lesson.vocabulary.map((word) => (
            <div key={word.id} className="example">
              <div className="row-between">
                <div>
                  <div className="example-es">
                    {word.spanish}
                    {word.gender && <span className="tiny muted"> ({word.gender})</span>}
                  </div>
                  <div className="example-en">{word.english}</div>
                </div>
                <SpeakButton text={word.spanish} />
              </div>
              <div className="example-note">
                {word.exampleSentence} — {word.exampleTranslation}
              </div>
            </div>
          ))}
        </div>
      );

    case "grammar":
      return (
        <div className="col" style={{ gap: 22 }}>
          {lesson.grammar.map((topic) => (
            <div key={topic.id}>
              <div className="row-between mb">
                <h2>{topic.title}</h2>
                <Link to="/grammar/$slug" params={{ slug: topic.slug }} className="btn btn-sm btn-ghost">
                  Full topic →
                </Link>
              </div>
              <div className="mono example mb">{topic.formula}</div>
              <Prose text={topic.explanation} />
              {topic.mistakes.length > 0 && (
                <>
                  <h3 className="mt">Common mistakes</h3>
                  <div className="col mt" style={{ gap: 8 }}>
                    {topic.mistakes.map((mistake, index) => (
                      <div key={index} className="correction">
                        <span className="correction-wrong">{mistake.wrong}</span>
                        {" → "}
                        <span className="correction-right">{mistake.right}</span>
                        <div className="tiny muted mt" style={{ marginTop: 4 }}>{mistake.explanation}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      );

    case "listening":
      return (
        <div className="col" style={{ gap: 20 }}>
          {lesson.listening.map((clip) => (
            <Transcript key={clip.id} clip={clip} />
          ))}
        </div>
      );

    case "practice":
    case "test": {
      const exercises = lesson.exercises.filter((e) => e.section === section);
      return (
        <div className="col" style={{ gap: 26 }}>
          {exercises.map((exercise) => (
            <ExerciseBlock key={exercise.id} exercise={exercise} lessonSlug={slug} />
          ))}
        </div>
      );
    }

    case "speaking":
      return (
        <div className="col">
          {lesson.speaking.map((prompt) => (
            <div key={prompt.id} className="example">
              <div style={{ fontWeight: 550 }}>{prompt.instruction}</div>
              {prompt.targetText && (
                <div className="row-between mt">
                  <span className="example-es">{prompt.targetText}</span>
                  <SpeakButton text={prompt.targetText} label="Hear it" />
                </div>
              )}
              <Link to="/speaking" className="btn btn-sm mt">
                Record and get feedback →
              </Link>
            </div>
          ))}
        </div>
      );

    case "review":
      return (
        <>
          <h2 className="mb">What to take away</h2>
          <Prose text={lesson.review} />
          <div className="feedback feedback-correct mt">
            Finish this lesson and the words you met here enter your spaced-repetition queue —
            they will come back exactly when you are about to forget them.
          </div>
        </>
      );

    default:
      return null;
  }
}

/** Transcript with per-line replay, speed control and hide/show (§6). */
function Transcript({ clip }: { clip: LessonDetail["listening"][number] }) {
  const [showTranscript, setShowTranscript] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const [rate, setRate] = useState(1);
  const [active, setActive] = useState<number | null>(null);

  const playAll = () => {
    const text = clip.segments.map((s) => s.spanish).join(" ");
    speak(text, rate);
  };

  return (
    <div>
      <div className="row-between mb wrap">
        <div>
          <h2>{clip.title}</h2>
          <div className="tiny muted">
            {clip.accent} · {clip.speed} speed
          </div>
        </div>
        <div className="row wrap" style={{ gap: 6 }}>
          <button className="btn btn-sm btn-primary" onClick={playAll}>▶ Play</button>
          <select
            className="select"
            style={{ width: "auto" }}
            value={rate}
            onChange={(event) => setRate(Number(event.target.value))}
          >
            <option value={0.6}>0.6× slow</option>
            <option value={0.8}>0.8×</option>
            <option value={1}>1× normal</option>
          </select>
          <button className="btn btn-sm" onClick={() => setShowTranscript((v) => !v)}>
            {showTranscript ? "Hide" : "Show"} transcript
          </button>
        </div>
      </div>

      {clip.intro && <p className="small secondary">{clip.intro}</p>}

      {showTranscript ? (
        <>
          <div className="col" style={{ gap: 2 }}>
            {clip.segments.map((segment, index) => (
              <div
                key={segment.id}
                className={`transcript-line ${active === index ? "active" : ""}`}
                onClick={() => {
                  setActive(index);
                  speak(segment.spanish, rate);
                }}
              >
                {segment.speaker && <span className="speaker">{segment.speaker}</span>}
                <div style={{ flex: 1 }}>
                  <div>{segment.spanish}</div>
                  {showTranslation && <div className="tiny muted">{segment.english}</div>}
                </div>
                <span className="tiny muted">▶</span>
              </div>
            ))}
          </div>
          <button className="btn btn-sm btn-ghost mt" onClick={() => setShowTranslation((v) => !v)}>
            {showTranslation ? "Hide" : "Show"} translation
          </button>
        </>
      ) : (
        <p className="small muted">
          Listen first without reading. Reveal the transcript only once you have tried.
        </p>
      )}
    </div>
  );
}

function ExerciseBlock({ exercise, lessonSlug }: { exercise: ExerciseView; lessonSlug: string }) {
  const queryClient = useQueryClient();
  const [outcome, setOutcome] = useState<QuizOutcome | null>(null);

  return (
    <div>
      <h2>{exercise.title}</h2>
      <p className="small secondary">{exercise.prompt}</p>
      <Quiz
        exercise={exercise}
        onSubmitted={async (result) => {
          setOutcome(result);
          await queryClient.invalidateQueries({ queryKey: ["lesson", lessonSlug] });
          await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
        }}
      />
      {outcome && (
        <div className={`feedback mt ${outcome.passed ? "feedback-correct" : "feedback-incorrect"}`}>
          {outcome.correctCount} / {outcome.questionCount} · {outcome.verdict} (+{outcome.xp} XP)
        </div>
      )}
    </div>
  );
}
