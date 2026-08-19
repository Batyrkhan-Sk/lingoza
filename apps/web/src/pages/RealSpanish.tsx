import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api, type CefrLevel } from "../lib/api";
import { PageHeader } from "../components/Layout";
import { Badge, Card, Empty, Loading } from "../components/ui";

/**
 * Authentic media — real Spanish, not written for learners.
 *
 * The design principle throughout: link and analyse, never republish. Lyrics
 * and subtitles are licensed works, so what appears here is freely-licensed
 * prose, publisher-supplied preview clips, syndicated audio and public-domain
 * text — with a link to the original for the work itself.
 */

interface Article {
  title: string;
  description: string | null;
  extract: string;
  url: string;
  thumbnailUrl: string | null;
  wordCount: number;
  estimatedLevel?: string;
}

interface Track {
  id: number;
  title: string;
  artist: string;
  album: string | null;
  coverUrl: string | null;
  previewUrl: string | null;
  durationSeconds: number;
  externalUrl: string;
}

interface Film {
  id: number;
  title: string;
  overview: string;
  posterUrl: string | null;
  releaseYear: string | null;
  isAnimation: boolean;
  mediaType: string;
}

interface Episode {
  title: string;
  description: string;
  audioUrl: string | null;
  pageUrl: string;
  publisher: string;
  durationSeconds: number | null;
}

interface Book {
  id: number;
  title: string;
  author: string;
  textUrl: string | null;
  readUrl: string;
}

type Tab = "search" | "explain" | "films" | "music" | "podcasts" | "books";

export function MediaPage() {
  const [tab, setTab] = useState<Tab>("search");
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");

  const overview = useQuery({
    queryKey: ["media"],
    queryFn: () =>
      api.get<{
        level: CefrLevel;
        status: { films: boolean; filmsHint: string | null };
        suggestions: {
          artists: { name: string; level: string; country: string; why: string }[];
          watching: { title: string; level: string; country: string; why: string }[];
        };
        notice: string;
      }>("/media"),
  });

  return (
    <div className="page">
      <PageHeader
        title="Real Spanish"
        description="Films, cartoons, music, podcasts and books made for Spanish speakers — not for learners. The fastest way in is material whose content you already know."
      />

      <div className="row wrap mb" style={{ gap: 6 }}>
        {(["search", "explain", "films", "music", "podcasts", "books"] as Tab[]).map((t) => (
          <button
            key={t}
            className={`btn btn-sm ${tab === t ? "btn-primary" : ""}`}
            onClick={() => setTab(t)}
          >
            {{ search: "Search", explain: "Explain a line", films: "Films & cartoons", music: "Music", podcasts: "Podcasts", books: "Literature" }[t]}
          </button>
        ))}
      </div>

      {overview.data?.notice && (
        <div className="feedback feedback-neutral mb tiny">{overview.data.notice}</div>
      )}

      {tab === "search" && (
        <>
          <form
            className="row mb"
            onSubmit={(event) => {
              event.preventDefault();
              setSubmitted(query.trim());
            }}
          >
            <input
              className="input"
              value={query}
              placeholder="A film, cartoon, artist or book — try “Coco” or “Bad Bunny”"
              onChange={(event) => setQuery(event.target.value)}
            />
            <button className="btn btn-primary" type="submit" disabled={!query.trim()}>
              Search
            </button>
          </form>

          {submitted ? (
            <SearchResults query={submitted} />
          ) : (
            <Suggestions
              artists={overview.data?.suggestions.artists ?? []}
              watching={overview.data?.suggestions.watching ?? []}
              onPick={(name) => {
                setQuery(name);
                setSubmitted(name);
              }}
            />
          )}
        </>
      )}

      {tab === "explain" && (
        <Card>
          <h2>Explain a line</h2>
          <p className="small secondary">
            Paste any Spanish you have run into — a lyric, a subtitle, a sign, a message from a
            friend. You get the translation, every word explained, the grammar behind it, and what
            the dropped letters actually are.
          </p>
          <p className="tiny muted">
            Song lyrics and subtitles stay with whoever licenses them. Read them there, bring a
            line here.
          </p>
          <ExplainLine placeholder="e.g. Se me olvidó que to' pasa por algo" />
        </Card>
      )}

      {tab === "films" && <Films hint={overview.data?.status.filmsHint ?? null} />}
      {tab === "music" && <MusicTab />}
      {tab === "podcasts" && <Podcasts />}
      {tab === "books" && <Books />}
    </div>
  );
}

