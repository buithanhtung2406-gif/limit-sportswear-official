import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createPastMonthUnlockValue, isAdminSession, isPastMonth, isPastMonthUnlocked, pastMonthCookieName, verifyAdminPassword } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!(await isAdminSession())) return NextResponse.json({ error: "Phiên đăng nhập đã hết hạn." }, { status: 401 });
  const month = new URL(request.url).searchParams.get("month") || "";
  if (!/^\d{4}-\d{2}$/.test(month)) return NextResponse.json({ error: "Tháng không hợp lệ." }, { status: 400 });
  return NextResponse.json({ unlocked: await isPastMonthUnlocked(month), requiresPasscode: isPastMonth(month) });
}

export async function POST(request: Request) {
  try {
    if (!(await isAdminSession())) return NextResponse.json({ error: "Phiên đăng nhập đã hết hạn." }, { status: 401 });
    const { month, passcode } = await request.json() as { month?: string; passcode?: string };
    if (!month || !/^\d{4}-\d{2}$/.test(month) || !isPastMonth(month)) return NextResponse.json({ error: "Chỉ cần mở khóa cho tháng trước." }, { status: 400 });
    if (!passcode || !(await verifyAdminPassword(passcode))) return NextResponse.json({ error: "Passcode chưa đúng." }, { status: 400 });
    const unlock = await createPastMonthUnlockValue(month);
    if (!unlock) return NextResponse.json({ error: "Chưa thể mở khóa tháng này." }, { status: 503 });
    (await cookies()).set(pastMonthCookieName, unlock.value, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: unlock.maxAge });
    return NextResponse.json({ ok: true, month });
  } catch {
    return NextResponse.json({ error: "Chưa thể kiểm tra passcode. Vui lòng thử lại." }, { status: 500 });
  }
}
