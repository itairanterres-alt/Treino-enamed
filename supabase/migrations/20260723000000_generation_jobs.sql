-- Fila persistente para produção autônoma de questões.
create table if not exists public.generation_jobs (
  id uuid primary key default gen_random_uuid(),
  requested_by uuid not null references public.profiles(id),
  mode text not null check(mode in ('generate','adapt')),
  status text not null default 'queued' check(status in ('queued','running','paused','completed','failed','cancelled')),
  config jsonb not null default '{}'::jsonb,
  total_items integer not null check(total_items between 1 and 100),
  processed_items integer not null default 0,
  auto_verified_items integer not null default 0,
  blocked_items integer not null default 0,
  failed_items integer not null default 0,
  estimated_cost_usd numeric(12,6) not null default 0,
  budget_usd numeric(10,2) not null check(budget_usd > 0),
  last_error text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  heartbeat_at timestamptz
);

create table if not exists public.generation_job_items (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.generation_jobs(id) on delete cascade,
  position integer not null,
  status text not null default 'pending' check(status in ('pending','running','auto_verified','blocked','failed')),
  input jsonb not null,
  attempts integer not null default 0,
  estimated_cost_usd numeric(12,6) not null default 0,
  result_question_id uuid references public.questions(id),
  last_error text,
  locked_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique(job_id,position)
);

create index if not exists generation_jobs_status_idx on public.generation_jobs(status,created_at);
create index if not exists generation_job_items_pending_idx on public.generation_job_items(status,job_id,position);

alter table public.generation_jobs enable row level security;
alter table public.generation_job_items enable row level security;

create policy "admins read generation jobs" on public.generation_jobs
for select using(public.current_app_role()='admin');

create policy "admins read generation job items" on public.generation_job_items
for select using(
  public.current_app_role()='admin'
  and exists(select 1 from public.generation_jobs j where j.id=job_id)
);

-- Recupera itens abandonados por reinício do servidor e reivindica somente um.
create or replace function public.claim_generation_job_item()
returns table(item_id uuid,job_id uuid,position integer,mode text,config jsonb,input jsonb,budget_usd numeric,current_cost_usd numeric)
language plpgsql security definer set search_path=public as $$
declare selected_item public.generation_job_items;
declare selected_job public.generation_jobs;
begin
  update public.generation_job_items
    set status='pending',locked_at=null,last_error='Execução retomada após interrupção do trabalhador.'
  where status='running' and locked_at < now()-interval '15 minutes';

  select i.* into selected_item
  from public.generation_job_items i
  join public.generation_jobs j on j.id=i.job_id
  where i.status='pending'
    and j.status in ('queued','running')
    and j.estimated_cost_usd < j.budget_usd
  order by j.created_at,i.position
  for update of i skip locked
  limit 1;

  if selected_item.id is null then return; end if;
  select * into selected_job from public.generation_jobs where id=selected_item.job_id for update;
  update public.generation_job_items
    set status='running',attempts=attempts+1,locked_at=now()
    where id=selected_item.id;
  update public.generation_jobs
    set status='running',started_at=coalesce(started_at,now()),heartbeat_at=now()
    where id=selected_item.job_id;

  return query select selected_item.id,selected_job.id,selected_item.position,selected_job.mode,selected_job.config,
    selected_item.input,selected_job.budget_usd,selected_job.estimated_cost_usd;
end $$;

create or replace function public.complete_generation_job_item(
  p_item_id uuid,
  p_outcome text,
  p_question_id uuid,
  p_cost numeric
) returns void
language plpgsql security definer set search_path=public as $$
declare v_job_id uuid;
declare v_remaining integer;
begin
  if p_outcome not in ('auto_verified','blocked') then raise exception 'Desfecho inválido'; end if;
  select job_id into v_job_id from public.generation_job_items where id=p_item_id for update;
  if v_job_id is null then raise exception 'Item da fila não encontrado'; end if;

  update public.generation_job_items set
    status=p_outcome,
    result_question_id=p_question_id,
    estimated_cost_usd=greatest(0,p_cost),
    completed_at=now(),
    locked_at=null,
    last_error=null
  where id=p_item_id;

  update public.generation_jobs set
    processed_items=processed_items+1,
    auto_verified_items=auto_verified_items+(case when p_outcome='auto_verified' then 1 else 0 end),
    blocked_items=blocked_items+(case when p_outcome='blocked' then 1 else 0 end),
    estimated_cost_usd=estimated_cost_usd+greatest(0,p_cost),
    heartbeat_at=now()
  where id=v_job_id;

  select count(*) into v_remaining from public.generation_job_items
  where job_id=v_job_id and status in ('pending','running');

  if v_remaining=0 then
    update public.generation_jobs set status='completed',completed_at=now() where id=v_job_id;
  elsif (select estimated_cost_usd>=budget_usd from public.generation_jobs where id=v_job_id) then
    update public.generation_jobs set status='paused',last_error='Lote pausado ao atingir o orçamento definido.' where id=v_job_id;
  end if;
end $$;

create or replace function public.fail_generation_job_item(p_item_id uuid,p_error text)
returns void language plpgsql security definer set search_path=public as $$
declare v_job_id uuid;
declare v_attempts integer;
declare v_remaining integer;
begin
  select job_id,attempts into v_job_id,v_attempts from public.generation_job_items where id=p_item_id for update;
  if v_job_id is null then raise exception 'Item da fila não encontrado'; end if;

  if v_attempts<3 then
    update public.generation_job_items
      set status='pending',locked_at=null,last_error=left(coalesce(p_error,'Falha desconhecida'),1000)
      where id=p_item_id;
  else
    update public.generation_job_items
      set status='failed',locked_at=null,completed_at=now(),last_error=left(coalesce(p_error,'Falha desconhecida'),1000)
      where id=p_item_id;
    update public.generation_jobs
      set processed_items=processed_items+1,failed_items=failed_items+1,
        last_error=left(coalesce(p_error,'Falha desconhecida'),1000),heartbeat_at=now()
      where id=v_job_id;
  end if;

  select count(*) into v_remaining from public.generation_job_items
  where job_id=v_job_id and status in ('pending','running');
  if v_remaining=0 then
    update public.generation_jobs set status='completed',completed_at=now() where id=v_job_id;
  end if;
end $$;

create or replace function public.pause_generation_job_item(p_item_id uuid,p_error text)
returns void language plpgsql security definer set search_path=public as $$
declare v_job_id uuid;
begin
  select job_id into v_job_id from public.generation_job_items where id=p_item_id for update;
  if v_job_id is null then raise exception 'Item da fila não encontrado'; end if;
  update public.generation_job_items
    set status='pending',locked_at=null,last_error=left(coalesce(p_error,'Lote pausado'),1000)
    where id=p_item_id;
  update public.generation_jobs
    set status='paused',last_error=left(coalesce(p_error,'Lote pausado'),1000),heartbeat_at=now()
    where id=v_job_id;
end $$;

revoke all on function public.claim_generation_job_item() from public,anon,authenticated;
revoke all on function public.complete_generation_job_item(uuid,text,uuid,numeric) from public,anon,authenticated;
revoke all on function public.fail_generation_job_item(uuid,text) from public,anon,authenticated;
revoke all on function public.pause_generation_job_item(uuid,text) from public,anon,authenticated;
grant execute on function public.claim_generation_job_item() to service_role;
grant execute on function public.complete_generation_job_item(uuid,text,uuid,numeric) to service_role;
grant execute on function public.fail_generation_job_item(uuid,text) to service_role;
grant execute on function public.pause_generation_job_item(uuid,text) to service_role;
