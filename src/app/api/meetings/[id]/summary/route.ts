import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 60;

const TEMPLATES: Record<string, string> = {
  general:
    'Sections, in order: "Key Topics Discussed", "Decisions Made", "Next Steps". Skip a section only if nothing in the transcript supports it.',
  sales_call:
    'Sections, in order: "Prospect Needs", "Pain Points / Cost of Inaction", "Decision Process", "Next Steps". Keep any numbers the prospect said (money, seats, dates) exactly as spoken.',
};

type Generated = {
  sections: { heading: string; bullets: { text: string; timestamp_seconds: number }[] }[];
  action_items: { text: string; owner: string | null; timestamp_seconds: number }[];
};

function fmt(s: number) {
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

const MODELS = [
  process.env.GROQ_MODEL,
  "openai/gpt-oss-120b",
  "llama-3.3-70b-versatile",
  "openai/gpt-oss-20b",
  "llama-3.1-8b-instant",
].filter((m): m is string => Boolean(m));

async function callGroq(prompt: string) {
  let lastError = "";
  for (const model of MODELS) {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 4000,
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (res.ok) {
      const data = await res.json();
      return (data.choices?.[0]?.message?.content ?? "") as string;
    }
    lastError = `Groq ${res.status} (${model}): ${await res.text()}`;
    if (res.status !== 404 && res.status !== 400) break;
  }
  throw new Error(lastError);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ error: "AI summaries aren't set up on this deployment yet." }, { status: 503 });
  }

  const { template = "general" } = (await request.json().catch(() => ({}))) as { template?: string };
  if (!TEMPLATES[template]) {
    return NextResponse.json({ error: `Unknown template "${template}"` }, { status: 400 });
  }

  const { data: meeting } = await supabase
    .from("meetings")
    .select("id, title")
    .eq("id", id)
    .eq("user_id", userData.user.id)
    .maybeSingle();
  if (!meeting) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [{ data: participants }, { data: lines }] = await Promise.all([
    supabase.from("meeting_participants").select("id, name").eq("meeting_id", id),
    supabase.from("transcript_lines").select("participant_id, start_seconds, text").eq("meeting_id", id).order("sequence"),
  ]);
  if (!lines?.length) {
    return NextResponse.json({ error: "This meeting has no transcript to summarize." }, { status: 400 });
  }

  const nameById = new Map((participants ?? []).map((p) => [p.id, p.name]));
  const transcript = lines
    .map((l) => `[${Math.floor(Number(l.start_seconds))}s | ${fmt(Number(l.start_seconds))}] ${nameById.get(l.participant_id ?? "") ?? "Unknown"}: ${l.text}`)
    .join("\n");

  const prompt = `You are summarizing a recorded meeting titled "${meeting.title}".
Participants: ${(participants ?? []).map((p) => p.name).join(", ")}.

Transcript (each line starts with its start time in seconds):
${transcript}

Return ONLY a JSON object, no prose, matching:
{
  "sections": [{ "heading": string, "bullets": [{ "text": string, "timestamp_seconds": number }] }],
  "action_items": [{ "text": string, "owner": string | null, "timestamp_seconds": number }]
}

Rules:
- ${TEMPLATES[template]}
- Every bullet and action item must cite the start time (in seconds) of the transcript line it comes from. Never invent a time.
- Action items are concrete commitments someone made or was assigned. "owner" must be exactly one participant name from the list, or null if unclear. Don't prefix the text with the owner's name.
- Be specific: keep numbers, names and dates. One sentence per bullet.`;

  let generated: Generated;
  try {
    const text = await callGroq(prompt);
    const json = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
    generated = JSON.parse(json);
    if (!Array.isArray(generated.sections) || !Array.isArray(generated.action_items)) throw new Error("bad shape");
  } catch (e) {
    console.error("summary generation failed", e);
    return NextResponse.json({ error: "Couldn't generate a summary right now. Please try again in a moment." }, { status: 502 });
  }

  const { data: summary, error: sErr } = await supabase
    .from("summaries")
    .upsert(
      { meeting_id: id, template, content: { sections: generated.sections }, generated_at: new Date().toISOString() },
      { onConflict: "meeting_id,template" }
    )
    .select("*")
    .single();
  if (sErr) {
    return NextResponse.json({ error: sErr.message }, { status: 500 });
  }

  const idByName = new Map((participants ?? []).map((p) => [p.name.toLowerCase(), p.id]));
  const { data: done } = await supabase.from("action_items").select("text, sequence").eq("meeting_id", id).eq("is_done", true);
  const doneTexts = new Set((done ?? []).map((d) => d.text.toLowerCase().trim()));
  const startSeq = Math.max(-1, ...(done ?? []).map((d) => d.sequence)) + 1;

  await supabase.from("action_items").delete().eq("meeting_id", id).eq("is_done", false);
  const fresh = generated.action_items
    .filter((a) => !doneTexts.has(a.text.toLowerCase().trim()))
    .map((a, i) => ({
      meeting_id: id,
      text: a.text,
      timestamp_seconds: a.timestamp_seconds,
      sequence: startSeq + i,
      owner_participant_id: a.owner ? idByName.get(a.owner.toLowerCase()) ?? null : null,
    }));
  if (fresh.length) {
    const { error: aErr } = await supabase.from("action_items").insert(fresh);
    if (aErr) return NextResponse.json({ error: aErr.message }, { status: 500 });
  }

  const { data: actionItems } = await supabase.from("action_items").select("*").eq("meeting_id", id).order("sequence");
  return NextResponse.json({ summary, actionItems: actionItems ?? [] });
}
