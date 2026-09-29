"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const password = new FormData(event.currentTarget).get("password");
    const response = await fetch("/api/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password }) });
    const result = await response.json(); setBusy(false);
    if (!response.ok) { setError(result.error || "Không thể đăng nhập."); return; }
    window.location.replace("/ke-toan");
  }
  return <main className="grid min-h-screen place-items-center bg-[#0c4a6e] px-5 py-10 text-[#0c4a6e]">
    <section className="w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl sm:p-9">
      <div className="mb-7 flex items-center gap-4"><div className="grid size-12 place-items-center rounded-2xl bg-[#7dd3fc] font-black">LS</div><div><p className="text-lg font-black">LIMIT SPORTSWEAR</p><p className="text-sm text-[#64748b]">Khu vực kế toán</p></div></div>
      <div className="mb-6 grid size-11 place-items-center rounded-xl bg-[#e0f2fe] text-[#0369a1]"><LockKeyhole className="size-5" /></div>
      <h1 className="text-2xl font-black">Đăng nhập quản trị</h1><p className="mt-2 text-sm leading-6 text-[#64748b]">Nhập mật khẩu để quản lý đơn hàng, kho, thu chi và báo cáo.</p>
      <form onSubmit={submit} className="mt-7 grid gap-4"><div className="grid gap-2"><Label htmlFor="password">Mật khẩu</Label><Input id="password" name="password" type="password" autoComplete="current-password" required autoFocus /></div>{error && <p className="rounded-xl bg-[#fff1e8] px-4 py-3 text-sm font-semibold text-[#b44b08]">{error}</p>}<Button size="lg" disabled={busy}>{busy ? "Đang đăng nhập..." : "Đăng nhập"}</Button></form>
      <Link
        href="/"
        className="mt-6 block text-center text-sm font-semibold text-[#0369a1] hover:underline"
      >
        Quay lại dashboard
      </Link>
    </section>
  </main>;
}
