-- Agenda Policial Online v2.6.5
-- Ejecutar una sola vez en Supabase SQL Editor. Las funciones son idempotentes.
create extension if not exists pgcrypto;

create table if not exists academic_users(
  id uuid primary key default gen_random_uuid(),
  roster_number integer,
  full_name text not null,
  department text,
  ci text unique,
  phone text,
  role text not null default 'lector' check(role in ('administrador_general','encargado_curso','administrador_academico','asistente_academico','lector')),
  active boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table academic_users add column if not exists roster_number integer;
alter table academic_users add column if not exists department text;
alter table academic_users add column if not exists updated_at timestamptz default now();
alter table academic_users alter column ci drop not null;
alter table academic_users alter column phone drop not null;
create unique index if not exists academic_users_roster_number_key on academic_users(roster_number) where roster_number is not null;

create table if not exists academic_sessions(token uuid primary key default gen_random_uuid(),user_id uuid references academic_users(id) on delete cascade,expires_at timestamptz default now()+interval '180 days',created_at timestamptz default now());
create table if not exists academic_posts(id uuid primary key default gen_random_uuid(),post_type text not null check(post_type in ('examenes','formaciones','tareas','resumenes')),title text not null,body text,fields jsonb not null default '{}'::jsonb,file_url text,author_id uuid references academic_users(id),created_at timestamptz default now(),updated_at timestamptz default now(),archived boolean default false);
create table if not exists academic_settings(
  id integer primary key default 1 check(id=1),
  module_enabled boolean not null default true,
  period_name text not null default 'Segundo semestre 2026 — Capitanes A',
  updated_at timestamptz default now()
);
insert into academic_settings(id,module_enabled,period_name) values(1,true,'Segundo semestre 2026 — Capitanes A') on conflict(id) do nothing;
alter table academic_users enable row level security;
alter table academic_sessions enable row level security;
alter table academic_posts enable row level security;
alter table academic_settings enable row level security;

create or replace function academic_current_user(p_token uuid) returns academic_users language sql stable security definer set search_path=public as $$
  select au from academic_sessions s join academic_users au on au.id=s.user_id
  where s.token=p_token and s.expires_at>now() and au.active=true limit 1
$$;
create or replace function academic_login(p_ci text,p_phone text) returns table(session_token uuid,user_id uuid,full_name text,role text) language plpgsql security definer set search_path=public as $$declare u academic_users;t uuid;enabled boolean;begin
  select * into u from academic_users where ci=p_ci and phone=p_phone and ci is not null and phone is not null and active=true limit 1;
  if u.id is null then return;end if;
  select coalesce(module_enabled,true) into enabled from academic_settings where id=1;
  if enabled=false and u.role<>'administrador_general' then return;end if;
  insert into academic_sessions(user_id) values(u.id) returning token into t;
  return query select t,u.id,u.full_name,u.role;
end$$;
create or replace function academic_get_posts(p_token uuid,p_type text) returns table(id uuid,post_type text,title text,body text,fields jsonb,file_url text,author_name text,created_at timestamptz) language sql security definer set search_path=public as $$
  select p.id,p.post_type,p.title,p.body,p.fields,p.file_url,u.full_name,p.created_at
  from academic_posts p join academic_users u on u.id=p.author_id
  where p.archived=false and p.post_type=p_type and academic_current_user(p_token) is not null order by p.created_at desc
$$;
create or replace function academic_create_post(p_token uuid,p_type text,p_title text,p_body text,p_fields jsonb,p_file_url text default null) returns uuid language plpgsql security definer set search_path=public as $$declare u academic_users;newid uuid;begin
  u:=academic_current_user(p_token);if u.id is null or u.role='lector' then raise exception 'No autorizado';end if;
  insert into academic_posts(post_type,title,body,fields,file_url,author_id) values(p_type,p_title,p_body,coalesce(p_fields,'{}'::jsonb),p_file_url,u.id) returning id into newid;return newid;
end$$;
create or replace function academic_get_users(p_token uuid) returns table(id uuid,roster_number integer,full_name text,department text,ci text,phone text,role text,active boolean) language plpgsql security definer set search_path=public as $$declare u academic_users;begin
  u:=academic_current_user(p_token);if u.role<>'administrador_general' then raise exception 'No autorizado';end if;
  return query select au.id,au.roster_number,au.full_name,au.department,au.ci,au.phone,au.role,au.active from academic_users au order by au.roster_number nulls last,au.full_name;
end$$;
create or replace function academic_update_user(p_token uuid,p_user_id uuid,p_roster_number integer,p_full_name text,p_department text,p_ci text,p_phone text,p_role text,p_active boolean) returns void language plpgsql security definer set search_path=public as $$declare admin academic_users;target academic_users;begin
  admin:=academic_current_user(p_token);if admin.role<>'administrador_general' then raise exception 'No autorizado';end if;
  select * into target from academic_users where id=p_user_id;
  if target.id=admin.id and p_role<>'administrador_general' then raise exception 'El administrador general no puede retirar su propio rol';end if;
  if target.id<>admin.id and p_role='administrador_general' then raise exception 'Solo existe un administrador general';end if;
  update academic_users set roster_number=p_roster_number,full_name=p_full_name,department=p_department,ci=nullif(p_ci,''),phone=nullif(p_phone,''),role=p_role,active=p_active,updated_at=now() where id=p_user_id;
end$$;
create or replace function academic_create_user(p_token uuid,p_roster_number integer,p_full_name text,p_department text,p_ci text,p_phone text,p_role text,p_active boolean) returns uuid language plpgsql security definer set search_path=public as $$declare admin academic_users;newid uuid;begin
  admin:=academic_current_user(p_token);if admin.role<>'administrador_general' then raise exception 'No autorizado';end if;
  if p_role='administrador_general' then raise exception 'Solo existe un administrador general';end if;
  insert into academic_users(roster_number,full_name,department,ci,phone,role,active) values(p_roster_number,p_full_name,p_department,nullif(p_ci,''),nullif(p_phone,''),p_role,p_active) returning id into newid;return newid;
end$$;
create or replace function academic_import_users(p_token uuid,p_rows jsonb) returns integer language plpgsql security definer set search_path=public as $$declare admin academic_users;r jsonb;processed integer:=0;rn integer;begin
  admin:=academic_current_user(p_token);if admin.role<>'administrador_general' then raise exception 'No autorizado';end if;
  for r in select * from jsonb_array_elements(p_rows) loop
    rn:=nullif(r->>'roster_number','')::integer;
    insert into academic_users(roster_number,full_name,department,ci,phone,role,active)
    values(rn,r->>'full_name',r->>'department',nullif(r->>'ci',''),nullif(r->>'phone',''),case when r->>'role' in ('encargado_curso','administrador_academico','asistente_academico','lector') then r->>'role' else 'lector' end,coalesce((r->>'active')::boolean,false))
    on conflict (roster_number) where roster_number is not null do update set full_name=excluded.full_name,department=excluded.department,ci=coalesce(excluded.ci,academic_users.ci),phone=coalesce(excluded.phone,academic_users.phone),role=case when academic_users.role='administrador_general' then academic_users.role else excluded.role end,active=case when academic_users.role='administrador_general' then academic_users.active else excluded.active end,updated_at=now();
    processed:=processed+1;
  end loop;return processed;
end$$;


create or replace function academic_close_period(p_token uuid) returns void language plpgsql security definer set search_path=public as $$declare admin academic_users;begin
  admin:=academic_current_user(p_token);if admin.role<>'administrador_general' then raise exception 'No autorizado';end if;
  update academic_settings set module_enabled=false,updated_at=now() where id=1;
  update academic_posts set archived=true,updated_at=now() where archived=false;
  update academic_users set active=false,updated_at=now() where role<>'administrador_general';
  delete from academic_sessions where user_id<>admin.id;
end$$;
create or replace function academic_open_period(p_token uuid,p_period_name text) returns void language plpgsql security definer set search_path=public as $$declare admin academic_users;begin
  admin:=academic_current_user(p_token);if admin.role<>'administrador_general' then raise exception 'No autorizado';end if;
  update academic_settings set module_enabled=true,period_name=coalesce(nullif(p_period_name,''),period_name),updated_at=now() where id=1;
end$$;

grant execute on function academic_login(text,text) to anon,authenticated;
grant execute on function academic_get_posts(uuid,text) to anon,authenticated;
grant execute on function academic_create_post(uuid,text,text,text,jsonb,text) to anon,authenticated;
grant execute on function academic_get_users(uuid) to anon,authenticated;
grant execute on function academic_update_user(uuid,uuid,integer,text,text,text,text,text,boolean) to anon,authenticated;
grant execute on function academic_create_user(uuid,integer,text,text,text,text,text,boolean) to anon,authenticated;
grant execute on function academic_import_users(uuid,jsonb) to anon,authenticated;
grant execute on function academic_close_period(uuid) to anon,authenticated;
grant execute on function academic_open_period(uuid,text) to anon,authenticated;

-- Storage: el bucket academic-files se configura durante la conexión real de Supabase.
-- No exponer service_role dentro de GitHub ni de la aplicación.
