-- Agenda Policial v2.13.0
-- Control técnico de dispositivos e instalaciones.
-- No usa GPS, contactos, cámara, micrófono, IMEI ni otros permisos sensibles.
-- Seguro para ejecutar más de una vez. No borra usuarios, publicaciones, bancos ni sesiones existentes.

begin;

-- -------------------------------------------------------------------------
-- 1. Base de actividad por dispositivo
-- -------------------------------------------------------------------------
alter table if exists public.academic_sessions
  add column if not exists device_id text;
alter table if exists public.academic_sessions
  add column if not exists last_seen_at timestamptz;

update public.academic_sessions
set last_seen_at=coalesce(last_seen_at,created_at,now())
where last_seen_at is null;

create index if not exists academic_sessions_user_device_idx
  on public.academic_sessions(user_id,device_id)
  where device_id is not null;
create index if not exists academic_sessions_last_seen_idx
  on public.academic_sessions(last_seen_at desc);

create table if not exists public.academic_user_devices(
  user_id uuid not null references public.academic_users(id) on delete cascade,
  device_id text not null,
  platform text,
  browser text,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  device_info jsonb not null default '{}'::jsonb,
  primary key(user_id,device_id)
);

alter table public.academic_user_devices
  add column if not exists device_info jsonb not null default '{}'::jsonb;
alter table public.academic_user_devices enable row level security;
revoke all privileges on table public.academic_user_devices from anon,authenticated;
create index if not exists academic_user_devices_last_seen_idx
  on public.academic_user_devices(user_id,last_seen_at desc);

-- -------------------------------------------------------------------------
-- 2. Registro técnico discreto de una instalación
-- -------------------------------------------------------------------------
create or replace function public.academic_device_touch_v2130(
  p_token uuid,
  p_device_id text,
  p_platform text default null,
  p_browser text default null,
  p_info jsonb default '{}'::jsonb
)
returns table(device_count bigint,recent_device_count bigint,last_seen_at timestamptz)
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare
  u public.academic_users;
  did text;
  now_at timestamptz:=now();
  safe_info jsonb:=coalesce(p_info,'{}'::jsonb);
begin
  u:=public.academic_current_user(p_token);
  if u.id is null then raise exception 'Sesión inválida'; end if;

  did:=left(trim(coalesce(p_device_id,'')),128);
  if length(did)<8 or did !~ '^[A-Za-z0-9._:-]+$' then
    raise exception 'Identificador de dispositivo inválido';
  end if;

  if jsonb_typeof(safe_info)<>'object' then safe_info:='{}'::jsonb; end if;
  if octet_length(safe_info::text)>16000 then safe_info:='{}'::jsonb; end if;

  insert into public.academic_user_devices(
    user_id,device_id,platform,browser,first_seen_at,last_seen_at,device_info
  ) values(
    u.id,did,left(nullif(trim(p_platform),''),80),left(nullif(trim(p_browser),''),80),now_at,now_at,safe_info
  )
  on conflict(user_id,device_id) do update
  set platform=coalesce(excluded.platform,public.academic_user_devices.platform),
      browser=coalesce(excluded.browser,public.academic_user_devices.browser),
      last_seen_at=excluded.last_seen_at,
      device_info=case
        when excluded.device_info='{}'::jsonb then public.academic_user_devices.device_info
        else public.academic_user_devices.device_info || excluded.device_info
      end;

  update public.academic_sessions s
     set device_id=did,last_seen_at=now_at
   where s.token=p_token and s.user_id=u.id;

  return query
  select count(*)::bigint,
         count(*) filter(where d.last_seen_at>=now()-interval '10 minutes')::bigint,
         now_at
  from public.academic_user_devices d
  where d.user_id=u.id;
end
$$;

-- Compatibilidad con clientes v2.12.1-v2.12.9.
create or replace function public.academic_device_touch_v2121(
  p_token uuid,
  p_device_id text,
  p_platform text default null,
  p_browser text default null
)
returns table(device_count bigint,recent_device_count bigint,last_seen_at timestamptz)
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
begin
  return query
  select * from public.academic_device_touch_v2130(
    p_token,p_device_id,p_platform,p_browser,'{}'::jsonb
  );
