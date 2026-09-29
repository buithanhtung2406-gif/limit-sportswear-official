"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  Boxes,
  ChevronLeft,
  ChevronRight,
  FileDown,
  FileSpreadsheet,
  History,
  KeyRound,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  Menu,
  PackageX,
  PackagePlus,
  PencilLine,
  Plus,
  ReceiptText,
  RotateCcw,
  Settings2,
  ShoppingCart,
  Truck,
  UnlockKeyhole,
  WalletCards,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast, Toaster } from "sonner";
import readXlsxFileRaw from "read-excel-file/browser";
import {
  CASH_CATEGORY_PRESETS,
  CASH_FLOW_TYPES,
  cashFlowDirection,
  type CashFlowType,
} from "@/lib/cash-flow";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

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
type OrderDraftItem = Omit<OrderItem, "unitPrice" | "lineTotal">;
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
type StoreData = {
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
};
type Tab =
  | "overview"
  | "workbook"
  | "spx"
  | "products"
  | "stockReturns"
  | "stockReceipts"
  | "defectiveStock"
  | "sizeExchange"
  | "cash"
  | "tax"
  | "reports";
const emptyData: StoreData = {
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
};
const money = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});
const dateText = (value: string) => new Date(value).toLocaleDateString("vi-VN");
type WorkbookCell = string | number | boolean | Date | null;
type WorkbookSheet = { sheet: string; data: WorkbookCell[][] };
const readXlsxFile = readXlsxFileRaw as unknown as (
  file: File,
) => Promise<WorkbookSheet[] | WorkbookCell[][]>;

function shopeeNetOrderValue(rows: ShopeeRow[]) {
  if (rows.some((row) => isInactiveShopeeStatus(row.orderStatus))) return 0;
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

function shopeeOrderSummaries(rows: ShopeeRow[]) {
  const groups = new Map<
    string,
    {
      code: string;
      date: string;
      revenue: number;
      received: number;
      fees: number;
      quantity: number;
      canceled: boolean;
    }
  >();
  for (const row of rows) {
    const key = row.orderCode || row.trackingCode || `${row.orderDate}|${row.buyer}`;
    const current = groups.get(key) || {
      code: key,
      date: row.orderDate,
      revenue: 0,
      received: 0,
      fees: 0,
      quantity: 0,
      canceled: false,
    };
    const orderRows = rows.filter(
      (item) =>
        (item.orderCode || item.trackingCode || `${item.orderDate}|${item.buyer}`) ===
        key,
    );
    current.revenue =
      Math.max(0, ...orderRows.map((item) => item.netOrderValue || 0)) ||
      shopeeNetOrderValue(orderRows);
    current.received = Math.max(
      current.received,
      row.buyerTotalPaid || row.orderValue,
    );
    current.fees = Math.max(
      current.fees,
      row.fixedFee +
        row.serviceFee +
        row.transactionFee +
        row.expectedShippingFee +
        row.returnShippingFee,
    );
    current.quantity += row.quantity || 0;
    current.canceled ||= isInactiveShopeeStatus(row.orderStatus);
    groups.set(key, current);
  }
  return [...groups.values()].filter((item) => !item.canceled);
}

const isCanceledShopeeStatus = (status: string) =>
  status.toLocaleLowerCase("vi").includes("hủy");
const isReturnedShopeeStatus = (status: string) =>
  ["đã hoàn", "hoàn hàng", "trả hàng"].some((prefix) =>
    status.toLocaleLowerCase("vi").trim().startsWith(prefix),
  );
const isInactiveShopeeStatus = (status: string) =>
  isCanceledShopeeStatus(status) || isReturnedShopeeStatus(status);

function shopeeMonthMetrics(rows: ShopeeRow[], month: string) {
  return shopeeOrderSummaries(rows)
    .filter((item) => item.date.startsWith(month))
    .reduce(
      (result, item) => ({
        revenue: result.revenue + item.revenue,
        received: result.received + item.received,
        fees: result.fees + item.fees,
      }),
      { revenue: 0, received: 0, fees: 0 },
    );
}

const currentMonthKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};
const monthLabel = (month: string) =>
  `Tháng ${Number(month.slice(5, 7))}/${month.slice(0, 4)}`;
const isPaidOrder = (status: string) =>
  status === "Đã thanh toán" || status === "Đã nhận";
const manualOrderRevenue = (
  order: Pick<Order, "totalAmount" | "shippingFee" | "paymentStatus">,
) =>
  isPaidOrder(order.paymentStatus)
    ? Math.max(0, order.totalAmount - (order.shippingFee || 0))
    : 0;
const cashBookAmount = (cash: Cash, orders: Order[]) => {
  if (cash.type !== "Thu" || cash.note !== "Tự động từ đơn hàng")
    return cash.amount;
  const order = orders.find((item) => item.code === cash.reference);
  return order ? manualOrderRevenue(order) : cash.amount;
};
function catalogIdentityKey(skuValue: unknown, nameValue: unknown) {
  const sku = String(skuValue ?? "")
    .trim()
    .toUpperCase();
  const name = String(nameValue ?? "")
    .trim()
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
    if (name.includes("full set") || name.includes("set ba lo"))
      return "S001:full-set";
    if (name.includes("chan vay") || name === "vay") return "S001:chan-vay";
    if (name.includes("ba lo") || name.includes("ao")) return "S001:ao";
  }
  if (sku === "S002") {
    if (!name || name.includes("full set") || name.includes("set yoga"))
      return "S002:full-set";
    if (name.includes("quan")) return "S002:quan";
    if (name.includes("bra")) return "S002:bra";
    if (name.includes("ao")) return "S002:ao";
  }
  return `${sku}:${name}`;
}
function shiftMonth(month: string, amount: number) {
  const date = new Date(
    Number(month.slice(0, 4)),
    Number(month.slice(5, 7)) - 1 + amount,
    1,
  );
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}
function filterDataByMonth(data: StoreData, month: string): StoreData {
  const orders = data.orders.filter((item) => item.orderDate.startsWith(month));
  const orderIds = new Set(orders.map((item) => item.id));
  const shopeeRows = data.shopeeRows.filter((item) =>
    item.orderDate.startsWith(month),
  );
  const trackingCodes = new Set(
    shopeeRows.map((item) => item.trackingCode).filter(Boolean),
  );
  return {
    ...data,
    orders,
    cash: data.cash.filter((item) => item.transactionDate.startsWith(month)),
    movements: data.movements.filter((item) =>
      item.createdAt.startsWith(month),
    ),
    reconciliations: data.reconciliations.filter((item) =>
      orderIds.has(item.orderId),
    ),
    shopeeRows,
    spxRows: data.spxRows.filter((item) =>
      item.createDate
        ? item.createDate.startsWith(month)
        : trackingCodes.has(item.trackingCode),
    ),
    inventoryRows: data.inventoryRows.filter((item) =>
      item.snapshotDate.startsWith(month),
    ),
  };
}

export default function KeToan() {
  const currentMonth = currentMonthKey();
  const [data, setData] = useState<StoreData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [menu, setMenu] = useState(false);
  const [tab, setTab] = useState<Tab>("overview");
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [dashboardPeriod, setDashboardPeriod] = useState<"month" | "week">("month");
  const [weekAnchor, setWeekAnchor] = useState(new Date().toISOString().slice(0, 10));
  const [periodUnlocked, setPeriodUnlocked] = useState(true);
  const [checkingPeriod, setCheckingPeriod] = useState(false);
  const [unlockOpen, setUnlockOpen] = useState(false);
  const load = useCallback(async () => {
    const response = await fetch("/api/store", { cache: "no-store" });
    if (!response.ok) throw new Error();
    setData(await response.json());
    setLoading(false);
  }, []);
  useEffect(() => {
    let active = true;
    fetch("/api/store", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((next) => {
        if (active) {
          setData(next);
          setLoading(false);
        }
      })
      .catch(() => active && toast.error("Chưa thể tải dữ liệu."));
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    let active = true;
    const check = async () => {
      await Promise.resolve();
      if (!active) return;
      if (selectedMonth >= currentMonth) {
        setPeriodUnlocked(true);
        setCheckingPeriod(false);
        return;
      }
      setCheckingPeriod(true);
      try {
        const response = await fetch(
          `/api/unlock-period?month=${selectedMonth}`,
          { cache: "no-store" },
        );
        if (!response.ok) throw new Error();
        const result = await response.json();
        if (active) setPeriodUnlocked(Boolean(result.unlocked));
      } catch {
        if (active) setPeriodUnlocked(false);
      } finally {
        if (active) setCheckingPeriod(false);
      }
    };
    void check();
    return () => {
      active = false;
    };
  }, [selectedMonth, currentMonth]);
  useEffect(() => {
    if (!weekAnchor.startsWith(selectedMonth))
      setWeekAnchor(`${selectedMonth}-01`);
  }, [selectedMonth, weekAnchor]);
  const post = useCallback(
    async (payload: unknown, success: string) => {
      const withMonth =
        typeof payload === "object" && payload
          ? {
              ...(payload as Record<string, unknown>),
              editingMonth: selectedMonth,
            }
          : payload;
      const response = await fetch("/api/store", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(withMonth),
      });
      const result = await response.json();
      if (!response.ok) {
        if (response.status === 423 || result.code === "PAST_MONTH_LOCKED") {
          setPeriodUnlocked(false);
          setUnlockOpen(true);
        }
        throw new Error(result.error);
      }
      toast.success(success);
      await load();
      return result;
    },
    [load, selectedMonth],
  );

  useEffect(() => {
    const context = (
      document as Document & {
        modelContext?: {
          registerTool?: (
            tool: unknown,
            options?: unknown,
          ) => void | Promise<void>;
        };
      }
    ).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    void Promise.resolve(
      context.registerTool(
        {
          name: "open_order_management",
          title: "Mở đơn hàng",
          description: "Mở sổ đơn hàng LIMIT SPORTSWEAR.",
          inputSchema: {
            type: "object",
            properties: {},
            additionalProperties: false,
          },
          annotations: { readOnlyHint: true, untrustedContentHint: false },
          execute: async () => {
            setTab("workbook");
            return { status: "opened" };
          },
        },
        { signal: lifecycle.signal },
      ),
    ).catch(() => undefined);
    return () => lifecycle.abort();
  }, []);

  const periodData = filterDataByMonth(data, selectedMonth);
  const monthOrders = periodData.orders.filter((o) => !o.returned);
  const monthCash = periodData.cash;
  const anchorDate = new Date(`${weekAnchor}T12:00:00`);
  const mondayOffset = (anchorDate.getDay() + 6) % 7;
  const weekStartDate = new Date(anchorDate);
  weekStartDate.setDate(anchorDate.getDate() - mondayOffset);
  const weekEndDate = new Date(weekStartDate);
  weekEndDate.setDate(weekStartDate.getDate() + 6);
  const localDateKey = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const weekStart = localDateKey(weekStartDate);
  const weekEnd = localDateKey(weekEndDate);
  const inDashboardPeriod = (value: string) =>
    dashboardPeriod === "month" ||
    (value.slice(0, 10) >= weekStart && value.slice(0, 10) <= weekEnd);
  const dashboardOrders = (
    dashboardPeriod === "month"
      ? monthOrders
      : data.orders.filter((order) => !order.returned)
  ).filter((order) => inDashboardPeriod(order.orderDate));
  const dashboardCash = (
    dashboardPeriod === "month" ? monthCash : data.cash
  ).filter((entry) => inDashboardPeriod(entry.transactionDate));
  const dashboardShopeeRows = (
    dashboardPeriod === "month" ? periodData.shopeeRows : data.shopeeRows
  ).filter((row) => inDashboardPeriod(row.orderDate));
  const dashboardShopeeOrders = shopeeOrderSummaries(dashboardShopeeRows);
  const shopeeMetrics = dashboardShopeeOrders.reduce(
    (result, order) => ({
      revenue: result.revenue + order.revenue,
      received: result.received + order.received,
      fees: result.fees + order.fees,
    }),
    { revenue: 0, received: 0, fees: 0 },
  );
  const revenue =
    dashboardOrders.reduce((s, o) => s + manualOrderRevenue(o), 0) +
    shopeeMetrics.revenue;
  const income =
    dashboardCash
      .filter((c) => c.type === "Thu")
      .reduce((s, c) => s + cashBookAmount(c, dashboardOrders), 0) +
    shopeeMetrics.received;
  const expense =
    dashboardCash
      .filter((c) => c.type === "Chi")
      .reduce((s, c) => s + c.amount, 0) +
    (dashboardPeriod === "month"
      ? data.monthlyPlatformFees?.[selectedMonth] || 0
      : 0);
  const outstanding = dashboardOrders
    .filter(
      (o) =>
        !isPaidOrder(o.paymentStatus) && o.paymentStatus !== "Đã hoàn tiền",
    )
    .reduce((s, o) => s + o.totalAmount, 0);
  const dashboardData: StoreData = {
    ...periodData,
    orders: dashboardOrders,
    cash: dashboardCash,
    shopeeRows: dashboardShopeeRows,
    inventoryRows:
      dashboardPeriod === "month"
        ? periodData.inventoryRows
        : data.inventoryRows.filter((row) =>
            inDashboardPeriod(row.snapshotDate),
          ),
  };
  const dashboardPeriodLabel =
    dashboardPeriod === "month"
      ? monthLabel(selectedMonth)
      : `Tuần ${dateText(`${weekStart}T12:00:00`)}–${dateText(`${weekEnd}T12:00:00`)}`;
  const locked = selectedMonth < currentMonth && !periodUnlocked;
  return (
    <main className="min-h-screen bg-[linear-gradient(145deg,#f8fdff_0%,#eff9ff_48%,#f7fcff_100%)] text-[#0c4a6e] lg:grid lg:grid-cols-[260px_1fr]">
      <aside
        className={`${menu ? "block" : "hidden"} fixed inset-y-0 left-0 z-30 w-64 overflow-y-auto bg-[linear-gradient(180deg,#0c4a6e_0%,#075985_58%,#0c4a6e_100%)] p-5 text-white shadow-[12px_0_45px_rgba(7,89,133,0.12)] lg:static lg:block lg:w-auto`}
      >
        <Brand />
        <nav className="mt-6 space-y-1 text-sm font-semibold">
          <Nav
            icon={<LayoutDashboard />}
            label="Tổng quan"
            active={tab === "overview"}
            onClick={() => setTab("overview")}
          />
          <Nav
            icon={<ShoppingCart />}
            label="Đơn hàng"
            active={tab === "workbook"}
            onClick={() => setTab("workbook")}
          />
          <Nav
            icon={<Truck />}
            label="Vận chuyển"
            active={tab === "spx"}
            onClick={() => setTab("spx")}
          />
          <Nav
            icon={<Boxes />}
            label="Kho hàng"
            active={tab === "products"}
            onClick={() => setTab("products")}
          />
          <Nav
            icon={<RotateCcw />}
            label="Hoàn hàng"
            active={tab === "stockReturns"}
            onClick={() => setTab("stockReturns")}
          />
          <Nav
            icon={<RotateCcw />}
            label="Đổi size"
            active={tab === "sizeExchange"}
            onClick={() => setTab("sizeExchange")}
          />
          <Nav
            icon={<PackagePlus />}
            label="Nhập hàng"
            active={tab === "stockReceipts"}
            onClick={() => setTab("stockReceipts")}
          />
          <Nav
            icon={<PackageX />}
            label="Hàng lỗi"
            active={tab === "defectiveStock"}
            onClick={() => setTab("defectiveStock")}
          />
          <Nav
            icon={<WalletCards />}
            label="Thu chi"
            active={tab === "cash"}
            onClick={() => setTab("cash")}
          />
          <Nav
            icon={<ReceiptText />}
            label="Kê khai thuế"
            active={tab === "tax"}
            onClick={() => setTab("tax")}
          />
          <Nav
            icon={<BarChart3 />}
            label="Báo cáo"
            active={tab === "reports"}
            onClick={() => setTab("reports")}
          />
        </nav>
        <div className="mt-8 rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-slate-400">
          Dữ liệu riêng tư · Một điểm bán
        </div>
        <Link
          href="/"
          className="mt-3 flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-300 hover:bg-white/5 hover:text-white"
        >
          <LayoutDashboard className="size-4" /> Dashboard công khai
        </Link>
        <a
          href="/api/store?view=migration-export"
          className="mt-1 flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-300 hover:bg-white/5 hover:text-white"
        >
          <FileDown className="size-4" /> Tải bản sao dữ liệu
        </a>
        <ChangePasswordDialog />
        <a
          href="/api/logout"
          className="mt-1 flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-300 hover:bg-white/5 hover:text-white"
        >
          <LogOut className="size-4" /> Đăng xuất
        </a>
      </aside>
      {menu && (
        <button
          aria-label="Đóng trình đơn"
          onClick={() => setMenu(false)}
          className="fixed inset-0 z-20 bg-black/30 lg:hidden"
        />
      )}
      <section className="min-w-0">
        <header className="flex items-center justify-between border-b bg-white px-5 py-4 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMenu(true)}
              aria-label="Mở trình đơn"
              className="nut-bieu-tuong lg:hidden"
            >
              <Menu />
            </button>
            <div>
              <h1 className="text-xl font-extrabold">{tabTitle(tab)}</h1>
              <p className="text-sm text-[#64748b]">
                LIMIT SPORTSWEAR · {new Date().toLocaleDateString("vi-VN")}
              </p>
            </div>
          </div>
          <span className="hidden rounded-full bg-[#e0f2fe] px-3 py-1.5 text-xs font-bold text-[#0369a1] sm:block">
            Đã đồng bộ dashboard
          </span>
        </header>
        <div className="space-y-6 p-5 lg:p-8">
          <MonthControl
            month={selectedMonth}
            currentMonth={currentMonth}
            locked={locked}
            checking={checkingPeriod}
            onChange={setSelectedMonth}
            onUnlock={() => setUnlockOpen(true)}
          />
          {tab === "overview" && (
            <section className="flex flex-wrap items-end gap-3 rounded-2xl border border-[#bae6fd] bg-white p-4 shadow-sm">
              <div className="mr-2">
                <p className="font-extrabold">Tùy chỉnh dashboard</p>
                <p className="text-xs text-[#64748b]">Chọn kỳ xem và đổi kiểu biểu đồ ngay trên từng ô.</p>
              </div>
              <div className="flex rounded-xl bg-[#e0f2fe] p-1">
                <Button type="button" size="sm" variant={dashboardPeriod === "month" ? "default" : "ghost"} onClick={() => setDashboardPeriod("month")}>Theo tháng</Button>
                <Button type="button" size="sm" variant={dashboardPeriod === "week" ? "default" : "ghost"} onClick={() => setDashboardPeriod("week")}>Theo tuần</Button>
              </div>
              {dashboardPeriod === "week" && (
                <Field label="Chọn một ngày trong tuần">
                  <Input type="date" value={weekAnchor} min={`${selectedMonth}-01`} max={`${selectedMonth}-31`} onChange={(event) => setWeekAnchor(event.target.value)} className="w-48" />
                </Field>
              )}
              <p className="text-sm font-bold text-[#0369a1]">{dashboardPeriodLabel}</p>
              {dashboardPeriod === "week" && <p className="text-xs text-[#64748b]">Phí sàn nhập theo tháng chỉ hiển thị ở chế độ tháng.</p>}
            </section>
          )}
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat
              label={`Doanh thu ${dashboardPeriodLabel.toLowerCase()}`}
              value={money.format(revenue)}
            />
            <Stat label="Tiền thực nhận" value={money.format(income)} />
            <Stat label="Chi phí" value={money.format(expense)} />
            <Stat
              label="Công nợ cần thu"
              value={money.format(outstanding)}
              warning
            />
          </section>
          {loading ? (
            <Panel>
              <Empty text="Đang tải dữ liệu cửa hàng..." />
            </Panel>
          ) : (
            <>
              {locked && (
                <div className="flex flex-col gap-3 rounded-2xl border border-[#f59e0b] bg-[#fffbeb] p-5 text-[#92400e] sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex gap-3">
                    <LockKeyhole className="mt-0.5 size-5 shrink-0" />
                    <div>
                      <p className="font-extrabold">
                        {monthLabel(selectedMonth)} đang khóa chỉnh sửa
                      </p>
                      <p className="mt-1 text-sm">
                        Bạn vẫn xem được số liệu. Nhập passcode một lần để sửa
                        và lưu dữ liệu của tháng này.
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setUnlockOpen(true)}
                    className="border-[#f59e0b] bg-white text-[#92400e] hover:bg-[#fef3c7]"
                  >
                    <KeyRound /> Nhập passcode
                  </Button>
                </div>
              )}
              {tab === "overview" && (
                <div className="space-y-6">
                  <PublicDashboardSettings settings={data.settings.dashboard} post={post} />
                  <Overview
                    data={dashboardData}
                    revenue={revenue}
                    income={income}
                    expense={expense}
                    periodLabel={dashboardPeriodLabel}
                    setTab={setTab}
                  />
                </div>
              )}
              {tab === "workbook" && (
                <WorkbookView
                  data={periodData}
                  post={post}
                  selectedMonth={selectedMonth}
                  currentMonth={currentMonth}
                />
              )}
              {tab === "spx" && (
                <ShippingView
                  data={data}
                  post={post}
                  selectedMonth={selectedMonth}
                />
              )}
              {tab === "products" && (
                <ProductsView
                  key={selectedMonth}
                  data={data}
                  post={post}
                  selectedMonth={selectedMonth}
                  currentMonth={currentMonth}
                />
              )}
              {tab === "stockReturns" && (
                <StockEventView
                  kind="Hoàn hàng"
                  data={{ ...periodData, inventoryRows: data.inventoryRows }}
                  post={post}
                  selectedMonth={selectedMonth}
                />
              )}
              {tab === "stockReceipts" && (
                <StockEventView
                  kind="Nhập hàng"
                  data={{ ...periodData, inventoryRows: data.inventoryRows }}
                  post={post}
                  selectedMonth={selectedMonth}
                />
              )}
              {tab === "defectiveStock" && (
                <StockEventView
                  kind="Hàng lỗi"
                  data={{ ...periodData, inventoryRows: data.inventoryRows }}
                  post={post}
                  selectedMonth={selectedMonth}
                />
              )}
              {tab === "sizeExchange" && (
                <SizeExchangeView data={data} post={post} selectedMonth={selectedMonth} />
              )}
              {tab === "cash" && (
                <>
                <MonthlyPlatformFee key={selectedMonth} month={selectedMonth} amount={data.monthlyPlatformFees?.[selectedMonth] || 0} post={post} />
                <CashView
                  data={periodData}
                  income={income}
                  expense={expense}
                  post={post}
                  selectedMonth={selectedMonth}
                />
                </>
              )}
              {tab === "tax" && (
                <TaxView
                  key={selectedMonth}
                  data={data}
                  post={post}
                  selectedMonth={selectedMonth}
                />
              )}
              {tab === "reports" && (
                <ReportsView
                  data={periodData}
                  revenue={revenue}
                  income={income}
                  expense={expense}
                />
              )}
            </>
          )}
        </div>
      </section>
      <UnlockPeriodDialog
        open={unlockOpen}
        onOpenChange={setUnlockOpen}
        month={selectedMonth}
        onUnlocked={() => {
          setPeriodUnlocked(true);
          setUnlockOpen(false);
          toast.success(`Đã mở khóa ${monthLabel(selectedMonth)}`);
        }}
      />
      <Toaster richColors position="top-right" />
    </main>
  );
}

