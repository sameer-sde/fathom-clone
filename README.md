# Fathom Clone

A from-scratch rebuild of [Fathom](https://fathom.video) — the AI meeting notetaker — built in a single day for the 8x Hiring take-home assignment.

**Live app:** https://fathom-clone-one.vercel.app
**Repository:** https://github.com/sameer-sde/fathom-clone

---

## Contents

- [What this is](#what-this-is)
- [Features](#features)
- [A real bug we found and fixed](#a-real-bug-we-found-and-fixed)
- [Deliberate scope decisions](#deliberate-scope-decisions)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Running locally](#running-locally)
- [Seeding demo data](#seeding-demo-data)
- [Database schema](#database-schema)
- [Agent capture logs](#agent-capture-logs)

---

## What this is

Fathom records meetings, transcribes them, and turns that transcript into something useful: a structured summary, extracted action items, and moments worth revisiting later. This project rebuilds that core loop — record, transcribe, summarize, act on it — as a real, deployed, multi-user web app with authentication, a proper database, and row-level security.

It does not attempt to build a working meeting-recording bot; the brief explicitly allows stubbing that layer, and doing so freed up time for the parts that are actually hard to get right: keeping playback and transcript in sync, letting a summary jump you to the right moment, making search actually search transcript content (not just titles), and making sharing work for someone who was never signed in.

## Features

| Feature | Notes |
|---|---|
| Auth | Email/password via Supabase Auth |
| Meetings list | Seeded with a 2-minute 1:1, a 12-minute sales call, and a 1-hour / 8-person all-hands — the case the brief says "actually matters" |
| Playback + synced transcript | Simulated timeline (no real video file — see Deliberate scope decisions), scrubbable, click any transcript line to seek, current line highlights as playback progresses |
| AI summary panel | Multiple templates per meeting (General, Sales Call), each bullet links to the timestamp it came from |
| Action items | Extracted per meeting, checkable in the UI, each links back to its timestamp |
| Highlights | Marked moments shown on the progress bar and in a sidebar list, click to jump |
| Cross-meeting search | Matches both meeting titles and transcript text, live dropdown with excerpts |
| Public sharing | "Share clip" generates a public, no-login-required link scoped to exactly one meeting |

## A real bug we found and fixed

While testing, a signed-in user's meetings list started showing a meeting that belonged to a different account. Direct SQL checks confirmed the database itself was correctly scoped per user, so the bug wasn't a leaked credential or broken auth. It was a Postgres RLS quirk: multiple SELECT policies on the same table are combined with OR, and once a meeting had been shared once, its public-access policy (`meeting_has_shared_clip(id)`) started applying to every logged-in user's query, not just people holding the actual share link.

Fix: defense-in-depth. The meetings list, meeting detail page, and search API now explicitly filter by `user_id` at the application-query level, rather than relying solely on RLS to scope results. The public share page is unaffected and still works correctly for its intended purpose, verified by opening a real share link in a fully signed-out incognito window. Full history is in `supabase/migrations/`.

## Deliberate scope decisions

- Capture layer is stubbed. No real Zoom/Meet/Teams bot. Playback is a timer-driven progress bar synced against a real, seeded transcript. The interaction (scrub, seek, jump-from-summary) is fully real; only the recording itself is simulated. The brief explicitly permits this.
- Summaries are hand-written, not live-generated. The Anthropic Console account used for this build had no API credits available mid-build. `scripts/seed.ts` is structured so a real `anthropic.messages.create()` call is a small, contained swap. See `scripts/summaries-data.ts` for where the hand-written content currently sits. The summaries still follow the correct per-template structure (General vs. Sales Call) and are grounded in the actual seeded transcripts.
- No calendar integration. Out of scope given the time budget.

## Tech stack

- Next.js 16 — App Router, TypeScript, Turbopack
- Supabase — Postgres, Auth, Row Level Security
- Tailwind CSS
- Vercel — hosting and CI deploy on push to main

## Project structure

```
src/
  app/
    login/                  sign in / sign up
    meetings/               meetings list + search
    meetings/[id]/          meeting detail: playback, transcript, summary, actions, highlights
    share/[token]/          public, no-auth share page
    api/
      meetings/[id]/share/  creates a shared_clips row
      search/               cross-meeting + transcript search
    auth/signout/           sign-out route handler
  lib/supabase/             browser / server / admin Supabase clients
  proxy.ts                  Next.js 16 middleware equivalent, refreshes auth session
scripts/
  seed.ts                   populates real meetings/transcripts/summaries for a given user
  summaries-data.ts         hand-written summary + action-item content
supabase/migrations/        schema + RLS policies, in applied order
.agent-logs/                Claude Code prompt/response capture (see below)
```

## Running locally

```bash
git clone https://github.com/sameer-sde/fathom-clone.git
cd fathom-clone
npm install
cp .env.example .env.local
# fill in .env.local: your own Supabase project URL + keys, and an Anthropic API key
npm run dev
```

Apply the schema by running each file in `supabase/migrations/`, in order, via the Supabase SQL Editor.

## Seeding demo data

Sign up once in the running app, then:

```bash
npx tsx scripts/seed.ts your-email@example.com
```

This inserts the three demo meetings (with transcripts, summaries, action items, and a couple of highlights) for that account.

## Database schema

Seven tables: `meetings`, `meeting_participants`, `transcript_lines`, `summaries`, `action_items`, `highlights`, `shared_clips`, all with Row Level Security enabled. Owners can do anything with their own rows; a valid `shared_clips` entry additionally grants read-only public access to that one meeting's data. See `supabase/migrations/001_initial_schema.sql` for the full definitions and `002`/`003` for the RLS fixes described above.

## Agent capture logs

This project was built end-to-end with Claude Code. Every prompt and final response is automatically logged to `.agent-logs/` via a Stop hook (`.claude/settings.json` -> `.claude/hooks/capture_log.py`), committed as the work happened rather than in one batch at the end. Setup verification is in `CAPTURE-TEST.md`.
