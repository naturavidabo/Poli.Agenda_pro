-- Agenda Policial v2.10.0 — Banco de Preguntas Mixto
-- Compatible con bancos anteriores A/B/C/D.

begin;

alter table public.academic_bank_questions
  add column if not exists question_type text not null default 'multiple_choice',
  add column if not exists answer_data jsonb not null default '{}'::jsonb;

alter table public.academic_bank_attempt_items
  add column if not exists question_type text not null default 'multiple_choice',
  add column if not exists answer_data jsonb not null default '{}'::jsonb;

alter table public.academic_bank_answers
  add column if not exists selected_answer jsonb;

-- Todo contenido histórico queda identificado como selección múltiple.
update public.academic_bank_questions
set question_type='multiple_choice'
where question_type is null or btrim(question_type)='';

update public.academic_bank_attempt_items
set question_type='multiple_choice'
where question_type is null or btrim(question_type)='';

-- Restringe nuevos tipos sin alterar la restricción histórica A/B/C/D.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname='academic_bank_questions_question_type_check'
      and conrelid='public.academic_bank_questions'::regclass
  ) then
    alter table public.academic_bank_questions
      add constraint academic_bank_questions_question_type_check
      check (question_type in ('multiple_choice','true_false','matching','fill_blank'));
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname='academic_bank_attempt_items_question_type_check'
      and conrelid='public.academic_bank_attempt_items'::regclass
  ) then
    alter table public.academic_bank_attempt_items
      add constraint academic_bank_attempt_items_question_type_check
      check (question_type in ('multiple_choice','true_false','matching','fill_blank'));
  end if;
end $$;

create index if not exists academic_bank_questions_type_idx
  on public.academic_bank_questions(bank_id,question_type)
  where active=true;

-- Helper interno: normaliza respuestas escritas (mayúsculas/tildes/espacios).
create or replace function public.academic_bank_normalize_text_v210(p_value text)
returns text
language sql
immutable
set search_path to 'public','pg_temp'
as $$
  select btrim(regexp_replace(
    translate(lower(coalesce(p_value,'')),
      'áéíóúüñÁÉÍÓÚÜÑ',
      'aeiouunAEIOUUN'),
    '\\s+',' ','g'));
$$;

-- Helper interno: prepara los datos secretos de una pregunta para un intento.
-- En relacionar conceptos crea tokens aleatorios para que el cliente no pueda
-- deducir la pareja correcta por posición o identificador.
create or replace function public.academic_bank_prepare_attempt_data_v210(p_type text,p_data jsonb)
returns jsonb
language plpgsql
volatile
set search_path to 'public','pg_temp'
as $$
declare result jsonb;
begin
  if p_type='matching' then
    select jsonb_build_object('pairs',coalesce(jsonb_agg(
      jsonb_build_object(
        'left_id','L'||ord::text,
        'left',coalesce(elem->>'left',''),
        'right_token',gen_random_uuid()::text,
        'right',coalesce(elem->>'right','')
      ) order by ord
    ),'[]'::jsonb)) into result
    from jsonb_array_elements(coalesce(p_data->'pairs','[]'::jsonb)) with ordinality as e(elem,ord);
    return coalesce(result,'{"pairs":[]}'::jsonb);
  end if;
  return coalesce(p_data,'{}'::jsonb);
end
$$;

-- Helper interno: genera solamente los datos públicos de la pregunta.
create or replace function public.academic_bank_public_data_v210(p_type text,p_data jsonb)
returns jsonb
language plpgsql
volatile
set search_path to 'public','pg_temp'
as $$
declare result jsonb;
begin
  if p_type='matching' then
    select jsonb_build_object(
      'left',coalesce((select jsonb_agg(jsonb_build_object('id',x->>'left_id','text',x->>'left') order by ord)
        from jsonb_array_elements(coalesce(p_data->'pairs','[]'::jsonb)) with ordinality a(x,ord)),'[]'::jsonb),
      'right',coalesce((select jsonb_agg(v.obj order by random())
        from (select jsonb_build_object('id',x->>'right_token','text',x->>'right') obj
              from jsonb_array_elements(coalesce(p_data->'pairs','[]'::jsonb)) a(x)) v),'[]'::jsonb)
    ) into result;
    return result;
  end if;
  return '{}'::jsonb;
end
$$;

