import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("keeps PBKDF2 within the Cloudflare Workers runtime limit", async () => {
  const source = await readFile(new URL("../lib/admin-auth.ts", import.meta.url), "utf8");

  assert.match(source, /const PBKDF2_ITERATIONS = 100_000/);
  assert.doesNotMatch(source, /iterations:\s*210_000/);
});
