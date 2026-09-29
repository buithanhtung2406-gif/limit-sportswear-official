import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isAdminSession, updateAdminPassword, verifyAdminPassword } from "@/lib/admin-auth";

export async function POST(request: Request) {
  try {
    if (!(await isAdminSession())) return NextResponse.json({ error: "Phiên đăng nhập đã hết hạn." }, { status: 401 });
    const { currentPassword, newPassword } = await request.json() as { currentPassword?: string; newPassword?: string };
    if (!currentPassword || !(await verifyAdminPassword(currentPassword))) return NextResponse.json({ error: "Mật khẩu hiện tại chưa đúng." }, { status: 400 });
    if (!newPassword || newPassword.length < 8) return NextResponse.json({ error: "Mật khẩu mới cần có ít nhất 8 ký tự." }, { status: 400 });
    if (newPassword === currentPassword) return NextResponse.json({ error: "Mật khẩu mới phải khác mật khẩu hiện tại." }, { status: 400 });
    const sessionValue = await updateAdminPassword(newPassword);
    if (!sessionValue) return NextResponse.json({ error: "Chưa cấu hình phiên quản trị." }, { status: 503 });
    (await cookies()).set("ls_admin", sessionValue, {
      httpOnly: true,
      secure: new URL(request.url).protocol === "https:",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Chưa thể đổi mật khẩu. Vui lòng thử lại." }, { status: 500 });
  }
}