function MonthControl({
  month,
  currentMonth,
  locked,
  checking,
  onChange,
  onUnlock,
}: {
  month: string;
  currentMonth: string;
  locked: boolean;
  checking: boolean;
  onChange: (month: string) => void;
  onUnlock: () => void;
}) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-[#bae6fd] bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
      <div>
        <p className="text-sm font-semibold text-[#64748b]">
          Kỳ dữ liệu kế toán
        </p>
        <h2 className="mt-1 text-xl font-black">{monthLabel(month)}</h2>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          aria-label="Tháng trước"
          onClick={() => onChange(shiftMonth(month, -1))}
          className="nut-bieu-tuong"
        >
          <ChevronLeft />
        </button>
        <Input
          aria-label="Chọn tháng kế toán"
          type="month"
          value={month}
          max={currentMonth}
          onChange={(event) =>
            event.target.value && onChange(event.target.value)
          }
          className="w-44 bg-[#f8fcff] font-bold"
        />
        <button
          aria-label="Tháng sau"
          disabled={month >= currentMonth}
          onClick={() => onChange(shiftMonth(month, 1))}
          className="nut-bieu-tuong disabled:cursor-not-allowed disabled:opacity-35"
        >
          <ChevronRight />
        </button>
        {checking ? (
          <span className="rounded-full bg-[#f1f5f9] px-3 py-2 text-xs font-bold text-[#64748b]">
            Đang kiểm tra…
          </span>
        ) : locked ? (
          <Button variant="outline" size="sm" onClick={onUnlock}>
            <LockKeyhole /> Mở khóa chỉnh sửa
          </Button>
        ) : (
          <span className="flex items-center gap-2 rounded-full bg-[#dcfce7] px-3 py-2 text-xs font-bold text-[#166534]">
            <UnlockKeyhole className="size-4" />{" "}
            {month === currentMonth
              ? "Tháng hiện tại · được sửa"
              : "Đã mở khóa"}
          </span>
        )}
      </div>
    </section>
  );
}

function UnlockPeriodDialog({
  open,
  onOpenChange,
  month,
  onUnlocked,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  month: string;
  onUnlocked: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mở khóa chỉnh sửa {monthLabel(month)}</DialogTitle>
          <DialogDescription>
            Nhập mật khẩu quản trị làm passcode. Sau khi xác nhận một lần, bạn
            có thể sửa và lưu dữ liệu tháng này trong 4 giờ.
          </DialogDescription>
        </DialogHeader>
        <ActionForm
          submitLabel="Mở khóa tháng này"
          onSubmit={async (form) => {
            const response = await fetch("/api/unlock-period", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ month, passcode: form.get("passcode") }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error);
            onUnlocked();
          }}
        >
          <Field label="Passcode">
            <Input
              name="passcode"
              type="password"
              autoComplete="current-password"
              required
              autoFocus
            />
          </Field>
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}

function PublicDashboardSettings({
  settings,
  post,
}: {
  settings: DashboardSettings;
  post: (payload: unknown, success: string) => Promise<unknown>;
}) {
  const save = (patch: Partial<DashboardSettings>) =>
    post(
      {
        action: "saveDashboardSettings",
        settings: { ...settings, ...patch },
      },
      "Đã cập nhật Dashboard công khai",
    );
  return (
    <Panel
      title="Cấu hình Dashboard công khai"
      subtitle="Các lựa chọn dưới đây áp dụng cho trang Dashboard ngoài trang kế toán và được giữ lại sau khi tải lại."
      action={<Link href="/" target="_blank"><Button variant="outline">Mở Dashboard</Button></Link>}
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Field label="Kỳ hiển thị mặc định">
          <Select value={settings.defaultPeriod} onChange={(event) => void save({ defaultPeriod: event.target.value as DashboardSettings["defaultPeriod"] })}>
            <option value="month">Theo tháng</option>
            <option value="week">Theo tuần</option>
          </Select>
        </Field>
        <Field label="Doanh thu theo ngày">
          <Select value={settings.revenueChart} onChange={(event) => void save({ revenueChart: event.target.value as DashboardSettings["revenueChart"] })}>
            <option value="line">Biểu đồ đường</option>
            <option value="bar">Biểu đồ cột</option>
            <option value="area">Biểu đồ miền</option>
          </Select>
        </Field>
        <Field label="Hiệu quả kênh bán">
          <Select value={settings.channelChart} onChange={(event) => void save({ channelChart: event.target.value as DashboardSettings["channelChart"] })}>
            <option value="cards">Các thẻ số liệu</option>
            <option value="bar">Biểu đồ cột</option>
            <option value="pie">Biểu đồ tròn</option>
          </Select>
        </Field>
        <Field label="Đơn theo tỉnh/thành">
          <Select value={settings.cityChart} onChange={(event) => void save({ cityChart: event.target.value as DashboardSettings["cityChart"] })}>
            <option value="area">Biểu đồ miền</option>
            <option value="bar">Biểu đồ cột</option>
            <option value="line">Biểu đồ đường</option>
          </Select>
        </Field>
        <Field label="Tình trạng tồn kho">
          <Select value={settings.stockChart} onChange={(event) => void save({ stockChart: event.target.value as DashboardSettings["stockChart"] })}>
            <option value="table">Bảng chi tiết</option>
            <option value="bar">Biểu đồ cột</option>
            <option value="pie">Biểu đồ tròn</option>
          </Select>
        </Field>
      </div>
    </Panel>
  );
}

