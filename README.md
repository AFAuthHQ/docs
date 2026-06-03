# AFAuth Docs

Documentation for the [AFAuth Protocol](https://github.com/AFAuthHQ/spec), published at [docs.afauth.org](https://docs.afauth.org).

Built with [Mintlify](https://mintlify.com).

## Layout

- **Authored here (hand-maintained)**: `concepts/`, `guides/`, `sdk/`, `cli/`, `reference/`, `snippets/`. This includes the `sdk/typescript/*/overview.mdx` pages and every `cli/commands/*.mdx` page: the typedoc and cobra doc-gen syncs that will eventually generate per-symbol / per-command reference are **not yet wired** (`scripts/sync-typescript-sdk.ts` and `scripts/sync-cli.ts` are currently no-op stubs). Edit these by hand until then.
- **Synced from upstream — do not edit by hand**:
  - `spec/` ← `AFAuthHQ/spec` (via `scripts/sync-spec.ts`)

## Local development

```bash
npm install
npm run dev           # starts Mintlify on http://localhost:3000
npm run broken-links  # link check
npx mint validate     # strict build validation (what CI runs)
```

## Syncing

Only the **spec** sync is live today. The SDK and CLI syncs are scaffolded but not yet wired (see the no-op stubs in `scripts/`).

- **Spec** syncs on every push to `AFAuthHQ/spec@main` (event-driven via `repository_dispatch`), with a 06:00 UTC cron as fallback.
- **TypeScript SDK reference** *(planned — not yet wired)*: will sync on every release tag in `AFAuthHQ/typescript-sdk` once `scripts/sync-typescript-sdk.ts` is implemented (typedoc → `repository_dispatch`).
- **CLI reference** *(planned — not yet wired)*: will sync on every release tag in `AFAuthHQ/cli` once `scripts/sync-cli.ts` is implemented (cobra doc-gen → `repository_dispatch`).

The spec sync opens a PR labelled `automerge: spec-sync`. The PR auto-merges if:

1. Mintlify build passes
2. Link check passes
3. Diff-size sanity check passes (no >50% file deletion)

If any gate fails, the PR stays open with the failing check.

### Wiring up the spec → docs trigger

In `AFAuthHQ/spec`, add a workflow that runs on push to `main` and calls:

```yaml
- run: gh api repos/AFAuthHQ/docs/dispatches -f event_type=spec-updated
  env:
    GH_TOKEN: ${{ secrets.DOCS_DISPATCH_TOKEN }}
```

`DOCS_DISPATCH_TOKEN` is a fine-grained PAT with **Actions: write** on `AFAuthHQ/docs`, stored as a secret in `AFAuthHQ/spec`.

### Manual sync

```bash
gh workflow run sync-spec.yml -R AFAuthHQ/docs
```

## License

Specification text (synced from `AFAuthHQ/spec`) remains under [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/). All other content in this repo is under [Apache-2.0](LICENSE).
