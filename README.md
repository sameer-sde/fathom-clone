# Followthrough

An AI meeting notetaker organised around **who committed to what**. It started as a from-scratch rebuild of [Fathom](https://fathom.video) for the 8x Hiring take-home; round two keeps the same backend and replaces the cloned interface with my own design.

**Live app:** https://fathom-clone-one.vercel.app
**Repository:** https://github.com/sameer-sde/fathom-clone

---

## Contents

- [What this is](#what-this-is)
- [Design: why commitments come first](#design-why-commitments-come-first)
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

## Design: why commitments come first

When I tested the real Fathom, what I wanted after a call wasn't the recording or even the summary. It was the list of promises: who said they'd do what, and proof that they said it. So the interface is built around that list instead of around the video.

- **Home is "Still owed", not a list of recordings.** Open commitments from every meeting, grouped by person, sit next to the meeting library. You can check things off without opening a meeting.
- **Each meeting opens on "Who owes what".** Commitments are grouped by owner, can be checked off or reassigned, and link to the exact moment they were said. The summary comes second.
- **The transcript is the evidence.** It stays pinned beside everything else, follows playback, and tags the lines where a commitment was made.
- **The scrubber shows the conversation.** Each speaker's turns are drawn in their colour along the timeline, with markers for commitments and highlights, so an 8-person call is readable at a glance.
- **Visual language: a paper ledger.** Warm paper, ink text, a serif for headings, monospace timestamps that read like citations, and a single signal colour (burnt orange) that only ever means "still owed". Works in light and dark mode and down to phone width.

## Features

| Feature | Notes |
|---|---|
| Auth | Email/password via Supabase Auth |
| Meetings list | Seeded with a 2-minute 1:1, a 12-minute sales call, and a 1-hour / 8-person all-hands — the case the brief says "actually matters" |
| Playback + synced transcript | Simulated timeline (no real video file — see Deliberate scope decisions), scrubbable, click any transcript line to seek, current line highlights as playback progresses |
| AI summary panel | Multiple templates per meeting (General, Sales Call), each bullet links to the timestamp it came from; missing templates can be generated on demand |
| Commitments | Extracted per meeting with an owner. Checking off and reassigning persist via `PATCH /api/action-items/[id]`, and each links back to its timestamp |
| Still owed | Cross-meeting view of every open commitment, grouped by person |
| Live AI summary | `POST /api/meetings/[id]/summary` sends the transcript to Claude, saves the summary and re-extracts open commitments with owners (done items are kept) |
| Highlights | Marked moments shown on the progress bar and in a sidebar list, click to jump |
| Cross-meeting search | Matches both meeting titles and transcript text, live dropdown with excerpts |
| Public sharing | "Share clip" generates a public, no-login-required link scoped to exactly one meeting |

## A real bug we found and fixed

While testing, a signed-in user's meetings list started showing a meeting that belonged to a different account. Direct SQL checks confirmed the database itself was correctly scoped per user, so the bug wasn't a leaked credential or broken auth. It was a Postgres RLS quirk: multiple SELECT policies on the same table are combined with OR, and once a meeting had been shared once, its public-access policy (`meeting_has_shared_clip(id)`) started applying to every logged-in user's query, not just people holding the actual share link.

Fix: defense-in-depth. The meetings list, meeting detail page, and search API now explicitly filter by `user_id` at the application-query level, rather than relying solely on RLS to scope results. The public share page is unaffected and still works correctly for its intended purpose, verified by opening a real share link in a fully signed-out incognito window. Full history is in `supabase/migrations/`.

## Deliberate scope decisions

- Capture layer is stubbed. No real Zoom/Meet/Teams bot. Playback is a timer-driven progress bar synced against a real, seeded transcript. The interaction (scrub, seek, jump-from-summary) is fully real; only the recording itself is simulated. The brief explicitly permits this.
- Seeded summaries are hand-written. The Anthropic account had no API credits during the first build, so `scripts/summaries-data.ts` holds grounded, hand-written summaries for the demo data. Live generation now exists (`POST /api/meetings/[id]/summary`, "Regenerate with AI" in the UI) and works whenever `ANTHROPIC_API_KEY` has credits; if it fails, the UI shows the error and keeps the existing summary.
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
      action-items/[id]/    PATCH: complete / reassign a commitment
      meetings/[id]/share/  creates a shared_clips row
      meetings/[id]/summary/ POST: live AI summary + commitment extraction
      search/               cross-meeting + transcript search
    auth/signout/           sign-out route handler
  components/               shared UI: header, avatars, timestamp chips, checkbox
  lib/meeting.ts            shared types + formatting helpers
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

Apply the schema by running each file in `supabase/migrations/`, in order, via the Supabase SQL Editor. `004_action_item_owners.sql` adds commitment owners and backfills existing rows (a name prefix like "Priya: …" wins, otherwise whoever was speaking at that moment).

Optional: set `ANTHROPIC_MODEL` to override the model used for live summaries.

## Seeding demo data

Sign up once in the running app, then:

```bash
npx tsx scripts/seed.ts your-email@example.com
```

This inserts the three demo meetings (with transcripts, summaries, action items, and a couple of highlights) for that account.

## Database schema

Seven tables (`action_items` gains `owner_participant_id` and `completed_at` in migration 004): `meetings`, `meeting_participants`, `transcript_lines`, `summaries`, `action_items`, `highlights`, `shared_clips`, all with Row Level Security enabled. Owners can do anything with their own rows; a valid `shared_clips` entry additionally grants read-only public access to that one meeting's data. See `supabase/migrations/001_initial_schema.sql` for the full definitions and `002`/`003` for the RLS fixes described above.

## Agent capture logs

This project was built end-to-end with Claude Code. Every prompt and final response is automatically logged to `.agent-logs/` via a Stop hook (`.claude/settings.json` -> `.claude/hooks/capture_log.py`), committed as the work happened rather than in one batch at the end. Setup verification is in `CAPTURE-TEST.md`.
