-- Fixes infinite recursion between meetings and shared_clips RLS policies
drop policy if exists "Anyone can view meeting data behind a valid shared clip" on meetings;
drop policy if exists "Anyone can view transcript behind a valid shared clip" on transcript_lines;

create or replace function meeting_has_shared_clip(check_meeting_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from shared_clips where shared_clips.meeting_id = check_meeting_id);
$$;

create policy "Anyone can view meeting data behind a valid shared clip"
  on meetings for select
  using (meeting_has_shared_clip(id));

create policy "Anyone can view transcript behind a valid shared clip"
  on transcript_lines for select
  using (meeting_has_shared_clip(meeting_id));
