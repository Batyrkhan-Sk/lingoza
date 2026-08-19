import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { serveStatic } from "@hono/node-server/serve-static";
import { requireAuth } from "../auth.js";
import { config } from "../config.js";
import { aiStatus } from "../services/ai.js";
import { authRoutes } from "./routes/auth.js";
import { learnRoutes } from "./routes/learn.js";
import { practiceRoutes } from "./routes/practice.js";
import { studyRoutes } from "./routes/study.js";
import { telegramRoutes } from "../telegram/webhook.js";

/**
 * The API surface.
 *
 * One REST API serves the web app, the Telegram bot and any future mobile
 * client (§20). Routes are thin: they validate input, call a service, and
 * serialise the result. All learning logic lives in the services and, below
 * them, in @lingoza/engine.
 */
export function createApp(): Hono {
  const app = new Hono();

  app.use("*", logger());
  app.use(
    "/api/*",
    cors({
      origin: config.webOrigin,
      allowHeaders: ["Content-Type", "Authorization"],
      allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
      credentials: true,
    }),
  );

  app.get("/health", (c) =>
    c.json({
      status: "ok",
      ai: aiStatus(),
      telegram: { configured: Boolean(config.telegram.botToken) },
    }),
  );

  /**
   * Authentication is decided in exactly one place.
   *
   * The domain routers are all mounted at `/api`, so a `use("*")` guard inside
   * any one of them would apply to every `/api/*` request — including the
   * Telegram webhook, which Telegram calls with no bearer token and which
   * would then silently 401 for every user of the bot. Listing the public
   * prefixes here instead makes the policy explicit and independent of the
   * order routers happen to be registered in.
   */
  const PUBLIC_PREFIXES = ["/api/auth/register", "/api/auth/login", "/api/telegram"];

  app.use("/api/*", async (c, next) => {
    if (PUBLIC_PREFIXES.some((prefix) => c.req.path.startsWith(prefix))) return next();
    return requireAuth(c, next);
  });

  app.route("/api/auth", authRoutes);
  app.route("/api", learnRoutes);
  app.route("/api", practiceRoutes);
  app.route("/api", studyRoutes);
  app.route("/api/telegram", telegramRoutes);

  /**
   * Serve the built web app from the same process in production.
   *
   * One container instead of two: no CORS, no second deploy target, and the
   * Telegram webhook and the web UI share a hostname and certificate. In
   * development this is off, because Vite serves the app with HMR instead.
   */
  if (config.serveWeb) {
    app.use("/assets/*", serveStatic({ root: config.webRoot }));
    app.get("/favicon.ico", serveStatic({ path: `${config.webRoot}/favicon.ico` }));

    // SPA fallback: any non-API path is a client route, so hand back index.html
    // and let the router resolve it. Registered last so it cannot shadow /api.
    app.get("*", async (c, next) => {
      if (c.req.path.startsWith("/api/")) return next();
      return serveStatic({ path: `${config.webRoot}/index.html` })(c, next);
    });
  }

  app.notFound((c) => c.json({ error: "not_found", message: "No such endpoint." }, 404));

  app.onError((error, c) => {
    console.error("[api]", error);

    // Prisma's "record not found" surfaces as a thrown error from *OrThrow
    // helpers; map it rather than returning a 500 for a missing resource.
    if (error.message.includes("No ") && error.message.includes("found")) {
      return c.json({ error: "not_found", message: "That does not exist." }, 404);
    }

    return c.json(
      {
        error: "internal_error",
        message: config.isProduction ? "Something went wrong." : error.message,
      },
      500,
    );
  });

  return app;
}
