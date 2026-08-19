import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { PageHeader } from "../components/Layout";
import { Badge, Card, Empty, Loading, SkillMeter, SpeakButton } from "../components/ui";

/**
 * Speaking practice (§7).
 *
 * Capture uses the browser's SpeechRecognition API, which returns a transcript
 * rather than audio. The evaluator is explicit about what that can and cannot
 * measure, and the UI repeats that honestly instead of presenting a
 * transcript-derived pronunciation number as if it were phonetic assessment.
 */

interface SpeakingPrompt {
  id: string;
  slug: string;
  title: string;
  levelCode: string;
  instruction: string;
  targetText: string | null;
  mode: string;
}

interface SpeakingResult {
  pronunciationScore: number;
  vocabularyScore: number;
  grammarScore: number;
  fluencyScore: number;
  structureScore: number;
  overallScore: number;
  feedback: string;
  transcript: string;
  pronunciationMethod: string;
  provider: string;
  corrections: { original: string; corrected: string; explanation: string }[];
  pronunciationNotes: { sound: string; word: string; status: string; advice: string }[];
}

// The API is prefixed in Chrome/Safari and absent in Firefox.
type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};

function getRecognition(): SpeechRecognitionLike | null {
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

export function SpeakingPage() {
  const [selected, setSelected] = useState<SpeakingPrompt | null>(null);
  const [transcript, setTranscript] = useState("");
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SpeakingResult | null>(null);
  const startedAt = useRef<number>(0);
  const recognition = useRef<SpeechRecognitionLike | null>(null);

  const prompts = useQuery({
    queryKey: ["speaking-prompts"],
    queryFn: () => api.get<{ prompts: SpeakingPrompt[] }>("/speaking/prompts"),
  });

  const submit = useMutation({
    mutationFn: (payload: { transcript: string; durationSeconds: number }) =>
      api.post<SpeakingResult>("/speaking", {
        promptId: selected?.id,
        instruction: selected?.instruction,
        ...payload,
      }),
    onSuccess: setResult,
  });

  useEffect(() => () => recognition.current?.stop(), []);

  const start = () => {
    const engine = getRecognition();
    if (!engine) {
      setError(
        "Your browser does not support speech recognition. Chrome, Edge and Safari do; Firefox does not.",
      );
      return;
    }

    setError(null);
    setResult(null);
    setTranscript("");
    engine.lang = "es-ES";
    engine.continuous = true;
    engine.interimResults = true;

    engine.onresult = (event) => {
      let text = "";
      for (let i = 0; i < event.results.length; i++) {
        text += event.results[i]?.[0]?.transcript ?? "";
      }
      setTranscript(text.trim());
    };
    engine.onerror = (event) => {
      setError(
        event.error === "not-allowed"
          ? "Microphone access was denied. Allow it in your browser settings and try again."
          : `Recognition error: ${event.error}`,
      );
      setListening(false);
    };
    engine.onend = () => setListening(false);

    recognition.current = engine;
    startedAt.current = Date.now();
    engine.start();
    setListening(true);
  };

  const stop = () => {
    recognition.current?.stop();
    setListening(false);
    const duration = (Date.now() - startedAt.current) / 1000;
    if (transcript.trim()) {
      submit.mutate({ transcript: transcript.trim(), durationSeconds: duration });
    }
  };

  return (
    <div className="page">
      <PageHeader
        title="Speaking"
        description="Speak into your microphone and get feedback on pronunciation, vocabulary, grammar, fluency and sentence structure."
      />

      {prompts.isLoading ? (
        <Loading />
      ) : !selected ? (
        <>
          <h2 className="mb">Choose a drill</h2>
          <div className="grid grid-2">
            {prompts.data?.prompts.map((prompt) => (
              <Card key={prompt.id} hover onClick={() => setSelected(prompt)}>
                <div className="row-between">
                  <h3>{prompt.title}</h3>
                  <Badge>{prompt.levelCode}</Badge>
                </div>
                <p className="small secondary" style={{ margin: "6px 0 0" }}>{prompt.instruction}</p>
              </Card>
            ))}
          </div>
          {prompts.data?.prompts.length === 0 && (
            <Empty title="No drills yet" hint="Complete a lesson with a speaking section." />
          )}
        </>
      ) : (
        <>
          <button className="btn btn-sm btn-ghost mb" onClick={() => { setSelected(null); setResult(null); }}>
            ← All drills
          </button>

          <Card>
            <h2>{selected.title}</h2>
            <p className="secondary">{selected.instruction}</p>

            {selected.targetText && (
              <div className="example">
                <div className="row-between">
                  <span className="example-es">{selected.targetText}</span>
                  <SpeakButton text={selected.targetText} label="Hear it" />
                </div>
              </div>
            )}

            <div className="center mt-lg">
              {listening ? (
                <button className="btn btn-lg" onClick={stop} style={{ borderColor: "var(--danger)", color: "var(--danger)" }}>
                  ⏹ Stop and get feedback
                </button>
              ) : (
                <button className="btn btn-primary btn-lg" onClick={start} disabled={submit.isPending}>
                  🎙 Start recording
                </button>
              )}
              {listening && <div className="small muted mt">Listening… speak now</div>}
            </div>

            {transcript && (
              <div className="feedback feedback-neutral mt-lg">
                <div className="stat-label mb">What we heard</div>
                {transcript}
              </div>
            )}

            {error && <div className="feedback feedback-incorrect mt">{error}</div>}
          </Card>

          {submit.isPending && <Loading label="Evaluating" />}

          {result && (
            <Card className="mt">
              <div className="row-between mb">
                <h2>Feedback</h2>
                <Badge tone={result.overallScore >= 70 ? "success" : "warning"}>
                  {Math.round(result.overallScore)}%
                </Badge>
              </div>

              <p className="secondary">{result.feedback}</p>

              <div className="grid grid-3 mt">
                <SkillMeter label="Pronunciation" value={result.pronunciationScore} />
                <SkillMeter label="Fluency" value={result.fluencyScore} />
                <SkillMeter label="Grammar" value={result.grammarScore} />
                <SkillMeter label="Vocabulary" value={result.vocabularyScore} />
                <SkillMeter label="Structure" value={result.structureScore} />
              </div>

              {result.pronunciationMethod === "transcript_proxy" && (
                <div className="tiny muted mt">
                  Pronunciation is estimated from how accurately speech recognition heard you, not
                  from acoustic analysis — a strong but intelligible accent will still score well.
                </div>
              )}

              {result.pronunciationNotes.length > 0 && (
                <div className="mt-lg">
                  <h3 className="mb">Sounds</h3>
                  <div className="col" style={{ gap: 8 }}>
                    {result.pronunciationNotes.map((note, index) => (
                      <div
                        key={index}
                        className={`feedback ${note.status === "good" ? "feedback-correct" : "feedback-neutral"}`}
                      >
                        {note.advice}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.corrections.length > 0 && (
                <div className="mt-lg">
                  <h3 className="mb">Corrections</h3>
                  {result.corrections.map((correction, index) => (
                    <div key={index} className="correction">
                      <span className="correction-wrong">{correction.original}</span>
                      {" → "}
                      <span className="correction-right">{correction.corrected}</span>
                      <div className="tiny muted" style={{ marginTop: 4 }}>{correction.explanation}</div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}
        </>
      )}
    </div>
  );
}
