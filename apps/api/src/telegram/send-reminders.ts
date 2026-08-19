/**
 * Run one reminder sweep and exit.
 *
 *   npm run reminders:run --workspace @lingoza/api
 *
 * The API sends reminders itself on an interval, so this exists for two other
 * cases: checking the wording and the delivery path without waiting for a
 * slot, and driving reminders from an external scheduler (a Kubernetes
 * CronJob, say) with REMINDERS=off set on the API.
 */
import { runReminderSweep } from "../services/reminders.js";
import { prisma } from "../db.js";
import { telegram } from "./client.js";

async function main(): Promise<void> {
  if (!telegram.configured) {
    console.error("TELEGRAM_BOT_TOKEN is not set — there is nothing to send with.");
    process.exit(1);
  }

  const result = await runReminderSweep(new Date());
  console.log(
    `Considered ${result.considered} learners: ${result.sent} sent, ` +
      `${result.skipped} not due or already handled, ${result.failed} failed.`,
  );

  await prisma.$disconnect();
}

void main();
