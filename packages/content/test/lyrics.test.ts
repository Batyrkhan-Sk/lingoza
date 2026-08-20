import { test, describe, afterEach } from "node:test";
import assert from "node:assert/strict";

// Tests run against the built output — the same artifact the API imports.
import { LyricsSource, type LicensedLyricsProvider } from "../dist/index.js";

/**
 * The display gate.
 *
 * These are the tests worth having on this file: not that lyrics can be
 * fetched — that is one HTTP call and an outage away from being a flaky test —
 * but that nothing shows them unless someone has said it may. The failure this
 * guards is silent and one-directional: a wrongly-set flag republishes
 * somebody's work, and no test downstream would notice, because every screen
 * trusts the flag.
 *
 * Invented lines throughout, and the network is stubbed, so no third party's
 * text enters the repository or the test run.
 */

const LINES = ["Yo canto una canción", "Ella baila conmigo", "Mañana volvemos"];

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

/** Answer any LRCLIB call with plain lyrics; fail anything else. */
function stubLrclib(): void {
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = String(input);
    if (!url.includes("lrclib.net")) return new Response("", { status: 404 });
    return Response.json({ plainLyrics: LINES.join("\n"), duration: 180 });
  }) as typeof fetch;
}

const query = { artist: "Alguien", track: "Una canción", durationSeconds: 180 };

describe("lyrics display rights", () => {
  test("without a declared licence, fetched lines are analysis-only", async () => {
    stubLrclib();
    const result = await new LyricsSource().fetch(query);

    assert.equal(result?.lines.length, 3, "the analyser still gets the whole lyric");
    assert.equal(result?.displayable, false);
    assert.equal(result?.attribution, null);
  });

  test("an unmodified deployment cannot display anything", () => {
    assert.equal(new LyricsSource().canDisplay, false);
  });

  test("a declared licence marks the same lines displayable, with its credit", async () => {
    stubLrclib();
    const source = new LyricsSource(
      {},
      { displayLicence: { attribution: "Lyrics licensed from Example Rights Co." } },
    );

    assert.equal(source.canDisplay, true);
    const result = await source.fetch(query);
    assert.equal(result?.displayable, true);
    assert.equal(result?.attribution, "Lyrics licensed from Example Rights Co.");
    assert.equal(result?.maxDisplayLines, null, "no cap means the licence covers the work");
  });

  test("an excerpt licence caps display without shortening the analysis", async () => {
    stubLrclib();
    const result = await new LyricsSource(
      {},
      { displayLicence: { attribution: "Excerpt licence", maxLines: 2 } },
    ).fetch(query);

    // The distinction the whole design turns on: measuring a work is not
    // showing it, so the analyser keeps all three lines and only display is
    // bounded. Truncating here would report a wrong coverage figure.
    assert.equal(result?.lines.length, 3);
    assert.equal(result?.maxDisplayLines, 2);
  });

  test("a provider carrying its own rights is preferred over the free ones", async () => {
    stubLrclib();
    const licensed: LicensedLyricsProvider = {
      name: "example-aggregator",
      attribution: "Powered by Example Aggregator",
      fetch: async () => ({ lines: ["Sólo esta línea"], durationSeconds: 180 }),
    };

    const result = await new LyricsSource({}, { licensed: [licensed] }).fetch(query);
    assert.equal(result?.provider, "example-aggregator");
    assert.equal(result?.displayable, true);
    assert.equal(result?.attribution, "Powered by Example Aggregator");
  });

  test("a failing licensed provider degrades to analysis rather than to nothing", async () => {
    stubLrclib();
    const broken: LicensedLyricsProvider = {
      name: "broken",
      attribution: "x",
      fetch: async () => {
        throw new Error("upstream down");
      },
    };

    const result = await new LyricsSource({}, { licensed: [broken] }).fetch(query);
    assert.equal(result?.provider, "lrclib", "the learner still gets the breakdown");
    assert.equal(result?.displayable, false, "but not the words");
  });
});
