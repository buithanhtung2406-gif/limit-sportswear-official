import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("keeps the public dashboard response separate after an accounting login", async () => {
  const route = await readFile(
    new URL("../app/api/store/route.ts", import.meta.url),
    "utf8",
  );
  const dashboard = await readFile(
    new URL("../app/page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(route, /if \(!dashboardView && \(await isAdminSession\(\)\)\)/);
  assert.match(dashboard, /view=dashboard&month=/);
  assert.match(dashboard, /Array\.isArray\(next\.days\)/);
  assert.match(dashboard, /Array\.isArray\(next\.channelSummary\)/);
  assert.match(dashboard, /Array\.isArray\(next\.citySummary\)/);
  assert.match(dashboard, /function CityDashboardChart/);
  assert.match(dashboard, /<AreaChart/);
  assert.match(dashboard, /Số lượng đơn theo tỉnh\/thành/);
  assert.match(route, /const citySummary =/);
});

test("lets accounting configure the public dashboard period and chart styles", async () => {
  const accounting = await readFile(
    new URL("../app/ke-toan/page.tsx", import.meta.url),
    "utf8",
  );
  const dashboard = await readFile(
    new URL("../app/page.tsx", import.meta.url),
    "utf8",
  );
  const route = await readFile(
    new URL("../app/api/store/route.ts", import.meta.url),
    "utf8",
  );

  assert.match(accounting, /Cấu hình Dashboard công khai/);
  assert.match(accounting, /saveDashboardSettings/);
  assert.match(accounting, /Theo tháng/);
  assert.match(accounting, /Theo tuần/);
  assert.match(accounting, /Biểu đồ cột/);
  assert.match(accounting, /Biểu đồ đường/);
  assert.match(accounting, /Biểu đồ miền/);
  assert.match(accounting, /Biểu đồ tròn/);
  assert.match(route, /action === "saveDashboardSettings"/);
  assert.match(route, /dashboardSettings: data\.settings\.dashboard/);
  assert.match(route, /period: \{ mode: periodMode, start: periodStart, end: periodEnd \}/);
  assert.match(dashboard, /period=\$\{periodMode\}/);
  assert.match(dashboard, /function ChannelSummaryView/);
  assert.match(dashboard, /function StockSummaryView/);
});

test("groups detailed addresses into provinces and centrally governed cities", async () => {
  const { vietnamProvinceFromAddress } = await import(
    new URL("../lib/vietnam-province.ts", import.meta.url)
  );

  assert.equal(vietnamProvinceFromAddress("123 Nguyễn Thị Thập, Quận 7"), "TP. Hồ Chí Minh");
  assert.equal(vietnamProvinceFromAddress("Quận 7, Thành phố Hồ Chí Minh"), "TP. Hồ Chí Minh");
  assert.equal(vietnamProvinceFromAddress("Dĩ An, Bình Dương, Việt Nam"), "Bình Dương");
  assert.equal(vietnamProvinceFromAddress("Cầu Giấy"), "Hà Nội");
  assert.equal(vietnamProvinceFromAddress("12 đường không xác định"), "");
});

test("uses an HTTP session cookie on localhost and HTTPS in production", async () => {
  const login = await readFile(new URL("../app/api/login/route.ts", import.meta.url), "utf8");
  const password = await readFile(new URL("../app/api/change-password/route.ts", import.meta.url), "utf8");
  assert.match(login, /secure: new URL\(request\.url\)\.protocol === "https:"/);
  assert.match(password, /secure: new URL\(request\.url\)\.protocol === "https:"/);
});

test("keeps browser assets stable across deployments and recovers stale module loads", async () => {
  const vite = await readFile(
    new URL("../vite.config.ts", import.meta.url),
    "utf8",
  );
  const layout = await readFile(
    new URL("../app/layout.tsx", import.meta.url),
    "utf8",
  );

  assert.match(vite, /entryFileNames: "assets\/\[name\]\.js"/);
  assert.match(vite, /chunkFileNames: "assets\/\[name\]\.js"/);
  assert.match(layout, /dynamically imported module/);
  assert.match(layout, /limit-asset-recovery/);
});

test("uses the Excel-style order book and separates shipping and daily inventory", async () => {
  const accounting = await readFile(
    new URL("../app/ke-toan/page.tsx", import.meta.url),
    "utf8",
  );
  const storeRoute = await readFile(
    new URL("../app/api/store/route.ts", import.meta.url),
    "utf8",
  );

  assert.match(accounting, /label="Đơn hàng"/);
  assert.match(accounting, /label="Vận chuyển"/);
  assert.doesNotMatch(accounting, /label="Đối soát"/);
  assert.match(accounting, /orderChannels/);
  assert.match(accounting, /shippingProviders/);
  assert.match(accounting, /TabsTrigger value="catalog"[\s\S]*?Mã sản phẩm/);
  assert.match(accounting, /Kiểm kho hằng ngày/);
  assert.match(accounting, /Lịch sử kho/);
  assert.doesNotMatch(
    accounting,
    /TabsTrigger value="daily">Báo cáo từng ngày/,
  );
  assert.match(accounting, /startInventoryCheck/);
  assert.match(accounting, /Free size/);
  assert.match(accounting, /Oversize/);
  assert.match(accounting, /Hết hàng/);
  assert.match(accounting, /Nhập Excel Shopee/);
  assert.match(accounting, /Nhập file SPX/);
  assert.match(accounting, /Giao hàng nhanh/);
  assert.match(accounting, /Viettel Post/);
  assert.match(accounting, /Ghi chú cách vận chuyển/);
  assert.match(accounting, /label: "Giá trị hàng \(chưa gồm giao hàng\)"/);
  assert.match(accounting, /label: "Tổng khách thanh toán"/);
  assert.match(accounting, /spxReceivable/);
  assert.match(storeRoute, /row\.total = spxReceivable\(row\)/);
  assert.match(accounting, /row\.createDate\.startsWith\(selectedMonth\)/);
  assert.match(accounting, /!row\.createDate/);
  assert.match(accounting, /importMonthlyWorkbookRows/);
  assert.match(accounting, /saveWorkbookRow/);
  assert.match(accounting, /deleteWorkbookRow/);
  assert.match(accounting, /Xuất CSV/);
});

test("keeps customizable order sources synchronized with the dashboard", async () => {
  const accounting = await readFile(
    new URL("../app/ke-toan/page.tsx", import.meta.url),
    "utf8",
  );
  const storeRoute = await readFile(
    new URL("../app/api/store/route.ts", import.meta.url),
    "utf8",
  );
  const dashboard = await readFile(
    new URL("../app/page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(accounting, /Quản lý nguồn đơn/);
  assert.match(accounting, /Thêm nguồn đơn/);
  assert.match(accounting, /Nguồn đơn/);
  assert.match(storeRoute, /action === "saveNamedOption"/);
  assert.match(storeRoute, /day\.channels\[shopeeChannelName\]/);
  assert.match(storeRoute, /manualChannelNames/);
  assert.match(dashboard, /Nguồn đơn hàng/);
  assert.match(dashboard, /selected\.channels/);
});

test("shows sold product codes, sizes, and quantities for each dashboard day", async () => {
  const route = await readFile(
    new URL("../app/api/store/route.ts", import.meta.url),
    "utf8",
  );
  const dashboard = await readFile(
    new URL("../app/page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(route, /type SoldItem/);
  assert.match(route, /addSoldItem/);
  assert.match(route, /items: SoldItem\[\]/);
  assert.match(dashboard, /Mã hàng đã bán/);
  assert.match(dashboard, /item\.size/);
  assert.match(dashboard, /item\.quantity/);
  assert.match(dashboard, /calendarRevenueTone/);
  assert.match(dashboard, /GroupedPublicInventory/);
  assert.match(dashboard, /SET yoga \(Áo · Quần · Bra\)/);
  assert.match(dashboard, /item\.name/);
  assert.doesNotMatch(dashboard, /Cập nhật kho theo ngày/);
  assert.match(dashboard, /Kho hàng — gộp theo mã hàng/);
  assert.match(route, /inventorySnapshots/);
  assert.match(route, /inventorySnapshotDate/);
});

test("uses grouped soft inventory, clickable order details and a three-step order form", async () => {
  const accounting = await readFile(
    new URL("../app/ke-toan/page.tsx", import.meta.url),
    "utf8",
  );
  const dashboard = await readFile(
    new URL("../app/page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(dashboard, /GroupedPublicInventory/);
  assert.match(dashboard, /bấm vào một mã để xem từng màu và size/);
  assert.match(dashboard, /compactMoney/);
  assert.match(accounting, /ManualOrderDetailDialog/);
  assert.match(accounting, /ShopeeOrderDetailDialog/);
  assert.match(accounting, /pageSize = 8/);
  assert.match(accounting, /Bước \{step\}\/3/);
  assert.match(accounting, /order-product-options/);
  assert.match(accounting, /accountingInventoryGroupName/);
  assert.match(accounting, /Gõ mã hàng hoặc tên sản phẩm/);
});

test("filters accounting by month and protects past-period edits with a passcode", async () => {
  const accounting = await readFile(
    new URL("../app/ke-toan/page.tsx", import.meta.url),
    "utf8",
  );
  const storeRoute = await readFile(
    new URL("../app/api/store/route.ts", import.meta.url),
    "utf8",
  );
  const unlockRoute = await readFile(
    new URL("../app/api/unlock-period/route.ts", import.meta.url),
    "utf8",
  );
  const auth = await readFile(
    new URL("../lib/admin-auth.ts", import.meta.url),
    "utf8",
  );

  assert.match(accounting, /type="month"/);
  assert.match(accounting, /filterDataByMonth/);
  assert.match(accounting, /Nhập passcode một lần/);
  assert.match(storeRoute, /PAST_MONTH_LOCKED/);
  assert.match(storeRoute, /isPastMonthUnlocked/);
  assert.match(unlockRoute, /verifyAdminPassword/);
  assert.match(auth, /HMAC/);
});

test("records stock receipts and returns into daily inventory snapshots", async () => {
  const accounting = await readFile(
    new URL("../app/ke-toan/page.tsx", import.meta.url),
    "utf8",
  );
  const storeRoute = await readFile(
    new URL("../app/api/store/route.ts", import.meta.url),
    "utf8",
  );

  assert.match(accounting, /label="Hoàn hàng"/);
  assert.match(accounting, /label="Nhập hàng"/);
  assert.match(accounting, /label="Hàng lỗi"/);
  assert.match(accounting, /name="itemType"/);
  assert.match(accounting, /sourceRows.map\(stockType\)/);
  assert.match(accounting, /Chọn màu trong kho/);
  assert.match(accounting, /recordInventoryChange/);
  assert.match(accounting, /deleteInventoryChange/);
  assert.match(accounting, /đã cập nhật vào kho và Dashboard/);
  assert.match(storeRoute, /action === "recordInventoryChange"/);
  assert.match(storeRoute, /action === "deleteInventoryChange"/);
  assert.match(storeRoute, /eventType === "Hàng lỗi" \? -quantity : quantity/);
  assert.match(storeRoute, /snapshotDate: transactionDate/);
  assert.match(storeRoute, /inventory\.total \+= quantityChange/);
});

test("captures complete manual orders and keeps inventory totals authoritative", async () => {
  const accounting = await readFile(
    new URL("../app/ke-toan/page.tsx", import.meta.url),
    "utf8",
  );
  const storeRoute = await readFile(
    new URL("../app/api/store/route.ts", import.meta.url),
    "utf8",
  );

  assert.match(accounting, /label="Số điện thoại"/);
  assert.match(accounting, /label="Địa chỉ giao hàng"/);
  assert.match(accounting, /label="Màu"/);
  assert.match(accounting, /label="Size"/);
  assert.match(accounting, /name="orderDate"[\s\S]{0,80}?type="date"/);
  assert.match(accounting, /label="Đơn vị vận chuyển"/);
  assert.match(accounting, /name="shippingProvider"/);
  assert.match(accounting, /name="trackingCode"/);
  assert.match(storeRoute, /adjustInventoryForOrder/);
  assert.match(storeRoute, /state\.spxRows\.unshift\([\s\S]{0,80}?spxRow/);
  assert.match(storeRoute, /row\.sourceOrderCode/);
  assert.match(
    accounting,
    /action: order \? "updateManualOrder" : "createOrder"/,
  );
  assert.match(accounting, /action: "deleteManualOrder"/);
  assert.match(storeRoute, /action === "updateManualOrder"/);
  assert.match(storeRoute, /action === "deleteManualOrder"/);
  assert.match(storeRoute, /skippedLegacyQuantity/);
  assert.match(storeRoute, /sản phẩm cũ thiếu màu\/size/);
  assert.match(storeRoute, /const snapshotDate = state\.inventoryRows\.reduce/);
  assert.match(
    storeRoute,
    /inventory\.total\s*=\s*inventory\.sizeS\s*\+\s*inventory\.sizeM\s*\+\s*inventory\.sizeL\s*\+\s*inventory\.freeSize\s*\+\s*inventory\.oversize/,
  );
  assert.match(storeRoute, /row\.itemType = "Ba lỗ"/);
  assert.match(storeRoute, /row\.itemType = "Chân váy"/);
  assert.match(accounting, /Thêm sản phẩm vào đơn/);
  assert.match(accounting, /Sản phẩm trong đơn/);
  assert.match(accounting, /items,/);
  assert.match(storeRoute, /validatedOrderItems/);
  assert.match(storeRoute, /setManualOrderStock\(state, order, deliveryUsesStock\(deliveryStatus\)\)/);
  assert.match(storeRoute, /for \(const item of order\.items\)/);
  assert.doesNotMatch(storeRoute, /addAudit\(state, "Sổ Excel"/);
  assert.match(accounting, /const threshold = 500_000_000/);
  assert.match(accounting, /Checklist trước khi kê khai/);
});

test("manual order revenue, stock timing and status warnings follow Facebook workflow", async () => {
  const accounting = await readFile(
    new URL("../app/ke-toan/page.tsx", import.meta.url),
    "utf8",
  );
  const storeRoute = await readFile(
    new URL("../app/api/store/route.ts", import.meta.url),
    "utf8",
  );

  assert.match(storeRoute, /status === "Đã thanh toán" \|\| status === "Đã nhận"/);
  assert.match(storeRoute, /status === "Đang giao" \|\| status === "Đã giao"/);
  assert.match(storeRoute, /setManualOrderStock/);
  assert.match(storeRoute, /deliveryUsesStock\(deliveryStatus\)/);
  assert.match(accounting, /bg-amber-100 text-amber-900/);
  assert.match(accounting, /bg-violet-100 text-violet-800/);
  assert.match(accounting, /<option>Đã thanh toán<\/option>/);
  assert.match(accounting, /Chọn đơn đã lên \(không bắt buộc\)/);
  assert.match(accounting, /Tự nhập hoặc chọn đơn hàng \/ Shopee/);
  assert.match(accounting, /selectedSource \? selectedType : form\.get\("itemType"\)/);
  assert.match(accounting, /hasFullSet \? \["Full set"\]/);
  assert.match(accounting, /action: "returnOrder"/);
  assert.match(accounting, /action: "returnShopeeOrder"/);
  assert.match(accounting, /Đã hoàn · không tính doanh thu/);
  assert.match(storeRoute, /if \(action === "returnShopeeOrder"\)/);
  assert.match(storeRoute, /row\.orderStatus = "Đã hoàn"/);
  assert.match(storeRoute, /automaticIncome\.amount = 0/);
  assert.match(accounting, /action: linkedReturn[\s\S]*"deleteOrderReturn"/);
  assert.match(storeRoute, /if \(action === "deleteOrderReturn"\)/);
  assert.match(storeRoute, /khôi phục đơn và doanh thu/);
  assert.match(accounting, /Theo tháng/);
  assert.match(accounting, /Theo tuần/);
  assert.match(accounting, /dashboardPeriodLabel/);
  assert.match(accounting, /bg-red-100\/90 hover:bg-red-100/);
  assert.match(accounting, /inactive \? 0 : summary\?\.revenue/);
  assert.match(accounting, /Đơn đã hủy · không tính/);
});

test("uses catalog prices by SKU and product type and refreshes linked orders", async () => {
  const accounting = await readFile(
    new URL("../app/ke-toan/page.tsx", import.meta.url),
    "utf8",
  );
  const storeRoute = await readFile(
    new URL("../app/api/store/route.ts", import.meta.url),
    "utf8",
  );

  assert.match(accounting, /productPriceKey/);
  assert.match(storeRoute, /function catalogPrice/);
  assert.match(storeRoute, /item\.unitPrice = updatedCatalog\.price/);
  assert.match(
    storeRoute,
    /order\.subtotal\s*-\s*order\.discountAmount\s*\+\s*order\.surcharge\s*\+\s*order\.shippingFee/,
  );
  assert.match(
    storeRoute,
    /reconciliation\.expectedAmount = order\.totalAmount/,
  );
  const inventoryAdjustment = storeRoute.slice(
    storeRoute.indexOf("function adjustInventoryForOrder"),
    storeRoute.indexOf("function adjustInventoryForShopeeRow"),
  );
  assert.match(inventoryAdjustment, /requestedKey === "S001:full-set"/);
  assert.match(storeRoute, /"S001:ao", "S001:chan-vay"/);
  assert.match(inventoryAdjustment, /requestedKey === "S002:full-set"/);
  assert.match(storeRoute, /"S002:ao", "S002:quan"/);
  assert.match(inventoryAdjustment, /requestedKey/);
  assert.match(
    inventoryAdjustment,
    /productPriceKey\(input\.sku, input\.productName\)/,
  );
  assert.match(storeRoute, /return "S002:bra"/);
  assert.match(accounting, /selectedPriceKey === "S001:full-set"/);
  assert.match(accounting, /selectedPriceKey === "S002:full-set"/);
  assert.match(accounting, /!row\.itemType\.trim\(\)/);
  assert.match(accounting, /Chọn màu trong kho/);
  assert.match(accounting, /sourceRows\.map\(stockType\)/);
  assert.match(storeRoute, /candidates\.length === 1/);
  assert.match(accounting, /Giá theo mã \+ tên/);
  assert.match(storeRoute, /sameSkuRows\.length > 1/);
  assert.match(storeRoute, /Hãy chọn đúng tên sản phẩm/);
  assert.match(storeRoute, /catalogIdentityKey\(item.sku, item.productName\) !== updatedKey/);
  assert.match(accounting, /\[catalogIdentityKey\(choice.sku, choice.name\), choice\]/);
  const identitySource = storeRoute.slice(
    storeRoute.indexOf("function catalogIdentityKey("),
    storeRoute.indexOf("function productPriceKey("),
  ).replaceAll(": unknown", "");
  const identity = new Function("text", `${identitySource}; return catalogIdentityKey;`)(
    (value) => String(value ?? "").trim(),
  );
  assert.notEqual(
    identity("S001", "SET ba lỗ - chân váy"),
    identity("S001", "SET ba lỗ - chân váy (áo không mút)"),
  );
  assert.notEqual(identity("S001", "Áo"), identity("S001", "Chân váy"));
});

test("opens overview lists for monthly orders, low stock, and out of stock", async () => {
  const accounting = await readFile(
    new URL("../app/ke-toan/page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(accounting, /label=\{`Đơn trong \$\{periodLabel\.toLowerCase\(\)\}`\}/);
  assert.match(accounting, /label="Mã sắp hết"/);
  assert.match(accounting, /label="Mã hết"/);
  assert.match(accounting, /setDetail\("orders"\)/);
  assert.match(accounting, /Mã đơn/);
  assert.match(accounting, /Nguồn đơn/);
  assert.match(accounting, /lowStockRows/);
  assert.match(accounting, /outOfStockRows/);
});

test("applies percentage or fixed discounts to orders and dashboard revenue", async () => {
  const accounting = await readFile(
    new URL("../app/ke-toan/page.tsx", import.meta.url),
    "utf8",
  );
  const storeRoute = await readFile(
    new URL("../app/api/store/route.ts", import.meta.url),
    "utf8",
  );

  assert.match(accounting, /Giảm theo phần trăm/);
  assert.match(accounting, /Giảm bằng số tiền/);
  assert.match(accounting, /Tổng khách thanh toán/);
  assert.match(storeRoute, /function calculateOrderDiscount/);
  assert.match(storeRoute, /subtotal - discountAmount \+ surcharge \+ shippingFee/);
  assert.match(
    storeRoute,
    /order\.subtotal\s*-\s*order\.discountAmount\s*\+\s*order\.surcharge\s*\+\s*order\.shippingFee/,
  );
  assert.match(accounting, /Phí giao hàng khách thanh toán \(COD \/ Grab\)/);
  assert.match(accounting, /Để trống = 0 ₫/);
  assert.match(accounting, /cartTotal - discountAmount \+ surcharge \+ customerShippingFee/);
  assert.match(accounting, /shippingFee: Number\(form\.get\("shippingFee"\)\) \|\| 0/);
  assert.match(accounting, /manualOrderRevenue/);
  assert.match(accounting, /cashBookAmount/);
  assert.match(accounting, /rowAmount\(c\)/);
  assert.match(storeRoute, /manualOrderRevenue/);
  assert.match(storeRoute, /monthOrders\.reduce\(\(sum, order\) => sum \+ manualOrderRevenue\(order\), 0\)/);
  assert.match(storeRoute, /amount: totalAmount - shippingFee/);
});

test("shows only expense rows and excludes shipping from dashboard expense", async () => {
  const dashboard = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const storeRoute = await readFile(new URL("../app/api/store/route.ts", import.meta.url), "utf8");
  assert.match(dashboard, /<ExpenseColumn title="Chi phí"/);
  assert.match(dashboard, /row\.category/);
  assert.match(dashboard, /<TableHead>Ngày<\/TableHead><TableHead>Nhóm<\/TableHead><TableHead className="text-right">Số tiền chi<\/TableHead>/);
  assert.doesNotMatch(dashboard, /row\.recipient/);
  assert.doesNotMatch(dashboard, /<ExpenseColumn title="Phí vận chuyển"/);
  assert.match(storeRoute, /const cashExpenses:/);
  assert.match(storeRoute, /category: "Phí sàn"/);
  assert.match(storeRoute, /const monthExpense = platformFees \+ cashExpense/);
  assert.doesNotMatch(storeRoute, /const monthExpense =\s*platformFees \+ shopeeShipping/);
  assert.doesNotMatch(dashboard, /shippingFees/);
  assert.doesNotMatch(storeRoute, /shippingExpenses,/);
});

test("hides the injected Netlify promotional badge", async () => {
  const styles = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");
  assert.match(styles, /#nl-badge-frame/);
  assert.match(styles, /display:\s*none\s*!important/);
  assert.match(layout, /removeNetlifyBadge/);
  assert.match(layout, /MutationObserver/);
});

test("prepares an authenticated backup and a guarded Netlify PostgreSQL import", async () => {
  const storeRoute = await readFile(
    new URL("../app/api/store/route.ts", import.meta.url),
    "utf8",
  );
  const accounting = await readFile(
    new URL("../app/ke-toan/page.tsx", import.meta.url),
    "utf8",
  );
  const nextConfig = await readFile(
    new URL("../next.config.ts", import.meta.url),
    "utf8",
  );
  const postgresSchema = await readFile(
    new URL("../db/netlify-schema.ts", import.meta.url),
    "utf8",
  );
  const importScript = await readFile(
    new URL("../scripts/migrate-netlify-db.mjs", import.meta.url),
    "utf8",
  );
  const migrationGuide = await readFile(
    new URL("../NETLIFY-MIGRATION.md", import.meta.url),
    "utf8",
  );
  const netlifyDrizzleConfig = await readFile(
    new URL("../drizzle.netlify.config.ts", import.meta.url),
    "utf8",
  );
  const netlifyConfig = await readFile(
    new URL("../netlify.toml", import.meta.url),
    "utf8",
  );

  assert.match(storeRoute, /view.*migration-export/);
  assert.match(storeRoute, /Đăng nhập khu kế toán để sao lưu dữ liệu/);
  assert.match(storeRoute, /limit-sportswear-backup-v1/);
  assert.match(accounting, /Tải bản sao dữ liệu/);
  assert.match(nextConfig, /process\.env\.NETLIFY/);
  assert.match(nextConfig, /db\/netlify\.ts/);
  assert.match(postgresSchema, /pgTable\("app_state"/);
  assert.match(importScript, /FOR UPDATE/);
  assert.match(importScript, /dừng nhập để tránh ghi đè/);
  assert.match(importScript, /SELECT key FROM admin_credentials FOR UPDATE/);
  assert.match(importScript, /to_regclass\('public\.app_state'\)/);
  assert.doesNotMatch(importScript, /CREATE TABLE IF NOT EXISTS app_state/);
  assert.match(netlifyDrizzleConfig, /\.\/netlify\/database\/migrations/);
  assert.doesNotMatch(netlifyDrizzleConfig, /out:\s*["']\.\/drizzle\//);
  assert.match(netlifyConfig, /NETLIFY=1 npm run build:netlify/);
  assert.match(migrationGuide, /ADMIN_SESSION_TOKEN/);
  const dryRun = execFileSync(
    process.execPath,
    [
      "scripts/migrate-netlify-db.mjs",
      "tests/fixtures/netlify-backup-smoke.json",
      "--dry-run",
    ],
    { cwd: new URL("..", import.meta.url), encoding: "utf8" },
  );
  assert.match(dryRun, /Bản sao hợp lệ/);
});
