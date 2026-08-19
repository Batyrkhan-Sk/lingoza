import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type Me } from "../lib/api";
import { PageHeader } from "../components/Layout";
import { Badge, Card, Loading } from "../components/ui";

/**
 * Settings, including the Telegram link flow (§17).
 *
 * Linking issues a short-lived code the learner sends to the bot; from then on
 * both interfaces read and write the same account.
 */
export function SettingsPage() {
  const queryClient = useQueryClient();
  const [code, setCode] = useState<string | null>(null);

  const me = useQuery({ queryKey: ["me"], queryFn: () => api.get<Me>("/auth/me") });

  const save = useMutation({
    mutationFn: (patch: Partial<Me>) => api.patch("/auth/me", patch),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["me"] });
      await queryClient.invalidateQueries({ queryKey: ["daily"] });
    },
  });

  const link = useMutation({
    mutationFn: () => api.post<{ code: string; instructions: string }>("/auth/telegram/link-code"),
    onSuccess: (result) => setCode(result.code),
  });

  if (me.isLoading) return <div className="page"><Loading /></div>;
  if (!me.data) return null;
  const user = me.data;

  return (
    <div className="page">
      <PageHeader title="Settings" />

      <Card className="mb">
        <h2 className="mb">Daily goal</h2>
        <p className="small secondary">
          Your session is built to fit this. Shorter budgets drop the lowest-value items rather than
          squeezing everything down to uselessness.
        </p>
        <div className="row wrap mt" style={{ gap: 6 }}>
          {[10, 20, 30, 45, 60].map((minutes) => (
            <button
              key={minutes}
              className={`btn ${user.dailyTimeBudget === minutes ? "btn-primary" : ""}`}
              onClick={() => save.mutate({ dailyTimeBudget: minutes })}
            >
              {minutes} min
            </button>
          ))}
        </div>
      </Card>

      <Card className="mb">
        <h2 className="mb">Spanish variety</h2>
        <p className="small secondary">
          Both are fully correct — this only changes which one your tutor and content default to.
        </p>
        <div className="row wrap mt" style={{ gap: 6 }}>
          <button
            className={`btn ${user.dialectPreference === "es-ES" ? "btn-primary" : ""}`}
            onClick={() => save.mutate({ dialectPreference: "es-ES" })}
          >
            🇪🇸 Spain — coche, ordenador, vosotros
          </button>
          <button
            className={`btn ${user.dialectPreference === "es-419" ? "btn-primary" : ""}`}
            onClick={() => save.mutate({ dialectPreference: "es-419" })}
          >
            🌎 Latin America — carro, computadora, ustedes
          </button>
        </div>
      </Card>

      <Card className="mb">
        <div className="row-between mb">
          <h2>Telegram</h2>
          {user.telegramLinked && <Badge tone="success">Connected</Badge>}
        </div>

        {user.telegramLinked ? (
          <p className="small secondary">
            Your Telegram account is connected. Lessons, reviews and progress are shared — start
            something here and finish it in the chat.
          </p>
        ) : (
          <>
            <p className="small secondary">
              Connect the bot to study from Telegram. Same account, same progress, same review queue.
            </p>
            {code ? (
              <div className="feedback feedback-correct mt">
                Send this to the Lingoza bot within 15 minutes:
                <div className="mono" style={{ fontSize: "1.3rem", marginTop: 8 }}>/link {code}</div>
              </div>
            ) : (
              <button className="btn btn-primary mt" onClick={() => link.mutate()} disabled={link.isPending}>
                Generate link code
              </button>
            )}
          </>
        )}
      </Card>

      <Card>
        <h2 className="mb">Account</h2>
        <div className="col" style={{ gap: 4 }}>
          <div className="row-between"><span className="small secondary">Name</span><span className="small">{user.displayName}</span></div>
          <div className="row-between"><span className="small secondary">Email</span><span className="small">{user.email ?? "—"}</span></div>
          <div className="row-between"><span className="small secondary">Current level</span><Badge tone="accent">{user.level}</Badge></div>
        </div>
      </Card>
    </div>
  );
}
