import { NextResponse } from "next/server";
import {
  isAdminSession,
  isPastMonth,
  isPastMonthUnlocked,
} from "@/lib/admin-auth";
import { mutateJsonState, readJsonState } from "@/lib/d1-json-store";
import { vietnamProvinceFromAddress } from "@/lib/vietnam-province";
import { isCashFlowType } from "@/lib/cash-flow";

export const dynamic = "force-dynamic";

type Product = {
  id: number;
  sku: string;
  name: string;
  color: string;
  size: string;
  salePrice: number;
  stock: number;
  lowStockThreshold: number;
};
type ProductInput = Partial<Omit<Product, "id">>;
type OrderItem = {
  productId: number;
  sku: string;
  productName: string;
  color: string;
  size: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};
type OrderItemInput = Partial<Omit<OrderItem, "unitPrice" | "lineTotal">>;
type Order = {
  id: number;
  code: string;
  customerName: string;
  phone: string;
  address: string;
  salesChannel: string;
  shippingProvider: string;
  shippingNote: string;
  trackingCode: string;
  shippingFee: number;
  deliveryStatus: string;
  paymentStatus: string;
  paymentMethod: string;
  orderDate: string;
  subtotal: number;
  discountType: string;
  discountValue: number;
  discountAmount: number;
  surcharge: number;
  totalAmount: number;
  productId: number;
  productName: string;
  color: string;
  size: string;
  quantity: number;
  items: OrderItem[];
  reconciliationStatus: string;
  returned: number;
  stockDeducted: boolean;
};
type OrderInput = {
  customerName?: string;
  phone?: string;
  address?: string;
  salesChannel?: string;
  shippingProvider?: string;
  shippingNote?: string;
  trackingCode?: string;
  shippingFee?: number;
  productId?: number;
  sku?: string;
  productName?: string;
  color?: string;
  size?: string;
  quantity?: number;
  items?: OrderItemInput[];
  deliveryStatus?: string;
  paymentStatus?: string;
  paymentMethod?: string;
  discountType?: string;
  discountValue?: number;
  surcharge?: number;
  orderDate?: string;
};

const isPaidOrder = (status: string) =>
  status === "Đã thanh toán" || status === "Đã nhận";
const deliveryUsesStock = (status: string) =>
  status === "Đang giao" || status === "Đã giao";
const manualOrderRevenue = (
  order: Pick<Order, "totalAmount" | "shippingFee" | "paymentStatus">,
) =>
  isPaidOrder(order.paymentStatus)
    ? Math.max(0, order.totalAmount - (order.shippingFee || 0))
    : 0;
type Cash = {
  id: number;
  type: string;
  category: string;
  amount: number;
  partner: string;
  reference: string;
  note: string;
  transactionDate: string;
};
type CashInput = Partial<Omit<Cash, "id">>;
type Movement = {
  id: number;
  quantityChange: number;
  reason: string;
  createdAt: string;
  sku: string;
  productName: string;
  color?: string;
  size?: string;
  note?: string;
  orderCode?: string;
};
type Reconciliation = {
  id: number;
  orderId: number;
  orderCode: string;
  customerName: string;
  status: string;
  discrepancyType: string;
  expectedAmount: number;
  actualAmount: number;
  note: string;
  resolvedAt?: string;
};
type ReturnItem = {
  id: number;
  orderId: number;
  orderCode: string;
  quantity: number;
  refundAmount: number;
  reason: string;
  createdAt: string;
  source?: "manual" | "shopee";
  previousDeliveryStatus?: string;
  previousPaymentStatus?: string;
  previousStockDeducted?: boolean;
  previousShipmentStatus?: string;
  previousShopeeRows?: Array<{
    id: number;
    orderStatus: string;
    stockDeducted: boolean;
  }>;
};
type Audit = {
  id: number;
  entityType: string;
  entityId: number;
  action: string;
  details: string;
  createdAt: string;
};
type TaxDeclaration = {
  id: number;
  period: string;
  revenue: number;
  shopeeRevenue: number;
  facebookRevenue: number;
  storeRevenue: number;
  vatRate: number;
  pitRate: number;
  vatAmount: number;
  pitAmount: number;
  status: string;
  note: string;
  createdAt: string;
};
type ShopeeRow = {
  id: number;
  orderCode?: string;
  orderDate: string;
  buyer: string;
  sku: string;
  color: string;
  size: string;
  productName: string;
  orderStatus: string;
  trackingCode: string;
  originalPrice: number;
  sellerDiscount: number;
  shopeeDiscount: number;
  totalSellerDiscount: number;
  promotionalPrice: number;
  quantity: number;
  buyerProductPayment: number;
  orderValue: number;
  shopVoucher: number;
  shopeeVoucher: number;
  shopeeCoins: number;
  sellerCoinCashback: number;
  shopeeComboDiscount: number;
  shopComboDiscount: number;
  cardDiscount: number;
  tradeInBonus: number;
  sellerTradeInBonus: number;
  expectedShippingFee: number;
  buyerShippingFee: number;
  shopeeShippingSubsidy: number;
  returnShippingFee: number;
  buyerTotalPaid: number;
  paymentMethod: string;
  fixedFee: number;
  serviceFee: number;
  transactionFee: number;
  province: string;
  netOrderValue: number;
  stockDeducted: boolean;
  stockIssue: string;
};
type SpxRow = {
  id: number;
  createDate: string;
  trackingCode: string;
  status: string;
  sku: string;
  color: string;
  size: string;
  province: string;
  recipient: string;
  provider: string;
  shippingNote: string;
  sourceOrderCode: string;
  orderValue: number;
  codAmount: number;
  failedDelivery: number;
  shippingFee: number;
  total: number;
};
type InventoryRow = {
  id: number;
  snapshotDate: string;
  sku: string;
  itemType: string;
  color: string;
  sizeS: number;
  sizeM: number;
  sizeL: number;
  freeSize: number;
  oversize: number;
  total: number;
  note: string;
};
type CatalogRow = {
  id: number;
  sku: string;
  name: string;
  price: number;
  costPrice: number;
};
type NamedOption = { id: string; name: string };
type DashboardSettings = {
  defaultPeriod: "month" | "week";
  revenueChart: "line" | "bar" | "area";
  channelChart: "cards" | "bar" | "pie";
  cityChart: "area" | "bar" | "line";
  stockChart: "table" | "bar" | "pie";
};
type StoreSettings = {
  orderChannels: NamedOption[];
  shippingProviders: NamedOption[];
  dashboard: DashboardSettings;
};
type StoreState = {
  monthlyPlatformFees: Record<string, number>;
  products: Product[];
  orders: Order[];
  cash: Cash[];
  movements: Movement[];
  reconciliations: Reconciliation[];
  returns: ReturnItem[];
  audit: Audit[];
  taxDeclarations: TaxDeclaration[];
  shopeeRows: ShopeeRow[];
  spxRows: SpxRow[];
  inventoryRows: InventoryRow[];
  catalogRows: CatalogRow[];
  settings: StoreSettings;
  nextId: number;
};

const jsonError = (error: string, status = 400) =>
  NextResponse.json({ error }, { status });
const nowIso = () => new Date().toISOString();

function emptyState(): StoreState {
  return {
    monthlyPlatformFees: {},
    products: [],
    orders: [],
    cash: [],
    movements: [],
    reconciliations: [],
    returns: [],
    audit: [],
    taxDeclarations: [],
    shopeeRows: [],
    spxRows: [],
    inventoryRows: [],
    catalogRows: [],
    settings: {
      orderChannels: [
        { id: "shopee", name: "Shopee" },
        { id: "store", name: "Tại cửa hàng" },
      ],
      shippingProviders: [
        { id: "spx", name: "SPX" },
        { id: "ghn", name: "Giao hàng nhanh" },
        { id: "viettel-post", name: "Viettel Post" },
        { id: "other", name: "Khác" },
      ],
      dashboard: {
        defaultPeriod: "month",
        revenueChart: "line",
        channelChart: "cards",
        cityChart: "area",
        stockChart: "table",
      },
    },
    nextId: 1,
  };
}

const STATE_KEY = "limit-sportswear-data";

function returnedShopeeStatus(status: string) {
  const normalized = status.toLocaleLowerCase("vi").trim();
  return (
    normalized.startsWith("đã hoàn") ||
    normalized.startsWith("hoàn hàng") ||
    normalized.startsWith("trả hàng")
  );
}

function inactiveShopeeStatus(status: string) {
  return (
    status.toLocaleLowerCase("vi").includes("hủy") ||
    returnedShopeeStatus(status)
  );
}

function normalizeState(state: StoreState) {
  state.monthlyPlatformFees ||= {};
  state.taxDeclarations ||= [];
  state.shopeeRows ||= [];
  state.spxRows ||= [];
  state.inventoryRows ||= [];
  state.catalogRows ||= [];
  state.settings ||= {
    orderChannels: [],
    shippingProviders: [],
    dashboard: {
      defaultPeriod: "month",
      revenueChart: "line",
      channelChart: "cards",
      cityChart: "area",
      stockChart: "table",
    },
  };
  state.settings.orderChannels ||= [];
  state.settings.shippingProviders ||= [];
  state.settings.dashboard ||= {
    defaultPeriod: "month",
    revenueChart: "line",
    channelChart: "cards",
    cityChart: "area",
    stockChart: "table",
  };
  if (!state.settings.orderChannels.some((option) => option.id === "shopee"))
    state.settings.orderChannels.unshift({ id: "shopee", name: "Shopee" });
  if (!state.settings.orderChannels.some((option) => option.id === "store"))
    state.settings.orderChannels.push({ id: "store", name: "Tại cửa hàng" });
  const knownChannels = new Set(
    state.settings.orderChannels.map((option) =>
      option.name.toLocaleLowerCase("vi"),
    ),
  );
  for (const order of state.orders)
    if (
      order.salesChannel &&
      !knownChannels.has(order.salesChannel.toLocaleLowerCase("vi"))
    ) {
      state.settings.orderChannels.push({
        id: `channel-${order.salesChannel.toLocaleLowerCase("vi").replace(/[^a-z0-9]+/g, "-") || state.nextId++}`,
        name: order.salesChannel,
      });
      knownChannels.add(order.salesChannel.toLocaleLowerCase("vi"));
    }
  const defaultProviders: NamedOption[] = [
    { id: "spx", name: "SPX" },
    { id: "ghn", name: "Giao hàng nhanh" },
    { id: "viettel-post", name: "Viettel Post" },
    { id: "other", name: "Khác" },
  ];
  for (const option of defaultProviders)
    if (!state.settings.shippingProviders.some((item) => item.id === option.id))
      state.settings.shippingProviders.push(option);
  for (const row of state.inventoryRows) {
    row.freeSize ??= 0;
    row.oversize ??= 0;
  }
  for (const row of state.inventoryRows) {
    if (row.sku !== "S001") continue;
    if (/^áo$/i.test(row.itemType) || /ba lỗ.*chân váy/i.test(row.itemType))
      row.itemType = "Ba lỗ";
    else if (
      /^váy$/i.test(row.itemType) ||
      /chân váy.*ba lỗ/i.test(row.itemType)
    )
      row.itemType = "Chân váy";
  }
  const splitS002Rows: InventoryRow[] = [];
  for (const row of state.inventoryRows) {
    if (row.sku !== "S002") {
      splitS002Rows.push(row);
      continue;
    }
    const key = productPriceKey(row.sku, row.itemType);
    if (key === "S002:full-set") {
      splitS002Rows.push({ ...row, itemType: "Áo" });
      splitS002Rows.push({
        ...row,
        id: state.nextId++,
        itemType: "Quần",
      });
    } else {
      splitS002Rows.push({
        ...row,
        itemType:
          key === "S002:ao"
            ? "Áo"
            : key === "S002:quan"
              ? "Quần"
              : key === "S002:bra"
                ? "Bra"
              : row.itemType,
      });
    }
  }
  const mergedS002Rows = new Map<string, InventoryRow>();
  state.inventoryRows = splitS002Rows.filter((row) => {
    if (row.sku !== "S002") return true;
    const key = [row.snapshotDate, row.sku, row.itemType, row.color]
      .map((value) => value.toLocaleLowerCase("vi"))
      .join("|||");
    const existing = mergedS002Rows.get(key);
    if (!existing) {
      mergedS002Rows.set(key, row);
      return true;
    }
    existing.sizeS += row.sizeS;
    existing.sizeM += row.sizeM;
    existing.sizeL += row.sizeL;
    existing.freeSize += row.freeSize;
    existing.oversize += row.oversize;
    existing.total =
      existing.sizeS +
      existing.sizeM +
      existing.sizeL +
      existing.freeSize +
      existing.oversize;
    if (!existing.note && row.note) existing.note = row.note;
    return false;
  });
  const hasS002 = state.catalogRows.some((row) => row.sku === "S002");
  for (const component of ["Áo", "Quần", "Bra"] as const) {
    const componentKey = productPriceKey("S002", component);
    const existingComponent = state.catalogRows.find(
      (row) => productPriceKey(row.sku, row.name) === componentKey,
    );
    const sourceSku =
      component === "Áo" ? "A002" : component === "Quần" ? "Q001" : "A003";
    const suggestedPrice =
      state.catalogRows.find((row) => row.sku === sourceSku)?.price ?? 0;
    if (existingComponent && existingComponent.price === 0 && suggestedPrice > 0)
      existingComponent.price = suggestedPrice;
    else if (hasS002 && !existingComponent)
      state.catalogRows.push({
        id: state.nextId++,
        sku: "S002",
        name: component,
        price: suggestedPrice,
        costPrice: 0,
      });
  }
  for (const row of state.spxRows) {
    row.createDate ??= "";
    row.status ??= "";
    row.provider ||=
      state.settings.shippingProviders.find((option) => option.id === "spx")
        ?.name || "SPX";
    row.shippingNote ??= "";
    row.sourceOrderCode ??= "";
    row.orderValue ??= row.codAmount;
    row.total = spxReceivable(row);
  }
  for (const row of state.shopeeRows) {
    row.netOrderValue ??= 0;
    row.stockDeducted ??= false;
    row.stockIssue ??= "";
  }
  refreshShopeeNetValues(state.shopeeRows);
  for (const order of state.orders) {
    // Legacy manual orders always deducted stock when they were created.
    order.stockDeducted ??= true;
    order.phone ??= "";
    order.address ??= "";
    order.shippingProvider ??= "";
    order.shippingNote ??= "";
    order.trackingCode ??= "";
    order.shippingFee ??= 0;
    order.subtotal ??= order.totalAmount;
    order.discountType ??= "none";
    order.discountValue ??= 0;
    order.discountAmount ??= 0;
    order.surcharge ??= 0;
    order.totalAmount =
      order.subtotal -
      order.discountAmount +
      order.surcharge +
      order.shippingFee;
    order.paymentMethod ||=
      order.paymentStatus === "Chờ COD" ? "COD" : "Chuyển khoản";
    order.items ||= [
      {
        productId: order.productId,
        sku:
          state.products.find((product) => product.id === order.productId)
            ?.sku || "",
        productName: order.productName,
        color: order.color,
        size: order.size,
        quantity: order.quantity,
        unitPrice: order.quantity
          ? order.subtotal / order.quantity
          : order.subtotal,
        lineTotal: order.subtotal,
      },
    ];
    const shipment = state.spxRows.find(
      (row) => row.sourceOrderCode === order.code,
    );
    if (shipment) {
      shipment.orderValue = order.totalAmount - order.shippingFee;
      if (order.paymentMethod === "COD")
        shipment.codAmount = order.totalAmount - order.shippingFee;
      shipment.shippingFee = order.shippingFee;
      shipment.total = spxReceivable(shipment);
    }
    const reconciliation = state.reconciliations.find(
      (row) => row.orderId === order.id,
    );
    if (reconciliation) {
      reconciliation.expectedAmount = order.totalAmount;
      if (isPaidOrder(order.paymentStatus))
        reconciliation.actualAmount = order.totalAmount;
    }
    const automaticIncome = state.cash.find(
      (row) =>
        row.type === "Thu" &&
        row.reference === order.code &&
        row.note === "Tự động từ đơn hàng",
    );
    if (automaticIncome) automaticIncome.amount = manualOrderRevenue(order);
  }
  // Older versions deducted every manual order immediately. Reconcile legacy
  // waiting orders on load so "Chờ lấy hàng" follows the new stock rule too.
  const waitingOrderIds = state.orders
    .filter(
      (order) =>
        !order.returned &&
        order.stockDeducted &&
        !deliveryUsesStock(order.deliveryStatus),
    )
    .map((order) => order.id);
  for (const orderId of waitingOrderIds) {
    const draft = structuredClone(state);
    const draftOrder = draft.orders.find((order) => order.id === orderId);
    if (!draftOrder) continue;
    try {
      setManualOrderStock(draft, draftOrder, false);
      Object.assign(state, draft);
    } catch {
      // Preserve ambiguous legacy rows instead of guessing a stock variant.
    }
  }
  // Re-run rows saved by older Shopee matching logic. Complete SKU/color/size
  // rows that were previously marked "not found" can now match inventory
  // without using the marketplace product name.
  const retryShopeeRowIds = state.shopeeRows
    .filter(
      (row) =>
        !row.stockDeducted &&
        Boolean(row.stockIssue) &&
        Boolean(row.sku && row.color && inventorySizeKey(row.size)) &&
        Number.isInteger(row.quantity) &&
        row.quantity > 0 &&
        !inactiveShopeeStatus(row.orderStatus),
    )
    .map((row) => row.id);
  for (const rowId of retryShopeeRowIds) {
    const draft = structuredClone(state);
    const draftRow = draft.shopeeRows.find((row) => row.id === rowId);
    if (!draftRow) continue;
    adjustInventoryForShopeeRow(draft, draftRow, -1);
    Object.assign(state, draft);
  }
}

