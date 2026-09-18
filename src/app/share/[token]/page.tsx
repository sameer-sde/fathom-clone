import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function SharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();

  const { data: clip, error: clipError } = await supabase
    .from("shared_clips")
    .select("*, meetings(*)")
    .eq("share_token", token)
    .single();

  if (clipError || !clip || !clip.meetings) {
    notFound();
  }

  const meeting = Array.isArray(clip.meetings) ? clip.meetings[0] : clip.meetings;

  const [{ data: participants }, { data: transcript }, { data: summaries }] = await Promise.all([
    supabase.from("meeting_participants").select("*").eq("meeting_id", meeting.id),
    supabase.from("transcript_lines").select("*").eq("meeting_id", meeting.id).order("sequence"),
    supabase.from("summaries").select("*").eq("meeting_id", meeting.id),
  ]);

  const participantMap = new Map((participants ?? []).map((p) => [p.id, p]));
  const summary = summaries?.[0];

  function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <header className="border-b border-neutral-800 px-6 py-4">
        <div className="mx-auto max-w-4xl">
          <p className="text-xs uppercase tracking-wide text-neutral-500">Shared meeting clip</p>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        <h1 className="text-2xl font-semibold">{meeting.title}</h1>
        <p className="mt-1 text-sm text-neutral-500">
          {new Date(meeting.started_at).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })} ·{" "}
          {(participants ?? []).length} participants
        </p>

        {summary && (
          <div className="mt-8">
            <h2 className="mb-4 text-sm font-semibold text-neutral-300">Summary</h2>
            <div className="space-y-6">
              {summary.content.sections.map((section: { heading: string; bullets: { text: string; timestamp_seconds: number }[] }, i: number) => (
                <div key={i}>
                  <h3 className="mb-2 text-sm font-semibold text-neutral-300">{section.heading}</h3>
                  <ul className="space-y-2">
                    {section.bullets.map((bullet, j: number) => (
                      <li key={j} className="flex gap-2 text-sm text-neutral-200">
                        <span className="mt-0.5 shrink-0 text-xs text-neutral-500">{formatTime(bullet.timestamp_seconds)}</span>
                        <span>{bullet.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-10">
          <h2 className="mb-4 text-sm font-semibold text-neutral-300">Transcript</h2>
          <div className="space-y-3">
            {(transcript ?? []).map((line) => {
              const speaker = line.participant_id ? participantMap.get(line.participant_id) : null;
              return (
                <div key={line.id} className="flex gap-3 rounded-lg px-3 py-2">
                  <span className="w-12 shrink-0 text-xs text-neutral-600">{formatTime(line.start_seconds)}</span>
                  <div>
                    <span className="text-xs font-semibold" style={{ color: speaker?.speaker_color ?? "#a3a3a3" }}>
                      {speaker?.name ?? "Unknown"}
                    </span>
                    <p className="text-sm text-neutral-200">{line.text}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <p className="mt-12 border-t border-neutral-800 pt-6 text-center text-xs text-neutral-600">
          Shared via a Fathom clone — this link works without signing in.
        </p>
      </main>
    </div>
  );
}
