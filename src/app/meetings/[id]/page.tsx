import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppHeader from "@/components/app-header";
import MeetingDetailClient from "./meeting-detail-client";

export const dynamic = "force-dynamic";

export default async function MeetingDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const { id } = await params;
  const { t } = await searchParams;
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    redirect("/login");
  }

  const { data: meeting, error: meetingError } = await supabase
    .from("meetings")
    .select("*")
    .eq("id", id)
    .eq("user_id", userData.user.id)
    .single();

  if (meetingError || !meeting) {
    notFound();
  }

  const [{ data: participants }, { data: transcript }, { data: summaries }, { data: actionItems }, { data: highlights }] =
    await Promise.all([
      supabase.from("meeting_participants").select("*").eq("meeting_id", id),
      supabase.from("transcript_lines").select("*").eq("meeting_id", id).order("sequence"),
      supabase.from("summaries").select("*").eq("meeting_id", id),
      supabase.from("action_items").select("*").eq("meeting_id", id).order("sequence"),
      supabase.from("highlights").select("*").eq("meeting_id", id).order("timestamp_seconds"),
    ]);

  const startAt = Number(t);

  return (
    <div className="min-h-screen">
      <AppHeader email={userData.user.email} />
      <MeetingDetailClient
        meeting={meeting}
        participants={(participants ?? []).sort((a, b) => Number(b.is_host) - Number(a.is_host))}
        transcript={(transcript ?? []).map((l) => ({ ...l, start_seconds: Number(l.start_seconds) }))}
        summaries={summaries ?? []}
        actionItems={(actionItems ?? []).map((a) => ({
          ...a,
          timestamp_seconds: a.timestamp_seconds == null ? null : Number(a.timestamp_seconds),
        }))}
        highlights={(highlights ?? []).map((h) => ({ ...h, timestamp_seconds: Number(h.timestamp_seconds) }))}
        initialTime={Number.isFinite(startAt) && startAt > 0 ? startAt : 0}
      />
    </div>
  );
}
