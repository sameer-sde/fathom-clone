"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type Meeting = {
  id: string;
  title: string;
  meeting_type: string;
  duration_seconds: number;
  started_at: string;
};
type Participant = { id: string; name: string; speaker_color: string | null };
type TranscriptLine = {
  id: string;
  participant_id: string | null;
  start_seconds: number;
  text: string;
};
type Summary = { id: string; template: string; content: { sections: { heading: string; bullets: { text: string; timestamp_seconds: number }[] }[] } };
type ActionItem = { id: string; text: string; is_done: boolean; timestamp_seconds: number | null };
type Highlight = { id: string; label: string; timestamp_seconds: number };

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function MeetingDetailClient({
  meeting,
  participants,
  transcript,
  summaries,
  actionItems,
  highlights,
}: {
  meeting: Meeting;
  participants: Participant[];
  transcript: TranscriptLine[];
  summaries: Summary[];
  actionItems: ActionItem[];
  highlights: Highlight[];
}) {
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeTab, setActiveTab] = useState<"transcript" | "summary">("summary");
  const [activeTemplate, setActiveTemplate] = useState(summaries[0]?.template ?? "general");
  const [doneItems, setDoneItems] = useState<Set<string>>(new Set());
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);

  const participantMap = new Map(participants.map((p) => [p.id, p]));
  const activeSummary = summaries.find((s) => s.template === activeTemplate);

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setCurrentTime((t) => {
          if (t >= meeting.duration_seconds) {
            setIsPlaying(false);
            return t;
          }
          return t + 1;
        });
      }, 200); // sped up 5x so scrubbing through a long call is demoable
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, meeting.duration_seconds]);

  useEffect(() => {
    if (activeTab !== "transcript") return;
    const activeLine = document.querySelector(`[data-line-active="true"]`);
    activeLine?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [currentTime, activeTab]);

  function seekTo(seconds: number) {
    setCurrentTime(seconds);
    setActiveTab("transcript");
  }

  function toggleActionItem(id: string) {
    setDoneItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleShare() {
    setSharing(true);
    try {
      const res = await fetch(`/api/meetings/${meeting.id}/share`, { method: "POST" });
      const data = await res.json();
      if (data.url) setShareUrl(data.url);
    } finally {
      setSharing(false);
    }
  }

  const currentLineIndex = (() => {
    let idx = -1;
    for (let i = 0; i < transcript.length; i++) {
      if (transcript[i].start_seconds <= currentTime) idx = i;
      else break;
    }
    return idx;
  })();

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <header className="border-b border-neutral-800 px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link href="/meetings" className="text-sm text-neutral-400 hover:text-white">
            ← Meetings
          </Link>
          <button
            onClick={handleShare}
            disabled={sharing}
            className="rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-neutral-950 hover:bg-neutral-200 disabled:opacity-50"
          >
            {sharing ? "Creating link…" : "Share clip"}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <h1 className="text-2xl font-semibold">{meeting.title}</h1>
        <p className="mt-1 text-sm text-neutral-500">
          {new Date(meeting.started_at).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })} ·{" "}
          {participants.length} participants ·{" "}
          <span className="capitalize">{meeting.meeting_type.replace(/_/g, " ")}</span>
        </p>

        {shareUrl && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm">
            <span className="text-neutral-400">Shareable link:</span>
            <a href={shareUrl} target="_blank" className="text-blue-400 underline">
              {shareUrl}
            </a>
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">
          {/* Left: playback + transcript/summary tabs */}
          <div>
            {/* Simulated playback bar — stubbed capture layer, no real video file */}
            <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsPlaying((p) => !p)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-neutral-950"
                >
                  {isPlaying ? "❚❚" : "▶"}
                </button>
                <div className="flex-1">
                  <div
                    className="relative h-1.5 cursor-pointer rounded-full bg-neutral-800"
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const pct = (e.clientX - rect.left) / rect.width;
                      seekTo(Math.floor(pct * meeting.duration_seconds));
                    }}
                  >
                    <div
                      className="absolute h-full rounded-full bg-white"
                      style={{ width: `${(currentTime / meeting.duration_seconds) * 100}%` }}
                    />
                    {highlights.map((h) => (
                      <div
                        key={h.id}
                        title={h.label}
                        className="absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-yellow-400"
                        style={{ left: `${(h.timestamp_seconds / meeting.duration_seconds) * 100}%` }}
                      />
                    ))}
                  </div>
                </div>
                <span className="w-24 text-right text-xs text-neutral-500">
                  {formatTime(currentTime)} / {formatTime(meeting.duration_seconds)}
                </span>
              </div>
              <p className="mt-2 text-xs text-neutral-600">
                Simulated playback (no recorded video — capture layer stubbed per assignment scope). Click the bar or a transcript line to seek.
              </p>
            </div>

            {/* Tabs */}
            <div className="mt-6 flex gap-1 border-b border-neutral-800">
              <button
                onClick={() => setActiveTab("summary")}
                className={`px-4 py-2 text-sm font-medium ${activeTab === "summary" ? "border-b-2 border-white text-white" : "text-neutral-500"}`}
              >
                Summary
              </button>
              <button
                onClick={() => setActiveTab("transcript")}
                className={`px-4 py-2 text-sm font-medium ${activeTab === "transcript" ? "border-b-2 border-white text-white" : "text-neutral-500"}`}
              >
                Transcript
              </button>
            </div>

            {activeTab === "summary" && (
              <div className="mt-4">
                {summaries.length > 1 && (
                  <div className="mb-4 flex gap-2">
                    {summaries.map((s) => (
                      <button
                        key={s.template}
                        onClick={() => setActiveTemplate(s.template)}
                        className={`rounded-full px-3 py-1 text-xs capitalize ${
                          activeTemplate === s.template ? "bg-white text-neutral-950" : "bg-neutral-800 text-neutral-300"
                        }`}
                      >
                        {s.template.replace("_", " ")}
                      </button>
                    ))}
                  </div>
                )}
                {activeSummary ? (
                  <div className="space-y-6">
                    {activeSummary.content.sections.map((section, i) => (
                      <div key={i}>
                        <h3 className="mb-2 text-sm font-semibold text-neutral-300">{section.heading}</h3>
                        <ul className="space-y-2">
                          {section.bullets.map((bullet, j) => (
                            <li key={j} className="flex gap-2 text-sm text-neutral-200">
                              <button
                                onClick={() => seekTo(bullet.timestamp_seconds)}
                                className="mt-0.5 shrink-0 text-xs text-neutral-500 hover:text-white"
                              >
                                {formatTime(bullet.timestamp_seconds)}
                              </button>
                              <span>{bullet.text}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-neutral-500">No summary available.</p>
                )}
              </div>
            )}

            {activeTab === "transcript" && (
              <div ref={transcriptRef} className="mt-4 max-h-[500px] space-y-3 overflow-y-auto pr-2">
                {transcript.map((line, i) => {
                  const speaker = line.participant_id ? participantMap.get(line.participant_id) : null;
                  const isActive = i === currentLineIndex;
                  return (
                    <div
                      key={line.id}
                      data-line-active={isActive}
                      onClick={() => seekTo(line.start_seconds)}
                      className={`flex cursor-pointer gap-3 rounded-lg px-3 py-2 transition ${
                        isActive ? "bg-neutral-800" : "hover:bg-neutral-900"
                      }`}
                    >
                      <span className="w-12 shrink-0 text-xs text-neutral-600">{formatTime(line.start_seconds)}</span>
                      <div>
                        <span
                          className="text-xs font-semibold"
                          style={{ color: speaker?.speaker_color ?? "#a3a3a3" }}
                        >
                          {speaker?.name ?? "Unknown"}
                        </span>
                        <p className="text-sm text-neutral-200">{line.text}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right: action items + participants */}
          <div className="space-y-6">
            <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
              <h3 className="mb-3 text-sm font-semibold text-neutral-300">
                Action items {actionItems.length > 0 && `(${actionItems.length})`}
              </h3>
              {actionItems.length === 0 ? (
                <p className="text-sm text-neutral-600">No action items detected.</p>
              ) : (
                <ul className="space-y-2">
                  {actionItems.map((item) => (
                    <li key={item.id} className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        checked={doneItems.has(item.id)}
                        onChange={() => toggleActionItem(item.id)}
                        className="mt-1"
                      />
                      <span
                        className={`text-sm ${doneItems.has(item.id) ? "text-neutral-600 line-through" : "text-neutral-200"}`}
                      >
                        {item.text}
                        {item.timestamp_seconds != null && (
                          <button
                            onClick={() => seekTo(item.timestamp_seconds!)}
                            className="ml-2 text-xs text-neutral-500 hover:text-white"
                          >
                            {formatTime(item.timestamp_seconds)}
                          </button>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
              <h3 className="mb-3 text-sm font-semibold text-neutral-300">
                Participants ({participants.length})
              </h3>
              <ul className="space-y-2">
                {participants.map((p) => (
                  <li key={p.id} className="flex items-center gap-2 text-sm text-neutral-200">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.speaker_color ?? "#666" }} />
                    {p.name}
                  </li>
                ))}
              </ul>
            </div>

            {highlights.length > 0 && (
              <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
                <h3 className="mb-3 text-sm font-semibold text-neutral-300">Highlights</h3>
                <ul className="space-y-2">
                  {highlights.map((h) => (
                    <li key={h.id}>
                      <button
                        onClick={() => seekTo(h.timestamp_seconds)}
                        className="text-left text-sm text-neutral-200 hover:text-white"
                      >
                        <span className="mr-2 text-xs text-yellow-400">{formatTime(h.timestamp_seconds)}</span>
                        {h.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