end
$$;

-- -------------------------------------------------------------------------
-- 3. Nómina con conteo de dispositivos
-- -------------------------------------------------------------------------
create or replace function public.academic_get_users_v2130(p_token uuid)
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
  login_count bigint,
  device_count bigint,
  recent_device_count bigint,
  last_activity_at timestamptz
)
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare
  admin_user public.academic_users;
begin
  admin_user:=public.academic_current_user(p_token);
  if admin_user.id is null or admin_user.role<>'administrador_general' then
    raise exception 'No autorizado';
  end if;

  return query
  with base as (
    select * from public.academic_get_users_v280(p_token)
  ), dev as (
    select d.user_id,
           count(*)::bigint as device_count,
           count(*) filter(where d.last_seen_at>=now()-interval '10 minutes')::bigint as recent_device_count,
           max(d.last_seen_at) as last_activity_at
    from public.academic_user_devices d
    group by d.user_id
  ), ses as (
    select s.user_id,max(s.last_seen_at) as last_session_activity
    from public.academic_sessions s
    where s.expires_at>now()
    group by s.user_id
  )
  select b.id,b.roster_number,b.full_name,b.department,b.ci,b.phone,b.role,b.active,b.is_test,
         b.data_status,b.observation,b.course_code,b.access_ready,b.has_logged_in,
         b.first_login_at,b.last_login_at,b.login_count,
         coalesce(d.device_count,0)::bigint,
         coalesce(d.recent_device_count,0)::bigint,
         greatest(d.last_activity_at,s.last_session_activity,b.last_login_at)
  from base b
  left join dev d on d.user_id=b.id
  left join ses s on s.user_id=b.id
  order by b.roster_number nulls last,b.full_name;
end
$$;

-- Alias de compatibilidad.
create or replace function public.academic_get_users_v2121(p_token uuid)
returns table(
  id uuid,roster_number integer,full_name text,department text,ci text,phone text,role text,
  active boolean,is_test boolean,data_status text,observation text,course_code text,
  access_ready boolean,has_logged_in boolean,first_login_at timestamptz,last_login_at timestamptz,
  login_count bigint,device_count bigint,recent_device_count bigint,last_activity_at timestamptz
)
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
begin
  return query select * from public.academic_get_users_v2130(p_token);
end
$$;

-- -------------------------------------------------------------------------
-- 4. Detalle técnico de cada instalación
-- -------------------------------------------------------------------------
create or replace function public.academic_get_user_devices_v2130(p_token uuid,p_user_id uuid)
returns table(
  device_id text,
  platform text,
  browser text,
  first_seen_at timestamptz,
  last_seen_at timestamptz,
  active_session_count bigint,
  is_recent boolean,
  device_info jsonb
)
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare
  admin_user public.academic_users;
begin
  admin_user:=public.academic_current_user(p_token);
  if admin_user.id is null or admin_user.role<>'administrador_general' then raise exception 'No autorizado'; end if;

  return query
  select d.device_id,d.platform,d.browser,d.first_seen_at,d.last_seen_at,
         count(s.token) filter(where s.expires_at>now())::bigint,
         (d.last_seen_at>=now()-interval '10 minutes'),
         coalesce(d.device_info,'{}'::jsonb)
  from public.academic_user_devices d
  left join public.academic_sessions s
    on s.user_id=d.user_id and s.device_id=d.device_id and s.expires_at>now()
  where d.user_id=p_user_id
  group by d.device_id,d.platform,d.browser,d.first_seen_at,d.last_seen_at,d.device_info
  order by d.last_seen_at desc;
end
$$;

