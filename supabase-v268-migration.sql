-- Agenda Policial v2.6.8 — respaldo de migración
-- Esta migración ya fue aplicada al proyecto conectado.

create table if not exists public.academic_task_progress (
  post_id uuid not null references public.academic_posts(id) on delete cascade,
  user_id uuid not null references public.academic_users(id) on delete cascade,
  status text not null default 'pendiente' check (status in ('pendiente','entregada')),
  updated_at timestamptz not null default now(),
  primary key (post_id,user_id)
);
alter table public.academic_task_progress enable row level security;
revoke all on table public.academic_task_progress from anon, authenticated;

create or replace function public.academic_get_task_progress(p_token uuid)
returns table(post_id uuid,status text,updated_at timestamptz)
language plpgsql stable security definer set search_path=public,pg_temp
as $$
declare u public.academic_users;
begin
  u:=public.academic_current_user(p_token);
  if u.id is null then raise exception 'Sesión inválida o vencida'; end if;
  return query select p.post_id,p.status,p.updated_at from public.academic_task_progress p
    join public.academic_posts a on a.id=p.post_id
    where p.user_id=u.id and a.course_code=u.course_code and a.archived=false;
end$$;

create or replace function public.academic_set_task_progress(p_token uuid,p_post_id uuid,p_status text)
returns void language plpgsql security definer set search_path=public,pg_temp
as $$
declare u public.academic_users;
begin
  u:=public.academic_current_user(p_token);
  if u.id is null then raise exception 'Sesión inválida o vencida'; end if;
  if p_status not in ('pendiente','entregada') then raise exception 'Estado inválido'; end if;
  if not exists(select 1 from public.academic_posts where id=p_post_id and course_code=u.course_code and post_type='tareas' and archived=false) then raise exception 'Tarea no encontrada'; end if;
  insert into public.academic_task_progress(post_id,user_id,status,updated_at) values(p_post_id,u.id,p_status,now())
    on conflict(post_id,user_id) do update set status=excluded.status,updated_at=now();
end$$;

revoke all on function public.academic_get_task_progress(uuid) from public;
revoke all on function public.academic_set_task_progress(uuid,uuid,text) from public;
grant execute on function public.academic_get_task_progress(uuid) to anon,authenticated;
grant execute on function public.academic_set_task_progress(uuid,uuid,text) to anon,authenticated;

create or replace function public.academic_get_users(p_token uuid)
returns table(id uuid,roster_number integer,full_name text,department text,ci text,phone text,role text,active boolean,is_test boolean,data_status text,observation text,course_code text)
language plpgsql security definer set search_path=public,pg_temp
as $$
declare u public.academic_users;
begin
  u:=public.academic_current_user(p_token);
  if u.role<>'administrador_general' then raise exception 'No autorizado'; end if;
  return query select a.id,a.roster_number,a.full_name,a.department,a.ci,a.phone,a.role,a.active,a.is_test,a.data_status,a.observation,a.course_code
    from public.academic_users a where a.course_code=u.course_code and a.is_test=false
    order by a.roster_number nulls last,a.full_name;
end$$;
revoke all on function public.academic_get_users(uuid) from public;
grant execute on function public.academic_get_users(uuid) to anon,authenticated;

