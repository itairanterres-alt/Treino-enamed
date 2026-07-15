alter table public.editorial_reviews add column if not exists source_reference text not null default '';
alter table public.editorial_reviews add column if not exists source_locator text not null default '';

drop function if exists public.review_question(uuid,text,boolean,boolean,text);
drop function if exists public.review_question(uuid,text,boolean,boolean,text,text,text);
create function public.review_question(
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
