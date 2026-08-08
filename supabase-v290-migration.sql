-- Agenda Policial v2.8.0
-- Estabilización, seguridad del Banco de Preguntas y métricas de uso.
-- Compatible con clientes anteriores: no elimina RPC existentes.

begin;

-- 1) Las tablas internas no deben exponerse directamente al cliente.
alter table if exists public.academic_course_memberships enable row level security;
alter table if exists public.academic_question_banks enable row level security;
alter table if exists public.academic_bank_questions enable row level security;
alter table if exists public.academic_bank_attempts enable row level security;
alter table if exists public.academic_bank_attempt_items enable row level security;
alter table if exists public.academic_bank_answers enable row level security;

revoke all privileges on table public.academic_course_memberships from anon, authenticated;
revoke all privileges on table public.academic_question_banks from anon, authenticated;
revoke all privileges on table public.academic_bank_questions from anon, authenticated;
revoke all privileges on table public.academic_bank_attempts from anon, authenticated;
revoke all privileges on table public.academic_bank_attempt_items from anon, authenticated;
revoke all privileges on table public.academic_bank_answers from anon, authenticated;

-- 2) Índices de integridad y métricas.
create unique index if not exists academic_users_phone_unique
  on public.academic_users (public.academic_digits(phone))
  where is_test=false and nullif(public.academic_digits(phone),'') is not null;

create index if not exists academic_audit_logs_actor_action_created_idx
  on public.academic_audit_logs(actor_id, action, created_at desc);

-- 3) Listado administrativo enriquecido con uso real del panel.
create or replace function public.academic_get_users_v280(p_token uuid)
returns table(
  id uuid,
  roster_number integer,
  full_name text,
  department text,
  ci text,
  phone text,
  role text,
  active boolean,
  is_test boolean,
  data_status text,
  observation text,
  course_code text,
  access_ready boolean,
  has_logged_in boolean,
  first_login_at timestamptz,
  last_login_at timestamptz,
  login_count bigint
)
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare
  u public.academic_users;
  selected_code text;
begin
  u := public.academic_current_user(p_token);
  if u.id is null or u.role <> 'administrador_general' then
    raise exception 'No autorizado';
  end if;

  selected_code := public.academic_session_course(p_token);

  return query
  with access_log as (
    select l.actor_id,
           min(l.created_at) filter (where l.action='login') as first_login_at,
           max(l.created_at) filter (where l.action='login') as last_login_at,
           count(*) filter (where l.action='login')::bigint as login_count
    from public.academic_audit_logs l
    where l.action='login'
    group by l.actor_id
  )
  select a.id,
         a.roster_number,
         a.full_name,
         a.department,
         a.ci,
         a.phone,
         coalesce(m.role,a.role),
         a.active,
         a.is_test,
         a.data_status,
         a.observation,
         selected_code,
         (nullif(public.academic_digits(a.ci),'') is not null
           and nullif(public.academic_digits(a.phone),'') is not null) as access_ready,
         (coalesce(al.login_count,0) > 0) as has_logged_in,
         al.first_login_at,
         al.last_login_at,
         coalesce(al.login_count,0)::bigint
  from public.academic_users a
  left join public.academic_course_memberships m
    on m.user_id=a.id and m.course_code=selected_code and m.active=true
  left join access_log al on al.actor_id=a.id
  where a.course_code=selected_code and a.is_test=false
  order by a.roster_number nulls last,a.full_name;
end
$$;

-- 4) Alta/edición v2.8 con mensajes claros y prevención de duplicados.
create or replace function public.academic_create_user_v280(
  p_token uuid,
  p_roster_number integer,
  p_full_name text,
  p_department text,
  p_ci text,
  p_phone text,
  p_role text,
  p_active boolean
)
returns uuid
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare
  admin_user public.academic_users;
  new_id uuid;
  normalized_active boolean;
  ci_value text := nullif(public.academic_digits(p_ci),'');
  phone_value text := nullif(public.academic_digits(p_phone),'');
