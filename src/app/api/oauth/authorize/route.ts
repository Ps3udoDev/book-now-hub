import { type NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const searchParams = url.searchParams.toString();
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "https://rrnysepngbycvuciodoj.supabase.co";

  const supabaseAuthUrl = `${supabaseUrl}/auth/v1/oauth/authorize?${searchParams}`;
  return NextResponse.redirect(supabaseAuthUrl);
}
