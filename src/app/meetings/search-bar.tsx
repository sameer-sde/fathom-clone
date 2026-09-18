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
    if (!query.trim()) {
      setResults(null);
      return;
    }
    setLoading(true);
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

  const hasResults = results && (results.meetings.length > 0 || results.transcriptMatches.length > 0);

  return (
    <div ref={containerRef} className="relative w-72">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => query.trim() && setOpen(true)}
        placeholder="Search meetings and transcripts…"
        className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-sm text-white outline-none focus:border-neutral-600"
      />

      {open && query.trim() && (
        <div className="absolute right-0 z-10 mt-2 max-h-96 w-96 overflow-y-auto rounded-lg border border-neutral-800 bg-neutral-900 shadow-xl">
          {loading && <p className="px-4 py-3 text-sm text-neutral-500">Searching…</p>}

          {!loading && !hasResults && (
            <p className="px-4 py-3 text-sm text-neutral-500">No matches for "{query}"</p>
          )}

          {!loading && results && results.meetings.length > 0 && (
            <div className="border-b border-neutral-800 p-2">
              <p className="px-2 py-1 text-xs font-medium uppercase text-neutral-600">Meetings</p>
              {results.meetings.map((m) => (
                <Link
                  key={m.id}
                  href={`/meetings/${m.id}`}
                  onClick={() => setOpen(false)}
                  className="block rounded-md px-2 py-2 text-sm text-neutral-200 hover:bg-neutral-800"
                >
                  {m.title}
                </Link>
              ))}
            </div>
          )}

          {!loading && results && results.transcriptMatches.length > 0 && (
            <div className="p-2">
              <p className="px-2 py-1 text-xs font-medium uppercase text-neutral-600">In transcripts</p>
              {results.transcriptMatches.map((t) => (
                <Link
                  key={t.id}
                  href={`/meetings/${t.meeting_id}`}
                  onClick={() => setOpen(false)}
                  className="block rounded-md px-2 py-2 hover:bg-neutral-800"
                >
                  <p className="text-xs text-neutral-500">{getMeetingTitle(t.meetings)}</p>
                  <p className="truncate text-sm text-neutral-200">{t.text}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
