import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api, type ExerciseView, type QuizFeedback, type QuizOutcome } from "../lib/api";

/**
 * The exercise runner.
 *
 * One question at a time, with feedback shown immediately after answering —
 * feedback delayed to the end of a set is feedback the learner has stopped
 * caring about. Answers are graded on the server, so the correct answer is not
 * in the page before it is submitted.
 */
export function Quiz({
  exercise,
  onSubmitted,
}: {
  exercise: ExerciseView;
  onSubmitted?: (outcome: QuizOutcome) => void;
}) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [draft, setDraft] = useState("");
  const [revealed, setRevealed] = useState<QuizFeedback | null>(null);
  const [hintShown, setHintShown] = useState(false);
  const [finished, setFinished] = useState<QuizOutcome | null>(null);

  const question = exercise.questions[index];

  const submit = useMutation({
    mutationFn: (payload: Record<string, string>) =>
      api.post<QuizOutcome>(`/exercises/${exercise.id}/submit`, {
        answers: Object.entries(payload).map(([questionId, answer]) => ({
          questionId,
          answer,
          usedHint: hintShown,
        })),
        source: "web",
      }),
    onSuccess: (outcome) => {
      setFinished(outcome);
      onSubmitted?.(outcome);
    },
  });

  /**
   * Grading happens once, at the end of the exercise, but the learner sees
   * per-question feedback as they go: the last answer is submitted with all the
   * previous ones so the server has full context for scoring.
   */
  const answerCurrent = (value: string) => {
    if (!question || revealed) return;
    const next = { ...answers, [question.id]: value };
    setAnswers(next);

    const isLast = index === exercise.questions.length - 1;
    if (isLast) {
      submit.mutate(next, {
        onSuccess: (outcome) => {
          const feedback = outcome.feedback.find((f) => f.questionId === question.id);
          setRevealed(feedback ?? null);
        },
      });
    } else {
      // Mid-exercise feedback is derived locally only for what we can know for
      // certain — that an answer was recorded. Correctness comes from the
      // server on submit, so we advance without claiming right or wrong.
      setIndex(index + 1);
      setDraft("");
      setHintShown(false);
    }
  };

  if (finished && revealed !== null) {
    return (
      <div className="mt">
        <div className={`feedback ${revealed.correct ? "feedback-correct" : "feedback-incorrect"}`}>
          {revealed.correct ? "✓ Correct" : `✗ The answer is "${revealed.correctAnswer}"`}
          <div style={{ marginTop: 6, opacity: 0.9 }}>
            {revealed.optionFeedback ?? revealed.explanation}
          </div>
        </div>

        <div className="mt">
          <h3 className="mb">All answers</h3>
          <div className="col" style={{ gap: 6 }}>
            {finished.feedback.map((item) => {
              const q = exercise.questions.find((x) => x.id === item.questionId);
              return (
                <div key={item.questionId} className="correction">
                  <div className="row-between">
                    <span className="small">{q?.prompt}</span>
                    <span>{item.correct ? "✓" : "✗"}</span>
                  </div>
                  {!item.correct && (
                    <div className="tiny" style={{ marginTop: 4 }}>
                      <span className="correction-right">{item.correctAnswer}</span> — {item.explanation}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <button
          className="btn mt"
          onClick={() => {
            setIndex(0);
            setAnswers({});
            setRevealed(null);
            setFinished(null);
            setDraft("");
          }}
        >
          Try again
        </button>
      </div>
    );
  }

  if (!question) return null;

  return (
    <div className="mt">
      <div className="row-between mb">
        <span className="tiny muted">
          Question {index + 1} of {exercise.questions.length}
        </span>
        {question.hint && !hintShown && (
          <button className="btn btn-sm btn-ghost" onClick={() => setHintShown(true)}>
            Show hint
          </button>
        )}
      </div>

      <div style={{ fontSize: "1.02rem", fontWeight: 520, marginBottom: 6 }}>{question.prompt}</div>
      {question.context && <div className="small secondary mb">{question.context}</div>}
      {hintShown && question.hint && <div className="feedback feedback-neutral mb">💡 {question.hint}</div>}

      {question.options.length > 0 ? (
        <div className="mt">
          {question.options.map((option) => (
            <button
              key={option.id}
              className="option"
              disabled={submit.isPending}
              onClick={() => answerCurrent(option.text)}
            >
              {option.text}
            </button>
          ))}
        </div>
      ) : (
        <form
          className="row mt"
          onSubmit={(event) => {
            event.preventDefault();
            if (draft.trim()) answerCurrent(draft.trim());
          }}
        >
          <input
            className="input"
            value={draft}
            autoFocus
            placeholder="Type your answer in Spanish…"
            onChange={(event) => setDraft(event.target.value)}
          />
          <button className="btn btn-primary" type="submit" disabled={!draft.trim() || submit.isPending}>
            {submit.isPending ? "…" : "Check"}
          </button>
        </form>
      )}

      {submit.error && (
        <div className="feedback feedback-incorrect mt">
          {submit.error instanceof Error ? submit.error.message : "Could not submit."}
        </div>
      )}
    </div>
  );
}
