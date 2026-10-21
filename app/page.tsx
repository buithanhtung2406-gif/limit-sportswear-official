"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useDashboardUpdates } from "@/lib/use-dashboard-updates";
import { CalendarDays, ChevronLeft, ChevronRight, CircleDollarSign, PackageSearch, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type SoldItem = { sku: string; size: string; quantity: number };
type DaySummary = { date: string; orderCount: number; quantity: number; totalAmount: number; hasAttention: boolean; channels: Record<string, number>; items: SoldItem[] };
type InventoryItem = { sku: string; name: string; color: string; size: string; stock: number; lowStockThreshold: number };
type ChannelSummary = { name: string; orders: number; revenue: number };
type CitySummary = { city: string; orders: number };
type InventorySnapshot = { date: string; skuCount: number; totalUnits: number; lowStock: number };
type CashExpenseDetail = { id: number | string; date: string; category: string; amount: number };
type DashboardSettings = { defaultPeriod: "month" | "week"; revenueChart: "line" | "bar" | "area"; channelChart: "cards" | "bar" | "pie"; cityChart: "area" | "bar" | "line"; stockChart: "table" | "bar" | "pie" };
type DashboardPeriod = { mode: "month" | "week"; start: string; end: string };
type DashboardData = { month: string; period: DashboardPeriod; dashboardSettings: DashboardSettings; summary: { todayOrders: number; monthOrders: number; monthRevenue: number; monthReceived: number; monthExpense: number; capitalIn: number; capitalOut: number; capitalNet: number; estimatedNet: number; productsSold: number; averageOrderValue: number; platformFees: number; cashExpense: number; canceledOrders: number; delivering: number; returns: number; lowStock: number; stockUnits: number }; days: DaySummary[]; cashExpenses: CashExpenseDetail[]; inventory: InventoryItem[]; inventorySnapshotDate: string; inventorySnapshots: InventorySnapshot[]; channelSummary: ChannelSummary[]; citySummary: CitySummary[] };
const defaultDashboardSettings: DashboardSettings = { defaultPeriod: "month", revenueChart: "line", channelChart: "cards", cityChart: "area", stockChart: "table" };
const emptyData: DashboardData = { month: "", period: { mode: "month", start: "", end: "" }, dashboardSettings: defaultDashboardSettings, summary: { todayOrders: 0, monthOrders: 0, monthRevenue: 0, monthReceived: 0, monthExpense: 0, capitalIn: 0, capitalOut: 0, capitalNet: 0, estimatedNet: 0, productsSold: 0, averageOrderValue: 0, platformFees: 0, cashExpense: 0, canceledOrders: 0, delivering: 0, returns: 0, lowStock: 0, stockUnits: 0 }, days: [], cashExpenses: [], inventory: [], inventorySnapshotDate: "", inventorySnapshots: [], channelSummary: [], citySummary: [] };
const money = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 });
const weekdays = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

