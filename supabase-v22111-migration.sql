-- Agenda Policial v2.21.11
-- Directorio de personal: separación pública / privada.

create table if not exists public.academic_personnel (
  id uuid primary key default gen_random_uuid(),
  app_user_id uuid unique references public.academic_users(id) on delete set null,
  roster_number integer,
  grade text,
  full_name text not null,
  phone text,
  department text,
  source_unit text,
  source_function text,
  course_code text,
  active boolean not null default true,
  source text not null default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists academic_personnel_course_idx on public.academic_personnel(course_code,roster_number);
create index if not exists academic_personnel_department_idx on public.academic_personnel(department);
create index if not exists academic_personnel_name_idx on public.academic_personnel(full_name);
alter table public.academic_personnel enable row level security;

create table if not exists public.academic_personnel_private (
  person_id uuid primary key references public.academic_personnel(id) on delete cascade,
  ci text,
  ci_exp text,
  escalafon text,
  birth_date date,
  blood_type text,
  avc_insured text,
  avc_employer text,
  address_sucre text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.academic_personnel_private enable row level security;

insert into public.academic_personnel(app_user_id,roster_number,grade,full_name,phone,department,course_code,active,source)
select u.id,u.roster_number,case when u.course_code like 'capitanes-%' then 'CAP.' else null end,
       u.full_name,u.phone,u.department,u.course_code,u.active,'academic_users'
from public.academic_users u
where coalesce(u.is_test,false)=false
on conflict (app_user_id) do update set
  roster_number=excluded.roster_number,
  full_name=excluded.full_name,
  phone=excluded.phone,
  department=excluded.department,
  course_code=excluded.course_code,
  active=excluded.active,
  updated_at=now();

create or replace function public.academic_personnel_directory(
  p_course_code text default null,
  p_department text default null,
  p_search text default null
)
returns table(id uuid,roster_number integer,grade text,full_name text,phone text,department text,source_unit text,source_function text,course_code text)
language sql stable security definer set search_path=public,pg_temp
as $$
  select p.id,p.roster_number,p.grade,p.full_name,p.phone,p.department,p.source_unit,p.source_function,p.course_code
  from public.academic_personnel p
  where p.active=true
    and (p_course_code is null or p.course_code=p_course_code)
    and (p_department is null or upper(btrim(coalesce(p.department,'')))=upper(btrim(p_department)))
    and (p_search is null or btrim(p_search)='' or p.full_name ilike '%'||btrim(p_search)||'%' or coalesce(p.source_unit,'') ilike '%'||btrim(p_search)||'%')
  order by p.course_code,p.roster_number nulls last,p.full_name
  limit 500;
$$;
revoke all on function public.academic_personnel_directory(text,text,text) from public;
grant execute on function public.academic_personnel_directory(text,text,text) to anon,authenticated,service_role;

create or replace function public.academic_service_event_roster_v2211(p_token uuid,p_event_id uuid)
returns table(user_id uuid,roster_number integer,full_name text,department text,phone text,checked boolean,status text,checked_at timestamptz,distance_m double precision,within_radius boolean,virtual_class boolean)
language plpgsql stable security definer set search_path=public,pg_temp
as $$
declare v_user public.academic_users; v_course text;
begin
  v_user:=public.academic_current_user(p_token);
  if v_user.id is null then raise exception 'Sesión inválida o vencida'; end if;
  if coalesce(v_user.is_test,false) then raise exception 'Usuario de prueba no autorizado'; end if;
  v_course:=public.academic_session_course(p_token);
  if v_course is null then raise exception 'Curso no seleccionado'; end if;
  if not exists(select 1 from public.academic_service_events e where e.id=p_event_id and e.course_code=v_course) then raise exception 'Formación no encontrada para el paralelo actual'; end if;
  return query
  select u.id,coalesce(m.roster_number,u.roster_number),u.full_name,u.department,u.phone,(c.id is not null),
         case when coalesce(u.virtual_class,false) then 'clase_virtual'::text else coalesce(c.status,'sin_marcar'::text) end,
         c.checked_at,c.distance_m,coalesce(c.within_radius,false),coalesce(u.virtual_class,false)
  from public.academic_course_memberships m
  join public.academic_users u on u.id=m.user_id and u.active=true and coalesce(u.is_test,false)=false
  left join public.academic_service_checkins c on c.event_id=p_event_id and c.user_id=u.id
  where m.course_code=v_course and m.active=true
  order by coalesce(m.roster_number,u.roster_number,2147483647),u.full_name;
end $$;
revoke all on function public.academic_service_event_roster_v2211(uuid,uuid) from public;
grant execute on function public.academic_service_event_roster_v2211(uuid,uuid) to anon,authenticated,service_role;