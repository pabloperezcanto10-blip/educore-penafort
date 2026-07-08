import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const previewUrl = new URL("/dashboard/reports/term-preview", url.origin);

  url.searchParams.forEach((value, key) => {
    previewUrl.searchParams.set(key, value);
  });
  previewUrl.searchParams.set("print", "1");

  return NextResponse.redirect(previewUrl);
}
