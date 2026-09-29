import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const products = sqliteTable("products", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sku: text("sku").notNull(),
  name: text("name").notNull(),
  color: text("color").notNull().default(""),
  size: text("size").notNull().default(""),
  salePrice: integer("sale_price").notNull(),
  stock: integer("stock").notNull().default(0),
  lowStockThreshold: integer("low_stock_threshold").notNull().default(5),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("idx_products_sku").on(table.sku)]);

export const orders = sqliteTable("orders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  code: text("code").notNull(),
  customerName: text("customer_name").notNull(),
  salesChannel: text("sales_channel").notNull(),
  deliveryStatus: text("delivery_status").notNull().default("Chờ lấy hàng"),
  paymentStatus: text("payment_status").notNull().default("Chờ COD"),
  orderDate: text("order_date").notNull(),
  totalAmount: integer("total_amount").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("idx_orders_code").on(table.code),
  index("idx_orders_order_date").on(table.orderDate),
]);

export const orderItems = sqliteTable("order_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orderId: integer("order_id").notNull().references(() => orders.id),
  productId: integer("product_id").notNull().references(() => products.id),
  quantity: integer("quantity").notNull(),
  unitPrice: integer("unit_price").notNull(),
}, (table) => [index("idx_order_items_order_id").on(table.orderId)]);

export const inventoryMovements = sqliteTable("inventory_movements", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  productId: integer("product_id").notNull().references(() => products.id),
  orderId: integer("order_id").references(() => orders.id),
  quantityChange: integer("quantity_change").notNull(),
  reason: text("reason").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("idx_inventory_product_id").on(table.productId)]);

export const cashTransactions = sqliteTable("cash_transactions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  type: text("type").notNull(),
  category: text("category").notNull(),
  amount: integer("amount").notNull(),
  partner: text("partner").notNull().default(""),
  reference: text("reference").notNull().default(""),
  note: text("note").notNull().default(""),
  transactionDate: text("transaction_date").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("idx_cash_transaction_date").on(table.transactionDate)]);

export const reconciliationCases = sqliteTable("reconciliation_cases", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orderId: integer("order_id").notNull().references(() => orders.id),
  status: text("status").notNull().default("Chưa xử lý"),
  discrepancyType: text("discrepancy_type").notNull().default("Chờ tiền về"),
  expectedAmount: integer("expected_amount").notNull().default(0),
  actualAmount: integer("actual_amount").notNull().default(0),
  note: text("note").notNull().default(""),
  resolvedAt: text("resolved_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("idx_reconciliation_order_id").on(table.orderId)]);

export const returns = sqliteTable("returns", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orderId: integer("order_id").notNull().references(() => orders.id),
  productId: integer("product_id").notNull().references(() => products.id),
  quantity: integer("quantity").notNull(),
  refundAmount: integer("refund_amount").notNull().default(0),
  reason: text("reason").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("idx_returns_order_id").on(table.orderId)]);

export const auditLogs = sqliteTable("audit_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  entityType: text("entity_type").notNull(),
  entityId: integer("entity_id").notNull(),
  action: text("action").notNull(),
  details: text("details").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("idx_audit_entity").on(table.entityType, table.entityId)]);

// The production app keeps its operational snapshot in one versioned row.
// Versioned compare-and-swap updates prevent two browser sessions from
// silently overwriting one another while preserving the existing data model.
export const appState = sqliteTable("app_state", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  version: integer("version").notNull().default(1),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const adminCredentials = sqliteTable("admin_credentials", {
  key: text("key").primaryKey(),
  passwordHash: text("password_hash").notNull(),
  salt: text("salt").notNull(),
  sessionVersion: integer("session_version").notNull().default(1),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
