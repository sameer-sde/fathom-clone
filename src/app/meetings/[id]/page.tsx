import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MeetingDetailClient from "./meeting-detail-client";

export const dynamic = "force-dynamic";

export default async function MeetingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    redirect("/login");
  }

  const { data: meeting, error: meetingError } = await supabase
    .from("meetings")
    .select("*")
    .eq("id", id)
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

  return (
    <MeetingDetailClient
      meeting={meeting}
      participants={participants ?? []}
      transcript={transcript ?? []}
      summaries={summaries ?? []}
      actionItems={actionItems ?? []}
      highlights={highlights ?? []}
    />
  );
}
