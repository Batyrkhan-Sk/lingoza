import { config } from "./config.js";
import { runReminderSweep } from "./services/reminders.js";
import { telegram } from "./telegram/client.js";

/**
 * The in-process scheduler.
 *
 * Reminders are the only recurring job, and they are cheap: one indexed query
 * per tick, and real work only for the handful of learners whose local clock
 * has just passed one of their slots. That does not justify a queue, a worker
 * process or a cron container — but it does have to survive being run twice,
 * which is why delivery is deduplicated in the database rather than here.
 *
 * The sweep ticks on a fixed interval instead of sleeping until the next slot,
 * because "the next slot" depends on every learner's timezone and can change
 * the moment someone edits their settings.
 */
export function startScheduler(): { stop: () => void } {
  if (!config.reminders.enabled) {
    console.log("  Reminders     disabled (REMINDERS=off)");
    return { stop: () => {} };
  }

  if (!telegram.configured) {
    console.log("  Reminders     idle (no TELEGRAM_BOT_TOKEN)");
    return { stop: () => {} };
  }

  const intervalMs = config.reminders.intervalMinutes * 60_000;
  let running = false;

  const tick = async (): Promise<void> => {
    // A sweep that overruns its interval must not overlap itself; skipping is
    // safe because the next tick re-evaluates every learner from scratch.
    if (running) return;
    running = true;
    try {
      await runReminderSweep(new Date());
    } catch (error) {
      console.error("[scheduler] reminder sweep failed:", error);
    } finally {
      running = false;
    }
  };

  const timer = setInterval(() => void tick(), intervalMs);
  // Never hold the process open on its own account — shutdown should not have
  // to wait out an interval.
  timer.unref?.();

  // Run once at startup so a redeploy inside a slot's grace window still
  // delivers it rather than dropping it.
  void tick();

  console.log(`  Reminders     every ${config.reminders.intervalMinutes} min`);
  return { stop: () => clearInterval(timer) };
}
