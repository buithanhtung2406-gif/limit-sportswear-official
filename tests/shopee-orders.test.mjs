import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
const route = await readFile(new URL("../app/api/store/route.ts", import.meta.url), "utf8");
const statusCode = route.slice(route.indexOf("function returnedShopeeStatus("), route.indexOf("function normalizeState("));
const rowCode = statusCode + route.slice(route.indexOf("function shopeeRow("), route.indexOf("function spxReceivable("));
const importCode = route.slice(route.indexOf('    if (action === "importMonthlyWorkbookRows")'), route.indexOf('    if (action === "importProducts")'));
const deleteCode = route.slice(route.indexOf('    if (action === "deleteShopeeOrder") {', route.indexOf("export async function POST")), route.indexOf('    if (action === "saveWorkbookRow") {', route.indexOf("export async function POST")));
const inventoryCode = route.slice(
  route.indexOf("function catalogIdentityKey"),
  route.indexOf("function adjustInventoryForShopeeRow"),
);
async function run(state, body) {
  const code = ts.transpileModule(`${rowCode}\n${importCode}\n${deleteCode}`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const fn = new Function("action", "body", "text", "amount", "monthFrom", "mutateState", "addAudit", "adjustInventoryForShopeeRow", "NextResponse", "jsonError", `return (async () => { ${code} })()`);
  return fn(body.action || "importMonthlyWorkbookRows", { sheet: "shopee", editingMonth: "2026-09", ...body }, (v) => String(v || "").trim(), (v) => Number(v) || 0, (v) => String(v || "").slice(0, 7), async (change) => { const draft = structuredClone(state); change(draft); Object.assign(state, draft); }, () => {}, (_state, row, direction) => { row.stockDeducted = direction < 0; row.stockIssue = ""; return true; }, { json: (v) => v }, (error) => ({ error }));
}
const fixture = () => ({ nextId: 100, shopeeRows: [
  { id: 1, trackingCode: "TRACK-A", orderDate: "2026-09-02", productName: "Old", quantity: 1 },
  { id: 2, orderCode: "KEEP", orderDate: "2026-09-03", productName: "Keep", quantity: 1 },
  { id: 3, orderCode: "AUG", orderDate: "2026-08-03", productName: "August", quantity: 1 },
] });
test("Shopee Excel updates matching legacy orders, retains other orders and remains idempotent", async () => {
  const state = fixture();
  const rows = [
    { orderCode: "ORDER-A", trackingCode: "TRACK-A", orderDate: "2026-09-02", productName: "Áo", quantity: 1 },
    { orderCode: "ORDER-A", trackingCode: "TRACK-A", productName: "Váy", quantity: 2 },
    { orderCode: "ORDER-B", orderDate: "2026-09-04", productName: "Yoga", quantity: 1 },
  ];
  await run(state, { rows }); await run(state, { rows });
  assert.equal(state.shopeeRows.length, 5);
  assert.equal(state.shopeeRows.filter((r) => r.orderCode === "ORDER-A").length, 2);
  assert.equal(state.shopeeRows.find((r) => r.productName === "Váy").orderDate, "2026-09-02");
  assert.ok(state.shopeeRows.some((r) => r.orderCode === "KEEP"));
  assert.ok(state.shopeeRows.some((r) => r.orderCode === "AUG"));
});
test("missing import identifiers reject without removing existing data", async () => {
  const state = fixture(); const before = structuredClone(state);
  await assert.rejects(run(state, { rows: [{ orderDate: "2026-09-02", productName: "Unknown" }] }));
  assert.deepEqual(state, before);
});
test("Shopee net order value adds back platform-funded discounts before seller costs", async () => {
  const state = fixture();
  await run(state, { rows: [{
    orderCode: "NET-1",
    orderDate: "2026-09-20",
    productName: "Set",
    quantity: 1,
    buyerProductPayment: 1_000_000,
    orderValue: 840_000,
    totalSellerDiscount: 100_000,
    shopeeDiscount: 50_000,
    shopeeVoucher: 30_000,
    shopeeCoins: 10_000,
    cardDiscount: 20_000,
    expectedShippingFee: 30_000,
    buyerShippingFee: 10_000,
    shopeeShippingSubsidy: 5_000,
    fixedFee: 20_000,
    serviceFee: 10_000,
    transactionFee: 5_000,
  }] });
  assert.equal(
    state.shopeeRows.find((row) => row.orderCode === "NET-1").netOrderValue,
    900_000,
  );
});
test("Shopee sample order matches seller revenue and expected net received", async () => {
  const state = fixture();
  await run(state, { rows: [{
    orderCode: "260919F4GS2GBE",
    orderDate: "2026-09-19",
    productName: "Set",
    orderStatus: "Hoàn thành",
    quantity: 1,
    buyerProductPayment: 550_000,
    orderValue: 436_121,
    shopeeVoucher: 113_879,
    expectedShippingFee: 16_500,
    fixedFee: 90_750,
    serviceFee: 3_000,
    transactionFee: 33_000,
  }] });
  assert.equal(
    state.shopeeRows.find((row) => row.orderCode === "260919F4GS2GBE").netOrderValue,
    406_750,
  );
});
test("canceled Shopee orders have zero value", async () => {
  const state = fixture();
  await run(state, { rows: [{
    orderCode: "CANCELED",
    orderDate: "2026-09-19",
    productName: "Set",
    orderStatus: "Đã hủy",
    quantity: 1,
    orderValue: 550_000,
  }] });
  assert.equal(
    state.shopeeRows.find((row) => row.orderCode === "CANCELED").netOrderValue,
    0,
  );
});
test("received Shopee orders still count even when the status mentions a possible return request", async () => {
  const state = fixture();
  await run(state, { rows: [{
    orderCode: "RECEIVED",
    orderDate: "2026-09-20",
    productName: "Set",
    orderStatus: "Đã nhận được hàng, tuy nhiên Người mua vẫn có thể gửi yêu cầu Trả hàng/Hoàn tiền",
    quantity: 1,
    orderValue: 550_000,
    fixedFee: 90_000,
  }] });
  assert.equal(
    state.shopeeRows.find((row) => row.orderCode === "RECEIVED").netOrderValue,
    460_000,
  );
});
test("inventory lookup uses SKU, color and size without matching the Shopee product name", () => {
  const code = ts.transpileModule(inventoryCode, {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const adjustInventoryForOrder = new Function(
    "text",
    `${code}; return adjustInventoryForOrder;`,
  )((value) => String(value || "").trim());
  const state = {
    inventoryRows: [{
      id: 1,
      snapshotDate: "2026-09-20",
      sku: "D002",
      itemType: "Tên trong kho hoàn toàn khác",
      color: "Trắng",
      sizeS: 4,
      sizeM: 9,
      sizeL: 0,
      freeSize: 0,
      oversize: 0,
      total: 13,
    }],
    catalogRows: [],
  };
  adjustInventoryForOrder(state, {
    date: "2026-09-10",
    sku: "D002",
    productName: "Tên sản phẩm Shopee không giống tên kho",
    color: "Trắng",
    size: "S",
    quantityChange: -1,
  });
  assert.equal(state.inventoryRows[0].sizeS, 3);
  assert.equal(state.inventoryRows[0].total, 12);
});
test("delete Shopee order removes all its products and no other order", async () => {
  const state = fixture();
  state.shopeeRows.push({ ...state.shopeeRows[0], id: 4, productName: "Other item" });
  await run(state, { action: "deleteShopeeOrder", rowId: 1 });
  assert.deepEqual(state.shopeeRows.map((r) => r.id), [2, 3]);
});
test("Shopee uses an order table and modal editor with Excel import", async () => {
  const page = await readFile(new URL("../app/ke-toan/page.tsx", import.meta.url), "utf8");
  assert.match(page, /<ShopeeOrderChannel rows=\{data.shopeeRows\}/);
  assert.match(page, /Nhập Excel Shopee/);
  assert.match(page, /function ShopeeRowDialog/);
  assert.match(page, /Array\.isArray\(item\?\.data\)/);
  assert.match(page, /worksheet\.data\.map/);
  assert.match(page, /Doanh thu Shop − phí vận chuyển − phí sàn/);
  assert.match(page, /so tien duoc giam khi thanh toan bang the ghi no/);
});
