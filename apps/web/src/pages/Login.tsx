import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { api, setToken } from "../lib/api";
import { Card } from "../components/ui";

export function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("register");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await api.post<{ token: string; needsPlacement: boolean }>(
        `/auth/${mode}`,
        mode === "register" ? { email, password, displayName } : { email, password },
      );
      setToken(result.token);
      await navigate({ to: result.needsPlacement ? "/placement" : "/" });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="center mb">
          <div className="brand" style={{ justifyContent: "center", padding: 0 }}>
            <span className="brand-mark">L</span>
            <span>Lingoza</span>
          </div>
          <p className="small secondary mt">
            Spanish from your first word to fluent conversation.
          </p>
        </div>

        <Card>
          <form className="col" onSubmit={submit}>
            {mode === "register" && (
              <div className="field">
                <label className="label" htmlFor="name">Your name</label>
                <input
                  id="name"
                  className="input"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="Ana"
                />
              </div>
            )}

            <div className="field">
              <label className="label" htmlFor="email">Email</label>
              <input
                id="email"
                className="input"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
              />
            </div>

            <div className="field">
              <label className="label" htmlFor="password">Password</label>
              <input
                id="password"
                className="input"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="At least 8 characters"
              />
            </div>

            {error && <div className="feedback feedback-incorrect">{error}</div>}

            <button className="btn btn-primary btn-block btn-lg" type="submit" disabled={busy}>
              {busy ? "…" : mode === "register" ? "Create account" : "Sign in"}
            </button>
          </form>

          <div className="center mt">
            <button
              className="btn btn-sm btn-ghost"
              onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(null); }}
            >
              {mode === "login" ? "No account? Create one" : "Already have an account? Sign in"}
            </button>
          </div>
        </Card>

        <p className="tiny muted center mt">
          Your progress syncs across the web app, the Telegram bot and mobile.
        </p>
      </div>
    </div>
  );
}
