import { Hono } from "hono";
import { generateLinkCode, hashPassword, signToken, verifyPassword } from "../../auth.js";
import { prisma } from "../../db.js";
import { ensureProgress } from "../../services/progress.js";

export const authRoutes = new Hono();

/**
 * Registration, sign-in, and linking a Telegram chat to an existing account.
 *
 * Accounts are interface-agnostic: the same row backs the web app, the bot and
 * a future mobile client, which is the whole basis of progress sync (§19).
 */

authRoutes.post("/register", async (c) => {
  const body = await c.req.json<{ email?: string; password?: string; displayName?: string }>();
  const email = body.email?.trim().toLowerCase();
  const password = body.password ?? "";
  const displayName = body.displayName?.trim() || email?.split("@")[0] || "Learner";

  if (!email || !email.includes("@")) {
    return c.json({ error: "invalid_email", message: "A valid email address is required." }, 400);
  }
  if (password.length < 8) {
    return c.json(
      { error: "weak_password", message: "Use at least 8 characters." },
      400,
    );
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return c.json({ error: "email_taken", message: "That email is already registered." }, 409);
  }

  const user = await prisma.user.create({
    data: { email, passwordHash: hashPassword(password), displayName },
  });
  await ensureProgress(user.id);

  return c.json({
    token: signToken(user.id),
    user: { id: user.id, email: user.email, displayName: user.displayName },
    // A new account has no placement result, so the client sends them to the test.
    needsPlacement: true,
  }, 201);
});

authRoutes.post("/login", async (c) => {
  const { email, password } = await c.req.json<{ email?: string; password?: string }>();
  const user = email
    ? await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } })
    : null;

  // Same response whether the email is unknown or the password is wrong, so
  // the endpoint cannot be used to enumerate registered addresses.
  if (!user?.passwordHash || !verifyPassword(password ?? "", user.passwordHash)) {
    return c.json({ error: "invalid_credentials", message: "Email or password is incorrect." }, 401);
  }

  const placement = await prisma.placementResult.findFirst({ where: { userId: user.id } });

  return c.json({
    token: signToken(user.id),
    user: { id: user.id, email: user.email, displayName: user.displayName },
    needsPlacement: !placement,
  });
});

/** Issue a code the learner types into the Telegram bot to link the account. */
authRoutes.post("/telegram/link-code", async (c) => {
  const user = c.get("user");
  const code = generateLinkCode();

  await prisma.user.update({
    where: { id: user.id },
    data: { linkCode: code, linkCodeExpires: new Date(Date.now() + 15 * 60_000) },
  });

  return c.json({
    code,
    expiresInMinutes: 15,
    instructions: "Send /link " + code + " to the Lingoza bot on Telegram.",
  });
});

authRoutes.get("/me", async (c) => {
  const user = c.get("user");
  const full = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    include: { progress: true },
  });
  const placement = await prisma.placementResult.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return c.json({
    id: full.id,
    email: full.email,
    displayName: full.displayName,
    dialectPreference: full.dialectPreference,
    dailyTimeBudget: full.dailyTimeBudget,
    timezone: full.timezone,
    telegramLinked: Boolean(full.telegramId),
    remindersEnabled: full.remindersEnabled,
    level: full.progress?.currentLevelCode ?? "A1",
    needsPlacement: !placement,
  });
});

authRoutes.patch("/me", async (c) => {
  const user = c.get("user");
  const body = await c.req.json<{
    displayName?: string;
    dialectPreference?: string;
    dailyTimeBudget?: number;
    timezone?: string;
    remindersEnabled?: boolean;
    reminderHour?: number;
    currentLevelCode?: string;
  }>();

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      ...(body.displayName ? { displayName: body.displayName.trim() } : {}),
      ...(body.dialectPreference && ["es-ES", "es-419"].includes(body.dialectPreference)
        ? { dialectPreference: body.dialectPreference }
        : {}),
      ...(body.dailyTimeBudget && [10, 20, 30, 45, 60].includes(body.dailyTimeBudget)
        ? { dailyTimeBudget: body.dailyTimeBudget }
        : {}),
      ...(body.timezone ? { timezone: body.timezone } : {}),
      ...(typeof body.remindersEnabled === "boolean"
        ? { remindersEnabled: body.remindersEnabled }
        : {}),
      ...(typeof body.reminderHour === "number"
        ? { reminderHour: Math.max(0, Math.min(23, body.reminderHour)) }
        : {}),
    },
  });

  // Changing level is a deliberate learner choice, so it is allowed — but it
  // is recorded on progress, not on the user.
  if (body.currentLevelCode && ["A1", "A2", "B1", "B2", "C1", "C2"].includes(body.currentLevelCode)) {
    await prisma.userProgress.update({
      where: { userId: user.id },
      data: { currentLevelCode: body.currentLevelCode },
    });
  }

  return c.json({ ok: true, displayName: updated.displayName });
});
