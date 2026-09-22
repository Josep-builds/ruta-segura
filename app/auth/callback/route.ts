import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const errDesc = searchParams.get("error_description");

  if (errDesc) return NextResponse.redirect(`${origin}/entrar?e=google-${encodeURIComponent(errDesc)}`);
  if (!code) return NextResponse.redirect(`${origin}/entrar?e=sin-codigo`);

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(`${origin}/entrar?e=${encodeURIComponent(error.message)}`);

  return NextResponse.redirect(`${origin}/rider`);
}
