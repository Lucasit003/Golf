-- Setji's Swings — community swing library schema
-- Run this once in the Supabase SQL Editor (Dashboard → SQL Editor → New query → paste → Run).
--
-- Design notes:
--   * Analysis still happens entirely on-device. This table only holds swings a
--     user has EXPLICITLY chosen to share (consent = true), plus their metrics.
--   * Everything is moderation-gated: a new submission is 'pending' and is NOT
--     publicly visible until it's set to 'approved'. You approve/reject from the
--     Dashboard (Table editor) for now.
--   * Row-level security is ON. The public (anon) key can only read APPROVED
--     swings and insert new PENDING ones — it can never approve, edit, or delete.

-- ── Table ────────────────────────────────────────────────────────────────────
create table if not exists public.swings (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),

  -- what the swing is
  handedness   text check (handedness in ('right','left')),
  angle        text not null check (angle in ('down_the_line','face_on')),
  club         text,
  skill_level  text check (skill_level in ('beginner','intermediate','advanced','pro')),
  caption      text,

  -- measured, on-device (honest values only)
  tempo        numeric,
  metrics      jsonb,

  -- media (objects live in the private 'swing-videos' storage bucket)
  video_path   text not null,
  thumb_path   text,

  -- sharing + safety
  consent      boolean not null default false,
  status       text    not null default 'pending' check (status in ('pending','approved','rejected')),
  reports      integer not null default 0
);

create index if not exists swings_status_created_idx on public.swings (status, created_at desc);
create index if not exists swings_angle_idx on public.swings (angle);

alter table public.swings enable row level security;

-- Anyone (anon) may read only approved swings.
drop policy if exists "read approved" on public.swings;
create policy "read approved"
  on public.swings for select
  using (status = 'approved');

-- Anyone may submit, but only as a pending, consented row. They cannot self-approve.
drop policy if exists "insert pending consented" on public.swings;
create policy "insert pending consented"
  on public.swings for insert
  with check (status = 'pending' and consent = true);

-- ── Storage bucket ───────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('swing-videos', 'swing-videos', false)
on conflict (id) do nothing;

-- Anyone may upload a video (into the bucket). Moderation gates whether it's ever shown.
drop policy if exists "upload swing video" on storage.objects;
create policy "upload swing video"
  on storage.objects for insert
  with check (bucket_id = 'swing-videos');

-- Anyone may read a video ONLY if it belongs to an approved swing.
-- (The app requests a signed URL; this policy decides whether that's allowed.)
drop policy if exists "read approved swing video" on storage.objects;
create policy "read approved swing video"
  on storage.objects for select
  using (
    bucket_id = 'swing-videos'
    and exists (
      select 1 from public.swings s
      where s.status = 'approved'
        and (s.video_path = storage.objects.name or s.thumb_path = storage.objects.name)
    )
  );

-- ── Optional: a small keep-it-tidy default ──────────────────────────────────
-- Cap uploads at ~50 MB in Dashboard → Storage → swing-videos → Settings if you like.
