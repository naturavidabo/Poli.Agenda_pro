-- AGENDA POLICIAL v2.12.9 — PUBLICACIONES COMPARTIDAS ENTRE PARALELOS
-- Fecha: 2026-08-12
-- Objetivo: compartir Rol de exámenes y Resúmenes entre A y B sin duplicar archivos.
-- Formaciones y Tareas permanecen exclusivas del paralelo activo.
-- Requiere la estructura multicurso activa desde v2.7.7 y academic_create_post_v2 desde v2.7.6.
-- Idempotente: puede ejecutarse nuevamente.

begin;

create table if not exists public.academic_post_audiences_v2129(
  post_id uuid not null references public.academic_posts(id) on delete cascade,
  course_code text not null,
  created_at timestamptz not null default now(),
  primary key(post_id,course_code)
);

create index if not exists academic_post_audiences_v2129_course_idx
  on public.academic_post_audiences_v2129(course_code,post_id);

alter table public.academic_post_audiences_v2129 enable row level security;
revoke all privileges on table public.academic_post_audiences_v2129 from public,anon,authenticated;

-- Cada publicación histórica conserva como audiencia su course_code original.
insert into public.academic_post_audiences_v2129(post_id,course_code)
select p.id,p.course_code
from public.academic_posts p
where nullif(btrim(p.course_code),'') is not null
on conflict(post_id,course_code) do nothing;

-- Clientes anteriores que sigan usando academic_create_post / v2 quedan correctamente
-- asociados a su paralelo original. Las publicaciones compartidas se ajustan después
-- desde academic_create_post_v2129.
create or replace function public.academic_post_default_audience_v2129()
returns trigger
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
begin
  if nullif(btrim(new.course_code),'') is not null then
    insert into public.academic_post_audiences_v2129(post_id,course_code)
    values(new.id,new.course_code)
    on conflict(post_id,course_code) do nothing;
  end if;
  return new;
end
$$;

drop trigger if exists academic_post_default_audience_v2129_trg on public.academic_posts;
create trigger academic_post_default_audience_v2129_trg
after insert on public.academic_posts
for each row execute function public.academic_post_default_audience_v2129();

-- Lectura: cada usuario ve publicaciones dirigidas al curso que tiene seleccionado.
create or replace function public.academic_get_posts_v2129(
  p_token uuid,
  p_type text
)
returns setof jsonb
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare
  u public.academic_users;
  selected_code text;
begin
  u:=public.academic_current_user(p_token);
  if u.id is null then raise exception 'Sesión inválida o vencida'; end if;
  selected_code:=public.academic_session_course(p_token);
  if nullif(selected_code,'') is null then raise exception 'Curso no seleccionado'; end if;

  return query
  select to_jsonb(p)
         || jsonb_build_object(
              'author_name',coalesce(author_user.full_name,''),
              'target_courses',coalesce(aud.targets,'[]'::jsonb),
              'shared_between_courses',coalesce(jsonb_array_length(aud.targets),0)>1
            )
  from public.academic_posts p
  join public.academic_post_audiences_v2129 own_audience
    on own_audience.post_id=p.id and own_audience.course_code=selected_code
  left join public.academic_users author_user on author_user.id=p.author_id
  left join lateral(
    select jsonb_agg(x.course_code order by x.course_code) as targets
    from public.academic_post_audiences_v2129 x
    where x.post_id=p.id
  ) aud on true
  where p.archived=false
    and (p_type is null or p.post_type=p_type)
  order by p.created_at desc;
end
$$;

-- Creación compartida. Reutiliza academic_create_post_v2 para no perder:
-- adjuntos, manifiestos, historial, auditoría ni prevención de duplicados.
create or replace function public.academic_create_post_v2129(
  p_token uuid,
  p_type text,
  p_title text,
  p_body text,
  p_fields jsonb,
  p_file_url text default null,
  p_file_name text default null,
  p_file_mime text default null,
  p_file_size bigint default null,
  p_client_request_id text default null,
  p_target_courses text[] default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare
  u public.academic_users;
  selected_code text;
  requested text[];
  targets text[];
  created jsonb;
  new_id uuid;
  target_code text;
  allowed_count integer;
begin
  u:=public.academic_current_user(p_token);
  if u.id is null or coalesce(u.is_test,false) then raise exception 'Sesión inválida'; end if;
  selected_code:=public.academic_session_course(p_token);
  if nullif(selected_code,'') is null then raise exception 'Curso no seleccionado'; end if;

  -- Formaciones y tareas nunca se comparten en esta etapa.
  if p_type in ('formaciones','tareas') then
    targets:=array[selected_code];
  elsif u.role='administrador_general' and p_type in ('examenes','resumenes') then
    requested:=coalesce(p_target_courses,array[selected_code]);
    select coalesce(array_agg(distinct c.code order by c.code),array[]::text[])
      into targets
    from public.academic_courses c
    where c.code=any(requested)
      and coalesce(c.module_enabled,true)=true;
    if cardinality(targets)=0 then raise exception 'No existe un curso destinatario válido'; end if;
    select count(*) into allowed_count from unnest(requested) r where r=any(targets);
    if allowed_count<>cardinality(requested) then raise exception 'Uno de los paralelos seleccionados no está habilitado'; end if;
  else
    targets:=array[selected_code];
  end if;

  -- No se permite compartir otros módulos por error.
  if cardinality(targets)>1 and p_type not in ('examenes','resumenes') then
    raise exception 'Este módulo no admite publicación compartida';
  end if;

  select to_jsonb(x) into created
  from public.academic_create_post_v2(
    p_token,
    p_type,
    p_title,
    p_body,
    coalesce(p_fields,'{}'::jsonb),
    p_file_url,
    p_file_name,
    p_file_mime,
    p_file_size,
    p_client_request_id
  ) x;

  if created is null or nullif(created->>'id','') is null then
    raise exception 'El servidor no confirmó la publicación';
  end if;
  new_id:=(created->>'id')::uuid;

  -- La audiencia final reemplaza la audiencia automática del trigger.
  delete from public.academic_post_audiences_v2129 where post_id=new_id;
  foreach target_code in array targets loop
    insert into public.academic_post_audiences_v2129(post_id,course_code)
    values(new_id,target_code)
    on conflict(post_id,course_code) do nothing;
  end loop;

  -- Si se publicó SOLO para otro paralelo, también ajusta course_code para que
  -- clientes anteriores no muestren el contenido en el paralelo de origen.
  if cardinality(targets)=1 and targets[1]<>selected_code then
    update public.academic_posts set course_code=targets[1],updated_at=now() where id=new_id;
  end if;

  insert into public.academic_audit_logs(actor_id,action,entity_type,entity_id,details)
  values(
    u.id,'post_audience_v2129','academic_post',new_id::text,
    jsonb_build_object('source_course',selected_code,'target_courses',targets,'post_type',p_type,'version','2.12.9')
  );

  return created
    || jsonb_build_object(
         'target_courses',to_jsonb(targets),
         'shared_between_courses',cardinality(targets)>1
       );
end
$$;

grant execute on function public.academic_get_posts_v2129(uuid,text) to anon,authenticated,service_role;
grant execute on function public.academic_create_post_v2129(uuid,text,text,text,jsonb,text,text,text,bigint,text,text[]) to anon,authenticated,service_role;

commit;

-- VERIFICACIÓN (debe devolver las 2 funciones y la tabla)
select p.proname as rpc,pg_get_function_identity_arguments(p.oid) as argumentos
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname in('academic_get_posts_v2129','academic_create_post_v2129')
order by p.proname;

select to_regclass('public.academic_post_audiences_v2129') as tabla_audiencias;