-- Lista administrativa con tipo y contenido de corrección.
create or replace function public.academic_bank_admin_questions_v210(p_token uuid,p_bank_id uuid)
returns table(
  id uuid, question_order integer, question_text text,
  option_a text, option_b text, option_c text, option_d text,
  correct_option text, explanation text, question_type text, answer_data jsonb
)
language plpgsql
stable security definer
set search_path to 'public','pg_temp'
as $$
declare u public.academic_users; selected_code text;
begin
  u:=public.academic_current_user(p_token);
  if u.id is null or not public.academic_bank_manager_role(p_token) then raise exception 'No autorizado'; end if;
  selected_code:=public.academic_session_course(p_token);
  if not exists(select 1 from public.academic_question_banks b where b.id=p_bank_id and b.course_code=selected_code and b.active=true) then
    raise exception 'Banco no encontrado';
  end if;
  return query
  select q.id,q.position,q.question_text,q.option_a,q.option_b,q.option_c,q.option_d,
         q.correct_option,q.explanation,q.question_type,q.answer_data
  from public.academic_bank_questions q
  where q.bank_id=p_bank_id and q.active=true
  order by q.position;
end
$$;

-- Guardado manual de cualquiera de los cuatro tipos.
create or replace function public.academic_bank_save_question_v210(
  p_token uuid,p_bank_id uuid,p_question_id uuid,p_question_text text,
  p_question_type text,p_option_a text,p_option_b text,p_option_c text,p_option_d text,
  p_correct_option text,p_answer_data jsonb,p_explanation text
)
returns uuid
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare
  u public.academic_users; selected_code text; qid uuid; next_pos integer;
  qtype text:=lower(btrim(coalesce(p_question_type,'multiple_choice')));
  correct text; data jsonb:=coalesce(p_answer_data,'{}'::jsonb);
  oa text; ob text; oc text; od text; pair_count integer; answer_count integer;
begin
  u:=public.academic_current_user(p_token);
  if u.id is null or not public.academic_bank_manager_role(p_token) or u.is_test then raise exception 'No autorizado'; end if;
  selected_code:=public.academic_session_course(p_token);
  if not exists(select 1 from public.academic_question_banks b where b.id=p_bank_id and b.course_code=selected_code and b.active=true) then raise exception 'Banco no encontrado'; end if;
  if qtype not in ('multiple_choice','true_false','matching','fill_blank') then raise exception 'Tipo de pregunta inválido'; end if;
  if nullif(btrim(coalesce(p_question_text,'')),'') is null then raise exception 'Escriba la pregunta o consigna'; end if;

  if qtype='multiple_choice' then
    oa:=nullif(btrim(coalesce(p_option_a,'')),''); ob:=nullif(btrim(coalesce(p_option_b,'')),'');
    oc:=nullif(btrim(coalesce(p_option_c,'')),''); od:=nullif(btrim(coalesce(p_option_d,'')),'');
    correct:=upper(btrim(coalesce(p_correct_option,'')));
    if oa is null or ob is null or oc is null or od is null then raise exception 'Complete las cuatro opciones'; end if;
    if correct not in ('A','B','C','D') then raise exception 'Respuesta correcta inválida'; end if;
    data:='{}'::jsonb;
  elsif qtype='true_false' then
    oa:='Verdadero'; ob:='Falso'; oc:='—'; od:='—';
    if lower(coalesce(data->>'correct','')) in ('true','verdadero','v','1') then
      data=jsonb_build_object('correct',true); correct:='A';
    elsif lower(coalesce(data->>'correct','')) in ('false','falso','f','0') then
      data=jsonb_build_object('correct',false); correct:='B';
    else raise exception 'Indique si la afirmación es Verdadera o Falsa'; end if;
  elsif qtype='fill_blank' then
    select count(*)::integer into answer_count
    from jsonb_array_elements_text(coalesce(data->'answers','[]'::jsonb)) a
    where nullif(public.academic_bank_normalize_text_v210(a),'') is not null;
    if answer_count=0 then raise exception 'Agregue al menos una respuesta aceptada'; end if;
    select jsonb_build_object('answers',jsonb_agg(v order by ord)) into data
    from (
      select btrim(a) v,ord
      from jsonb_array_elements_text(coalesce(data->'answers','[]'::jsonb)) with ordinality e(a,ord)
      where nullif(public.academic_bank_normalize_text_v210(a),'') is not null
    ) s;
    oa:=coalesce(data->'answers'->>0,'Respuesta'); ob:='—'; oc:='—'; od:='—'; correct:='A';
  else
    select count(*)::integer into pair_count
    from jsonb_array_elements(coalesce(data->'pairs','[]'::jsonb)) e
    where nullif(btrim(coalesce(e->>'left','')),'') is not null
      and nullif(btrim(coalesce(e->>'right','')),'') is not null;
    if pair_count<2 then raise exception 'Relacionar conceptos necesita al menos dos pares completos'; end if;
    select jsonb_build_object('pairs',jsonb_agg(jsonb_build_object('left',l,'right',r) order by ord)) into data
    from (
      select btrim(e->>'left') l,btrim(e->>'right') r,ord
      from jsonb_array_elements(coalesce(data->'pairs','[]'::jsonb)) with ordinality x(e,ord)
      where nullif(btrim(coalesce(e->>'left','')),'') is not null
        and nullif(btrim(coalesce(e->>'right','')),'') is not null
    ) s;
    oa:='—'; ob:='—'; oc:='—'; od:='—'; correct:='A';
  end if;

  if p_question_id is not null then
    update public.academic_bank_questions
    set question_text=btrim(p_question_text),question_type=qtype,
        option_a=oa,option_b=ob,option_c=oc,option_d=od,correct_option=correct,
        answer_data=data,explanation=nullif(btrim(coalesce(p_explanation,'')),''),updated_at=now()
    where id=p_question_id and bank_id=p_bank_id and active=true returning id into qid;
    if qid is null then raise exception 'Pregunta no encontrada'; end if;
  else
    select coalesce(max(q.position),0)+1 into next_pos from public.academic_bank_questions q where q.bank_id=p_bank_id;
    insert into public.academic_bank_questions(
      bank_id,position,question_text,question_type,option_a,option_b,option_c,option_d,
      correct_option,answer_data,explanation
    ) values(
      p_bank_id,next_pos,btrim(p_question_text),qtype,oa,ob,oc,od,correct,data,
      nullif(btrim(coalesce(p_explanation,'')),'')
    ) returning id into qid;
  end if;
  update public.academic_question_banks set updated_at=now() where id=p_bank_id;
  return qid;
