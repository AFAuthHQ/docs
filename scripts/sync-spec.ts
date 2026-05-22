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

function rewriteLinks(md: string): string {
  // proposals/* → external GitHub link (we don't render proposals as docs pages)
  md = md.replace(
    /\]\((proposals\/[^)]+)\)/g,
    `](${SPEC_BLOB}/$1)`,
  );
  // spec/foo.md → /spec/foo (internal docs link)
  md = md.replace(/\]\(spec\/([^)]+)\.md([^)]*)\)/g, "](/spec/$1$2)");
  // vectors/* → external GitHub link
  md = md.replace(/\]\((vectors\/[^)]+)\)/g, `](${SPEC_BLOB}/$1)`);
  // schemas/* → external GitHub link
  md = md.replace(/\]\((schemas\/[^)]+)\)/g, `](${SPEC_BLOB}/$1)`);
  // implementation/* → external GitHub link
  md = md.replace(/\]\((implementation\/[^)]+)\)/g, `](${SPEC_BLOB}/$1)`);
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
