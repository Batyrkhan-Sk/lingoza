import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { PageHeader } from "../components/Layout";
import { Badge, Card, Loading, SpeakButton } from "../components/ui";

/**
 * The AI tutor (§8).
 *
 * The conversation runs uninterrupted; corrections appear underneath the
 * tutor's reply as a separate block, so the learner reads the Spanish first
 * and the feedback second — never mid-sentence.
 */

interface Correction {
  id?: string;
  original: string;
  corrected: string;
  explanation: string;
  category: string;
  severity: string;
}

interface TurnResponse {
  reply: string;
  translation: string;
  coaching: string;
  corrections: Correction[];
  suggestion?: string;
  provider: string;
}

interface Message {
  role: "user" | "tutor";
  content: string;
  translation?: string | null;
  coaching?: string | null;
  corrections?: Correction[];
}

const SCENARIOS = [
  { key: "casual", label: "Casual conversation", icon: "☕" },
  { key: "travel", label: "Travel", icon: "✈️" },
  { key: "restaurant", label: "Restaurant", icon: "🍽" },
  { key: "job_interview", label: "Job interview", icon: "💼" },
  { key: "university", label: "University", icon: "🎓" },
  { key: "shopping", label: "Shopping", icon: "🛍" },
  { key: "dating", label: "Dating", icon: "🌹" },
  { key: "meeting_people", label: "Meeting new people", icon: "👋" },
  { key: "business", label: "Business", icon: "📊" },
  { key: "debate", label: "Debate", icon: "⚖️" },
  { key: "free", label: "Free conversation", icon: "🎲" },
];

export function TutorPage() {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [phrases, setPhrases] = useState<string[]>([]);
  const [goal, setGoal] = useState<string | null>(null);
  const [showTranslations, setShowTranslations] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const status = useQuery({
    queryKey: ["tutor-status"],
    queryFn: () => api.get<{ enabled: boolean; degraded: boolean; providers: string[] }>("/tutor/status"),
  });

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const start = useMutation({
    mutationFn: (scenario: string) =>
      api.post<{
        conversationId: string;
        title: string;
        goal: string | null;
        usefulPhrases: string[];
        messages: { role: string; content: string; translation: string }[];
      }>("/tutor/conversations", { scenario, origin: "web" }),
    onSuccess: (data) => {
      setConversationId(data.conversationId);
      setPhrases(data.usefulPhrases);
      setGoal(data.goal);
      setMessages(
        data.messages.map((m) => ({
          role: m.role as "tutor",
          content: m.content,
          translation: m.translation,
        })),
      );
    },
  });

  const send = useMutation({
    mutationFn: (content: string) =>
      api.post<TurnResponse>(`/tutor/conversations/${conversationId}/messages`, { content }),
    onSuccess: (turn) => {
      setMessages((current) => [
        ...current,
        {
          role: "tutor",
          content: turn.reply,
          translation: turn.translation,
          coaching: turn.coaching,
          corrections: turn.corrections,
        },
      ]);
    },
  });

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || !conversationId) return;
    setMessages((current) => [...current, { role: "user", content: text }]);
    setDraft("");
    send.mutate(text);
  };

  if (!conversationId) {
    return (
      <div className="page">
        <PageHeader
          title="AI Tutor"
          description="Pick a situation and talk. Your tutor stays in character, lets you finish, then explains the mistakes that actually matter."
        />

        {status.data?.degraded && (
          <div className="banner mb">
            No AI provider is configured, so the tutor cannot hold a real conversation right now.
            Add a <code>GEMINI_API_KEY</code> (or <code>GROQ_API_KEY</code>) to <code>.env</code> and restart the API.
          </div>
        )}

        <div className="grid grid-3">
          {SCENARIOS.map((scenario) => (
            <Card key={scenario.key} hover onClick={() => start.mutate(scenario.key)}>
              <div style={{ fontSize: "1.4rem" }}>{scenario.icon}</div>
              <div style={{ fontWeight: 550, marginTop: 6 }}>{scenario.label}</div>
            </Card>
          ))}
        </div>
        {start.isPending && <Loading label="Starting conversation" />}
      </div>
    );
  }

  return (
    <div className="page">
      <div className="row-between mb">
        <div>
          <h1>Conversation</h1>
          {goal && <p className="small secondary" style={{ margin: "4px 0 0" }}>Goal: {goal}</p>}
        </div>
        <div className="row" style={{ gap: 6 }}>
          <button className="btn btn-sm" onClick={() => setShowTranslations((v) => !v)}>
            {showTranslations ? "Hide" : "Show"} English
          </button>
          <button className="btn btn-sm" onClick={() => { setConversationId(null); setMessages([]); }}>
            End
          </button>
        </div>
      </div>

      {phrases.length > 0 && (
        <Card className="mb">
          <div className="stat-label mb">Useful phrases</div>
          <div className="row wrap" style={{ gap: 6 }}>
            {phrases.map((phrase) => (
              <button key={phrase} className="badge" onClick={() => setDraft(phrase)} style={{ cursor: "pointer" }}>
                {phrase}
              </button>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <div className="chat">
          {messages.map((message, index) => (
            <div key={index} className="col" style={{ gap: 6 }}>
              <div className={`bubble ${message.role === "tutor" ? "bubble-tutor" : "bubble-user"}`}>
                {message.content}
                {message.role === "tutor" && (
                  <div style={{ marginTop: 4 }}>
                    <SpeakButton text={message.content} />
                  </div>
                )}
                {showTranslations && message.translation && (
                  <div className="tiny muted" style={{ marginTop: 4 }}>{message.translation}</div>
                )}
              </div>

              {message.corrections && message.corrections.length > 0 && (
                <div className="coaching">
                  <strong>Feedback</strong>
                  {message.corrections.map((correction, i) => (
                    <div key={i} style={{ marginTop: 6 }}>
                      <span className="correction-wrong">{correction.original}</span>
                      {" → "}
                      <span className="correction-right">{correction.corrected}</span>
                      <div className="tiny" style={{ marginTop: 2 }}>{correction.explanation}</div>
                    </div>
                  ))}
                </div>
              )}

              {message.coaching && (!message.corrections || message.corrections.length === 0) && (
                <div className="coaching">{message.coaching}</div>
              )}
            </div>
          ))}
          {send.isPending && <div className="bubble bubble-tutor"><span className="spinner" /></div>}
          <div ref={endRef} />
        </div>

        <form className="row mt-lg" onSubmit={submit}>
          <input
            className="input"
            value={draft}
            autoFocus
            placeholder="Escribe en español…"
            onChange={(event) => setDraft(event.target.value)}
          />
          <button className="btn btn-primary" type="submit" disabled={!draft.trim() || send.isPending}>
            Send
          </button>
        </form>
      </Card>
    </div>
  );
}