end
$$;

-- Importación masiva mixta. Los CSV antiguos continúan funcionando como selección múltiple.
create or replace function public.academic_bank_import_questions_v210(p_token uuid,p_bank_id uuid,p_rows jsonb)
returns integer
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare
  u public.academic_users; selected_code text; r jsonb; imported integer:=0; qid uuid;
begin
  u:=public.academic_current_user(p_token);
  if u.id is null or not public.academic_bank_manager_role(p_token) or u.is_test then raise exception 'No autorizado'; end if;
  selected_code:=public.academic_session_course(p_token);
  if not exists(select 1 from public.academic_question_banks b where b.id=p_bank_id and b.course_code=selected_code and b.active=true) then raise exception 'Banco no encontrado'; end if;
  for r in select value from jsonb_array_elements(coalesce(p_rows,'[]'::jsonb)) loop
    begin
      qid:=public.academic_bank_save_question_v210(
        p_token,p_bank_id,null,
        coalesce(r->>'question',''),coalesce(r->>'type','multiple_choice'),
        coalesce(r->>'A',''),coalesce(r->>'B',''),coalesce(r->>'C',''),coalesce(r->>'D',''),
        coalesce(r->>'correct',''),coalesce(r->'answer_data','{}'::jsonb),coalesce(r->>'explanation','')
      );
      if qid is not null then imported:=imported+1; end if;
    exception when others then
      -- Una fila inválida no cancela las demás; el cliente ya muestra vista previa.
      null;
    end;
  end loop;
  return imported;
end
$$;

-- Inicia un intento moderno. Si hay varios tipos y se mezclan preguntas,
-- garantiza al menos una pregunta de cada modalidad disponible y completa el resto al azar.
create or replace function public.academic_bank_start_attempt_v210(p_token uuid,p_bank_id uuid,p_mode text)
returns table(attempt_id uuid,bank_id uuid,title text,subject text,topic text,attempt_mode text,passing_score integer,total_questions integer,questions jsonb)
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare
  u public.academic_users; selected_code text; b public.academic_question_banks;
  requested_mode text:=lower(btrim(coalesce(p_mode,''))); aid uuid; qlimit integer; qcount integer;