create or replace function public.academic_get_user_devices_v2121(p_token uuid,p_user_id uuid)
returns table(
  device_id text,platform text,browser text,first_seen_at timestamptz,last_seen_at timestamptz,
  active_session_count bigint,is_recent boolean
)
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
begin
  return query
  select x.device_id,x.platform,x.browser,x.first_seen_at,x.last_seen_at,x.active_session_count,x.is_recent
  from public.academic_get_user_devices_v2130(p_token,p_user_id) x;
end
$$;

-- -------------------------------------------------------------------------
-- 5. Cierre administrativo de sesiones por instalación
-- -------------------------------------------------------------------------
create or replace function public.academic_admin_close_device_sessions_v2121(
  p_token uuid,p_user_id uuid,p_device_id text
)
returns integer
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare
  admin_user public.academic_users;
  removed integer:=0;
  current_device text;
begin
  admin_user:=public.academic_current_user(p_token);
  if admin_user.id is null or admin_user.role<>'administrador_general' then raise exception 'No autorizado'; end if;

  select s.device_id into current_device from public.academic_sessions s where s.token=p_token limit 1;
  if p_user_id=admin_user.id and coalesce(current_device,'')=coalesce(p_device_id,'') then
    raise exception 'No puede cerrar desde aquí la sesión administrativa que está utilizando';
  end if;

  delete from public.academic_sessions s
  where s.user_id=p_user_id and s.device_id=p_device_id and s.token<>p_token;
  get diagnostics removed=row_count;

  insert into public.academic_audit_logs(actor_id,action,entity_type,entity_id,details)
  values(admin_user.id,'close_device_sessions','academic_user',p_user_id::text,
    jsonb_build_object('device_id',p_device_id,'sessions_closed',removed));
  return removed;
end
$$;

create or replace function public.academic_admin_close_all_sessions_v2121(p_token uuid,p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare
  admin_user public.academic_users;
  removed integer:=0;
begin
  admin_user:=public.academic_current_user(p_token);
  if admin_user.id is null or admin_user.role<>'administrador_general' then raise exception 'No autorizado'; end if;
  if p_user_id=admin_user.id then raise exception 'No puede cerrar todas sus propias sesiones administrativas desde este control'; end if;

  delete from public.academic_sessions s where s.user_id=p_user_id;
  get diagnostics removed=row_count;

  insert into public.academic_audit_logs(actor_id,action,entity_type,entity_id,details)
  values(admin_user.id,'close_all_sessions','academic_user',p_user_id::text,
    jsonb_build_object('sessions_closed',removed));
  return removed;
end
$$;

-- -------------------------------------------------------------------------
-- 6. Permisos de ejecución
-- -------------------------------------------------------------------------
grant execute on function public.academic_device_touch_v2130(uuid,text,text,text,jsonb) to anon,authenticated,service_role;
grant execute on function public.academic_device_touch_v2121(uuid,text,text,text) to anon,authenticated,service_role;
grant execute on function public.academic_get_users_v2130(uuid) to anon,authenticated,service_role;
grant execute on function public.academic_get_users_v2121(uuid) to anon,authenticated,service_role;
grant execute on function public.academic_get_user_devices_v2130(uuid,uuid) to anon,authenticated,service_role;
grant execute on function public.academic_get_user_devices_v2121(uuid,uuid) to anon,authenticated,service_role;
grant execute on function public.academic_admin_close_device_sessions_v2121(uuid,uuid,text) to anon,authenticated,service_role;
grant execute on function public.academic_admin_close_all_sessions_v2121(uuid,uuid) to anon,authenticated,service_role;

commit;

-- -------------------------------------------------------------------------
-- Verificación (solo lectura)
-- -------------------------------------------------------------------------
select to_regclass('public.academic_user_devices') as tabla_dispositivos;

select p.proname as rpc,pg_get_function_identity_arguments(p.oid) as argumentos
from pg_proc p
join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname in(
  'academic_device_touch_v2130','academic_get_users_v2130','academic_get_user_devices_v2130',
  'academic_device_touch_v2121','academic_get_users_v2121','academic_get_user_devices_v2121',
  'academic_admin_close_device_sessions_v2121','academic_admin_close_all_sessions_v2121'
)
order by p.proname;
