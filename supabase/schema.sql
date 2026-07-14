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

-- Governança editorial: papel vem da tabela protegida, não de metadados editáveis no cliente.
create or replace function public.current_app_role() returns public.app_role
language sql stable security definer set search_path=public as $$
  select role from public.profiles where id=auth.uid()
$$;
revoke all on function public.current_app_role() from public;
grant execute on function public.current_app_role() to authenticated;

create policy "editor questions read" on public.questions for select using (public.current_app_role() in ('reviewer','admin'));
create policy "editor versions read" on public.question_versions for select using (public.current_app_role() in ('reviewer','admin'));

create table public.editorial_reviews (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  question_version integer not null,
  reviewer_id uuid not null references public.profiles(id),
  decision text not null check(decision in ('approve','block')),
  clinical_reviewed boolean not null,
  source_verified boolean not null,
  notes text not null check(char_length(notes)>=20),
  created_at timestamptz not null default now(),
  foreign key(question_id,question_version) references public.question_versions(question_id,version)
);
alter table public.editorial_reviews enable row level security;
create policy "editor reviews read" on public.editorial_reviews for select using (public.current_app_role() in ('reviewer','admin'));

create or replace function public.review_question(
  p_question_id uuid,
  p_decision text,
  p_clinical_reviewed boolean,
  p_source_verified boolean,
  p_notes text
) returns void language plpgsql security definer set search_path=public as $$
declare v_version integer;
begin
  if public.current_app_role() not in ('reviewer','admin') then raise exception 'Acesso editorial negado'; end if;
  if p_decision not in ('approve','block') then raise exception 'Decisão inválida'; end if;
  if char_length(trim(p_notes))<20 then raise exception 'Justificativa deve ter ao menos 20 caracteres'; end if;
  if p_decision='approve' and (not p_clinical_reviewed or not p_source_verified) then
    raise exception 'Aprovação exige revisão clínica e fonte documental verificada';
  end if;
  select current_version into v_version from public.questions where id=p_question_id for update;
  if v_version is null then raise exception 'Questão não encontrada'; end if;
  insert into public.editorial_reviews(question_id,question_version,reviewer_id,decision,clinical_reviewed,source_verified,notes)
  values(p_question_id,v_version,auth.uid(),p_decision,p_clinical_reviewed,p_source_verified,trim(p_notes));
  update public.questions set status=case when p_decision='approve' then 'human_reviewed' else 'blocked' end where id=p_question_id;
end $$;
revoke all on function public.review_question(uuid,text,boolean,boolean,text) from public;
grant execute on function public.review_question(uuid,text,boolean,boolean,text) to authenticated;
