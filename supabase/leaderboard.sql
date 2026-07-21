-- Setji's Swings — leaderboard schema
-- Run this once in the Supabase SQL Editor
-- (Dashboard → SQL Editor → New query → paste → Run).
--
-- Design notes:
--   * Analysis still happens entirely on-device. Only the final swing SCORE and a
--     chosen HANDLE are stored here, and only when a signed-in player opts in.
--   * One row per player, holding their BEST score, keyed to their account
--     (auth.uid()). Signing in is required to post.
--   * Row-level security is ON: anyone can READ the board, but you can only
--     write your OWN row. No one can edit or delete someone else's entry.
--   * The score is trusted from the client for now (fine for a friendly board).
--     If cheating ever matters, store the raw metrics and recompute the score in
--     a database trigger / Edge Function instead.

-- ── Table ────────────────────────────────────────────────────────────────────
create table if not exists public.leaderboard (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  handle      text not null check (char_length(handle) between 2 and 24),
  best_score  int  not null check (best_score between 0 and 100),
  best_label  text,
  updated_at  timestamptz not null default now()
);

create index if not exists leaderboard_score_idx on public.leaderboard (best_score desc);

-- ── Row-level security ───────────────────────────────────────────────────────
alter table public.leaderboard enable row level security;

-- the board is public to read
drop policy if exists "leaderboard public read" on public.leaderboard;
create policy "leaderboard public read"
  on public.leaderboard for select
  using (true);

-- a signed-in player may create their own row
drop policy if exists "leaderboard own insert" on public.leaderboard;
create policy "leaderboard own insert"
  on public.leaderboard for insert
  with check (auth.uid() = user_id);

-- a signed-in player may update their own row (e.g. a new best)
drop policy if exists "leaderboard own update" on public.leaderboard;
create policy "leaderboard own update"
  on public.leaderboard for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── Profiles: one reserved username per account ──────────────────────────────
-- A username belongs to exactly one account and can't be taken by anyone else.
-- 3–20 chars, letters/numbers/underscore. Case-insensitively unique, so "Birdie"
-- and "birdie" can't both exist.
create table if not exists public.profiles (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  username   text not null check (char_length(username) between 3 and 20 and username ~ '^[A-Za-z0-9_]+$'),
  created_at timestamptz not null default now()
);

create unique index if not exists profiles_username_lower_idx on public.profiles (lower(username));

alter table public.profiles enable row level security;

drop policy if exists "profiles public read" on public.profiles;
create policy "profiles public read"
  on public.profiles for select
  using (true);

drop policy if exists "profiles own insert" on public.profiles;
create policy "profiles own insert"
  on public.profiles for insert
  with check (auth.uid() = user_id);

drop policy if exists "profiles own update" on public.profiles;
create policy "profiles own update"
  on public.profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