export default function Dashboard() {
  const liveRevision = useDashboardUpdates();
  const [month, setMonth] = useState(() => { const now = new Date(); return new Date(now.getFullYear(), now.getMonth(), 1); });
  const [periodMode, setPeriodMode] = useState<"month" | "week">("month");
  const [weekAnchor, setWeekAnchor] = useState(() => new Date().toISOString().slice(0, 10));
  const [preferenceLoaded, setPreferenceLoaded] = useState(false);
  const [data, setData] = useState<DashboardData>(emptyData);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [detail, setDetail] = useState<"orders" | "revenue" | "received" | "expense" | "capital" | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const monthKey = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`;
  useEffect(() => { let active = true; setLoading(true); setLoadError(false); fetch(`/api/store?view=dashboard&month=${monthKey}&period=${periodMode}&date=${weekAnchor}`, { cache: "no-store" }).then((response) => response.ok ? response.json() : Promise.reject()).then((next: Partial<DashboardData>) => { if (!active) return; const settings = { ...defaultDashboardSettings, ...(next.dashboardSettings || {}) }; setData({ month: typeof next.month === "string" ? next.month : monthKey, period: next.period || { mode: periodMode, start: `${monthKey}-01`, end: `${monthKey}-31` }, dashboardSettings: settings, summary: { ...emptyData.summary, ...(next.summary || {}) }, days: Array.isArray(next.days) ? next.days : [], cashExpenses: Array.isArray(next.cashExpenses) ? next.cashExpenses : [], inventory: Array.isArray(next.inventory) ? next.inventory : [], inventorySnapshotDate: typeof next.inventorySnapshotDate === "string" ? next.inventorySnapshotDate : "", inventorySnapshots: Array.isArray(next.inventorySnapshots) ? next.inventorySnapshots : [], channelSummary: Array.isArray(next.channelSummary) ? next.channelSummary : [], citySummary: Array.isArray(next.citySummary) ? next.citySummary : [] }); if (!preferenceLoaded) { setPreferenceLoaded(true); setPeriodMode(settings.defaultPeriod); } }).catch(() => { if (active) { setLoadError(true); setData({ ...emptyData, month: monthKey }); } }).finally(() => active && setLoading(false)); return () => { active = false; }; }, [monthKey, periodMode, weekAnchor, preferenceLoaded, liveRevision]);
  const byDate = useMemo(() => Object.fromEntries(data.days.map((day) => [day.date, day])), [data.days]);
  const byDay = useMemo(() => Object.fromEntries(data.days.map((day) => [Number(day.date.slice(8, 10)), day])), [data.days]);
  const firstOffset = (new Date(month.getFullYear(), month.getMonth(), 1).getDay() + 6) % 7;
  const dayCount = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells = [...Array(firstOffset).fill(null), ...Array.from({ length: dayCount }, (_, index) => index + 1)]; while (cells.length % 7) cells.push(null);
  const selected = selectedDate ? byDate[selectedDate] : undefined;
  const todayKey = new Date().toISOString().slice(0, 10);
  const dateKeys = periodMode === "week" && data.period.start
    ? Array.from({ length: 7 }, (_, index) => { const date = new Date(`${data.period.start}T12:00:00Z`); date.setUTCDate(date.getUTCDate() + index); return date.toISOString().slice(0, 10); })
    : Array.from({ length: dayCount }, (_, index) => `${monthKey}-${String(index + 1).padStart(2, "0")}`);
  const series = dateKeys.map((date) => { const day = byDate[date]; const [, monthNumber, dayNumber] = date.split("-"); return { date, label: `${Number(dayNumber)}/${Number(monthNumber)}`, revenue: day?.totalAmount || 0, orders: day?.orderCount || 0 }; }).filter((row) => periodMode === "week" || row.date <= todayKey || data.days.some((day) => day.date === row.date));
  const pending = loading || loadError;

  return <main className="limit-dashboard min-h-screen bg-[linear-gradient(145deg,#f8fdff_0%,#eff9ff_48%,#f7fcff_100%)] text-[#0c4a6e]">
    <header className="border-b border-white/40 bg-[linear-gradient(110deg,#0c4a6e_0%,#075985_55%,#0369a1_100%)] text-white shadow-[0_10px_35px_rgba(7,89,133,0.14)]"><div className="mx-auto flex max-w-[1500px] px-5 py-5 lg:px-8"><div className="flex items-center gap-4"><div className="grid size-11 place-items-center rounded-2xl bg-[#bae6fd] text-lg font-black text-[#0c4a6e] shadow-inner">LS</div><div><p className="text-lg font-extrabold tracking-tight">LIMIT SPORTSWEAR</p><p className="text-sm text-sky-100/80">Dashboard vận hành</p></div></div></div></header>
    <div className="mx-auto max-w-[1500px] space-y-7 px-5 py-7 lg:px-8">
      <h1 className="text-2xl font-black">Tổng quan cửa hàng</h1>
      <section className="flex flex-wrap items-end gap-3 rounded-2xl border border-[#bae6fd] bg-white p-4 shadow-sm">
        <div className="flex rounded-xl bg-[#e0f2fe] p-1">
          <Button size="sm" variant={periodMode === "month" ? "default" : "ghost"} onClick={() => { setSelectedDate(null); setPeriodMode("month"); }}>Theo tháng</Button>
          <Button size="sm" variant={periodMode === "week" ? "default" : "ghost"} onClick={() => { setSelectedDate(null); setPeriodMode("week"); }}>Theo tuần</Button>
        </div>
        {periodMode === "week" && <label className="grid gap-1 text-xs font-bold text-[#64748b]">Chọn một ngày trong tuần<input type="date" value={weekAnchor} onChange={(event) => { setSelectedDate(null); setWeekAnchor(event.target.value); }} className="h-9 rounded-lg border border-[#bae6fd] bg-white px-3 text-sm text-[#0c4a6e]" /></label>}
        <p className="text-sm font-extrabold text-[#0369a1]">{periodMode === "week" && data.period.start ? `Tuần ${dateLabel(data.period.start)} – ${dateLabel(data.period.end)}` : `Tháng ${month.getMonth() + 1}/${month.getFullYear()}`}</p>
      </section>
      {loading && <p role="status">Đang tải số liệu...</p>}
      {loadError && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">Không tải được số liệu. Vui lòng tải lại trang.</p>}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <Stat disabled={pending} onClick={() => setDetail("orders")} icon={<ShoppingBag />} label="Đơn trong kỳ" value={pending ? "—" : String(data.summary.monthOrders)} note={`${data.summary.productsSold} sản phẩm · ${data.summary.canceledOrders} đơn hủy`} />
        <Stat disabled={pending} onClick={() => setDetail("revenue")} icon={<CircleDollarSign />} label="Doanh thu" value={pending ? "—" : money.format(data.summary.monthRevenue)} note={`Trung bình ${money.format(data.summary.averageOrderValue)}/đơn`} />
        <Stat disabled={pending} onClick={() => setDetail("received")} icon={<CircleDollarSign />} label="Tiền thực nhận" value={pending ? "—" : money.format(data.summary.monthReceived)} warning={data.summary.monthReceived < 0} />
        <Stat disabled={pending} onClick={() => setDetail("expense")} icon={<CircleDollarSign />} label="Chi phí" value={pending ? "—" : money.format(data.summary.monthExpense)} />
        <Stat disabled={pending} onClick={() => setDetail("capital")} icon={<CircleDollarSign />} label="Vốn ròng" value={pending ? "—" : money.format(data.summary.capitalNet)} note="Vốn vào − rút vốn trong kỳ" warning={data.summary.capitalNet < 0} />
        <Stat disabled={pending} onClick={() => document.getElementById("inventory-status")?.scrollIntoView({ behavior: "smooth", block: "start" })} icon={<PackageSearch />} label="Tổng tồn kho" value={pending ? "—" : String(data.summary.stockUnits)} note={`${data.summary.lowStock} mã sắp hết`} warning={data.summary.lowStock > 0} />
      </section>
      <section className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <article className="min-w-0 rounded-3xl border border-[#d8eef9] bg-white p-5 shadow-sm"><h2 className="text-lg font-extrabold">Hiệu quả theo kênh bán</h2><ChannelSummaryView rows={pending ? [] : data.channelSummary} type={data.dashboardSettings.channelChart} /></article>
        <article className="min-w-0 rounded-3xl border border-[#d8eef9] bg-white p-5 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-extrabold">Doanh thu theo ngày</h2><Button variant="outline" disabled={pending} onClick={() => setDetail("revenue")}>Xem số liệu</Button></div><RevenueChart rows={pending ? [] : series} type={data.dashboardSettings.revenueChart} onDay={setSelectedDate} /></article>
      </section>
      <section className="rounded-3xl border border-[#bae6fd] bg-white p-5 shadow-[0_18px_55px_rgba(14,165,233,0.10)] sm:p-6">
        <div>
          <h2 className="text-xl font-extrabold">Số lượng đơn theo tỉnh/thành</h2>
          <p className="mt-1 text-sm text-[#64748b]">Dữ liệu lấy trực tiếp từ địa chỉ đơn hàng và tỉnh/thành trong kỳ đang xem</p>
        </div>
        <CityDashboardChart rows={pending ? [] : data.citySummary} type={data.dashboardSettings.cityChart} />
      </section>
      <section className="overflow-hidden rounded-[2rem] border border-[#cde9f7] bg-white shadow-[0_22px_65px_rgba(14,116,144,0.10)]">
        <div className="flex flex-wrap items-center justify-between gap-4 px-5 pb-2 pt-5 sm:px-6 sm:pt-6">
          <div className="flex items-center gap-3"><div className="grid size-11 place-items-center rounded-2xl bg-[#e0f2fe] text-[#0284c7]"><CalendarDays className="size-5" /></div><div><h2 className="text-xl font-extrabold">Lịch bán hàng</h2><p className="text-sm text-[#64748b]">Mỗi ô hiển thị tổng doanh thu và số đơn · bấm vào ngày để xem chi tiết</p></div></div>
          {periodMode === "month" && <div className="flex items-center gap-2"><Button variant="outline" size="sm" onClick={() => { const now = new Date(); setSelectedDate(null); setMonth(new Date(now.getFullYear(), now.getMonth(), 1)); }}>Hôm nay</Button><button aria-label="Tháng trước" onClick={() => { setSelectedDate(null); setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1)); }} className="nut-bieu-tuong"><ChevronLeft /></button><button aria-label="Tháng sau" onClick={() => { setSelectedDate(null); setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1)); }} className="nut-bieu-tuong"><ChevronRight /></button><span className="ml-1 min-w-36 text-center text-lg font-extrabold">Tháng {month.getMonth() + 1}/{month.getFullYear()}</span></div>}
        </div>
        <div className="overflow-x-auto"><div className="min-w-[760px] p-4 pt-2 sm:p-6 sm:pt-3">
          <div className="grid grid-cols-7 gap-3">{weekdays.map((day) => <div key={day} className="py-2 text-center text-xs font-bold uppercase tracking-wider text-[#64748b]">{day}</div>)}</div>
          {periodMode === "week" ? <div className="grid grid-cols-7 gap-3">{series.map((row) => <SalesDayCell key={row.date} date={row.date} summary={byDate[row.date]} today={row.date === todayKey} onClick={() => setSelectedDate(row.date)} />)}</div> : <div className="grid grid-cols-7 gap-3">{cells.map((day, index) => { const date = day ? `${monthKey}-${String(day).padStart(2, "0")}` : ""; return day ? <SalesDayCell key={date} date={date} summary={byDay[day]} today={date === todayKey} onClick={() => setSelectedDate(date)} /> : <div key={`empty-${index}`} className="min-h-28 rounded-3xl bg-[#f8fbfd]" />; })}</div>}
        </div></div>
      </section>
      <section id="inventory-status" className="scroll-mt-6"><StockSummaryView inventory={pending ? [] : data.inventory} snapshotDate={data.inventorySnapshotDate} type={data.dashboardSettings.stockChart} pending={pending} /></section>
    </div>
    <Sheet open={detail !== null} onOpenChange={(open) => !open && setDetail(null)}><SheetContent className="w-full overflow-y-auto p-0 sm:max-w-3xl">
      <SheetHeader className="border-b bg-[#f0f9ff] p-6 text-left"><SheetTitle>{detail === "orders" ? "Đơn trong kỳ" : detail === "revenue" ? "Doanh thu" : detail === "received" ? "Cách tính tiền thực nhận" : detail === "capital" ? "Sổ vốn ròng" : "Cách tính chi phí"}</SheetTitle><SheetDescription>{periodMode === "week" ? `Tuần ${dateLabel(data.period.start)} – ${dateLabel(data.period.end)}` : `Tháng ${month.getMonth() + 1}/${month.getFullYear()}`}</SheetDescription></SheetHeader>
      <div className="space-y-5 p-5">{pending ? <p>Số liệu chưa sẵn sàng.</p> : detail === "orders" || detail === "revenue" ? <>
        <p className="text-xl font-black">{detail === "orders" ? `${data.summary.monthOrders} đơn` : money.format(data.summary.monthRevenue)}</p>
        <RevenueChart rows={series} orders={detail === "orders"} type={detail === "orders" ? "bar" : data.dashboardSettings.revenueChart} onDay={(date) => { setDetail(null); setSelectedDate(date); }} />
        <Table><TableHeader><TableRow><TableHead>Ngày</TableHead><TableHead className="text-right">Số đơn</TableHead><TableHead className="text-right">Doanh thu</TableHead></TableRow></TableHeader><TableBody>{series.map((row) => <TableRow key={row.date}><TableCell><button className="font-semibold text-sky-700 underline" onClick={() => { setDetail(null); setSelectedDate(row.date); }}>{row.label}</button></TableCell><TableCell className="text-right">{row.orders}</TableCell><TableCell className="text-right">{money.format(row.revenue)}</TableCell></TableRow>)}</TableBody></Table>
      </> : detail === "capital" ? <>
        <p className="rounded-2xl bg-[#f0f9ff] p-4 font-bold">Vốn ròng = Vốn vào − Rút vốn trong kỳ đang xem.</p>
        <dl className="space-y-4 text-sm"><Flow label="Vốn vào" value={data.summary.capitalIn} /><Flow label="Rút vốn" value={data.summary.capitalOut} /><div className="border-t pt-4"><Flow label="Vốn ròng" value={data.summary.capitalNet} strong /></div></dl>
        <p className="text-sm text-slate-500">Vốn làm thay đổi dòng tiền, không tính vào doanh thu hay chi phí.</p>
      </> : detail === "expense" ? <>
        <p className="rounded-2xl bg-[#f0f9ff] p-4 font-bold">Chi phí chỉ gồm các khoản chi và phí sàn, không gồm phí vận chuyển.</p>
        <div>
          <ExpenseColumn title="Chi phí" total={data.summary.monthExpense} empty="Chưa có khoản chi trong tháng.">
            {data.cashExpenses.map((row) => <TableRow key={row.id}><TableCell className="whitespace-nowrap">{dateLabel(row.date)}</TableCell><TableCell>{row.category}</TableCell><TableCell className="text-right font-bold">{money.format(row.amount)}</TableCell></TableRow>)}
          </ExpenseColumn>
        </div>
        <div className="flex items-center justify-between border-t pt-4 text-base font-black"><span>Tổng chi phí</span><span>{money.format(data.summary.monthExpense)}</span></div>
      </> : <>
        <p className="rounded-2xl bg-[#f0f9ff] p-4 font-bold">Tiền thực nhận = Doanh thu − Chi phí</p>
        <dl className="space-y-4 text-sm">
          <Flow label="Doanh thu" value={data.summary.monthRevenue} />
          <Flow label="Tiền chi (mục Thu chi)" value={data.summary.cashExpense} />
          <Flow label="Phí sàn" value={data.summary.platformFees} />
          <div className="border-t pt-4"><Flow label="Tổng chi phí" value={data.summary.monthExpense} strong /></div>
          <div className="border-t pt-4"><Flow label="Tiền thực nhận" value={data.summary.monthReceived} strong /></div>
        </dl>
        <p className="text-sm text-slate-500">Thực nhận ở đây là số tính theo công thức bạn chọn, không phải xác nhận tiền đã về tài khoản.</p>
      </>}</div>
    </SheetContent></Sheet>
    <Sheet open={selectedDate !== null} onOpenChange={(open) => !open && setSelectedDate(null)}><SheetContent className="w-full overflow-y-auto p-0 sm:max-w-xl"><SheetHeader className="border-b bg-[#0c4a6e] p-6 text-left text-white"><SheetTitle className="flex items-center gap-3 text-white"><CalendarDays className="text-[#7dd3fc]" /> Đơn bán ngày {selectedDate ? dateLabel(selectedDate) : ""}</SheetTitle><SheetDescription className="text-slate-400">{selected ? `${selected.orderCount} đơn · ${selected.quantity} sản phẩm · ${money.format(selected.totalAmount)}` : "Không có đơn hàng"}</SheetDescription></SheetHeader><div className="space-y-5 p-5">{selected ? <><div><h3 className="mb-3 font-extrabold">Nguồn đơn hàng</h3><div className="grid gap-2 sm:grid-cols-2">{Object.entries(selected.channels).map(([channel, count]) => <div key={channel} className="flex items-center justify-between rounded-xl border p-3"><span className="font-semibold">{channel}</span><b>{count} đơn</b></div>)}</div></div><div><h3 className="mb-3 font-extrabold">Mã hàng đã bán</h3>{(selected.items || []).length ? <div className="overflow-hidden rounded-xl border"><Table><TableHeader><TableRow><TableHead>Mã hàng</TableHead><TableHead>Size</TableHead><TableHead className="text-right">Số lượng</TableHead></TableRow></TableHeader><TableBody>{selected.items.map((item) => <TableRow key={`${item.sku}-${item.size}`}><TableCell className="font-mono text-xs font-bold">{item.sku}</TableCell><TableCell>{item.size}</TableCell><TableCell className="text-right text-lg font-black">{item.quantity}</TableCell></TableRow>)}</TableBody></Table></div> : <p className="rounded-xl bg-[#f0f9ff] p-6 text-center text-sm text-[#64748b]">Đơn cũ chưa có chi tiết mã và size.</p>}</div></> : <p className="rounded-xl bg-[#f0f9ff] p-8 text-center text-[#64748b]">Không có đơn hàng trong ngày này.</p>}</div></SheetContent></Sheet>
  </main>;
}

function Stat({ icon, label, value, note, warning = false, onClick, disabled }: { icon: React.ReactNode; label: string; value: string; note?: string; warning?: boolean; onClick: () => void; disabled?: boolean }) {
  const valueRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const element = valueRef.current;
    if (!element) return;

    let lastWidth = 0;
    const fitValue = () => {
      const width = element.clientWidth;
      if (!width || width === lastWidth) return;
      lastWidth = width;

      element.style.fontSize = "";
      const baseSize = Number.parseFloat(window.getComputedStyle(element).fontSize);
      if (!baseSize || element.scrollWidth <= width) return;

      let low = 12;
      let high = baseSize;
      element.style.fontSize = `${low}px`;
      if (element.scrollWidth > width) return;

      for (let attempt = 0; attempt < 8; attempt += 1) {
        const candidate = (low + high) / 2;
        element.style.fontSize = `${candidate}px`;
        if (element.scrollWidth <= width) low = candidate;
        else high = candidate;
      }
      element.style.fontSize = `${low}px`;
    };

    fitValue();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(fitValue);
    observer?.observe(element);
    const handleWindowResize = () => {
      lastWidth = 0;
      fitValue();
    };
    window.addEventListener("resize", handleWindowResize);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", handleWindowResize);
    };
  }, [value]);

  return <button type="button" onClick={onClick} disabled={disabled} className="dashboard-stat min-w-0 rounded-3xl border border-[#d8eef9] bg-white/90 p-5 text-left shadow-[0_14px_38px_rgba(14,116,144,0.07)] backdrop-blur transition hover:border-sky-300 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-500 disabled:opacity-60"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="text-sm font-semibold text-[#64748b]">{label}</p><p ref={valueRef} title={value} className="mt-2 min-w-0 overflow-hidden whitespace-nowrap text-2xl font-black tracking-tight">{value}</p></div><div className="grid size-9 shrink-0 place-items-center rounded-2xl bg-[linear-gradient(145deg,#e0f2fe,#f0f9ff)] text-[#0369a1] shadow-inner [&_svg]:size-5">{icon}</div></div>{note && <p className={`mt-4 text-xs font-bold ${warning ? "text-[#b44b08]" : "text-[#0284c7]"}`}>{note}</p>}</button>;
}
type ChartDay = { date: string; label: string; revenue: number; orders: number };
function RevenueChart({ rows, orders = false, type = "line", onDay }: { rows: ChartDay[]; orders?: boolean; type?: "line" | "bar" | "area"; onDay: (date: string) => void }) {
  const [point, setPoint] = useState<ChartDay | null>(null);
  const axes = <><CartesianGrid strokeDasharray="3 3" stroke="#e0f2fe" /><XAxis dataKey="label" minTickGap={22} tick={{ fontSize: 11 }} /><YAxis width={60} allowDecimals={!orders} domain={[0, "auto"]} tick={{ fontSize: 11 }} tickFormatter={(value) => orders ? String(value) : new Intl.NumberFormat("vi-VN", { notation: "compact", maximumFractionDigits: 1 }).format(Number(value))} /><Tooltip formatter={(value) => orders ? [`${value} đơn`, "Số đơn"] : [money.format(Number(value)), "Doanh thu"]} /></>;
  return <div className="mt-5">
    {rows.length ? <><div className="h-64 min-w-0" aria-label={orders ? "Biểu đồ số đơn theo ngày" : "Biểu đồ doanh thu theo ngày"}><ResponsiveContainer width="100%" height="100%">{orders || type === "bar" ? <BarChart data={rows} accessibilityLayer>{axes}<Bar dataKey={orders ? "orders" : "revenue"} fill="#7dd3fc" radius={[5, 5, 0, 0]} onClick={(entry) => { const row = entry as unknown as ChartDay; if (row.date) { setPoint(row); onDay(row.date); } }} /></BarChart> : type === "area" ? <AreaChart data={rows} accessibilityLayer>{axes}<defs><linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.7} /><stop offset="95%" stopColor="#7dd3fc" stopOpacity={0.08} /></linearGradient></defs><Area name="Doanh thu" type="monotone" dataKey="revenue" stroke="#0284c7" strokeWidth={3} fill="url(#revenueFill)" activeDot={{ r: 6, onClick: (_event: unknown, props: unknown) => { const row = (props as { payload?: ChartDay }).payload; if (row) { setPoint(row); onDay(row.date); } } }} /></AreaChart> : <LineChart data={rows} accessibilityLayer>{axes}<Line name="Doanh thu" type="linear" dataKey="revenue" stroke="#38bdf8" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 6, onClick: (_event: unknown, props: unknown) => { const row = (props as { payload?: ChartDay }).payload; if (row) { setPoint(row); onDay(row.date); } } }} /></LineChart>}</ResponsiveContainer></div>
    <div className="mt-3 flex flex-wrap items-center gap-2"><label className="text-sm font-semibold">Xem ngày <select aria-label="Ngày trên biểu đồ" className="ml-2 rounded-xl border bg-white p-2" value={point?.date || ""} onChange={(event) => setPoint(rows.find((row) => row.date === event.target.value) || null)}><option value="">Chọn ngày</option>{rows.map((row) => <option key={row.date} value={row.date}>{row.label}</option>)}</select></label>{point && <><span className="text-sm">{point.orders} đơn · {money.format(point.revenue)}</span><Button size="sm" variant="outline" onClick={() => onDay(point.date)}>Chi tiết ngày</Button></>}</div></> : <p className="rounded-2xl bg-sky-50 p-8 text-center text-sm text-slate-500">Chưa có số liệu để vẽ biểu đồ.</p>}
  </div>;
}
function CityDashboardChart({ rows, type }: { rows: CitySummary[]; type: "area" | "bar" | "line" }) {
  const axes = <><CartesianGrid strokeDasharray="3 3" stroke="#e0f2fe" /><XAxis dataKey="city" interval={0} angle={-30} textAnchor="end" height={75} tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} width={45} tick={{ fontSize: 11 }} /><Tooltip formatter={(value) => [`${value} đơn`, "Số đơn"]} /></>;
  return <div className="mt-5">
    {rows.length ? <div className="h-80 min-w-0" aria-label="Biểu đồ số lượng đơn theo tỉnh thành">
      <ResponsiveContainer width="100%" height="100%">
        {type === "bar" ? <BarChart data={rows} margin={{ top: 10, right: 18, left: 0, bottom: 55 }} accessibilityLayer>{axes}<Bar dataKey="orders" name="Số đơn" fill="#38bdf8" radius={[7, 7, 0, 0]} /></BarChart> : type === "line" ? <LineChart data={rows} margin={{ top: 10, right: 18, left: 0, bottom: 55 }} accessibilityLayer>{axes}<Line type="monotone" dataKey="orders" name="Số đơn" stroke="#0284c7" strokeWidth={3} dot={{ r: 4 }} /></LineChart> : <AreaChart data={rows} margin={{ top: 10, right: 18, left: 0, bottom: 55 }} accessibilityLayer>
          <defs><linearGradient id="cityOrdersFill" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.7} /><stop offset="95%" stopColor="#7dd3fc" stopOpacity={0.08} /></linearGradient></defs>
          {axes}
          <Area type="monotone" dataKey="orders" name="Số đơn" stroke="#0284c7" strokeWidth={3} fill="url(#cityOrdersFill)" activeDot={{ r: 6 }} />
        </AreaChart>}
      </ResponsiveContainer>
    </div> : <p className="rounded-2xl bg-sky-50 p-8 text-center text-sm text-slate-500">Chưa có địa chỉ tỉnh/thành để vẽ biểu đồ.</p>}
  </div>;
}
const chartColors = ["#0284c7", "#38bdf8", "#f59e0b", "#10b981", "#8b5cf6", "#f43f5e"];
function ChannelSummaryView({ rows, type }: { rows: ChannelSummary[]; type: "cards" | "bar" | "pie" }) {
  if (!rows.length) return <p className="mt-5 rounded-xl bg-[#f0f9ff] p-8 text-center text-sm text-[#64748b]">Chưa có đơn trong kỳ.</p>;
  if (type === "cards") return <div className="mt-5 space-y-3">{rows.map((channel) => <div key={channel.name} className="grid grid-cols-[1fr_auto] gap-3 rounded-2xl bg-[#f0f9ff] p-4"><div><p className="font-bold">{channel.name}</p><p className="text-sm text-[#64748b]">{channel.orders} đơn</p></div><b className="self-center">{money.format(channel.revenue)}</b></div>)}</div>;
  return <div className="mt-5 h-64 min-w-0"><ResponsiveContainer width="100%" height="100%">{type === "pie" ? <PieChart><Pie data={rows} dataKey="orders" nameKey="name" outerRadius={82} label={({ name, value }) => `${name}: ${value}`} >{rows.map((row, index) => <Cell key={row.name} fill={chartColors[index % chartColors.length]} />)}</Pie><Tooltip formatter={(value) => [`${value} đơn`, "Số đơn"]} /><Legend /></PieChart> : <BarChart data={rows}><CartesianGrid strokeDasharray="3 3" stroke="#e0f2fe" /><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} /><Tooltip formatter={(value) => [`${value} đơn`, "Số đơn"]} /><Bar dataKey="orders" radius={[7, 7, 0, 0]}>{rows.map((row, index) => <Cell key={row.name} fill={chartColors[index % chartColors.length]} />)}</Bar></BarChart>}</ResponsiveContainer></div>;
}
function SalesDayCell({ date, summary, today, onClick }: { date: string; summary?: DaySummary; today: boolean; onClick: () => void }) {
  return <button onClick={onClick} className={`min-h-28 rounded-3xl p-4 text-left align-top shadow-[inset_0_0_0_1px_rgba(14,116,144,0.05)] transition duration-200 hover:-translate-y-0.5 hover:shadow-md ${calendarRevenueTone(summary?.totalAmount || 0)}`}><span className={`grid size-7 place-items-center rounded-full text-sm font-extrabold ${today ? "bg-[#0284c7] text-white shadow-sm" : "text-[#64748b]"}`}>{Number(date.slice(8, 10))}</span>{summary && <div className="mt-3"><p className="text-base font-black tracking-tight">{compactMoney(summary.totalAmount)}</p><p className="mt-0.5 text-sm font-bold opacity-75">{summary.orderCount} đơn</p></div>}</button>;
}
function StockSummaryView({ inventory, snapshotDate, type, pending }: { inventory: InventoryItem[]; snapshotDate: string; type: "table" | "bar" | "pie"; pending: boolean }) {
  const rows = [{ name: "Còn hàng", value: inventory.filter((item) => item.stock > item.lowStockThreshold).length }, { name: "Sắp hết", value: inventory.filter((item) => item.stock > 0 && item.stock <= item.lowStockThreshold).length }, { name: "Hết hàng", value: inventory.filter((item) => item.stock === 0).length }];
  return <article className="rounded-[2rem] border border-[#d8eef9] bg-white p-5 shadow-[0_18px_55px_rgba(14,116,144,0.08)] sm:p-6"><div><h2 className="text-xl font-extrabold">Kho hàng — gộp theo mã hàng</h2><p className="mt-1 text-sm text-[#64748b]">{snapshotDate ? `Cập nhật từ kiểm kho ngày ${dateLabel(snapshotDate)} · bấm vào một mã để xem từng màu và size` : "Chưa có bản kiểm kho đến kỳ đang xem"}</p></div>{!pending && inventory.length ? type === "table" ? <GroupedPublicInventory inventory={inventory} /> : <div className="mt-5 h-72 min-w-0"><ResponsiveContainer width="100%" height="100%">{type === "pie" ? <PieChart><Pie data={rows} dataKey="value" nameKey="name" outerRadius={95} label={({ name, value }) => `${name}: ${value}`}>{rows.map((row, index) => <Cell key={row.name} fill={chartColors[index % chartColors.length]} />)}</Pie><Tooltip /><Legend /></PieChart> : <BarChart data={rows}><CartesianGrid strokeDasharray="3 3" stroke="#e0f2fe" /><XAxis dataKey="name" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="value" name="Số mã" radius={[8, 8, 0, 0]}>{rows.map((row, index) => <Cell key={row.name} fill={chartColors[index % chartColors.length]} />)}</Bar></BarChart>}</ResponsiveContainer></div> : <p className="mt-5 rounded-xl bg-[#f0f9ff] p-8 text-center text-sm text-[#64748b]">{pending ? "Chưa tải được số liệu kho." : "Chưa có sản phẩm trong kho."}</p>}</article>;
}
function GroupedPublicInventory({ inventory }: { inventory: InventoryItem[] }) {
  const [search, setSearch] = useState("");
  const [onlyEmpty, setOnlyEmpty] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const groups = [...new Map(inventory.map((item) => [item.sku, inventory.filter((row) => row.sku === item.sku)])).entries()].map(([sku, items]) => ({ sku, items, name: publicInventoryGroupName(sku, items.map((item) => item.name)), total: items.reduce((sum, item) => sum + item.stock, 0), threshold: Math.max(...items.map((item) => item.lowStockThreshold), 5) })).filter((group) => `${group.sku} ${group.name}`.toLocaleLowerCase("vi").includes(search.toLocaleLowerCase("vi")) && (!onlyEmpty || group.total === 0));
  return <div className="mt-5"><div className="flex flex-col gap-3 sm:flex-row"><input aria-label="Tìm kho" className="h-11 flex-1 rounded-2xl border border-[#cde9f7] bg-[#f8fcff] px-4 outline-none focus:border-[#38bdf8]" placeholder="Tìm theo mã hàng hoặc tên sản phẩm..." value={search} onChange={(event) => setSearch(event.target.value)} /><button className={`rounded-full border px-4 py-2 text-sm font-bold ${onlyEmpty ? "border-red-200 bg-red-50 text-red-700" : "border-[#cde9f7] text-[#64748b]"}`} onClick={() => setOnlyEmpty((value) => !value)}>Chỉ hiện hết hàng</button></div><div className="mt-4 overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Mã / Sản phẩm</TableHead><TableHead>Màu</TableHead><TableHead className="text-right">Tổng</TableHead><TableHead>Trạng thái</TableHead></TableRow></TableHeader><TableBody>{groups.flatMap((group) => { const open = expanded === group.sku; const state = group.total === 0 ? "Hết hàng" : group.total <= group.threshold ? "Sắp hết" : "Còn hàng"; return [<TableRow key={group.sku} className="cursor-pointer hover:bg-sky-50/70" onClick={() => setExpanded(open ? null : group.sku)}><TableCell className="font-extrabold"><span className="mr-3 text-xs text-[#64748b]">{open ? "▼" : "▶"}</span>{group.sku} — {group.name}</TableCell><TableCell className="text-[#64748b]">{group.items.length} biến thể</TableCell><TableCell className="text-right text-lg font-black">{group.total}</TableCell><TableCell><StockPill state={state} /></TableCell></TableRow>, ...(open ? group.items.map((item, index) => <TableRow key={`${group.sku}-${item.name}-${item.color}-${item.size}-${index}`} className="bg-[#f8fcff]"><TableCell className="pl-12 text-[#64748b]">↳ <b className="text-[#0c4a6e]">{item.name}</b> · {[item.color, item.size].filter(Boolean).join(" · ") || "Chưa phân loại"}</TableCell><TableCell>{item.color || "—"}</TableCell><TableCell className="text-right font-bold">{item.stock}</TableCell><TableCell><StockPill state={item.stock === 0 ? "Hết hàng" : item.stock <= item.lowStockThreshold ? "Sắp hết" : "Còn hàng"} /></TableCell></TableRow>) : [])]; })}</TableBody></Table>{!groups.length && <p className="py-8 text-center text-sm text-[#64748b]">Không có mã hàng phù hợp.</p>}</div></div>;
}
function publicInventoryGroupName(sku: string, names: string[]) { const variants = [...new Set(names.map((name) => name.trim()).filter(Boolean))]; if (sku === "S001") return "SET ba lỗ - chân váy"; if (sku === "S002") return "SET yoga (Áo · Quần · Bra)"; return variants.length === 1 ? variants[0] : variants.join(" · ") || "Sản phẩm"; }
function StockPill({ state }: { state: string }) { return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${state === "Hết hàng" ? "bg-red-50 text-red-700" : state === "Sắp hết" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>{state}</span>; }
function compactMoney(value: number) { return value >= 1_000_000 ? `${(value / 1_000_000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}tr ₫` : value >= 1_000 ? `${Math.round(value / 1_000).toLocaleString("vi-VN")}k ₫` : money.format(value); }
function calendarRevenueTone(value: number) { if (value <= 0) return "bg-[#f8fbfd] text-[#64748b]"; if (value < 1_500_000) return "bg-emerald-50 text-emerald-700"; if (value < 3_000_000) return "bg-amber-50 text-amber-700"; return "bg-rose-50 text-rose-700"; }
function Flow({ label, value, strong = false }: { label: string; value: number; strong?: boolean }) { return <div className={`flex items-center justify-between gap-4 ${strong ? "text-base font-black" : ""}`}><dt>{label}</dt><dd className={value < 0 ? "font-bold text-[#b44b08]" : "font-bold text-[#0369a1]"}>{value < 0 ? "−" : ""}{money.format(Math.abs(value))}</dd></div>; }
function ExpenseColumn({ title, total, empty, children }: { title: string; total: number; empty: string; children: React.ReactNode }) { const hasRows = Array.isArray(children) ? children.length > 0 : Boolean(children); return <section className="min-w-0 overflow-hidden rounded-2xl border border-[#d8eef9]"><div className="flex items-center justify-between gap-2 bg-[#f0f9ff] p-4"><h3 className="font-extrabold">{title}</h3><b className="text-sm">{money.format(total)}</b></div><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Ngày</TableHead><TableHead>Nhóm</TableHead><TableHead className="text-right">Số tiền chi</TableHead></TableRow></TableHeader><TableBody>{hasRows ? children : <TableRow><TableCell colSpan={3} className="py-8 text-center text-sm text-slate-500">{empty}</TableCell></TableRow>}</TableBody></Table></div></section>; }
function dateLabel(value: string) { const [year, month, day] = value.slice(0, 10).split("-"); return year && month && day ? `${day}/${month}/${year}` : value; }
function Tag({ children, warning = false }: { children: string; warning?: boolean }) { return <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${warning ? "bg-[#fff1e8] text-[#b44b08]" : "bg-[#e0f2fe] text-[#0369a1]"}`}>{children}</span>; }
function dayTone(orderCount: number) { if (orderCount === 1) return "bg-[#fee2e2] hover:bg-[#fecaca]"; if (orderCount === 2) return "bg-[#fef3c7] hover:bg-[#fde68a]"; if (orderCount >= 4) return "bg-[#dcfce7] hover:bg-[#bbf7d0]"; return "bg-white hover:bg-[#f0f9ff]"; }
function inventoryTone(stock: number) { if (stock === 0) return "bg-[#fee2e2] hover:bg-[#fecaca]"; if (stock < 3) return "bg-[#ffedd5] hover:bg-[#fed7aa]"; if (stock <= 5) return ""; if (stock <= 10) return "bg-[#fef3c7] hover:bg-[#fde68a]"; return "bg-[#dcfce7] hover:bg-[#bbf7d0]"; }