async function readState() {
  return readJsonState(STATE_KEY, emptyState, normalizeState);
}

async function mutateState(change: (state: StoreState) => void) {
  return mutateJsonState(STATE_KEY, emptyState, normalizeState, change);
}

function addAudit(
  state: StoreState,
  entityType: string,
  entityId: number,
  action: string,
  details: string,
) {
  state.audit.unshift({
    id: state.nextId++,
    entityType,
    entityId,
    action,
    details,
    createdAt: nowIso(),
  });
  state.audit = state.audit.slice(0, 100);
}

const text = (value: unknown) => String(value ?? "").trim();
const amount = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const monthFrom = (value: unknown) => {
  const candidate = text(value).slice(0, 7);
  return /^\d{4}-\d{2}$/.test(candidate) ? candidate : "";
};

async function mutationMonth(action: string, body: Record<string, unknown>) {
  if (action === "saveDashboardSettings") return "";
  const explicitMonth = monthFrom(body.editingMonth);
  if (action === "saveMonthlyPlatformFee") return explicitMonth;
  if (action === "deleteShopeeOrder" || action === "returnShopeeOrder") {
    const { data } = await readState();
    return monthFrom(data.shopeeRows.find((row) => row.id === amount(body.rowId))?.orderDate) || explicitMonth;
  }
  if (
    [
      "createProduct",
      "deleteProduct",
      "adjustStock",
      "importProducts",
      "saveTaxDeclaration",
      "importMonthlyWorkbookRows",
    ].includes(action)
  )
    return explicitMonth;
  if (action === "startInventoryCheck")
    return monthFrom(body.snapshotDate) || explicitMonth;
  if (action === "recordInventoryChange")
    return (
      monthFrom(
        ((body.entry ?? {}) as Record<string, unknown>).transactionDate,
      ) || explicitMonth
    );
  if (action === "deleteInventoryChange") {
    const { data } = await readState();
    const movement = data.movements.find(
      (item) => item.id === amount(body.movementId),
    );
    return monthFrom(movement?.createdAt) || explicitMonth;
  }
  if (action === "deleteOrderReturn") {
    const { data } = await readState();
    return (
      monthFrom(
        data.returns.find((item) => item.id === amount(body.returnId))
          ?.createdAt,
      ) || explicitMonth
    );
  }
  if (action === "createOrder")
    return (
      monthFrom(((body.order ?? {}) as Record<string, unknown>).orderDate) ||
      explicitMonth
    );
  if (action === "createCash")
    return (
      monthFrom(
        ((body.cash ?? {}) as Record<string, unknown>).transactionDate,
      ) || explicitMonth
    );
  if (action === "saveWorkbookRow") {
    const sheet = text(body.sheet);
    const row = (body.row ?? {}) as Record<string, unknown>;
    const requestedId = amount(row.id);
    if (
      requestedId &&
      (sheet === "shopee" || sheet === "spx" || sheet === "inventory")
    ) {
      const { data } = await readState();
      const existingMonth =
        sheet === "shopee"
          ? monthFrom(
              data.shopeeRows.find((item) => item.id === requestedId)
                ?.orderDate,
            )
          : sheet === "spx"
            ? monthFrom(
                data.spxRows.find((item) => item.id === requestedId)
                  ?.createDate,
              )
            : monthFrom(
                data.inventoryRows.find((item) => item.id === requestedId)
                  ?.snapshotDate,
              );
      if (existingMonth) return existingMonth;
    }
    if (sheet === "shopee") return monthFrom(row.orderDate) || explicitMonth;
    if (sheet === "spx") return monthFrom(row.createDate) || explicitMonth;
    if (sheet === "inventory")
      return monthFrom(row.snapshotDate) || explicitMonth;
    return explicitMonth;
  }
  if (
    [
      "updateOrder",
      "exchangeOrderSize",
      "updateManualOrder",
      "deleteManualOrder",
      "reconcile",
      "returnOrder",
      "deleteWorkbookRow",
    ].includes(action)
  ) {
    const { data } = await readState();
    if (action === "deleteWorkbookRow") {
      const rowId = amount(body.rowId);
      const sheet = text(body.sheet);
      if (sheet === "shopee")
        return (
          monthFrom(
            data.shopeeRows.find((row) => row.id === rowId)?.orderDate,
          ) || explicitMonth
        );
      if (sheet === "spx")
        return (
          monthFrom(data.spxRows.find((row) => row.id === rowId)?.createDate) ||
          explicitMonth
        );
      if (sheet === "inventory")
        return (
          monthFrom(
            data.inventoryRows.find((row) => row.id === rowId)?.snapshotDate,
          ) || explicitMonth
        );
      return explicitMonth;
    }
    const order = data.orders.find((item) => item.id === amount(body.orderId));
    return monthFrom(order?.orderDate) || explicitMonth;
  }
  return "";
}

function shopeeRow(input: Record<string, unknown>, id: number): ShopeeRow {
  return {
    id,
    orderCode: text(input.orderCode),
    orderDate: text(input.orderDate),
    buyer: text(input.buyer),
    sku: text(input.sku).toUpperCase(),
    color: text(input.color),
    size: text(input.size),
    productName: text(input.productName),
    orderStatus: text(input.orderStatus),
    trackingCode: text(input.trackingCode),
    originalPrice: amount(input.originalPrice),
    sellerDiscount: amount(input.sellerDiscount),
    shopeeDiscount: amount(input.shopeeDiscount),
    totalSellerDiscount: amount(input.totalSellerDiscount),
    promotionalPrice: amount(input.promotionalPrice),
    quantity: amount(input.quantity),
    buyerProductPayment: amount(input.buyerProductPayment),
    orderValue: amount(input.orderValue),
    shopVoucher: amount(input.shopVoucher),
    shopeeVoucher: amount(input.shopeeVoucher),
    shopeeCoins: amount(input.shopeeCoins),
    sellerCoinCashback: amount(input.sellerCoinCashback),
    shopeeComboDiscount: amount(input.shopeeComboDiscount),
    shopComboDiscount: amount(input.shopComboDiscount),
    cardDiscount: amount(input.cardDiscount),
    tradeInBonus: amount(input.tradeInBonus),
    sellerTradeInBonus: amount(input.sellerTradeInBonus),
    expectedShippingFee: amount(input.expectedShippingFee),
    buyerShippingFee: amount(input.buyerShippingFee),
    shopeeShippingSubsidy: amount(input.shopeeShippingSubsidy),
    returnShippingFee: amount(input.returnShippingFee),
    buyerTotalPaid: amount(input.buyerTotalPaid),
    paymentMethod: text(input.paymentMethod),
    fixedFee: amount(input.fixedFee),
    serviceFee: amount(input.serviceFee),
    transactionFee: amount(input.transactionFee),
    province: text(input.province),
    netOrderValue: amount(input.netOrderValue),
    stockDeducted: Boolean(input.stockDeducted),
    stockIssue: text(input.stockIssue),
  };
}

function shopeeOrderKey(row: ShopeeRow) {
  return (
    row.orderCode ||
    row.trackingCode ||
    `${row.orderDate}|${row.buyer}`
  );
}

function calculateShopeeNetOrderValue(rows: ShopeeRow[]) {
  if (rows.some((row) => inactiveShopeeStatus(row.orderStatus)))
    return 0;
  const max = (key: keyof ShopeeRow) =>
    Math.max(0, ...rows.map((row) => Number(row[key]) || 0));
  const sum = (key: keyof ShopeeRow) =>
    rows.reduce((total, row) => total + (Number(row[key]) || 0), 0);
  const reportedOrderValue = max("orderValue");
  const productValue =
    sum("buyerProductPayment") ||
    rows.reduce(
      (total, row) => total + row.promotionalPrice * row.quantity,
      0,
    );
  const sellerProductDiscount = Math.max(
    max("totalSellerDiscount"),
    sum("sellerDiscount"),
  );
  const sellerOrderDiscount =
    max("shopVoucher") +
    max("shopComboDiscount") +
    max("sellerCoinCashback") +
    max("sellerTradeInBonus");
  // "Tổng giá trị đơn hàng" is the amount after both Shop and Shopee
  // promotions. Shopee-funded promotions are reimbursed to the seller, so
  // they must be added back before deducting fees borne by the seller.
  const platformFundedDiscount =
    sum("shopeeDiscount") +
    max("shopeeVoucher") +
    max("shopeeCoins") +
    max("shopeeComboDiscount") +
    max("cardDiscount") +
    max("tradeInBonus");
  const sellerRevenue = reportedOrderValue
    ? reportedOrderValue + platformFundedDiscount
    : Math.max(
        0,
        productValue - sellerProductDiscount - sellerOrderDiscount,
      );
  const shippingCost = Math.max(
    0,
    max("expectedShippingFee") +
      max("returnShippingFee") -
      max("buyerShippingFee") -
      max("shopeeShippingSubsidy"),
  );
  const platformCost =
    max("fixedFee") + max("serviceFee") + max("transactionFee");
  return Math.max(0, sellerRevenue - shippingCost - platformCost);
}

function refreshShopeeNetValues(rows: ShopeeRow[]) {
  const groups = new Map<string, ShopeeRow[]>();
  for (const row of rows) {
    const key = shopeeOrderKey(row);
    groups.set(key, [...(groups.get(key) || []), row]);
  }
  for (const group of groups.values()) {
    const netOrderValue = calculateShopeeNetOrderValue(group);
    for (const row of group) row.netOrderValue = netOrderValue;
  }
}

function spxReceivable(input: {
  orderValue?: unknown;
  codAmount?: unknown;
  failedDelivery?: unknown;
  shippingFee?: unknown;
}) {
  return (
    (amount(input.orderValue) || amount(input.codAmount)) +
    amount(input.failedDelivery) +
    amount(input.shippingFee)
  );
}

function spxRow(input: Record<string, unknown>, id: number): SpxRow {
  const orderValue = amount(input.orderValue);
  const codAmount = amount(input.codAmount);
  const failedDelivery = amount(input.failedDelivery);
  const shippingFee = amount(input.shippingFee);
  return {
    id,
    createDate: text(input.createDate),
    trackingCode: text(input.trackingCode),
    status: text(input.status),
    sku: text(input.sku).toUpperCase(),
    color: text(input.color),
    size: displaySize(text(input.size)),
    province: text(input.province),
    recipient: text(input.recipient),
    provider: text(input.provider) || "SPX",
    shippingNote: text(input.shippingNote).slice(0, 300),
    sourceOrderCode: text(input.sourceOrderCode),
    orderValue,
    codAmount,
    failedDelivery,
    shippingFee,
    total: spxReceivable({
      orderValue,
      codAmount,
      failedDelivery,
      shippingFee,
    }),
  };
}

function inventoryRow(
  input: Record<string, unknown>,
  id: number,
): InventoryRow {
  const sizeS = amount(input.sizeS);
  const sizeM = amount(input.sizeM);
  const sizeL = amount(input.sizeL);
  let freeSize = amount(input.freeSize);
  let oversize = amount(input.oversize);
  const itemType = text(input.itemType);
  const note = text(input.note);
  const rawTotal = amount(input.total);
  if (sizeS + sizeM + sizeL + freeSize + oversize === 0 && rawTotal > 0) {
    if (/free\s*size/i.test(`${itemType} ${note}`)) freeSize = rawTotal;
    else if (/over\s*size|oversize/i.test(`${itemType} ${note}`))
      oversize = rawTotal;
  }
  const sizeTotal = sizeS + sizeM + sizeL + freeSize + oversize;
  return {
    id,
    snapshotDate: text(input.snapshotDate),
    sku: text(input.sku).toUpperCase(),
    itemType,
    color: text(input.color),
    sizeS,
    sizeM,
    sizeL,
    freeSize,
    oversize,
    total: sizeTotal || rawTotal,
    note,
  };
}

function catalogRow(input: Record<string, unknown>, id: number): CatalogRow {
  return {
    id,
    sku: text(input.sku).toUpperCase(),
    name: text(input.name),
    price: amount(input.price),
    costPrice: amount(input.costPrice),
  };
}

function catalogIdentityKey(skuValue: unknown, nameValue: unknown) {
  const sku = text(skuValue).toUpperCase();
  const name = text(nameValue)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .toLocaleLowerCase("vi")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  return `${sku}:${name}`;
}

