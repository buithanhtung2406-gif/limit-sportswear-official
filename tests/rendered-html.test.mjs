import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("builds a Cloudflare Worker entry point", async () => {
  const source = await readFile(new URL("../dist/server/index.js", import.meta.url), "utf8");

  assert.match(source, /cloudflare:workers/);
  assert.match(source, /export\s*\{\s*worker_entry_default\s+as\s+default\s*\}/);
  assert.match(source, /async fetch\(request, env, ctx\)/);
});
