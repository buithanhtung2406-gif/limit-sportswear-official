import { readFile } from "node:fs/promises";
import postgres from "postgres";

const backupPath = process.argv[2];
const dryRun = process.argv.includes("--dry-run");
const databaseUrl = process.env.DATABASE_URL || process.env.NETLIFY_DB_URL;

if (!backupPath) {
  throw new Error(
    "Usage: node scripts/migrate-netlify-db.mjs /path/to/limit-sportswear-backup.json [--dry-run]",
  );
}

const backup = JSON.parse(await readFile(backupPath, "utf8"));
if (
  backup.format !== "limit-sportswear-backup-v1" ||
  !backup.data ||
  !Array.isArray(backup.data.products) ||
  !Array.isArray(backup.data.orders) ||
  !backup.data.settings
) {
  throw new Error("Tệp sao lưu không đúng định dạng LIMIT SPORTSWEAR.");
}

const serializedState = JSON.stringify(backup.data);
if (Buffer.byteLength(serializedState, "utf8") > 8 * 1024 * 1024) {
  throw new Error("Tệp dữ liệu vượt quá giới hạn 8 MB của bước nhập an toàn.");
}

const totals = {
  products: backup.data.products.length,
  orders: backup.data.orders.length,
  cash: Array.isArray(backup.data.cash) ? backup.data.cash.length : 0,
  inventoryRows: Array.isArray(backup.data.inventoryRows)
    ? backup.data.inventoryRows.length
    : 0,
};
if (dryRun) {
  console.log(
    `Bản sao hợp lệ (${Buffer.byteLength(serializedState, "utf8")} bytes): ${JSON.stringify(totals)}`,
  );
  process.exit(0);
}
if (!databaseUrl) {
  throw new Error("Hãy cấu hình DATABASE_URL hoặc NETLIFY_DB_URL trước.");
}

const sql = postgres(databaseUrl, { max: 1, prepare: false });
try {
  const [schemaStatus] = await sql`
    SELECT
      to_regclass('public.app_state') AS app_state,
      to_regclass('public.admin_credentials') AS admin_credentials
  `;
  if (!schemaStatus?.app_state || !schemaStatus?.admin_credentials) {
    throw new Error(
      "Database chưa có schema LIMIT SPORTSWEAR. Hãy deploy migration Netlify trước khi nhập dữ liệu.",
    );
  }

  await sql.begin(async (transaction) => {
    const existingState = await transaction`
      SELECT key FROM app_state FOR UPDATE
    `;
    const existingCredentials = await transaction`
      SELECT key FROM admin_credentials FOR UPDATE
    `;
    if (existingState.length || existingCredentials.length) {
      throw new Error(
        "Database đã có dữ liệu ứng dụng; dừng nhập để tránh ghi đè. Hãy dùng một database rỗng cho lần chuyển đầu tiên.",
      );
    }
    await transaction`
      INSERT INTO app_state (key, value, version, updated_at)
      VALUES ('limit-sportswear-data', ${serializedState}, 1, now())
    `;
  });
  console.log(`Đã nhập bản sao LIMIT SPORTSWEAR: ${JSON.stringify(totals)}`);
} finally {
  await sql.end({ timeout: 5 });
}