function productPriceKey(skuValue: unknown, nameValue: unknown) {
  const [sku, name] = catalogIdentityKey(skuValue, nameValue).split(":");
  if (sku === "S001") {
    if (
      name.includes("full set") ||
      name.includes("set ba lo") ||
      (name.includes("set") && name.includes("tennis"))
    )
      return "S001:full-set";
    if (name.includes("chan vay") || name === "vay") return "S001:chan-vay";
    if (name.includes("ba lo") || name.includes("ao")) return "S001:ao";
  }
  if (sku === "S002") {
    if (
      !name ||
      name.includes("full set") ||
      name.includes("set yoga") ||
      ((name.includes("yoga") || name.includes("pilates")) &&
        !name.includes("ao") &&
        !name.includes("quan") &&
        !name.includes("bra"))
    )
      return "S002:full-set";
    if (name.includes("quan")) return "S002:quan";
    if (name.includes("bra")) return "S002:bra";
    if (name.includes("ao")) return "S002:ao";
  }
  return `${sku}:${name}`;
}

function catalogPrice(
  state: StoreState,
  sku: string,
  productName: string,
  fallback: number,
) {
  const key = catalogIdentityKey(sku, productName);
  const exactMatch = state.catalogRows.find(
    (row) => catalogIdentityKey(row.sku, row.name) === key,
  );
  if (exactMatch) return exactMatch.price;

  const sameSkuRows = state.catalogRows.filter(
    (row) => row.sku === sku.trim().toUpperCase(),
  );
  if (sameSkuRows.length > 1)
    throw new Error(
      `Mã ${sku} có nhiều sản phẩm. Hãy chọn đúng tên sản phẩm trong mục Mã sản phẩm để dò giá.`,
    );
  return sameSkuRows[0]?.price ?? fallback;
}

type SoldItem = { sku: string; size: string; quantity: number };
type ShopeeOrderSummary = {
  key: string;
  date: string;
  status: string;
  trackingCode: string;
  recipient: string;
  province: string;
  quantity: number;
  revenue: number;
  received: number;
  platformFees: number;
  shippingFees: number;
  productNames: string[];
  items: SoldItem[];
};

function displaySize(value: string) {
  const normalized = value.trim().toLocaleLowerCase("vi");
  if (["fs", "free size", "freesize"].includes(normalized)) return "Free size";
  if (["os", "over size", "oversize"].includes(normalized)) return "Oversize";
  return value.trim() || "Chưa ghi size";
}

function inventorySizeKey(size: string) {
  return (
    {
      S: "sizeS",
      M: "sizeM",
      L: "sizeL",
      "Free size": "freeSize",
      Oversize: "oversize",
    } as const
  )[displaySize(size) as "S" | "M" | "L" | "Free size" | "Oversize"];
}

function adjustInventoryForOrder(
  state: StoreState,
  input: {
    date: string;
    sku: string;
    productName: string;
    color: string;
    size: string;
    quantityChange: number;
  },
) {
  const snapshotDate = state.inventoryRows.reduce(
    (latest, row) => (row.snapshotDate > latest ? row.snapshotDate : latest),
    "",
  );
  if (!snapshotDate) return;
  const dayRows = state.inventoryRows.filter(
    (row) => row.snapshotDate === snapshotDate,
  );
  const normalizedColor = input.color.toLocaleLowerCase("vi");
  const matchingRows = dayRows.filter(
    (row) =>
      row.sku === input.sku &&
      row.color.toLocaleLowerCase("vi") === normalizedColor,
  );
  const requestedKey = productPriceKey(input.sku, input.productName);
  const setDefinition =
    requestedKey === "S001:full-set"
      ? {
          componentKeys: ["S001:ao", "S001:chan-vay"],
          componentLabel: "Áo và Chân váy",
        }
      : requestedKey === "S002:full-set"
        ? {
            componentKeys: ["S002:ao", "S002:quan"],
            componentLabel: "Áo và Quần",
          }
        : null;
  const fullSetRows = setDefinition
      ? setDefinition.componentKeys.map((key) =>
          matchingRows.find(
            (row) => productPriceKey(row.sku, row.itemType) === key,
          ),
        )
      : [];
  if (setDefinition) {
    if (fullSetRows.some((row) => !row))
      throw new Error(
        `Không tìm thấy đủ ${setDefinition.componentLabel} ${input.sku} · ${input.color} trong bảng kho ngày ${snapshotDate}.`,
      );
    const sizeKey = inventorySizeKey(input.size);
    if (!sizeKey) throw new Error("Size sản phẩm không hợp lệ.");
    for (const row of fullSetRows) {
      if (!row) continue;
      if (
        input.quantityChange < 0 &&
        row[sizeKey] < Math.abs(input.quantityChange)
      )
        throw new Error(
          `Full set ${input.sku} · ${input.color} · ${displaySize(input.size)} không còn đủ ${setDefinition.componentLabel}.`,
        );
    }
    for (const row of fullSetRows) {
      if (!row) continue;
      row[sizeKey] += input.quantityChange;
      row.total =
        row.sizeS + row.sizeM + row.sizeL + row.freeSize + row.oversize;
    }
    return;
  }
  const inventory =
    matchingRows.find(
      (row) => productPriceKey(row.sku, row.itemType) === requestedKey,
    ) || (matchingRows.length === 1 ? matchingRows[0] : undefined);
  if (!inventory)
    throw new Error(
      `Không tìm thấy ${input.sku} · ${input.color} trong bảng kho ngày ${snapshotDate}.`,
    );
  const sizeKey = inventorySizeKey(input.size);
  if (!sizeKey) throw new Error("Size sản phẩm không hợp lệ.");
  if (
    input.quantityChange < 0 &&
    inventory[sizeKey] < Math.abs(input.quantityChange)
  )
    throw new Error(
      `${input.productName} · ${input.color} · ${displaySize(input.size)} chỉ còn ${inventory[sizeKey]} sản phẩm.`,
    );
  inventory[sizeKey] += input.quantityChange;
  inventory.total =
    inventory.sizeS +
    inventory.sizeM +
    inventory.sizeL +
    inventory.freeSize +
    inventory.oversize;
}

function setManualOrderStock(
  state: StoreState,
  order: Order,
  shouldDeduct: boolean,
) {
  if (order.stockDeducted === shouldDeduct) return;
  const quantityDirection = shouldDeduct ? -1 : 1;
  for (const item of order.items) {
    adjustInventoryForOrder(state, {
      date: order.orderDate,
      sku: item.sku,
      productName: item.productName,
      color: item.color,
      size: item.size,
      quantityChange: quantityDirection * item.quantity,
    });
  }
  for (const item of order.items) {
    const product = state.products.find((entry) => entry.id === item.productId);
    if (product)
      product.stock = Math.max(
        0,
        product.stock + quantityDirection * item.quantity,
      );
  }
  state.movements = state.movements.filter(
    (movement) =>
      movement.orderCode !== order.code || movement.reason !== "Bán hàng",
  );
  if (shouldDeduct)
    for (const item of order.items)
      state.movements.unshift({
        id: state.nextId++,
        quantityChange: -item.quantity,
        reason: "Bán hàng",
        createdAt: `${order.orderDate}T12:00:00.000Z`,
        sku: item.sku,
        productName: item.productName,
        color: item.color,
        size: item.size,
        orderCode: order.code,
      });
  order.stockDeducted = shouldDeduct;
}

function adjustInventoryForShopeeRow(
  state: StoreState,
  row: ShopeeRow,
  direction: -1 | 1,
) {
  if (!state.inventoryRows.length) {
    row.stockDeducted = false;
    row.stockIssue = "Chưa có bảng tồn kho — chưa trừ kho";
    return false;
  }
  const missing: string[] = [];
  if (!row.sku) missing.push("mã hàng");
  if (!row.color) missing.push("màu");
  if (!inventorySizeKey(row.size)) missing.push("size");
  if (!Number.isInteger(row.quantity) || row.quantity < 1)
    missing.push("số lượng");
  if (missing.length) {
    row.stockDeducted = false;
    row.stockIssue = `Thiếu ${missing.join(", ")} — chưa trừ kho`;
    return false;
  }
  if (inactiveShopeeStatus(row.orderStatus)) {
    row.stockDeducted = false;
    row.stockIssue = "Đơn đã hủy/hoàn — không trừ kho";
    return false;
  }
  try {
    adjustInventoryForOrder(state, {
      date: row.orderDate,
      sku: row.sku,
      productName: row.productName,
      color: row.color,
      size: row.size,
      quantityChange: direction * row.quantity,
    });
    row.stockDeducted = direction < 0;
    row.stockIssue = "";
    return true;
  } catch (error) {
    row.stockDeducted = false;
    row.stockIssue = `${error instanceof Error ? error.message : "Không khớp tồn kho"} — chưa trừ kho`;
    return false;
  }
}

function validatedOrderInput(input: OrderInput) {
  const productId = Number(input.productId);
  const quantity = Number(input.quantity);
  const surcharge = Number(input.surcharge) || 0;
  const discountType = text(input.discountType) || "none";
  const discountValue = Number(input.discountValue) || 0;
  const shippingFee = Number(input.shippingFee) || 0;
  const sku = text(input.sku).toUpperCase();
  const productName = text(input.productName);
  const color = text(input.color);
  const size = displaySize(text(input.size));
  const phone = text(input.phone);
  const address = text(input.address);
  const shippingProvider = text(input.shippingProvider);
  const shippingNote = text(input.shippingNote).slice(0, 300);
  const trackingCode = text(input.trackingCode);
  const paymentMethod = input.paymentMethod || "COD";
  if (
    !input.customerName?.trim() ||
    !phone ||
    !address ||
    !sku ||
    !productName ||
    !color ||
    !["S", "M", "L", "Free size", "Oversize"].includes(size) ||
    !Number.isInteger(quantity) ||
    quantity < 1
  )
    throw new Error(
      "Vui lòng nhập đủ khách hàng, số điện thoại, địa chỉ, sản phẩm, màu, size và số lượng.",
    );
  if (!/^0\d{8,10}$/.test(phone.replace(/\s/g, "")))
    throw new Error("Số điện thoại chưa đúng định dạng.");
  if (
    !["Thẻ", "Tiền mặt", "Chuyển khoản", "COD"].includes(paymentMethod) ||
    !["none", "percent", "amount"].includes(discountType) ||
    !Number.isFinite(discountValue) ||
    discountValue < 0 ||
    (discountType === "percent" && discountValue > 100) ||
    (discountType === "amount" && !Number.isInteger(discountValue)) ||
    !Number.isInteger(surcharge) ||
    surcharge < 0 ||
    !Number.isInteger(shippingFee) ||
    shippingFee < 0 ||
    !shippingProvider
  )
    throw new Error(
      "Phương thức thanh toán, đơn vị vận chuyển hoặc chi phí chưa hợp lệ.",
    );
  return {
    productId,
    quantity,
    surcharge,
    shippingFee,
    sku,
    productName,
    color,
    size,
    phone,
    address,
    shippingProvider,
    shippingNote,
    trackingCode,
    paymentMethod,
    discountType,
    discountValue,
  };
}

function calculateOrderDiscount(
  subtotal: number,
  discountType: string,
  discountValue: number,
) {
  if (discountType === "percent")
    return Math.min(subtotal, Math.round((subtotal * discountValue) / 100));
  if (discountType === "amount") return Math.min(subtotal, discountValue);
  return 0;
}

function validatedOrderItems(
  state: StoreState,
  input: OrderInput,
  fallback: ReturnType<typeof validatedOrderInput>,
) {
  const incoming =
    Array.isArray(input.items) && input.items.length
      ? input.items
      : [
          {
            productId: fallback.productId,
            sku: fallback.sku,
            productName: fallback.productName,
            color: fallback.color,
            size: fallback.size,
            quantity: fallback.quantity,
          },
        ];
  if (incoming.length > 30)
    throw new Error("Mỗi đơn được chọn tối đa 30 dòng sản phẩm.");
  return incoming.map((item) => {
    const productId = Number(item.productId);
    const sku = text(item.sku).toUpperCase();
    const productName = text(item.productName);
    const color = text(item.color);
    const size = displaySize(text(item.size));
    const quantity = Number(item.quantity);
    const product =
      state.products.find((entry) => entry.id === productId) ||
      state.products.find((entry) => entry.sku === sku);
    if (
      !product ||
      !sku ||
      !productName ||
      !color ||
      !["S", "M", "L", "Free size", "Oversize"].includes(size) ||
      !Number.isInteger(quantity) ||
      quantity < 1
    )
      throw new Error(
        "Một sản phẩm trong đơn chưa đủ mã, màu, size hoặc số lượng.",
      );
    const unitPrice = catalogPrice(state, sku, productName, product.salePrice);
    return {
      productId: product.id,
      sku,
      productName,
      color,
      size,
      quantity,
      unitPrice,
      lineTotal: unitPrice * quantity,
    };
  });
}

function addSoldItem(
  items: SoldItem[],
  sku: string,
  size: string,
  quantity: number,
) {
  const normalizedSku = sku.trim().toUpperCase() || "CHƯA CÓ MÃ";
  const normalizedSize = displaySize(size);
  const existing = items.find(
    (item) => item.sku === normalizedSku && item.size === normalizedSize,
  );
  if (existing) existing.quantity += quantity;
  else items.push({ sku: normalizedSku, size: normalizedSize, quantity });
}

function summarizeShopee(rows: ShopeeRow[]) {
  const groups = new Map<string, ShopeeOrderSummary>();
  const trackingDates = new Map(
    rows
      .filter((row) => row.trackingCode && row.orderDate)
      .map((row) => [row.trackingCode, row.orderDate]),
  );
  for (const row of rows) {
    const rowDate = row.orderDate || trackingDates.get(row.trackingCode) || "";
    if (!rowDate) continue;
    const key = row.orderCode || row.trackingCode || `${rowDate}|${row.buyer}`;
    const current = groups.get(key) || {
      key,
      date: rowDate,
      status: row.orderStatus,
      trackingCode: row.trackingCode,
      recipient: row.buyer,
      province: row.province,
      quantity: 0,
      revenue: 0,
      received: 0,
      platformFees: 0,
      shippingFees: 0,
      productNames: [],
      items: [],
    };
    current.quantity += row.quantity || 0;
    const orderRows = rows.filter((item) => shopeeOrderKey(item) === key);
    current.revenue =
      Math.max(0, ...orderRows.map((item) => item.netOrderValue || 0)) ||
      calculateShopeeNetOrderValue(orderRows);
    current.received = Math.max(
      current.received,
      row.buyerTotalPaid || row.orderValue,
    );
    current.platformFees = Math.max(
      current.platformFees,
      row.fixedFee + row.serviceFee + row.transactionFee,
    );
    current.shippingFees = Math.max(
      current.shippingFees,
      row.expectedShippingFee + row.returnShippingFee,
    );
    if (row.productName && !current.productNames.includes(row.productName))
      current.productNames.push(row.productName);
    addSoldItem(current.items, row.sku, row.size, row.quantity || 0);
    if (row.orderStatus) current.status = row.orderStatus;
    if (!current.recipient && row.buyer) current.recipient = row.buyer;
    if (!current.province && row.province) current.province = row.province;
    groups.set(key, current);
  }
  return [...groups.values()];
}

const canceledShopee = (order: ShopeeOrderSummary) =>
  inactiveShopeeStatus(order.status);

