/**
 * @lingoza/content — the Spanish curriculum as structured data.
 *
 * Layering rule: this package may depend on @lingoza/engine (for shared domain
 * types) and on nothing else in the repo. It knows nothing about HTTP, the
 * database, React or Telegram — the API seeds from it and serves it, but the
 * content itself is transport-agnostic and reusable by any interface.
 */

export * from "./types.js";
export * from "./vocabulary/index.js";
export * from "./grammar/index.js";
export * from "./curriculum/index.js";
export * from "./placement/index.js";
export * from "./culture/index.js";
export * from "./mnemonics/index.js";
export * from "./sources/index.js";
export * from "./verify/index.js";
