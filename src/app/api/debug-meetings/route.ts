import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  const { data: meetings, error: meetingsError } = await supabase
    .from("meetings")
    .select("id, title, user_id");

  return NextResponse.json({
    authenticated_as: userData.user?.email ?? null,
    authenticated_user_id: userData.user?.id ?? null,
    user_error: userError?.message ?? null,
    meetings_returned: meetings,
    meetings_error: meetingsError?.message ?? null,
  });
}
