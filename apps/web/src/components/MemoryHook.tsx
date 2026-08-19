import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { Badge } from "./ui";

/**
 * Memory hooks, shown *after* a recall attempt.
 *
 * Deliberately collapsed behind a button rather than rendered inline: seeing
 * the hook before trying to remember removes the retrieval attempt, which is
 * the part that actually builds the memory. The server also tells us when a
 * word is known well enough that the hook has become a crutch, and we relay
 * that instead of silently hiding it.
 */

interface MnemonicView {
  id: string;
  kind: string;
  hook: string;
  imagery: string | null;
  explanation: string | null;
  keyword: string | null;
  origin: "curated" | "ai";
  helpfulCount: number;
  unhelpfulCount: number;
  coaching: string;
  myRating: boolean | null;
}

interface MnemonicResponse {
  mnemonics: MnemonicView[];
  offer?: { show: boolean; offer: boolean; reason: string };
  canGenerate: boolean;
}

export function MemoryHook({
  scope,
  targetId,
  autoOpen = false,
}: {
  scope: "word" | "grammar";
  targetId: string;
  autoOpen?: boolean;
}) {
  const [open, setOpen] = useState(autoOpen);
  const queryClient = useQueryClient();
  const key = ["mnemonics", scope, targetId];

  const data = useQuery({
    queryKey: key,
    queryFn: () => api.get<MnemonicResponse>(`/mnemonics/${scope}/${targetId}`),
    enabled: open,
  });

  const generate = useMutation({
    mutationFn: () => api.post<{ created: MnemonicView | null; message: string | null }>(
      `/mnemonics/${scope}/${targetId}/generate`,
    ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  });

  const rate = useMutation({
    mutationFn: ({ id, helpful }: { id: string; helpful: boolean }) =>
      api.post(`/mnemonics/${id}/rate`, { helpful }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  });

  if (!open) {
    return (
      <button className="btn btn-sm btn-ghost" onClick={() => setOpen(true)}>
        💡 Memory hook
      </button>
    );
  }

  const hooks = data.data?.mnemonics ?? [];
  const faded = data.data?.offer && !data.data.offer.show && data.data.offer.offer;

  return (
    <div className="feedback feedback-neutral" style={{ textAlign: "left", marginTop: 10 }}>
      <div className="row-between mb">
        <strong style={{ fontSize: "0.84rem" }}>Memory hook</strong>
        <button className="btn btn-sm btn-ghost" onClick={() => setOpen(false)}>Hide</button>
      </div>

      {faded && (
        <div className="tiny muted mb">{data.data?.offer?.reason}</div>
      )}

      {data.isLoading && <span className="tiny muted">Loading…</span>}

      {hooks.length === 0 && !data.isLoading && (
        <div className="tiny muted">
          No hook yet for this one.
        </div>
      )}

      {hooks.map((mnemonic) => (
        <div key={mnemonic.id} style={{ marginBottom: 12 }}>
          <div className="row wrap" style={{ gap: 6, marginBottom: 4 }}>
            <Badge tone="info">{mnemonic.kind}</Badge>
            {mnemonic.origin === "ai" && <Badge>yours</Badge>}
            {mnemonic.keyword && <span className="tiny muted">sounds like “{mnemonic.keyword}”</span>}
          </div>

          <div style={{ fontSize: "0.92rem", fontWeight: 520 }}>{mnemonic.hook}</div>
          {mnemonic.imagery && (
            <div className="small secondary" style={{ marginTop: 4 }}>{mnemonic.imagery}</div>
          )}
          {mnemonic.explanation && (
            <div className="tiny muted" style={{ marginTop: 4 }}>{mnemonic.explanation}</div>
          )}
          <div className="tiny muted" style={{ marginTop: 6, fontStyle: "italic" }}>
            {mnemonic.coaching}
          </div>

          <div className="row" style={{ gap: 4, marginTop: 6 }}>
            <button
              className="btn btn-sm btn-ghost"
              disabled={rate.isPending}
              onClick={() => rate.mutate({ id: mnemonic.id, helpful: true })}
              style={{ opacity: mnemonic.myRating === true ? 1 : 0.6 }}
            >
              👍 {mnemonic.helpfulCount > 0 ? mnemonic.helpfulCount : ""}
            </button>
            <button
              className="btn btn-sm btn-ghost"
              disabled={rate.isPending}
              onClick={() => rate.mutate({ id: mnemonic.id, helpful: false })}
              style={{ opacity: mnemonic.myRating === false ? 1 : 0.6 }}
            >
              👎
            </button>
          </div>
        </div>
      ))}

      {data.data?.canGenerate && (
        <button
          className="btn btn-sm"
          disabled={generate.isPending}
          onClick={() => generate.mutate()}
        >
          {generate.isPending ? "Thinking…" : hooks.length > 0 ? "✨ Make me another" : "✨ Make me one"}
        </button>
      )}

      {generate.data?.message && (
        <div className="tiny muted" style={{ marginTop: 6 }}>{generate.data.message}</div>
      )}
      {!data.data?.canGenerate && hooks.length === 0 && (
        <div className="tiny muted">
          Personal hooks need an AI provider configured.
        </div>
      )}
    </div>
  );
}
