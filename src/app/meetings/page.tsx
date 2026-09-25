import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppHeader from "@/components/app-header";
import { Avatar, Eyebrow } from "@/components/ui";
import { formatDuration, labelForType, resolveOwnerId, type Participant } from "@/lib/meeting";
import OwedList, { type OwedItem } from "./owed-list";

export const dynamic = "force-dynamic";

function dayLabel(date: Date) {
  const today = new Date();
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diff = Math.round((startOf(today) - startOf(date)) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return date.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
}

export default async function MeetingsPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    redirect("/login");
  }

  const { data: meetings, error } = await supabase
    .from("meetings")
    .select("id, title, meeting_type, started_at, duration_seconds, participant_count, status")
    .eq("user_id", userData.user.id)
    .order("started_at", { ascending: false });

  const meetingIds = (meetings ?? []).map((m) => m.id);

  const [{ data: participants }, { data: items }] = meetingIds.length
    ? await Promise.all([
        supabase.from("meeting_participants").select("id, meeting_id, name, speaker_color, is_host").in("meeting_id", meetingIds),
        supabase.from("action_items").select("*").in("meeting_id", meetingIds).order("sequence"),
      ])
    : [{ data: [] }, { data: [] }];

  const peopleByMeeting = new Map<string, (Participant & { meeting_id: string })[]>();
  for (const p of participants ?? []) {
    const list = peopleByMeeting.get(p.meeting_id) ?? [];
    list.push(p);
    peopleByMeeting.set(p.meeting_id, list);
  }
  const meetingById = new Map((meetings ?? []).map((m) => [m.id, m]));

  const owed: OwedItem[] = (items ?? []).map((it) => {
    const people = peopleByMeeting.get(it.meeting_id) ?? [];
    const ownerId = resolveOwnerId(it, people, []);
    const owner = people.find((p) => p.id === ownerId) ?? null;
    return {
      id: it.id,
      text: it.text,
      is_done: it.is_done,
      timestamp_seconds: it.timestamp_seconds,
      meeting_id: it.meeting_id,
      meeting_title: meetingById.get(it.meeting_id)?.title ?? "Meeting",
      owner_name: owner?.name ?? null,
      owner_color: owner?.speaker_color ?? null,
    };
  });

  const openByMeeting = new Map<string, { open: number; total: number }>();
  for (const it of items ?? []) {
    const c = openByMeeting.get(it.meeting_id) ?? { open: 0, total: 0 };
    c.total++;
    if (!it.is_done) c.open++;
    openByMeeting.set(it.meeting_id, c);
  }

  const groups: { label: string; rows: NonNullable<typeof meetings> }[] = [];
  for (const m of meetings ?? []) {
    const label = dayLabel(new Date(m.started_at));
    const g = groups.at(-1);
    if (g && g.label === label) g.rows.push(m);
    else groups.push({ label, rows: [m] });
  }

  return (
    <div className="min-h-screen">
      <AppHeader email={userData.user.email} />

      <main className="mx-auto grid max-w-7xl gap-10 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] lg:gap-14 lg:py-12">
        <section aria-labelledby="owed-heading" className="lg:sticky lg:top-24 lg:self-start">
          <OwedList items={owed} />
        </section>

        <section aria-labelledby="meetings-heading">
          <div className="flex items-end justify-between border-b border-ink pb-3">
            <div>
              <Eyebrow>Library</Eyebrow>
              <h2 id="meetings-heading" className="mt-1 font-serif text-3xl tracking-tight">
                Meetings
              </h2>
            </div>
            <span className="font-mono text-xs text-muted">{meetings?.length ?? 0} recorded</span>
          </div>

          {error && (
            <p className="mt-6 rounded-lg border border-owed/30 bg-owed-soft px-4 py-3 text-sm text-owed">
              Couldn&apos;t load meetings: {error.message}
            </p>
          )}

          {!error && meetings && meetings.length === 0 && (
            <div className="mt-6 rounded-xl border border-dashed border-rule-strong px-6 py-16 text-center">
              <p className="font-serif text-xl">Nothing recorded yet.</p>
              <p className="mt-1 text-sm text-ink-2">Meetings you record will show up here, with their commitments pulled out.</p>
            </div>
          )}

          {groups.map((g) => (
            <div key={g.label} className="mt-8">
              <Eyebrow>{g.label}</Eyebrow>
              <ul className="mt-2 divide-y divide-rule border-y border-rule">
                {g.rows.map((m) => {
                  const people = peopleByMeeting.get(m.id) ?? [];
                  const counts = openByMeeting.get(m.id);
                  return (
                    <li key={m.id}>
                      <Link
                        href={`/meetings/${m.id}`}
                        className="group grid grid-cols-[1fr_auto] items-center gap-x-6 gap-y-2 px-1 py-4 transition hover:bg-sunk sm:grid-cols-[4.5rem_1fr_auto] sm:px-3"
                      >
                        <span className="hidden font-mono text-xs text-muted sm:block">
                          {new Date(m.started_at).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-serif text-[19px] leading-snug text-ink group-hover:underline group-hover:decoration-rule-strong group-hover:underline-offset-4">
                            {m.title}
                          </span>
                          <span className="mt-1 flex items-center gap-2 text-[13px] text-ink-2">
                            <span>{labelForType(m.meeting_type)}</span>
                            <span className="text-rule-strong">·</span>
                            <span>{formatDuration(m.duration_seconds)}</span>
                            <span className="text-rule-strong">·</span>
                            <span className="flex -space-x-1.5">
                              {people.slice(0, 5).map((p) => (
                                <Avatar key={p.id} name={p.name} color={p.speaker_color} size={20} />
                              ))}
                            </span>
                            {people.length > 5 && <span className="text-muted">+{people.length - 5}</span>}
                          </span>
                        </span>
                        <span className="text-right">
                          {counts && counts.total > 0 ? (
                            counts.open > 0 ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-owed-soft px-2.5 py-1 font-mono text-[11px] text-owed">
                                <span className="h-1.5 w-1.5 rounded-full bg-owed" />
                                {counts.open} owed
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-done-soft px-2.5 py-1 font-mono text-[11px] text-done">
                                ✓ all done
                              </span>
                            )
                          ) : (
                            <span className="font-mono text-[11px] text-muted">no commitments</span>
                          )}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
