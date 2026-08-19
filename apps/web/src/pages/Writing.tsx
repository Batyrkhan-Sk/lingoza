import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { PageHeader } from "../components/Layout";
import { Badge, Card, Loading, SkillMeter } from "../components/ui";

/**
 * Writing practice (§10). Six scored dimensions, corrections with reasons, and
 * a native rewrite — the rewrite being the part that shows the gap between
 * correct Spanish and natural Spanish.
 */

interface WritingPrompt {
  id: string;
  title: string;
  levelCode: string;
  instruction: string;
  minWords: number;
  maxWords: number;
}

interface WritingResult {
  grammarScore: number;
  vocabularyScore: number;
  structureScore: number;
  coherenceScore: number;
  naturalnessScore: number;
  spellingScore: number;
  overallScore: number;
  feedback: string;
  improvedVersion: string;
  wordCount: number;
  provider: string;
  corrections: { original: string; corrected: string; explanation: string; category: string }[];
}

export function WritingPage() {
  const [selected, setSelected] = useState<WritingPrompt | null>(null);
  const [text, setText] = useState("");
  const [result, setResult] = useState<WritingResult | null>(null);

  const prompts = useQuery({
    queryKey: ["writing-prompts"],
    queryFn: () => api.get<{ prompts: WritingPrompt[] }>("/writing/prompts"),
  });

  const submit = useMutation({
    mutationFn: () => api.post<WritingResult>("/writing", { promptId: selected?.id, text }),
    onSuccess: setResult,
  });

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;

  return (
    <div className="page">
      <PageHeader
        title="Writing"
        description="Write in Spanish and get it marked on grammar, vocabulary, structure, coherence, naturalness and spelling."
      />

      {prompts.isLoading ? (
        <Loading />
      ) : !selected ? (
        <div className="grid grid-2">
          {prompts.data?.prompts.map((prompt) => (
            <Card key={prompt.id} hover onClick={() => { setSelected(prompt); setResult(null); setText(""); }}>
              <div className="row-between">
                <h3>{prompt.title}</h3>
                <Badge>{prompt.levelCode}</Badge>
              </div>
              <p className="small secondary" style={{ margin: "6px 0 0" }}>{prompt.instruction}</p>
              <div className="tiny muted mt">{prompt.minWords}–{prompt.maxWords} words</div>
            </Card>
          ))}
        </div>
      ) : (
        <>
          <button className="btn btn-sm btn-ghost mb" onClick={() => setSelected(null)}>← All prompts</button>

          <Card>
            <h2>{selected.title}</h2>
            <p className="secondary">{selected.instruction}</p>

            <textarea
              className="textarea mt"
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="Escribe aquí en español…"
            />

            <div className="row-between mt">
              <span className={`tiny ${wordCount < selected.minWords ? "muted" : ""}`}>
                {wordCount} / {selected.minWords} words minimum
              </span>
              <button
                className="btn btn-primary"
                disabled={wordCount < 5 || submit.isPending}
                onClick={() => submit.mutate()}
              >
                {submit.isPending ? "Marking…" : "Submit for feedback"}
              </button>
            </div>
          </Card>

          {submit.isPending && <Loading label="Marking your work" />}

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
                <SkillMeter label="Grammar" value={result.grammarScore} />
                <SkillMeter label="Vocabulary" value={result.vocabularyScore} />
                <SkillMeter label="Structure" value={result.structureScore} />
                <SkillMeter label="Coherence" value={result.coherenceScore} />
                <SkillMeter label="Naturalness" value={result.naturalnessScore} />
                <SkillMeter label="Spelling" value={result.spellingScore} />
              </div>

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

              {result.improvedVersion && (
                <div className="mt-lg">
                  <h3 className="mb">How a native would write it</h3>
                  <div className="example">
                    <div className="es">{result.improvedVersion}</div>
                  </div>
                  <div className="tiny muted mt">
                    Your ideas, kept — only the Spanish is changed. Compare it line by line with what
                    you wrote; that comparison is where most of the learning is.
                  </div>
                </div>
              )}

              {result.provider === "rules" && (
                <div className="banner mt">
                  Marked by the rule-based fallback because no AI provider is configured — mechanical
                  errors are caught, but coherence and naturalness are not truly assessed.
                </div>
              )}
            </Card>
          )}
        </>
      )}
    </div>
  );
}
