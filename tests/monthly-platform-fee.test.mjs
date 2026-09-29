import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
const source = await readFile(new URL("../app/api/store/route.ts", import.meta.url), "utf8");
const block = source.slice(source.indexOf('    if (action === "saveMonthlyPlatformFee")'), source.indexOf('    if (action === "saveNamedOption")'));
const code = ts.transpileModule(block, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
async function save(state, amount, month = "2026-09") {
  const run = new Function("action", "body", "text", "jsonError", "mutateState", "addAudit", "NextResponse", `return (async () => { ${code} })()`);
  return run("saveMonthlyPlatformFee", { editingMonth: month, amount }, String, error => ({ error }), async fn => fn(state), () => {}, { json: value => value });
}
test("monthly fee replaces previous value and preserves other months and orders", async () => {
  const state = { monthlyPlatformFees: { "2026-08": 100 }, orders: [{ id: 1 }] };
  await save(state, 500); await save(state, 300);
  assert.deepEqual(state, { monthlyPlatformFees: { "2026-08": 100, "2026-09": 300 }, orders: [{ id: 1 }] });
  await save(state, 0); assert.equal(state.monthlyPlatformFees["2026-09"], 0);
});
test("invalid fee and month do not mutate stored data", async () => {
  for (const [fee, month] of [[-1, "2026-09"], [1.5, "2026-09"], ["invalid", "2026-09"], [100, "2026-13"]]) {
    const state = { monthlyPlatformFees: {} };
    assert.ok((await save(state, fee, month)).error);
    assert.deepEqual(state.monthlyPlatformFees, {});
  }
});
