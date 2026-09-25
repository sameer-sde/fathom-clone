"use client";

export default function Check({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={`mt-[2px] flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border transition disabled:opacity-50 ${
        checked ? "border-done bg-done text-white" : "border-rule-strong bg-surface hover:border-ink"
      }`}
    >
      {checked && (
        <svg width="11" height="11" viewBox="0 0 10 10" aria-hidden>
          <path d="M2 5.2 4.2 7.4 8 3" stroke="currentColor" strokeWidth="1.7" fill="none" strokeLinecap="round" />
        </svg>
      )}
    </button>
  );
}

export async function patchActionItem(id: string, body: { is_done?: boolean; owner_participant_id?: string | null }) {
  const res = await fetch(`/api/action-items/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
  return data.item;
}
