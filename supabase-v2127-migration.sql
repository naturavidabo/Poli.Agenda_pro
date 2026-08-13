-- AGENDA POLICIAL v2.12.7 — BANCO DE 3 MODALIDADES + REPORTES
-- Fecha: 2026-08-12
-- Modalidades activas: Selección múltiple, Verdadero/Falso y Relacionar.
-- Retira "Completar / respuesta escrita" de los intentos y desactiva las preguntas antiguas de ese tipo.
-- También instala/repara el sistema de reportes de preguntas v2.12.1.
-- Idempotente: puede volver a ejecutarse si fuera necesario.

begin;

-- =========================================================
-- 1. Retirar preguntas activas de tipo Completar
-- =========================================================
update public.academic_bank_questions
   set active=false
 where question_type='fill_blank'
   and active=true;

-- Impide que clientes antiguos vuelvan a dejar una pregunta de completar activa.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname='academic_bank_questions_no_active_fill_blank_v2127'
      and conrelid='public.academic_bank_questions'::regclass
  ) then
    alter table public.academic_bank_questions
      add constraint academic_bank_questions_no_active_fill_blank_v2127
      check (question_type <> 'fill_blank' or active=false);
  end if;
end
$$;

-- =========================================================
-- 2. Mezcla automática v2.12.7: SOLO 3 modalidades
--    Distribución orientativa: 60% MC / 25% V-F / 15% Relacionar.
-- =========================================================
create or replace function public.academic_bank_start_attempt_v2127(p_token uuid,p_bank_id uuid,p_mode text)
returns table(
  attempt_id uuid,bank_id uuid,title text,subject text,topic text,attempt_mode text,
  passing_score integer,total_questions integer,questions jsonb,auto_generated boolean
)
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare
  u public.academic_users;
  selected_code text;
  b public.academic_question_banks;
  requested_mode text:=lower(btrim(coalesce(p_mode,'')));
  aid uuid;
  qlimit integer;
  qcount integer;
  non_mc_count integer;
  mc_target integer:=0;
  tf_target integer:=0;
  match_target integer:=0;
  rec record;
  idx integer:=0;
  correct_text text;
  candidate_text text;
  candidate_is_correct boolean;
  match_data jsonb;
  generated boolean:=false;
