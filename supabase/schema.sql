-- Execute no SQL Editor de um projeto Supabase novo.
create type public.app_role as enum ('student','reviewer','analyst','admin');
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  phase smallint check (phase between 1 and 12),
  role public.app_role not null default 'student',
  terms_version text not null,
  terms_accepted_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create table public.questions (
  id uuid primary key default gen_random_uuid(),
  status text not null check(status in ('draft','experimental','auto_verified','human_reviewed','blocked')),
  current_version integer not null default 1,
  created_at timestamptz not null default now()
);
create table public.question_versions (
  question_id uuid references public.questions(id) on delete cascade,
  version integer not null,
  body jsonb not null,
  provenance jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  primary key(question_id,version)
);
create table public.attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  question_id uuid not null,
  question_version integer not null,
  answer text not null,
  confidence smallint not null check(confidence between 1 and 3),
  is_correct boolean not null,
  response_time_ms integer,
  created_at timestamptz not null default now(),
  foreign key(question_id,question_version) references public.question_versions(question_id,version)
);
alter table public.profiles enable row level security;
alter table public.questions enable row level security;
alter table public.question_versions enable row level security;
alter table public.attempts enable row level security;
create policy "profile own read" on public.profiles for select using (auth.uid()=id);
create policy "published questions read" on public.questions for select using (status in ('auto_verified','human_reviewed'));
create policy "published question versions read" on public.question_versions for select using (
  exists(select 1 from public.questions q where q.id=question_id and q.current_version=version and q.status in ('auto_verified','human_reviewed'))
);
create policy "attempt own read" on public.attempts for select using (auth.uid()=user_id);
create policy "attempt own insert" on public.attempts for insert with check (auth.uid()=user_id);
-- Políticas administrativas devem usar claims emitidas pelo servidor; nunca metadados editáveis pelo usuário.
