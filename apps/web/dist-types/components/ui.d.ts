import type { CSSProperties, ReactNode } from "react";
/** Small presentational primitives shared across every screen. */
export declare function Card({ children, hover, className, onClick, style, }: {
    children: ReactNode;
    hover?: boolean;
    className?: string;
    onClick?: () => void;
    style?: CSSProperties;
}): import("react").JSX.Element;
export declare function Bar({ value, tone }: {
    value: number;
    tone?: "success" | "warning" | "danger";
}): import("react").JSX.Element;
/** A skill meter: label, value, bar. Tone reflects how far along the learner is. */
export declare function SkillMeter({ label, value, sub }: {
    label: string;
    value: number;
    sub?: string;
}): import("react").JSX.Element;
export declare function Badge({ children, tone, }: {
    children: ReactNode;
    tone?: "accent" | "success" | "warning" | "danger" | "info";
}): import("react").JSX.Element;
export declare function Stat({ label, value, sub }: {
    label: string;
    value: ReactNode;
    sub?: string;
}): import("react").JSX.Element;
export declare function Empty({ title, hint, action }: {
    title: string;
    hint?: string;
    action?: ReactNode;
}): import("react").JSX.Element;
export declare function Loading({ label }: {
    label?: string;
}): import("react").JSX.Element;
export declare function ErrorNote({ error }: {
    error: unknown;
}): import("react").JSX.Element;
/**
 * Minimal markdown renderer for lesson text.
 *
 * Lesson bodies use a deliberately small subset — bold, italics, blockquotes,
 * inline code and paragraphs — so a 30-line renderer covers it without adding
 * a parser dependency to the bundle.
 */
export declare function Prose({ text }: {
    text: string;
}): import("react").JSX.Element;
/**
 * Speak Spanish text with the browser's speech synthesis.
 *
 * Used for vocabulary audio, listening transcripts and the tutor's replies.
 * Real recorded audio is preferable and the schema has a slot for it, but
 * synthesis means every word has audio from day one rather than none.
 */
export declare function speak(text: string, rate?: number, lang?: string): void;
export declare function SpeakButton({ text, rate, label }: {
    text: string;
    rate?: number;
    label?: string;
}): import("react").JSX.Element;
//# sourceMappingURL=ui.d.ts.map