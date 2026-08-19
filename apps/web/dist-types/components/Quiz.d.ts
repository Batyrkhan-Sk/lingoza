import { type ExerciseView, type QuizOutcome } from "../lib/api";
/**
 * The exercise runner.
 *
 * One question at a time, with feedback shown immediately after answering —
 * feedback delayed to the end of a set is feedback the learner has stopped
 * caring about. Answers are graded on the server, so the correct answer is not
 * in the page before it is submitted.
 */
export declare function Quiz({ exercise, onSubmitted, }: {
    exercise: ExerciseView;
    onSubmitted?: (outcome: QuizOutcome) => void;
}): import("react").JSX.Element | null;
//# sourceMappingURL=Quiz.d.ts.map