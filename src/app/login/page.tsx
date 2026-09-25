"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Wordmark } from "@/components/ui";

const SAMPLE = [
  { who: "Priya", color: "#60a5fa", text: "Ship SSO before the enterprise deals close", at: "1:22" },
  { who: "Marcus", color: "#4ade80", text: "Give Yuki read access before shadow mode", at: "2:58" },
  { who: "Sameer", color: "#f87171", text: "Send Northwind a 40-seat proposal today", at: "2:04", done: true },
];

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();

    await supabase.auth.signOut();

    const { error } =
      mode === "login"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    window.location.href = "/meetings";
  }

  const input =
    "w-full rounded-lg border border-rule-strong bg-surface px-3 py-2.5 text-[15px] text-ink outline-none transition placeholder:text-muted focus:border-ink";

  return (
    <div className="grid min-h-screen flex-1 lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden flex-col justify-between border-r border-rule bg-sunk px-12 py-10 lg:flex">
        <Wordmark href="/login" />
        <div className="max-w-md">
          <h2 className="font-serif text-[44px] leading-[1.05] tracking-tight text-ink">
            Meetings end.
            <br />
            <em className="text-owed">Promises shouldn&apos;t.</em>
          </h2>
          <p className="mt-5 text-[15px] leading-relaxed text-ink-2">
            Every call is recorded and transcribed, then boiled down to the thing you actually need afterwards:
            who committed to what, with the exact moment they said it.
          </p>

          <div className="mt-10 rounded-xl border border-rule bg-surface p-2 shadow-[0_1px_0_var(--rule)]">
            {SAMPLE.map((row) => (
              <div key={row.text} className="flex items-center gap-3 rounded-lg px-3 py-2.5">
                <span
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                    row.done ? "border-done bg-done text-white" : "border-rule-strong"
                  }`}
                >
                  {row.done && (
                    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
                      <path d="M2 5.2 4.2 7.4 8 3" stroke="currentColor" strokeWidth="1.6" fill="none" />
                    </svg>
                  )}
                </span>
                <span className="flex w-16 shrink-0 items-center gap-1.5 text-xs font-medium text-ink-2">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: row.color }} />
                  {row.who}
                </span>
                <span className={`flex-1 truncate text-sm ${row.done ? "text-muted line-through" : "text-ink"}`}>{row.text}</span>
                <span className="font-mono text-[11px] text-muted">{row.at}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">An AI meeting notetaker</p>
      </section>

      <section className="flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-10 lg:hidden">
            <Wordmark href="/login" />
          </div>
          <h1 className="font-serif text-3xl tracking-tight text-ink">
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="mt-1.5 text-sm text-ink-2">
            {mode === "login" ? "Sign in to see what's still owed." : "Start turning calls into commitments."}
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-medium text-ink-2">Work email</span>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={input}
                placeholder="you@company.com"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-medium text-ink-2">Password</span>
              <input
                type="password"
                required
                minLength={6}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={input}
                placeholder="At least 6 characters"
              />
            </label>

            {error && (
              <p role="alert" className="rounded-lg border border-owed/30 bg-owed-soft px-3 py-2 text-sm text-owed">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-ink px-3 py-2.5 text-[15px] font-medium text-paper transition hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "One moment…" : mode === "login" ? "Sign in" : "Create account"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-ink-2">
            {mode === "login" ? "New here? " : "Already have an account? "}
            <button
              type="button"
              onClick={() => {
                setMode(mode === "login" ? "signup" : "login");
                setError(null);
              }}
              className="font-medium text-ink underline decoration-rule-strong underline-offset-4 hover:decoration-ink"
            >
              {mode === "login" ? "Create an account" : "Sign in"}
            </button>
          </p>
        </div>
      </section>
    </div>
  );
}