function Overview({
  data,
  revenue,
  income,
  expense,
  periodLabel,
  setTab,
}: {
  data: StoreData;
  revenue: number;
  income: number;
  expense: number;
  periodLabel: string;
  setTab: (t: Tab) => void;
}) {
  const [detail, setDetail] = useState<"orders" | "low" | "out" | null>(null);
  const [cashChart, setCashChart] = useState<"bar" | "line" | "area">("bar");
  const [sourceChart, setSourceChart] = useState<"bar" | "pie">("pie");
  const [stockChart, setStockChart] = useState<"bar" | "pie">("bar");
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("limit-accounting-dashboard") || "{}");
      if (["bar", "line", "area"].includes(saved.cashChart)) setCashChart(saved.cashChart);
      if (["bar", "pie"].includes(saved.sourceChart)) setSourceChart(saved.sourceChart);
      if (["bar", "pie"].includes(saved.stockChart)) setStockChart(saved.stockChart);
    } catch {}
  }, []);
  useEffect(() => {
    localStorage.setItem(
      "limit-accounting-dashboard",
      JSON.stringify({ cashChart, sourceChart, stockChart }),
    );
  }, [cashChart, sourceChart, stockChart]);
  const latestSnapshot = data.inventoryRows.reduce(
    (latest, row) => (row.snapshotDate > latest ? row.snapshotDate : latest),
    "",
  );
  const latestRows = data.inventoryRows.filter(
    (row) => row.snapshotDate === latestSnapshot,
  );
  const lowStockRows = latestRows.filter(
    (row) => row.total > 0 && row.total <= 5,
  );
  const outOfStockRows = latestRows.filter((row) => row.total === 0);
  const fallbackLowStock = data.products.filter(
    (product) =>
      product.stock > 0 && product.stock <= product.lowStockThreshold,
  );
  const fallbackOutOfStock = data.products.filter(
    (product) => product.stock === 0,
  );
  const shopeeSource =
    data.settings.orderChannels.find((option) => option.id === "shopee")
      ?.name || "Shopee";
  const orderRows = [
    ...shopeeOrderSummaries(data.shopeeRows).map((order) => ({
      code: order.code,
      source: shopeeSource,
      date: order.date,
      quantity: order.quantity,
    })),
    ...data.orders
      .filter((order) => !order.returned)
      .map((order) => ({
        code: order.code,
        source: order.salesChannel,
        date: order.orderDate,
        quantity: order.quantity,
      })),
  ].sort((a, b) => b.date.localeCompare(a.date));
  const lowStock = latestRows.length
    ? lowStockRows.length
    : fallbackLowStock.length;
  const outOfStock = latestRows.length
    ? outOfStockRows.length
    : fallbackOutOfStock.length;
  const healthyStock = latestRows.length
    ? latestRows.filter((row) => row.total > 5).length
    : data.products.filter((product) => product.stock > product.lowStockThreshold).length;
  const cashChartRows = [
    { name: "Doanh thu", value: revenue },
    { name: "Thực nhận", value: income },
    { name: "Chi phí", value: expense },
  ];
  const sourceCounts = new Map<string, number>();
  for (const order of orderRows)
    sourceCounts.set(order.source || "Khác", (sourceCounts.get(order.source || "Khác") || 0) + 1);
  const sourceChartRows = [...sourceCounts.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
  const stockChartRows = [
    { name: "Còn hàng", value: healthyStock },
    { name: "Sắp hết", value: lowStock },
    { name: "Hết hàng", value: outOfStock },
  ];
  const detailTitle =
    detail === "orders"
      ? `Đơn trong ${periodLabel.toLowerCase()}`
      : detail === "low"
        ? "Mã sắp hết"
        : "Mã hết";
  return (
    <>
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Panel
          title="Việc cần xử lý"
          subtitle="Bấm vào từng mục để xem danh sách chi tiết"
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <Quick
              label={`Đơn trong ${periodLabel.toLowerCase()}`}
              value={orderRows.length}
              onClick={() => setDetail("orders")}
            />
            <Quick
              label="Mã sắp hết"
              value={lowStock}
              onClick={() => setDetail("low")}
            />
            <Quick
              label="Mã hết"
              value={outOfStock}
              onClick={() => setDetail("out")}
            />
          </div>
          {!data.products.length && !data.catalogRows.length && (
            <div className="mt-5 rounded-xl border border-dashed border-[#38bdf8] bg-[#f0f9ff] p-5">
              <p className="font-bold">Bắt đầu vận hành cửa hàng</p>
              <p className="mt-1 text-sm text-[#64748b]">
                Thêm mã sản phẩm và kiểm kho hằng ngày để bắt đầu ghi nhận số
                liệu thật.
              </p>
              <Button className="mt-4" onClick={() => setTab("products")}>
                Mở kho hàng
              </Button>
            </div>
          )}
        </Panel>
        <Panel
          title={`Dòng tiền · ${periodLabel}`}
          subtitle="Biểu đồ dùng đúng số liệu ở các ô tổng quan"
          action={<ChartTypeSelect value={cashChart} onChange={(value) => setCashChart(value as typeof cashChart)} options={[{ value: "bar", label: "Biểu đồ cột" }, { value: "line", label: "Biểu đồ đường" }, { value: "area", label: "Biểu đồ miền" }]} />}
        >
          <DashboardChart rows={cashChartRows} type={cashChart} moneyValues />
        </Panel>
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Panel
          title="Đơn hàng theo nguồn"
          subtitle={`Các đơn trong ${periodLabel.toLowerCase()}`}
          action={<ChartTypeSelect value={sourceChart} onChange={(value) => setSourceChart(value as typeof sourceChart)} options={[{ value: "bar", label: "Biểu đồ cột" }, { value: "pie", label: "Biểu đồ tròn" }]} />}
        >
          <DashboardChart rows={sourceChartRows} type={sourceChart} />
        </Panel>
        <Panel
          title="Tình trạng tồn kho"
          subtitle="Theo lần kiểm kho gần nhất trong kỳ đang xem"
          action={<ChartTypeSelect value={stockChart} onChange={(value) => setStockChart(value as typeof stockChart)} options={[{ value: "bar", label: "Biểu đồ cột" }, { value: "pie", label: "Biểu đồ tròn" }]} />}
        >
          <DashboardChart rows={stockChartRows} type={stockChart} />
        </Panel>
      </div>
      <Dialog
        open={detail !== null}
        onOpenChange={(open) => !open && setDetail(null)}
      >
        <DialogContent className="max-h-[82vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detailTitle}</DialogTitle>
            <DialogDescription>
              {detail === "orders"
                ? `${orderRows.length} đơn trong kỳ đang xem, chia theo nguồn bán.`
                : `Tồn kho theo lần kiểm gần nhất${latestSnapshot ? ` ngày ${dateText(`${latestSnapshot}T12:00:00`)}` : ""}.`}
            </DialogDescription>
          </DialogHeader>
          {detail === "orders" ? (
            orderRows.length ? (
              <DataTable headers={["Mã đơn", "Nguồn đơn", "Ngày", "Số lượng"]}>
                {orderRows.map((order) => (
                  <TableRow key={`${order.source}-${order.code}`}>
                    <TableCell className="font-mono text-xs font-bold">
                      {order.code}
                    </TableCell>
                    <TableCell>{order.source}</TableCell>
                    <TableCell>{dateText(order.date)}</TableCell>
                    <TableCell className="font-black">
                      {order.quantity}
                    </TableCell>
                  </TableRow>
                ))}
              </DataTable>
            ) : (
              <Empty text="Chưa có đơn trong tháng này." />
            )
          ) : latestRows.length ? (
            (detail === "low" ? lowStockRows : outOfStockRows).length ? (
              <DataTable headers={["Mã hàng", "Loại", "Màu", "Tồn"]}>
                {(detail === "low" ? lowStockRows : outOfStockRows).map(
                  (row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-mono text-xs font-bold">
                        {row.sku}
                      </TableCell>
                      <TableCell>{row.itemType || "Sản phẩm"}</TableCell>
                      <TableCell>{row.color || "—"}</TableCell>
                      <TableCell
                        className={
                          row.total === 0
                            ? "font-black text-red-600"
                            : "font-black text-amber-600"
                        }
                      >
                        {row.total === 0 ? "Hết" : row.total}
                      </TableCell>
                    </TableRow>
                  ),
                )}
              </DataTable>
            ) : (
              <Empty
                text={
                  detail === "low"
                    ? "Không có mã sắp hết."
                    : "Không có mã đã hết."
                }
              />
            )
          ) : (detail === "low" ? fallbackLowStock : fallbackOutOfStock)
              .length ? (
            <DataTable headers={["Mã hàng", "Sản phẩm", "Màu · Size", "Tồn"]}>
              {(detail === "low" ? fallbackLowStock : fallbackOutOfStock).map(
                (product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-mono text-xs font-bold">
                      {product.sku}
                    </TableCell>
                    <TableCell>{product.name}</TableCell>
                    <TableCell>
                      {[product.color, product.size]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </TableCell>
                    <TableCell
                      className={
                        product.stock === 0
                          ? "font-black text-red-600"
                          : "font-black text-amber-600"
                      }
                    >
                      {product.stock === 0 ? "Hết" : product.stock}
                    </TableCell>
                  </TableRow>
                ),
              )}
            </DataTable>
          ) : (
            <Empty
              text={
                detail === "low"
                  ? "Không có mã sắp hết."
                  : "Không có mã đã hết."
              }
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

type DashboardChartType = "bar" | "line" | "area" | "pie";
type DashboardChartRow = { name: string; value: number };
const dashboardChartColors = ["#0284c7", "#38bdf8", "#f59e0b", "#10b981", "#8b5cf6", "#f43f5e"];

function ChartTypeSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="flex items-center gap-2 text-xs font-bold text-[#64748b]">
      Kiểu hiển thị
      <select
        aria-label="Kiểu biểu đồ"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 rounded-lg border border-[#bae6fd] bg-white px-3 text-sm font-semibold text-[#0c4a6e] outline-none focus:border-[#0284c7]"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  );
}

function DashboardChart({
  rows,
  type,
  moneyValues = false,
}: {
  rows: DashboardChartRow[];
  type: DashboardChartType;
  moneyValues?: boolean;
}) {
  const formatValue = (value: unknown) =>
    moneyValues ? money.format(Number(value) || 0) : new Intl.NumberFormat("vi-VN").format(Number(value) || 0);
  if (!rows.length || rows.every((row) => row.value === 0))
    return <Empty text="Chưa có dữ liệu trong kỳ đang xem." />;
  return (
    <div className="h-72 min-w-0" data-chart-type={type}>
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        {type === "pie" ? (
          <PieChart>
            <Pie data={rows} dataKey="value" nameKey="name" cx="50%" cy="48%" outerRadius={92} label={({ name, value }) => `${name}: ${formatValue(value)}`}>
              {rows.map((row, index) => <Cell key={row.name} fill={dashboardChartColors[index % dashboardChartColors.length]} />)}
            </Pie>
            <Tooltip formatter={(value) => formatValue(value)} />
            <Legend />
          </PieChart>
        ) : type === "line" ? (
          <LineChart data={rows} margin={{ top: 12, right: 18, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#d8eef9" />
            <XAxis dataKey="name" tick={{ fill: "#475569", fontSize: 12 }} />
            <YAxis tickFormatter={(value) => moneyValues ? `${Math.round(Number(value) / 1_000_000)}tr` : String(value)} tick={{ fill: "#64748b", fontSize: 11 }} width={48} />
            <Tooltip formatter={(value) => formatValue(value)} />
            <Line type="monotone" dataKey="value" name="Giá trị" stroke="#0284c7" strokeWidth={4} dot={{ r: 5, fill: "#38bdf8" }} />
          </LineChart>
        ) : type === "area" ? (
          <AreaChart data={rows} margin={{ top: 12, right: 18, left: 8, bottom: 8 }}>
            <defs><linearGradient id="accountingDashboardArea" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#0284c7" stopOpacity={0.65} /><stop offset="95%" stopColor="#7dd3fc" stopOpacity={0.08} /></linearGradient></defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#d8eef9" />
            <XAxis dataKey="name" tick={{ fill: "#475569", fontSize: 12 }} />
            <YAxis tickFormatter={(value) => moneyValues ? `${Math.round(Number(value) / 1_000_000)}tr` : String(value)} tick={{ fill: "#64748b", fontSize: 11 }} width={48} />
            <Tooltip formatter={(value) => formatValue(value)} />
            <Area type="monotone" dataKey="value" name="Giá trị" stroke="#0284c7" strokeWidth={3} fill="url(#accountingDashboardArea)" />
          </AreaChart>
        ) : (
          <BarChart data={rows} margin={{ top: 12, right: 18, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#d8eef9" />
            <XAxis dataKey="name" tick={{ fill: "#475569", fontSize: 12 }} />
            <YAxis tickFormatter={(value) => moneyValues ? `${Math.round(Number(value) / 1_000_000)}tr` : String(value)} tick={{ fill: "#64748b", fontSize: 11 }} width={48} />
            <Tooltip formatter={(value) => formatValue(value)} />
            <Bar dataKey="value" name="Giá trị" radius={[10, 10, 0, 0]}>
              {rows.map((row, index) => <Cell key={row.name} fill={dashboardChartColors[index % dashboardChartColors.length]} />)}
            </Bar>
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

type SheetName = "shopee" | "spx" | "inventory" | "catalog";
type AnySheetRow = {
  id: number;
  [key: string]: string | number | boolean;
};
type SheetColumn = {
  key: string;
  label: string;
  type?: "text" | "number" | "date" | "datetime-local";
  width?: string;
  readOnly?: boolean;
};

const shopeeColumns: SheetColumn[] = [
  { key: "orderCode", label: "Mã đơn Shopee", width: "180px" },
  {
    key: "orderDate",
    label: "Ngày đặt hàng",
    type: "datetime-local",
    width: "190px",
  },
  { key: "buyer", label: "Người mua", width: "150px" },
  { key: "sku", label: "Mã sản phẩm", width: "120px" },
  { key: "color", label: "Màu", width: "100px" },
  { key: "size", label: "Size", width: "130px" },
  { key: "productName", label: "Tên sản phẩm", width: "320px" },
  { key: "orderStatus", label: "Trạng thái đơn hàng", width: "280px" },
  { key: "trackingCode", label: "Mã vận đơn", width: "180px" },
  { key: "originalPrice", label: "Giá gốc", type: "number" },
  { key: "sellerDiscount", label: "Người bán trợ giá", type: "number" },
  { key: "shopeeDiscount", label: "Shopee trợ giá", type: "number" },
  {
    key: "totalSellerDiscount",
    label: "Tổng người bán trợ giá",
    type: "number",
  },
  { key: "promotionalPrice", label: "Giá ưu đãi", type: "number" },
  { key: "quantity", label: "Số lượng", type: "number", width: "90px" },
  {
    key: "buyerProductPayment",
    label: "Người mua trả tiền hàng",
    type: "number",
  },
  { key: "orderValue", label: "Tổng giá trị đơn hàng", type: "number" },
  { key: "shopVoucher", label: "Mã giảm giá Shop", type: "number" },
  { key: "shopeeVoucher", label: "Mã giảm giá Shopee", type: "number" },
  { key: "shopeeCoins", label: "Shopee Xu hoàn", type: "number" },
  { key: "sellerCoinCashback", label: "Hoàn Xu do Shop chịu", type: "number" },
  { key: "shopeeComboDiscount", label: "Giảm combo Shopee", type: "number" },
  { key: "shopComboDiscount", label: "Giảm combo Shop", type: "number" },
  { key: "cardDiscount", label: "Giảm khi thanh toán bằng thẻ", type: "number" },
  { key: "tradeInBonus", label: "Trade-in Bonus", type: "number" },
  { key: "sellerTradeInBonus", label: "Trade-in Bonus do Shop chịu", type: "number" },
  {
    key: "expectedShippingFee",
    label: "Phí vận chuyển dự kiến",
    type: "number",
  },
  {
    key: "buyerShippingFee",
    label: "Phí vận chuyển người mua trả",
    type: "number",
  },
  {
    key: "shopeeShippingSubsidy",
    label: "Shopee tài trợ vận chuyển",
    type: "number",
  },
  {
    key: "returnShippingFee",
    label: "Phí vận chuyển trả hàng",
    type: "number",
  },
  { key: "buyerTotalPaid", label: "Tổng người mua thanh toán", type: "number" },
  { key: "paymentMethod", label: "Phương thức thanh toán", width: "210px" },
  { key: "fixedFee", label: "Phí cố định", type: "number" },
  { key: "serviceFee", label: "Phí dịch vụ", type: "number" },
  { key: "transactionFee", label: "Phí xử lý giao dịch", type: "number" },
  { key: "province", label: "Tỉnh/Thành phố", width: "190px" },
];
const spxReceivable = (row: AnySheetRow) =>
  (Number(row.orderValue) || Number(row.codAmount) || 0) +
  (Number(row.failedDelivery) || 0) +
  (Number(row.shippingFee) || 0);
const spxColumns: SheetColumn[] = [
  {
    key: "createDate",
    label: "Ngày tạo",
    type: "datetime-local",
    width: "170px",
  },
  { key: "trackingCode", label: "Mã vận đơn", width: "180px" },
  { key: "status", label: "Trạng thái", width: "180px" },
  { key: "sku", label: "Mã sản phẩm" },
  { key: "color", label: "Màu" },
  { key: "size", label: "Size" },
  { key: "province", label: "Tỉnh nhận", width: "180px" },
  { key: "recipient", label: "Tên người nhận", width: "160px" },
  { key: "shippingNote", label: "Ghi chú cách vận chuyển", width: "240px" },
  { key: "orderValue", label: "Giá trị hàng (chưa gồm giao hàng)", type: "number" },
  { key: "codAmount", label: "Tiền COD (chưa gồm giao hàng)", type: "number" },
  { key: "failedDelivery", label: "Phí giao thất bại", type: "number" },
  { key: "shippingFee", label: "Phí giao hàng khách trả (+)", type: "number" },
  { key: "total", label: "Tổng khách thanh toán", type: "number", readOnly: true },
];
const inventoryColumns: SheetColumn[] = [
  { key: "snapshotDate", label: "Ngày kiểm kho", type: "date", width: "145px" },
  { key: "sku", label: "Mã hàng" },
  { key: "itemType", label: "Loại", width: "160px" },
  { key: "color", label: "Màu" },
  { key: "sizeS", label: "Size S", type: "number", width: "90px" },
  { key: "sizeM", label: "Size M", type: "number", width: "90px" },
  { key: "sizeL", label: "Size L", type: "number", width: "90px" },
  { key: "freeSize", label: "Free size", type: "number", width: "105px" },
  { key: "oversize", label: "Oversize", type: "number", width: "105px" },
  { key: "total", label: "Tổng", type: "number", width: "100px" },
  { key: "note", label: "Ghi chú", width: "220px" },
];
const catalogColumns: SheetColumn[] = [
  { key: "sku", label: "Mã hàng" },
  { key: "name", label: "Sản phẩm", width: "320px" },
  { key: "price", label: "Giá bán", type: "number", width: "150px" },
  {
    key: "costPrice",
    label: "Giá vốn (tùy chọn)",
    type: "number",
    width: "170px",
  },
];

const normalizeHeader = (value: WorkbookCell) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
const cellNumber = (value: WorkbookCell) => {
  const parsed = Number(
    String(value ?? "")
      .replaceAll(",", "")
      .replace(/[^0-9.-]/g, ""),
  );
  return Number.isFinite(parsed) ? parsed : 0;
};
function cellDateTime(value: WorkbookCell) {
  let date: Date | null = value instanceof Date ? value : null;
  if (!date && typeof value === "number" && value > 20_000)
    date = new Date(Date.UTC(1899, 11, 30) + value * 86_400_000);
  if (!date) {
    const raw = String(value ?? "").trim();
    const match = raw.match(
      /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:\s+(\d{1,2}):(\d{2}))?/,
    );
    if (match)
      date = new Date(
        Number(match[3]),
        Number(match[2]) - 1,
        Number(match[1]),
        Number(match[4] || 0),
        Number(match[5] || 0),
      );
    else if (raw) {
      const parsed = new Date(raw.replace(" ", "T"));
      if (!Number.isNaN(parsed.getTime())) date = parsed;
    }
  }
  if (!date) return "";
  const pad = (number: number) => String(number).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function ImportMonthlyWorkbook({
  sheet,
  month,
  post,
}: {
  sheet: "shopee" | "spx";
  month: string;
  post: Post;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const label = sheet === "shopee" ? "Nhập Excel Shopee" : "Nhập file SPX";
  async function importFile(file?: File) {
    if (!file) return;
    setBusy(true);
    try {
      const workbook = await readXlsxFile(file);
      const worksheets: WorkbookSheet[] =
        Array.isArray(workbook) && workbook.every((row) => Array.isArray(row))
          ? [{ sheet: "Trang 1", data: workbook as WorkbookCell[][] }]
          : (workbook as WorkbookSheet[]).filter((item) =>
              Array.isArray(item?.data),
            );
      let cells: WorkbookCell[][] = [];
      let normalizedRows: string[][] = [];
      let headerIndex = -1;
      for (const worksheet of worksheets) {
        const candidateRows = worksheet.data.map((row) =>
          row.map(normalizeHeader),
        );
        const candidateHeader = candidateRows.findIndex(
          (row) =>
            row.some(
              (cell) =>
                cell.includes("ma van don") ||
                (sheet === "shopee" && cell.includes("ma don hang")),
            ) &&
            (sheet === "spx" ||
              row.some(
                (cell) =>
                  cell.includes("ngay dat hang") ||
                  cell.includes("thoi gian dat hang"),
              )),
        );
        if (candidateHeader >= 0) {
          cells = worksheet.data;
          normalizedRows = candidateRows;
          headerIndex = candidateHeader;
          break;
        }
      }
      if (headerIndex < 0)
        throw new Error("Không tìm thấy dòng tiêu đề phù hợp trong file.");
      const headers = normalizedRows[headerIndex];
      const column = (...aliases: string[]) =>
        headers.findIndex((header) => aliases.includes(header)) >= 0
          ? headers.findIndex((header) => aliases.includes(header))
          : headers.findIndex((header) =>
          aliases.some((alias) => header === alias || header.includes(alias)),
        );
      const value = (row: WorkbookCell[], ...aliases: string[]) => {
        const index = column(...aliases);
        return index >= 0 ? row[index] : null;
      };
      const sourceRows = cells
        .slice(headerIndex + 1)
        .filter((row) =>
          row.some((cell) => cell !== null && String(cell).trim() !== ""),
        );
      const parseColor = (
        explicit: unknown,
        variant: string,
        productName: string,
      ) => {
        const raw = [String(explicit ?? "").trim(), variant, productName]
          .filter(Boolean)
          .join(" ");
        const normalized = normalizeHeader(raw);
        if (/\btrang\b/.test(normalized)) return "Trắng";
        if (/\bden\b/.test(normalized)) return "Đen";
        if (/\bnavy\b/.test(normalized)) return "Navy";
        if (/\bxanh\b/.test(normalized)) return "Xanh";
        return String(explicit ?? "").trim();
      };
      const rows =
        sheet === "shopee"
          ? sourceRows.map((row) => {
              const variant = String(
                value(row, "ten phan loai hang", "phan loai hang") ?? "",
              );
              const parsedSize =
                variant.match(
                  /\b(?:size\s*)?(free\s*size|freesize|oversize|over\s*size|fs|os|xl|l|m|s)\b/i,
                )?.[1] || "";
              const productName = String(value(row, "ten san pham") ?? "");
              const rawSku = String(
                value(
                  row,
                  "ma san pham",
                  "ma sku phan loai",
                  "sku phan loai",
                  "sku san pham",
                ) ?? "",
              );
              return {
                orderCode: String(value(row, "ma don hang") ?? "").trim(),
                orderDate: cellDateTime(
                  value(row, "ngay dat hang", "thoi gian dat hang"),
                ),
                buyer: String(
                  value(row, "nguoi mua", "ten dang nhap cua nguoi mua") ?? "",
                ),
                sku: rawSku.trim(),
                color: parseColor(value(row, "mau"), variant, productName),
                size: String(value(row, "size") ?? parsedSize),
                productName,
                orderStatus: String(value(row, "trang thai don hang") ?? ""),
                trackingCode: String(value(row, "ma van don") ?? ""),
                originalPrice: cellNumber(value(row, "gia goc")),
                sellerDiscount: cellNumber(value(row, "nguoi ban tro gia")),
                shopeeDiscount: cellNumber(value(row, "shopee tro gia")),
                totalSellerDiscount: cellNumber(
                  value(row, "tong so tien duoc nguoi ban tro gia"),
                ),
                promotionalPrice: cellNumber(value(row, "gia uu dai")),
                quantity: cellNumber(value(row, "so luong")),
                buyerProductPayment: cellNumber(
                  value(
                    row,
                    "nguoi mua tra tien hang",
                    "tong so tien nguoi mua thanh toan",
                  ),
                ),
                orderValue: cellNumber(value(row, "tong gia tri don hang")),
                shopVoucher: cellNumber(value(row, "ma giam gia cua shop")),
                shopeeVoucher: cellNumber(value(row, "ma giam gia cua shopee")),
                sellerCoinCashback: cellNumber(value(row, "hoan xu")),
                shopeeComboDiscount: cellNumber(
                  value(row, "giam gia tu combo shopee"),
                ),
                shopComboDiscount: cellNumber(
                  value(row, "giam gia tu combo cua shop"),
                ),
                shopeeCoins: cellNumber(value(row, "shopee xu duoc hoan")),
                cardDiscount: cellNumber(
                  value(row, "so tien duoc giam khi thanh toan bang the ghi no"),
                ),
                tradeInBonus: cellNumber(value(row, "trade-in bonus")),
                sellerTradeInBonus: cellNumber(
                  value(row, "trade-in bonus by seller"),
                ),
                expectedShippingFee: cellNumber(
                  value(row, "phi van chuyen du kien"),
                ),
                buyerShippingFee: cellNumber(
                  value(row, "phi van chuyen ma nguoi mua tra"),
                ),
                shopeeShippingSubsidy: cellNumber(
                  value(row, "phi van chuyen tai tro boi shopee"),
                ),
                returnShippingFee: cellNumber(
                  value(row, "phi van chuyen tra hang"),
                ),
                buyerTotalPaid: cellNumber(
                  value(row, "tong so tien nguoi mua thanh toan"),
                ),
                paymentMethod: String(
                  value(row, "phuong thuc thanh toan") ?? "",
                ),
                fixedFee: cellNumber(value(row, "phi co dinh")),
                serviceFee: cellNumber(value(row, "phi dich vu")),
                transactionFee: cellNumber(
                  value(row, "phi xu ly giao dich", "phi thanh toan"),
                ),
                province: String(value(row, "tinh thanh pho") ?? ""),
              };
            })
          : sourceRows.map((row) => {
              const item = String(
                value(row, "ten san pham so luong gia tien", "item list") ?? "",
              );
              const sku = item.match(/\b([A-Z]\d{3})\b/i)?.[1] || "";
              const size =
                item.match(
                  /(?:size\s*)?(free\s*size|freesize|oversize|over\s*size|fs|os|xl|l|m|s)\b/i,
                )?.[1] || "";
              const color = item.match(/\b(trang|den|navy|xanh)\b/i)?.[1] || "";
              const codAmount = cellNumber(
                value(row, "so tien cod", "tien thu ho"),
              );
              const orderValue =
                cellNumber(
                  value(
                    row,
                    "tong gia tri don hang",
                    "gia tri don hang",
                    "gia tri don",
                  ),
                ) || codAmount;
              const failedDelivery = cellNumber(
                value(row, "phi tu choi nhan hang can thu", "giao that bai"),
              );
              const shippingFee =
                cellNumber(value(row, "phi van chuyen thuc te")) ||
                cellNumber(
                  value(
                    row,
                    "phi van chuyen uoc tinh",
                    "phi vc",
                    "phi van chuyen",
                  ),
                );
              return {
                createDate: cellDateTime(
                  value(row, "thoi gian tao don", "create time"),
                ),
                trackingCode: String(value(row, "ma van don") ?? ""),
                status: String(
                  value(row, "trang thai hien tai", "tracking status") ?? "",
                ),
                sku,
                color,
                size,
                province: String(value(row, "tinh thanh") ?? ""),
                recipient: String(
                  value(row, "ten nguoi nhan", "receiver name") ?? "",
                ),
                orderValue,
                codAmount,
                failedDelivery,
                shippingFee,
                total: orderValue + failedDelivery + shippingFee,
              };
            });
      if (!rows.length) throw new Error("File không có dòng dữ liệu để nhập.");
      if (
        !window.confirm(
          sheet === "shopee"
            ? `Nhập ${rows.length} dòng vào ${monthLabel(month)}? Đơn trùng mã sẽ được cập nhật, các đơn khác giữ nguyên. File phải chứa đủ các sản phẩm của từng đơn.`
            : `Thay dữ liệu ${sheet.toUpperCase()} của ${monthLabel(month)} bằng ${rows.length} dòng trong file này?`,
        )
      )
        return;
      await post(
        { action: "importMonthlyWorkbookRows", sheet, rows },
        `Đã nhập ${rows.length} dòng ${sheet.toUpperCase()}`,
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể đọc file Excel",
      );
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }
  return (
    <>
      <input
        ref={input}
        type="file"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="hidden"
        onChange={(event) => void importFile(event.target.files?.[0])}
      />
      <Button
        variant="outline"
        disabled={busy}
        onClick={() => input.current?.click()}
      >
        <FileSpreadsheet /> {busy ? "Đang đọc file..." : label}
      </Button>
    </>
  );
}

function WorkbookView({
  data,
  post,
  selectedMonth,
  currentMonth,
}: {
  data: StoreData;
  post: Post;
  selectedMonth: string;
  currentMonth: string;
}) {
  const orderDate =
    selectedMonth === currentMonth
      ? new Date().toISOString().slice(0, 16)
      : `${selectedMonth}-01T09:00`;
  const channels = data.settings.orderChannels;
  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-[#9cc9e8] bg-[#d9eaf7] p-5 lg:flex-row lg:items-center">
        <div>
          <h2 className="text-lg font-black text-[#1f4e78]">
            Đơn hàng {monthLabel(selectedMonth)}
          </h2>
          <p className="mt-1 text-sm text-[#445267]">
            Đơn được tách theo nguồn bán. Tổng số đơn và nguồn đơn sẽ tự đồng bộ
            sang Dashboard.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ImportMonthlyWorkbook
            sheet="shopee"
            month={selectedMonth}
            post={post}
          />
          <OptionManagerDialog
            group="orderChannels"
            title="Quản lý nguồn đơn"
            addLabel="Thêm nguồn đơn"
            options={channels}
            post={post}
          />
        </div>
      </div>
      <Tabs defaultValue="shopee">
        <div className="overflow-x-auto pb-1">
          <TabsList className="h-auto min-w-max bg-[#d9eaf7]">
            {channels.map((channel) => (
              <TabsTrigger key={channel.id} value={channel.id}>
                {channel.name} (
                {channel.id === "shopee"
                  ? data.shopeeRows.length
                  : data.orders.filter(
                      (order) =>
                        order.salesChannel === channel.name,
                    ).length}
                )
              </TabsTrigger>
            ))}
            <TabsTrigger value="catalog">
              Mã sản phẩm ({data.catalogRows.length})
            </TabsTrigger>
          </TabsList>
        </div>
        {channels.map((channel) => (
          <TabsContent key={channel.id} value={channel.id}>
            {channel.id === "shopee" ? (
              <ShopeeOrderChannel rows={data.shopeeRows} post={post} month={selectedMonth} orderDate={orderDate} />
            ) : (
              <ManualOrderChannel
                channel={channel.name}
                data={data}
                post={post}
                selectedMonth={selectedMonth}
              />
            )}
          </TabsContent>
        ))}
        <TabsContent value="catalog">
          <SpreadsheetGrid
            sheet="catalog"
            title="Mã sản phẩm"
            rows={data.catalogRows as unknown as AnySheetRow[]}
            columns={catalogColumns}
            post={post}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ShopeeRowDialog({ row, defaults, post }: { row?: ShopeeRow; defaults: Partial<AnySheetRow>; post: Post }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild><Button variant={row ? "outline" : "default"}>{row ? "Sửa sản phẩm" : "Thêm đơn Shopee"}</Button></DialogTrigger>
    <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
      <DialogHeader><DialogTitle>{row ? "Sửa chi tiết đơn Shopee" : "Thêm đơn Shopee"}</DialogTitle><DialogDescription>Giữ đầy đủ các khoản tiền và phí Shopee. Các sản phẩm cùng mã đơn sẽ được hiển thị chung.</DialogDescription></DialogHeader>
      <form className="space-y-4" onSubmit={async (event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const draft: AnySheetRow = { id: 0, ...(row || defaults) };
        for (const column of shopeeColumns) draft[column.key] = column.type === "number" ? Number(form.get(column.key)) || 0 : String(form.get(column.key) || "");
        if (!draft.orderCode && !draft.trackingCode) { toast.error("Hãy nhập mã đơn hoặc mã vận đơn."); return; }
        setBusy(true);
        try { await post({ action: "saveWorkbookRow", sheet: "shopee", row: draft }, "Đã lưu đơn Shopee"); setOpen(false); }
        catch (error) { toast.error(error instanceof Error ? error.message : "Không thể lưu đơn Shopee"); }
        finally { setBusy(false); }
      }}>
        <div className="grid gap-4 sm:grid-cols-2">
          {shopeeColumns.map((column) => <label key={column.key} className="block text-sm font-semibold">{column.label}
            <Input name={column.key} type={column.key === "orderDate" ? "date" : column.type || "text"} defaultValue={String((row as unknown as AnySheetRow | undefined)?.[column.key] ?? defaults[column.key] ?? "").slice(0, column.key === "orderDate" ? 10 : undefined)} required={["orderDate", "productName", "quantity"].includes(column.key)} min={column.key === "quantity" ? 1 : column.type === "number" ? 0 : undefined} step={column.key === "quantity" ? 1 : column.type === "number" ? "any" : undefined} />
          </label>)}
        </div>
        <Button type="submit" disabled={busy}>{busy ? "Đang lưu..." : "Lưu"}</Button>
      </form>
    </DialogContent>
  </Dialog>;
}

function ShopeeOrderChannel({ rows, post, month, orderDate }: { rows: ShopeeRow[]; post: Post; month: string; orderDate: string }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const groups = new Map<string, ShopeeRow[]>();
  for (const row of rows) {
    const key = row.orderCode || row.trackingCode || `${row.orderDate}|${row.buyer}`;
    groups.set(key, [...(groups.get(key) || []), row]);
  }
  const visible = [...groups.entries()]
    .filter(([key, items]) => `${key} ${items.map((row) => `${row.buyer} ${row.sku} ${row.productName} ${row.trackingCode}`).join(" ")}`.toLocaleLowerCase("vi").includes(search.toLocaleLowerCase("vi")))
    .sort(([, a], [, b]) => b[0].orderDate.slice(0, 10).localeCompare(a[0].orderDate.slice(0, 10)) || Math.max(...b.map(row => row.id)) - Math.max(...a.map(row => row.id)));
  const pageSize = 8;
  const pageCount = Math.max(1, Math.ceil(visible.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageRows = visible.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const selectedItems = selectedKey ? groups.get(selectedKey) || [] : [];
  return <Panel title={`Shopee-${month}`} subtitle={`${groups.size} đơn · nguồn đơn: Shopee`} action={<ShopeeRowDialog defaults={{ orderDate, quantity: 1 }} post={post} />}>
    <div className="mb-4 flex flex-wrap gap-3"><Input aria-label="Tìm đơn Shopee" className="h-11 max-w-md flex-1 rounded-2xl bg-[#f8fcff]" placeholder="Tìm mã đơn, khách hàng, sản phẩm..." value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} /><ImportMonthlyWorkbook sheet="shopee" month={month} post={post} /></div>
    <DataTable headers={["Ngày", "Mã đơn", "Nguồn đơn", "Khách hàng", "Sản phẩm", "Màu · Size", "SL", "Vận chuyển", "Thanh toán", "Tổng tiền", "Thao tác"]}>
      {pageRows.map(([key, items]) => {
        const first = items[0];
        const summary = shopeeOrderSummaries(items)[0];
        const canceled = items.some((row) =>
          isCanceledShopeeStatus(row.orderStatus),
        );
        const returned = items.some((row) =>
          isReturnedShopeeStatus(row.orderStatus),
        );
        const inactive = canceled || returned;
        const normalizedSize = (value: string) => {
          const normalized = value.trim().toLocaleLowerCase("vi");
          if (["fs", "free size", "freesize"].includes(normalized))
            return "Free size";
          if (["os", "over size", "oversize"].includes(normalized))
            return "Oversize";
          return value.trim().toUpperCase();
        };
        const issueRows = items.filter(
          (row) =>
            row.stockIssue ||
            !row.sku ||
            !row.color ||
            !["S", "M", "L", "Free size", "Oversize"].includes(
              normalizedSize(row.size),
            ),
        );
        return <TableRow key={key} onClick={() => setSelectedKey(key)} className={`cursor-pointer transition ${inactive ? "bg-red-100/90 hover:bg-red-100" : issueRows.length ? "bg-amber-100/80 hover:bg-amber-100" : "hover:bg-sky-50/70"}`}>
          <TableCell>{dateText(first.orderDate)}</TableCell><TableCell className="font-mono text-xs font-bold">{first.orderCode || first.trackingCode || "Chưa có mã"}</TableCell>
          <TableCell><Tag>Shopee</Tag></TableCell><TableCell>{first.buyer || "—"}</TableCell>
          <TableCell className="min-w-60">{items.map((row) => <div key={row.id} className="py-1"><p className="font-semibold">{row.productName} <span className="font-mono text-xs">({row.sku || "—"})</span></p>{row.stockIssue && <p className="mt-1 text-xs font-bold text-amber-800">⚠ {row.stockIssue}</p>}</div>)}</TableCell>
          <TableCell className="min-w-40">{items.map((row) => <p key={row.id} className={row.stockIssue ? "py-1 font-bold text-amber-800" : "py-1"}>{[row.color, row.size].filter(Boolean).join(" · ") || "Thiếu màu / size"} × {row.quantity}</p>)}</TableCell>
          <TableCell>{items.reduce((sum, row) => sum + row.quantity, 0)}</TableCell>
          <TableCell><p className="font-mono text-xs">{first.trackingCode || "—"}</p><p className={inactive ? "mt-1 w-fit rounded-full bg-red-600 px-2.5 py-1 text-xs font-bold text-white" : undefined}>{first.orderStatus}</p></TableCell>
          <TableCell>{first.paymentMethod || "—"}</TableCell><TableCell className={`font-black ${inactive ? "text-red-700" : ""}`}><p>{money.format(inactive ? 0 : summary?.revenue ?? shopeeNetOrderValue(items))}</p><p className="mt-1 text-[11px] font-medium text-slate-500">{returned ? "Đơn đã hoàn · không tính doanh thu" : canceled ? "Đơn đã hủy · không tính" : "Doanh thu Shop − phí vận chuyển − phí sàn"}</p></TableCell>
          <TableCell onClick={(event) => event.stopPropagation()}><div className="flex gap-2">
            <Dialog><DialogTrigger asChild><Button variant="outline">Xem / Sửa</Button></DialogTrigger><DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>Đơn Shopee · {first.orderCode || first.trackingCode || key}</DialogTitle><DialogDescription>Chỉnh từng sản phẩm và các khoản phí trong đơn.</DialogDescription></DialogHeader>
              {items.map((row) => <div key={row.id} className="flex items-center justify-between gap-3 rounded-xl border p-4"><div><b>{row.productName}</b><p>{row.sku} · {row.color} · {row.size} × {row.quantity}</p></div><ShopeeRowDialog row={row} defaults={{}} post={post} /></div>)}
              <ShopeeRowDialog defaults={{ orderDate: first.orderDate, orderCode: first.orderCode || "", trackingCode: first.trackingCode, buyer: first.buyer, quantity: 1, orderValue: first.orderValue, paymentMethod: first.paymentMethod }} post={post} />
            </DialogContent></Dialog>
            <Button variant="destructive" onClick={async () => {
              if (!window.confirm(`Xóa đơn Shopee ${first.orderCode || first.trackingCode || key} và ${items.length} dòng sản phẩm?`)) return;
              try { await post({ action: "deleteShopeeOrder", rowId: first.id }, "Đã xóa đơn Shopee"); }
              catch (error) { toast.error(error instanceof Error ? error.message : "Không thể xóa đơn"); }
            }}>Xóa</Button>
          </div></TableCell>
        </TableRow>;
      })}
    </DataTable>
    {pageCount > 1 && <div className="mt-4 flex justify-center gap-2">{Array.from({ length: pageCount }, (_, index) => index + 1).map((number) => <Button key={number} type="button" size="sm" variant={number === currentPage ? "default" : "outline"} onClick={() => setPage(number)}>{number}</Button>)}</div>}
    {!visible.length && <p className="p-5 text-sm text-slate-500">Không có đơn Shopee phù hợp.</p>}
    <ShopeeOrderDetailDialog items={selectedItems} open={Boolean(selectedKey)} onOpenChange={(open) => !open && setSelectedKey(null)} />
  </Panel>;
}

function ShopeeOrderDetailDialog({ items, open, onOpenChange }: { items: ShopeeRow[]; open: boolean; onOpenChange: (open: boolean) => void }) {
  if (!items.length) return null;
  const first = items[0];
  const canceled = items.some((row) => isCanceledShopeeStatus(row.orderStatus));
  const returned = items.some((row) => isReturnedShopeeStatus(row.orderStatus));
  const total = canceled || returned ? 0 : shopeeOrderSummaries(items)[0]?.revenue ?? shopeeNetOrderValue(items);
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle className="text-2xl">{first.orderCode || first.trackingCode || "Đơn Shopee"}</DialogTitle><DialogDescription>Shopee · {dateText(first.orderDate)} · {first.buyer || "Khách hàng"}</DialogDescription></DialogHeader><div className="grid gap-3 rounded-2xl bg-[#f8fcff] p-4 text-sm sm:grid-cols-[150px_1fr]"><span className="text-[#64748b]">Sản phẩm</span><div className="space-y-2">{items.map((item) => <p key={item.id}><b>{item.sku ? `${item.sku} · ` : ""}{item.productName}</b><br /><span className="text-[#64748b]">{item.color || "Thiếu màu"} · {item.size || "Thiếu size"} × {item.quantity}</span>{item.stockIssue && <span className="block font-bold text-amber-700">⚠ {item.stockIssue}</span>}</p>)}</div><span className="text-[#64748b]">Vận chuyển</span><b>{first.trackingCode || "—"}</b><span className="text-[#64748b]">Thanh toán</span><b>{first.paymentMethod || "—"}</b><span className="text-[#64748b]">Trạng thái</span><b>{returned ? "Đã hoàn" : canceled ? "Đã hủy" : first.orderStatus || "—"}</b></div><div className="flex items-center justify-between border-t pt-4 text-xl font-black"><span>Thành tiền</span><span>{money.format(total)}</span></div></DialogContent></Dialog>;
}

function ShippingView({
  data,
  post,
  selectedMonth,
}: {
  data: StoreData;
  post: Post;
  selectedMonth: string;
}) {
  const providers = data.settings.shippingProviders;
  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-[#9cc9e8] bg-[#d9eaf7] p-5 lg:flex-row lg:items-center">
        <div>
          <h2 className="text-lg font-black text-[#1f4e78]">
            Vận chuyển {monthLabel(selectedMonth)}
          </h2>
          <p className="mt-1 text-sm text-[#445267]">
            Theo dõi SPX, Giao hàng nhanh, Viettel Post hoặc cách vận chuyển
            khác trong từng bảng riêng.
          </p>
        </div>
        <OptionManagerDialog
          group="shippingProviders"
          title="Quản lý đơn vị vận chuyển"
          addLabel="Thêm đơn vị"
          options={providers}
          post={post}
        />
      </div>
      <Tabs defaultValue="spx">
        <div className="overflow-x-auto pb-1">
          <TabsList className="h-auto min-w-max bg-[#d9eaf7]">
            {providers.map((provider) => (
              <TabsTrigger key={provider.id} value={provider.id}>
                {provider.name} (
                {
                  data.spxRows.filter(
                    (row) =>
                      row.provider === provider.name &&
                      (!row.createDate ||
                        row.createDate.startsWith(selectedMonth)),
                  ).length
                }
                )
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        {providers.map((provider) => {
          const rows = data.spxRows.filter(
            (row) =>
              row.provider === provider.name &&
              row.createDate.startsWith(selectedMonth),
          );
          const undatedRows = data.spxRows.filter(
            (row) => row.provider === provider.name && !row.createDate,
          );
          return (
            <TabsContent
              key={provider.id}
              value={provider.id}
              className="space-y-4"
            >
              <div className="flex justify-end">
                {provider.id === "spx" && (
                  <ImportMonthlyWorkbook
                    sheet="spx"
                    month={selectedMonth}
                    post={post}
                  />
                )}
              </div>
              <SpreadsheetGrid
                sheet="spx"
                title={`${provider.name}-${selectedMonth}`}
                rows={rows as unknown as AnySheetRow[]}
                columns={spxColumns}
                post={post}
                defaults={{
                  createDate: `${selectedMonth}-01T09:00`,
                  provider: provider.name,
                }}
              />
              {undatedRows.length > 0 && (
                <section className="space-y-4">
                  <div className="rounded-2xl border border-[#f59e0b] bg-[#fffbeb] p-5 text-[#92400e]">
                    <h2 className="font-black">
                      Chưa xác định tháng ({undatedRows.length})
                    </h2>
                    <p className="mt-1 text-sm">
                      Điền ngày tạo rồi bấm Lưu; vận đơn sẽ tự chuyển vào đúng
                      tháng.
                    </p>
                  </div>
                  <SpreadsheetGrid
                    sheet="spx"
                    title={`${provider.name}-chua-xac-dinh-thang`}
                    rows={undatedRows as unknown as AnySheetRow[]}
                    columns={spxColumns}
                    post={post}
                    defaults={{ provider: provider.name }}
                  />
                </section>
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}

function OptionManagerDialog({
  group,
  title,
  addLabel,
  options,
  post,
}: {
  group: keyof StoreSettings;
  title: string;
  addLabel: string;
  options: NamedOption[];
  post: Post;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline">
            <Settings2 /> {title}
          </Button>
        }
      />
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Đổi tên các mục đang có hoặc thêm mục mới. Dữ liệu cũ sẽ được giữ
            nguyên và cập nhật theo tên mới.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {options.map((option) => (
            <RenameOptionForm
              key={option.id}
              group={group}
              option={option}
              post={post}
            />
          ))}
        </div>
        <ActionForm
          submitLabel={addLabel}
          onSubmit={async (form) => {
            await post(
              { action: "saveNamedOption", group, name: form.get("name") },
              `Đã ${addLabel.toLowerCase()}`,
            );
          }}
        >
          <Field label="Tên mục mới">
            <Input
              name="name"
              minLength={2}
              maxLength={50}
              placeholder={
                group === "orderChannels"
                  ? "Ví dụ: Facebook, Website"
                  : "Ví dụ: Grab, Ahamove"
              }
              required
            />
          </Field>
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}

function RenameOptionForm({
  group,
  option,
  post,
}: {
  group: keyof StoreSettings;
  option: NamedOption;
  post: Post;
}) {
  const [name, setName] = useState(option.name);
  const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (name.trim() === option.name) return;
    setBusy(true);
    try {
      await post(
        { action: "saveNamedOption", group, optionId: option.id, name },
        "Đã đổi tên mục",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể đổi tên");
    } finally {
      setBusy(false);
    }
  };
  return (
    <form
      onSubmit={submit}
      className="flex items-center gap-2 rounded-xl border border-[#bae6fd] bg-[#f8fcff] p-2"
    >
      <PencilLine className="ml-1 size-4 shrink-0 text-[#64748b]" />
      <Input
        aria-label={`Tên mục ${option.name}`}
        value={name}
        minLength={2}
        maxLength={50}
        onChange={(event) => setName(event.target.value)}
        required
      />
      <Button
        type="submit"
        size="sm"
        variant="outline"
        disabled={busy || name.trim() === option.name}
      >
        {busy ? "..." : "Lưu tên"}
      </Button>
    </form>
  );
}

function SizeExchangeView({ data, post, selectedMonth }: { data: StoreData; post: Post; selectedMonth: string }) {
  const [orderId, setOrderId] = useState("");
  const orders = data.orders.filter((order) => !order.returned && order.items?.length).sort((a, b) => b.orderDate.slice(0, 10).localeCompare(a.orderDate.slice(0, 10)) || b.id - a.id);
  const selected = orders.find((order) => String(order.id) === orderId);
  const history = data.audit.filter((entry) => entry.action === "Đổi size" && entry.createdAt.startsWith(selectedMonth))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return <div className="grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
    <Panel title="Đổi size hàng" subtitle="Chọn đơn đã mua để trả size cũ và nhận size mới. Không thay đổi giá trị đơn hàng.">
      <div className="space-y-4">
        <label className="min-w-64 flex-1">Mã đơn cần đổi
          <select className="mt-2 w-full rounded-xl border p-3" value={orderId} onChange={(event) => setOrderId(event.target.value)}>
            <option value="">Chọn mã đơn</option>
            {orders.map((order) => <option key={order.id} value={order.id}>{order.code} · {order.customerName} · {dateText(order.orderDate)} · {order.salesChannel}</option>)}
          </select>
        </label>
        {selected && <ExchangeSizeDialog key={selected.id} order={selected} post={post} inline />}
        {!orders.length && <p className="text-sm text-slate-500">Chưa có đơn hàng có thể đổi size.</p>}
      </div>
    </Panel>
    <Panel title="Lịch sử đổi size" subtitle={`${history.length} lần đổi · ${monthLabel(selectedMonth)}`}>
      <DataTable headers={["Ngày", "Giờ", "Chi tiết đổi size"]}>
        {history.map((entry) => <TableRow key={entry.id}>
          <TableCell>{dateText(entry.createdAt)}</TableCell>
          <TableCell>{new Date(entry.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Ho_Chi_Minh" })}</TableCell>
          <TableCell className="min-w-80">{entry.details}</TableCell>
        </TableRow>)}
      </DataTable>
      {!history.length && <p className="p-5 text-sm text-slate-500">Chưa có lần đổi size trong tháng này.</p>}
    </Panel>
  </div>;
}

function ExchangeSizeDialog({ order, post, inline = false }: { order: Order; post: Post; inline?: boolean }) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const formContent = <form className="space-y-4" onSubmit={async (event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        setBusy(true);
        try {
          await post({ action: "exchangeOrderSize", orderId: order.id, itemIndex: index, oldSize: order.items[index]?.size, newSize: form.get("newSize"), quantity: Number(form.get("quantity")), note: form.get("note") }, "Đã đổi size và cập nhật kho");
          setOpen(false);
        } catch (error) { toast.error(error instanceof Error ? error.message : "Không thể đổi size"); }
        finally { setBusy(false); }
      }}>
        <label className="block">Sản phẩm trả
          <select className="mt-2 w-full rounded-xl border p-3" value={index} onChange={(event) => setIndex(Number(event.target.value))}>
            {order.items.map((item, i) => <option key={i} value={i}>{item.sku} · {item.productName} · {item.color} · {item.size} × {item.quantity}</option>)}
          </select>
        </label>
        <label className="block">Size nhận<select name="newSize" required className="mt-2 w-full rounded-xl border p-3" defaultValue=""><option value="" disabled>Chọn size mới</option>{["S", "M", "L", "Freesize", "Oversize"].filter((size) => size.toLowerCase() !== order.items[index]?.size.toLowerCase()).map((size) => <option key={size}>{size}</option>)}</select></label>
        <label className="block">Số lượng đổi<Input key={index} name="quantity" type="number" min={1} max={order.items[index]?.quantity} defaultValue={1} required /></label>
        <label className="block">Ghi chú<Input name="note" /></label>
        <Button className={inline ? "w-full" : undefined} type="submit" disabled={busy || !order.items.length}>{busy ? "Đang lưu..." : "Lưu đổi size"}</Button>
      </form>;
  if (inline) return <>{formContent}<p className="mt-4 rounded-xl bg-[#f0f9ff] p-3 text-sm text-[#64748b]">Trả size cũ vào kho, trừ size mới và cập nhật đơn hàng. Giá trị đơn và doanh thu giữ nguyên.</p></>;
  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild><Button variant="outline" onClick={() => setIndex(0)}>Đổi size</Button></DialogTrigger>
    <DialogContent>
      <DialogHeader><DialogTitle>Đổi size · {order.code}</DialogTitle><DialogDescription>Trả hàng vào kho và lấy size mới từ bảng kiểm kho gần nhất. Giá và doanh thu giữ nguyên.</DialogDescription></DialogHeader>
      {formContent}
    </DialogContent>
  </Dialog>;
}

function ManualOrderChannel({
  channel,
  data,
  post,
  selectedMonth,
}: {
  channel: string;
  data: StoreData;
  post: Post;
  selectedMonth: string;
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const allRows = data.orders.filter(
    (order) => order.salesChannel === channel,
  ).sort((a, b) => b.orderDate.slice(0, 10).localeCompare(a.orderDate.slice(0, 10)) || b.id - a.id);
  const rows = allRows.filter((order) => `${order.code} ${order.customerName} ${order.phone} ${order.items?.map((item) => `${item.sku} ${item.productName}`).join(" ") || order.productName}`.toLocaleLowerCase("vi").includes(search.toLocaleLowerCase("vi")));
  const pageSize = 8;
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visibleRows = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  return (
    <Panel
      title={`${channel}-${selectedMonth}`}
      subtitle={`${allRows.length} đơn · nguồn đơn: ${channel}`}
      action={
        <CreateOrderDialog
          channel={channel}
          data={data}
          post={post}
          selectedMonth={selectedMonth}
        />
      }
    >
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center"><Input aria-label={`Tìm đơn ${channel}`} className="h-11 flex-1 rounded-2xl bg-[#f8fcff]" placeholder="Tìm tên khách, SĐT, mã đơn hoặc mã hàng..." value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} /><span className="whitespace-nowrap rounded-full bg-sky-50 px-3 py-2 text-xs font-bold text-sky-700">{rows.length} đơn phù hợp</span></div>
      <DataTable
        headers={[
          "Ngày",
          "Mã đơn",
          "Nguồn đơn",
          "Khách hàng",
          "Điện thoại",
          "Địa chỉ",
          "Sản phẩm",
          "Màu · Size",
          "SL",
          "Vận chuyển",
          "Thanh toán",
          "Tổng tiền",
          "Thao tác",
        ]}
      >
        {visibleRows.map((order) => (
          <TableRow key={order.id} onClick={() => setSelectedOrder(order)} className={`cursor-pointer transition hover:bg-sky-50/70 ${order.returned ? "bg-red-100/90 hover:bg-red-100" : ""}`}>
            <TableCell>{dateText(order.orderDate)}</TableCell>
            <TableCell className="font-mono text-xs font-bold">
              {order.code}
            </TableCell>
            <TableCell onClick={(event) => event.stopPropagation()}>
              <Tag>{order.salesChannel}</Tag>
            </TableCell>
            <TableCell>{order.customerName}</TableCell>
            <TableCell>{order.phone || "—"}</TableCell>
            <TableCell className="min-w-52">{order.address || "—"}</TableCell>
            <TableCell className="min-w-60">
              <div className="space-y-1.5">
                {(order.items?.length
                  ? order.items
                  : [
                      {
                        productName: order.productName,
                        sku: "",
                        color: order.color,
                        size: order.size,
                        quantity: order.quantity,
                      },
                    ]
                ).map((item, index) => (
                  <p key={`${item.sku}-${item.color}-${item.size}-${index}`}>
                    <span className="font-semibold">{item.productName}</span>
                    {item.sku && (
                      <span className="ml-1 font-mono text-xs text-[#64748b]">
                        ({item.sku})
                      </span>
                    )}
                  </p>
                ))}
              </div>
            </TableCell>
            <TableCell className="min-w-44">
              <div className="space-y-1.5">
                {(order.items?.length
                  ? order.items
                  : [
                      {
                        sku: "",
                        color: order.color,
                        size: order.size,
                        quantity: order.quantity,
                      },
                    ]
                ).map((item, index) => (
                  <p key={`${item.sku}-${item.color}-${item.size}-${index}`}>
                    {[item.color, item.size].filter(Boolean).join(" · ") || "—"}
                    <b className="ml-1">× {item.quantity}</b>
                  </p>
                ))}
              </div>
            </TableCell>
            <TableCell>{order.quantity}</TableCell>
            <TableCell>
              <b>{order.shippingProvider || "—"}</b>
              {order.trackingCode && (
                <p className="font-mono text-xs">{order.trackingCode}</p>
              )}
              <p
                className={`mt-1 w-fit rounded-full px-2.5 py-1 text-xs font-bold ${
                  order.deliveryStatus === "Chờ lấy hàng"
                    ? "bg-violet-100 text-violet-800 ring-1 ring-violet-200"
                    : "bg-sky-50 text-sky-700"
                }`}
              >
                {order.deliveryStatus}
              </p>
              {Boolean(order.returned) && (
                <p className="mt-1 w-fit rounded-full bg-red-600 px-2.5 py-1 text-xs font-bold text-white">
                  Đã hoàn · không tính doanh thu
                </p>
              )}
            </TableCell>
            <TableCell>
              <div
                className={`w-fit rounded-xl px-2.5 py-1.5 text-xs font-bold ${
                  !isPaidOrder(order.paymentStatus)
                    ? "bg-amber-100 text-amber-900 ring-1 ring-amber-200"
                    : "bg-emerald-50 text-emerald-700"
                }`}
              >
                {order.paymentMethod} · {order.paymentStatus}
              </div>
            </TableCell>
            <TableCell className="font-black">
              {money.format(order.returned ? 0 : order.totalAmount)}
              {Boolean(order.returned) && (
                <p className="mt-1 text-[11px] font-medium text-red-700">
                  Giá trị cũ: {money.format(order.totalAmount)}
                </p>
              )}
            </TableCell>
            <TableCell>
              {order.returned ? (
                <Tag>Đã hoàn</Tag>
              ) : <div className="flex gap-2">
                <CreateOrderDialog
                  channel={channel}
                  data={data}
                  post={post}
                  selectedMonth={selectedMonth}
                  order={order}
                />
                <ExchangeSizeDialog order={order} post={post} />
                <Button
                  variant="destructive"
                  onClick={async () => {
                    if (
                      !window.confirm(
                        `Xóa đơn ${order.code}? Số lượng sẽ được hoàn lại vào bảng kiểm kho gần nhất.`,
                      )
                    )
                      return;
                    try {
                      await post(
                        { action: "deleteManualOrder", orderId: order.id },
                        "Đã xóa đơn và hoàn lại tồn kho",
                      );
                    } catch (error) {
                      toast.error(
                        error instanceof Error
                          ? error.message
                          : "Không thể xóa đơn",
                      );
                    }
                  }}
                >
                  Xóa
                </Button>
              </div>}
            </TableCell>
          </TableRow>
        ))}
      </DataTable>
      {pageCount > 1 && <div className="mt-4 flex justify-center gap-2">{Array.from({ length: pageCount }, (_, index) => index + 1).map((number) => <Button key={number} type="button" size="sm" variant={number === currentPage ? "default" : "outline"} onClick={() => setPage(number)}>{number}</Button>)}</div>}
      {!rows.length && (
        <Empty text={`Chưa có đơn từ ${channel} trong tháng này.`} />
      )}
      <ManualOrderDetailDialog order={selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)} />
    </Panel>
  );
}

function ManualOrderDetailDialog({ order, onOpenChange }: { order: Order | null; onOpenChange: (open: boolean) => void }) {
  if (!order) return null;
  const items = order.items?.length ? order.items : [{ productId: order.productId, sku: "", productName: order.productName, color: order.color, size: order.size, quantity: order.quantity, unitPrice: order.subtotal, lineTotal: order.subtotal }];
  return <Dialog open={Boolean(order)} onOpenChange={onOpenChange}><DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle className="text-2xl">{order.code}</DialogTitle><DialogDescription>{order.salesChannel} · {dateText(order.orderDate)} · {order.customerName}</DialogDescription></DialogHeader><div className="grid gap-3 rounded-2xl bg-[#f8fcff] p-4 text-sm sm:grid-cols-[150px_1fr]"><span className="text-[#64748b]">Điện thoại</span><b>{order.phone || "—"}</b><span className="text-[#64748b]">Địa chỉ</span><b>{order.address || "—"}</b><span className="text-[#64748b]">Sản phẩm</span><div className="space-y-2">{items.map((item, index) => <p key={`${item.sku}-${index}`}><b>{item.sku ? `${item.sku} · ` : ""}{item.productName}</b><br /><span className="text-[#64748b]">{item.color} · {item.size} × {item.quantity}</span></p>)}</div><span className="text-[#64748b]">Vận chuyển</span><b>{order.shippingProvider || "—"}{order.trackingCode ? ` · ${order.trackingCode}` : ""}</b><span className="text-[#64748b]">Phí ship khách trả</span><b>{order.shippingFee ? money.format(order.shippingFee) : "Miễn phí / 0 ₫"}</b><span className="text-[#64748b]">Thanh toán</span><b>{order.paymentMethod} · {order.paymentStatus}</b><span className="text-[#64748b]">Trạng thái</span><b>{order.returned ? "Đã hoàn" : order.deliveryStatus}</b></div><div className="flex items-center justify-between border-t pt-4 text-xl font-black"><span>Thành tiền</span><span>{money.format(order.returned ? 0 : order.totalAmount)}</span></div></DialogContent></Dialog>;
}

function CreateOrderDialog({
  channel,
  data,
  post,
  selectedMonth,
  order,
}: {
  channel: string;
  data: StoreData;
  post: Post;
  selectedMonth: string;
  order?: Order;
}) {
  const initialItems: OrderDraftItem[] = order
    ? (order.items?.length
        ? order.items
        : [
            {
              productId: order.productId,
              sku:
                data.products.find((product) => product.id === order.productId)
                  ?.sku || "",
              productName: order.productName,
              color: order.color,
              size: order.size,
              quantity: order.quantity,
            },
          ]
      ).map(({ productId, sku, productName, color, size, quantity }) => ({
        productId,
        sku,
        productName,
        color,
        size,
        quantity,
      }))
    : [];
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [productKey, setProductKey] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [color, setColor] = useState("");
  const [size, setSize] = useState("");
  const [itemQuantity, setItemQuantity] = useState(1);
  const [items, setItems] = useState<OrderDraftItem[]>(initialItems);
  const [discountType, setDiscountType] = useState(
    order?.discountType || "none",
  );
  const [discountValue, setDiscountValue] = useState(order?.discountValue || 0);
  const [surcharge, setSurcharge] = useState(order?.surcharge || 0);
  const [shippingFee, setShippingFee] = useState(
    order?.shippingFee ? String(order.shippingFee) : "",
  );
  const defaultDate =
    order?.orderDate.slice(0, 10) ||
    (selectedMonth === currentMonthKey()
      ? new Date().toISOString().slice(0, 10)
      : `${selectedMonth}-01`);
  const latestSnapshot = data.inventoryRows.reduce(
    (latest, row) =>
      row.snapshotDate <= `${selectedMonth}-31` && row.snapshotDate > latest
        ? row.snapshotDate
        : latest,
    "",
  );
  const inventory = data.inventoryRows.filter(
    (row) => row.snapshotDate === latestSnapshot,
  );
  const choices = [
    ...new Map(
      [
        ...inventory.filter(
          (row) => !data.catalogRows.some((item) => item.sku === row.sku),
        ).map((row) => ({
          sku: row.sku,
          name:
            row.itemType ||
            data.catalogRows.find((item) => item.sku === row.sku)?.name ||
            "Sản phẩm",
          price:
            data.catalogRows.find(
              (item) =>
                productPriceKey(item.sku, item.name) ===
                productPriceKey(row.sku, row.itemType),
            )?.price ??
            data.products.find((product) => product.sku === row.sku)
              ?.salePrice ??
            0,
        })),
        ...data.catalogRows.map((row) => ({
          sku: row.sku,
          name: row.name,
          price: row.price,
        })),
      ].map((choice) => [catalogIdentityKey(choice.sku, choice.name), choice]),
    ).values(),
  ];
  const [selectedSku, selectedName] = productKey.split("|||");
  const selectedPriceKey = productPriceKey(selectedSku, selectedName);
  const selectedUnitPrice =
    choices.find(
      (choice) =>
        catalogIdentityKey(choice.sku, choice.name) ===
        catalogIdentityKey(selectedSku, selectedName),
    )?.price ?? 0;
  const matchingRows = inventory.filter((row) => {
    if (row.sku !== selectedSku) return false;
    const rowKey = productPriceKey(row.sku, row.itemType);
    return selectedPriceKey === "S001:full-set"
      ? rowKey === "S001:ao" || rowKey === "S001:chan-vay"
      : selectedPriceKey === "S002:full-set"
        ? rowKey === "S002:ao" || rowKey === "S002:quan"
      : rowKey === selectedPriceKey ||
          (!row.itemType.trim() &&
            data.catalogRows.filter((item) => item.sku === selectedSku)
              .length === 1);
  });
  const colors = [
    ...new Set(matchingRows.map((row) => row.color).filter(Boolean)),
  ];
  const colorRows = matchingRows.filter((row) => row.color === color);
  const sizes = (
    [
      { key: "sizeS", name: "S" },
      { key: "sizeM", name: "M" },
      { key: "sizeL", name: "L" },
      { key: "freeSize", name: "Free size" },
      { key: "oversize", name: "Oversize" },
    ] as const
  ).filter((option) => {
    if (
      selectedPriceKey !== "S001:full-set" &&
      selectedPriceKey !== "S002:full-set"
    )
      return colorRows.some((row) => row[option.key] > 0);
    const componentKeys =
      selectedPriceKey === "S001:full-set"
        ? ["S001:ao", "S001:chan-vay"]
        : ["S002:ao", "S002:quan"];
    const components = componentKeys.map((key) =>
      colorRows.find(
        (row) => productPriceKey(row.sku, row.itemType) === key,
      ),
    );
    return Boolean(
      components.every((row) => row && row[option.key] > 0),
    );
  });
  const productId =
    data.products.find((product) => product.sku === selectedSku)?.id || 0;
  const cartTotal = items.reduce((sum, item) => {
    const price =
      data.catalogRows.find(
        (row) =>
          catalogIdentityKey(row.sku, row.name) ===
          catalogIdentityKey(item.sku, item.productName),
      )?.price ??
      data.products.find((product) => product.id === item.productId)
        ?.salePrice ??
      0;
    return sum + price * item.quantity;
  }, 0);
  const discountAmount =
    discountType === "percent"
      ? Math.min(cartTotal, Math.round((cartTotal * discountValue) / 100))
      : discountType === "amount"
        ? Math.min(cartTotal, discountValue)
        : 0;
  const customerShippingFee = Math.max(0, Number(shippingFee) || 0);
  const finalTotal = Math.max(
    0,
    cartTotal - discountAmount + surcharge + customerShippingFee,
  );
  const addItem = () => {
    if (!productId || !selectedSku || !selectedName || !color || !size) {
      toast.error("Hãy chọn đủ sản phẩm, màu và size.");
      return;
    }
    if (!Number.isInteger(itemQuantity) || itemQuantity < 1) {
      toast.error("Số lượng sản phẩm chưa hợp lệ.");
      return;
    }
    setItems((current) => {
      const index = current.findIndex(
        (item) =>
          item.productId === productId &&
          catalogIdentityKey(item.sku, item.productName) ===
            catalogIdentityKey(selectedSku, selectedName) &&
          item.color === color &&
          item.size === size,
      );
      if (index < 0)
        return [
          ...current,
          {
            productId,
            sku: selectedSku,
            productName: selectedName,
            color,
            size,
            quantity: itemQuantity,
          },
        ];
      return current.map((item, itemIndex) =>
        itemIndex === index
          ? { ...item, quantity: item.quantity + itemQuantity }
          : item,
      );
    });
    setProductKey("");
    setProductSearch("");
    setColor("");
    setSize("");
    setItemQuantity(1);
  };
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { setOpen(nextOpen); if (nextOpen) setStep(1); }}>
      <DialogTrigger
        render={
          <Button variant={order ? "outline" : "default"}>
            {order ? <PencilLine /> : <Plus />} {order ? "Sửa" : "Thêm đơn"}
          </Button>
        }
      />
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {order ? `Sửa đơn ${order.code}` : `Thêm đơn · ${channel}`}
          </DialogTitle>
          <DialogDescription>Bước {step}/3 · {step === 1 ? "Thông tin khách hàng" : step === 2 ? "Sản phẩm trong đơn" : "Vận chuyển và thanh toán"}</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-3 gap-3">{[1, 2, 3].map((number) => <div key={number} className={`h-2 rounded-full transition-colors ${number <= step ? "bg-[#0284c7]" : "bg-[#d8eef9]"}`} />)}</div>
        <ActionForm
          showSubmit={step === 3}
          submitLabel={order ? "Lưu thay đổi" : "Lưu đơn hàng"}
          onSubmit={async (form) => {
            if (!items.length)
              throw new Error("Hãy thêm ít nhất một sản phẩm vào đơn hàng.");
            const first = items[0];
            await post(
              {
                action: order ? "updateManualOrder" : "createOrder",
                orderId: order?.id,
                order: {
                  customerName: form.get("customerName"),
                  phone: form.get("phone"),
                  address: form.get("address"),
                  salesChannel: channel,
                  shippingProvider: form.get("shippingProvider"),
                  trackingCode: form.get("trackingCode"),
                  shippingFee: Number(form.get("shippingFee")) || 0,
                  shippingNote: form.get("shippingNote"),
                  productId: first.productId,
                  sku: first.sku,
                  productName: first.productName,
                  color: first.color,
                  size: first.size,
                  quantity: first.quantity,
                  items,
                  orderDate: form.get("orderDate"),
                  deliveryStatus: form.get("deliveryStatus"),
                  paymentStatus: form.get("paymentStatus"),
                  paymentMethod: form.get("paymentMethod"),
                  discountType,
                  discountValue,
                  surcharge,
                },
              },
              order
                ? "Đã sửa đơn và đồng bộ các phân hệ"
                : `Đã thêm đơn từ ${channel} và cập nhật vận chuyển`,
            );
            setOpen(false);
            if (!order) {
              setProductKey("");
              setProductSearch("");
              setColor("");
              setSize("");
              setItemQuantity(1);
              setItems([]);
              setDiscountType("none");
              setDiscountValue(0);
              setSurcharge(0);
              setShippingFee("");
            }
          }}
        >
          <div className={step === 1 ? "grid gap-4" : "hidden"}>
          <Row>
            <Field label="Ngày đặt hàng">
              <Input
                name="orderDate"
                type="date"
                defaultValue={defaultDate}
                min={`${selectedMonth}-01`}
                max={`${selectedMonth}-31`}
                required
              />
            </Field>
            <Field label="Khách hàng">
              <Input
                name="customerName"
                defaultValue={order?.customerName || "Khách lẻ"}
                required
              />
            </Field>
          </Row>
          <Row>
            <Field label="Số điện thoại">
              <Input
                name="phone"
                type="tel"
                inputMode="tel"
                defaultValue={order?.phone || ""}
                placeholder="Ví dụ: 0912345678"
                required
              />
            </Field>
            <Field label="Địa chỉ giao hàng">
              <Input
                name="address"
                defaultValue={order?.address || ""}
                placeholder="Số nhà, đường, phường/xã, tỉnh/thành"
                required
              />
            </Field>
          </Row>
          </div>
          <div className={step === 2 ? "grid gap-4" : "hidden"}>
          <Row>
            <Field label="Sản phẩm">
              <Input
                list="order-product-options"
                value={productSearch}
                placeholder="Gõ mã hàng hoặc tên sản phẩm..."
                onChange={(event) => {
                  const value = event.target.value;
                  setProductSearch(value);
                  const selected = choices.find((choice) => `${choice.sku} · ${choice.name}` === value || choice.sku.toLocaleLowerCase("vi") === value.trim().toLocaleLowerCase("vi"));
                  setProductKey(selected ? `${selected.sku}|||${selected.name}` : "");
                  setColor("");
                  setSize("");
                }}
              />
              <datalist id="order-product-options">{choices.map((choice) => <option key={`${choice.sku}|||${choice.name}`} value={`${choice.sku} · ${choice.name}`}>{money.format(choice.price)}</option>)}</datalist>
              {selectedName && (
                <p className="mt-1 text-xs font-semibold text-[#0369a1]">
                  Giá theo mã + tên: {money.format(selectedUnitPrice)}
                </p>
              )}
              {selectedName && !matchingRows.length && (
                <p className="mt-1 text-xs text-[#b45309]">
                  Chưa có dòng kiểm kho khớp sản phẩm này. Hãy bổ sung mã,
                  phân loại và màu trong bảng kiểm kho gần nhất.
                </p>
              )}
            </Field>
            <Field label="Màu">
              <Select
                value={color}
                onChange={(event) => {
                  setColor(event.target.value);
                  setSize("");
                }}
              >
                <option value="">Chọn màu</option>
                {colors.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </Select>
            </Field>
          </Row>
          <Row>
            <Field label="Size">
              <Select
                value={size}
                onChange={(event) => setSize(event.target.value)}
              >
                <option value="">Chọn size còn hàng</option>
                {sizes.map((option) => (
                  <option key={option.name}>{option.name}</option>
                ))}
              </Select>
            </Field>
            <Field label="Số lượng">
              <Input
                type="number"
                min="1"
                step="1"
                value={itemQuantity}
                onChange={(event) =>
                  setItemQuantity(Number(event.target.value))
                }
              />
            </Field>
          </Row>
          <Button type="button" variant="outline" onClick={addItem}>
            <Plus /> Thêm sản phẩm vào đơn
          </Button>
          <section className="rounded-2xl border border-[#bae6fd] bg-[#f8fcff] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-extrabold text-[#0c4a6e]">
                  Sản phẩm trong đơn
                </p>
                <p className="text-xs text-[#64748b]">
                  {items.length} dòng ·{" "}
                  {items.reduce((sum, item) => sum + item.quantity, 0)} sản phẩm
                </p>
              </div>
              <b className="text-[#0369a1]">{money.format(cartTotal)}</b>
            </div>
            <div className="mt-3 space-y-2">
              {items.map((item, index) => (
                <div
                  key={`${item.productId}-${item.color}-${item.size}-${index}`}
                  className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 shadow-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-bold">
                      {item.sku} · {item.productName}
                    </p>
                    <p className="text-xs text-[#64748b]">
                      {item.color} · {item.size} · SL {item.quantity}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="text-red-600 hover:bg-red-50 hover:text-red-700"
                    onClick={() =>
                      setItems((current) =>
                        current.filter((_, itemIndex) => itemIndex !== index),
                      )
                    }
                  >
                    Xóa
                  </Button>
                </div>
              ))}
              {!items.length && (
                <p className="rounded-xl border border-dashed border-[#7dd3fc] px-3 py-4 text-center text-sm text-[#64748b]">
                  Chưa có sản phẩm. Chọn sản phẩm, màu, size rồi bấm “Thêm sản
                  phẩm vào đơn”.
                </p>
              )}
            </div>
          </section>
          </div>
          <div className={step === 3 ? "grid gap-4" : "hidden"}>
          <Row>
            <Field label="Đơn vị vận chuyển">
              <Select
                name="shippingProvider"
                defaultValue={
                  order?.shippingProvider ||
                  data.settings.shippingProviders[0]?.name ||
                  ""
                }
                required
              >
                <option value="">Chọn đơn vị</option>
                {data.settings.shippingProviders.map((provider) => (
                  <option key={provider.id}>{provider.name}</option>
                ))}
              </Select>
            </Field>
            <Field label="Mã vận đơn">
              <Input
                name="trackingCode"
                defaultValue={order?.trackingCode || ""}
                placeholder="Để trống nếu chưa có"
              />
            </Field>
          </Row>
          <Row>
            <Field label="Phí giao hàng khách thanh toán (COD / Grab)">
              <Input
                name="shippingFee"
                type="number"
                min="0"
                step="1"
                value={shippingFee}
                placeholder="Để trống = 0 ₫"
                onChange={(event) =>
                  setShippingFee(event.target.value)
                }
              />
              <p className="mt-1 text-xs text-[#64748b]">
                Cộng thẳng vào tổng đơn do khách trả. Không nhập thì tính 0 ₫ và không ghi vào chi phí.
              </p>
            </Field>
            <Field label="Ghi chú vận chuyển">
              <Input
                name="shippingNote"
                defaultValue={order?.shippingNote || ""}
                placeholder="Cách giao, giờ nhận hoặc lưu ý khác"
              />
            </Field>
          </Row>
          <Row>
            <Field label="Hình thức giảm giá">
              <Select
                name="discountType"
                value={discountType}
                onChange={(event) => {
                  setDiscountType(event.target.value);
                  setDiscountValue(0);
                }}
              >
                <option value="none">Không giảm giá</option>
                <option value="percent">Giảm theo phần trăm (%)</option>
                <option value="amount">Giảm bằng số tiền</option>
              </Select>
            </Field>
            <Field
              label={
                discountType === "percent" ? "Phần trăm giảm" : "Số tiền giảm"
              }
            >
              <Input
                name="discountValue"
                type="number"
                min="0"
                max={discountType === "percent" ? 100 : undefined}
                step={discountType === "percent" ? "0.1" : "1"}
                value={discountValue}
                disabled={discountType === "none"}
                onChange={(event) =>
                  setDiscountValue(Math.max(0, Number(event.target.value)))
                }
              />
            </Field>
          </Row>
          <Row>
            <Field label="Phương thức thanh toán">
              <Select
                name="paymentMethod"
                defaultValue={order?.paymentMethod || "Tiền mặt"}
              >
                <option>Tiền mặt</option>
                <option>Chuyển khoản</option>
                <option>Thẻ</option>
                <option>COD</option>
              </Select>
            </Field>
            <Field label="Tiền cộng thêm">
              <Input
                name="surcharge"
                type="number"
                min="0"
                step="1"
                value={surcharge}
                onChange={(event) =>
                  setSurcharge(Math.max(0, Number(event.target.value)))
                }
              />
            </Field>
          </Row>
          <div className="grid gap-2 rounded-2xl border border-[#bae6fd] bg-[#f0f9ff] p-4 text-sm">
            <div className="flex justify-between gap-3">
              <span>Tạm tính</span>
              <b>{money.format(cartTotal)}</b>
            </div>
            <div className="flex justify-between gap-3 text-[#b45309]">
              <span>Giảm giá</span>
              <b>-{money.format(discountAmount)}</b>
            </div>
            {surcharge > 0 && (
              <div className="flex justify-between gap-3">
                <span>Tiền cộng thêm</span>
                <b>+{money.format(surcharge)}</b>
              </div>
            )}
            {customerShippingFee > 0 && (
              <div className="flex justify-between gap-3">
                <span>Phí giao hàng khách trả</span>
                <b>+{money.format(customerShippingFee)}</b>
              </div>
            )}
            <div className="flex justify-between gap-3 border-t border-[#bae6fd] pt-2 text-base text-[#0369a1]">
              <span className="font-extrabold">Tổng khách thanh toán</span>
              <b>{money.format(finalTotal)}</b>
            </div>
          </div>
          <Row>
            <Field label="Trạng thái giao hàng">
              <Select
                name="deliveryStatus"
                defaultValue={order?.deliveryStatus || "Chờ lấy hàng"}
              >
                <option>Chờ lấy hàng</option>
                <option>Đang giao</option>
                <option>Đã giao</option>
              </Select>
            </Field>
            <Field label="Trạng thái thanh toán">
              <Select
                name="paymentStatus"
                defaultValue={
                  order && isPaidOrder(order.paymentStatus)
                    ? "Đã thanh toán"
                    : order?.paymentStatus || "Chưa thanh toán"
                }
              >
                <option>Chưa thanh toán</option>
                <option>Chờ COD</option>
                <option>Đã thanh toán</option>
              </Select>
            </Field>
          </Row>
          </div>
          <div className="flex items-center justify-between gap-3 border-t pt-4">
            {step > 1 ? <Button type="button" variant="outline" onClick={() => setStep((value) => value - 1)}>Quay lại</Button> : <span />}
            {step < 3 && <Button type="button" onClick={() => { if (step === 2 && !items.length) { toast.error("Hãy thêm ít nhất một sản phẩm vào đơn hàng."); return; } setStep((value) => value + 1); }}>Tiếp tục</Button>}
          </div>
        </ActionForm>
        {!inventory.length && (
          <p className="rounded-xl bg-[#fff1e8] p-3 text-sm font-semibold text-[#b44b08]">
            Chưa có bảng tồn kho để tạo đơn. Hãy kiểm kho trước.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SpreadsheetGrid({
  sheet,
  title,
  rows,
  columns,
  post,
  defaults = {},
}: {
  sheet: SheetName;
  title: string;
  rows: AnySheetRow[];
  columns: SheetColumn[];
  post: Post;
  defaults?: Record<string, string | number>;
}) {
  const exportCsv = () => {
    const escape = (value: unknown) =>
      `"${String(value ?? "").replaceAll('"', '""')}"`;
    const csv = `\uFEFF${columns.map((column) => escape(column.label)).join(",")}\n${rows.map((row) => columns.map((column) => escape(row[column.key])).join(",")).join("\n")}`;
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `${title}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };
  return (
    <Panel
      title={title}
      subtitle={`${rows.length} dòng dữ liệu · cuộn ngang để xem đủ cột`}
      action={
        <Button variant="outline" onClick={exportCsv}>
          <FileSpreadsheet /> Xuất CSV
        </Button>
      }
    >
      <div className="max-h-[68vh] overflow-auto rounded-xl border border-[#9cc9e8]">
        <table className="min-w-max border-separate border-spacing-0 text-xs">
          <thead className="sticky top-0 z-20">
            <tr>
              <th className="sticky left-0 z-30 w-12 border-b border-r border-[#9cc9e8] bg-[#1f4e78] px-2 py-3 text-center font-bold text-white">
                #
              </th>
              {columns.map((column) => (
                <th
                  key={column.key}
                  style={{
                    width: column.width || "150px",
                    minWidth: column.width || "150px",
                  }}
                  className="border-b border-r border-[#9cc9e8] bg-[#1f4e78] px-3 py-3 text-left font-bold text-white"
                >
                  {column.label}
                </th>
              ))}
              <th className="sticky right-0 z-30 w-28 border-b bg-[#1f4e78] px-3 py-3 text-white">
                Thao tác
              </th>
            </tr>
          </thead>
          <tbody>
            <EditableGridRow
              key={`new-${sheet}-${rows.length}`}
              sheet={sheet}
              row={{ id: 0, ...defaults }}
              columns={columns}
              post={post}
              isNew
            />
            {rows.map((row, index) => (
              <EditableGridRow
                key={row.id}
                sheet={sheet}
                row={row}
                columns={columns}
                post={post}
                index={index + 1}
              />
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function EditableGridRow({
  sheet,
  row,
  columns,
  post,
  index = 0,
  isNew = false,
}: {
  sheet: SheetName;
  row: AnySheetRow;
  columns: SheetColumn[];
  post: Post;
  index?: number;
  isNew?: boolean;
}) {
  const [draft, setDraft] = useState<AnySheetRow>(row);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try {
      const savedRow =
        sheet === "spx"
          ? { ...draft, total: spxReceivable(draft) }
          : sheet === "inventory"
            ? {
                ...draft,
                total:
                  Number(draft.sizeS || 0) +
                  Number(draft.sizeM || 0) +
                  Number(draft.sizeL || 0) +
                  Number(draft.freeSize || 0) +
                  Number(draft.oversize || 0),
              }
            : draft;
      await post(
        { action: "saveWorkbookRow", sheet, row: savedRow },
        isNew ? "Đã thêm dòng dữ liệu" : "Đã lưu thay đổi",
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể lưu dòng dữ liệu",
      );
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    if (!window.confirm("Xóa dòng dữ liệu này?")) return;
    try {
      await post(
        { action: "deleteWorkbookRow", sheet, rowId: row.id },
        "Đã xóa dòng dữ liệu",
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể xóa dòng dữ liệu",
      );
    }
  };
  return (
    <tr className={isNew ? "bg-[#eef7fd]" : "bg-white hover:bg-[#f7fbfe]"}>
      <td className="sticky left-0 z-10 border-b border-r border-[#c9dceb] bg-inherit px-2 text-center font-bold text-[#1f4e78]">
        {isNew ? "+" : index}
      </td>
      {columns.map((column) => {
        const computedTotal = sheet === "spx" && column.key === "total";
        return (
          <td
            key={column.key}
            className="border-b border-r border-[#c9dceb] p-0"
          >
            <input
              aria-label={column.label}
              type={column.type || "text"}
              step={column.type === "number" ? "any" : undefined}
              readOnly={column.readOnly}
              value={String(
                computedTotal
                  ? spxReceivable(draft)
                  : (draft[column.key] ?? ""),
              )}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  [column.key]:
                    column.type === "number"
                      ? event.target.value === ""
                        ? ""
                        : Number(event.target.value)
                      : event.target.value,
                }))
              }
              className={`h-10 w-full px-2 text-[#183b56] outline-none ${column.readOnly ? "cursor-not-allowed bg-[#e0f2fe] font-black" : "bg-transparent focus:bg-[#e0f2fe] focus:ring-2 focus:ring-inset focus:ring-[#38bdf8]"}`}
            />
          </td>
        );
      })}
      <td className="sticky right-0 border-b border-[#c9dceb] bg-white px-2">
        <div className="flex gap-1">
          <button
            type="button"
            disabled={busy}
            onClick={() => void save()}
            className="rounded-md bg-[#1f4e78] px-2.5 py-1.5 font-bold text-white hover:bg-[#163a5d] disabled:opacity-50"
          >
            {busy ? "..." : "Lưu"}
          </button>
          {!isNew && (
            <button
              type="button"
              onClick={() => void remove()}
              className="rounded-md px-2 py-1.5 font-bold text-red-600 hover:bg-red-50"
            >
              Xóa
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

function inventorySizes(row: InventoryRow) {
  const descriptor = `${row.itemType} ${row.note}`;
  const isFreeSize = /free\s*size/i.test(descriptor);
  const isOversize = /over\s*size|oversize/i.test(descriptor);
  return {
    sizeS: isFreeSize || isOversize ? 0 : row.sizeS || 0,
    sizeM: isFreeSize || isOversize ? 0 : row.sizeM || 0,
    sizeL: isFreeSize || isOversize ? 0 : row.sizeL || 0,
    freeSize: row.freeSize || (isFreeSize ? row.total : 0),
    oversize: row.oversize || (isOversize ? row.total : 0),
  };
}

function stockStatus(stock: number, threshold = 5) {
  return stock === 0 ? "Hết hàng" : stock <= threshold ? "Sắp hết" : "Còn hàng";
}
function stockTone(stock: number) {
  if (stock === 0) return "bg-[#fee2e2] hover:bg-[#fecaca]";
  if (stock < 3) return "bg-[#ffedd5] hover:bg-[#fed7aa]";
  if (stock <= 5) return "";
  if (stock <= 10) return "bg-[#fef3c7] hover:bg-[#fde68a]";
  return "bg-[#dcfce7] hover:bg-[#bbf7d0]";
}

function InventoryTable({
  rows,
  data,
}: {
  rows: InventoryRow[];
  data: StoreData;
}) {
  const [search, setSearch] = useState("");
  const [onlyEmpty, setOnlyEmpty] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  if (!rows.length) return <Empty text="Chưa có bản kiểm kho trong tháng này." />;
  const groups = [...new Map(rows.map((row) => [row.sku || `row-${row.id}`, rows.filter((item) => item.sku === row.sku)])).entries()].map(([sku, items]) => ({ sku, items, name: accountingInventoryGroupName(sku, items.map((item) => item.itemType), data.catalogRows.find((item) => item.sku === sku)?.name), total: items.reduce((sum, item) => sum + item.total, 0) })).filter((group) => `${group.sku} ${group.name}`.toLocaleLowerCase("vi").includes(search.toLocaleLowerCase("vi")) && (!onlyEmpty || group.total === 0));
  return <div className="space-y-4">
    <div className="flex flex-col gap-3 sm:flex-row"><Input aria-label="Tìm trong kho" className="h-11 flex-1 rounded-2xl bg-[#f8fcff]" placeholder="Tìm theo mã hàng hoặc tên sản phẩm..." value={search} onChange={(event) => setSearch(event.target.value)} /><Button type="button" variant="outline" className={onlyEmpty ? "border-red-200 bg-red-50 text-red-700" : ""} onClick={() => setOnlyEmpty((value) => !value)}>Chỉ hiện hết hàng</Button></div>
    <DataTable headers={["Mã / Sản phẩm", "Màu", "S", "M", "L", "Free", "Oversize", "Tổng", "Trạng thái"]}>
      {groups.flatMap((group) => { const open = expanded === group.sku; const state = stockStatus(group.total, 7); return [
        <TableRow key={group.sku} className="cursor-pointer hover:bg-sky-50/70" onClick={() => setExpanded(open ? null : group.sku)}><TableCell className="min-w-64 font-extrabold"><span className="mr-3 text-xs text-[#64748b]">{open ? "▼" : "▶"}</span>{group.sku} — {group.name}</TableCell><TableCell className="text-[#64748b]">{group.items.length} biến thể</TableCell><TableCell>—</TableCell><TableCell>—</TableCell><TableCell>—</TableCell><TableCell>—</TableCell><TableCell>—</TableCell><TableCell className="text-lg font-black">{group.total}</TableCell><TableCell><StockStatusPill state={state} /></TableCell></TableRow>,
        ...(open ? group.items.map((row) => { const sizes = inventorySizes(row); return <TableRow key={row.id} className="bg-[#f8fcff]"><TableCell className="pl-12 text-[#64748b]">↳ {row.itemType || group.name}</TableCell><TableCell className="font-semibold">{row.color || "—"}</TableCell><TableCell>{sizes.sizeS}</TableCell><TableCell>{sizes.sizeM}</TableCell><TableCell>{sizes.sizeL}</TableCell><TableCell>{sizes.freeSize || "—"}</TableCell><TableCell>{sizes.oversize || "—"}</TableCell><TableCell className="font-black">{row.total}</TableCell><TableCell><StockStatusPill state={stockStatus(row.total)} /></TableCell></TableRow>; }) : [])
      ]; })}
    </DataTable>
    {!groups.length && <Empty text="Không có mã hàng phù hợp." />}
  </div>;
}

function StockStatusPill({ state }: { state: string }) {
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${state === "Hết hàng" ? "bg-red-50 text-red-700" : state === "Sắp hết" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>{state}</span>;
}

function accountingInventoryGroupName(sku: string, itemTypes: string[], fallback?: string) {
  const variants = [...new Set(itemTypes.map((name) => name.trim()).filter(Boolean))];
  if (sku === "S001") return "SET ba lỗ - chân váy";
  if (sku === "S002") return "SET yoga (Áo · Quần · Bra)";
  return variants.length === 1 ? variants[0] : variants.join(" · ") || fallback || "Sản phẩm";
}

function DailyInventoryReport({
  rows,
  data,
}: {
  rows: InventoryRow[];
  data: StoreData;
}) {
  const dates = [
    ...new Set(rows.map((row) => row.snapshotDate).filter(Boolean)),
  ]
    .sort()
    .reverse();
  return (
    <div className="space-y-4">
      {dates.map((date) => {
        const dailyRows = rows.filter((row) => row.snapshotDate === date);
        const totals = dailyRows.reduce(
          (sum, row) => {
            const sizes = inventorySizes(row);
            return {
              sizeS: sum.sizeS + sizes.sizeS,
              sizeM: sum.sizeM + sizes.sizeM,
              sizeL: sum.sizeL + sizes.sizeL,
              freeSize: sum.freeSize + sizes.freeSize,
              oversize: sum.oversize + sizes.oversize,
              total: sum.total + row.total,
            };
          },
          { sizeS: 0, sizeM: 0, sizeL: 0, freeSize: 0, oversize: 0, total: 0 },
        );
        return (
          <Panel
            key={date}
            title={`Kiểm kho ngày ${dateText(`${date}T12:00:00`)}`}
            subtitle={`${dailyRows.length} dòng hàng · tổng ${totals.total} sản phẩm`}
            action={
              <div className="flex flex-wrap gap-2 text-xs font-bold text-[#1f4e78]">
                <span className="rounded-full bg-[#e0f2fe] px-3 py-1.5">
                  S {totals.sizeS}
                </span>
                <span className="rounded-full bg-[#e0f2fe] px-3 py-1.5">
                  M {totals.sizeM}
                </span>
                <span className="rounded-full bg-[#e0f2fe] px-3 py-1.5">
                  L {totals.sizeL}
                </span>
                <span className="rounded-full bg-[#e0f2fe] px-3 py-1.5">
                  Free size {totals.freeSize}
                </span>
                <span className="rounded-full bg-[#e0f2fe] px-3 py-1.5">
                  Oversize {totals.oversize}
                </span>
              </div>
            }
          >
            <InventoryTable rows={dailyRows} data={data} />
          </Panel>
        );
      })}
      {!dates.length && (
        <Panel>
          <Empty text="Chưa có báo cáo kiểm kho trong tháng này." />
        </Panel>
      )}
    </div>
  );
}

function ProductsView({
  data,
  post,
  selectedMonth,
  currentMonth,
}: {
  data: StoreData;
  post: Post;
  selectedMonth: string;
  currentMonth: string;
}) {
  const monthRows = data.inventoryRows.filter((row) =>
    row.snapshotDate.startsWith(selectedMonth),
  );
  const monthEnd = `${selectedMonth}-31`;
  const latestSnapshot = data.inventoryRows.reduce(
    (latest, row) =>
      row.snapshotDate <= monthEnd && row.snapshotDate > latest
        ? row.snapshotDate
        : latest,
    "",
  );
  const latestRows = latestSnapshot
    ? data.inventoryRows.filter((row) => row.snapshotDate === latestSnapshot)
    : [];
  const defaultDate =
    selectedMonth === currentMonth
      ? new Date().toISOString().slice(0, 10)
      : monthRows.reduce(
          (latest, row) =>
            row.snapshotDate > latest ? row.snapshotDate : latest,
          `${selectedMonth}-01`,
        );
  return (
    <Tabs defaultValue="stock">
      <div className="mb-4 overflow-x-auto pb-1">
        <TabsList className="h-auto min-w-max">
          <TabsTrigger value="stock">Tồn kho</TabsTrigger>
          <TabsTrigger value="check">Kiểm kho hằng ngày</TabsTrigger>
          <TabsTrigger value="history">Lịch sử kho</TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="stock">
        <Panel
          title={
            latestSnapshot
              ? `Tồn kho cập nhật ngày ${dateText(`${latestSnapshot}T12:00:00`)}`
              : "Tồn kho hiện tại"
          }
          subtitle="Tự động lấy từ bảng kiểm kho đã lưu gần nhất, tách theo S, M, L, Free size và Oversize"
        >
          {latestRows.length ? (
            <InventoryTable rows={latestRows} data={data} />
          ) : (
            <Empty text="Chưa có dữ liệu kiểm kho đến kỳ đang xem." />
          )}
        </Panel>
      </TabsContent>
      <TabsContent value="check">
        <InventoryCheckView
          monthRows={monthRows}
          post={post}
          selectedMonth={selectedMonth}
          defaultDate={defaultDate}
        />
      </TabsContent>
      <TabsContent value="history">
        <DailyInventoryReport rows={monthRows} data={data} />
      </TabsContent>
    </Tabs>
  );
}

function InventoryCheckView({
  monthRows,
  post,
  selectedMonth,
  defaultDate,
}: {
  monthRows: InventoryRow[];
  post: Post;
  selectedMonth: string;
  defaultDate: string;
}) {
  const [checkDate, setCheckDate] = useState(defaultDate);
  const [creating, setCreating] = useState(false);
  const dates = [
    ...new Set(monthRows.map((row) => row.snapshotDate).filter(Boolean)),
  ]
    .sort()
    .reverse();
  const dayRows = monthRows.filter((row) => row.snapshotDate === checkDate);
  const checkColumns = inventoryColumns.filter(
    (column) => !["snapshotDate", "total"].includes(column.key),
  );
  const createFromLatest = async () => {
    setCreating(true);
    try {
      await post(
        { action: "startInventoryCheck", snapshotDate: checkDate },
        `Đã tạo bảng kiểm kho ngày ${dateText(`${checkDate}T12:00:00`)}`,
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể tạo bảng kiểm kho",
      );
    } finally {
      setCreating(false);
    }
  };
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[#9cc9e8] bg-[#d9eaf7] p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-lg font-black text-[#1f4e78]">
              Kiểm kho hằng ngày
            </h2>
            <p className="mt-1 text-sm text-[#445267]">
              Chọn ngày, sửa số lượng ngay trong bảng rồi bấm Lưu ở từng dòng.
              Tồn kho và dashboard sẽ dùng bản kiểm mới nhất.
            </p>
          </div>
          <Field label="Ngày kiểm kho">
            <Input
              aria-label="Ngày kiểm kho"
              type="date"
              min={`${selectedMonth}-01`}
              max={`${selectedMonth}-31`}
              value={checkDate}
              onChange={(event) => setCheckDate(event.target.value)}
              className="w-48 bg-white"
            />
          </Field>
        </div>
        {dates.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="self-center text-xs font-bold text-[#445267]">
              Ngày đã kiểm:
            </span>
            {dates.map((date) => (
              <button
                key={date}
                type="button"
                onClick={() => setCheckDate(date)}
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${date === checkDate ? "bg-[#1f4e78] text-white" : "bg-white text-[#1f4e78] hover:bg-[#e0f2fe]"}`}
              >
                {dateText(`${date}T12:00:00`)}
              </button>
            ))}
          </div>
        )}
      </div>
      {!dayRows.length && (
        <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-[#38bdf8] bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-extrabold">
              Chưa có bảng kiểm ngày {dateText(`${checkDate}T12:00:00`)}
            </p>
            <p className="mt-1 text-sm text-[#64748b]">
              Tạo bảng từ lần kiểm gần nhất để giữ đủ mã hàng, sau đó sửa số
              lượng thực tế.
            </p>
          </div>
          <Button disabled={creating} onClick={() => void createFromLatest()}>
            {creating ? "Đang tạo…" : "Tạo từ tồn kho gần nhất"}
          </Button>
        </div>
      )}
      <SpreadsheetGrid
        sheet="inventory"
        title={`Kiểm-kho-${checkDate}`}
        rows={dayRows as unknown as AnySheetRow[]}
        columns={checkColumns}
        post={post}
        defaults={{ snapshotDate: checkDate }}
      />
    </div>
  );
}

function StockEventView({
  kind,
  data,
  post,
  selectedMonth,
}: {
  kind: "Hoàn hàng" | "Nhập hàng" | "Hàng lỗi";
  data: StoreData;
  post: Post;
  selectedMonth: string;
}) {
  const defaultDate =
    selectedMonth === currentMonthKey()
      ? new Date().toISOString().slice(0, 10)
      : `${selectedMonth}-01`;
  const maxDate =
    selectedMonth === currentMonthKey() ? defaultDate : `${selectedMonth}-31`;
  const skuOptions = [
    ...new Set(
      [
        ...data.catalogRows.map((row) => row.sku),
        ...data.inventoryRows.map((row) => row.sku),
      ].filter(Boolean),
    ),
  ].sort();
  const history = data.movements.filter((movement) => movement.reason === kind);
  const isReturn = kind === "Hoàn hàng";
  const isDefective = kind === "Hàng lỗi";
  const [selectedSku, setSelectedSku] = useState("");
  const [eventDate, setEventDate] = useState(defaultDate);
  const [selectedType, setSelectedType] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [selectedSize, setSelectedSize] = useState("M");
  const [selectedQuantity, setSelectedQuantity] = useState("");
  const [selectedReturnSource, setSelectedReturnSource] = useState("");
  const [eventNote, setEventNote] = useState("");
  const sourceDate = data.inventoryRows.reduce(
    (latest, row) => row.snapshotDate <= eventDate && row.snapshotDate > latest ? row.snapshotDate : latest,
    "",
  );
  const sourceRows = data.inventoryRows.filter((row) => row.snapshotDate === sourceDate && row.sku === selectedSku);
  const stockType = (row: InventoryRow) => row.itemType ||
    (data.catalogRows.filter((item) => item.sku === row.sku).length === 1
      ? data.catalogRows.find((item) => item.sku === row.sku)?.name || ""
      : "");
  const selectedTypeKey = productPriceKey(selectedSku, selectedType);
  const fullSetKeys =
    selectedTypeKey === "S001:full-set"
      ? ["S001:ao", "S001:chan-vay"]
      : selectedTypeKey === "S002:full-set"
        ? ["S002:ao", "S002:quan"]
        : [];
  const availableColors = fullSetKeys.length
    ? [...new Set(sourceRows.map((row) => row.color).filter(Boolean))].filter(
        (color) =>
          fullSetKeys.every((key) =>
            sourceRows.some(
              (row) =>
                catalogIdentityKey("", row.color) ===
                  catalogIdentityKey("", color) &&
                productPriceKey(row.sku, stockType(row)) === key,
            ),
          ),
      )
    : [...new Set(sourceRows.filter(
        (row) => productPriceKey(selectedSku, stockType(row)) === selectedTypeKey,
      ).map((row) => row.color).filter(Boolean))];
  const inventoryTypeOptions = [...new Set(sourceRows.map(stockType).filter(Boolean))];
  const hasFullSet =
    (selectedSku === "S001" &&
      ["S001:ao", "S001:chan-vay"].every((key) =>
        sourceRows.some((row) => productPriceKey(row.sku, stockType(row)) === key),
      )) ||
    (selectedSku === "S002" &&
      ["S002:ao", "S002:quan"].every((key) =>
        sourceRows.some((row) => productPriceKey(row.sku, stockType(row)) === key),
      ));
  const itemTypeOptions = [
    ...(hasFullSet ? ["Full set"] : []),
    ...inventoryTypeOptions,
  ];
  const shopeeReturnGroups = new Map<string, ShopeeRow[]>();
  for (const row of data.shopeeRows) {
    const key = row.orderCode || row.trackingCode || String(row.id);
    shopeeReturnGroups.set(key, [
      ...(shopeeReturnGroups.get(key) || []),
      row,
    ]);
  }
  const returnSources = [
    ...data.orders
      .filter((order) => !order.returned)
      .map((order) => {
        const item = order.items[0];
        return {
          kind: "manual" as const,
          value: `manual:${order.id}`,
          label: `Đơn hàng · ${order.code} · ${order.customerName} · ${order.items.map((entry) => `${entry.sku} ${entry.color} ${entry.size} × ${entry.quantity}`).join(" + ")}`,
          orderId: order.id,
          rowId: 0,
          orderCode: order.code,
          sku: item?.sku || "",
          itemType: item?.productName || "",
          color: item?.color || "",
          size: item?.size || "M",
          quantity: order.quantity,
        };
      })
      .filter((source) => source.sku),
    ...[...shopeeReturnGroups.values()]
      .filter(
        (rows) =>
          rows.length > 0 &&
          !rows.some((row) => isInactiveShopeeStatus(row.orderStatus)),
      )
      .map((rows) => {
        const row = rows[0];
        return {
          kind: "shopee" as const,
          value: `shopee:${row.id}`,
          label: `Shopee · ${row.orderCode || row.trackingCode || row.id} · ${row.buyer || "Khách Shopee"} · ${rows.map((entry) => `${entry.sku} ${entry.color} ${entry.size} × ${entry.quantity}`).join(" + ")}`,
          orderId: 0,
          rowId: row.id,
          orderCode: row.orderCode || row.trackingCode || String(row.id),
          sku: row.sku,
          itemType: row.productName,
          color: row.color,
          size: row.size,
          quantity: rows.reduce((sum, entry) => sum + entry.quantity, 0),
        };
      }),
  ];
  const selectedSource = returnSources.find(
    (source) => source.value === selectedReturnSource,
  );
  const chooseReturnSource = (value: string) => {
    setSelectedReturnSource(value);
    const source = returnSources.find((item) => item.value === value);
    if (!source) return;
    setSelectedSku(source.sku);
    setSelectedColor(source.color);
    setSelectedSize(
      source.size.trim().toLocaleLowerCase("vi").replaceAll(" ", "") ===
        "freesize"
        ? "Free size"
        : source.size,
    );
    setSelectedQuantity(String(source.quantity));
    setEventNote(`Hoàn từ đơn ${source.orderCode}`);
    const selectionSourceDate = data.inventoryRows.reduce(
      (latest, row) =>
        row.snapshotDate <= eventDate && row.snapshotDate > latest
          ? row.snapshotDate
          : latest,
      "",
    );
    const matchingTypes = [
      ...new Set(
        data.inventoryRows
          .filter(
            (row) =>
              row.snapshotDate === selectionSourceDate &&
              row.sku === source.sku &&
              catalogIdentityKey("", row.color) ===
                catalogIdentityKey("", source.color),
          )
          .map(stockType)
          .filter(Boolean),
      ),
    ];
    const requestedKey = productPriceKey(source.sku, source.itemType);
    const matchingType = matchingTypes.find(
      (itemType) => productPriceKey(source.sku, itemType) === requestedKey,
    );
    const sourceIsFullSet =
      requestedKey === "S001:full-set" || requestedKey === "S002:full-set";
    setSelectedType(
      sourceIsFullSet
        ? "Full set"
        : matchingType ||
            (matchingTypes.length === 1
              ? matchingTypes[0]
              : source.sku === "S001" || source.sku === "S002"
                ? "Full set"
                : ""),
    );
  };
  return (
    <div className="grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
      <Panel
        title={kind}
        subtitle={
          isDefective
            ? "Tách hàng hỏng, lỗi hoặc không thể bán khỏi tồn kho"
            : isReturn
              ? "Ghi nhận hàng khách trả đã thực tế quay về kho"
              : "Ghi nhận số lượng hàng mới nhận vào kho"
        }
      >
        <ActionForm
          submitLabel={
            isDefective
              ? "Lưu hàng lỗi"
              : isReturn
                ? "Lưu hàng hoàn"
                : "Lưu hàng nhập"
          }
          onSubmit={async (form) => {
            if (isReturn && selectedSource?.kind === "manual") {
              await post(
                {
                  action: "returnOrder",
                  orderId: selectedSource.orderId,
                  refundAmount: 0,
                  returnDate: form.get("transactionDate"),
                  reason: form.get("note") || `Hoàn đơn ${selectedSource.orderCode}`,
                },
                "Đã hoàn đơn, trừ doanh thu và cập nhật lại kho",
              );
              setSelectedReturnSource("");
              return;
            }
            if (isReturn && selectedSource?.kind === "shopee") {
              await post(
                {
                  action: "returnShopeeOrder",
                  rowId: selectedSource.rowId,
                  returnDate: form.get("transactionDate"),
                  reason: form.get("note") || `Hoàn đơn ${selectedSource.orderCode}`,
                },
                "Đã hoàn đơn Shopee, trừ doanh thu và cập nhật lại kho",
              );
              setSelectedReturnSource("");
              return;
            }
            await post(
              {
                action: "recordInventoryChange",
                entry: {
                  eventType: kind,
                  transactionDate: form.get("transactionDate"),
                  sku: selectedSource ? selectedSku : form.get("sku"),
                  itemType: selectedSource ? selectedType : form.get("itemType"),
                  color: selectedSource ? selectedColor : form.get("color"),
                  size: selectedSource ? selectedSize : form.get("size"),
                  quantity: Number(form.get("quantity")),
                  note: form.get("note"),
                  orderCode: selectedSource?.orderCode || "",
                },
              },
              `${kind} đã cập nhật vào kho và Dashboard`,
            );
          }}
        >
          {isReturn && (
            <Field label="Chọn đơn đã lên (không bắt buộc)">
              <Select
                value={selectedReturnSource}
                onChange={(event) => chooseReturnSource(event.target.value)}
              >
                <option value="">Tự nhập hoặc chọn đơn hàng / Shopee</option>
                {returnSources.map((source) => (
                  <option key={source.value} value={source.value}>
                    {source.label}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          <Row>
            <Field label="Ngày ghi nhận">
              <Input
                name="transactionDate"
                type="date"
                value={eventDate}
                onChange={(event) => {
                  setEventDate(event.target.value);
                  if (!selectedSource) {
                    setSelectedType("");
                    setSelectedColor("");
                  }
                }}
                min={`${selectedMonth}-01`}
                max={maxDate}
                required
              />
            </Field>
            <Field label="Mã hàng">
              <Select
                name="sku"
                required
                disabled={Boolean(selectedSource)}
                value={selectedSku}
                onChange={(event) => { setSelectedSku(event.target.value); setSelectedType(""); setSelectedColor(""); setSelectedReturnSource(""); }}
              >
                <option value="">Chọn mã hàng</option>
                {skuOptions.map((sku) => (
                  <option key={sku} value={sku}>
                    {sku}
                  </option>
                ))}
              </Select>
            </Field>
          </Row>
          <Row>
            <Field label="Loại sản phẩm">
              <Select name="itemType" value={selectedType} onChange={(event) => { setSelectedType(event.target.value); setSelectedColor(""); }} required disabled={!selectedSku || Boolean(selectedSource)}>
                <option value="">
                  {selectedSku ? "Chọn loại sản phẩm" : "Chọn mã hàng trước"}
                </option>
                {itemTypeOptions.map((itemType) => (
                  <option key={itemType} value={itemType}>
                    {itemType}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Màu">
                <Select name="color" required disabled={!selectedType || Boolean(selectedSource)} value={selectedColor} onChange={(event) => setSelectedColor(event.target.value)}>
                  <option value="">Chọn màu trong kho</option>
                  {availableColors.map((color) => <option key={color} value={color}>{color}</option>)}
                </Select>
            </Field>
          </Row>
          <Row>
            <Field label="Size">
              <Select name="size" value={selectedSize} disabled={Boolean(selectedSource)} onChange={(event) => setSelectedSize(event.target.value)}>
                <option>S</option>
                <option>M</option>
                <option>L</option>
                <option>Free size</option>
                <option>Oversize</option>
              </Select>
            </Field>
          </Row>
          <Row>
            <Field label="Số lượng">
              <Input name="quantity" type="number" min="1" step="1" required disabled={Boolean(selectedSource)} value={selectedQuantity} onChange={(event) => setSelectedQuantity(event.target.value)} />
            </Field>
            <Field label="Ghi chú">
              <Input
                name="note"
                value={eventNote}
                onChange={(event) => setEventNote(event.target.value)}
                placeholder={
                  isDefective
                    ? "Mô tả lỗi hoặc vị trí lưu hàng lỗi"
                    : isReturn
                      ? "Mã đơn hoặc lý do hoàn"
                      : "Nhà cung cấp hoặc lô nhập"
                }
              />
            </Field>
          </Row>
        </ActionForm>
        <p className="mt-4 rounded-xl bg-[#f0f9ff] p-3 text-sm text-[#64748b]">
          {isReturn && selectedSource
            ? "Khi lưu, toàn bộ đơn đã chọn sẽ được đánh dấu Đã hoàn, loại khỏi doanh thu/công nợ và hàng trong đơn được trả lại kho."
            : <>Sau khi lưu, hệ thống tự {isDefective ? "trừ" : "cộng"} số lượng trong bản kho của ngày ghi nhận. Dashboard dùng bản kho mới nhất nên không cần nhập lại lần nữa.</>}
        </p>
      </Panel>
      <Panel
        title={`Lịch sử ${kind.toLowerCase()}`}
        subtitle={`${history.length} lần ghi nhận trong ${monthLabel(selectedMonth).toLowerCase()}`}
      >
        <DataTable
          headers={[
            "Ngày",
            "Mã hàng",
            "Sản phẩm",
            "Màu · Size",
            "Số lượng",
            "Ghi chú",
          ]}
        >
          {history.map((movement) => {
            const linkedReturn = isReturn
              ? data.returns.find(
                  (item) =>
                    Boolean(item.source) &&
                    item.orderCode === movement.orderCode &&
                    item.createdAt === movement.createdAt,
                )
              : undefined;
            return <TableRow key={movement.id}>
              <TableCell>{dateText(movement.createdAt)}</TableCell>
              <TableCell className="font-mono text-xs font-bold">
                {movement.sku}
              </TableCell>
              <TableCell>{movement.productName}</TableCell>
              <TableCell>
                {[movement.color, movement.size].filter(Boolean).join(" · ") ||
                  "—"}
              </TableCell>
              <TableCell
                className={`font-black ${movement.quantityChange < 0 ? "text-[#dc2626]" : "text-[#0369a1]"}`}
              >
                {movement.quantityChange > 0 ? "+" : ""}
                {movement.quantityChange}
              </TableCell>
              <TableCell>
                <div className="flex items-center justify-between gap-2">
                  <span>{movement.note || movement.orderCode || "—"}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-8 px-2 text-xs text-[#b91c1c] hover:bg-[#fef2f2] hover:text-[#991b1b]"
                    onClick={async () => {
                      if (
                        !window.confirm(
                          linkedReturn
                            ? `Xóa lần hoàn đơn ${linkedReturn.orderCode}? Đơn sẽ hoạt động trở lại, tiền đơn được cộng lại và tồn kho sẽ trừ lại.`
                            : `Xóa lần ghi nhận ${kind.toLowerCase()} này? Tồn kho sẽ được hoàn tác.`,
                        )
                      )
                        return;
                      try {
                        await post(
                          {
                            action: linkedReturn
                              ? "deleteOrderReturn"
                              : "deleteInventoryChange",
                            ...(linkedReturn
                              ? { returnId: linkedReturn.id }
                              : { movementId: movement.id }),
                          },
                          linkedReturn
                            ? "Đã xóa hoàn đơn, khôi phục doanh thu và tồn kho"
                            : "Đã xóa ghi nhận và hoàn tác tồn kho",
                        );
                      } catch (error) {
                        toast.error(
                          error instanceof Error
                            ? error.message
                            : "Không thể xóa ghi nhận",
                        );
                      }
                    }}
                  >
                    Xóa
                  </Button>
                </div>
              </TableCell>
            </TableRow>;
          })}
        </DataTable>
        {!history.length && (
          <Empty
            text={`Chưa có lịch sử ${kind.toLowerCase()} trong tháng này.`}
          />
        )}
      </Panel>
    </div>
  );
}

function MonthlyPlatformFee({ month, amount, post }: { month: string; amount: number; post: Post }) {
  const [saving, setSaving] = useState(false);
  return <Panel title={`Phí sàn · ${monthLabel(month)}`} subtitle="Nhập tổng phí sàn của tháng. Số này thay thế phí sàn trên dashboard, không cộng thêm phí trong từng đơn Shopee.">
    <form className="flex flex-wrap items-end gap-4" onSubmit={async (event) => {
      event.preventDefault();
      const value = Number(new FormData(event.currentTarget).get("fee"));
      setSaving(true);
      try { await post({ action: "saveMonthlyPlatformFee", amount: value }, "Đã lưu phí sàn và cập nhật dashboard"); }
      catch (error) { toast.error(error instanceof Error ? error.message : "Không thể lưu phí sàn"); }
      finally { setSaving(false); }
    }}>
      <Field label="Tổng phí sàn (đ)"><Input key={amount} name="fee" type="number" min="0" step="1" required defaultValue={amount} /></Field>
      <Button type="submit" disabled={saving}>{saving ? "Đang lưu…" : "Lưu phí sàn"}</Button>
    </form>
    <p className="mt-3 text-sm text-slate-500">Chi phí = tiền chi + phí sàn. Phí vận chuyển được cộng vào tổng đơn của khách và không tính vào chi phí. Không ghi phí sàn này thêm vào tiền chi để tránh tính hai lần.</p>
  </Panel>;
}

function CashView({
  data,
  income,
  expense,
  post,
  selectedMonth,
}: {
  data: StoreData;
  income: number;
  expense: number;
  post: Post;
  selectedMonth: string;
}) {
  const rowAmount = (row: Cash) => cashBookAmount(row, data.orders);
  const amountFor = (type: CashFlowType) => data.cash
    .filter((row) => row.type === type)
    .reduce((sum, row) => sum + rowAmount(row), 0);
  const capitalNet = amountFor("Vốn vào") - amountFor("Rút vốn");
  const debtNet = amountFor("Vay") - amountFor("Trả nợ");
  const netMovement = income - expense + capitalNet + debtNet;
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <CashSummaryCard label="Thu kinh doanh" value={income} tone="good" note="Tiền bán hàng; không gồm vốn và vay" />
        <CashSummaryCard label="Chi phí" value={expense} tone="expense" note="Chỉ các khoản chi hoạt động" />
        <CashSummaryCard label="Vốn ròng" value={capitalNet} tone="capital" note="Vốn vào − rút vốn" />
        <CashSummaryCard label="Vay ròng" value={debtNet} tone="debt" note="Tiền vay − trả gốc" />
        <CashSummaryCard label="Dòng tiền ròng" value={netMovement} tone={netMovement >= 0 ? "good" : "expense"} note="Tổng tiền vào − tổng tiền ra" />
      </div>
      <div className="rounded-2xl border border-[#bae6fd] bg-[#f0f9ff] p-4 text-sm leading-6 text-[#445267]">
        <b className="text-[#0c4a6e]">Nguyên tắc:</b> Thu bán hàng mới là thu kinh doanh; Chi mới tính vào chi phí. Vốn, rút vốn, vay và trả nợ chỉ làm thay đổi dòng tiền, không làm thay đổi doanh thu hay lợi nhuận.
      </div>
    {CASH_FLOW_TYPES.map((type) => {
      const rows = data.cash.filter(c => c.type === type).sort((a, b) => b.transactionDate.slice(0, 10).localeCompare(a.transactionDate.slice(0, 10)) || b.id - a.id);
      if (!rows.length && !["Thu", "Chi"].includes(type)) return null;
      return (
    <Panel
      key={type}
      title={`Sổ ${type.toLowerCase()}`}
      subtitle={`${monthLabel(selectedMonth)} · ${rows.length} giao dịch · Tổng ${money.format(rows.reduce((sum, row) => sum + rowAmount(row), 0))}`}
      action={<CashDialog post={post} selectedMonth={selectedMonth} />}
    >
      <DataTable
        headers={[
          "Ngày",
          "Loại",
          "Nhóm",
          "Đối tượng",
          "Tham chiếu",
          "Số tiền",
          "Ghi chú",
        ]}
      >
        {rows.map((c) => (
          <TableRow key={c.id}>
            <TableCell>{dateText(c.transactionDate)}</TableCell>
            <TableCell>
              <Tag>{c.type}</Tag>
            </TableCell>
            <TableCell className="font-semibold">{c.category}</TableCell>
            <TableCell>{c.partner || "—"}</TableCell>
            <TableCell className="font-mono text-xs">
              {c.reference || "—"}
            </TableCell>
            <TableCell
              className={`font-black ${cashFlowDirection(c.type) > 0 ? "text-[#0369a1]" : "text-[#b44b08]"}`}
            >
              {cashFlowDirection(c.type) > 0 ? "+" : "−"}
              {money.format(rowAmount(c))}
            </TableCell>
            <TableCell>{c.note || "—"}</TableCell>
          </TableRow>
        ))}
      </DataTable>
      {!rows.length && <Empty text={`Chưa có giao dịch ${type.toLowerCase()}.`} />}
    </Panel>
      );
    })}
    </div>
  );
}

function CashSummaryCard({ label, value, note, tone }: { label: string; value: number; note: string; tone: "good" | "expense" | "capital" | "debt" }) {
  const toneClass = { good: "bg-emerald-50 text-emerald-800", expense: "bg-amber-50 text-amber-800", capital: "bg-sky-50 text-sky-800", debt: "bg-violet-50 text-violet-800" }[tone];
  return <article className={`rounded-3xl p-4 ${toneClass}`}><p className="text-xs font-bold uppercase tracking-wide opacity-70">{label}</p><p className="mt-2 text-xl font-black">{value < 0 ? "−" : ""}{money.format(Math.abs(value))}</p><p className="mt-2 text-xs font-semibold opacity-70">{note}</p></article>;
}

function ReportsView({
  data,
  revenue,
  income,
  expense,
}: {
  data: StoreData;
  revenue: number;
  income: number;
  expense: number;
}) {
  const validOrders = data.orders.filter((order) => !order.returned);
  const shopeeOrders = shopeeOrderSummaries(data.shopeeRows);
  const shopeeName =
    data.settings.orderChannels.find((option) => option.id === "shopee")
      ?.name || "Shopee";
  const manualNames = [
    ...new Set([
      ...data.settings.orderChannels
        .filter((option) => option.id !== "shopee")
        .map((option) => option.name),
      ...validOrders.map((order) => order.salesChannel),
    ]),
  ];
  const channels = [
    {
      name: shopeeName,
      value: shopeeOrders.reduce((sum, order) => sum + order.revenue, 0),
    },
    ...manualNames.map((name) => ({
      name,
      value: validOrders
        .filter((order) => order.salesChannel === name)
        .reduce((sum, order) => sum + manualOrderRevenue(order), 0),
    })),
  ];
  const max = Math.max(...channels.map((c) => c.value), 1);
  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
      <Panel title="Doanh thu theo kênh" subtitle="Không tính các đơn đã hoàn">
        <div className="space-y-5">
          {channels.map((c) => (
            <Metric key={c.name} label={c.name} value={c.value} max={max} />
          ))}
        </div>
      </Panel>
      <Panel title="Tóm tắt tháng" subtitle="Số liệu phục vụ quản lý">
        <dl className="grid grid-cols-2 gap-3">
          <Summary
            label="Đơn hàng hợp lệ"
            value={String(validOrders.length + shopeeOrders.length)}
          />
          <Summary
            label="Sản phẩm bán"
            value={String(
              validOrders.reduce((s, o) => s + o.quantity, 0) +
                shopeeOrders.reduce((s, o) => s + o.quantity, 0),
            )}
          />
          <Summary label="Doanh thu" value={money.format(revenue)} />
          <Summary
            label="Dòng tiền thuần"
            value={money.format(income - expense)}
          />
        </dl>
      </Panel>
      <div className="xl:col-span-2">
        <AuditHistory audit={data.audit} />
      </div>
    </div>
  );
}

function AuditHistory({ audit }: { audit: Audit[] }) {
  const groups = audit.reduce<Record<string, Audit[]>>((result, item) => {
    const key = new Date(item.createdAt).toLocaleDateString("vi-VN", {
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    (result[key] ||= []).push(item);
    return result;
  }, {});
  return (
    <Panel
      title="Lịch sử thay đổi"
      subtitle="Tách theo ngày, hiển thị chính xác đến phút"
      action={<History className="size-5 text-[#64748b]" />}
    >
      <div className="space-y-6">
        {Object.entries(groups).map(([day, items]) => (
          <section key={day}>
            <div className="mb-2 flex items-center gap-3">
              <span className="size-2.5 rounded-full bg-[#38bdf8]" />
              <h3 className="text-sm font-extrabold capitalize text-[#0c4a6e]">
                {day}
              </h3>
              <span className="text-xs text-[#64748b]">
                {items.length} thay đổi
              </span>
            </div>
            <div className="overflow-hidden rounded-xl border border-[#bae6fd]">
              <DataTable headers={["Giờ", "Phân hệ", "Hành động", "Chi tiết"]}>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-xs font-bold">
                      {new Date(item.createdAt).toLocaleTimeString("vi-VN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                    <TableCell>{item.entityType}</TableCell>
                    <TableCell className="font-semibold">
                      {item.action}
                    </TableCell>
                    <TableCell>{item.details}</TableCell>
                  </TableRow>
                ))}
              </DataTable>
            </div>
          </section>
        ))}
        {!audit.length && <Empty text="Chưa có lịch sử thay đổi." />}
      </div>
    </Panel>
  );
}

function TaxView({
  data,
  post,
  selectedMonth,
}: {
  data: StoreData;
  post: Post;
  selectedMonth: string;
}) {
  const now = new Date();
  const selectedYear = Number(selectedMonth.slice(0, 4));
  const selectedMonthIndex = Number(selectedMonth.slice(5, 7)) - 1;
  const defaultPeriod = `${selectedYear}-Q${Math.floor(selectedMonthIndex / 3) + 1}`;
  const [period, setPeriod] = useState(defaultPeriod);
  const year = Number(period.slice(0, 4));
  const startMonth = (Number(period.slice(-1)) - 1) * 3;
  const quarterOptions = Array.from({ length: 8 }, (_, offset) => {
    const absoluteQuarter =
      now.getFullYear() * 4 + Math.floor(now.getMonth() / 3) - offset;
    return `${Math.floor(absoluteQuarter / 4)}-Q${(absoluteQuarter % 4) + 1}`;
  });
  const validOrders = data.orders.filter((order) => !order.returned);
  const periodOrders = validOrders.filter((order) => {
    const date = new Date(order.orderDate);
    return (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() >= startMonth &&
      date.getUTCMonth() < startMonth + 3
    );
  });
  const shopeeOrders = shopeeOrderSummaries(data.shopeeRows);
  const periodShopeeOrders = shopeeOrders.filter((order) => {
    const date = new Date(order.date);
    return (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() >= startMonth &&
      date.getUTCMonth() < startMonth + 3
    );
  });
  const annualRevenue =
    validOrders
      .filter((order) => new Date(order.orderDate).getUTCFullYear() === year)
      .reduce((sum, order) => sum + manualOrderRevenue(order), 0) +
    shopeeOrders
      .filter((order) => new Date(order.date).getUTCFullYear() === year)
      .reduce((sum, order) => sum + order.revenue, 0);
  const shopeeName =
    data.settings.orderChannels.find((option) => option.id === "shopee")
      ?.name || "Shopee";
  const revenueBy = (channel: string) =>
    periodOrders
      .filter((order) => order.salesChannel === channel)
      .reduce((sum, order) => sum + manualOrderRevenue(order), 0);
  const shopeeRevenue =
    revenueBy(shopeeName) +
    periodShopeeOrders.reduce((sum, order) => sum + order.revenue, 0);
  const facebookRevenue = revenueBy("Facebook");
  const storeRevenue = revenueBy("Tại cửa hàng");
  const revenue =
    periodOrders.reduce((sum, order) => sum + manualOrderRevenue(order), 0) +
    periodShopeeOrders.reduce((sum, order) => sum + order.revenue, 0);
  const threshold = 500_000_000;
  const vatRate = 1;
  const pitRate = 0.5;
  const taxable = annualRevenue > threshold;
  const vatAmount = taxable ? Math.round((revenue * vatRate) / 100) : 0;
  const pitAmount = taxable ? Math.round((revenue * pitRate) / 100) : 0;
  const saved = data.taxDeclarations
    .filter((item) => item.period === period)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  const manualChannels = [
    ...new Set([
      ...data.settings.orderChannels
        .filter((option) => option.id !== "shopee")
        .map((option) => option.name),
      ...periodOrders
        .map((order) => order.salesChannel)
        .filter((channel) => channel !== shopeeName),
    ]),
  ];
  const channels: [string, number, number][] = [
    [
      shopeeName,
      shopeeRevenue,
      periodOrders.filter((order) => order.salesChannel === shopeeName).length +
        periodShopeeOrders.length,
    ],
    ...manualChannels.map((channel): [string, number, number] => [
      channel,
      revenueBy(channel),
      periodOrders.filter((order) => order.salesChannel === channel).length,
    ]),
  ];
  const remainingToThreshold = Math.max(0, threshold - annualRevenue);
  const reserve = vatAmount + pitAmount;
  const quarter = Number(period.slice(-1));
  const deadline = new Date(year, quarter * 3, 0);
  const missingManualContact = periodOrders.filter(
    (order) => !order.phone || !order.address,
  ).length;
  const missingShopeeReference = data.shopeeRows.filter((row) => {
    const date = new Date(row.orderDate);
    return (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() >= startMonth &&
      date.getUTCMonth() < startMonth + 3 &&
      (!row.trackingCode || !row.sku)
    );
  }).length;
  const missingCashReference = data.cash.filter((item) => {
    const date = new Date(item.transactionDate);
    return (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() >= startMonth &&
      date.getUTCMonth() < startMonth + 3 &&
      !item.reference
    );
  }).length;
  return (
    <div className="space-y-6">
      <section className="flex flex-col justify-between gap-4 rounded-2xl border border-[#bae6fd] bg-white p-5 shadow-sm md:flex-row md:items-center">
        <div>
          <h2 className="text-lg font-extrabold">Bảng kê khai thuế theo quý</h2>
          <p className="mt-1 text-sm text-[#64748b]">
            Tổng hợp doanh thu từ đơn hàng và lưu hồ sơ nháp nội bộ.
          </p>
        </div>
        <Field label="Kỳ kê khai">
          <Select
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
          >
            {quarterOptions.map((item) => (
              <option key={item} value={item}>
                {item.replace("-Q", " · Quý ")}
              </option>
            ))}
          </Select>
        </Field>
      </section>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Doanh thu kỳ" value={money.format(revenue)} />
        <Stat label="Doanh thu năm" value={money.format(annualRevenue)} />
        <Stat label="Thuế GTGT tham khảo" value={money.format(vatAmount)} />
        <Stat
          label="Quỹ thuế nên dự phòng"
          value={money.format(reserve)}
          warning={taxable}
        />
      </section>
      <div className="grid gap-6 xl:grid-cols-[1.25fr_1fr]">
        <Panel
          title="Doanh thu theo kênh"
          subtitle={`${periodOrders.length + periodShopeeOrders.length} đơn hợp lệ trong ${period.replace("-Q", " quý ")}`}
        >
          <DataTable headers={["Kênh bán", "Số đơn", "Doanh thu", "Tỷ trọng"]}>
            {channels.map(([channel, amount, count]) => (
              <TableRow key={channel}>
                <TableCell className="font-semibold">{channel}</TableCell>
                <TableCell>{count}</TableCell>
                <TableCell className="font-bold">
                  {money.format(amount)}
                </TableCell>
                <TableCell>
                  {revenue ? `${((amount / revenue) * 100).toFixed(1)}%` : "0%"}
                </TableCell>
              </TableRow>
            ))}
          </DataTable>
        </Panel>
        <Panel
          title="Theo dõi nghĩa vụ thuế"
          subtitle="Ước tính nội bộ cho hoạt động bán lẻ hàng hóa"
        >
          <dl className="grid gap-3">
            <Summary
              label="Ngưỡng doanh thu năm tham chiếu"
              value={money.format(threshold)}
            />
            <Summary
              label={taxable ? "Doanh thu vượt ngưỡng" : "Còn tới ngưỡng"}
              value={money.format(
                taxable ? annualRevenue - threshold : remainingToThreshold,
              )}
            />
            <Summary
              label="Tỷ lệ GTGT tham chiếu"
              value={`${vatRate}% doanh thu`}
            />
            <Summary
              label="Tỷ lệ TNCN tham chiếu"
              value={`${pitRate}% doanh thu`}
            />
            <Summary
              label="Hạn kê khai dự kiến"
              value={deadline.toLocaleDateString("vi-VN")}
            />
          </dl>
          <div className="mt-4">
            <div className="mb-2 flex justify-between text-xs font-bold text-[#64748b]">
              <span>Tiến độ doanh thu tới ngưỡng</span>
              <span>
                {Math.min(100, (annualRevenue / threshold) * 100).toFixed(1)}%
              </span>
            </div>
            <Progress
              value={Math.min(100, (annualRevenue / threshold) * 100)}
            />
          </div>
          <p
            className={`mt-4 rounded-2xl px-4 py-3 text-sm font-semibold ${taxable ? "bg-[#fff1e8] text-[#b44b08]" : "bg-[#e0f2fe] text-[#0369a1]"}`}
          >
            {taxable
              ? "Doanh thu năm đã trên ngưỡng tham chiếu. Hãy dành quỹ dự phòng và để kế toán kiểm tra phương pháp tính áp dụng."
              : "Doanh thu ghi nhận trong hệ thống hiện dưới ngưỡng tham chiếu."}
          </p>
        </Panel>
      </div>
      <Panel
        title="Checklist trước khi kê khai"
        subtitle="Các điểm dữ liệu nên rà soát để hồ sơ dễ đối chiếu"
      >
        <div className="grid gap-3 md:grid-cols-3">
          <Summary
            label="Đơn bán tại cửa hàng thiếu liên hệ"
            value={`${missingManualContact} dòng`}
          />
          <Summary
            label="Dòng Shopee thiếu mã đối chiếu"
            value={`${missingShopeeReference} dòng`}
          />
          <Summary
            label="Thu chi thiếu mã tham chiếu"
            value={`${missingCashReference} dòng`}
          />
        </div>
        <p className="mt-4 text-sm text-[#64748b]">
          Kỳ {period.replace("-Q", " quý ")} có{" "}
          {periodOrders.length + periodShopeeOrders.length} đơn hợp lệ; hạn hiển
          thị là ngày cuối của tháng đầu quý kế tiếp.
        </p>
      </Panel>
      <Panel
        title="Lưu hồ sơ kê khai"
        subtitle={
          saved
            ? `Đã có hồ sơ ${saved.status.toLowerCase()} cho kỳ này`
            : "Tạo bản nháp để kế toán kiểm tra trước khi nộp"
        }
      >
        <ActionForm
          submitLabel={saved ? "Cập nhật hồ sơ" : "Lưu bản nháp"}
          onSubmit={async (form) => {
            await post(
              {
                action: "saveTaxDeclaration",
                declaration: {
                  period,
                  revenue,
                  shopeeRevenue,
                  facebookRevenue,
                  storeRevenue,
                  vatRate,
                  pitRate,
                  vatAmount,
                  pitAmount,
                  status: form.get("status"),
                  note: form.get("note"),
                },
              },
              "Đã lưu hồ sơ kê khai thuế",
            );
          }}
        >
          <Row>
            <Field label="Trạng thái">
              <Select name="status" defaultValue={saved?.status || "Bản nháp"}>
                <option>Bản nháp</option>
                <option>Đã kiểm tra</option>
                <option>Đã nộp</option>
              </Select>
            </Field>
            <Field label="Ghi chú kế toán">
              <Input
                name="note"
                defaultValue={saved?.note || ""}
                placeholder="Mã tờ khai, ngày nộp hoặc nội dung cần rà soát"
              />
            </Field>
          </Row>
        </ActionForm>
        <p className="mt-4 text-xs leading-5 text-[#64748b]">
          Đây là bảng tổng hợp hỗ trợ, không thay thế hồ sơ nộp trên cổng thuế
          điện tử. Số thuế thực tế cần được kế toán đối chiếu với hóa đơn, chứng
          từ và phương pháp tính áp dụng.{" "}
          <a
            className="font-semibold text-[#0369a1] underline"
            href="https://vanban.chinhphu.vn/?classid=1&amp;docid=217111&amp;orggroupid=2&amp;pageid=27160"
            target="_blank"
            rel="noreferrer"
          >
            Xem Nghị định 68/2026/NĐ-CP
          </a>
          .
        </p>
      </Panel>
      <Panel title="Lịch sử hồ sơ" subtitle="Các bản kê khai đã lưu">
        <DataTable
          headers={[
            "Kỳ",
            "Doanh thu",
            "GTGT",
            "TNCN",
            "Trạng thái",
            "Cập nhật",
          ]}
        >
          {data.taxDeclarations.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-bold">{item.period}</TableCell>
              <TableCell>{money.format(item.revenue)}</TableCell>
              <TableCell>{money.format(item.vatAmount)}</TableCell>
              <TableCell>{money.format(item.pitAmount)}</TableCell>
              <TableCell>
                <Tag>{item.status}</Tag>
              </TableCell>
              <TableCell>
                {new Date(item.createdAt).toLocaleString("vi-VN")}
              </TableCell>
            </TableRow>
          ))}
        </DataTable>
        {!data.taxDeclarations.length && (
          <Empty text="Chưa có hồ sơ kê khai thuế." />
        )}
      </Panel>
    </div>
  );
}

type Post = (payload: unknown, success: string) => Promise<unknown>;
function CashDialog({
  post,
  selectedMonth,
}: {
  post: Post;
  selectedMonth: string;
}) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<CashFlowType>("Chi");
  const defaultDate =
    selectedMonth === currentMonthKey()
      ? new Date().toISOString().slice(0, 10)
      : `${selectedMonth}-01`;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button>
            <Plus /> Thêm giao dịch
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ghi nhận thu chi</DialogTitle>
          <DialogDescription>
            Giao dịch được lưu vào {monthLabel(selectedMonth).toLowerCase()}. Vốn và khoản vay không được tính vào doanh thu hoặc chi phí.
          </DialogDescription>
        </DialogHeader>
        <ActionForm
          onSubmit={async (f) => {
            await post(
              {
                action: "createCash",
                cash: {
                  type: f.get("type"),
                  category: f.get("category"),
                  amount: Number(f.get("amount")),
                  partner: f.get("partner"),
                  reference: f.get("reference"),
                  note: f.get("note"),
                  transactionDate: new Date(
                    `${f.get("date")}T12:00:00`,
                  ).toISOString(),
                },
              },
              "Đã ghi nhận giao dịch",
            );
            setOpen(false);
          }}
        >
          <Row>
            <Field label="Loại">
              <Select name="type" value={type} onChange={(event) => setType(event.target.value as CashFlowType)}>
                {CASH_FLOW_TYPES.map((item) => <option key={item}>{item}</option>)}
              </Select>
            </Field>
            <Field label="Ngày">
              <Input
                name="date"
                type="date"
                defaultValue={defaultDate}
                min={`${selectedMonth}-01`}
                max={`${selectedMonth}-31`}
                required
              />
            </Field>
          </Row>
          <Row>
            <Field label="Nhóm">
              <Input
                name="category"
                list="cash-category-options"
                placeholder={type === "Chi" ? "Gõ hoặc chọn nhóm chi..." : "Gõ hoặc chọn nhóm giao dịch..."}
                required
              />
              <datalist id="cash-category-options">{CASH_CATEGORY_PRESETS[type].map((category) => <option key={category} value={category} />)}</datalist>
              {type === "Chi" && <p className="text-xs text-[#64748b]">Ví dụ: nguyên vật liệu, gia công, nhập hàng, bao bì, marketing, lương, mặt bằng hoặc vận hành.</p>}
            </Field>
            <Field label="Số tiền">
              <Input name="amount" type="number" min="1" required />
            </Field>
          </Row>
          <Row>
            <Field label="Đối tượng">
              <Input name="partner" />
            </Field>
            <Field label="Mã tham chiếu">
              <Input name="reference" />
            </Field>
          </Row>
          <Field label="Ghi chú">
            <Input name="note" />
          </Field>
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}
function ChangePasswordDialog() {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <button className="mt-3 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-300 hover:bg-white/5 hover:text-white">
            <KeyRound className="size-4" /> Đổi mật khẩu
          </button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Đổi mật khẩu quản trị</DialogTitle>
          <DialogDescription>
            Mật khẩu mới sẽ được mã hóa; các phiên đăng nhập khác sẽ tự hết hiệu
            lực.
          </DialogDescription>
        </DialogHeader>
        <ActionForm
          submitLabel="Cập nhật mật khẩu"
          onSubmit={async (form) => {
            const newPassword = String(form.get("newPassword") || "");
            if (newPassword !== form.get("confirmPassword"))
              throw new Error("Xác nhận mật khẩu mới chưa khớp.");
            const response = await fetch("/api/change-password", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                currentPassword: form.get("currentPassword"),
                newPassword,
              }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error);
            toast.success("Đã đổi mật khẩu quản trị");
            setOpen(false);
          }}
        >
          <Field label="Mật khẩu hiện tại">
            <Input
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              required
            />
          </Field>
          <Field label="Mật khẩu mới">
            <Input
              name="newPassword"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </Field>
          <Field label="Nhập lại mật khẩu mới">
            <Input
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </Field>
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}

function ActionForm({
  onSubmit,
  children,
  submitLabel = "Lưu",
  danger = false,
  showSubmit = true,
}: {
  onSubmit: (f: FormData) => Promise<void>;
  children: React.ReactNode;
  submitLabel?: string;
  danger?: boolean;
  showSubmit?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    try {
      await onSubmit(new FormData(e.currentTarget));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể lưu dữ liệu",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <form
      onSubmit={submit}
      className="grid gap-4 border-t pt-4 first:border-0 first:pt-0"
    >
      {children}
      {showSubmit && <Button variant={danger ? "destructive" : "default"} disabled={busy}>
        {busy ? "Đang lưu..." : submitLabel}
      </Button>}
    </form>
  );
}
function Brand() {
  return (
    <div className="flex items-center gap-3 border-b border-white/10 pb-5">
      <div className="grid size-10 place-items-center rounded-xl bg-[#7dd3fc] font-black text-[#0c4a6e]">
        LS
      </div>
      <div>
        <p className="font-extrabold">LIMIT SPORTSWEAR</p>
        <p className="text-xs text-slate-400">Quản lý cửa hàng</p>
      </div>
    </div>
  );
}
function Nav({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left ${active ? "bg-[#7dd3fc] text-[#0c4a6e]" : "text-slate-300 hover:bg-white/5"}`}
    >
      <span className="[&_svg]:size-4">{icon}</span>
      {label}
    </button>
  );
}
function tabTitle(tab: Tab) {
  return {
    overview: "Tổng quan vận hành",
    workbook: "Đơn hàng",
    spx: "Vận chuyển",
    products: "Kho hàng và sản phẩm",
    stockReturns: "Hoàn hàng",
    stockReceipts: "Nhập hàng",
    defectiveStock: "Hàng lỗi",
    sizeExchange: "Đổi size",
    cash: "Thu chi và dòng tiền",
    tax: "Kê khai thuế",
    reports: "Báo cáo quản trị",
  }[tab];
}
function Panel({
  title,
  subtitle,
  action,
  children,
}: {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-3xl border border-[#d8eef9] bg-white/95 shadow-[0_14px_38px_rgba(14,116,144,0.07)]">
      <div
        className={
          title
            ? "flex flex-col justify-between gap-3 border-b border-[#e4f3fa] p-5 md:flex-row md:items-center"
            : ""
        }
      >
        {title && (
          <div>
            <h2 className="text-lg font-extrabold">{title}</h2>
            {subtitle && (
              <p className="mt-1 text-sm text-[#64748b]">{subtitle}</p>
            )}
          </div>
        )}
        {action}
      </div>
      <div className={title ? "p-5" : ""}>{children}</div>
    </section>
  );
}
function Stat({
  label,
  value,
  warning = false,
}: {
  label: string;
  value: string;
  warning?: boolean;
}) {
  return (
    <article className="rounded-3xl border border-[#d8eef9] bg-white/95 p-5 shadow-[0_14px_38px_rgba(14,116,144,0.07)]">
      <p className="text-sm font-semibold text-[#64748b]">{label}</p>
      <p
        className={`mt-2 text-2xl font-black ${warning ? "text-[#b44b08]" : ""}`}
      >
        {value}
      </p>
    </article>
  );
}
function Quick({
  label,
  value,
  onClick,
}: {
  label: string;
  value: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-xl border p-4 text-left hover:border-[#38bdf8] hover:bg-[#e0f2fe]"
    >
      <p className="text-sm text-[#64748b]">{label}</p>
      <p className="mt-2 text-3xl font-black">{value}</p>
    </button>
  );
}
function Metric({
  label,
  value,
  max,
}: {
  label: string;
  value: number;
  max: number;
}) {
  return (
    <div>
      <div className="mb-2 flex justify-between text-sm">
        <span className="font-semibold">{label}</span>
        <b>{money.format(value)}</b>
      </div>
      <Progress value={Math.min(100, (value / max) * 100)} />
    </div>
  );
}
function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[#f0f9ff] p-4">
      <dt className="text-sm text-[#64748b]">{label}</dt>
      <dd className="mt-1 text-xl font-black">{value}</dd>
    </div>
  );
}
function DataTable({
  headers,
  children,
}: {
  headers: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {headers.map((h, i) => (
              <TableHead key={`${h}-${i}`}>{h}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>{children}</TableBody>
      </Table>
    </div>
  );
}
function Tag({ children }: { children: string }) {
  const warning =
    children.includes("Chờ") ||
    children.includes("Hoàn") ||
    children.includes("Sắp") ||
    children.includes("Hết") ||
    children === "Chi";
  const good =
    children.startsWith("Đã") || children === "Còn hàng" || children === "Thu";
  return (
    <span
      className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${warning ? "bg-[#fff1e8] text-[#b44b08]" : good ? "bg-[#e0f2fe] text-[#0369a1]" : "bg-[#eef2f6] text-[#445267]"}`}
    >
      {children}
    </span>
  );
}
function Empty({ text }: { text: string }) {
  return <div className="p-10 text-center text-sm text-[#64748b]">{text}</div>;
}
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
function Row({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
  );
}
function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className="h-10 rounded-md border border-[#bae6fd] bg-white px-3 text-sm outline-none focus:border-[#0284c7]"
    />
  );
}
