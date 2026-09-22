-- Agenda Policial · Banco de preguntas
-- Integridad V/F aplicada en producción el 2026-09-22.
-- Corrige datos históricos y evita que is_correct pueda derivar de un valor NULL.

update public.academic_bank_questions
set answer_data=jsonb_build_object('correct',correct_option='A'),
    updated_at=now()
where question_type='true_false'
  and (answer_data->>'correct') is null
  and correct_option in ('A','B');

update public.academic_bank_attempt_items
set answer_data=jsonb_build_object('correct',correct_option='A')
where question_type='true_false'
  and (answer_data->>'correct') is null
  and correct_option in ('A','B');

alter table public.academic_bank_questions
  drop constraint if exists academic_bank_questions_true_false_data_v241;
alter table public.academic_bank_questions
  add constraint academic_bank_questions_true_false_data_v241
  check (
    question_type <> 'true_false'
    or (answer_data ? 'correct' and jsonb_typeof(answer_data->'correct')='boolean')
  );

alter table public.academic_bank_attempt_items
  drop constraint if exists academic_bank_attempt_items_true_false_data_v241;
alter table public.academic_bank_attempt_items
  add constraint academic_bank_attempt_items_true_false_data_v241
  check (
    question_type <> 'true_false'
    or (answer_data ? 'correct' and jsonb_typeof(answer_data->'correct')='boolean')
  );

create or replace function public.academic_bank_submit_answer_v210(
  p_token uuid,
  p_attempt_id uuid,
  p_question_id uuid,
  p_selected jsonb
)
returns table(
  is_correct boolean,
  correct_answer jsonb,
  explanation text,
  answered_count integer,
  total_questions integer
)
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $function$
declare
  u public.academic_users;
  a public.academic_bank_attempts;
  item public.academic_bank_attempt_items;
  existing public.academic_bank_answers;
  correct boolean:=false;
  answered integer;
  selected_legacy text:='A';
  selected_text text;
  selected_bool boolean;
  expected_bool boolean;
  expected_matches integer:=0;
  correct_matches integer:=0;
  feedback jsonb;