begin
  u:=public.academic_current_user(p_token); if u.id is null then raise exception 'Sesión inválida o vencida'; end if;
  selected_code:=public.academic_session_course(p_token);
  select qb.* into b from public.academic_question_banks qb
  where qb.id=p_bank_id and qb.course_code=selected_code and qb.active=true and qb.published=true;
  if b.id is null then raise exception 'Banco no disponible'; end if;
  if requested_mode not in ('estudio','evaluacion') then raise exception 'Modalidad inválida'; end if;
  if b.bank_mode='estudio' and requested_mode<>'estudio' then raise exception 'Este banco está disponible solo para estudio'; end if;
  if b.bank_mode='evaluacion' and requested_mode<>'evaluacion' then raise exception 'Este banco está disponible solo para evaluación'; end if;

  select count(*) into qcount from public.academic_bank_questions q where q.bank_id=b.id and q.active=true;
  if qcount=0 then raise exception 'El banco todavía no tiene preguntas'; end if;
  qlimit:=case when b.questions_per_attempt>0 then least(b.questions_per_attempt,qcount) else qcount end;

  insert into public.academic_bank_attempts(bank_id,course_code,user_id,mode,passing_score,total_questions)
  values(b.id,selected_code,u.id,requested_mode,b.passing_score,qlimit) returning id into aid;

  if b.shuffle_questions then
    with available as (
      select q.*,row_number() over(partition by q.question_type order by random()) type_rn
      from public.academic_bank_questions q where q.bank_id=b.id and q.active=true
    ), seeds as (
      select * from available where type_rn=1 order by random() limit qlimit
    ), remainder as (
      select a.* from available a
      where not exists(select 1 from seeds s where s.id=a.id)
      order by random()
      limit greatest(qlimit-(select count(*) from seeds),0)
    ), chosen as (
      select * from seeds union all select * from remainder
    ), randomized as (
      select c.*,row_number() over(order by random())::integer attempt_position
      from chosen c
    )
    insert into public.academic_bank_attempt_items(
      attempt_id,question_id,position,question_text,option_a,option_b,option_c,option_d,
      correct_option,explanation,question_type,answer_data
    )
    select aid,r.id,r.attempt_position,r.question_text,r.option_a,r.option_b,r.option_c,r.option_d,
           r.correct_option,r.explanation,r.question_type,
           public.academic_bank_prepare_attempt_data_v210(r.question_type,r.answer_data)
    from randomized r;
  else
    insert into public.academic_bank_attempt_items(
      attempt_id,question_id,position,question_text,option_a,option_b,option_c,option_d,
      correct_option,explanation,question_type,answer_data
    )
    select aid,q.id,row_number() over(order by q.position)::integer,q.question_text,q.option_a,q.option_b,q.option_c,q.option_d,
           q.correct_option,q.explanation,q.question_type,
           public.academic_bank_prepare_attempt_data_v210(q.question_type,q.answer_data)
    from public.academic_bank_questions q
    where q.bank_id=b.id and q.active=true
    order by q.position limit qlimit;
  end if;

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
    ) from public.academic_bank_attempt_items i where i.attempt_id=aid);
end
$$;

-- Recibe respuestas estructuradas sin enviar las soluciones al cliente en evaluación.
create or replace function public.academic_bank_submit_answer_v210(
  p_token uuid,p_attempt_id uuid,p_question_id uuid,p_selected jsonb
)
returns table(is_correct boolean,correct_answer jsonb,explanation text,answered_count integer,total_questions integer)
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare
  u public.academic_users; a public.academic_bank_attempts; item public.academic_bank_attempt_items;
  existing public.academic_bank_answers; correct boolean:=false; answered integer; selected_legacy text:='A';
  selected_text text; expected_text text; expected_matches integer:=0; correct_matches integer:=0; feedback jsonb;
