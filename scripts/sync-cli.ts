#!/usr/bin/env tsx
/**
 * Sync generated CLI command reference from AFAuthHQ/cli.
 *
 * Wiring (TODO):
 *   1. In AFAuthHQ/cli, add a release-tag workflow that runs
 *      `cobra doc generate` (or the in-tree doc-gen target),
 *      emits `docs-out/commands/*.mdx`, uploads as an artifact,
 *      and triggers this repo via repository_dispatch
 *      (event_type: `cli-released`, payload: { tag, run_id }).
 *
 *   2. Here, download the artifact for that run_id and write into
 *      cli/commands/.
 *
 * Until that's wired up, this script is a no-op.
 */

console.log(
  "ℹ sync-cli.ts is a stub — wire up cobra doc-gen → repository_dispatch in AFAuthHQ/cli first.",
);
