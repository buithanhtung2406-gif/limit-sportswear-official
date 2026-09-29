import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("capital and debt change cash without changing revenue or expense", () => {
  const transactions = [
    { type: "Thu", amount: 5_000_000 },
    { type: "Chi", amount: 1_200_000 },
    { type: "Vốn vào", amount: 10_000_000 },
    { type: "Rút vốn", amount: 2_000_000 },
    { type: "Vay", amount: 3_000_000 },
    { type: "Trả nợ", amount: 500_000 },
  ];
  const total = (type) => transactions.filter((row) => row.type === type).reduce((sum, row) => sum + row.amount, 0);

  const revenue = total("Thu");
  const expense = total("Chi");
  const capitalNet = total("Vốn vào") - total("Rút vốn");
  const debtNet = total("Vay") - total("Trả nợ");
  const cashNet = revenue - expense + capitalNet + debtNet;

  assert.equal(revenue, 5_000_000);
  assert.equal(expense, 1_200_000);
  assert.equal(capitalNet, 8_000_000);
  assert.equal(debtNet, 2_500_000);
  assert.equal(cashNet, 14_300_000);
});

test("the accounting UI offers practical expense groups and separate flow types", async () => {
  const model = await readFile(new URL("../lib/cash-flow.ts", import.meta.url), "utf8");
  const accounting = await readFile(new URL("../app/ke-toan/page.tsx", import.meta.url), "utf8");
  const route = await readFile(new URL("../app/api/store/route.ts", import.meta.url), "utf8");

  for (const label of ["Thu", "Chi", "Vốn vào", "Rút vốn", "Vay", "Trả nợ"])
    assert.match(model, new RegExp(`"${label}"`));
  for (const category of ["Nguyên vật liệu", "Gia công / sản xuất", "Marketing / quảng cáo", "Lương / cộng tác viên", "Mặt bằng", "Chi phí khác"])
    assert.match(model, new RegExp(category.replace("/", "\\/")));
  assert.match(accounting, /Vốn và khoản vay không được tính vào doanh thu hoặc chi phí/);
  assert.match(accounting, /Dòng tiền ròng/);
  assert.match(route, /isCashFlowType\(type\)/);
});
