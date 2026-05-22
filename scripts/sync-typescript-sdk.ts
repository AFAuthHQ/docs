#!/usr/bin/env tsx
/**
 * Sync generated TypeScript SDK reference from AFAuthHQ/typescript-sdk.
 *
 * Wiring (TODO):
 *   1. In AFAuthHQ/typescript-sdk, add a release-tag workflow that runs
 *      `typedoc` per package, emits `docs-out/<pkg>/*.mdx`, uploads as
 *      an artifact, and triggers this repo via repository_dispatch
 *      (event_type: `typescript-sdk-released`, payload: { tag, run_id }).
 *
 *   2. Here, download the artifact for that run_id and write into
 *      sdk/typescript/<core|agent|server|worker>/reference/.
 *
 * Until that's wired up, this script is a no-op.
 */

console.log(
  "ℹ sync-typescript-sdk.ts is a stub — wire up typedoc → repository_dispatch in AFAuthHQ/typescript-sdk first.",
);
