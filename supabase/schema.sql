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
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  insert into public.profiles(id,name,phase,role,terms_version)
  values(new.id,coalesce(new.raw_user_meta_data->>'name',split_part(coalesce(new.email,'Estudante'),'@',1)),null,'student','v1');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();
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
create policy "published questions read" on public.questions for select using (status='human_reviewed');
create policy "published question versions read" on public.question_versions for select using (
  exists(select 1 from public.questions q where q.id=question_id and q.current_version=version and q.status='human_reviewed')
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
  source_reference text not null,
  source_locator text not null,
  notes text not null check(char_length(notes)>=20),
  created_at timestamptz not null default now(),
  foreign key(question_id,question_version) references public.question_versions(question_id,version)
);
alter table public.editorial_reviews enable row level security;
create policy "editor reviews read" on public.editorial_reviews for select using (public.current_app_role() in ('reviewer','admin'));

drop function if exists public.review_question(uuid,text,boolean,boolean,text);
create or replace function public.review_question(
  p_question_id uuid,
  p_decision text,
  p_clinical_reviewed boolean,
  p_source_verified boolean,
  p_source_reference text,
  p_source_locator text,
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
  if p_decision='approve' and (char_length(trim(p_source_reference))<8 or char_length(trim(p_source_locator))<3) then
    raise exception 'Aprovação exige referência e localizador documental conferidos';
  end if;
  select current_version into v_version from public.questions where id=p_question_id for update;
  if v_version is null then raise exception 'Questão não encontrada'; end if;
  insert into public.editorial_reviews(question_id,question_version,reviewer_id,decision,clinical_reviewed,source_verified,source_reference,source_locator,notes)
  values(p_question_id,v_version,auth.uid(),p_decision,p_clinical_reviewed,p_source_verified,trim(p_source_reference),trim(p_source_locator),trim(p_notes));
  update public.questions set status=case when p_decision='approve' then 'human_reviewed' else 'blocked' end where id=p_question_id;
end $$;
revoke all on function public.review_question(uuid,text,boolean,boolean,text,text,text) from public;
grant execute on function public.review_question(uuid,text,boolean,boolean,text,text,text) to authenticated;

-- Painel nominal restrito ao administrador. Nenhum e-mail é retornado.
create or replace function public.admin_dashboard() returns jsonb
language plpgsql stable security definer set search_path=public as $$
declare result jsonb;
begin
  if public.current_app_role()<>'admin' then raise exception 'Acesso administrativo negado'; end if;
  select jsonb_build_object(
    'summary',jsonb_build_object(
      'students',(select count(*) from public.profiles where role='student'),
      'attempts',(select count(*) from public.attempts),
      'active7',(select count(distinct user_id) from public.attempts where created_at>=now()-interval '7 days'),
      'active30',(select count(distinct user_id) from public.attempts where created_at>=now()-interval '30 days'),
      'correct_rate',(select coalesce(round(100.0*count(*) filter(where is_correct)/nullif(count(*),0),1),0) from public.attempts),
      'high_confidence_errors',(select count(*) from public.attempts where not is_correct and confidence=3),
      'avg_response_ms',(select coalesce(round(avg(response_time_ms)),0) from public.attempts where response_time_ms is not null),
      'ai_cost_usd',(select coalesce(round(sum((provenance->>'estimated_cost_usd')::numeric),4),0) from public.question_versions where provenance ? 'estimated_cost_usd')
    ),
    'students',coalesce((select jsonb_agg(row_to_json(s) order by s.name) from (
      select p.id,p.name,p.phase,count(a.id) attempts,
        coalesce(round(100.0*count(a.id) filter(where a.is_correct)/nullif(count(a.id),0),1),0) correct_rate,
        count(a.id) filter(where not a.is_correct and a.confidence=3) high_confidence_errors,
        max(a.created_at) last_activity
      from public.profiles p left join public.attempts a on a.user_id=p.id
      where p.role='student' group by p.id,p.name,p.phase
    ) s),'[]'::jsonb)
  ) into result;
  return result;
end $$;
revoke all on function public.admin_dashboard() from public;
grant execute on function public.admin_dashboard() to authenticated;

create type public.reference_source_kind as enum ('official_enamed','official_enade_medicine','official_revalida','public_progress_test','third_party_mock','institutional_reference');
create type public.reference_usage_policy as enum ('publishable','reference_only','prohibited');
create table public.reference_sources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  kind public.reference_source_kind not null,
  usage_policy public.reference_usage_policy not null,
  rights_verified boolean not null default false,
  publisher text not null,
  year integer not null check(year between 2000 and 2100),
  source_url text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check(usage_policy<>'publishable' or rights_verified)
);
create table public.reference_items (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.reference_sources(id) on delete cascade,
  external_id text not null,
  locator text not null,
  content_hash text not null check(content_hash~'^[a-f0-9]{64}$'),
  body jsonb,
  metrics jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(source_id,external_id)
);
create or replace function public.enforce_reference_item_policy() returns trigger
language plpgsql set search_path=public as $$
declare policy public.reference_usage_policy;
begin
  select usage_policy into policy from public.reference_sources where id=new.source_id;
  if policy is null then raise exception 'Fonte de referência inexistente'; end if;
  if policy<>'publishable' and new.body is not null then raise exception 'Fonte apenas referencial não pode armazenar texto integral'; end if;
  return new;
end $$;
create trigger reference_item_policy before insert or update on public.reference_items for each row execute procedure public.enforce_reference_item_policy();
alter table public.reference_sources enable row level security;
alter table public.reference_items enable row level security;
create policy "editors read reference sources" on public.reference_sources for select using(public.current_app_role() in ('reviewer','admin'));
create policy "editors read reference items" on public.reference_items for select using(public.current_app_role() in ('reviewer','admin'));
