import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ACTIVE_SCHOOL_COOKIE_NAME } from "@/lib/schools/context";

export async function POST(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const response = NextResponse.redirect(new URL("/acceso-centro", request.url));
  response.cookies.delete(ACTIVE_SCHOOL_COOKIE_NAME);
  return response;
}
