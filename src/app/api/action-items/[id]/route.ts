import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Patch = { is_done?: boolean; owner_participant_id?: string | null };

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Patch;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { data: item } = await supabase
    .from("action_items")
    .select("id, meeting_id, meetings!inner(user_id)")
    .eq("id", id)
    .eq("meetings.user_id", userData.user.id)
    .maybeSingle();

  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const update: Record<string, unknown> = {};

  if (typeof body.is_done === "boolean") {
    update.is_done = body.is_done;
    update.completed_at = body.is_done ? new Date().toISOString() : null;
  }

  if ("owner_participant_id" in body) {
    const ownerId = body.owner_participant_id;
    if (ownerId !== null) {
      const { data: participant } = await supabase
        .from("meeting_participants")
        .select("id")
        .eq("id", ownerId)
        .eq("meeting_id", item.meeting_id)
        .maybeSingle();
      if (!participant) {
        return NextResponse.json({ error: "Owner is not a participant of this meeting" }, { status: 400 });
      }
    }
    update.owner_participant_id = ownerId;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("action_items")
    .update(update)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ item: data });
}