begin
  u:=public.academic_current_user(p_token);
  if u.id is null then raise exception 'Sesión inválida o vencida'; end if;
  selected_code:=public.academic_session_course(p_token);

  select qb.* into b
  from public.academic_question_banks qb
  where qb.id=p_bank_id
    and qb.course_code=selected_code
    and qb.active=true
    and qb.published=true;

  if b.id is null then raise exception 'Banco no disponible'; end if;
  if requested_mode not in ('estudio','evaluacion') then raise exception 'Modalidad inválida'; end if;
  if b.bank_mode='estudio' and requested_mode<>'estudio' then raise exception 'Este banco está disponible solo para estudio'; end if;
  if b.bank_mode='evaluacion' and requested_mode<>'evaluacion' then raise exception 'Este banco está disponible solo para evaluación'; end if;

  select count(*)::integer,
         count(*) filter(where q.question_type in ('true_false','matching'))::integer
    into qcount,non_mc_count
  from public.academic_bank_questions q
  where q.bank_id=b.id
    and q.active=true
    and q.question_type in ('multiple_choice','true_false','matching');

  if qcount=0 then raise exception 'El banco todavía no tiene preguntas compatibles'; end if;
  qlimit:=case when b.questions_per_attempt>0 then least(b.questions_per_attempt,qcount) else qcount end;

  -- Si el banco ya fue elaborado expresamente con V/F o Relacionar,
  -- conserva la lógica nativa v2.10. Las preguntas fill_blank ya están inactivas.
  if non_mc_count>0 then
    return query
    select x.attempt_id,x.bank_id,x.title,x.subject,x.topic,x.attempt_mode,
           x.passing_score,x.total_questions,x.questions,false
    from public.academic_bank_start_attempt_v210(p_token,p_bank_id,p_mode) x;
    return;
  end if;

  generated:=qlimit>=2;

  if qlimit=1 then
    mc_target:=1;
  elsif qlimit=2 then
    mc_target:=1; tf_target:=1;
  elsif qlimit=3 then
    mc_target:=1; tf_target:=1; match_target:=1;
  else
    match_target:=greatest(1,round(qlimit*0.15)::integer);
    tf_target:=greatest(1,round(qlimit*0.25)::integer);
    mc_target:=qlimit-tf_target-match_target;
    if mc_target<1 then
      mc_target:=1;
      match_target:=greatest(0,qlimit-mc_target-tf_target);
    end if;
  end if;

  insert into public.academic_bank_attempts(bank_id,course_code,user_id,mode,passing_score,total_questions)
  values(b.id,selected_code,u.id,requested_mode,b.passing_score,qlimit)
  returning id into aid;

  create temporary table tmp_v2127_pool(
    rn integer primary key,
    id uuid,
    question_text text,
    option_a text,
    option_b text,
    option_c text,
    option_d text,
    correct_option text,
    explanation text
  ) on commit drop;

  create temporary table tmp_v2127_generated(
    question_id uuid primary key,
    question_text text,
    option_a text,
    option_b text,
    option_c text,
    option_d text,
    correct_option text,
    explanation text,
    question_type text,
    answer_data jsonb
  ) on commit drop;

  insert into tmp_v2127_pool(rn,id,question_text,option_a,option_b,option_c,option_d,correct_option,explanation)
  select row_number() over(order by random())::integer,q.id,q.question_text,
         q.option_a,q.option_b,q.option_c,q.option_d,q.correct_option,q.explanation
  from public.academic_bank_questions q
  where q.bank_id=b.id and q.active=true and q.question_type='multiple_choice'
  order by random()
  limit qlimit;

  for rec in select * from tmp_v2127_pool order by rn loop
    idx:=idx+1;
    correct_text:=case rec.correct_option
      when 'A' then rec.option_a when 'B' then rec.option_b
      when 'C' then rec.option_c when 'D' then rec.option_d else '' end;

    if idx<=mc_target then
      insert into tmp_v2127_generated values(
        rec.id,rec.question_text,rec.option_a,rec.option_b,rec.option_c,rec.option_d,
        rec.correct_option,rec.explanation,'multiple_choice','{}'::jsonb
      );

    elsif idx<=mc_target+tf_target then
      -- Alterna propuestas verdaderas/falsas para reducir sesgo.
      candidate_is_correct:=((idx-mc_target)%2=1);
      if candidate_is_correct then
        candidate_text:=correct_text;
      else
        select v.val into candidate_text
        from (values
          ('A',rec.option_a),('B',rec.option_b),('C',rec.option_c),('D',rec.option_d)
        ) as v(key,val)
        where v.key<>rec.correct_option
        order by random()
        limit 1;
      end if;
      insert into tmp_v2127_generated values(
        rec.id,
        rec.question_text||' — Respuesta propuesta: '||candidate_text,
        'Verdadero','Falso','—','—',
        case when candidate_is_correct then 'A' else 'B' end,
        rec.explanation,'true_false',jsonb_build_object('correct',candidate_is_correct)
      );

    else
      -- Relacionar: pregunta ancla + otras dos preguntas del mismo banco.
      select jsonb_build_object('pairs',jsonb_agg(jsonb_build_object('left',s.question_text,'right',s.correct_text) order by s.ord))
        into match_data
      from (
        select 1 as ord,rec.question_text,
               case rec.correct_option when 'A' then rec.option_a when 'B' then rec.option_b when 'C' then rec.option_c when 'D' then rec.option_d else '' end as correct_text
        union all
        select z.ord+1,z.question_text,z.correct_text
        from (
          select row_number() over(order by random())::integer as ord,q.question_text,
                 case q.correct_option when 'A' then q.option_a when 'B' then q.option_b when 'C' then q.option_c when 'D' then q.option_d else '' end as correct_text
          from public.academic_bank_questions q
          where q.bank_id=b.id and q.active=true and q.question_type='multiple_choice' and q.id<>rec.id
          order by random()
          limit 2
        ) z
      ) s;

      if jsonb_array_length(coalesce(match_data->'pairs','[]'::jsonb))<2 then
        -- Si no hay suficientes pares, vuelve a selección múltiple; nunca a completar.
        insert into tmp_v2127_generated values(
          rec.id,rec.question_text,rec.option_a,rec.option_b,rec.option_c,rec.option_d,
          rec.correct_option,rec.explanation,'multiple_choice','{}'::jsonb
        );
      else
        insert into tmp_v2127_generated values(
          rec.id,'Relacione cada pregunta con su respuesta correcta.',
          '—','—','—','—','A',rec.explanation,'matching',
          public.academic_bank_prepare_attempt_data_v210('matching',match_data)
        );
      end if;
    end if;
  end loop;

  insert into public.academic_bank_attempt_items(
    attempt_id,question_id,position,question_text,option_a,option_b,option_c,option_d,
    correct_option,explanation,question_type,answer_data
  )
  select aid,g.question_id,row_number() over(order by random())::integer,
         g.question_text,g.option_a,g.option_b,g.option_c,g.option_d,g.correct_option,
         g.explanation,g.question_type,g.answer_data
  from tmp_v2127_generated g;

  return query
  select aid,b.id,b.title,b.subject,b.topic,requested_mode,b.passing_score,qlimit,
    (select jsonb_agg(
      jsonb_build_object(
        'id',i.question_id,
        'position',i.position,
        'question',i.question_text,
        'type',i.question_type,
        'options',case when i.question_type='multiple_choice' then jsonb_build_array(
          jsonb_build_object('key','A','text',i.option_a),jsonb_build_object('key','B','text',i.option_b),
          jsonb_build_object('key','C','text',i.option_c),jsonb_build_object('key','D','text',i.option_d)
        ) when i.question_type='true_false' then jsonb_build_array(
          jsonb_build_object('key','true','text','Verdadero'),jsonb_build_object('key','false','text','Falso')
        ) else '[]'::jsonb end,
        'data',public.academic_bank_public_data_v210(i.question_type,i.answer_data)
      ) order by i.position
    ) from public.academic_bank_attempt_items i where i.attempt_id=aid),
    generated;
