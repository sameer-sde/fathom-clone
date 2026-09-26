"use client";

import { useSyncExternalStore } from "react";

type Format = "day" | "date" | "time" | "long" | "stamp";

const noop = () => () => {};

function format(iso: string, kind: Format) {
  const d = new Date(iso);
  if (kind === "time") return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  if (kind === "date") return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  if (kind === "long") return d.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
  if (kind === "stamp") return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((startOf(new Date()) - startOf(d)) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
}

export default function LocalTime({ iso, kind }: { iso: string; kind: Format }) {
  const text = useSyncExternalStore(noop, () => format(iso, kind), () => "");
  return <span suppressHydrationWarning>{text}</span>;
}