begin
  u:=public.academic_current_user(p_token);
  if u.id is null then raise exception 'Sesión inválida o vencida'; end if;

  select * into a
  from public.academic_bank_attempts x
  where x.id=p_attempt_id and x.user_id=u.id and x.completed=false;
  if a.id is null then raise exception 'Intento no disponible'; end if;
  if a.course_code<>public.academic_session_course(p_token) then
    raise exception 'Intento no disponible en este curso';
  end if;

  select * into item
  from public.academic_bank_attempt_items i
  where i.attempt_id=a.id and i.question_id=p_question_id;
  if item.question_id is null then raise exception 'Pregunta no pertenece a este intento'; end if;

  select * into existing
  from public.academic_bank_answers x
  where x.attempt_id=a.id and x.question_id=p_question_id;

  if existing.question_id is null then
    if item.question_type='multiple_choice' then
      selected_legacy:=upper(btrim(coalesce(p_selected->>'option','')));
      if selected_legacy not in ('A','B','C','D') then raise exception 'Seleccione una opción válida'; end if;
      if item.correct_option not in ('A','B','C','D') then raise exception 'La pregunta no tiene respuesta correcta configurada'; end if;
      correct:=(selected_legacy=item.correct_option);
      feedback=jsonb_build_object('option',item.correct_option);

    elsif item.question_type='true_false' then
      if not (p_selected ? 'value') then raise exception 'Seleccione Verdadero o Falso'; end if;
      begin
        selected_bool:=(p_selected->>'value')::boolean;
      exception when others then
        raise exception 'Seleccione Verdadero o Falso';
      end;

      if (item.answer_data ? 'correct') and jsonb_typeof(item.answer_data->'correct')='boolean' then
        expected_bool:=(item.answer_data->>'correct')::boolean;
      elsif item.correct_option='A' then
        expected_bool:=true;
      elsif item.correct_option='B' then
        expected_bool:=false;
      else
        raise exception 'La pregunta V/F no tiene respuesta correcta configurada';
      end if;

      correct:=(selected_bool=expected_bool);
      selected_legacy:=case when selected_bool then 'A' else 'B' end;
      feedback=jsonb_build_object('value',expected_bool);

    elsif item.question_type='fill_blank' then
      selected_text:=public.academic_bank_normalize_text_v210(p_selected->>'text');
      if selected_text='' then raise exception 'Escriba una respuesta'; end if;
      select exists(
        select 1
        from jsonb_array_elements_text(coalesce(item.answer_data->'answers','[]'::jsonb)) x(v)
        where public.academic_bank_normalize_text_v210(x.v)=selected_text
      ) into correct;
      feedback=jsonb_build_object('answers',coalesce(item.answer_data->'answers','[]'::jsonb));
      selected_legacy:='A';

    elsif item.question_type='matching' then
      select count(*)::integer,
             count(*) filter(
               where coalesce(p_selected->'matches'->>(x->>'left_id'),'')=coalesce(x->>'right_token','')
             )::integer
      into expected_matches,correct_matches
      from jsonb_array_elements(coalesce(item.answer_data->'pairs','[]'::jsonb)) a2(x);

      if expected_matches=0 then raise exception 'Pregunta de relación inválida'; end if;
      if (select count(*) from jsonb_each_text(coalesce(p_selected->'matches','{}'::jsonb)))<expected_matches then
        raise exception 'Complete todas las relaciones';
      end if;
      correct:=(correct_matches=expected_matches);
      feedback=jsonb_build_object(
        'pairs',
        coalesce(
          (select jsonb_agg(jsonb_build_object('left',x->>'left','right',x->>'right'))
           from jsonb_array_elements(coalesce(item.answer_data->'pairs','[]'::jsonb)) a3(x)),
          '[]'::jsonb
        )
      );
      selected_legacy:='A';
    else
      raise exception 'Tipo de pregunta no soportado';
    end if;

    if correct is null then
      raise exception 'La pregunta no tiene una respuesta correcta válida';
    end if;

    insert into public.academic_bank_answers(
      attempt_id,question_id,selected_option,selected_answer,is_correct,answered_at
    )
    values(
      a.id,item.question_id,selected_legacy,coalesce(p_selected,'{}'::jsonb),correct,now()
    );
  else
    correct:=existing.is_correct;
    if item.question_type='multiple_choice' then
      feedback=jsonb_build_object('option',item.correct_option);
    elsif item.question_type='true_false' then
      if (item.answer_data ? 'correct') and jsonb_typeof(item.answer_data->'correct')='boolean' then
        expected_bool:=(item.answer_data->>'correct')::boolean;
      elsif item.correct_option='A' then expected_bool:=true;
      elsif item.correct_option='B' then expected_bool:=false;
      else raise exception 'La pregunta V/F no tiene respuesta correcta configurada';
      end if;
      feedback=jsonb_build_object('value',expected_bool);
    elsif item.question_type='fill_blank' then
      feedback=jsonb_build_object('answers',coalesce(item.answer_data->'answers','[]'::jsonb));
    elsif item.question_type='matching' then
      feedback=jsonb_build_object(
        'pairs',
        coalesce(
          (select jsonb_agg(jsonb_build_object('left',x->>'left','right',x->>'right'))
           from jsonb_array_elements(coalesce(item.answer_data->'pairs','[]'::jsonb)) a4(x)),
          '[]'::jsonb
        )
      );
    end if;
  end if;

  select count(*)::integer into answered
  from public.academic_bank_answers x
  where x.attempt_id=a.id;

  return query
  select case when a.mode='estudio' then correct else null end,
         case when a.mode='estudio' then feedback else null end,
         case when a.mode='estudio' then item.explanation else null end,
         answered,a.total_questions;
end
$function$;
