"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Check, { patchActionItem } from "@/components/checkbox";
import { Avatar, Eyebrow } from "@/components/ui";
import { formatTime, stripOwnerPrefix } from "@/lib/meeting";

export type OwedItem = {
  id: string;
  text: string;
  is_done: boolean;
  timestamp_seconds: number | null;
  meeting_id: string;
  meeting_title: string;
  owner_name: string | null;
  owner_color: string | null;
};

export default function OwedList({ items: initial }: { items: OwedItem[] }) {
  const [items, setItems] = useState(initial);
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [showDone, setShowDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const open = items.filter((i) => !i.is_done);
  const done = items.filter((i) => i.is_done);

  const byOwner = useMemo(() => {
    const map = new Map<string, { name: string; color: string | null; items: OwedItem[] }>();
    for (const it of open) {
      const key = it.owner_name ?? "Unassigned";
      const g = map.get(key) ?? { name: key, color: it.owner_color, items: [] };
      g.items.push(it);
      map.set(key, g);
    }
    return [...map.values()].sort((a, b) => b.items.length - a.items.length);
  }, [open]);

  async function toggle(item: OwedItem) {
    const next = !item.is_done;
    setError(null);
    setPending((p) => new Set(p).add(item.id));
    setItems((all) => all.map((i) => (i.id === item.id ? { ...i, is_done: next } : i)));
    try {
      await patchActionItem(item.id, { is_done: next });
    } catch (e) {
      setItems((all) => all.map((i) => (i.id === item.id ? { ...i, is_done: !next } : i)));
      setError(e instanceof Error ? e.message : "Couldn't save");
    } finally {
      setPending((p) => {
        const s = new Set(p);
        s.delete(item.id);
        return s;
      });
    }
  }

  const row = (it: OwedItem, showOwner: boolean) => (
    <li key={it.id} className="flex gap-3 py-2.5">
      <Check checked={it.is_done} disabled={pending.has(it.id)} onChange={() => toggle(it)} label={it.text} />
      <div className="min-w-0 flex-1">
        <p className={`text-[14px] leading-snug ${it.is_done ? "text-muted line-through" : "text-ink"}`}>
          {showOwner && it.owner_name && <span className="font-medium">{it.owner_name.split(" ")[0]} · </span>}
          {stripOwnerPrefix(it.text)}
        </p>
        <Link
          href={`/meetings/${it.meeting_id}${it.timestamp_seconds != null ? `?t=${Math.floor(it.timestamp_seconds)}` : ""}`}
          className="mt-1 inline-flex max-w-full items-center gap-1.5 text-[12px] text-muted hover:text-ink"
        >
          <span className="truncate">{it.meeting_title}</span>
          {it.timestamp_seconds != null && <span className="shrink-0 font-mono">@ {formatTime(it.timestamp_seconds)}</span>}
        </Link>
      </div>
    </li>
  );

  return (
    <div>
      <div className="flex items-end justify-between border-b border-ink pb-3">
        <div>
          <Eyebrow>Across all meetings</Eyebrow>
          <h2 id="owed-heading" className="mt-1 font-serif text-3xl tracking-tight">
            Still owed
          </h2>
        </div>
        <span className="font-mono text-xs text-muted">
          <span className="text-owed">{open.length} open</span> · {done.length} done
        </span>
      </div>

      {error && <p className="mt-3 rounded-md bg-owed-soft px-3 py-2 text-[13px] text-owed">{error}</p>}

      {open.length === 0 && (
        <div className="mt-6 rounded-xl border border-rule bg-done-soft px-5 py-6">
          <p className="font-serif text-xl text-done">Nothing owed.</p>
          <p className="mt-1 text-sm text-ink-2">Every commitment from your meetings is checked off.</p>
        </div>
      )}

      <div className="mt-2">
        {byOwner.map((g) => (
          <div key={g.name} className="border-b border-rule py-3 last:border-b-0">
            <div className="flex items-center gap-2">
              <Avatar name={g.name} color={g.color} size={22} />
              <span className="text-[13px] font-semibold">{g.name}</span>
              <span className="font-mono text-[11px] text-muted">{g.items.length}</span>
            </div>
            <ul className="ml-[30px]">{g.items.map((it) => row(it, false))}</ul>
          </div>
        ))}
      </div>

      {done.length > 0 && (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setShowDone((s) => !s)}
            className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted hover:text-ink"
            aria-expanded={showDone}
          >
            {showDone ? "▾" : "▸"} Done ({done.length})
          </button>
          {showDone && <ul className="mt-1">{done.map((it) => row(it, true))}</ul>}
        </div>
      )}
    </div>
  );
}
