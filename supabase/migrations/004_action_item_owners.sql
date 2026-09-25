alter table action_items
  add column if not exists owner_participant_id uuid
    references meeting_participants(id) on delete set null;

alter table action_items
  add column if not exists completed_at timestamptz;

create index if not exists action_items_owner_idx on action_items (owner_participant_id);

update action_items ai
set owner_participant_id = coalesce(
  (
    select p.id
    from meeting_participants p
    where p.meeting_id = ai.meeting_id
      and ai.text ilike split_part(p.name, ' ', 1) || '%'
    order by length(p.name)
    limit 1
  ),
  (
    select t.participant_id
    from transcript_lines t
    where t.meeting_id = ai.meeting_id
      and ai.timestamp_seconds is not null
      and t.start_seconds <= ai.timestamp_seconds
    order by t.start_seconds desc
    limit 1
  )
)
where ai.owner_participant_id is null;

update action_items set completed_at = now() where is_done and completed_at is null;