export async function GET(request: Request) {
  const { data } = await readState();
  const url = new URL(request.url);
  if (url.searchParams.get("view") === "migration-export") {
    if (!(await isAdminSession()))
      return jsonError("Đăng nhập khu kế toán để sao lưu dữ liệu.", 401);
    return new NextResponse(
      JSON.stringify(
        {
          format: "limit-sportswear-backup-v1",
          exportedAt: nowIso(),
          data,
        },
        null,
        2,
      ),
      {
        headers: {
          "content-type": "application/json; charset=utf-8",
          "content-disposition": `attachment; filename="limit-sportswear-backup-${nowIso().slice(0, 10)}.json"`,
          "cache-control": "private, no-store, max-age=0",
          "x-content-type-options": "nosniff",
        },
      },
    );
  }
  const dashboardView =
    url.searchParams.get("view") === "dashboard" ||
    url.searchParams.has("month");
  if (!dashboardView && (await isAdminSession()))
    return NextResponse.json(data);
  const requestedMonth = url.searchParams.get("month");
  const month = /^\d{4}-\d{2}$/.test(requestedMonth || "")
    ? requestedMonth!
    : nowIso().slice(0, 7);
  const requestedPeriod = url.searchParams.get("period");
  const periodMode = requestedPeriod === "week" || requestedPeriod === "month"
    ? requestedPeriod
    : data.settings.dashboard.defaultPeriod;
  const requestedDate = url.searchParams.get("date");
  const anchorDateKey = /^\d{4}-\d{2}-\d{2}$/.test(requestedDate || "")
    ? requestedDate!
    : `${month}-01`;
  const dateAtNoon = (value: string) => new Date(`${value}T12:00:00Z`);
  const dateKey = (value: Date) => value.toISOString().slice(0, 10);
  const anchorDate = dateAtNoon(anchorDateKey);
  const weekStartDate = new Date(anchorDate);
  weekStartDate.setUTCDate(anchorDate.getUTCDate() - ((anchorDate.getUTCDay() + 6) % 7));
  const weekEndDate = new Date(weekStartDate);
  weekEndDate.setUTCDate(weekStartDate.getUTCDate() + 6);
  const monthParts = month.split("-").map(Number);
  const periodStart = periodMode === "week" ? dateKey(weekStartDate) : `${month}-01`;
  const periodEnd = periodMode === "week"
    ? dateKey(weekEndDate)
    : dateKey(new Date(Date.UTC(monthParts[0], monthParts[1], 0, 12)));
  const inDashboardPeriod = (value: string) => {
    const key = value.slice(0, 10);
    return key >= periodStart && key <= periodEnd;
  };
  const activeOrders = data.orders.filter((order) => !order.returned);
  const monthOrders = activeOrders.filter((order) =>
    inDashboardPeriod(order.orderDate),
  );
  const monthCash = data.cash.filter((entry) =>
    inDashboardPeriod(entry.transactionDate),
  );
  const shopeeOrders = summarizeShopee(data.shopeeRows);
  const validShopeeOrders = shopeeOrders.filter(
    (order) => !canceledShopee(order),
  );
  const monthShopeeOrders = validShopeeOrders.filter((order) =>
    inDashboardPeriod(order.date),
  );
  const canceledMonthOrders = shopeeOrders.filter(
    (order) => inDashboardPeriod(order.date) && canceledShopee(order),
  );
  const shopeeChannelName =
    data.settings.orderChannels.find((option) => option.id === "shopee")
      ?.name || "Shopee";
  type DashboardDay = {
    date: string;
    orderCount: number;
    quantity: number;
    totalAmount: number;
    hasAttention: boolean;
    channels: Record<string, number>;
    items: SoldItem[];
  };
  const dayMap = monthOrders.reduce<Record<string, DashboardDay>>(
    (result, order) => {
      const date = order.orderDate.slice(0, 10);
      const day = (result[date] ||= {
        date,
        orderCount: 0,
        quantity: 0,
        totalAmount: 0,
        hasAttention: false,
        channels: {},
        items: [],
      });
      day.orderCount += 1;
      day.quantity += order.quantity;
      day.totalAmount += manualOrderRevenue(order);
      day.hasAttention ||=
        order.deliveryStatus.includes("Hoàn") ||
        order.paymentStatus.includes("Chờ");
      day.channels[order.salesChannel] =
        (day.channels[order.salesChannel] || 0) + 1;
      for (const item of order.items)
        addSoldItem(
          day.items,
          item.sku ||
            data.products.find((product) => product.id === item.productId)
              ?.sku ||
            item.productName,
          item.size,
          item.quantity,
        );
      return result;
    },
    {},
  );
  for (const order of monthShopeeOrders) {
    const date = order.date.slice(0, 10);
    const day = (dayMap[date] ||= {
      date,
      orderCount: 0,
      quantity: 0,
      totalAmount: 0,
      hasAttention: false,
      channels: {},
      items: [],
    });
    day.orderCount += 1;
    day.quantity += order.quantity;
    day.totalAmount += order.revenue;
    day.hasAttention ||=
      !order.status.includes("Hoàn thành") &&
      !order.status.includes("xác nhận đã nhận");
    day.channels[shopeeChannelName] =
      (day.channels[shopeeChannelName] || 0) + 1;
    for (const item of order.items)
      addSoldItem(day.items, item.sku, item.size, item.quantity);
  }
  const days = Object.values(dayMap);
  const shopeeRevenue = monthShopeeOrders.reduce(
    (sum, order) => sum + order.revenue,
    0,
  );
  const shopeeReceived = monthShopeeOrders.reduce(
    (sum, order) => sum + order.received,
    0,
  );
  // Monthly entered total is authoritative; do not double count per-order fees.
  const platformFees = periodMode === "month" ? data.monthlyPlatformFees[month] || 0 : 0;
  const cashIncome = monthCash
    .filter((entry) => entry.type === "Thu")
    .reduce((sum, entry) => sum + entry.amount, 0);
  const cashExpense = monthCash
    .filter((entry) => entry.type === "Chi")
    .reduce((sum, entry) => sum + entry.amount, 0);
  const monthRevenue =
    shopeeRevenue +
    monthOrders.reduce((sum, order) => sum + manualOrderRevenue(order), 0);
  const monthExpense = platformFees + cashExpense;
  const capitalIn = monthCash.filter((entry) => entry.type === "Vốn vào").reduce((sum, entry) => sum + entry.amount, 0);
  const capitalOut = monthCash.filter((entry) => entry.type === "Rút vốn").reduce((sum, entry) => sum + entry.amount, 0);
  const capitalNet = capitalIn - capitalOut;
  const monthReceived = monthRevenue - monthExpense;
  const cashExpenses: Array<{
    id: number | string;
    date: string;
    category: string;
    amount: number;
  }> = monthCash
    .filter((entry) => entry.type === "Chi")
    .map((entry) => ({
      id: entry.id,
      date: entry.transactionDate.slice(0, 10),
      category: entry.category || "Chi khác",
      amount: entry.amount,
    }))
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) || String(b.id).localeCompare(String(a.id)),
    );
  if (platformFees > 0)
    cashExpenses.push({
      id: `platform-fee-${month}`,
      date: `${month}-01`,
      category: "Phí sàn",
      amount: platformFees,
    });
  cashExpenses.sort(
    (a, b) =>
      b.date.localeCompare(a.date) || String(b.id).localeCompare(String(a.id)),
  );
  const today = nowIso().slice(0, 10);
  const monthEnd = periodEnd;
  const latestSnapshot = data.inventoryRows.reduce(
    (latest, row) =>
      row.snapshotDate <= monthEnd && row.snapshotDate > latest
        ? row.snapshotDate
        : latest,
    "",
  );
  const inventoryRows = latestSnapshot
    ? data.inventoryRows.filter((row) => row.snapshotDate === latestSnapshot)
    : [];
  const inventorySnapshots = [
    ...new Set(
      data.inventoryRows
        .filter((row) => inDashboardPeriod(row.snapshotDate))
        .map((row) => row.snapshotDate),
    ),
  ]
    .sort()
    .reverse()
    .map((date) => {
      const rows = data.inventoryRows.filter(
        (row) => row.snapshotDate === date,
      );
      return {
        date,
        skuCount: rows.length,
        totalUnits: rows.reduce((sum, row) => sum + row.total, 0),
        lowStock: rows.filter((row) => row.total <= 5).length,
      };
    });
  const inventory = inventoryRows.length
    ? inventoryRows.map((row) => {
        const isFreeSize = /free\s*size/i.test(`${row.itemType} ${row.note}`);
        const freeSize = row.freeSize || (isFreeSize ? row.total : 0);
        const size = isFreeSize
          ? `Free size ${freeSize}`
          : `S ${row.sizeS} · M ${row.sizeM} · L ${row.sizeL}${freeSize ? ` · Free size ${freeSize}` : ""}${row.oversize ? ` · Oversize ${row.oversize}` : ""}`;
        return {
          sku: row.sku || row.itemType,
          name:
            row.itemType ||
            data.catalogRows.find((item) => item.sku === row.sku)?.name ||
            "Sản phẩm",
          color: row.color,
          size,
          stock: row.total,
          lowStockThreshold: 5,
        };
      })
    : data.products.map(
        ({ sku, name, color, size, stock, lowStockThreshold }) => ({
          sku,
          name,
          color,
          size: displaySize(size),
          stock,
          lowStockThreshold,
        }),
      );
  const configuredManualChannels = data.settings.orderChannels
    .filter((option) => option.id !== "shopee")
    .map((option) => option.name);
  const manualChannelNames = [
    ...new Set([
      ...configuredManualChannels,
      ...monthOrders.map((order) => order.salesChannel).filter(Boolean),
    ]),
  ];
  const channelSummary = [
    {
      name: shopeeChannelName,
      orders: monthShopeeOrders.length,
      revenue: shopeeRevenue,
    },
    ...manualChannelNames.map((name) => ({
      name,
      orders: monthOrders.filter((order) => order.salesChannel === name).length,
      revenue: monthOrders
        .filter((order) => order.salesChannel === name)
        .reduce((sum, order) => sum + manualOrderRevenue(order), 0),
    })),
  ];
  const cityCounts = new Map<string, number>();
  for (const order of monthOrders) {
    const city = vietnamProvinceFromAddress(order.address || "");
    if (!city) continue;
    cityCounts.set(city, (cityCounts.get(city) || 0) + 1);
  }
  for (const order of monthShopeeOrders) {
    const city = vietnamProvinceFromAddress(order.province || "");
    if (!city) continue;
    cityCounts.set(city, (cityCounts.get(city) || 0) + 1);
  }
  const citySummary = [...cityCounts.entries()]
    .map(([city, orders]) => ({ city, orders }))
    .sort((a, b) => b.orders - a.orders || a.city.localeCompare(b.city, "vi"));
  return NextResponse.json({
    month,
    period: { mode: periodMode, start: periodStart, end: periodEnd },
    dashboardSettings: data.settings.dashboard,
    summary: {
      todayOrders:
        activeOrders.filter((order) => order.orderDate.startsWith(today))
          .length +
        validShopeeOrders.filter((order) => order.date.startsWith(today))
          .length,
      monthOrders: monthOrders.length + monthShopeeOrders.length,
      monthRevenue,
      monthReceived,
      monthExpense,
      capitalIn,
      capitalOut,
      capitalNet,
      estimatedNet: monthReceived,
      productsSold:
        monthOrders.reduce((sum, order) => sum + order.quantity, 0) +
        monthShopeeOrders.reduce((sum, order) => sum + order.quantity, 0),
      averageOrderValue:
        monthOrders.length + monthShopeeOrders.length
          ? monthRevenue / (monthOrders.length + monthShopeeOrders.length)
          : 0,
      platformFees,
      cashExpense,
      canceledOrders: canceledMonthOrders.length,
      delivering: activeOrders.filter(
        (order) => order.deliveryStatus === "Đang giao",
      ).length,
      returns: data.returns.length,
      lowStock: inventory.filter(
        (product) => product.stock <= product.lowStockThreshold,
      ).length,
      stockUnits: inventory.reduce((sum, product) => sum + product.stock, 0),
    },
    days,
    cashExpenses,
    inventory,
    inventorySnapshotDate: latestSnapshot,
    inventorySnapshots,
    channelSummary,
    citySummary,
  });
}

