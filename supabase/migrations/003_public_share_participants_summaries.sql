create policy "Anyone can view participants behind a valid shared clip"
  on meeting_participants for select
  using (meeting_has_shared_clip(meeting_id));

create policy "Anyone can view summaries behind a valid shared clip"
  on summaries for select
  using (meeting_has_shared_clip(meeting_id));