end
$$;

grant execute on function public.academic_bank_start_attempt_v2127(uuid,uuid,text) to anon,authenticated,service_role;

-- Compatibilidad: clientes v2.12.6 y anteriores que llaman v211 reciben la nueva mezcla de 3 modalidades.
create or replace function public.academic_bank_start_attempt_v211(p_token uuid,p_bank_id uuid,p_mode text)
returns table(
  attempt_id uuid,bank_id uuid,title text,subject text,topic text,attempt_mode text,
  passing_score integer,total_questions integer,questions jsonb,auto_generated boolean
)
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
begin
  return query
  select x.attempt_id,x.bank_id,x.title,x.subject,x.topic,x.attempt_mode,
         x.passing_score,x.total_questions,x.questions,x.auto_generated
  from public.academic_bank_start_attempt_v2127(p_token,p_bank_id,p_mode) x;
end
$$;

grant execute on function public.academic_bank_start_attempt_v211(uuid,uuid,text) to anon,authenticated,service_role;

-- =========================================================
-- 3. Reportes de preguntas (hotfix integrado)
-- =========================================================
create table if not exists public.academic_bank_question_reports(
  id uuid primary key default gen_random_uuid(),
  course_code text not null,
  bank_id uuid not null references public.academic_question_banks(id) on delete cascade,
  question_id uuid references public.academic_bank_questions(id) on delete set null,
  attempt_id uuid references public.academic_bank_attempts(id) on delete set null,
  reporter_id uuid not null references public.academic_users(id) on delete cascade,
  reason text not null check(reason in ('answer_incorrect','wording','duplicate','other')),
  note text,
  snapshot_question text,
  snapshot_type text,
  status text not null default 'open' check(status in ('open','resolved','dismissed')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.academic_users(id) on delete set null
);

alter table public.academic_bank_question_reports enable row level security;
revoke all privileges on table public.academic_bank_question_reports from anon,authenticated;
create index if not exists academic_bank_question_reports_course_status_idx
  on public.academic_bank_question_reports(course_code,status,created_at desc);
create index if not exists academic_bank_question_reports_question_idx
  on public.academic_bank_question_reports(question_id,created_at desc);
create unique index if not exists academic_bank_question_reports_attempt_user_question_key
  on public.academic_bank_question_reports(reporter_id,attempt_id,question_id)
  where attempt_id is not null and question_id is not null;

create or replace function public.academic_bank_report_question_v2121(
  p_token uuid,p_attempt_id uuid,p_question_id uuid,p_reason text,p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare
  u public.academic_users;
  selected_code text;
  bid uuid;
  snap_question text;
  snap_type text;
  rid uuid;
  safe_reason text;
begin
  u:=public.academic_current_user(p_token);
  if u.id is null or u.is_test then raise exception 'Sesión inválida'; end if;
  selected_code:=public.academic_session_course(p_token);
  safe_reason:=case when p_reason in ('answer_incorrect','wording','duplicate','other') then p_reason else 'other' end;

  select a.bank_id,i.question_text,i.question_type
    into bid,snap_question,snap_type
  from public.academic_bank_attempts a
  join public.academic_bank_attempt_items i on i.attempt_id=a.id and i.question_id=p_question_id
  where a.id=p_attempt_id and a.user_id=u.id and a.course_code=selected_code
  limit 1;

  if bid is null then raise exception 'No se encontró esa pregunta en su intento'; end if;

  insert into public.academic_bank_question_reports(
    course_code,bank_id,question_id,attempt_id,reporter_id,reason,note,snapshot_question,snapshot_type,status,created_at
  ) values(
    selected_code,bid,p_question_id,p_attempt_id,u.id,safe_reason,left(nullif(trim(p_note),''),500),snap_question,snap_type,'open',now()
  )
  on conflict(reporter_id,attempt_id,question_id) where attempt_id is not null and question_id is not null
  do update set reason=excluded.reason,note=excluded.note,snapshot_question=excluded.snapshot_question,
                snapshot_type=excluded.snapshot_type,status='open',created_at=now(),resolved_at=null,resolved_by=null
  returning id into rid;

  return rid;
end
$$;

create or replace function public.academic_bank_report_list_v2121(p_token uuid,p_status text default 'open')
returns table(
  id uuid,bank_id uuid,question_id uuid,reason text,note text,status text,created_at timestamptz,
  reporter_name text,subject text,topic text,source_question text,snapshot_question text,snapshot_type text
)
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare
  u public.academic_users;
  selected_code text;
  wanted text;
begin
  u:=public.academic_current_user(p_token);
  if u.id is null or not public.academic_bank_manager_role(p_token) or u.is_test then raise exception 'No autorizado'; end if;
  selected_code:=public.academic_session_course(p_token);
  wanted:=case when p_status in ('open','resolved','dismissed') then p_status else 'open' end;

  return query
  select r.id,r.bank_id,r.question_id,r.reason,r.note,r.status,r.created_at,
         reporter.full_name,b.subject,b.topic,q.question_text,r.snapshot_question,r.snapshot_type
  from public.academic_bank_question_reports r
  join public.academic_question_banks b on b.id=r.bank_id and b.course_code=selected_code
  join public.academic_users reporter on reporter.id=r.reporter_id
  left join public.academic_bank_questions q on q.id=r.question_id
  where r.course_code=selected_code and r.status=wanted
  order by r.created_at desc;
end
$$;

create or replace function public.academic_bank_report_resolve_v2121(
  p_token uuid,p_report_id uuid,p_status text
)
returns void
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare
  u public.academic_users;
  selected_code text;
  wanted text;
begin
  u:=public.academic_current_user(p_token);
  if u.id is null or not public.academic_bank_manager_role(p_token) or u.is_test then raise exception 'No autorizado'; end if;
  selected_code:=public.academic_session_course(p_token);
  wanted:=case when p_status='dismissed' then 'dismissed' else 'resolved' end;

  update public.academic_bank_question_reports r
     set status=wanted,resolved_at=now(),resolved_by=u.id
   where r.id=p_report_id and r.course_code=selected_code and r.status='open';
  if not found then raise exception 'Reporte no encontrado'; end if;

  insert into public.academic_audit_logs(actor_id,action,entity_type,entity_id,details)
  values(u.id,'question_report_'||wanted,'academic_bank_question_report',p_report_id::text,
         jsonb_build_object('course_code',selected_code));
end
$$;

grant execute on function public.academic_bank_report_question_v2121(uuid,uuid,uuid,text,text) to anon,authenticated,service_role;
grant execute on function public.academic_bank_report_list_v2121(uuid,text) to anon,authenticated,service_role;
grant execute on function public.academic_bank_report_resolve_v2121(uuid,uuid,text) to anon,authenticated,service_role;

commit;

-- =========================================================
-- Verificación (solo lectura)
-- =========================================================
select p.proname as rpc, pg_get_function_identity_arguments(p.oid) as argumentos
from pg_proc p
join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname in (
  'academic_bank_start_attempt_v2127',
  'academic_bank_start_attempt_v211',
  'academic_bank_report_question_v2121',
  'academic_bank_report_list_v2121',
  'academic_bank_report_resolve_v2121'
)
order by p.proname;

select count(*) as preguntas_completar_activas
from public.academic_bank_questions
where question_type='fill_blank' and active=true;

select to_regclass('public.academic_bank_question_reports') as tabla_reportes;
