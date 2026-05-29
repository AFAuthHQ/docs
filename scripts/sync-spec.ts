#!/usr/bin/env tsx
/**
 * Sync spec content from AFAuthHQ/spec into ./spec/.
 *
 *   spec/core.md            → spec/core.mdx
 *   spec/conformance.md     → spec/conformance.mdx
 *   schemas/well-known.json → spec/well-known.mdx
 *   vectors/                → spec/test-vectors.mdx (index)
 *
 * Idempotent. Re-run any time. Outputs to ./spec only.
 */

import { execSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

const SPEC_REPO = "https://github.com/AFAuthHQ/spec.git";
const SPEC_BLOB = "https://github.com/AFAuthHQ/spec/blob/main";
const SPEC_TREE = "https://github.com/AFAuthHQ/spec/tree/main";
const TMP = "/tmp/afauth-spec-sync";
const OUT = "spec";

function clone(): void {
  if (existsSync(TMP)) rmSync(TMP, { recursive: true, force: true });
  execSync(`git clone --depth 1 ${SPEC_REPO} ${TMP}`, { stdio: "inherit" });
}

function readSrc(p: string): string {
  return readFileSync(join(TMP, p), "utf8");
}

function frontmatter(
  title: string,
  description: string,
  source: string,
): string {
  return [
    "---",
    `title: ${JSON.stringify(title)}`,
    `description: ${JSON.stringify(description)}`,
    "---",
    "",
    `<Info>This page is auto-synced from [\`AFAuthHQ/spec/${source}\`](${SPEC_BLOB}/${source}). Do not edit here.</Info>`,
    "",
  ].join("\n");
}

// MDX parses `{...}` in prose as a JS expression, so spec prose that uses
// literal braces (e.g. set notation like `{GET, POST}`) breaks the build.
// Escape braces everywhere except inside fenced code blocks and inline code
// spans, where Markdown/MDX already renders them verbatim.
function escapeMdxBraces(md: string): string {
  let inFence = false;
  return md
    .split("\n")
    .map((line) => {
      if (/^\s*```/.test(line)) {
        inFence = !inFence;
        return line;
      }
      if (inFence) return line;
      // Split on inline code spans (odd indices) — leave those untouched.
      return line
        .split(/(`[^`]*`)/)
        .map((seg, i) =>
          i % 2 === 1
            ? seg
            : seg.replace(/{/g, "&#123;").replace(/}/g, "&#125;"),
        )
        .join("");
    })
    .join("\n");
}

function rewriteLinks(md: string): string {
  // Spec docs live in spec/spec/, so they reference siblings via `../`.
  // Same-dir spec docs that ARE rendered as docs pages → internal route.
  md = md.replace(
    /\]\((?:\.\/)?(core|conformance)\.md([^)]*)\)/g,
    "](/spec/$1$2)",
  );
  // spec/foo.md (with or without ../) → /spec/foo internal docs link.
  md = md.replace(/\]\((?:\.\.\/)?spec\/([^)]+)\.md([^)]*)\)/g, "](/spec/$1$2)");
  // Sibling repo paths (with or without ../) → GitHub. Trailing-slash paths
  // are directories (tree view); everything else is a file (blob view).
  md = md.replace(
    /\]\((?:\.\.\/)?(proposals|vectors|schemas|implementation|harness)(\/[^)]*)\)/g,
    (_m: string, dir: string, rest: string) =>
      rest.endsWith("/")
        ? `](${SPEC_TREE}/${dir}${rest})`
        : `](${SPEC_BLOB}/${dir}${rest})`,
  );
  // Other top-level repo files referenced via ../ (e.g. ../LICENSE).
  md = md.replace(/\]\(\.\.\/([^)./][^)/]*)\)/g, `](${SPEC_BLOB}/$1)`);
  return md;
}

function syncMarkdown(
  srcPath: string,
  dstName: string,
  title: string,
  description: string,
): void {
  let body = readSrc(srcPath);
  // Strip leading H1 — frontmatter already supplies the title.
  body = body.replace(/^# .+\n+/, "");
  body = rewriteLinks(body);
  body = escapeMdxBraces(body);
  mkdirSync(OUT, { recursive: true });
  writeFileSync(
    join(OUT, dstName),
    frontmatter(title, description, srcPath) + body,
  );
  console.log(`✓ ${srcPath} → ${OUT}/${dstName}`);
}

function syncWellKnown(): void {
  const schemaText = readSrc("schemas/well-known.json");
  const schema = JSON.parse(schemaText);
  const body = [
    "## Schema",
    "",
    "```json",
    JSON.stringify(schema, null, 2),
    "```",
    "",
    `Source of truth: [\`AFAuthHQ/spec/schemas/well-known.json\`](${SPEC_BLOB}/schemas/well-known.json).`,
    "",
  ].join("\n");
  writeFileSync(
    join(OUT, "well-known.mdx"),
    frontmatter(
      "well-known discovery document",
      "JSON Schema for /.well-known/afauth.",
      "schemas/well-known.json",
    ) + body,
  );
  console.log(`✓ schemas/well-known.json → ${OUT}/well-known.mdx`);
}

function syncVectorsIndex(): void {
  const vectorsDir = join(TMP, "vectors");
  if (!existsSync(vectorsDir)) {
    console.warn(`! vectors/ not found in spec checkout — skipping`);
    return;
  }
  const categories = readdirSync(vectorsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();

  const sections = categories.map((cat) => {
    return [
      `### ${cat}`,
      "",
      `[\`vectors/${cat}/\`](${SPEC_TREE}/vectors/${cat})`,
      "",
    ].join("\n");
  });

  const body = [
    "Appendix C test vectors. Each category links to raw JSON in `AFAuthHQ/spec/vectors/` so agents and conformance harnesses can fetch them directly.",
    "",
    ...sections,
  ].join("\n");

  writeFileSync(
    join(OUT, "test-vectors.mdx"),
    frontmatter(
      "Test vectors",
      "Appendix C — canonical inputs, signatures, discovery docs, recipients, errors, replay-window vectors.",
      "vectors/",
    ) + body,
  );
  console.log(`✓ vectors/ → ${OUT}/test-vectors.mdx`);
}

function main(): void {
  clone();
  syncMarkdown(
    "spec/core.md",
    "core.mdx",
    "Specification",
    "AFAuth Protocol v0.1 — normative specification.",
  );
  syncMarkdown(
    "spec/conformance.md",
    "conformance.mdx",
    "Conformance",
    "Conformance criteria for agent and service roles.",
  );
  syncWellKnown();
  syncVectorsIndex();
  console.log("✓ spec sync complete");
}

main();
