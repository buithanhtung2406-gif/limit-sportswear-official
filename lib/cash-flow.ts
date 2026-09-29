export const CASH_FLOW_TYPES = [
  "Thu",
  "Chi",
  "Vốn vào",
  "Rút vốn",
  "Vay",
  "Trả nợ",
] as const;

export type CashFlowType = (typeof CASH_FLOW_TYPES)[number];

export const CASH_CATEGORY_PRESETS: Record<CashFlowType, string[]> = {
  Thu: ["Tiền bán hàng", "Thu khác"],
  Chi: [
    "Nguyên vật liệu",
    "Gia công / sản xuất",
    "Vận chuyển nhập hàng",
    "Bao bì / đóng gói",
    "Marketing / quảng cáo",
    "Lương / cộng tác viên",
    "Mặt bằng",
    "Điện, nước, internet",
    "Phần mềm / công cụ",
    "Thuế / lệ phí",
    "Sửa chữa / bảo trì",
    "Chi phí khác",
  ],
  "Vốn vào": ["Bổ sung vốn chủ sở hữu"],
  "Rút vốn": ["Chủ sở hữu rút vốn"],
  Vay: ["Nhận tiền vay"],
  "Trả nợ": ["Trả gốc vay"],
};

export function isCashFlowType(value: string): value is CashFlowType {
  return CASH_FLOW_TYPES.includes(value as CashFlowType);
}

export function cashFlowDirection(type: string) {
  return type === "Thu" || type === "Vốn vào" || type === "Vay" ? 1 : -1;
}

export function cashFlowRole(type: string) {
  if (type === "Thu") return "income";
  if (type === "Chi") return "expense";
  if (type === "Vốn vào" || type === "Rút vốn") return "equity";
  return "debt";
}