begin
  u:=public.academic_current_user(p_token); if u.id is null then raise exception 'Sesión inválida o vencida'; end if;
  select * into a from public.academic_bank_attempts x where x.id=p_attempt_id and x.user_id=u.id and x.completed=false;
  if a.id is null then raise exception 'Intento no disponible'; end if;
  if a.course_code<>public.academic_session_course(p_token) then raise exception 'Intento no disponible en este curso'; end if;
  select * into item from public.academic_bank_attempt_items i where i.attempt_id=a.id and i.question_id=p_question_id;
  if item.question_id is null then raise exception 'Pregunta no pertenece a este intento'; end if;
  select * into existing from public.academic_bank_answers x where x.attempt_id=a.id and x.question_id=p_question_id;

  if existing.question_id is null then
    if item.question_type='multiple_choice' then
      selected_legacy:=upper(btrim(coalesce(p_selected->>'option','')));
      if selected_legacy not in ('A','B','C','D') then raise exception 'Seleccione una opción válida'; end if;
      correct:=(selected_legacy=item.correct_option);
      feedback=jsonb_build_object('option',item.correct_option);
    elsif item.question_type='true_false' then
      if not (p_selected ? 'value') then raise exception 'Seleccione Verdadero o Falso'; end if;
      correct:=((p_selected->>'value')::boolean=(item.answer_data->>'correct')::boolean);
      selected_legacy:=case when (p_selected->>'value')::boolean then 'A' else 'B' end;
      feedback=jsonb_build_object('value',(item.answer_data->>'correct')::boolean);
    elsif item.question_type='fill_blank' then
      selected_text:=public.academic_bank_normalize_text_v210(p_selected->>'text');
      if selected_text='' then raise exception 'Escriba una respuesta'; end if;
      select exists(
        select 1 from jsonb_array_elements_text(coalesce(item.answer_data->'answers','[]'::jsonb)) x(v)
        where public.academic_bank_normalize_text_v210(x.v)=selected_text
      ) into correct;
      feedback=jsonb_build_object('answers',coalesce(item.answer_data->'answers','[]'::jsonb));
      selected_legacy:='A';
    elsif item.question_type='matching' then
      select count(*)::integer,
             count(*) filter(where coalesce(p_selected->'matches'->>(x->>'left_id'),'')=coalesce(x->>'right_token',''))::integer
      into expected_matches,correct_matches
      from jsonb_array_elements(coalesce(item.answer_data->'pairs','[]'::jsonb)) a2(x);
      if expected_matches=0 then raise exception 'Pregunta de relación inválida'; end if;
      if (select count(*) from jsonb_each_text(coalesce(p_selected->'matches','{}'::jsonb)))<expected_matches then raise exception 'Complete todas las relaciones'; end if;
      correct:=(correct_matches=expected_matches);
      feedback=jsonb_build_object('pairs',coalesce((select jsonb_agg(jsonb_build_object('left',x->>'left','right',x->>'right')) from jsonb_array_elements(coalesce(item.answer_data->'pairs','[]'::jsonb)) a3(x)),'[]'::jsonb));
      selected_legacy:='A';
    else raise exception 'Tipo de pregunta no soportado'; end if;

    insert into public.academic_bank_answers(attempt_id,question_id,selected_option,selected_answer,is_correct,answered_at)
    values(a.id,item.question_id,selected_legacy,coalesce(p_selected,'{}'::jsonb),correct,now());
  else
    correct:=existing.is_correct;
    -- Reconstruye feedback solamente en estudio.
    if item.question_type='multiple_choice' then feedback=jsonb_build_object('option',item.correct_option);
    elsif item.question_type='true_false' then feedback=jsonb_build_object('value',(item.answer_data->>'correct')::boolean);
    elsif item.question_type='fill_blank' then feedback=jsonb_build_object('answers',coalesce(item.answer_data->'answers','[]'::jsonb));
    elsif item.question_type='matching' then feedback=jsonb_build_object('pairs',coalesce((select jsonb_agg(jsonb_build_object('left',x->>'left','right',x->>'right')) from jsonb_array_elements(coalesce(item.answer_data->'pairs','[]'::jsonb)) a4(x)),'[]'::jsonb));
    end if;
  end if;

  select count(*)::integer into answered from public.academic_bank_answers x where x.attempt_id=a.id;
  return query select
    case when a.mode='estudio' then correct else null end,
    case when a.mode='estudio' then feedback else null end,
    case when a.mode='estudio' then item.explanation else null end,
    answered,a.total_questions;
end
$$;

