create table meetings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  meeting_type text not null default 'general',
  started_at timestamptz not null,
  ended_at timestamptz,
  duration_seconds int,
  participant_count int not null default 1,
  recording_url text,
  status text not null default 'ready',
  created_at timestamptz not null default now()
);

create table meeting_participants (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references meetings(id) on delete cascade,
  name text not null,
  email text,
  is_host boolean not null default false,
  speaker_color text
);

create table transcript_lines (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references meetings(id) on delete cascade,
  participant_id uuid references meeting_participants(id) on delete set null,
  start_seconds numeric not null,
  end_seconds numeric,
  text text not null,
  sequence int not null
);
create index on transcript_lines (meeting_id, sequence);

create table summaries (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references meetings(id) on delete cascade,
  template text not null default 'general',
  content jsonb not null,
  generated_at timestamptz not null default now(),
  unique (meeting_id, template)
);

create table action_items (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references meetings(id) on delete cascade,
  text text not null,
  is_done boolean not null default false,
  timestamp_seconds numeric,
  sequence int not null
);

create table highlights (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references meetings(id) on delete cascade,
  label text not null,
  timestamp_seconds numeric not null,
  created_at timestamptz not null default now()
);

create table shared_clips (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references meetings(id) on delete cascade,
  share_token text not null unique default encode(gen_random_bytes(16), 'hex'),
  title text,
  start_seconds numeric,
  end_seconds numeric,
  created_at timestamptz not null default now()
);

alter table meetings enable row level security;
alter table meeting_participants enable row level security;
alter table transcript_lines enable row level security;
alter table summaries enable row level security;
alter table action_items enable row level security;
alter table highlights enable row level security;
alter table shared_clips enable row level security;

create policy "Users manage their own meetings"
  on meetings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users see participants of their meetings"
  on meeting_participants for all
  using (exists (select 1 from meetings where meetings.id = meeting_participants.meeting_id and meetings.user_id = auth.uid()))
  with check (exists (select 1 from meetings where meetings.id = meeting_participants.meeting_id and meetings.user_id = auth.uid()));

create policy "Users see transcript of their meetings"
  on transcript_lines for all
  using (exists (select 1 from meetings where meetings.id = transcript_lines.meeting_id and meetings.user_id = auth.uid()))
  with check (exists (select 1 from meetings where meetings.id = transcript_lines.meeting_id and meetings.user_id = auth.uid()));

create policy "Users see summaries of their meetings"
  on summaries for all
  using (exists (select 1 from meetings where meetings.id = summaries.meeting_id and meetings.user_id = auth.uid()))
  with check (exists (select 1 from meetings where meetings.id = summaries.meeting_id and meetings.user_id = auth.uid()));

create policy "Users see action items of their meetings"
  on action_items for all
  using (exists (select 1 from meetings where meetings.id = action_items.meeting_id and meetings.user_id = auth.uid()))
  with check (exists (select 1 from meetings where meetings.id = action_items.meeting_id and meetings.user_id = auth.uid()));

create policy "Users see highlights of their meetings"
  on highlights for all
  using (exists (select 1 from meetings where meetings.id = highlights.meeting_id and meetings.user_id = auth.uid()))
  with check (exists (select 1 from meetings where meetings.id = highlights.meeting_id and meetings.user_id = auth.uid()));

create policy "Users manage shared clips of their meetings"
  on shared_clips for all
  using (exists (select 1 from meetings where meetings.id = shared_clips.meeting_id and meetings.user_id = auth.uid()))
  with check (exists (select 1 from meetings where meetings.id = shared_clips.meeting_id and meetings.user_id = auth.uid()));

create policy "Anyone can view a shared clip by token"
  on shared_clips for select
  using (true);