begin
  admin_user := public.academic_current_user(p_token);
  if admin_user.id is null or admin_user.role <> 'administrador_general' or admin_user.is_test then
    raise exception 'No autorizado';
  end if;
  if nullif(btrim(coalesce(p_full_name,'')),'') is null then
    raise exception 'Debe registrar apellidos y nombres';
  end if;
  if p_role = 'administrador_general' then
    raise exception 'Solo existe un administrador general';
  end if;
  if p_role not in ('encargado_curso','administrador_academico','asistente_academico','lector') then
    raise exception 'Rol inválido';
  end if;
  if ci_value is not null and exists(
    select 1 from public.academic_users x
    where x.is_test=false and public.academic_digits(x.ci)=ci_value
  ) then
    raise exception 'Ese número de carnet ya está registrado';
  end if;
  if phone_value is not null and exists(
    select 1 from public.academic_users x
    where x.is_test=false and public.academic_digits(x.phone)=phone_value
  ) then
    raise exception 'Ese número de celular ya está registrado';
  end if;

  normalized_active := coalesce(p_active,false) and ci_value is not null and phone_value is not null;

  insert into public.academic_users(
    roster_number,full_name,department,ci,phone,role,active,data_status,course_code
  ) values(
    p_roster_number,btrim(p_full_name),nullif(btrim(p_department),''),ci_value,phone_value,
    p_role,normalized_active,
    case when ci_value is null or phone_value is null then 'pendiente' else 'completo' end,
    admin_user.course_code
  ) returning id into new_id;

  insert into public.academic_audit_logs(actor_id,action,entity_type,entity_id,details)
  values(admin_user.id,'create','academic_user',new_id::text,
         jsonb_build_object('role',p_role,'active',normalized_active,'version','2.8.0'));

  return new_id;
end
$$;

create or replace function public.academic_update_user_v280(
  p_token uuid,
  p_user_id uuid,
  p_roster_number integer,
  p_full_name text,
  p_department text,
  p_ci text,
  p_phone text,
  p_role text,
  p_active boolean
)
returns void
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare
  admin_user public.academic_users;
  target_user public.academic_users;
  normalized_active boolean;
  ci_value text := nullif(public.academic_digits(p_ci),'');
  phone_value text := nullif(public.academic_digits(p_phone),'');
begin
  admin_user := public.academic_current_user(p_token);
  if admin_user.id is null or admin_user.role <> 'administrador_general' or admin_user.is_test then
    raise exception 'No autorizado';
  end if;

  select * into target_user from public.academic_users where id=p_user_id;
  if target_user.id is null or target_user.course_code <> admin_user.course_code then
    raise exception 'Integrante no encontrado';
  end if;
  if target_user.is_test then
    raise exception 'La cuenta de prueba es reservada';
  end if;
  if nullif(btrim(coalesce(p_full_name,'')),'') is null then
    raise exception 'Debe registrar apellidos y nombres';
  end if;
  if target_user.id=admin_user.id and p_role <> 'administrador_general' then
    raise exception 'No puede retirar su propio rol de administrador general';
  end if;
  if target_user.id=admin_user.id and p_active=false then
    raise exception 'No puede desactivar su propia cuenta';
  end if;
  if target_user.id<>admin_user.id and p_role='administrador_general' then
    raise exception 'Solo existe un administrador general';
  end if;
  if p_role not in ('administrador_general','encargado_curso','administrador_academico','asistente_academico','lector') then
    raise exception 'Rol inválido';
  end if;
  if ci_value is not null and exists(
    select 1 from public.academic_users x
    where x.id<>p_user_id and x.is_test=false and public.academic_digits(x.ci)=ci_value
  ) then
    raise exception 'Ese número de carnet ya está registrado';
  end if;
  if phone_value is not null and exists(
    select 1 from public.academic_users x
    where x.id<>p_user_id and x.is_test=false and public.academic_digits(x.phone)=phone_value
  ) then
    raise exception 'Ese número de celular ya está registrado';
  end if;

  normalized_active := coalesce(p_active,false) and ci_value is not null and phone_value is not null;

  update public.academic_users
  set roster_number=p_roster_number,
      full_name=btrim(p_full_name),
      department=nullif(btrim(p_department),''),
      ci=ci_value,
      phone=phone_value,
      role=p_role,
      active=normalized_active,
      data_status=case when ci_value is null or phone_value is null then 'pendiente' else 'completo' end,
      updated_at=now()
  where id=p_user_id;

  insert into public.academic_audit_logs(actor_id,action,entity_type,entity_id,details)
  values(admin_user.id,'update','academic_user',p_user_id::text,
         jsonb_build_object('role',p_role,'active',normalized_active,'version','2.8.0'));
