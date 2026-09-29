import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isAdminSession } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default async function AccountingLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  if (!(await isAdminSession())) redirect("/dang-nhap");
  return children;
}
