-- O treino formativo admite itens que passaram pelo loop automático.
-- Rascunhos, itens experimentais sem gates e bloqueados permanecem invisíveis.
drop policy if exists "published questions read" on public.questions;
create policy "published questions read" on public.questions for select
using(status in ('human_reviewed','auto_verified'));

drop policy if exists "published question versions read" on public.question_versions;
create policy "published question versions read" on public.question_versions for select using(
  exists(
    select 1 from public.questions q
    where q.id=question_id
      and q.current_version=version
      and q.status in ('human_reviewed','auto_verified')
  )
);
