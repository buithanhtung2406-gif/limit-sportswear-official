import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(new URL("../app/api/store/route.ts", import.meta.url), "utf8");
test("dedicated size exchange page uses existing action and persistent monthly audit", async () => {
  const page = await readFile(new URL("../app/ke-toan/page.tsx", import.meta.url), "utf8");
  assert.match(page, /label="Đổi size"/);
  assert.match(page, /<SizeExchangeView data=\{data\}/);
  assert.match(page, /entry.action === "Đổi size" && entry.createdAt.startsWith\(selectedMonth\)/);
  assert.match(page, /<ExchangeSizeDialog key=\{selected.id\}[^>]*inline/);
});
const block = source.slice(source.indexOf('    if (action === "exchangeOrderSize")'), source.indexOf('    if (action === "updateOrder")'));
const code = ts.transpileModule(block, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
async function exchange(state, overrides = {}) {
  const run = new Function("action", "body", "mutateState", "displaySize", "text", "inventorySizeKey", "nowIso", "adjustInventoryForOrder", "addAudit", "NextResponse", `return (async () => { ${code} })()`);
  await run("exchangeOrderSize", { orderId: 1, itemIndex: 0, oldSize: "M", newSize: "L", quantity: 1, ...overrides }, async (fn) => {
    const draft = structuredClone(state);
    fn(draft);
    Object.assign(state, draft);
  }, (s) => s, (s) => String(s || ""), (s) => ["S", "M", "L"].includes(s) ? s : undefined,
  () => "2026-09-16T12:00:00Z", (s, input) => {
    if (s.stock[input.size] + input.quantityChange < 0) throw Error("Không đủ hàng");
    s.stock[input.size] += input.quantityChange;
  }, () => {}, { json: () => ({ ok: true }) });
}
const fixture = () => ({ orders: [{ id: 1, code: "TEST", returned: 0, totalAmount: 550000, subtotal: 580000, discountAmount: 30000, items: [{ sku: "S001", productName: "Áo", color: "Navy", size: "M", quantity: 2, unitPrice: 290000, lineTotal: 580000 }] }], stock: { M: 3, L: 2 }, inventoryRows: [{}], movements: [], nextId: 1 });
test("partial size exchange updates stock and items without changing revenue", async () => {
  const state = fixture();
  await exchange(state);
  assert.deepEqual(state.stock, { M: 4, L: 1 });
  assert.deepEqual(state.orders[0].items.map((i) => [i.size, i.quantity, i.lineTotal]), [["M", 1, 290000], ["L", 1, 290000]]);
  assert.equal(state.orders[0].totalAmount, 550000);
  assert.equal(state.movements.length, 2);
});
test("insufficient stock and stale order reject without partial writes", async () => {
  for (const overrides of [{ quantity: 3 }, { oldSize: "S" }, { newSize: "M" }, {}]) {
    const state = fixture(); state.stock.L = 0;
    const before = structuredClone(state);
    await assert.rejects(exchange(state, overrides));
    assert.deepEqual(state, before);
  }
});
test("full quantity exchange replaces size without splitting the line", async () => {
  const state = fixture(); await exchange(state, { quantity: 2 });
  assert.equal(state.orders[0].items.length, 1);
  assert.equal(state.orders[0].items[0].size, "L");
  assert.deepEqual(state.stock, { M: 5, L: 0 });
});
