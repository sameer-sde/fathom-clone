import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LocalTime from "@/components/local-time";
import { Avatar, Eyebrow, TimeChip, Wordmark } from "@/components/ui";
import { formatDuration, formatTime, labelForType } from "@/lib/meeting";

export const dynamic = "force-dynamic";

type Section = { heading: string; bullets: { text: string; timestamp_seconds: number }[] };

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

  return (
    <div className="min-h-screen">
      <header className="border-b border-rule">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4 sm:px-6">
          <Wordmark href="/login" />
          <span className="rounded-full border border-rule-strong px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
            Read-only
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <Eyebrow>
          {labelForType(meeting.meeting_type)} ·{" "}
          <LocalTime iso={meeting.started_at} kind="long" /> ·{" "}
          {formatDuration(meeting.duration_seconds)}
        </Eyebrow>
        <h1 className="mt-2 font-serif text-[36px] leading-[1.1] tracking-tight sm:text-[44px]">{meeting.title}</h1>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="flex -space-x-1.5">
            {(participants ?? []).map((p) => (
              <Avatar key={p.id} name={p.name} color={p.speaker_color} size={26} />
            ))}
          </div>
          <span className="text-[13px] text-ink-2">{(participants ?? []).map((p) => p.name).join(", ")}</span>
        </div>

        {summary && (
          <section className="mt-12">
            <h2 className="border-b border-ink pb-3 font-serif text-[26px] tracking-tight">Summary</h2>
            {(summary.content.sections as Section[]).map((section, i) => (
              <div key={i} className="grid gap-2 border-b border-rule py-5 last:border-b-0 sm:grid-cols-[150px_minmax(0,1fr)]">
                <h3 className="text-[13px] font-semibold text-ink-2">{section.heading}</h3>
                <ul className="space-y-3">
                  {section.bullets.map((b, j) => (
                    <li key={j} className="flex items-start gap-3">
                      <TimeChip seconds={b.timestamp_seconds} />
                      <p className="text-[15px] leading-relaxed text-ink-2">{b.text}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        )}

        <section className="mt-12">
          <h2 className="border-b border-ink pb-3 font-serif text-[26px] tracking-tight">Transcript</h2>
          <div className="mt-3">
            {(transcript ?? []).map((line, i, all) => {
              const speaker = line.participant_id ? participantMap.get(line.participant_id) : null;
              const prevSame = i > 0 && all[i - 1].participant_id === line.participant_id;
              return (
                <div key={line.id} className={prevSame ? "pt-1" : "pt-4"}>
                  {!prevSame && (
                    <p className="mb-1 flex items-center gap-2">
                      <Avatar name={speaker?.name ?? "?"} color={speaker?.speaker_color} size={18} />
                      <span className="text-[12px] font-semibold">{speaker?.name ?? "Unknown"}</span>
                      <span className="font-mono text-[11px] text-muted">{formatTime(Number(line.start_seconds))}</span>
                    </p>
                  )}
                  <p className="pl-[26px] text-[15px] leading-relaxed text-ink-2">{line.text}</p>
                </div>
              );
            })}
          </div>
        </section>

        <p className="mt-16 border-t border-rule pt-6 text-center text-[12px] text-muted">
          Shared from Followthrough. This page works without signing in.
        </p>
      </main>
    </div>
  );
}