delete from public.academic_schedule_entries where course_code='capitanes-a-2026-2';
insert into public.academic_schedule_entries(course_code,entry_key,day_key,day_label,start_time,end_time,subject,teacher,entry_type,subject_code,place,uniform,observation,sort_order) values
('capitanes-a-2026-2','lu-0645-hora-mistica','lunes','Lunes','06:45','07:15','Hora mística',null,'formacion',null,null,null,null,10),
('capitanes-a-2026-2','lu-0715-organizacin-y-control','lunes','Lunes','07:15','07:30','Organización y control',null,'formacion',null,null,null,null,20),
('capitanes-a-2026-2','ma-0645-organizacion-control','martes','Martes','06:45','07:15','Organización y control',null,'formacion',null,null,null,null,30),
('capitanes-a-2026-2','ma-0715-organizacin-y-control','martes','Martes','07:15','07:30','Organización y control',null,'formacion',null,null,null,null,40),
('capitanes-a-2026-2','mi-0645-organizacion-control','miercoles','Miércoles','06:45','07:15','Organización y control',null,'formacion',null,null,null,null,50),
('capitanes-a-2026-2','mi-0715-organizacin-y-control','miercoles','Miércoles','07:15','07:30','Organización y control',null,'formacion',null,null,null,null,60),
('capitanes-a-2026-2','ju-0645-organizacion-control','jueves','Jueves','06:45','07:15','Organización y control',null,'formacion',null,null,null,null,70),
('capitanes-a-2026-2','ju-0715-organizacin-y-control','jueves','Jueves','07:15','07:30','Organización y control',null,'formacion',null,null,null,null,80),
('capitanes-a-2026-2','vi-0645-organizacion-control','viernes','Viernes','06:45','07:15','Organización y control',null,'formacion',null,null,null,null,90),
('capitanes-a-2026-2','vi-0715-organizacin-y-control','viernes','Viernes','07:15','07:30','Organización y control',null,'formacion',null,null,null,null,100),
('capitanes-a-2026-2','lu-0730-planificacin-estratgica','lunes','Lunes','07:30','08:15','Planificación Estratégica','Lic. Jhoel Montero','clase','CCP-01',null,null,'CCP-01 · Clase programada',110),
('capitanes-a-2026-2','ma-0730-procedimientos-especiales','martes','Martes','07:30','08:15','Procedimientos Especiales','Cnl. DESP. Juan M. Quinteros Portillo','clase','CCP-02',null,null,'CCP-02 · Clase programada',120),
('capitanes-a-2026-2','mi-0730-auditora-gubernamental','miercoles','Miércoles','07:30','08:15','Auditoría Gubernamental','Lic. Shirley Velásquez Miranda','clase','CCP-06',null,null,'CCP-06 · Clase programada',130),
('capitanes-a-2026-2','ju-0730-inteligencia-estratgica','jueves','Jueves','07:30','08:15','Inteligencia Estratégica','My. DIGP. Marcos Herrera Torrez','clase','CCP-04',null,null,'CCP-04 · Clase programada',140),
('capitanes-a-2026-2','vi-0730-ciencia-poltica','viernes','Viernes','07:30','08:15','Ciencia Política','Lic. María Méndez Mamani','clase','CCP-05',null,null,'CCP-05 · Clase programada',150),
('capitanes-a-2026-2','lu-0815-planificacin-estratgica','lunes','Lunes','08:15','09:00','Planificación Estratégica','Lic. Jhoel Montero','clase','CCP-01',null,null,'CCP-01 · Clase programada',160),
('capitanes-a-2026-2','ma-0815-procedimientos-especiales','martes','Martes','08:15','09:00','Procedimientos Especiales','Cnl. DESP. Juan M. Quinteros Portillo','clase','CCP-02',null,null,'CCP-02 · Clase programada',170),
('capitanes-a-2026-2','mi-0815-auditora-gubernamental','miercoles','Miércoles','08:15','09:00','Auditoría Gubernamental','Lic. Shirley Velásquez Miranda','clase','CCP-06',null,null,'CCP-06 · Clase programada',180),
('capitanes-a-2026-2','ju-0815-inteligencia-estratgica','jueves','Jueves','08:15','09:00','Inteligencia Estratégica','My. DIGP. Marcos Herrera Torrez','clase','CCP-04',null,null,'CCP-04 · Clase programada',190),
('capitanes-a-2026-2','vi-0815-ciencia-poltica','viernes','Viernes','08:15','09:00','Ciencia Política','Lic. María Méndez Mamani','clase','CCP-05',null,null,'CCP-05 · Clase programada',200),
('capitanes-a-2026-2','lu-0900-descanso-25-minutos','lunes','Lunes','09:00','09:25','Descanso — 25 minutos',null,'descanso',null,null,null,null,210),
('capitanes-a-2026-2','ma-0900-descanso-25-minutos','martes','Martes','09:00','09:25','Descanso — 25 minutos',null,'descanso',null,null,null,null,220),
('capitanes-a-2026-2','mi-0900-descanso-25-minutos','miercoles','Miércoles','09:00','09:25','Descanso — 25 minutos',null,'descanso',null,null,null,null,230),
('capitanes-a-2026-2','ju-0900-descanso-25-minutos','jueves','Jueves','09:00','09:25','Descanso — 25 minutos',null,'descanso',null,null,null,null,240),
('capitanes-a-2026-2','vi-0900-descanso-25-minutos','viernes','Viernes','09:00','09:25','Descanso — 25 minutos',null,'descanso',null,null,null,null,250),
('capitanes-a-2026-2','lu-0925-administracin-general','lunes','Lunes','09:25','10:10','Administración General','Lic. Claudia Flores Márquez','clase','CCP-03',null,null,'CCP-03 · Clase programada',260),
('capitanes-a-2026-2','ma-0925-procedimientos-especiales','martes','Martes','09:25','10:10','Procedimientos Especiales','Cnl. DESP. Juan M. Quinteros Portillo','clase','CCP-02',null,null,'CCP-02 · Clase programada',270),
('capitanes-a-2026-2','mi-0925-planificacin-estratgica','miercoles','Miércoles','09:25','10:10','Planificación Estratégica','Lic. Jhoel Montero','clase','CCP-01',null,null,'CCP-01 · Clase programada',280),
('capitanes-a-2026-2','ju-0925-inteligencia-estratgica','jueves','Jueves','09:25','10:10','Inteligencia Estratégica','My. DIGP. Marcos Herrera Torrez','clase','CCP-04',null,null,'CCP-04 · Clase programada',290),
('capitanes-a-2026-2','vi-0925-ciencia-poltica','viernes','Viernes','09:25','10:10','Ciencia Política','Lic. María Méndez Mamani','clase','CCP-05',null,null,'CCP-05 · Clase programada',300),
('capitanes-a-2026-2','lu-1010-administracin-general','lunes','Lunes','10:10','10:55','Administración General','Lic. Claudia Flores Márquez','clase','CCP-03',null,null,'CCP-03 · Clase programada',310),
('capitanes-a-2026-2','ma-1010-procedimientos-especiales','martes','Martes','10:10','10:55','Procedimientos Especiales','Cnl. DESP. Juan M. Quinteros Portillo','clase','CCP-02',null,null,'CCP-02 · Clase programada',320),
('capitanes-a-2026-2','mi-1010-planificacin-estratgica','miercoles','Miércoles','10:10','10:55','Planificación Estratégica','Lic. Jhoel Montero','clase','CCP-01',null,null,'CCP-01 · Clase programada',330),
('capitanes-a-2026-2','ju-1010-inteligencia-estratgica','jueves','Jueves','10:10','10:55','Inteligencia Estratégica','My. DIGP. Marcos Herrera Torrez','clase','CCP-04',null,null,'CCP-04 · Clase programada',340),
('capitanes-a-2026-2','vi-1010-ciencia-poltica','viernes','Viernes','10:10','10:55','Ciencia Política','Lic. María Méndez Mamani','clase','CCP-05',null,null,'CCP-05 · Clase programada',350),
('capitanes-a-2026-2','lu-1055-descanso-10-minutos','lunes','Lunes','10:55','11:05','Descanso — 10 minutos',null,'descanso',null,null,null,null,360),
('capitanes-a-2026-2','ma-1055-descanso-10-minutos','martes','Martes','10:55','11:05','Descanso — 10 minutos',null,'descanso',null,null,null,null,370),
('capitanes-a-2026-2','mi-1055-descanso-10-minutos','miercoles','Miércoles','10:55','11:05','Descanso — 10 minutos',null,'descanso',null,null,null,null,380),
('capitanes-a-2026-2','ju-1055-descanso-10-minutos','jueves','Jueves','10:55','11:05','Descanso — 10 minutos',null,'descanso',null,null,null,null,390),
('capitanes-a-2026-2','vi-1055-descanso-10-minutos','viernes','Viernes','10:55','11:05','Descanso — 10 minutos',null,'descanso',null,null,null,null,400),
('capitanes-a-2026-2','lu-1105-administracin-general','lunes','Lunes','11:05','11:50','Administración General','Lic. Claudia Flores Márquez','clase','CCP-03',null,null,'CCP-03 · Clase programada',410),
('capitanes-a-2026-2','ma-1105-ciencia-poltica','martes','Martes','11:05','11:50','Ciencia Política','Lic. María Méndez Mamani','clase','CCP-05',null,null,'CCP-05 · Clase programada',420),
('capitanes-a-2026-2','mi-1105-metodologa-de-investigacin','miercoles','Miércoles','11:05','11:50','Metodología de Investigación','Ing. Ronald Gonzales Soto','clase','CCP-07',null,null,'CCP-07 · Clase programada',430),
('capitanes-a-2026-2','ju-1105-procedimientos-especiales','jueves','Jueves','11:05','11:50','Procedimientos Especiales','Cnl. DESP. Juan M. Quinteros Portillo','clase','CCP-02',null,null,'CCP-02 · Clase programada',440),
('capitanes-a-2026-2','vi-1105-auditora-gubernamental','viernes','Viernes','11:05','11:50','Auditoría Gubernamental','Lic. Shirley Velásquez Miranda','clase','CCP-06',null,null,'CCP-06 · Clase programada',450),
('capitanes-a-2026-2','lu-1150-administracin-general','lunes','Lunes','11:50','12:35','Administración General','Lic. Claudia Flores Márquez','no_lectiva','CCP-03',null,null,'HORARIO NO LECTIVO · NO SE PASAN CLASES',460),
('capitanes-a-2026-2','ma-1150-ciencia-poltica','martes','Martes','11:50','12:35','Ciencia Política','Lic. María Méndez Mamani','no_lectiva','CCP-05',null,null,'HORARIO NO LECTIVO · NO SE PASAN CLASES',470),
('capitanes-a-2026-2','mi-1150-metodologa-de-investigacin','miercoles','Miércoles','11:50','12:35','Metodología de Investigación','Ing. Ronald Gonzales Soto','no_lectiva','CCP-07',null,null,'HORARIO NO LECTIVO · NO SE PASAN CLASES',480),
('capitanes-a-2026-2','ju-1150-procedimientos-especiales','jueves','Jueves','11:50','12:35','Procedimientos Especiales','Cnl. DESP. Juan M. Quinteros Portillo','no_lectiva','CCP-02',null,null,'HORARIO NO LECTIVO · NO SE PASAN CLASES',490),
('capitanes-a-2026-2','vi-1150-auditora-gubernamental','viernes','Viernes','11:50','12:35','Auditoría Gubernamental','Lic. Shirley Velásquez Miranda','no_lectiva','CCP-06',null,null,'HORARIO NO LECTIVO · NO SE PASAN CLASES',500),
('capitanes-a-2026-2','mi-1235-metodologa-de-investigacin','miercoles','Miércoles','12:35','13:20','Metodología de Investigación','Ing. Ronald Gonzales Soto','clase','CCP-07',null,null,'CCP-07 · Clase programada',510),
('capitanes-a-2026-2','lu-1400-acondicionamiento-fsico','lunes','Lunes','14:00','16:00','Acondicionamiento Físico','Lic. Freddy Gardezabal Caballero','clase','CCP-09',null,null,'CCP-09 · Una vez por semana',520),
('capitanes-a-2026-2','ju-1400-tiro-policial','jueves','Jueves','14:00','16:00','Tiro Policial','Tncl. DEAP. Juan C. Encinas Rueda','clase','CCP-08',null,null,'CCP-08 · Una vez por semana',530);

update public.academic_courses set
  template_version='2026-07-28-04',
  catalog_version='2026-07-28-v268',
  updated_at=now(),
  description='Hora mística únicamente el lunes; martes a viernes Organización y control. Los bloques 11:50–12:35 son no lectivos.'
where code='capitanes-a-2026-2';
