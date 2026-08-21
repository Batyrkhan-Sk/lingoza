import { localDateKey } from "@lingoza/engine";
import { prisma } from "../db.js";

/**
 * Progress against today's plan.
 *
 * The quantities in a daily session are budgets, not labels. A plan that says
 * "Review 10 words" has to stop at ten: before this, the review loop simply ran
 * until the underlying queue emptied — thirty-four words against a promise of
 * ten — which is both a broken promise and the reason sessions were abandoned
 * halfway through.
 *
 * This lives apart from the planner so that vocabulary, practice and the
 * planner itself can all count against a plan without importing each other.
 */

/** The item the learner is working on right now for a given kind of work. */
export async function currentDailyItem(userId: string, kinds: string[]) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const date = localDateKey(new Date(), user.timezone);

  return prisma.dailySessionItem.findFirst({
    where: { session: { userId, date }, kind: { in: kinds }, completed: false },
    orderBy: { orderIndex: "asc" },
  });
}

export interface DailyAdvance {
  item: { id: string; title: string; quantity: number | null; progress: number };
  /** True on the unit that met the budget — the moment to move the learner on. */
  justCompleted: boolean;
  /** Units left in this item, or null when the item is not measured in units. */
  remaining: number | null;
  next: { id: string; title: string; rationale: string; minutes: number } | null;
}

/**
 * Count one unit of work against today's plan, closing the item out when its
 * budget is met. Returns null when today has no open item of that kind — a
 * learner reviewing beyond their plan is not doing anything wrong, they are
 * just no longer spending a budget.
 */
export async function advanceDailyItem(
  userId: string,
  kinds: string[],
  by = 1,
): Promise<DailyAdvance | null> {
  const item = await currentDailyItem(userId, kinds);
  if (!item) return null;

  const progress = item.progress + by;
  // An item with no quantity is not measured in units, so it can only be
  // finished deliberately and never completes itself here.
  const finished = item.quantity !== null && progress >= item.quantity;

  const updated = await prisma.dailySessionItem.update({
    where: { id: item.id },
    data: { progress, completed: finished },
  });

  const session = finished
    ? await syncSessionProgress(item.sessionId)
    : await prisma.dailySession.update({
        where: { id: item.sessionId },
        data: { status: "in_progress" },
        include: { items: { orderBy: { orderIndex: "asc" } } },
      });

  return {
    item: updated,
    justCompleted: finished,
    remaining: updated.quantity === null ? null : Math.max(0, updated.quantity - progress),
    next: session.items.find((i) => !i.completed) ?? null,
  };
}

/** Recount a session after one of its items changed. */
export async function syncSessionProgress(sessionId: string, knownTotal?: number) {
  const [completedItems, session] = await Promise.all([
    prisma.dailySessionItem.count({ where: { sessionId, completed: true } }),
    knownTotal === undefined
      ? prisma.dailySession.findUniqueOrThrow({ where: { id: sessionId } })
      : null,
  ]);
  const totalItems = knownTotal ?? session!.totalItems;
  const done = completedItems >= totalItems;

  return prisma.dailySession.update({
    where: { id: sessionId },
    data: {
      completedItems,
      status: done ? "completed" : "in_progress",
      completedAt: done ? new Date() : null,
    },
    include: { items: { orderBy: { orderIndex: "asc" } } },
  });
}