export async function POST(request: Request) {
  if (!(await isAdminSession()))
    return jsonError("Phiên đăng nhập đã hết hạn.", 401);
  const body = (await request.json()) as Record<string, unknown>;
  const action = String(body.action || "");
  try {
    if (action === "restoreMigrationBackup") {
      const incoming = body.data as Partial<StoreState> | undefined;
      if (
        !incoming ||
        !Array.isArray(incoming.products) ||
        !Array.isArray(incoming.orders) ||
        !Array.isArray(incoming.inventoryRows)
      ) {
        return jsonError("Tệp sao lưu không hợp lệ.");
      }
      await mutateState((state) => {
        Object.assign(state, emptyState(), structuredClone(incoming));
        normalizeState(state);
      });
      return NextResponse.json({ ok: true });
    }

    const affectedMonth = await mutationMonth(action, body);
    if (
      affectedMonth &&
      isPastMonth(affectedMonth) &&
      !(await isPastMonthUnlocked(affectedMonth))
    ) {
      return NextResponse.json(
        {
          error: `Tháng ${affectedMonth.slice(5, 7)}/${affectedMonth.slice(0, 4)} đang khóa. Hãy nhập passcode để chỉnh sửa.`,
          code: "PAST_MONTH_LOCKED",
          month: affectedMonth,
        },
        { status: 423 },
      );
    }

    if (action === "saveDashboardSettings") {
      const incoming = (body.settings || {}) as Record<string, unknown>;
      const defaultPeriod = text(incoming.defaultPeriod);
      const revenueChart = text(incoming.revenueChart);
      const channelChart = text(incoming.channelChart);
      const cityChart = text(incoming.cityChart);
      const stockChart = text(incoming.stockChart);
      if (
        !["month", "week"].includes(defaultPeriod) ||
        !["line", "bar", "area"].includes(revenueChart) ||
        !["cards", "bar", "pie"].includes(channelChart) ||
        !["area", "bar", "line"].includes(cityChart) ||
        !["table", "bar", "pie"].includes(stockChart)
      )
        return jsonError("Cấu hình Dashboard không hợp lệ.");
      await mutateState((state) => {
        state.settings.dashboard = {
          defaultPeriod: defaultPeriod as DashboardSettings["defaultPeriod"],
          revenueChart: revenueChart as DashboardSettings["revenueChart"],
          channelChart: channelChart as DashboardSettings["channelChart"],
          cityChart: cityChart as DashboardSettings["cityChart"],
          stockChart: stockChart as DashboardSettings["stockChart"],
        };
        addAudit(state, "Dashboard", 0, "Cập nhật hiển thị", JSON.stringify(state.settings.dashboard));
      });
      return NextResponse.json({ ok: true });
    }

    if (action === "saveMonthlyPlatformFee") {
      const month = text(body.editingMonth);
      const fee = Number(body.amount);
      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month) || !Number.isSafeInteger(fee) || fee < 0)
        return jsonError("Phí sàn phải là số tiền nguyên không âm và có tháng hợp lệ.");
      await mutateState((state) => {
        const previous = state.monthlyPlatformFees[month] || 0;
        state.monthlyPlatformFees[month] = fee;
        addAudit(state, "Phí sàn", 0, "Cập nhật phí sàn", `${month} · ${previous} → ${fee}`);
      });
      return NextResponse.json({ ok: true });
    }

    if (action === "saveNamedOption") {
      const group = text(body.group);
      const optionId = text(body.optionId);
      const name = text(body.name).slice(0, 50);
      if (
        !(["orderChannels", "shippingProviders"] as string[]).includes(group) ||
        name.length < 2
      )
        return jsonError("Tên mục phải có ít nhất 2 ký tự.");
      let savedId = optionId;
      await mutateState((state) => {
        const options = state.settings[group as "orderChannels" | "shippingProviders"];
        if (
          options.some(
            (option) =>
              option.id !== optionId &&
              option.name.toLocaleLowerCase("vi") ===
                name.toLocaleLowerCase("vi"),
          )
        )
          throw new Error("Tên mục này đã tồn tại.");
        if (optionId) {
          const option = options.find((item) => item.id === optionId);
          if (!option) throw new Error("Không tìm thấy mục cần đổi tên.");
          const oldName = option.name;
          option.name = name;
          if (group === "orderChannels" && option.id !== "shopee")
            for (const order of state.orders)
              if (order.salesChannel === oldName) order.salesChannel = name;
          if (group === "shippingProviders")
            for (const row of state.spxRows)
              if (row.provider === oldName) row.provider = name;
          addAudit(
            state,
            group === "orderChannels" ? "Kênh đơn hàng" : "Đơn vị vận chuyển",
            0,
            "Đổi tên",
            `${oldName} → ${name}`,
          );
        } else {
          if (options.length >= 12)
            throw new Error("Mỗi nhóm được tạo tối đa 12 mục.");
          savedId = `${group === "orderChannels" ? "channel" : "carrier"}-${state.nextId++}`;
          options.push({ id: savedId, name });
          addAudit(
            state,
            group === "orderChannels" ? "Kênh đơn hàng" : "Đơn vị vận chuyển",
            0,
            "Thêm mục",
            name,
          );
        }
      });
      return NextResponse.json({ ok: true, id: savedId });
    }

    if (action === "createProduct") {
      const input = (body.product ?? {}) as ProductInput;
      const sku = input.sku?.trim().toUpperCase();
      const name = input.name?.trim();
      const salePrice = Number(input.salePrice);
      const stock = Number(input.stock);
      const lowStockThreshold = Number(input.lowStockThreshold) || 5;
      if (
        !sku ||
        !name ||
        !Number.isInteger(salePrice) ||
        salePrice < 0 ||
        !Number.isInteger(stock) ||
        stock < 0
      )
        return jsonError(
          "Vui lòng nhập đủ mã hàng, tên, giá và tồn kho hợp lệ.",
        );
      let id = 0;
      await mutateState((state) => {
        if (state.products.some((p) => p.sku === sku))
          throw new Error("Mã hàng đã tồn tại.");
        id = state.nextId++;
        state.products.push({
          id,
          sku,
          name,
          color: input.color?.trim() || "",
          size: input.size?.trim() || "",
          salePrice,
          stock,
          lowStockThreshold,
        });
        state.movements.unshift({
          id: state.nextId++,
          quantityChange: stock,
          reason: "Tồn đầu",
          createdAt: nowIso(),
          sku,
          productName: name,
        });
        addAudit(state, "Sản phẩm", id, "Tạo mới", `${sku} · tồn ${stock}`);
      });
      return NextResponse.json({ ok: true, id });
    }

    if (action === "createOrder") {
      const input = (body.order ?? {}) as OrderInput;
      let values: ReturnType<typeof validatedOrderInput>;
      try {
        values = validatedOrderInput(input);
      } catch (error) {
        return jsonError(
          error instanceof Error
            ? error.message
            : "Dữ liệu đơn hàng không hợp lệ.",
        );
      }
      const {
        surcharge,
        shippingFee,
        phone,
        address,
        shippingProvider,
        shippingNote,
        trackingCode,
        paymentMethod,
        discountType,
        discountValue,
      } = values;
      let code = "";
      await mutateState((state) => {
        const items = validatedOrderItems(state, input, values);
        if (
          !state.settings.shippingProviders.some(
            (provider) => provider.name === shippingProvider,
          )
        )
          throw new Error(
            "Đơn vị vận chuyển không còn tồn tại. Hãy tải lại trang và chọn lại.",
          );
        const orderDate = text(input.orderDate) || nowIso().slice(0, 10);
        const id = state.nextId++;
        const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
        const discountAmount = calculateOrderDiscount(
          subtotal,
          discountType,
          discountValue,
        );
        const quantity = items.reduce((sum, item) => sum + item.quantity, 0);
        const totalAmount =
          subtotal - discountAmount + surcharge + shippingFee;
        const first = items[0];
        code = `LS${orderDate.slice(2, 10).replaceAll("-", "")}-${String(id).slice(-4)}`;
        const paymentStatus = input.paymentStatus || "Chưa thanh toán";
        const deliveryStatus = input.deliveryStatus || "Chờ lấy hàng";
        const order: Order = {
          id,
          code,
          customerName: input.customerName!.trim(),
          phone,
          address,
          salesChannel: input.salesChannel || "Tại cửa hàng",
          shippingProvider,
          shippingNote,
          trackingCode,
          shippingFee,
          deliveryStatus,
          paymentStatus,
          paymentMethod,
          orderDate,
          subtotal,
          discountType,
          discountValue,
          discountAmount,
          surcharge,
          totalAmount,
          productId: first.productId,
          productName: first.productName,
          color: first.color,
          size: first.size,
          quantity,
          items,
          reconciliationStatus:
            isPaidOrder(paymentStatus) ? "Đã khớp" : "Chưa xử lý",
          returned: 0,
          stockDeducted: false,
        };
        state.orders.unshift(order);
        setManualOrderStock(state, order, deliveryUsesStock(deliveryStatus));
        const shipmentSku = [...new Set(items.map((item) => item.sku))].join(
          ", ",
        );
        state.spxRows.unshift(
          spxRow(
            {
              createDate: `${orderDate}T12:00`,
              trackingCode: trackingCode || code,
              status: order.deliveryStatus,
              sku: shipmentSku,
              color: items.length === 1 ? first.color : "",
              size: items.length === 1 ? first.size : "",
              province: address,
              recipient: order.customerName,
              provider: shippingProvider,
              shippingNote,
              sourceOrderCode: code,
              orderValue: totalAmount - shippingFee,
              codAmount:
                paymentMethod === "COD" ? totalAmount - shippingFee : 0,
              shippingFee,
            },
            state.nextId++,
          ),
        );
        state.reconciliations.unshift({
          id: state.nextId++,
          orderId: id,
          orderCode: code,
          customerName: order.customerName,
          status: order.reconciliationStatus,
          discrepancyType:
            isPaidOrder(paymentStatus) ? "Khớp đủ" : "Chờ tiền về",
          expectedAmount: totalAmount,
          actualAmount: isPaidOrder(paymentStatus) ? totalAmount : 0,
          note: "",
          resolvedAt: isPaidOrder(paymentStatus) ? orderDate : undefined,
        });
        if (isPaidOrder(paymentStatus))
          state.cash.unshift({
            id: state.nextId++,
            type: "Thu",
            category: "Tiền bán hàng",
            amount: totalAmount - shippingFee,
            partner: order.customerName,
            reference: code,
            note: "Tự động từ đơn hàng",
            transactionDate: orderDate,
          });
        addAudit(
          state,
          "Đơn hàng",
          id,
          "Tạo mới",
          `${order.salesChannel} · ${code} · ${items.length} dòng · ${quantity} sản phẩm · ${totalAmount}`,
        );
      });
      return NextResponse.json({ ok: true, code });
    }

    if (action === "updateManualOrder") {
      const orderId = Number(body.orderId);
      const input = (body.order ?? {}) as OrderInput;
      let values: ReturnType<typeof validatedOrderInput>;
      try {
        values = validatedOrderInput(input);
      } catch (error) {
        return jsonError(
          error instanceof Error
            ? error.message
            : "Dữ liệu đơn hàng không hợp lệ.",
        );
      }
      const {
        surcharge,
        shippingFee,
        phone,
        address,
        shippingProvider,
        shippingNote,
        trackingCode,
        paymentMethod,
        discountType,
        discountValue,
      } = values;
      await mutateState((state) => {
        const order = state.orders.find((item) => item.id === orderId);
        if (!order || order.returned)
          throw new Error("Không tìm thấy đơn hàng có thể sửa.");
        const items = validatedOrderItems(state, input, values);
        if (
          !state.settings.shippingProviders.some(
            (provider) => provider.name === shippingProvider,
          )
        )
          throw new Error(
            "Đơn vị vận chuyển không còn tồn tại. Hãy tải lại trang và chọn lại.",
          );
        setManualOrderStock(state, order, false);
        const orderDate = text(input.orderDate) || order.orderDate;
        const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
        const discountAmount = calculateOrderDiscount(
          subtotal,
          discountType,
          discountValue,
        );
        const quantity = items.reduce((sum, item) => sum + item.quantity, 0);
        const totalAmount =
          subtotal - discountAmount + surcharge + shippingFee;
        const paymentStatus = input.paymentStatus || order.paymentStatus;
        const deliveryStatus = input.deliveryStatus || order.deliveryStatus;
        const first = items[0];
        Object.assign(order, {
          customerName: input.customerName!.trim(),
          phone,
          address,
          salesChannel: input.salesChannel || order.salesChannel,
          shippingProvider,
          shippingNote,
          trackingCode,
          shippingFee,
          deliveryStatus,
          paymentStatus,
          paymentMethod,
          orderDate,
          subtotal,
          discountType,
          discountValue,
          discountAmount,
          surcharge,
          totalAmount,
          productId: first.productId,
          productName: first.productName,
          color: first.color,
          size: first.size,
          quantity,
          items,
          reconciliationStatus:
            isPaidOrder(paymentStatus) ? "Đã khớp" : "Chưa xử lý",
        });
        setManualOrderStock(state, order, deliveryUsesStock(deliveryStatus));
        const shipmentSku = [...new Set(items.map((item) => item.sku))].join(
          ", ",
        );
        const shipment = state.spxRows.find(
          (row) => row.sourceOrderCode === order.code,
        );
        const shipmentValue = spxRow(
          {
            createDate: `${orderDate}T12:00`,
            trackingCode: trackingCode || order.code,
            status: deliveryStatus,
            sku: shipmentSku,
            color: items.length === 1 ? first.color : "",
            size: items.length === 1 ? first.size : "",
            province: address,
            recipient: order.customerName,
            provider: shippingProvider,
            shippingNote,
            sourceOrderCode: order.code,
            orderValue: totalAmount - shippingFee,
            codAmount:
              paymentMethod === "COD" ? totalAmount - shippingFee : 0,
            shippingFee,
          },
          shipment?.id || state.nextId++,
        );
        if (shipment)
          state.spxRows[state.spxRows.indexOf(shipment)] = shipmentValue;
        else state.spxRows.unshift(shipmentValue);
        const reconciliation = state.reconciliations.find(
          (item) => item.orderId === orderId,
        );
        if (reconciliation)
          Object.assign(reconciliation, {
            customerName: order.customerName,
            status: order.reconciliationStatus,
            expectedAmount: totalAmount,
            actualAmount: isPaidOrder(paymentStatus) ? totalAmount : 0,
            discrepancyType:
              isPaidOrder(paymentStatus) ? "Khớp đủ" : "Chờ tiền về",
          });
        const cashIndex = state.cash.findIndex(
          (item) => item.type === "Thu" && item.reference === order.code,
        );
        if (isPaidOrder(paymentStatus)) {
          const value = {
            id: cashIndex >= 0 ? state.cash[cashIndex].id : state.nextId++,
            type: "Thu",
            category: "Tiền bán hàng",
            amount: totalAmount - shippingFee,
            partner: order.customerName,
            reference: order.code,
            note: "Tự động từ đơn hàng",
            transactionDate: orderDate,
          };
          if (cashIndex >= 0) state.cash[cashIndex] = value;
          else state.cash.unshift(value);
        } else if (cashIndex >= 0) state.cash.splice(cashIndex, 1);
        addAudit(
          state,
          "Đơn hàng",
          orderId,
          "Sửa đơn",
          `${order.salesChannel} · ${order.code} · ${items.length} dòng · ${quantity} sản phẩm · ${totalAmount}`,
        );
      });
      return NextResponse.json({ ok: true });
    }

    if (action === "deleteManualOrder") {
      const orderId = Number(body.orderId);
      await mutateState((state) => {
        const index = state.orders.findIndex((item) => item.id === orderId);
        if (index < 0 || state.orders[index].returned)
          throw new Error("Không tìm thấy đơn hàng có thể xóa.");
        const order = state.orders[index];
        let restoredQuantity = 0;
        let skippedLegacyQuantity = 0;
        for (const item of order.items) {
          if (!order.stockDeducted) continue;
          // Older manual rows could be saved before color and size became
          // required. Their inventory target is ambiguous, so deleting them
          // must not guess a stock row or inflate the aggregate product stock.
          if (!item.color.trim() || !inventorySizeKey(item.size)) {
            skippedLegacyQuantity += item.quantity;
            continue;
          }
          adjustInventoryForOrder(state, {
            date: order.orderDate,
            sku: item.sku,
            productName: item.productName,
            color: item.color,
            size: item.size,
            quantityChange: item.quantity,
          });
          const product = state.products.find(
            (entry) => entry.id === item.productId,
          );
          if (product) product.stock += item.quantity;
          restoredQuantity += item.quantity;
        }
        state.orders.splice(index, 1);
        state.spxRows = state.spxRows.filter(
          (row) => row.sourceOrderCode !== order.code,
        );
        state.reconciliations = state.reconciliations.filter(
          (row) => row.orderId !== orderId,
        );
        state.cash = state.cash.filter((row) => row.reference !== order.code);
        state.movements = state.movements.filter(
          (row) => row.orderCode !== order.code,
        );
        addAudit(
          state,
          "Đơn hàng",
          orderId,
          "Xóa đơn",
          `${order.salesChannel} · ${order.code} · hoàn kho ${restoredQuantity}${skippedLegacyQuantity ? ` · bỏ qua hoàn kho ${skippedLegacyQuantity} sản phẩm cũ thiếu màu/size` : ""}`,
        );
      });
      return NextResponse.json({ ok: true });
    }

    if (action === "deleteProduct") {
      const productId = Number(body.productId);
      await mutateState((state) => {
        const index = state.products.findIndex((item) => item.id === productId);
        if (index < 0) throw new Error("Không tìm thấy sản phẩm.");
        const product = state.products[index];
        if (
          state.orders.some(
            (order) =>
              order.productId === productId ||
              order.items.some((item) => item.productId === productId),
          )
        )
          throw new Error(
            "Sản phẩm đã phát sinh đơn hàng nên không thể xóa. Bạn có thể điều chỉnh tồn kho về 0.",
          );
        state.products.splice(index, 1);
        state.movements = state.movements.filter(
          (movement) => movement.sku !== product.sku,
        );
        addAudit(
          state,
          "Sản phẩm",
          productId,
          "Xóa",
          `${product.sku} · ${product.name}`,
        );
      });
      return NextResponse.json({ ok: true });
    }

    if (action === "exchangeOrderSize") {
      await mutateState((state) => {
        const order = state.orders.find((row) => row.id === Number(body.orderId));
        if (!order || order.returned) throw new Error("Không tìm thấy đơn có thể đổi size.");
        if (order.stockDeducted === false)
          throw new Error("Đơn đang chờ lấy hàng nên chưa trừ kho và chưa thể đổi size.");
        const index = Number(body.itemIndex);
        const item = order.items[index];
        const quantity = Number(body.quantity);
        const newSize = displaySize(text(body.newSize));
        if (!Number.isInteger(index) || !item || !Number.isInteger(quantity) || quantity < 1 || quantity > item.quantity)
          throw new Error("Số lượng đổi không hợp lệ.");
        if (item.size !== text(body.oldSize)) throw new Error("Đơn đã thay đổi. Hãy tải lại và chọn lại sản phẩm.");
        if (!inventorySizeKey(newSize) || inventorySizeKey(newSize) === inventorySizeKey(item.size))
          throw new Error("Hãy chọn size nhận khác size trả.");
        if (!state.inventoryRows.length) throw new Error("Chưa có bảng tồn kho để đổi size.");
        const oldSize = item.size;
        const stockInput = { date: nowIso(), sku: item.sku, productName: item.productName, color: item.color };
        adjustInventoryForOrder(state, { ...stockInput, size: oldSize, quantityChange: quantity });
        adjustInventoryForOrder(state, { ...stockInput, size: newSize, quantityChange: -quantity });
        if (quantity === item.quantity) item.size = newSize;
        else {
          item.quantity -= quantity;
          item.lineTotal = item.unitPrice * item.quantity;
          order.items.splice(index + 1, 0, { ...item, size: newSize, quantity, lineTotal: item.unitPrice * quantity });
        }
        order.size = order.items.map((row) => row.size).join(", ");
        for (const [size, delta] of [[oldSize, quantity], [newSize, -quantity]] as const)
          state.movements.unshift({ id: state.nextId++, ...stockInput, size, quantityChange: delta, reason: "Đổi size", createdAt: nowIso(), orderCode: order.code, note: text(body.note) });
        addAudit(state, "Đơn hàng", order.id, "Đổi size", `${order.code} · ${item.sku} · ${item.productName} · ${item.color} · ${oldSize} → ${newSize} × ${quantity} · ${text(body.note)}`);
      });
      return NextResponse.json({ ok: true });
    }

    if (action === "updateOrder") {
      const orderId = Number(body.orderId);
      const deliveryStatus = String(body.deliveryStatus || "");
      const paymentStatus = String(body.paymentStatus || "");
      if (!deliveryStatus || !paymentStatus)
        return jsonError("Trạng thái không hợp lệ.");
      await mutateState((state) => {
        const order = state.orders.find((item) => item.id === orderId);
        if (!order) throw new Error("Không tìm thấy đơn hàng.");
        setManualOrderStock(
          state,
          order,
          deliveryUsesStock(deliveryStatus),
        );
        order.deliveryStatus = deliveryStatus;
        order.paymentStatus = paymentStatus;
        order.reconciliationStatus =
          isPaidOrder(paymentStatus) ? "Đã khớp" : "Chưa xử lý";
        const shipment = state.spxRows.find(
          (row) => row.sourceOrderCode === order.code,
        );
        if (shipment) shipment.status = deliveryStatus;
        const reconciliation = state.reconciliations.find(
          (item) => item.orderId === orderId,
        );
        if (reconciliation)
          Object.assign(reconciliation, {
            status: order.reconciliationStatus,
            discrepancyType:
              isPaidOrder(paymentStatus) ? "Khớp đủ" : "Chờ tiền về",
            actualAmount: isPaidOrder(paymentStatus) ? order.totalAmount : 0,
            resolvedAt: isPaidOrder(paymentStatus) ? nowIso() : undefined,
          });
        const cashIndex = state.cash.findIndex(
          (item) =>
            item.type === "Thu" &&
            item.reference === order.code &&
            item.note === "Tự động từ đơn hàng",
        );
        if (isPaidOrder(paymentStatus)) {
          const income = {
            id: cashIndex >= 0 ? state.cash[cashIndex].id : state.nextId++,
            type: "Thu",
            category: "Tiền bán hàng",
            amount: manualOrderRevenue(order),
            partner: order.customerName,
            reference: order.code,
            note: "Tự động từ đơn hàng",
            transactionDate: nowIso(),
          };
          if (cashIndex >= 0) state.cash[cashIndex] = income;
          else state.cash.unshift(income);
        } else if (cashIndex >= 0) state.cash.splice(cashIndex, 1);
        addAudit(
          state,
          "Đơn hàng",
          orderId,
          "Cập nhật trạng thái",
          `${deliveryStatus} · ${paymentStatus}`,
        );
      });
      return NextResponse.json({ ok: true });
    }

    if (action === "adjustStock") {
      const productId = Number(body.productId);
      const quantityChange = Number(body.quantityChange);
      const reason = String(body.reason || "Điều chỉnh kho").trim();
      if (!Number.isInteger(quantityChange) || quantityChange === 0)
        return jsonError("Số lượng điều chỉnh không hợp lệ.");
      await mutateState((state) => {
        const product = state.products.find((item) => item.id === productId);
        if (!product || product.stock + quantityChange < 0)
          throw new Error("Điều chỉnh này sẽ làm tồn kho âm.");
        product.stock += quantityChange;
        state.movements.unshift({
          id: state.nextId++,
          quantityChange,
          reason,
          createdAt: nowIso(),
          sku: product.sku,
          productName: product.name,
        });
        addAudit(
          state,
          "Sản phẩm",
          productId,
          "Điều chỉnh kho",
          `${quantityChange > 0 ? "+" : ""}${quantityChange} · ${reason}`,
        );
      });
      return NextResponse.json({ ok: true });
    }

    if (action === "recordInventoryChange") {
      const entry = (body.entry ?? {}) as Record<string, unknown>;
      const eventType = text(entry.eventType);
      const transactionDate = text(entry.transactionDate);
      const sku = text(entry.sku).toUpperCase();
      const itemType = text(entry.itemType);
      const color = text(entry.color);
      const size = displaySize(text(entry.size));
      const quantity = amount(entry.quantity);
      const note = text(entry.note).slice(0, 300);
      const orderCode = text(entry.orderCode).slice(0, 100);
      if (
        !["Hoàn hàng", "Nhập hàng", "Hàng lỗi"].includes(eventType) ||
        !/^\d{4}-\d{2}-\d{2}$/.test(transactionDate) ||
        !sku ||
        !itemType ||
        (eventType === "Hàng lỗi" && !color) ||
        !["S", "M", "L", "Free size", "Oversize"].includes(size) ||
        !Number.isInteger(quantity) ||
        quantity < 1
      )
        return jsonError(
          "Vui lòng nhập đủ ngày, mã hàng, size và số lượng hợp lệ.",
        );
      await mutateState((state) => {
        let dayRows = state.inventoryRows.filter(
          (row) => row.snapshotDate === transactionDate,
        );
        if (!dayRows.length) {
          const sourceDate = state.inventoryRows.reduce(
            (latest, row) =>
              row.snapshotDate < transactionDate && row.snapshotDate > latest
                ? row.snapshotDate
                : latest,
            "",
          );
          if (sourceDate) {
            dayRows = state.inventoryRows
              .filter((row) => row.snapshotDate === sourceDate)
              .map((row) => ({
                ...row,
                id: state.nextId++,
                snapshotDate: transactionDate,
              }));
            state.inventoryRows.unshift(...dayRows);
          }
        }
        const sameColor = (value: string) =>
          catalogIdentityKey("", value) === catalogIdentityKey("", color);
        const requestedKey = productPriceKey(sku, itemType);
        const fullSetDefinition =
          requestedKey === "S001:full-set"
            ? {
                keys: ["S001:ao", "S001:chan-vay"],
                label: "Áo và Chân váy",
              }
            : requestedKey === "S002:full-set"
              ? {
                  keys: ["S002:ao", "S002:quan"],
                  label: "Áo và Quần",
                }
              : null;
        let inventories = fullSetDefinition
          ? fullSetDefinition.keys.map((key) =>
              dayRows.find(
                (row) =>
                  row.sku === sku &&
                  sameColor(row.color) &&
                  productPriceKey(row.sku, row.itemType) === key,
              ),
            )
          : [
              dayRows.find(
                (row) =>
                  row.sku === sku &&
                  catalogIdentityKey(row.sku, row.itemType) ===
                    catalogIdentityKey(sku, itemType) &&
                  sameColor(row.color),
              ),
            ];
        if (!fullSetDefinition && !inventories[0]) {
          const candidates = dayRows.filter(
            (row) => row.sku === sku && sameColor(row.color) &&
              (productPriceKey(row.sku, row.itemType) === requestedKey ||
                (!row.itemType.trim() && state.catalogRows.filter((item) => item.sku === sku).length === 1)),
          );
          if (candidates.length === 1) inventories = [candidates[0]];
        }
        if (inventories.some((inventory) => !inventory)) {
          if (fullSetDefinition)
            throw new Error(
              `Không tìm thấy đủ ${fullSetDefinition.label} ${sku} · ${color} trong bảng kho ngày ${transactionDate}.`,
            );
          throw new Error("Không tìm thấy đúng mã, loại sản phẩm và màu trong kho của ngày này. Hãy chọn biến thể đã có trong bảng kiểm kho; hệ thống không tự tạo sản phẩm mới.");
        }
        const sizeKey = (
          {
            S: "sizeS",
            M: "sizeM",
            L: "sizeL",
            "Free size": "freeSize",
            Oversize: "oversize",
          } as const
        )[size as "S" | "M" | "L" | "Free size" | "Oversize"];
        const quantityChange = eventType === "Hàng lỗi" ? -quantity : quantity;
        const resolvedInventories = inventories.filter(
          (inventory): inventory is InventoryRow => Boolean(inventory),
        );
        if (
          resolvedInventories.some(
            (inventory) => inventory[sizeKey] + quantityChange < 0,
          )
        )
          throw new Error("Số lượng hàng lỗi vượt quá tồn kho hiện có.");
        for (const inventory of resolvedInventories) {
          inventory[sizeKey] += quantityChange;
          inventory.total += quantityChange;
          const product = state.products.find(
            (row) =>
              row.sku === sku &&
              sameColor(row.color) &&
              displaySize(row.size) === size &&
              productPriceKey(row.sku, row.name) ===
                productPriceKey(inventory.sku, inventory.itemType),
          );
          if (product)
            product.stock = Math.max(0, product.stock + quantityChange);
        }
        const inventory = resolvedInventories[0];
        const productName = fullSetDefinition ? "Full set" : inventory.itemType || itemType || "Sản phẩm";
        state.movements.unshift({
          id: state.nextId++,
          quantityChange,
          reason: eventType,
          createdAt: `${transactionDate}T12:00:00.000Z`,
          sku,
          productName,
          color: color || inventory.color,
          size,
          orderCode,
          note,
        });
        addAudit(
          state,
          "Kho hàng",
          inventory.id,
          eventType,
          `${sku} · ${itemType} · ${color || inventory.color || "không màu"} · ${size} ${quantityChange > 0 ? "+" : ""}${quantityChange}${note ? ` · ${note}` : ""}`,
        );
      });
      return NextResponse.json({ ok: true, snapshotDate: transactionDate });
    }

    if (action === "deleteInventoryChange") {
      const movementId = amount(body.movementId);
      await mutateState((state) => {
        const movementIndex = state.movements.findIndex(
          (item) => item.id === movementId,
        );
        const movement = state.movements[movementIndex];
        if (
          !movement ||
          !["Hoàn hàng", "Nhập hàng", "Hàng lỗi"].includes(movement.reason)
        )
          throw new Error("Không tìm thấy lần ghi nhận kho cần xóa.");
        const transactionDate = movement.createdAt.slice(0, 10);
        const sameColor = (value: string) =>
          !movement.color ||
          value.toLocaleLowerCase("vi") ===
            movement.color.toLocaleLowerCase("vi");
        const movementKey = productPriceKey(
          movement.sku,
          movement.productName,
        );
        const fullSetKeys =
          movementKey === "S001:full-set"
            ? ["S001:ao", "S001:chan-vay"]
            : movementKey === "S002:full-set"
              ? ["S002:ao", "S002:quan"]
              : [];
        const inventories = fullSetKeys.length
          ? fullSetKeys.map((key) =>
              state.inventoryRows.find(
                (row) =>
                  row.snapshotDate === transactionDate &&
                  row.sku === movement.sku &&
                  sameColor(row.color) &&
                  productPriceKey(row.sku, row.itemType) === key,
              ),
            )
          : [
              state.inventoryRows.find(
                (row) =>
                  row.snapshotDate === transactionDate &&
                  row.sku === movement.sku &&
                  sameColor(row.color) &&
                  productPriceKey(row.sku, row.itemType) === movementKey,
              ) ||
                state.inventoryRows.find(
                  (row) =>
                    row.snapshotDate === transactionDate &&
                    row.sku === movement.sku &&
                    sameColor(row.color),
                ),
            ];
        if (inventories.some((inventory) => !inventory))
          throw new Error("Không tìm thấy dòng tồn kho để hoàn tác.");
        const movementSize = displaySize(text(movement.size));
        const sizeKey = (
          {
            S: "sizeS",
            M: "sizeM",
            L: "sizeL",
            "Free size": "freeSize",
            Oversize: "oversize",
          } as const
        )[movementSize as "S" | "M" | "L" | "Free size" | "Oversize"];
        if (!sizeKey) throw new Error("Size của lần ghi nhận không hợp lệ.");
        const reversal = -movement.quantityChange;
        const resolvedInventories = inventories.filter(
          (inventory): inventory is InventoryRow => Boolean(inventory),
        );
        if (
          resolvedInventories.some(
            (inventory) => inventory[sizeKey] + reversal < 0,
          )
        )
          throw new Error("Không thể hoàn tác vì tồn kho hiện tại không đủ.");
        for (const inventory of resolvedInventories) {
          inventory[sizeKey] += reversal;
          inventory.total += reversal;
          const product = state.products.find(
            (row) =>
              row.sku === movement.sku &&
              sameColor(row.color) &&
              displaySize(row.size) === movementSize &&
              productPriceKey(row.sku, row.name) ===
                productPriceKey(inventory.sku, inventory.itemType),
          );
          if (product && product.stock + reversal >= 0)
            product.stock += reversal;
        }
        const inventory = resolvedInventories[0];
        state.movements.splice(movementIndex, 1);
        addAudit(
          state,
          "Kho hàng",
          inventory.id,
          `Xóa ${movement.reason.toLowerCase()}`,
          `${movement.sku} · ${movement.productName} · ${movement.color || inventory.color || "không màu"} · ${movementSize} ${reversal > 0 ? "+" : ""}${reversal}`,
        );
      });
      return NextResponse.json({ ok: true });
    }

    if (action === "createCash") {
      const input = (body.cash ?? {}) as CashInput;
      const amount = Number(input.amount);
      const type = input.type || "";
      if (
        !isCashFlowType(type) ||
        !input.category?.trim() ||
        !Number.isInteger(amount) ||
        amount <= 0
      )
        return jsonError("Vui lòng nhập loại, nhóm và số tiền hợp lệ.");
      await mutateState((state) => {
        const id = state.nextId++;
        state.cash.unshift({
          id,
          type,
          category: input.category!.trim(),
          amount,
          partner: input.partner?.trim() || "",
          reference: input.reference?.trim() || "",
          note: input.note?.trim() || "",
          transactionDate: input.transactionDate || nowIso(),
        });
        addAudit(state, "Thu chi", id, "Tạo giao dịch", `${type} · ${amount}`);
      });
      return NextResponse.json({ ok: true });
    }

    if (action === "reconcile") {
      const orderId = Number(body.orderId);
      const status = String(body.status || "Chưa xử lý");
      const actualAmount = Number(body.actualAmount) || 0;
      const note = String(body.note || "");
      await mutateState((state) => {
        const order = state.orders.find((item) => item.id === orderId);
        const reconciliation = state.reconciliations.find(
          (item) => item.orderId === orderId,
        );
        if (!order || !reconciliation)
          throw new Error("Không tìm thấy đơn hàng.");
        const discrepancyType =
          actualAmount === order.totalAmount
            ? "Khớp đủ"
            : actualAmount === 0
              ? "Chờ tiền về"
              : "Lệch số tiền";
        Object.assign(reconciliation, {
          status,
          discrepancyType,
          actualAmount,
          note,
          resolvedAt:
            status === "Đã xử lý" || status === "Đã khớp"
              ? nowIso()
              : undefined,
        });
        order.reconciliationStatus = status;
        addAudit(
          state,
          "Đối soát",
          orderId,
          "Cập nhật",
          `${status} · thực nhận ${actualAmount}`,
        );
      });
      return NextResponse.json({ ok: true });
    }

    if (action === "returnOrder") {
      const orderId = Number(body.orderId);
      const refundAmount = Number(body.refundAmount) || 0;
      const reason = String(body.reason || "Khách trả hàng");
      const requestedReturnDate = text(body.returnDate);
      await mutateState((state) => {
        const order = state.orders.find((item) => item.id === orderId);
        if (!order || order.returned)
          throw new Error("Đơn hàng không tồn tại hoặc đã được hoàn trước đó.");
        const returnDate = /^\d{4}-\d{2}-\d{2}$/.test(requestedReturnDate)
          ? requestedReturnDate
          : nowIso().slice(0, 10);
        const restoredStock = order.stockDeducted;
        const previousDeliveryStatus = order.deliveryStatus;
        const previousPaymentStatus = order.paymentStatus;
        const shipment = state.spxRows.find(
          (row) => row.sourceOrderCode === order.code,
        );
        const previousShipmentStatus = shipment?.status || "";
        if (restoredStock)
          for (const item of order.items) {
            adjustInventoryForOrder(state, {
              date: returnDate,
              sku: item.sku,
              productName: item.productName,
              color: item.color,
              size: item.size,
              quantityChange: item.quantity,
            });
            const product = state.products.find(
              (entry) => entry.id === item.productId,
            );
            if (product) product.stock += item.quantity;
          }
        order.stockDeducted = false;
        state.movements = state.movements.filter(
          (movement) =>
            movement.orderCode !== order.code || movement.reason !== "Bán hàng",
        );
        order.returned = 1;
        order.deliveryStatus = "Hoàn hàng";
        order.paymentStatus = refundAmount > 0 ? "Đã hoàn tiền" : "Chờ hoàn";
        const automaticIncome = state.cash.find(
          (entry) =>
            entry.type === "Thu" &&
            entry.reference === order.code &&
            entry.note === "Tự động từ đơn hàng",
        );
        if (automaticIncome) automaticIncome.amount = 0;
        if (shipment) shipment.status = "Hoàn hàng";
        state.returns.unshift({
          id: state.nextId++,
          orderId,
          orderCode: order.code,
          quantity: order.quantity,
          refundAmount,
          reason,
          createdAt: `${returnDate}T12:00:00.000Z`,
          source: "manual",
          previousDeliveryStatus,
          previousPaymentStatus,
          previousStockDeducted: restoredStock,
          previousShipmentStatus,
        });
        if (restoredStock)
          for (const item of order.items)
            state.movements.unshift({
              id: state.nextId++,
              quantityChange: item.quantity,
              reason: "Hoàn hàng",
              createdAt: `${returnDate}T12:00:00.000Z`,
              sku: item.sku,
              productName: item.productName,
              color: item.color,
              size: item.size,
              orderCode: order.code,
            });
        if (refundAmount > 0)
          state.cash.unshift({
            id: state.nextId++,
            type: "Chi",
            category: "Hoàn tiền khách",
            amount: refundAmount,
            partner: order.customerName,
            reference: `HOAN-${order.code}`,
            note: reason,
            transactionDate: `${returnDate}T12:00:00.000Z`,
          });
        addAudit(
          state,
          "Đơn hàng",
          orderId,
          "Hoàn hàng",
          `${order.quantity} sản phẩm · hoàn ${refundAmount}`,
        );
      });
      return NextResponse.json({ ok: true });
    }

    if (action === "returnShopeeOrder") {
      const rowId = amount(body.rowId);
      const reason = text(body.reason) || "Khách trả hàng";
      const requestedReturnDate = text(body.returnDate);
      await mutateState((state) => {
        const selected = state.shopeeRows.find((row) => row.id === rowId);
        if (!selected) throw new Error("Không tìm thấy đơn Shopee.");
        const key = shopeeOrderKey(selected);
        const orderRows = state.shopeeRows.filter(
          (row) => shopeeOrderKey(row) === key,
        );
        if (
          orderRows.some((row) => returnedShopeeStatus(row.orderStatus))
        )
          throw new Error("Đơn Shopee này đã được hoàn trước đó.");
        const returnDate = /^\d{4}-\d{2}-\d{2}$/.test(requestedReturnDate)
          ? requestedReturnDate
          : nowIso().slice(0, 10);
        const previousShopeeRows = orderRows.map((row) => ({
          id: row.id,
          orderStatus: row.orderStatus,
          stockDeducted: row.stockDeducted,
        }));
        let restoredQuantity = 0;
        for (const row of orderRows) {
          if (row.stockDeducted && adjustInventoryForShopeeRow(state, row, 1)) {
            restoredQuantity += row.quantity;
            state.movements.unshift({
              id: state.nextId++,
              quantityChange: row.quantity,
              reason: "Hoàn hàng",
              createdAt: `${returnDate}T12:00:00.000Z`,
              sku: row.sku,
              productName: row.productName,
              color: row.color,
              size: row.size,
              orderCode: selected.orderCode || selected.trackingCode,
              note: reason,
            });
          }
          row.orderStatus = "Đã hoàn";
          row.netOrderValue = 0;
          row.stockDeducted = false;
          row.stockIssue = "Đơn đã hoàn — không tính doanh thu";
        }
        state.returns.unshift({
          id: state.nextId++,
          orderId: selected.id,
          orderCode: selected.orderCode || selected.trackingCode || String(selected.id),
          quantity: orderRows.reduce((sum, row) => sum + row.quantity, 0),
          refundAmount: 0,
          reason,
          createdAt: `${returnDate}T12:00:00.000Z`,
          source: "shopee",
          previousShopeeRows,
        });
        addAudit(
          state,
          "Đơn Shopee",
          selected.id,
          "Hoàn hàng",
          `${selected.orderCode || selected.trackingCode || selected.id} · trả kho ${restoredQuantity} sản phẩm · trừ toàn bộ tiền đơn`,
        );
      });
      return NextResponse.json({ ok: true });
    }

    if (action === "deleteOrderReturn") {
      const returnId = amount(body.returnId);
      await mutateState((state) => {
        const returnIndex = state.returns.findIndex(
          (item) => item.id === returnId,
        );
        const returnedOrder = state.returns[returnIndex];
        if (!returnedOrder)
          throw new Error("Không tìm thấy lần hoàn đơn cần xóa.");
        if (returnedOrder.source === "manual") {
          const order = state.orders.find(
            (item) => item.id === returnedOrder.orderId,
          );
          if (!order || !order.returned)
            throw new Error("Không tìm thấy đơn đã hoàn để khôi phục.");
          if (
            returnedOrder.previousDeliveryStatus === undefined ||
            returnedOrder.previousPaymentStatus === undefined
          )
            throw new Error(
              "Lần hoàn cũ này chưa có đủ trạng thái để khôi phục tự động.",
            );
          order.returned = 0;
          order.deliveryStatus = returnedOrder.previousDeliveryStatus;
          order.paymentStatus = returnedOrder.previousPaymentStatus;
          order.stockDeducted = false;
          if (returnedOrder.previousStockDeducted)
            setManualOrderStock(state, order, true);
          const automaticIncome = state.cash.find(
            (entry) =>
              entry.type === "Thu" &&
              entry.reference === order.code &&
              entry.note === "Tự động từ đơn hàng",
          );
          if (automaticIncome)
            automaticIncome.amount = manualOrderRevenue(order);
          const shipment = state.spxRows.find(
            (row) => row.sourceOrderCode === order.code,
          );
          if (shipment && returnedOrder.previousShipmentStatus !== undefined)
            shipment.status = returnedOrder.previousShipmentStatus;
          state.cash = state.cash.filter(
            (entry) => entry.reference !== `HOAN-${order.code}`,
          );
        } else if (returnedOrder.source === "shopee") {
          if (!returnedOrder.previousShopeeRows?.length)
            throw new Error(
              "Lần hoàn Shopee này chưa có đủ trạng thái để khôi phục tự động.",
            );
          for (const previous of returnedOrder.previousShopeeRows) {
            const row = state.shopeeRows.find((item) => item.id === previous.id);
            if (!row)
              throw new Error("Không tìm thấy đủ sản phẩm của đơn Shopee.");
            row.orderStatus = previous.orderStatus;
            row.stockDeducted = false;
            row.stockIssue = "";
            if (previous.stockDeducted)
              adjustInventoryForShopeeRow(state, row, -1);
          }
          refreshShopeeNetValues(state.shopeeRows);
        } else {
          throw new Error(
            "Lần hoàn cũ này chưa hỗ trợ khôi phục tự động.",
          );
        }
        state.movements = state.movements.filter(
          (movement) =>
            !(
              movement.reason === "Hoàn hàng" &&
              movement.orderCode === returnedOrder.orderCode &&
              movement.createdAt === returnedOrder.createdAt
            ),
        );
        state.returns.splice(returnIndex, 1);
        addAudit(
          state,
          returnedOrder.source === "shopee" ? "Đơn Shopee" : "Đơn hàng",
          returnedOrder.orderId,
          "Xóa hoàn hàng",
          `${returnedOrder.orderCode} · khôi phục đơn và doanh thu`,
        );
      });
      return NextResponse.json({ ok: true });
    }

    if (action === "deleteShopeeOrder") {
      await mutateState((state) => {
        const selected = state.shopeeRows.find((row) => row.id === amount(body.rowId));
        if (!selected) throw new Error("Không tìm thấy đơn Shopee.");
        const code = shopeeOrderKey(selected);
        const month = selected.orderDate.slice(0, 7);
        const removed = state.shopeeRows.filter(
          (row) =>
            shopeeOrderKey(row) === code && row.orderDate.startsWith(month),
        );
        for (const row of removed)
          if (row.stockDeducted) adjustInventoryForShopeeRow(state, row, 1);
        state.shopeeRows = state.shopeeRows.filter(
          (row) =>
            !(
              shopeeOrderKey(row) === code &&
              row.orderDate.startsWith(month)
            ),
        );
        addAudit(state, "Đơn hàng", selected.id, "Xóa đơn Shopee", code);
      });
      return NextResponse.json({ ok: true });
    }

    if (action === "saveWorkbookRow") {
      const sheet = text(body.sheet);
      const input = (body.row ?? {}) as Record<string, unknown>;
      const requestedId = amount(input.id);
      if (requestedId && (sheet === "shopee" || sheet === "inventory")) {
        const { data } = await readState();
        const existingMonth =
          sheet === "shopee"
            ? monthFrom(
                data.shopeeRows.find((row) => row.id === requestedId)
                  ?.orderDate,
              )
            : monthFrom(
                data.inventoryRows.find((row) => row.id === requestedId)
                  ?.snapshotDate,
              );
        const nextMonth =
          sheet === "shopee"
            ? monthFrom(input.orderDate)
            : monthFrom(input.snapshotDate);
        if (existingMonth && nextMonth && existingMonth !== nextMonth)
          return jsonError(
            "Không thể chuyển một dòng dữ liệu sang tháng khác. Hãy tạo dòng mới ở tháng cần ghi nhận.",
          );
      }
      let savedId = 0;
      await mutateState((state) => {
        const save = <T extends { id: number }>(rows: T[], value: T) => {
          const index = rows.findIndex((row) => row.id === requestedId);
          if (index >= 0) rows[index] = value;
          else rows.unshift(value);
        };
        savedId = requestedId || state.nextId++;
        if (sheet === "shopee") {
          const existing = state.shopeeRows.find((row) => row.id === requestedId);
          if (existing?.stockDeducted)
            adjustInventoryForShopeeRow(state, existing, 1);
          const updated = shopeeRow(input, savedId);
          updated.stockDeducted = false;
          updated.stockIssue = "";
          adjustInventoryForShopeeRow(state, updated, -1);
          save(state.shopeeRows, updated);
          refreshShopeeNetValues(state.shopeeRows);
        }
        else if (sheet === "spx") save(state.spxRows, spxRow(input, savedId));
        else if (sheet === "inventory")
          save(state.inventoryRows, inventoryRow(input, savedId));
        else if (sheet === "catalog") {
          const updatedCatalog = catalogRow(input, savedId);
          save(state.catalogRows, updatedCatalog);
          const updatedKey = catalogIdentityKey(
            updatedCatalog.sku,
            updatedCatalog.name,
          );
          const matchingCatalogRows = state.catalogRows.filter(
            (row) => row.sku === updatedCatalog.sku,
          );
          if (matchingCatalogRows.length === 1) {
            const product = state.products.find(
              (row) => row.sku === updatedCatalog.sku,
            );
            if (product) product.salePrice = updatedCatalog.price;
          }
          for (const order of state.orders) {
            let changed = false;
            for (const item of order.items) {
              if (catalogIdentityKey(item.sku, item.productName) !== updatedKey)
                continue;
              item.unitPrice = updatedCatalog.price;
              item.lineTotal = updatedCatalog.price * item.quantity;
              changed = true;
            }
            if (!changed) continue;
            order.subtotal = order.items.reduce(
              (sum, item) => sum + item.lineTotal,
              0,
            );
            order.discountAmount = calculateOrderDiscount(
              order.subtotal,
              order.discountType,
              order.discountValue,
            );
            order.totalAmount =
              order.subtotal -
              order.discountAmount +
              order.surcharge +
              order.shippingFee;
            const first = order.items[0];
            if (first) {
              order.productId = first.productId;
              order.productName = first.productName;
              order.color = first.color;
              order.size = first.size;
            }
            const shipment = state.spxRows.find(
              (row) => row.sourceOrderCode === order.code,
            );
            if (shipment) {
              shipment.orderValue = order.totalAmount - order.shippingFee;
              if (order.paymentMethod === "COD")
                shipment.codAmount = order.totalAmount - order.shippingFee;
              shipment.total = spxReceivable(shipment);
            }
            const reconciliation = state.reconciliations.find(
              (row) => row.orderId === order.id,
            );
            if (reconciliation)
              reconciliation.expectedAmount = order.totalAmount;
            const cash = state.cash.find(
              (row) =>
                row.type === "Thu" &&
                row.reference === order.code &&
                row.note === "Tự động từ đơn hàng",
            );
            if (cash) cash.amount = manualOrderRevenue(order);
          }
        } else throw new Error("Bảng dữ liệu không hợp lệ.");
        const entityName =
          sheet === "shopee"
            ? `Đơn hàng · ${state.settings.orderChannels.find((option) => option.id === "shopee")?.name || "Shopee"}`
            : sheet === "spx"
              ? `Vận chuyển · ${text(input.provider) || "SPX"}`
              : sheet === "inventory"
                ? "Kho hàng"
                : "Mã sản phẩm";
        addAudit(
          state,
          entityName,
          savedId,
          requestedId ? "Sửa dòng" : "Thêm dòng",
          sheet === "spx"
            ? text(input.trackingCode) || "Vận đơn"
            : text(input.sku) || sheet.toUpperCase(),
        );
      });
      return NextResponse.json({ ok: true, id: savedId });
    }

    if (action === "startInventoryCheck") {
      const snapshotDate = text(body.snapshotDate);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(snapshotDate))
        return jsonError("Ngày kiểm kho không hợp lệ.");
      let count = 0;
      let sourceDate = "";
      await mutateState((state) => {
        if (
          state.inventoryRows.some((row) => row.snapshotDate === snapshotDate)
        )
          throw new Error("Ngày này đã có bảng kiểm kho.");
        sourceDate = state.inventoryRows.reduce(
          (latest, row) =>
            row.snapshotDate < snapshotDate && row.snapshotDate > latest
              ? row.snapshotDate
              : latest,
          "",
        );
        if (!sourceDate)
          throw new Error(
            "Chưa có bản kiểm kho trước đó để tạo bảng mới. Hãy thêm dòng đầu tiên thủ công.",
          );
        const sourceRows = state.inventoryRows.filter(
          (row) => row.snapshotDate === sourceDate,
        );
        const copies = sourceRows.map((row) => {
          const descriptor = `${row.itemType} ${row.note}`;
          const noRecordedSizes =
            row.sizeS + row.sizeM + row.sizeL + row.freeSize + row.oversize ===
            0;
          return {
            ...row,
            id: state.nextId++,
            snapshotDate,
            freeSize:
              noRecordedSizes && /free\s*size/i.test(descriptor)
                ? row.total
                : row.freeSize,
            oversize:
              noRecordedSizes && /over\s*size|oversize/i.test(descriptor)
                ? row.total
                : row.oversize,
          };
        });
        state.inventoryRows.unshift(...copies);
        count = copies.length;
        addAudit(
          state,
          "Kiểm kho",
          0,
          "Tạo bảng ngày",
          `${snapshotDate} · sao chép ${count} dòng từ ${sourceDate}`,
        );
      });
      return NextResponse.json({ ok: true, count, sourceDate });
    }

    if (action === "deleteWorkbookRow") {
      const sheet = text(body.sheet);
      const rowId = amount(body.rowId);
      await mutateState((state) => {
        const remove = <T extends { id: number }>(rows: T[]) => {
          const index = rows.findIndex((row) => row.id === rowId);
          if (index < 0) throw new Error("Không tìm thấy dòng dữ liệu.");
          rows.splice(index, 1);
        };
        if (sheet === "shopee") remove(state.shopeeRows);
        else if (sheet === "spx") remove(state.spxRows);
        else if (sheet === "inventory") remove(state.inventoryRows);
        else if (sheet === "catalog") remove(state.catalogRows);
        else throw new Error("Bảng dữ liệu không hợp lệ.");
        const entityName =
          sheet === "shopee"
            ? `Đơn hàng · ${state.settings.orderChannels.find((option) => option.id === "shopee")?.name || "Shopee"}`
            : sheet === "spx"
              ? "Vận chuyển"
              : sheet === "inventory"
                ? "Kho hàng"
                : "Mã sản phẩm";
        addAudit(state, entityName, rowId, "Xóa dòng", sheet.toUpperCase());
      });
      return NextResponse.json({ ok: true });
    }

    if (action === "importWorkbookData") {
      const shopee = Array.isArray(body.shopeeRows)
        ? (body.shopeeRows.slice(0, 500) as Record<string, unknown>[])
        : [];
      const spx = Array.isArray(body.spxRows)
        ? (body.spxRows.slice(0, 500) as Record<string, unknown>[])
        : [];
      const inventory = Array.isArray(body.inventoryRows)
        ? (body.inventoryRows.slice(0, 500) as Record<string, unknown>[])
        : [];
      const catalog = Array.isArray(body.catalogRows)
        ? (body.catalogRows.slice(0, 500) as Record<string, unknown>[])
        : [];
      await mutateState((state) => {
        const spxProvider =
          state.settings.shippingProviders.find((option) => option.id === "spx")
            ?.name || "SPX";
        state.shopeeRows = shopee.map((row) => shopeeRow(row, state.nextId++));
        state.spxRows = spx.map((row) =>
          spxRow(
            { ...row, provider: text(row.provider) || spxProvider },
            state.nextId++,
          ),
        );
        state.inventoryRows = inventory.map((row) =>
          inventoryRow(row, state.nextId++),
        );
        state.catalogRows = catalog.map((row) =>
          catalogRow(row, state.nextId++),
        );
        const latestSnapshot = state.inventoryRows.reduce(
          (latest, row) =>
            row.snapshotDate > latest ? row.snapshotDate : latest,
          "",
        );
        const stockBySku = state.inventoryRows
          .filter((row) => row.snapshotDate === latestSnapshot)
          .reduce<Record<string, number>>((result, row) => {
            if (row.sku) result[row.sku] = (result[row.sku] || 0) + row.total;
            return result;
          }, {});
        if (!state.products.length)
          state.products = state.catalogRows.map((row) => ({
            id: state.nextId++,
            sku: row.sku,
            name: row.name,
            color: "",
            size: "",
            salePrice: row.price,
            stock: stockBySku[row.sku] || 0,
            lowStockThreshold: 5,
          }));
        addAudit(
          state,
          "Dữ liệu hệ thống",
          0,
          "Nhập dữ liệu",
          `${state.shopeeRows.length} dòng Shopee · ${state.spxRows.length} dòng vận chuyển · ${state.inventoryRows.length} dòng tồn kho · ${state.catalogRows.length} mã hàng`,
        );
      });
      return NextResponse.json({
        ok: true,
        counts: {
          shopee: shopee.length,
          spx: spx.length,
          inventory: inventory.length,
          catalog: catalog.length,
        },
      });
    }

    if (action === "importMonthlyWorkbookRows") {
      if (Array.isArray(body.rows) && body.rows.length > 2000)
        return jsonError("File vượt 2.000 dòng. Hãy chia file để nhập đầy đủ, không bị cắt dữ liệu.");
      const sheet = text(body.sheet);
      const month = monthFrom(body.editingMonth);
      const rows = Array.isArray(body.rows)
        ? (body.rows.slice(0, 2000) as Record<string, unknown>[])
        : [];
      if (!month || !["shopee", "spx"].includes(sheet) || !rows.length)
        return jsonError("Tệp không có dữ liệu hợp lệ để nhập.");
      let imported = 0;
      await mutateState((state) => {
        if (sheet === "shopee") {
          const parsedRows = rows.map((row) => shopeeRow(row, state.nextId++));
          const trackingDates = new Map(
            parsedRows
              .filter((row) => (row.orderCode || row.trackingCode) && row.orderDate)
              .map((row) => [row.orderCode || row.trackingCode, row.orderDate]),
          );
          for (const row of parsedRows)
            if (!row.orderDate)
              row.orderDate = trackingDates.get(row.orderCode || row.trackingCode) || "";
          const parsed = parsedRows.filter(
            (row) =>
              row.orderDate.startsWith(month) &&
              (row.trackingCode || row.productName),
          );
          if (!parsed.length)
            throw new Error(
              `Không tìm thấy đơn hàng thuộc tháng ${month.slice(5, 7)}/${month.slice(0, 4)}.`,
            );
          if (parsed.some((row) => !row.orderCode && !row.trackingCode))
            throw new Error("File cần có mã đơn hàng hoặc mã vận đơn cho mọi sản phẩm để tránh nhập trùng.");
          const incomingCodes = new Set(parsed.map((row) => row.orderCode).filter(Boolean));
          const incomingTracking = new Set(parsed.map((row) => row.trackingCode).filter(Boolean));
          const replacedRows = state.shopeeRows.filter(
            (row) =>
              row.orderDate.startsWith(month) &&
              ((row.orderCode && incomingCodes.has(row.orderCode)) ||
                (row.trackingCode && incomingTracking.has(row.trackingCode))),
          );
          for (const row of replacedRows)
            if (row.stockDeducted)
              adjustInventoryForShopeeRow(state, row, 1);
          state.shopeeRows = state.shopeeRows.filter((row) =>
            !row.orderDate.startsWith(month) || !(
              (row.orderCode && incomingCodes.has(row.orderCode)) ||
              (row.trackingCode && incomingTracking.has(row.trackingCode))
            ),
          );
          refreshShopeeNetValues(parsed);
          for (const row of parsed) adjustInventoryForShopeeRow(state, row, -1);
          state.shopeeRows.unshift(...parsed);
          imported = parsed.length;
        } else {
          const spxProvider =
            state.settings.shippingProviders.find(
              (option) => option.id === "spx",
            )?.name || "SPX";
          const parsed = rows
            .map((row) =>
              spxRow(
                { ...row, provider: text(row.provider) || spxProvider },
                state.nextId++,
              ),
            )
            .filter(
              (row) =>
                row.trackingCode &&
                (!row.createDate || row.createDate.startsWith(month)),
            );
          if (!parsed.length)
            throw new Error(
              `Không tìm thấy vận đơn SPX thuộc tháng ${month.slice(5, 7)}/${month.slice(0, 4)}.`,
            );
          const incomingCodes = new Set(parsed.map((row) => row.trackingCode));
          state.spxRows = state.spxRows.filter(
            (row) =>
              !row.createDate.startsWith(month) &&
              !incomingCodes.has(row.trackingCode),
          );
          state.spxRows.unshift(...parsed);
          imported = parsed.length;
        }
        addAudit(
          state,
          sheet === "shopee" ? "Đơn hàng" : "Vận chuyển",
          0,
          "Nhập Excel",
          `${imported} dòng · ${month}`,
        );
      });
      return NextResponse.json({ ok: true, imported });
    }

    if (action === "importProducts") {
      const rows = Array.isArray(body.rows)
        ? (body.rows.slice(0, 100) as ProductInput[])
        : [];
      const valid = rows
        .map((p) => ({
          sku: p.sku?.trim().toUpperCase(),
          name: p.name?.trim(),
          color: p.color?.trim() || "",
          size: p.size?.trim() || "",
          salePrice: Number(p.salePrice),
          stock: Number(p.stock),
          lowStockThreshold: Number(p.lowStockThreshold) || 5,
        }))
        .filter(
          (p) =>
            p.sku &&
            p.name &&
            Number.isInteger(p.salePrice) &&
            p.salePrice >= 0 &&
            Number.isInteger(p.stock) &&
            p.stock >= 0,
        );
      if (!valid.length) return jsonError("Không có dòng dữ liệu hợp lệ.");
      await mutateState((state) => {
        for (const input of valid) {
          const existing = state.products.find((p) => p.sku === input.sku);
          if (existing) {
            const change = input.stock - existing.stock;
            Object.assign(existing, input);
            if (change)
              state.movements.unshift({
                id: state.nextId++,
                quantityChange: change,
                reason: "Nhập tệp điều chỉnh",
                createdAt: nowIso(),
                sku: existing.sku,
                productName: existing.name,
              });
            addAudit(
              state,
              "Sản phẩm",
              existing.id,
              "Nhập tệp",
              `${input.sku} · tồn ${input.stock}`,
            );
          } else {
            const id = state.nextId++;
            state.products.push({
              id,
              sku: input.sku!,
              name: input.name!,
              color: input.color,
              size: input.size,
              salePrice: input.salePrice,
              stock: input.stock,
              lowStockThreshold: input.lowStockThreshold,
            });
            state.movements.unshift({
              id: state.nextId++,
              quantityChange: input.stock,
              reason: "Nhập tệp ban đầu",
              createdAt: nowIso(),
              sku: input.sku!,
              productName: input.name!,
            });
            addAudit(
              state,
              "Sản phẩm",
              id,
              "Nhập tệp",
              `${input.sku} · tồn ${input.stock}`,
            );
          }
        }
      });
      return NextResponse.json({ ok: true, count: valid.length });
    }

    if (action === "saveTaxDeclaration") {
      const declaration = (body.declaration ?? {}) as Partial<TaxDeclaration>;
      const period = String(declaration.period || "");
      const revenue = Number(declaration.revenue);
      const shopeeRevenue = Number(declaration.shopeeRevenue);
      const facebookRevenue = Number(declaration.facebookRevenue);
      const storeRevenue = Number(declaration.storeRevenue);
      const vatRate = Number(declaration.vatRate);
      const pitRate = Number(declaration.pitRate);
      const vatAmount = Number(declaration.vatAmount);
      const pitAmount = Number(declaration.pitAmount);
      const status = String(declaration.status || "Bản nháp");
      const note = String(declaration.note || "").slice(0, 500);
      if (
        !/^\d{4}-Q[1-4]$/.test(period) ||
        [
          revenue,
          shopeeRevenue,
          facebookRevenue,
          storeRevenue,
          vatRate,
          pitRate,
          vatAmount,
          pitAmount,
        ].some((value) => !Number.isFinite(value) || value < 0)
      )
        return jsonError("Thông tin kỳ thuế chưa hợp lệ.");
      await mutateState((state) => {
        const existing = state.taxDeclarations.find(
          (item) => item.period === period,
        );
        const saved = {
          id: existing?.id ?? state.nextId++,
          period,
          revenue,
          shopeeRevenue,
          facebookRevenue,
          storeRevenue,
          vatRate,
          pitRate,
          vatAmount,
          pitAmount,
          status,
          note,
          createdAt: nowIso(),
        };
        if (existing) Object.assign(existing, saved);
        else state.taxDeclarations.unshift(saved);
        addAudit(
          state,
          "Thuế",
          saved.id,
          existing ? "Cập nhật bản nháp" : "Tạo bản nháp",
          `${period} · ${status}`,
        );
      });
      return NextResponse.json({ ok: true });
    }

    return jsonError("Thao tác không được hỗ trợ.");
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Không thể lưu dữ liệu.",
      409,
    );
  }
}
