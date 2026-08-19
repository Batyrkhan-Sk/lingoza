import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { PageHeader } from "../components/Layout";
import { Badge, Card, Empty, Loading, SpeakButton, speak } from "../components/ui";

/**
 * Listening (§6) and Reading (§9).
 *
 * Reading combines authored texts with genuine current Spanish press for B1+,
 * because at that level adapted text stops preparing anyone for real language.
 * Any word can be clicked for an in-context explanation.
 */

interface ListeningItem {
  id: string; slug: string; title: string; levelCode: string;
  format: string; speed: string; accent: string; intro: string | null;
  segments: { id: string; speaker: string | null; spanish: string; english: string }[];
}

export function ListeningPage() {
  const [open, setOpen] = useState<ListeningItem | null>(null);
  const [showText, setShowText] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const [rate, setRate] = useState(1);

  const list = useQuery({
    queryKey: ["listening"],
    queryFn: () => api.get<{ exercises: ListeningItem[] }>("/listening"),
  });

  if (list.isLoading) return <div className="page"><Loading /></div>;

  if (open) {
    return (
      <div className="page">
        <button className="btn btn-sm btn-ghost mb" onClick={() => setOpen(null)}>← All listening</button>
        <div className="row-between mb">
          <div>
            <h1>{open.title}</h1>
            <div className="tiny muted">{open.accent} · {open.speed} speed · {open.format}</div>
          </div>
          <Badge tone="accent">{open.levelCode}</Badge>
        </div>

        {open.intro && <p className="secondary">{open.intro}</p>}

        <Card>
          <div className="row wrap mb" style={{ gap: 8 }}>
            <button
              className="btn btn-primary"
              onClick={() => speak(open.segments.map((s) => s.spanish).join(" "), rate)}
            >
              ▶ Play all
            </button>
            <select className="select" style={{ width: "auto" }} value={rate} onChange={(e) => setRate(Number(e.target.value))}>
              <option value={0.6}>0.6× slow</option>
              <option value={0.8}>0.8×</option>
              <option value={1}>1× normal</option>
            </select>
            <button className="btn" onClick={() => setShowText((v) => !v)}>
              {showText ? "Hide" : "Show"} transcript
            </button>
            {showText && (
              <button className="btn" onClick={() => setShowTranslation((v) => !v)}>
                {showTranslation ? "Hide" : "Show"} translation
              </button>
            )}
          </div>

          {showText ? (
            <div className="col" style={{ gap: 2 }}>
              {open.segments.map((segment) => (
                <div key={segment.id} className="transcript-line" onClick={() => speak(segment.spanish, rate)}>
                  {segment.speaker && <span className="speaker">{segment.speaker}</span>}
                  <div style={{ flex: 1 }}>
                    <ClickableText text={segment.spanish} />
                    {showTranslation && <div className="tiny muted">{segment.english}</div>}
                  </div>
                  <span className="tiny muted">▶</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="small muted">
              Listen first without reading — twice if you need to. Revealing the transcript too early
              turns a listening exercise into a reading one.
            </p>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="page">
      <PageHeader
        title="Listening"
        description="Slow conversations at the start, native-speed interviews and news later. Slow the audio, replay any line, and click any word."
      />
      <div className="grid grid-2">
        {list.data?.exercises.map((item) => (
          <Card key={item.id} hover onClick={() => { setOpen(item); setShowText(false); }}>
            <div className="row-between">
              <h3>{item.title}</h3>
              <Badge>{item.levelCode}</Badge>
            </div>
            <div className="tiny muted mt">{item.accent} · {item.speed} · {item.segments.length} lines</div>
          </Card>
        ))}
      </div>
      {list.data?.exercises.length === 0 && <Empty title="No listening at your level yet" />}
    </div>
  );
}

interface ReadingList {
  authored: { slug: string; title: string; levelCode: string; genre: string; intro: string | null; estimatedMinutes: number }[];
  live: { title: string; summary: string; url: string; publisher: string; estimatedLevel: string }[];
  liveSource: { available: boolean; attribution: string; error: string | null };
}

interface ReadingDetail {
  slug: string; title: string; levelCode: string; genre: string;
  body: string; intro: string | null;
  glossary: { id: string; term: string; meaning: string; note: string | null }[];
}

export function ReadingPage() {
  const [openSlug, setOpenSlug] = useState<string | null>(null);

  const list = useQuery({ queryKey: ["reading"], queryFn: () => api.get<ReadingList>("/reading") });
  const detail = useQuery({
    queryKey: ["reading", openSlug],
    queryFn: () => api.get<ReadingDetail>(`/reading/${openSlug}`),
    enabled: Boolean(openSlug),
  });

  if (list.isLoading) return <div className="page"><Loading /></div>;

  if (openSlug && detail.data) {
    const text = detail.data;
    return (
      <div className="page">
        <button className="btn btn-sm btn-ghost mb" onClick={() => setOpenSlug(null)}>← All reading</button>
        <div className="row-between mb">
          <h1>{text.title}</h1>
          <Badge tone="accent">{text.levelCode}</Badge>
        </div>
        {text.intro && <p className="secondary">{text.intro}</p>}

        <Card>
          <div className="prose es" style={{ lineHeight: 1.9 }}>
            {text.body.split("\n").map((line, index) =>
              line.trim() ? <p key={index}><ClickableText text={line} readingSlug={text.slug} /></p> : null,
            )}
          </div>
        </Card>

        {text.glossary.length > 0 && (
          <Card className="mt">
            <h3 className="mb">Glossary</h3>
            <div className="col" style={{ gap: 6 }}>
              {text.glossary.map((entry) => (
                <div key={entry.id} className="small">
                  <strong>{entry.term}</strong> — {entry.meaning}
                  {entry.note && <span className="muted"> · {entry.note}</span>}
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="page">
      <PageHeader
        title="Reading"
        description="Click any word you don't know to see what it means in that sentence."
      />

      {(list.data?.authored.length ?? 0) > 0 && (
        <>
          <h2 className="mb">From your course</h2>
          <div className="grid grid-2 mb">
            {list.data?.authored.map((item) => (
              <Card key={item.slug} hover onClick={() => setOpenSlug(item.slug)}>
                <div className="row-between">
                  <h3>{item.title}</h3>
                  <Badge>{item.levelCode}</Badge>
                </div>
                <div className="tiny muted mt">{item.genre} · {item.estimatedMinutes} min</div>
              </Card>
            ))}
          </div>
        </>
      )}

      <h2 className="mb">Today's Spanish press</h2>
      {list.data?.liveSource.available ? (
        <>
          <div className="grid grid-2">
            {list.data.live.map((article) => (
              <a key={article.url} href={article.url} target="_blank" rel="noreferrer noopener">
                <Card hover>
                  <div className="row-between">
                    <Badge>{article.publisher}</Badge>
                    <Badge tone="info">{article.estimatedLevel}</Badge>
                  </div>
                  <h3 style={{ marginTop: 8 }}>{article.title}</h3>
                  <p className="tiny muted" style={{ margin: "6px 0 0" }}>{article.summary.slice(0, 160)}…</p>
                </Card>
              </a>
            ))}
          </div>
          <p className="tiny muted mt">{list.data.liveSource.attribution}</p>
        </>
      ) : (
        <Empty
          title="Live press unavailable"
          hint={
            list.data?.liveSource.error ??
            "Real Spanish journalism appears here from B1 upwards, where adapted text stops being enough."
          }
        />
      )}
    </div>
  );
}

/** Words are clickable; the meaning is resolved in the context of the sentence. */
function ClickableText({ text, readingSlug }: { text: string; readingSlug?: string }) {
  const [lookup, setLookup] = useState<{ word: string; meaning: string; note?: string; lemma?: string } | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  const onWord = async (word: string) => {
    setPending(word);
    try {
      const result = await api.post<{ word: string; meaning: string; note?: string; lemma?: string }>("/lookup", {
        word,
        sentence: text,
        readingSlug,
      });
      setLookup(result.meaning ? result : { word, meaning: "No definition found." });
    } catch {
      setLookup({ word, meaning: "Could not look that up." });
    } finally {
      setPending(null);
    }
  };

  return (
    <>
      {text.split(/(\s+)/).map((token, index) => {
        const bare = token.replace(/[^\p{L}\p{M}'-]/gu, "");
        if (!bare) return <span key={index}>{token}</span>;
        return (
          <span key={index} className="word-token" onClick={() => onWord(bare)}>
            {token}
          </span>
        );
      })}
      {pending && <span className="tiny muted"> looking up “{pending}”…</span>}
      {lookup && (
        <span
          className="feedback feedback-neutral"
          style={{ display: "block", marginTop: 8, cursor: "pointer" }}
          onClick={() => setLookup(null)}
        >
          <strong>{lookup.lemma ?? lookup.word}</strong> — {lookup.meaning}
          {lookup.note && <span className="muted"> · {lookup.note}</span>}
          <span className="tiny muted"> (click to dismiss)</span>
          <SpeakButton text={lookup.word} />
        </span>
      )}
    </>
  );
}
