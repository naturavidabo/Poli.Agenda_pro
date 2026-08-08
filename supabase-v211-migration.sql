-- Agenda Policial v2.11.1 — Mezcla Automática de Preguntas
-- Convierte temporalmente bancos históricos A/B/C/D en evaluaciones mixtas.
-- No duplica ni modifica las preguntas originales.

begin;

create or replace function public.academic_bank_start_attempt_v211(p_token uuid,p_bank_id uuid,p_mode text)
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
  fill_target integer:=0;
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
         count(*) filter(where q.question_type<>'multiple_choice')::integer
  into qcount,non_mc_count
  from public.academic_bank_questions q
  where q.bank_id=b.id and q.active=true;

  if qcount=0 then raise exception 'El banco todavía no tiene preguntas'; end if;
  qlimit:=case when b.questions_per_attempt>0 then least(b.questions_per_attempt,qcount) else qcount end;

  -- Si el banco ya contiene preguntas creadas expresamente en varias modalidades,
  -- conserva la lógica nativa v2.10 y no altera ese contenido.
  if non_mc_count>0 then
    return query
    select x.attempt_id,x.bank_id,x.title,x.subject,x.topic,x.attempt_mode,
           x.passing_score,x.total_questions,x.questions,false
    from public.academic_bank_start_attempt_v210(p_token,p_bank_id,p_mode) x;
    return;
  end if;

  generated:=qlimit>=2;

  -- Distribución automática equilibrada. Para 20 preguntas: 10 MC, 4 V/F,
  -- 4 completar y 2 relacionar. Para 30: 15, 6, 6 y 3.
  if qlimit=1 then
    mc_target:=1;
  elsif qlimit=2 then
    mc_target:=1; tf_target:=1;
  elsif qlimit=3 then
    mc_target:=1; tf_target:=1; fill_target:=1;
  else
    match_target:=greatest(1,round(qlimit*0.10)::integer);
    tf_target:=greatest(1,round(qlimit*0.20)::integer);
    fill_target:=greatest(1,round(qlimit*0.20)::integer);
    mc_target:=qlimit-tf_target-fill_target-match_target;
    if mc_target<1 then
      mc_target:=1;
      match_target:=greatest(0,qlimit-mc_target-tf_target-fill_target);
    end if;
  end if;

  insert into public.academic_bank_attempts(bank_id,course_code,user_id,mode,passing_score,total_questions)
  values(b.id,selected_code,u.id,requested_mode,b.passing_score,qlimit)
  returning id into aid;

  create temporary table tmp_v211_pool(
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

  create temporary table tmp_v211_generated(
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

  insert into tmp_v211_pool(rn,id,question_text,option_a,option_b,option_c,option_d,correct_option,explanation)
  select row_number() over(order by random())::integer,q.id,q.question_text,
         q.option_a,q.option_b,q.option_c,q.option_d,q.correct_option,q.explanation
  from public.academic_bank_questions q
  where q.bank_id=b.id and q.active=true and q.question_type='multiple_choice'
  order by random()
  limit qlimit;

  for rec in select * from tmp_v211_pool order by rn loop
    idx:=idx+1;
    correct_text:=case rec.correct_option
      when 'A' then rec.option_a when 'B' then rec.option_b
      when 'C' then rec.option_c when 'D' then rec.option_d else '' end;

    if idx<=mc_target then
      insert into tmp_v211_generated values(
        rec.id,rec.question_text,rec.option_a,rec.option_b,rec.option_c,rec.option_d,
        rec.correct_option,rec.explanation,'multiple_choice','{}'::jsonb
      );

    elsif idx<=mc_target+tf_target then
      -- Alterna respuestas propuestas verdaderas y falsas para evitar sesgo.
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
      insert into tmp_v211_generated values(
        rec.id,
        rec.question_text||' — Respuesta propuesta: '||candidate_text,
        'Verdadero','Falso','—','—',
        case when candidate_is_correct then 'A' else 'B' end,
        rec.explanation,'true_false',jsonb_build_object('correct',candidate_is_correct)
      );

    elsif idx<=mc_target+tf_target+fill_target then
      insert into tmp_v211_generated values(
        rec.id,
        rec.question_text||' — Complete con la respuesta correcta.',
        correct_text,'—','—','—','A',
        rec.explanation,'fill_blank',jsonb_build_object('answers',jsonb_build_array(correct_text))
      );

    else
      -- Relacionar: usa la pregunta ancla más dos preguntas adicionales del mismo banco.
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
        -- Bancos extremadamente pequeños: cae a completar en vez de fallar.
        insert into tmp_v211_generated values(
          rec.id,rec.question_text||' — Complete con la respuesta correcta.',
          correct_text,'—','—','—','A',rec.explanation,'fill_blank',
          jsonb_build_object('answers',jsonb_build_array(correct_text))
        );
      else
        insert into tmp_v211_generated values(
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
  from tmp_v211_generated g;

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

grant execute on function public.academic_bank_start_attempt_v211(uuid,uuid,text) to anon,authenticated,service_role;

commit;


-- v2.11.1 — auditoría de publicación/ocultamiento del Banco
create or replace function public.academic_bank_publish(p_token uuid, p_bank_id uuid, p_published boolean)
returns void
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $function$
declare
  u public.academic_users;
  selected_code text;
  qcount integer;
  previous_published boolean;
begin
  u:=public.academic_current_user(p_token);
  if u.id is null or not public.academic_bank_manager_role(p_token) or u.is_test then raise exception 'No autorizado'; end if;
  selected_code:=public.academic_session_course(p_token);
  select b.published into previous_published from public.academic_question_banks b where b.id=p_bank_id and b.course_code=selected_code and b.active=true;
  if previous_published is null then raise exception 'Banco no encontrado'; end if;
  select count(*) into qcount from public.academic_bank_questions q join public.academic_question_banks b on b.id=q.bank_id where b.id=p_bank_id and b.course_code=selected_code and b.active=true and q.active=true;
  if qcount=0 and coalesce(p_published,false) then raise exception 'Agregue al menos una pregunta antes de publicar'; end if;
  update public.academic_question_banks set published=coalesce(p_published,false),updated_at=now() where id=p_bank_id and course_code=selected_code and active=true;
  if previous_published is distinct from coalesce(p_published,false) then
    insert into public.academic_audit_logs(actor_id,action,entity_type,entity_id,details)
    values(u.id,case when coalesce(p_published,false) then 'publish' else 'unpublish' end,'academic_question_bank',p_bank_id::text,
      jsonb_build_object('course_code',selected_code,'published',coalesce(p_published,false),'previous_published',previous_published));
  end if;
end
$function$;
