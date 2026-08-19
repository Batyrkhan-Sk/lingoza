import { createRootRoute, createRoute, createRouter, redirect } from "@tanstack/react-router";
import { getToken } from "./lib/api";
import { Layout } from "./components/Layout";
import { HomePage } from "./pages/Home";
import { LearnPage } from "./pages/Learn";
import { LessonPage } from "./pages/Lesson";
import { LoginPage } from "./pages/Login";
import { PlacementPage } from "./pages/Placement";
import { VocabularyPage } from "./pages/Vocabulary";
import { GrammarPage, GrammarTopicPage } from "./pages/Grammar";
import { ListeningPage, ReadingPage } from "./pages/Media";
import { WritingPage } from "./pages/Writing";
import { SpeakingPage } from "./pages/Speaking";
import { TutorPage } from "./pages/Tutor";
import { ProgressPage } from "./pages/Progress";
import { DailyPage } from "./pages/Daily";
import { PracticePage } from "./pages/Practice";
import { SettingsPage } from "./pages/Settings";

/**
 * Routing.
 *
 * Routes are defined in code rather than generated from the filesystem: the
 * route set is small enough to read on one screen, and it keeps the build to a
 * single step with no codegen to keep in sync.
 *
 * Each route is declared individually rather than through a helper — the paths
 * must stay literal types for TanStack Router to typecheck `<Link to="…">`
 * against them, and a helper taking `path: string` widens them away.
 */

const rootRoute = createRootRoute();

/** Everything inside the shell requires a token. */
const requireAuth = () => {
  if (!getToken()) throw redirect({ to: "/login" });
};

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: LoginPage,
  beforeLoad: () => {
    if (getToken()) throw redirect({ to: "/" });
  },
});

/** The authenticated shell — sidebar plus outlet. */
const appRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "app",
  component: Layout,
  beforeLoad: requireAuth,
});

const parent = () => appRoute;

const routeTree = rootRoute.addChildren([
  loginRoute,
  appRoute.addChildren([
    createRoute({ getParentRoute: parent, path: "/", component: HomePage }),
    createRoute({ getParentRoute: parent, path: "/learn", component: LearnPage }),
    createRoute({ getParentRoute: parent, path: "/lesson/$slug", component: LessonPage }),
    createRoute({ getParentRoute: parent, path: "/daily", component: DailyPage }),
    createRoute({ getParentRoute: parent, path: "/practice", component: PracticePage }),
    createRoute({ getParentRoute: parent, path: "/vocabulary", component: VocabularyPage }),
    createRoute({ getParentRoute: parent, path: "/grammar", component: GrammarPage }),
    createRoute({ getParentRoute: parent, path: "/grammar/$slug", component: GrammarTopicPage }),
    createRoute({ getParentRoute: parent, path: "/listening", component: ListeningPage }),
    createRoute({ getParentRoute: parent, path: "/reading", component: ReadingPage }),
    createRoute({ getParentRoute: parent, path: "/writing", component: WritingPage }),
    createRoute({ getParentRoute: parent, path: "/speaking", component: SpeakingPage }),
    createRoute({ getParentRoute: parent, path: "/tutor", component: TutorPage }),
    createRoute({ getParentRoute: parent, path: "/progress", component: ProgressPage }),
    createRoute({ getParentRoute: parent, path: "/placement", component: PlacementPage }),
    createRoute({ getParentRoute: parent, path: "/settings", component: SettingsPage }),
  ]),
]);

export const router = createRouter({ routeTree, defaultPreload: "intent" });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
