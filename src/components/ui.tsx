import Link from "next/link";
import { formatTime, initials } from "@/lib/meeting";

export function Wordmark({ href = "/meetings" }: { href?: string }) {
  return (
    <Link href={href} className="group inline-flex items-baseline gap-1.5">
      <span className="font-serif text-[22px] font-medium leading-none tracking-tight text-ink">Followthrough</span>
      <span className="h-1.5 w-1.5 translate-y-[-2px] rounded-full bg-owed transition group-hover:scale-125" aria-hidden />
    </Link>
  );
}

function readableOn(hex?: string | null) {
  const m = hex?.match(/^#?([0-9a-f]{6})$/i);
  if (!m) return "#fff";
  const n = parseInt(m[1], 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? "#1d1c1a" : "#fff";
}

export function Avatar({ name, color, size = 24 }: { name: string; color?: string | null; size?: number }) {
  return (
    <span
      title={name}
      className="inline-flex shrink-0 items-center justify-center rounded-full font-mono font-medium ring-2 ring-surface"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4), backgroundColor: color ?? "#8a867d", color: readableOn(color ?? "#8a867d") }}
    >
      {initials(name)}
    </span>
  );
}

export function TimeChip({
  seconds,
  onClick,
  active = false,
}: {
  seconds: number;
  onClick?: () => void;
  active?: boolean;
}) {
  const cls = `inline-flex shrink-0 items-center gap-1 rounded-md border px-1.5 py-0.5 font-mono text-[11px] leading-none tabular-nums transition ${
    active ? "border-ink bg-ink text-paper" : "border-rule-strong bg-surface text-ink-2 hover:border-ink hover:text-ink"
  }`;
  if (!onClick) return <span className={cls}>{formatTime(seconds)}</span>;
  return (
    <button type="button" onClick={onClick} className={cls} aria-label={`Jump to ${formatTime(seconds)}`}>
      <svg width="7" height="8" viewBox="0 0 7 8" aria-hidden className="opacity-60">
        <path d="M0 0 L7 4 L0 8 Z" fill="currentColor" />
      </svg>
      {formatTime(seconds)}
    </button>
  );
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">{children}</p>;
}
