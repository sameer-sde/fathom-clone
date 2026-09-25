"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Check, { patchActionItem } from "@/components/checkbox";
import { Avatar, Eyebrow, TimeChip } from "@/components/ui";
import {
  coOwnersFromText,
  formatDuration,
  formatTime,
  labelForType,
  resolveOwnerId,
  stripOwnerPrefix,
  type ActionItem,
  type Highlight,
  type Meeting,
  type Participant,
  type Summary,
  type TranscriptLine,
} from "@/lib/meeting";

const SPEEDS = [1, 2, 5] as const;
const TEMPLATES: { id: string; label: string }[] = [
  { id: "general", label: "General" },
  { id: "sales_call", label: "Sales call" },
];

export default function MeetingDetailClient({
  meeting,
  participants,
  transcript,
  summaries: initialSummaries,
  actionItems: initialItems,
  highlights,
  initialTime,
}: {
  meeting: Meeting;
  participants: Participant[];
  transcript: TranscriptLine[];
  summaries: Summary[];
  actionItems: ActionItem[];
  highlights: Highlight[];
  initialTime: number;
}) {
  const duration = Math.max(1, meeting.duration_seconds);
  const [currentTime, setCurrentTime] = useState(Math.min(initialTime, duration));
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
  const [follow, setFollow] = useState(true);
  const [focusedTs, setFocusedTs] = useState<number | null>(initialTime || null);

  const participantMap = useMemo(() => new Map(participants.map((p) => [p.id, p])), [participants]);

  useEffect(() => {
    if (!isPlaying) return;
    const tick = setInterval(() => {
      setCurrentTime((t) => {
        if (t + 1 >= duration) {
          setIsPlaying(false);
          return duration;
        }
        return t + 1;
      });
    }, 1000 / speed);
    return () => clearInterval(tick);
  }, [isPlaying, speed, duration]);

  const currentLineIndex = useMemo(() => {
    let idx = -1;
    for (let i = 0; i < transcript.length; i++) {
      if (transcript[i].start_seconds <= currentTime) idx = i;
      else break;
    }
    return idx;
  }, [currentTime, transcript]);

  const transcriptBox = useRef<HTMLDivElement>(null);
  const scrollToLine = useCallback((index: number, smooth = true) => {
    const box = transcriptBox.current;
    const el = box?.querySelector<HTMLElement>(`[data-line="${index}"]`);
    if (!box || !el) return;
    box.scrollTo({ top: el.offsetTop - box.clientHeight / 3, behavior: smooth ? "smooth" : "auto" });
  }, []);

  useEffect(() => {
    if (follow && currentLineIndex >= 0) scrollToLine(currentLineIndex);
  }, [currentLineIndex, follow, scrollToLine]);

  useEffect(() => {
    if (initialTime > 0 && currentLineIndex >= 0) scrollToLine(currentLineIndex, false);
  }, []);

  function seekTo(seconds: number) {
    setCurrentTime(Math.min(Math.max(0, seconds), duration));
    setFocusedTs(seconds);
    setFollow(true);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.code === "Space") {
        e.preventDefault();
        setIsPlaying((p) => !p);
      } else if (e.key === "ArrowRight") setCurrentTime((t) => Math.min(duration, t + 10));
      else if (e.key === "ArrowLeft") setCurrentTime((t) => Math.max(0, t - 10));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [duration]);

  const [items, setItems] = useState(() =>
    initialItems.map((it) => ({ ...it, owner_participant_id: resolveOwnerId(it, participants, transcript) }))
  );
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [itemError, setItemError] = useState<string | null>(null);

  async function saveItem(id: string, patch: { is_done?: boolean; owner_participant_id?: string | null }) {
    const before = items.find((i) => i.id === id);
    if (!before) return;
    setItemError(null);
    setSavingIds((s) => new Set(s).add(id));
    setItems((all) => all.map((i) => (i.id === id ? { ...i, ...patch } : i)));
    try {
      await patchActionItem(id, patch);
    } catch (e) {
      setItems((all) => all.map((i) => (i.id === id ? before : i)));
      setItemError(e instanceof Error ? e.message : "Couldn't save that change");
    } finally {
      setSavingIds((s) => {
        const n = new Set(s);
        n.delete(id);
        return n;
      });
    }
  }

  const ledger = useMemo(() => {
    const groups = new Map<string, { owner: Participant | null; items: typeof items }>();
    for (const it of items) {
      const key = it.owner_participant_id ?? "none";
      const g = groups.get(key) ?? { owner: it.owner_participant_id ? participantMap.get(it.owner_participant_id) ?? null : null, items: [] };
      g.items.push(it);
      groups.set(key, g);
    }
    return [...groups.values()].sort((a, b) => {
      if (!a.owner) return 1;
      if (!b.owner) return -1;
      return b.items.filter((i) => !i.is_done).length - a.items.filter((i) => !i.is_done).length;
    });
  }, [items, participantMap]);

  const doneCount = items.filter((i) => i.is_done).length;
  const commitmentTimes = useMemo(
    () => new Set(items.filter((i) => i.timestamp_seconds != null).map((i) => Math.floor(i.timestamp_seconds!))),
    [items]
  );

  const [summaries, setSummaries] = useState(initialSummaries);
  const [activeTemplate, setActiveTemplate] = useState(initialSummaries[0]?.template ?? "general");
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const activeSummary = summaries.find((s) => s.template === activeTemplate);

  async function generate(template: string) {
    setGenerating(true);
    setGenError(null);
    setActiveTemplate(template);
    try {
      const res = await fetch(`/api/meetings/${meeting.id}/summary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Generation failed");
      setSummaries((all) => [...all.filter((s) => s.template !== template), data.summary]);
      setItems(
        (data.actionItems as ActionItem[]).map((it) => ({
          ...it,
          timestamp_seconds: it.timestamp_seconds == null ? null : Number(it.timestamp_seconds),
          owner_participant_id: resolveOwnerId(it, participants, transcript),
        }))
      );
    } catch (e) {
      setGenError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied] = useState(false);
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

  const segments = useMemo(
    () =>
      transcript.map((line, i) => {
        const next = transcript[i + 1]?.start_seconds ?? duration;
        const spoken = Math.max(3, line.text.split(/\s+/).length / 2.5);
        const end = Math.min(next, line.start_seconds + spoken);
        return { start: line.start_seconds, end, color: participantMap.get(line.participant_id ?? "")?.speaker_color ?? "#8a867d" };
      }),
    [transcript, duration, participantMap]
  );

  const currentLine = currentLineIndex >= 0 ? transcript[currentLineIndex] : null;
  const currentSpeaker = currentLine?.participant_id ? participantMap.get(currentLine.participant_id) : null;
  const pct = (s: number) => `${(Math.min(s, duration) / duration) * 100}%`;
  const when = new Date(meeting.started_at);

  return (
    <>
      <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 sm:pt-8">
        <Link href="/meetings" className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted hover:text-ink">
          ← All meetings
        </Link>
        <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <Eyebrow>
              {labelForType(meeting.meeting_type)} ·{" "}
              {when.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} ·{" "}
              {when.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })} · {formatDuration(meeting.duration_seconds)}
            </Eyebrow>
            <h1 className="mt-2 font-serif text-[34px] leading-[1.1] tracking-tight sm:text-[42px]">{meeting.title}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
              <div className="flex -space-x-1.5">
                {participants.map((p) => (
                  <Avatar key={p.id} name={p.name} color={p.speaker_color} size={26} />
                ))}
              </div>
              <span className="text-[13px] text-ink-2">
                {participants.map((p) => p.name.split(" ")[0]).join(", ")}
              </span>
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-start gap-2 lg:items-end">
            {!shareUrl ? (
              <button
                onClick={handleShare}
                disabled={sharing}
                className="rounded-lg border border-ink bg-ink px-3.5 py-2 text-[13px] font-medium text-paper transition hover:opacity-90 disabled:opacity-50"
              >
                {sharing ? "Creating link…" : "Share read-only link"}
              </button>
            ) : (
              <div className="flex w-full max-w-md items-center gap-1 rounded-lg border border-rule-strong bg-surface p-1 pl-3">
                <span className="truncate font-mono text-[12px] text-ink-2">{shareUrl}</span>
                <button
                  onClick={async () => {
                    await navigator.clipboard.writeText(shareUrl);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }}
                  className="shrink-0 rounded-md bg-ink px-2.5 py-1 text-[12px] font-medium text-paper"
                >
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            )}
            {shareUrl && <span className="text-[12px] text-muted">Anyone with the link can read the summary and transcript.</span>}
          </div>
        </div>
      </div>

      <div className="sticky top-14 z-10 mt-6 border-y border-rule bg-paper/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:gap-4 sm:px-6">
          <button
            onClick={() => setIsPlaying((p) => !p)}
            aria-label={isPlaying ? "Pause" : "Play"}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink text-paper transition hover:opacity-90"
          >
            {isPlaying ? (
              <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
                <rect x="2" y="1" width="3" height="10" fill="currentColor" />
                <rect x="7" y="1" width="3" height="10" fill="currentColor" />
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
                <path d="M3 1 L11 6 L3 11 Z" fill="currentColor" />
              </svg>
            )}
          </button>

          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex h-5 items-center gap-2 text-[13px]">
              {currentLine ? (
                <>
                  <span className="shrink-0 font-medium" style={{ color: currentSpeaker?.speaker_color ?? undefined }}>
                    {currentSpeaker?.name ?? "Unknown"}
                  </span>
                  <span className="truncate text-ink-2">“{currentLine.text}”</span>
                </>
              ) : (
                <span className="text-muted">Press play or pick any moment below</span>
              )}
            </div>

            <div
              role="slider"
              tabIndex={0}
              aria-label="Seek"
              aria-valuemin={0}
              aria-valuemax={duration}
              aria-valuenow={Math.floor(currentTime)}
              aria-valuetext={formatTime(currentTime)}
              className="group relative h-5 cursor-pointer"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                seekTo(Math.floor(((e.clientX - rect.left) / rect.width) * duration));
              }}
            >
              <div className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 overflow-hidden rounded-full bg-sunk">
                {segments.map((s, i) => (
                  <span
                    key={i}
                    className="absolute top-0 h-full opacity-45"
                    style={{ left: pct(s.start), width: `max(2px, ${pct(s.end - s.start)})`, backgroundColor: s.color }}
                  />
                ))}
                <span className="absolute inset-y-0 left-0 bg-ink/15" style={{ width: pct(currentTime) }} />
              </div>
              {highlights.map((h) => (
                <span
                  key={h.id}
                  title={`Highlight: ${h.label}`}
                  className="absolute top-0 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-[#d4a72c]"
                  style={{ left: pct(h.timestamp_seconds) }}
                />
              ))}
              {items
                .filter((i) => i.timestamp_seconds != null)
                .map((i) => (
                  <span
                    key={i.id}
                    title={`Commitment: ${stripOwnerPrefix(i.text)}`}
                    className={`absolute bottom-0 h-1.5 w-1.5 -translate-x-1/2 rotate-45 ${i.is_done ? "bg-done" : "bg-owed"}`}
                    style={{ left: pct(i.timestamp_seconds!) }}
                  />
                ))}
              <span
                className="absolute top-1/2 h-4 w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink"
                style={{ left: pct(currentTime) }}
              />
            </div>
          </div>

          <span className="hidden w-[108px] shrink-0 text-right font-mono text-[12px] tabular-nums text-ink-2 sm:block">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
          <div className="flex shrink-0 overflow-hidden rounded-md border border-rule-strong" role="group" aria-label="Playback speed">
            {SPEEDS.map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                aria-pressed={speed === s}
                className={`px-2 py-1 font-mono text-[11px] ${speed === s ? "bg-ink text-paper" : "text-ink-2 hover:bg-sunk"}`}
              >
                {s}×
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="mx-auto grid max-w-7xl gap-10 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(340px,420px)] lg:gap-12">
        <div className="min-w-0 space-y-12">
          <section aria-labelledby="owes-heading">
            <div className="flex items-end justify-between gap-4 border-b border-ink pb-3">
              <div>
                <Eyebrow>Commitments</Eyebrow>
                <h2 id="owes-heading" className="mt-1 font-serif text-[28px] tracking-tight">
                  Who owes what
                </h2>
              </div>
              {items.length > 0 && (
                <div className="flex items-center gap-3">
                  <div className="hidden h-1.5 w-28 overflow-hidden rounded-full bg-sunk sm:block">
                    <div className="h-full bg-done transition-all" style={{ width: `${(doneCount / items.length) * 100}%` }} />
                  </div>
                  <span className="font-mono text-[12px] text-ink-2">
                    {doneCount}/{items.length} done
                  </span>
                </div>
              )}
            </div>

            {itemError && <p className="mt-3 rounded-md bg-owed-soft px-3 py-2 text-[13px] text-owed">{itemError}</p>}

            {items.length === 0 ? (
              <p className="mt-5 text-sm text-ink-2">No commitments were made in this meeting.</p>
            ) : (
              <div className="divide-y divide-rule">
                {ledger.map((g) => (
                  <div key={g.owner?.id ?? "none"} className="grid gap-3 py-5 sm:grid-cols-[150px_minmax(0,1fr)]">
                    <div className="flex items-center gap-2 self-start sm:pt-0.5">
                      {g.owner ? (
                        <Avatar name={g.owner.name} color={g.owner.speaker_color} size={26} />
                      ) : (
                        <span className="h-[26px] w-[26px] rounded-full border border-dashed border-rule-strong" />
                      )}
                      <div className="leading-tight">
                        <p className="text-[14px] font-semibold">{g.owner?.name ?? "Unassigned"}</p>
                        <p className="font-mono text-[11px] text-muted">
                          {g.items.filter((i) => !i.is_done).length} open
                        </p>
                      </div>
                    </div>
                    <ul className="space-y-1">
                      {g.items.map((it) => {
                        const co = coOwnersFromText(it.text, participants, it.owner_participant_id ?? null);
                        const focused = focusedTs != null && it.timestamp_seconds === focusedTs;
                        return (
                          <li
                            key={it.id}
                            className={`group flex gap-3 rounded-lg px-2 py-2 transition ${focused ? "bg-mark/40" : "hover:bg-sunk"}`}
                          >
                            <Check
                              checked={it.is_done}
                              disabled={savingIds.has(it.id)}
                              onChange={() => saveItem(it.id, { is_done: !it.is_done })}
                              label={it.text}
                            />
                            <div className="min-w-0 flex-1">
                              <p className={`text-[15px] leading-snug ${it.is_done ? "text-muted line-through" : "text-ink"}`}>
                                {stripOwnerPrefix(it.text)}
                              </p>
                              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                                {it.timestamp_seconds != null && (
                                  <TimeChip seconds={it.timestamp_seconds} onClick={() => seekTo(it.timestamp_seconds!)} active={focused} />
                                )}
                                {co.length > 0 && (
                                  <span className="text-[12px] text-muted">with {co.map((p) => p.name.split(" ")[0]).join(", ")}</span>
                                )}
                                <label className="ml-auto flex items-center gap-1 text-[12px] text-muted opacity-100 transition sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
                                  <span className="sr-only sm:not-sr-only">Owner</span>
                                  <select
                                    value={it.owner_participant_id ?? ""}
                                    onChange={(e) => saveItem(it.id, { owner_participant_id: e.target.value || null })}
                                    disabled={savingIds.has(it.id)}
                                    className="rounded-md border border-rule-strong bg-surface px-1.5 py-0.5 text-[12px] text-ink-2 outline-none focus:border-ink"
                                  >
                                    <option value="">Unassigned</option>
                                    {participants.map((p) => (
                                      <option key={p.id} value={p.id}>
                                        {p.name}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section aria-labelledby="summary-heading">
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-ink pb-3">
              <div>
                <Eyebrow>AI summary</Eyebrow>
                <h2 id="summary-heading" className="mt-1 font-serif text-[28px] tracking-tight">
                  What happened
                </h2>
              </div>
              <div className="flex items-center gap-1 rounded-lg bg-sunk p-1" role="tablist" aria-label="Summary template">
                {TEMPLATES.map((t) => {
                  const exists = summaries.some((s) => s.template === t.id);
                  const active = activeTemplate === t.id;
                  return (
                    <button
                      key={t.id}
                      role="tab"
                      aria-selected={active}
                      onClick={() => setActiveTemplate(t.id)}
                      className={`rounded-md px-2.5 py-1 text-[12px] transition ${
                        active ? "bg-surface font-medium text-ink shadow-sm" : "text-ink-2 hover:text-ink"
                      }`}
                    >
                      {t.label}
                      {!exists && <span className="ml-1 text-muted">+</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {genError && <p className="mt-3 rounded-md bg-owed-soft px-3 py-2 text-[13px] text-owed">{genError}</p>}

            {generating ? (
              <div className="mt-6 space-y-3" aria-live="polite">
                <p className="font-mono text-[12px] text-muted">Reading the transcript and pulling out decisions…</p>
                {[80, 95, 70, 88].map((w, i) => (
                  <div key={i} className="h-3 animate-pulse rounded bg-sunk" style={{ width: `${w}%` }} />
                ))}
              </div>
            ) : activeSummary ? (
              <div className="mt-2">
                {activeSummary.content.sections.map((section, i) => (
                  <div key={i} className="grid gap-2 border-b border-rule py-5 last:border-b-0 sm:grid-cols-[150px_minmax(0,1fr)]">
                    <h3 className="text-[13px] font-semibold text-ink-2">{section.heading}</h3>
                    <ul className="space-y-3">
                      {section.bullets.map((b, j) => {
                        const focused = focusedTs === b.timestamp_seconds;
                        return (
                          <li key={j} className="flex items-start gap-3">
                            <TimeChip seconds={b.timestamp_seconds} onClick={() => seekTo(b.timestamp_seconds)} active={focused} />
                            <p className={`text-[15px] leading-relaxed ${focused ? "text-ink" : "text-ink-2"}`}>{b.text}</p>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
                <div className="mt-4 flex items-center justify-between gap-3">
                  <p className="text-[12px] text-muted">
                    {activeSummary.generated_at &&
                      `Generated ${new Date(activeSummary.generated_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`}
                  </p>
                  <button
                    onClick={() => generate(activeTemplate)}
                    className="text-[12px] text-ink-2 underline decoration-rule-strong underline-offset-4 hover:text-ink hover:decoration-ink"
                  >
                    Regenerate with AI
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-5 rounded-xl border border-dashed border-rule-strong px-5 py-8 text-center">
                <p className="text-sm text-ink-2">
                  No {TEMPLATES.find((t) => t.id === activeTemplate)?.label.toLowerCase()} summary for this meeting yet.
                </p>
                <button
                  onClick={() => generate(activeTemplate)}
                  className="mt-3 rounded-lg bg-ink px-3 py-1.5 text-[13px] font-medium text-paper hover:opacity-90"
                >
                  Generate with AI
                </button>
              </div>
            )}
          </section>

          {highlights.length > 0 && (
            <section aria-labelledby="highlights-heading">
              <div className="border-b border-ink pb-3">
                <Eyebrow>Marked moments</Eyebrow>
                <h2 id="highlights-heading" className="mt-1 font-serif text-[28px] tracking-tight">
                  Highlights
                </h2>
              </div>
              <ul className="mt-2 divide-y divide-rule">
                {highlights.map((h) => (
                  <li key={h.id} className="flex items-center gap-3 py-3">
                    <TimeChip seconds={h.timestamp_seconds} onClick={() => seekTo(h.timestamp_seconds)} />
                    <span className="text-[15px]">{h.label}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside aria-labelledby="transcript-heading" className="lg:sticky lg:top-[136px] lg:self-start">
          <div className="overflow-hidden rounded-xl border border-rule bg-surface">
            <div className="flex items-center justify-between border-b border-rule px-4 py-3">
              <h2 id="transcript-heading" className="text-[13px] font-semibold">
                Transcript <span className="font-mono font-normal text-muted">· {transcript.length} lines</span>
              </h2>
              <button
                onClick={() => {
                  setFollow((f) => !f);
                  if (!follow && currentLineIndex >= 0) scrollToLine(currentLineIndex);
                }}
                aria-pressed={follow}
                className={`rounded-md px-2 py-0.5 font-mono text-[11px] ${follow ? "bg-ink text-paper" : "text-ink-2 hover:bg-sunk"}`}
              >
                {follow ? "● Following" : "Follow playback"}
              </button>
            </div>
            <div
              ref={transcriptBox}
              onWheel={() => setFollow(false)}
              onTouchMove={() => setFollow(false)}
              className="scroll-quiet relative max-h-[60vh] overflow-y-auto px-2 py-2 lg:max-h-[calc(100vh-220px)]"
            >
              {transcript.map((line, i) => {
                const speaker = line.participant_id ? participantMap.get(line.participant_id) : null;
                const isActive = i === currentLineIndex;
                const prevSame = i > 0 && transcript[i - 1].participant_id === line.participant_id;
                const isCommitment = commitmentTimes.has(Math.floor(line.start_seconds));
                return (
                  <button
                    key={line.id}
                    data-line={i}
                    onClick={() => seekTo(line.start_seconds)}
                    className={`relative block w-full rounded-lg px-3 py-2 text-left transition ${
                      isActive ? "bg-mark/45" : "hover:bg-sunk"
                    } ${prevSame ? "pt-0.5" : "mt-1"}`}
                  >
                    {!prevSame && (
                      <span className="mb-1 flex items-center gap-2">
                        <Avatar name={speaker?.name ?? "?"} color={speaker?.speaker_color} size={18} />
                        <span className="text-[12px] font-semibold">{speaker?.name ?? "Unknown"}</span>
                        <span className="font-mono text-[11px] text-muted">{formatTime(line.start_seconds)}</span>
                      </span>
                    )}
                    <span className={`block pl-[26px] text-[14px] leading-relaxed ${isActive ? "text-ink" : "text-ink-2"}`}>
                      {line.text}
                    </span>
                    {isCommitment && (
                      <span className="ml-[26px] mt-1 inline-flex items-center gap-1 rounded bg-owed-soft px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-owed">
                        <span className="h-1 w-1 rotate-45 bg-owed" /> commitment
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
          <p className="mt-3 px-1 text-[11px] leading-relaxed text-muted">
            Playback is simulated. The capture bot is stubbed, but the transcript, timings and everything above come
            from the database. <span className="font-mono">Space</span> plays and pauses, <span className="font-mono">← →</span> skip 10s.
          </p>
        </aside>
      </main>
    </>
  );
}
