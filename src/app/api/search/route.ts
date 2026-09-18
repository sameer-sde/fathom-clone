import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();

  if (!q) {
    return NextResponse.json({ meetings: [], transcriptMatches: [] });
  }

  const [{ data: meetings }, { data: transcriptMatches }] = await Promise.all([
    supabase
      .from("meetings")
      .select("id, title, started_at, meeting_type")
      .ilike("title", `%${q}%`)
      .order("started_at", { ascending: false }),
    supabase
      .from("transcript_lines")
      .select("id, meeting_id, text, start_seconds, meetings(title)")
      .ilike("text", `%${q}%`)
      .limit(20),
  ]);

  return NextResponse.json({
    meetings: meetings ?? [],
    transcriptMatches: transcriptMatches ?? [],
  });
}
