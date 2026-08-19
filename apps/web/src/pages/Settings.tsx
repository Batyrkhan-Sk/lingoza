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
          <h2>Daily reminders</h2>
          <Badge tone={user.remindersEnabled ? "success" : "warning"}>
            {user.remindersEnabled ? "On" : "Off"}
          </Badge>
        </div>
        <p className="small secondary">
          The Telegram bot nudges you at these hours, in your own timezone ({user.timezone}). Each
          one does a different job: the first hands you today's plan, the middle one is a single
          review card you can answer in the chat, and the last only arrives if the day is still
          empty.
        </p>

        {!user.telegramLinked && (
          <p className="small secondary mt">
            Connect Telegram below to start receiving them.
          </p>
        )}

        <div className="row wrap mt" style={{ gap: 6 }}>
          {REMINDER_PRESETS.map((preset) => (
            <button
              key={preset.label}
              className={`btn ${sameHours(user.reminderHours, preset.hours) ? "btn-primary" : ""}`}
              onClick={() => save.mutate({ reminderHours: preset.hours, remindersEnabled: true })}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="row wrap mt" style={{ gap: 6 }}>
          <button
            className="btn"
            onClick={() => save.mutate({ remindersEnabled: !user.remindersEnabled })}
          >
            {user.remindersEnabled ? "Turn reminders off" : "Turn reminders on"}
          </button>
          {user.timezone !== browserTimezone() && (
            <button className="btn" onClick={() => save.mutate({ timezone: browserTimezone() })}>
              Use my timezone ({browserTimezone()})
            </button>
          )}
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

/**
 * Reminder presets rather than a free-form time picker.
 *
 * The exact minute does not matter — what matters is that the three nudges are
 * spread across the learner's waking day, and a picker makes it easy to end up
 * with three reminders inside one hour.
 */
const REMINDER_PRESETS = [
  { label: "🌅 07 · 12 · 19", hours: [7, 12, 19] },
  { label: "☀️ 09 · 13 · 20", hours: [9, 13, 20] },
  { label: "🌆 10 · 15 · 22", hours: [10, 15, 22] },
  { label: "🌙 12 · 18 · 23", hours: [12, 18, 23] },
];

function sameHours(a: number[] | undefined, b: number[]): boolean {
  return (a ?? []).length === b.length && (a ?? []).every((hour, index) => hour === b[index]);
}

function browserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}