function Suggestions({
  artists,
  watching,
  onPick,
}: {
  artists: { name: string; level: string; country: string; why: string }[];
  watching: { title: string; level: string; country: string; why: string }[];
  onPick: (name: string) => void;
}) {
  return (
    <>
      <h2 className="mb">Where to start at your level</h2>
      <p className="small secondary">
        Sung and spoken Spanish vary enormously in difficulty. These are ordered by how hard they
        are to follow, not by popularity — picking something too fast once is enough to decide
        authentic media "isn't for you".
      </p>

      <div className="grid grid-2 mt">
        <Card>
          <h3 className="mb">Watch</h3>
          <div className="col" style={{ gap: 8 }}>
            {watching.map((item) => (
              <div key={item.title} className="row-between" style={{ gap: 8, cursor: "pointer" }} onClick={() => onPick(item.title)}>
                <div>
                  <div style={{ fontWeight: 540, fontSize: "0.9rem" }}>{item.title}</div>
                  <div className="tiny muted">{item.why}</div>
                </div>
                <Badge>{item.level}</Badge>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h3 className="mb">Listen</h3>
          <div className="col" style={{ gap: 8 }}>
            {artists.map((artist) => (
              <div key={artist.name} className="row-between" style={{ gap: 8, cursor: "pointer" }} onClick={() => onPick(artist.name)}>
                <div>
                  <div style={{ fontWeight: 540, fontSize: "0.9rem" }}>{artist.name}</div>
                  <div className="tiny muted">{artist.why}</div>
                </div>
                <Badge>{artist.level}</Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}

function SearchResults({ query }: { query: string }) {
  const results = useQuery({
    queryKey: ["media-search", query],
    queryFn: () =>
      api.get<{
        articles: { items: Article[]; attribution: string; error: string | null };
        music: { items: Track[]; attribution: string; error: string | null };
        films: { items: Film[]; attribution: string; error: string | null };
        books: { items: Book[]; attribution: string; error: string | null };
      }>(`/media/search?q=${encodeURIComponent(query)}`),
  });

  if (results.isLoading) return <Loading label={`Searching for “${query}”`} />;
  if (!results.data) return null;
  const { articles, music, films, books } = results.data;

  const nothing =
    articles.items.length === 0 &&
    music.items.length === 0 &&
    films.items.length === 0 &&
    books.items.length === 0;

  if (nothing) return <Empty title={`Nothing found for “${query}”`} hint="Try a different spelling, or the Spanish title." />;

  return (
    <div className="col" style={{ gap: 20 }}>
      {articles.items.length > 0 && (
        <section>
          <h2 className="mb">Read about it in Spanish</h2>
          <div className="col" style={{ gap: 8 }}>
            {articles.items.map((article) => (
              <ArticleCard key={article.url} article={article} />
            ))}
          </div>
          <p className="tiny muted mt">{articles.attribution}</p>
        </section>
      )}

      {music.items.length > 0 && (
        <section>
          <h2 className="mb">Listen</h2>
          <div className="grid grid-2">
            {music.items.map((track) => (
              <TrackCard key={track.id} track={track} />
            ))}
          </div>
          <p className="tiny muted mt">{music.attribution}</p>
        </section>
      )}

      {films.items.length > 0 && (
        <section>
          <h2 className="mb">Films & series</h2>
          <div className="grid grid-2">
            {films.items.map((film) => (
              <FilmCard key={film.id} film={film} />
            ))}
          </div>
          <p className="tiny muted mt">{films.attribution}</p>
        </section>
      )}

      {books.items.length > 0 && (
        <section>
          <h2 className="mb">Books</h2>
          <div className="col" style={{ gap: 6 }}>
            {books.items.slice(0, 5).map((book) => (
              <BookRow key={book.id} book={book} />
            ))}
          </div>
          <p className="tiny muted mt">{books.attribution}</p>
        </section>
      )}
    </div>
  );
}

/** An article opens as a reading exercise with click-to-translate. */
function ArticleCard({ article }: { article: Article }) {
  const [open, setOpen] = useState(false);

  const full = useQuery({
    queryKey: ["media-article", article.title],
    queryFn: () =>
      api.get<Article & { challenging: boolean }>(
        `/media/article/${encodeURIComponent(article.title)}`,
      ),
    enabled: open,
  });

  const complete = useMutation({
    mutationFn: () => api.post("/media/complete", { kind: "reading", minutes: 5 }),
  });

  return (
    <Card>
      <div className="row-between" style={{ gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 550 }}>{article.title}</div>
          {article.description && <div className="tiny muted">{article.description}</div>}
        </div>
        <div className="row" style={{ gap: 6 }}>
          {article.estimatedLevel && <Badge tone="info">{article.estimatedLevel}</Badge>}
          <button className="btn btn-sm" onClick={() => setOpen((v) => !v)}>
            {open ? "Close" : "Read"}
          </button>
        </div>
      </div>

      {open && (
        <div className="mt">
          {full.isLoading && <Loading />}
          {full.data && (
            <>
              {full.data.challenging && (
                <div className="banner mb tiny">
                  This is written for native speakers and sits above your level. Read it for gist
                  rather than every word — that is a skill in itself.
                </div>
              )}
              <div className="prose es" style={{ lineHeight: 1.9 }}>
                {full.data.extract.split("\n").map((line, index) =>
                  line.trim() ? <p key={index}><ClickableSpanish text={line} /></p> : null,
                )}
              </div>
              <div className="row-between mt">
                <a href={article.url} target="_blank" rel="noreferrer noopener" className="tiny muted">
                  Read the full article on Wikipedia →
                </a>
                <button
                  className="btn btn-sm"
                  disabled={complete.isPending || complete.isSuccess}
                  onClick={() => complete.mutate()}
                >
                  {complete.isSuccess ? "✓ Counted" : "Mark as read"}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </Card>
  );
}

function TrackCard({ track }: { track: Track }) {
  const complete = useMutation({
    mutationFn: () => api.post("/media/complete", { kind: "listening", minutes: 2 }),
  });

  return (
    <Card>
      <div className="row" style={{ gap: 10 }}>
        {track.coverUrl && (
          <img src={track.coverUrl} alt="" width={56} height={56} style={{ borderRadius: 8 }} />
        )}
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontWeight: 550, fontSize: "0.92rem" }}>{track.title}</div>
          <div className="tiny muted">{track.artist}</div>
        </div>
      </div>

      {track.previewUrl ? (
        <>
          <audio
            controls
            preload="none"
            src={track.previewUrl}
            style={{ width: "100%", marginTop: 10, height: 34 }}
            onPlay={() => !complete.isSuccess && complete.mutate()}
          />
          <div className="tiny muted" style={{ marginTop: 4 }}>
            30-second preview. Listen a few times before reading anything — that is where the
            listening gain is.
          </div>
        </>
      ) : (
        <div className="tiny muted mt">No preview available for this track.</div>
      )}

      <a
        href={track.externalUrl}
        target="_blank"
        rel="noreferrer noopener"
        className="tiny"
        style={{ color: "var(--accent-text)", display: "inline-block", marginTop: 6 }}
      >
        Full track and lyrics on Deezer →
      </a>

      {/* Lyrics live with the rights-holder; the explanation lives here. */}
      <ExplainLine
        placeholder="Paste a line from the lyrics…"
        context={`From the song "${track.title}" by ${track.artist}`}
      />
    </Card>
  );
}

function FilmCard({ film }: { film: Film }) {
  return (
    <Card>
      <div className="row" style={{ gap: 10, alignItems: "flex-start" }}>
        {film.posterUrl && (
          <img src={film.posterUrl} alt="" width={64} style={{ borderRadius: 6 }} />
        )}
        <div style={{ minWidth: 0 }}>
          <div className="row" style={{ gap: 6 }}>
            <span style={{ fontWeight: 550, fontSize: "0.92rem" }}>{film.title}</span>
            {film.isAnimation && <Badge tone="success">animation</Badge>}
          </div>
          <div className="tiny muted">
            {film.releaseYear} · {film.mediaType === "tv" ? "series" : "film"}
          </div>
        </div>
      </div>
      <p className="small mt" style={{ lineHeight: 1.7 }}>
        <ClickableSpanish text={film.overview} />
      </p>
      <div className="tiny muted">Synopsis in Spanish — click any word you don't know.</div>
    </Card>
  );
}

function Films({ hint }: { hint: string | null }) {
  const [animationOnly, setAnimationOnly] = useState(true);

  const films = useQuery({
    queryKey: ["media-films", animationOnly],
    queryFn: () => api.get<{ items: Film[]; error: string | null }>(`/media/films?animation=${animationOnly}`),
  });

  if (hint) {
    return (
      <Card>
        <Empty
          title="Films need a TMDB key"
          hint={hint}
          action={
            <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noreferrer noopener" className="btn btn-sm">
              Get a free key →
            </a>
          }
        />
      </Card>
    );
  }

  return (
    <>
      <div className="row mb" style={{ gap: 6 }}>
        <button className={`btn btn-sm ${animationOnly ? "btn-primary" : ""}`} onClick={() => setAnimationOnly(true)}>
          Cartoons only
        </button>
        <button className={`btn btn-sm ${!animationOnly ? "btn-primary" : ""}`} onClick={() => setAnimationOnly(false)}>
          Everything
        </button>
      </div>
      <p className="small secondary mb">
        Animation is the easiest place to start: dubbed dialogue is recorded clean, articulated
        clearly and paced for children.
      </p>
      {films.isLoading ? (
        <Loading />
      ) : (
        <div className="grid grid-2">
          {films.data?.items.map((film) => <FilmCard key={film.id} film={film} />)}
        </div>
      )}
    </>
  );
}

function MusicTab() {
  const [artist, setArtist] = useState("Jorge Drexler");
  const tracks = useQuery({
    queryKey: ["media-music", artist],
    queryFn: () => api.get<{ music: { items: Track[] } }>(`/media/search?q=${encodeURIComponent(artist)}`),
  });

  return (
    <>
      <div className="row wrap mb" style={{ gap: 6 }}>
        {["Jorge Drexler", "Natalia Lafourcade", "Juanes", "Rosalía", "Bad Bunny"].map((name) => (
          <button
            key={name}
            className={`btn btn-sm ${artist === name ? "btn-primary" : ""}`}
            onClick={() => setArtist(name)}
          >
            {name}
          </button>
        ))}
      </div>
      {tracks.isLoading ? (
        <Loading />
      ) : (
        <div className="grid grid-2">
          {tracks.data?.music.items.map((track) => <TrackCard key={track.id} track={track} />)}
        </div>
      )}
    </>
  );
}

function Podcasts() {
  const podcasts = useQuery({
    queryKey: ["media-podcasts"],
    queryFn: () =>
      api.get<{
        shows: { publisher: string; level: string; description: string }[];
        items: Episode[];
        error: string | null;
      }>("/media/podcasts"),
  });

  if (podcasts.isLoading) return <Loading />;

  return (
    <>
      <p className="small secondary mb">
        Long-form listening is what separates understanding exercises from understanding people.
        Start with a show made for learners and work down the list.
      </p>

      <div className="grid grid-2 mb">
        {podcasts.data?.shows.map((show) => (
          <Card key={show.publisher}>
            <div className="row-between">
              <strong style={{ fontSize: "0.92rem" }}>{show.publisher}</strong>
              <Badge>{show.level}</Badge>
            </div>
            <div className="tiny muted mt">{show.description}</div>
          </Card>
        ))}
      </div>

      <h2 className="mb">Recent episodes</h2>
      {podcasts.data?.items.length === 0 ? (
        <Empty title="No episodes loaded" hint={podcasts.data.error ?? undefined} />
      ) : (
        <div className="col" style={{ gap: 8 }}>
          {podcasts.data?.items.map((episode) => (
            <Card key={episode.pageUrl}>
              <div className="row-between" style={{ gap: 10 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 540, fontSize: "0.9rem" }}>{episode.title}</div>
                  <div className="tiny muted">
                    {episode.publisher}
                    {episode.durationSeconds ? ` · ${Math.round(episode.durationSeconds / 60)} min` : ""}
                  </div>
                </div>
              </div>
              {episode.audioUrl && (
                <audio controls preload="none" src={episode.audioUrl} style={{ width: "100%", marginTop: 8, height: 34 }} />
              )}
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

function Books() {
  const books = useQuery({
    queryKey: ["media-books"],
    queryFn: () => api.get<{ items: Book[]; tooAdvanced: boolean }>("/media/books"),
  });

  if (books.isLoading) return <Loading />;

  return (
    <>
      {books.data?.tooAdvanced && (
        <div className="banner mb">
          These are nineteenth-century literary texts — long sentences, archaic vocabulary, verb
          forms no longer used in speech. Genuinely hard below B2. The press and Wikipedia sections
          are better material until then.
        </div>
      )}
      <div className="col" style={{ gap: 6 }}>
        {books.data?.items.map((book) => <BookRow key={book.id} book={book} />)}
      </div>
    </>
  );
}

function BookRow({ book }: { book: Book }) {
  const [excerpt, setExcerpt] = useState<string | null>(null);

  const load = useMutation({
    mutationFn: () => api.post<{ excerpt: string }>("/media/book", { textUrl: book.textUrl }),
    onSuccess: (data) => setExcerpt(data.excerpt),
  });

  return (
    <Card>
      <div className="row-between" style={{ gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 540, fontSize: "0.9rem" }}>{book.title}</div>
          <div className="tiny muted">{book.author}</div>
        </div>
        <div className="row" style={{ gap: 6 }}>
          {book.textUrl && !excerpt && (
            <button className="btn btn-sm" disabled={load.isPending} onClick={() => load.mutate()}>
              {load.isPending ? "…" : "Read the opening"}
            </button>
          )}
          <a href={book.readUrl} target="_blank" rel="noreferrer noopener" className="btn btn-sm btn-ghost">
            Full text →
          </a>
        </div>
      </div>

      {excerpt && (
        <div className="prose es mt" style={{ lineHeight: 1.9, maxHeight: 420, overflowY: "auto" }}>
          {excerpt.split("\n\n").slice(0, 12).map((para, index) =>
            para.trim() ? <p key={index}><ClickableSpanish text={para} /></p> : null,
          )}
        </div>
      )}
    </Card>
  );
}

interface WordGloss {
  surface: string;
  lemma: string;
  meaning: string;
  partOfSpeech: string;
  note?: string;
  standardForm?: string;
}

interface LineExplanation {
  original: string;
  translation: string;
  literal?: string;
  words: WordGloss[];
  grammar: { point: string; explanation: string }[];
  dialect: string | null;
  estimatedLevel: string | null;
}

/**
 * Break down a line the learner brings.
 *
 * Lyrics and subtitles are licensed works we cannot host, but the learner
 * already has them open somewhere legitimate. What they lack is the
 * explanation, and that works on any text they paste — which is also the half
 * with the actual teaching value.
 */
export function ExplainLine({ placeholder, context }: { placeholder?: string; context?: string }) {
  const [line, setLine] = useState("");
  const [result, setResult] = useState<LineExplanation | null>(null);

  const explain = useMutation({
    mutationFn: () =>
      api.post<{ explanation: LineExplanation | null; message: string | null }>("/explain", {
        line: line.trim(),
        context,
      }),
    onSuccess: (data) => setResult(data.explanation),
  });

  return (
    <div className="mt">
      <form
        className="row"
        onSubmit={(event) => {
          event.preventDefault();
          if (line.trim()) explain.mutate();
        }}
      >
        <input
          className="input"
          value={line}
          placeholder={placeholder ?? "Paste a line of Spanish…"}
          onChange={(event) => setLine(event.target.value)}
        />
        <button className="btn btn-primary" type="submit" disabled={!line.trim() || explain.isPending}>
          {explain.isPending ? "…" : "Break it down"}
        </button>
      </form>

      {explain.data?.message && !result && (
        <div className="tiny muted mt">{explain.data.message}</div>
      )}

      {result && (
        <div className="feedback feedback-neutral mt" style={{ textAlign: "left" }}>
          <div className="es" style={{ fontWeight: 550 }}>{result.original}</div>
          <div className="small" style={{ marginTop: 4 }}>{result.translation}</div>
          {result.literal && (
            <div className="tiny muted" style={{ marginTop: 4 }}>Literally: {result.literal}</div>
          )}

          {result.words.length > 0 && (
            <div className="mt">
              <div className="stat-label mb">Word by word</div>
              <div className="col" style={{ gap: 5 }}>
                {result.words.map((word, index) => (
                  <div key={index} className="small">
                    <strong>{word.surface}</strong>
                    {/* The standard spelling is the key move: it turns an
                        unrecognisable written form back into a known word. */}
                    {word.standardForm && (
                      <span style={{ color: "var(--accent-text)" }}> = {word.standardForm}</span>
                    )}
                    {" — "}
                    {word.meaning}
                    {word.note && <span className="muted"> · {word.note}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.grammar.length > 0 && (
            <div className="mt">
              <div className="stat-label mb">Grammar</div>
              <div className="col" style={{ gap: 6 }}>
                {result.grammar.map((point, index) => (
                  <div key={index} className="small">
                    <strong>{point.point}</strong> — {point.explanation}
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.dialect && (
            <div className="mt">
              <div className="stat-label mb">Dialect</div>
              <div className="small">{result.dialect}</div>
            </div>
          )}

          <div className="row-between mt">
            {result.estimatedLevel && <Badge tone="info">line is ~{result.estimatedLevel}</Badge>}
            <button className="btn btn-sm btn-ghost" onClick={() => { setResult(null); setLine(""); }}>
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Any word can be looked up in the context of its sentence. */
function ClickableSpanish({ text }: { text: string }) {
  const [lookup, setLookup] = useState<{ word: string; meaning: string; lemma?: string } | null>(null);

  const onWord = async (word: string) => {
    try {
      const result = await api.post<{ word: string; meaning: string; lemma?: string }>("/lookup", {
        word,
        sentence: text.slice(0, 400),
      });
      setLookup(result.meaning ? result : { word, meaning: "No definition found." });
    } catch {
      setLookup({ word, meaning: "Could not look that up." });
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
      {lookup && (
        <span
          className="feedback feedback-neutral"
          style={{ display: "block", marginTop: 8, cursor: "pointer" }}
          onClick={() => setLookup(null)}
        >
          <strong>{lookup.lemma ?? lookup.word}</strong> — {lookup.meaning}
          <span className="tiny muted"> (click to dismiss)</span>
        </span>
      )}
    </>
  );
}
