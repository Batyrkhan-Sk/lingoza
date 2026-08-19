import type { CSSProperties, ReactNode } from "react";

/** Small presentational primitives shared across every screen. */

export function Card({
  children,
  hover,
  className = "",
  onClick,
  style,
}: {
  children: ReactNode;
  hover?: boolean;
  className?: string;
  onClick?: () => void;
  style?: CSSProperties;
}) {
  return (
    <div
      className={`card ${hover ? "card-hover" : ""} ${className}`}
      onClick={onClick}
      style={onClick ? { cursor: "pointer", ...style } : style}
    >
      {children}
    </div>
  );
}

export function Bar({ value, tone }: { value: number; tone?: "success" | "warning" | "danger" }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="bar" role="progressbar" aria-valuenow={Math.round(clamped)} aria-valuemin={0} aria-valuemax={100}>
      <div className={`bar-fill ${tone ?? ""}`} style={{ width: `${clamped}%` }} />
    </div>
  );
}

/** A skill meter: label, value, bar. Tone reflects how far along the learner is. */
export function SkillMeter({ label, value, sub }: { label: string; value: number; sub?: string }) {
  const tone = value >= 70 ? "success" : value >= 40 ? undefined : value > 0 ? "warning" : undefined;
  return (
    <div className="col" style={{ gap: 6 }}>
      <div className="row-between">
        <span className="small secondary">{label}</span>
        <span className="small mono">{value > 0 ? `${Math.round(value)}%` : "—"}</span>
      </div>
      <Bar value={value} tone={tone} />
      {sub && <span className="tiny muted">{sub}</span>}
    </div>
  );
}

export function Badge({
  children,
  tone,
}: {
  children: ReactNode;
  tone?: "accent" | "success" | "warning" | "danger" | "info";
}) {
  return <span className={`badge ${tone ? `badge-${tone}` : ""}`}>{children}</span>;
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: string }) {
  return (
    <div className="stat">
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
      {sub && <span className="stat-sub">{sub}</span>}
    </div>
  );
}

export function Empty({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="empty">
      <div style={{ fontWeight: 560, marginBottom: 6 }}>{title}</div>
      {hint && <div className="small">{hint}</div>}
      {action && <div className="mt">{action}</div>}
    </div>
  );
}

export function Loading({ label = "Loading" }: { label?: string }) {
  return (
    <div className="empty">
      <div className="row" style={{ justifyContent: "center" }}>
        <div className="spinner" />
        <span className="small">{label}…</span>
      </div>
    </div>
  );
}

export function ErrorNote({ error }: { error: unknown }) {
  const message = error instanceof Error ? error.message : "Something went wrong.";
  return <div className="feedback feedback-incorrect">{message}</div>;
}

/**
 * Minimal markdown renderer for lesson text.
 *
 * Lesson bodies use a deliberately small subset — bold, italics, blockquotes,
 * inline code and paragraphs — so a 30-line renderer covers it without adding
 * a parser dependency to the bundle.
 */
export function Prose({ text }: { text: string }) {
  const blocks = text.split(/\n\n+/);

  return (
    <div className="prose">
      {blocks.map((block, index) => {
        if (block.startsWith("> ")) {
          return <blockquote key={index}>{inline(block.replace(/^> /gm, ""))}</blockquote>;
        }
        if (/^\d+\.\s/m.test(block) || /^[-*]\s/m.test(block)) {
          const items = block.split("\n").filter(Boolean);
          return (
            <ul key={index} style={{ paddingLeft: 20, margin: "0 0 0.9em" }}>
              {items.map((item, i) => (
                <li key={i}>{inline(item.replace(/^(\d+\.|[-*])\s*/, ""))}</li>
              ))}
            </ul>
          );
        }
        return <p key={index}>{inline(block)}</p>;
      })}
    </div>
  );
}

function inline(text: string): ReactNode[] {
  // Split on the three inline markers at once so nesting order does not matter.
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return parts.filter(Boolean).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return <em key={index}>{part.slice(1, -1)}</em>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={index}>{part.slice(1, -1)}</code>;
    }
    return <span key={index}>{part}</span>;
  });
}

/**
 * Speak Spanish text with the browser's speech synthesis.
 *
 * Used for vocabulary audio, listening transcripts and the tutor's replies.
 * Real recorded audio is preferable and the schema has a slot for it, but
 * synthesis means every word has audio from day one rather than none.
 */
export function speak(text: string, rate = 1, lang = "es-ES"): void {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = rate;
  const voice = window.speechSynthesis.getVoices().find((v) => v.lang.startsWith("es"));
  if (voice) utterance.voice = voice;
  window.speechSynthesis.speak(utterance);
}

export function SpeakButton({ text, rate, label }: { text: string; rate?: number; label?: string }) {
  return (
    <button
      className="btn btn-sm btn-ghost"
      onClick={() => speak(text, rate)}
      title="Listen"
      aria-label={`Listen to ${text}`}
    >
      🔊 {label}
    </button>
  );
}
