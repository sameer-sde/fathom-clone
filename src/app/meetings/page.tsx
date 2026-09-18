import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function formatDuration(seconds: number | null) {
  if (!seconds) return "—";
  const mins = Math.floor(seconds / 60);
  const hrs = Math.floor(mins / 60);
  if (hrs > 0) return `${hrs}h ${mins % 60}m`;
  return `${mins}m`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
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
    .order("started_at", { ascending: false });

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <header className="border-b border-neutral-800 px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <h1 className="text-lg font-semibold">Meetings</h1>
          <form action="/auth/signout" method="post">
            <button className="text-sm text-neutral-400 hover:text-white">
              Sign out
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        {error && (
          <p className="rounded-lg bg-red-950 px-4 py-3 text-sm text-red-400">
            Couldn't load meetings: {error.message}
          </p>
        )}

        {!error && meetings && meetings.length === 0 && (
          <div className="rounded-xl border border-dashed border-neutral-800 px-6 py-16 text-center">
            <p className="text-neutral-400">No meetings yet.</p>
            <p className="mt-1 text-sm text-neutral-600">
              Meetings you record will show up here.
            </p>
          </div>
        )}

        {!error && meetings && meetings.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-neutral-800">
            {meetings.map((m) => (
              <Link
                key={m.id}
                href={`/meetings/${m.id}`}
                className="flex items-center justify-between border-b border-neutral-800 px-5 py-4 transition last:border-b-0 hover:bg-neutral-900"
              >
                <div>
                  <p className="font-medium">{m.title}</p>
                  <p className="mt-0.5 text-sm text-neutral-500">
                    {formatDate(m.started_at)} · {m.participant_count} participant
                    {m.participant_count !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-neutral-800 px-2.5 py-1 text-xs capitalize text-neutral-300">
                    {m.meeting_type.replace("_", " ")}
                  </span>
                  <span className="text-sm text-neutral-500">
                    {formatDuration(m.duration_seconds)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
