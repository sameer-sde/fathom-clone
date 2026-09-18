# Fathom Clone

A rebuild of [fathom.video](https://fathom.video) — an AI meeting notetaker — built in a ~24 hour window for the 8x Hiring assignment.

**Live:** https://fathom-clone-one.vercel.app
**Repo:** https://github.com/sameer-sde/fathom-clone

## What's implemented

- **Auth** — email/password sign-up and sign-in via Supabase Auth
- **Meetings list** — seeded with 3 real meetings: a 2-minute 1:1, a 12-minute sales call, and a 1-hour, 8-person all-hands (the case that "actually matters" per the brief)
- **Meeting detail page** — simulated playback with a scrubbable progress bar, a synced transcript that highlights the current line and lets you click any line to seek, AI summary panel with clickable timestamps, and template switching (General vs. Sales Call summary structures)
- **Action items** — extracted per meeting, checkable in the UI
- **Highlights** — timestamped moments, marked on the progress bar, clickable to jump to that point
- **Cross-meeting search** — searches both meeting titles and transcript text, with a live dropdown showing matched excerpts
- **Public sharing** — "Share clip" generates a public link viewable without signing in, scoped only to that specific meeting
- **Seed script** (`scripts/seed.ts`) — populates real meetings, transcripts, and summaries for a given user

## Known limitations / deliberate scope decisions

- **The recording/capture layer is stubbed**, per the assignment's explicit allowance. There is no real Zoom/Meet/Teams bot; playback is simulated with a timer-driven progress bar synced to a real transcript, not an actual video file.
- **Summaries are hand-written, not live-generated**, because the Anthropic Console account used for this project didn't have API credits available during the build window. The seed script (`scripts/seed.ts`) is structured so that swapping in a real `anthropic.messages.create()` call is a small, contained change — see `scripts/summaries-data.ts` for where hand-written content currently substitutes for it. The summaries are still realistic and follow the correct per-template structure (General vs. Sales Call).
- **No calendar integration.** Connecting a real Google/Outlook calendar was out of scope given the time budget; the onboarding flow this would normally gate is not implemented.

## A real bug we found and fixed (worth knowing about)

During testing, we discovered that once a meeting had ever been shared via "Share clip," it became visible to *any* logged-in user's meetings list — not just people with the share link. This came from how Postgres Row Level Security combines multiple policies on the same table with OR: the public-sharing policy (`meeting_has_shared_clip(id)`) and the owner policy (`auth.uid() = user_id`) were both active for SELECT, so a shared meeting satisfied the public policy for everyone, regardless of who they were.

Fixed with defense-in-depth: the meetings list, meeting detail page, and search API now explicitly filter by `user_id` in the application query, rather than relying solely on RLS to scope results. The public share page (`/share/[token]`) is unaffected and continues to work correctly for its intended purpose. See `supabase/migrations/` for the schema history.

## Tech stack

- **Next.js 16** (App Router, TypeScript, Turbopack)
- **Supabase** — Postgres, Auth, Row Level Security
- **Tailwind CSS**
- **Vercel** — deployment

## Running locally

```bash
git clone https://github.com/sameer-sde/fathom-clone.git
cd fathom-clone
npm install
cp .env.example .env.local
# fill in .env.local with your own Supabase project URL/keys and an Anthropic API key
npm run dev
```

Apply the database schema by running the SQL files in `supabase/migrations/` in order, via the Supabase SQL Editor.

To seed demo data for a user who has already signed up in the app:

```bash
npx tsx scripts/seed.ts your-email@example.com
```

## Agent capture logs

This project was built with Claude Code, with prompts and responses automatically logged to `.agent-logs/` via a `Stop` hook (see `.claude/settings.json` and `.claude/hooks/capture_log.py`). See `CAPTURE-TEST.md` for verification details.
