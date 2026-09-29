import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createAdminSessionValue, verifyAdminPassword } from "@/lib/admin-auth";

export async function POST(request: Request) {
  const { password } = await request.json() as { password?: string };
  const sessionValue = await createAdminSessionValue();
  if (!sessionValue) return NextResponse.json({ error: "Chưa cấu hình tài khoản quản trị." }, { status: 503 });
  if (!password || !(await verifyAdminPassword(password))) return NextResponse.json({ error: "Mật khẩu chưa đúng." }, { status: 401 });
  (await cookies()).set("ls_admin", sessionValue, {
    httpOnly: true,
    secure: new URL(request.url).protocol === "https:",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return NextResponse.json({ ok: true });
}