end
$$;

-- El cliente público usa autenticación propia por token de sesión, por eso estas RPC
-- deben seguir siendo invocables con la clave publicable. Las tablas quedan cerradas.
grant execute on function public.academic_get_users_v280(uuid) to anon, authenticated, service_role;
grant execute on function public.academic_create_user_v280(uuid,integer,text,text,text,text,text,boolean) to anon, authenticated, service_role;
grant execute on function public.academic_update_user_v280(uuid,uuid,integer,text,text,text,text,text,boolean) to anon, authenticated, service_role;

-- Estas funciones son helpers de trigger y no deben invocarse directamente por API.
revoke execute on function public.academic_capture_post_history() from public, anon, authenticated;
revoke execute on function public.academic_sync_user_membership() from public, anon, authenticated;

-- Índices de relaciones del Banco para mantener respuestas ágiles al crecer.
create index if not exists academic_bank_answers_question_idx on public.academic_bank_answers(question_id);
create index if not exists academic_bank_attempt_items_question_idx on public.academic_bank_attempt_items(question_id);
create index if not exists academic_bank_attempts_bank_idx on public.academic_bank_attempts(bank_id);
create index if not exists academic_bank_attempts_course_idx on public.academic_bank_attempts(course_code);
create index if not exists academic_question_banks_created_by_idx on public.academic_question_banks(created_by);

commit;

-- =========================================================
-- v2.9.0 — hotfix reproducible del Banco de Preguntas
-- Corrige referencias ambiguas a bank_id al iniciar Estudio/Simulacro.
-- =========================================================
create or replace function public.academic_bank_start_attempt(p_token uuid, p_bank_id uuid, p_mode text)
returns table(attempt_id uuid, bank_id uuid, title text, subject text, topic text, attempt_mode text, passing_score integer, total_questions integer, questions jsonb)
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

  select count(*) into qcount
  from public.academic_bank_questions q
  where q.bank_id=b.id and q.active=true;

  if qcount=0 then raise exception 'El banco todavía no tiene preguntas'; end if;
  qlimit:=case when b.questions_per_attempt>0 then least(b.questions_per_attempt,qcount) else qcount end;

  insert into public.academic_bank_attempts(bank_id,course_code,user_id,mode,passing_score,total_questions)
  values(b.id,selected_code,u.id,requested_mode,b.passing_score,qlimit)
  returning id into aid;

  if b.shuffle_questions then
    insert into public.academic_bank_attempt_items(attempt_id,question_id,position,question_text,option_a,option_b,option_c,option_d,correct_option,explanation)
    select aid,x.id,(row_number() over())::integer,x.question_text,x.option_a,x.option_b,x.option_c,x.option_d,x.correct_option,x.explanation
    from (
      select q.id,q.question_text,q.option_a,q.option_b,q.option_c,q.option_d,q.correct_option,q.explanation
      from public.academic_bank_questions q
      where q.bank_id=b.id and q.active=true
      order by random()
      limit qlimit
    ) x;
  else
    insert into public.academic_bank_attempt_items(attempt_id,question_id,position,question_text,option_a,option_b,option_c,option_d,correct_option,explanation)
    select aid,x.id,(row_number() over(order by x.source_position))::integer,x.question_text,x.option_a,x.option_b,x.option_c,x.option_d,x.correct_option,x.explanation
    from (
      select q.id,q.position as source_position,q.question_text,q.option_a,q.option_b,q.option_c,q.option_d,q.correct_option,q.explanation
      from public.academic_bank_questions q
      where q.bank_id=b.id and q.active=true
      order by q.position
      limit qlimit
    ) x;
  end if;

  return query
  select aid,b.id,b.title,b.subject,b.topic,requested_mode,b.passing_score,qlimit,
    (select jsonb_agg(
       jsonb_build_object(
         'id',i.question_id,
         'position',i.position,
         'question',i.question_text,
         'options',jsonb_build_array(
           jsonb_build_object('key','A','text',i.option_a),
           jsonb_build_object('key','B','text',i.option_b),
           jsonb_build_object('key','C','text',i.option_c),
           jsonb_build_object('key','D','text',i.option_d)
         )
       ) order by i.position
     )
     from public.academic_bank_attempt_items i
     where i.attempt_id=aid);
end
$$;
