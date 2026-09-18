import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  return NextResponse.json({
    user_id: data.user?.id ?? null,
    email: data.user?.email ?? null,
    error: error?.message ?? null,
  });
}
