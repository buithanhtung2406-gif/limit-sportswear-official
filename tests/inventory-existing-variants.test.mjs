import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
const source = await readFile(new URL("../app/api/store/route.ts", import.meta.url), "utf8");
const start = source.indexOf('    if (action === "recordInventoryChange")');
const block = source.slice(start, source.indexOf('    if (action === "deleteInventoryChange")', start));
const code = ts.transpileModule(block, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
const identity = (sku, name) => `${sku}:${String(name).trim().toLowerCase()}`;
const priceKey = (sku, name) => {
  const normalizedSku = String(sku).toUpperCase();
  const normalizedName = String(name).trim().toLowerCase();
  if (normalizedSku === "S001") {
    if (normalizedName.includes("full set") || normalizedName.includes("set ba lỗ")) return "S001:full-set";
    if (normalizedName.includes("chân váy")) return "S001:chan-vay";
    if (normalizedName.includes("ba lỗ") || normalizedName.includes("áo")) return "S001:ao";
  }
  if (normalizedSku === "S002") {
    if (normalizedName.includes("full set") || normalizedName.includes("set yoga")) return "S002:full-set";
    if (normalizedName.includes("quần")) return "S002:quan";
    if (normalizedName.includes("bra")) return "S002:bra";
    if (normalizedName.includes("áo")) return "S002:ao";
  }
  return identity(normalizedSku, normalizedName);
};
async function record(state, eventType, overrides = {}) {
  const run = new Function("action", "body", "text", "amount", "displaySize", "jsonError", "mutateState", "catalogIdentityKey", "productPriceKey", "addAudit", "NextResponse", `return (async () => { ${code} })()`);
  return run("recordInventoryChange", { entry: { eventType, transactionDate: "2026-09-18", sku: "S001", itemType: "Ba lỗ", color: "Navy", size: "M", quantity: 2, ...overrides } }, value => String(value ?? "").trim(), Number, value => value, error => ({ error }), async fn => {
    const next = structuredClone(state); fn(next); Object.assign(state, next);
  }, identity, priceKey, () => {}, { json: value => value });
}
const fixture = () => ({ inventoryRows: [{ id: 1, snapshotDate: "2026-09-17", sku: "S001", itemType: "Ba lỗ", color: "Navy", sizeS: 0, sizeM: 5, sizeL: 0, freeSize: 0, oversize: 0, total: 5 }], products: [], catalogRows: [], movements: [], nextId: 2 });
test("receipt, return and defective goods adjust existing variants without adding products", async () => {
  for (const kind of ["Nhập hàng", "Hoàn hàng", "Hàng lỗi"]) {
    const state = fixture(); await record(state, kind);
    const rows = state.inventoryRows.filter(row => row.snapshotDate === "2026-09-18");
    assert.equal(rows.length, 1);
    assert.equal(rows[0].itemType, "Ba lỗ");
    assert.equal(rows[0].sizeM, kind === "Hàng lỗi" ? 3 : 7);
    assert.equal(state.inventoryRows.find(row => row.snapshotDate === "2026-09-17").sizeM, 5);
  }
});
test("unknown type or color rejects atomically instead of creating a product or snapshot", async () => {
  for (const kind of ["Nhập hàng", "Hoàn hàng", "Hàng lỗi"]) {
    for (const overrides of [{ itemType: "New product" }, { color: "New color" }, { sku: "NEW" }]) {
      const state = fixture(), before = structuredClone(state);
      await assert.rejects(record(state, kind, overrides));
      assert.deepEqual(state, before);
    }
  }
});
test("returning a full S001 or S002 set restores both stock components but not bra", async () => {
  for (const [sku, components] of [
    ["S001", ["Áo", "Chân váy"]],
    ["S002", ["Áo", "Quần", "Bra"]],
  ]) {
    const state = {
      inventoryRows: components.map((itemType, index) => ({
        id: index + 1,
        snapshotDate: "2026-09-17",
        sku,
        itemType,
        color: "Navy",
        sizeS: 0,
        sizeM: 5,
        sizeL: 0,
        freeSize: 0,
        oversize: 0,
        total: 5,
      })),
      products: [], catalogRows: [], movements: [], nextId: 10,
    };
    await record(state, "Hoàn hàng", { sku, itemType: "Full set", quantity: 1 });
    const rows = state.inventoryRows.filter(row => row.snapshotDate === "2026-09-18");
    assert.equal(rows.find(row => row.itemType === "Áo").sizeM, 6);
    assert.equal(rows.find(row => row.itemType === (sku === "S001" ? "Chân váy" : "Quần")).sizeM, 6);
    if (sku === "S002") assert.equal(rows.find(row => row.itemType === "Bra").sizeM, 5);
    assert.equal(state.movements[0].productName, "Full set");
  }
});
