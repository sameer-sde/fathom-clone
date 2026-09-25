export type Meeting = {
  id: string;
  title: string;
  meeting_type: string;
  duration_seconds: number;
  started_at: string;
  participant_count?: number;
};
export type Participant = { id: string; name: string; speaker_color: string | null; is_host?: boolean };
export type TranscriptLine = {
  id: string;
  participant_id: string | null;
  start_seconds: number;
  text: string;
};
export type SummaryBullet = { text: string; timestamp_seconds: number };
export type Summary = {
  id: string;
  template: string;
  generated_at?: string;
  content: { sections: { heading: string; bullets: SummaryBullet[] }[] };
};
export type ActionItem = {
  id: string;
  text: string;
  is_done: boolean;
  timestamp_seconds: number | null;
  owner_participant_id?: string | null;
  sequence?: number;
};
export type Highlight = { id: string; label: string; timestamp_seconds: number };

export function formatTime(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
}

export function formatDuration(seconds: number | null | undefined) {
  if (!seconds) return "—";
  const mins = Math.round(seconds / 60);
  if (mins < 1) return `${seconds}s`;
  const hrs = Math.floor(mins / 60);
  return hrs > 0 ? `${hrs}h ${mins % 60 ? `${mins % 60}m` : ""}`.trim() : `${mins} min`;
}

export function labelForType(type: string) {
  const map: Record<string, string> = { one_on_one: "1:1", sales: "Sales", general: "Team", sales_call: "Sales call" };
  return map[type] ?? type.replace(/_/g, " ");
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

export function resolveOwnerId(item: ActionItem, participants: Participant[], transcript: TranscriptLine[]) {
  if (item.owner_participant_id !== undefined) return item.owner_participant_id;
  const lower = item.text.toLowerCase();
  const byPrefix = participants.find((p) => lower.startsWith(p.name.split(" ")[0].toLowerCase()));
  if (byPrefix) return byPrefix.id;
  if (item.timestamp_seconds == null) return null;
  let speaker: string | null = null;
  for (const line of transcript) {
    if (line.start_seconds <= item.timestamp_seconds) speaker = line.participant_id;
    else break;
  }
  return speaker;
}

export function stripOwnerPrefix(text: string) {
  const m = text.match(/^[A-Z][\w'-]*(?:\s*(?:&|and)\s*[A-Z][\w'-]*)*:\s*(.+)$/);
  if (!m) return text;
  return m[1].charAt(0).toUpperCase() + m[1].slice(1);
}

export function coOwnersFromText(text: string, participants: Participant[], ownerId: string | null) {
  const m = text.match(/^([^:]{1,40}):/);
  if (!m) return [];
  const names = m[1].split(/\s*(?:&|and)\s*/i).map((n) => n.trim().toLowerCase());
  return participants.filter((p) => p.id !== ownerId && names.includes(p.name.split(" ")[0].toLowerCase()));
}
