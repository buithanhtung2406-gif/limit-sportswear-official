import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  (await cookies()).delete("ls_admin");
  return NextResponse.redirect(new URL("/dang-nhap", request.url));
}
