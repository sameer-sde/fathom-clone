"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

type MeetingMatch = { id: string; title: string; started_at: string; meeting_type: string };
type TranscriptMatch = {
  id: string;
  meeting_id: string;
  text: string;
  start_seconds: number;
  meetings: { title: string } | { title: string }[] | null;
};

export default function SearchBar() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ meetings: MeetingMatch[]; transcriptMatches: TranscriptMatch[] } | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!query.trim()) return;
    const timeout = setTimeout(async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setResults(data);
      setLoading(false);
      setOpen(true);
    }, 300);
    return () => clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function getMeetingTitle(m: TranscriptMatch["meetings"]) {
    if (!m) return "Untitled";
    if (Array.isArray(m)) return m[0]?.title ?? "Untitled";
    return m.title;
  }

  function highlight(text: string, q: string) {
    const i = text.toLowerCase().indexOf(q.trim().toLowerCase());
    if (i < 0 || !q.trim()) return text;
    const start = Math.max(0, i - 40);
    const end = i + q.trim().length;
    return (
      <>
        {start > 0 && "…"}
        {text.slice(start, i)}
        <mark className="rounded-sm bg-mark px-0.5 text-ink">{text.slice(i, end)}</mark>
        {text.slice(end)}
      </>
    );
  }

  const hasResults = results && (results.meetings.length > 0 || results.transcriptMatches.length > 0);

  return (
    <div ref={containerRef} className="relative w-32 sm:w-72">
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          if (e.target.value.trim()) setLoading(true);
          else setResults(null);
        }}
        onFocus={() => query.trim() && setOpen(true)}
        placeholder="Search what anyone said…"
        className="w-full rounded-lg border border-rule-strong bg-surface px-3 py-1.5 text-[13px] text-ink outline-none transition placeholder:text-muted focus:border-ink"
      />

      {open && query.trim() && (
        <div className="scroll-quiet absolute right-0 z-30 mt-2 max-h-[28rem] w-[min(26rem,calc(100vw-2rem))] overflow-y-auto rounded-xl border border-rule-strong bg-surface shadow-[0_12px_40px_-12px_rgba(0,0,0,0.25)]">
          {loading && <p className="px-4 py-3 text-[13px] text-muted">Searching…</p>}

          {!loading && !hasResults && (
            <p className="px-4 py-3 text-[13px] text-muted">No matches for &ldquo;{query}&rdquo;</p>
          )}

          {!loading && results && results.meetings.length > 0 && (
            <div className="border-b border-rule p-2">
              <p className="px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">Meetings</p>
              {results.meetings.map((m) => (
                <Link
                  key={m.id}
                  href={`/meetings/${m.id}`}
                  onClick={() => setOpen(false)}
                  className="block rounded-md px-2 py-2 font-serif text-[16px] text-ink hover:bg-sunk"
                >
                  {m.title}
                </Link>
              ))}
            </div>
          )}

          {!loading && results && results.transcriptMatches.length > 0 && (
            <div className="p-2">
              <p className="px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">Said in meetings</p>
              {results.transcriptMatches.map((t) => (
                <Link
                  key={t.id}
                  href={`/meetings/${t.meeting_id}?t=${Math.floor(t.start_seconds)}`}
                  onClick={() => setOpen(false)}
                  className="block rounded-md px-2 py-2 hover:bg-sunk"
                >
                  <p className="flex justify-between gap-2 text-[11px] text-muted"><span className="truncate">{getMeetingTitle(t.meetings)}</span><span className="font-mono">{Math.floor(t.start_seconds / 60)}:{String(Math.floor(t.start_seconds % 60)).padStart(2, "0")}</span></p>
                  <p className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-ink-2">{highlight(t.text, query)}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