-- Compatibilidad: versiones anteriores sólo reciben preguntas A/B/C/D.
create or replace function public.academic_bank_start_attempt(p_token uuid,p_bank_id uuid,p_mode text)
returns table(attempt_id uuid, bank_id uuid, title text, subject text, topic text, attempt_mode text, passing_score integer, total_questions integer, questions jsonb)
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare u public.academic_users; selected_code text; b public.academic_question_banks; requested_mode text:=lower(btrim(coalesce(p_mode,''))); aid uuid; qlimit integer; qcount integer;
begin
  u:=public.academic_current_user(p_token); if u.id is null then raise exception 'Sesión inválida o vencida'; end if; selected_code:=public.academic_session_course(p_token);
  select qb.* into b from public.academic_question_banks qb where qb.id=p_bank_id and qb.course_code=selected_code and qb.active=true and qb.published=true;
  if b.id is null then raise exception 'Banco no disponible'; end if;
  if requested_mode not in ('estudio','evaluacion') then raise exception 'Modalidad inválida'; end if;
  if b.bank_mode='estudio' and requested_mode<>'estudio' then raise exception 'Este banco está disponible solo para estudio'; end if;
  if b.bank_mode='evaluacion' and requested_mode<>'evaluacion' then raise exception 'Este banco está disponible solo para evaluación'; end if;
  select count(*) into qcount from public.academic_bank_questions q where q.bank_id=b.id and q.active=true and q.question_type='multiple_choice';
  if qcount=0 then raise exception 'Este banco contiene preguntas mixtas. Actualice Agenda Policial para utilizarlo'; end if;
  qlimit:=case when b.questions_per_attempt>0 then least(b.questions_per_attempt,qcount) else qcount end;
  insert into public.academic_bank_attempts(bank_id,course_code,user_id,mode,passing_score,total_questions) values(b.id,selected_code,u.id,requested_mode,b.passing_score,qlimit) returning id into aid;
  if b.shuffle_questions then
    insert into public.academic_bank_attempt_items(attempt_id,question_id,position,question_text,option_a,option_b,option_c,option_d,correct_option,explanation,question_type,answer_data)
    select aid,x.id,row_number() over()::integer,x.question_text,x.option_a,x.option_b,x.option_c,x.option_d,x.correct_option,x.explanation,'multiple_choice','{}'::jsonb
    from (select q.* from public.academic_bank_questions q where q.bank_id=b.id and q.active=true and q.question_type='multiple_choice' order by random() limit qlimit) x;
  else
    insert into public.academic_bank_attempt_items(attempt_id,question_id,position,question_text,option_a,option_b,option_c,option_d,correct_option,explanation,question_type,answer_data)
    select aid,x.id,row_number() over(order by x.position)::integer,x.question_text,x.option_a,x.option_b,x.option_c,x.option_d,x.correct_option,x.explanation,'multiple_choice','{}'::jsonb
    from (select q.* from public.academic_bank_questions q where q.bank_id=b.id and q.active=true and q.question_type='multiple_choice' order by q.position limit qlimit) x;
  end if;
  return query select aid,b.id,b.title,b.subject,b.topic,requested_mode,b.passing_score,qlimit,
    (select jsonb_agg(jsonb_build_object('id',i.question_id,'position',i.position,'question',i.question_text,'options',jsonb_build_array(
      jsonb_build_object('key','A','text',i.option_a),jsonb_build_object('key','B','text',i.option_b),jsonb_build_object('key','C','text',i.option_c),jsonb_build_object('key','D','text',i.option_d))) order by i.position)
     from public.academic_bank_attempt_items i where i.attempt_id=aid);
end
$$;

grant execute on function public.academic_bank_admin_questions_v210(uuid,uuid) to anon,authenticated,service_role;
grant execute on function public.academic_bank_save_question_v210(uuid,uuid,uuid,text,text,text,text,text,text,text,jsonb,text) to anon,authenticated,service_role;
grant execute on function public.academic_bank_import_questions_v210(uuid,uuid,jsonb) to anon,authenticated,service_role;
grant execute on function public.academic_bank_start_attempt_v210(uuid,uuid,text) to anon,authenticated,service_role;
grant execute on function public.academic_bank_submit_answer_v210(uuid,uuid,uuid,jsonb) to anon,authenticated,service_role;

-- Helpers no son endpoints públicos.
revoke execute on function public.academic_bank_normalize_text_v210(text) from public,anon,authenticated;
revoke execute on function public.academic_bank_prepare_attempt_data_v210(text,jsonb) from public,anon,authenticated;
revoke execute on function public.academic_bank_public_data_v210(text,jsonb) from public,anon,authenticated;

commit;
