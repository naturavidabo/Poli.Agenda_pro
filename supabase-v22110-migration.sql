-- Agenda Policial v2.21.10
-- Bloqueo de marcación GPS cuando la precisión reportada es peor a 35 m.

create or replace function public.academic_service_checkin(
  p_token uuid,
  p_event_id uuid,
  p_latitude double precision,
  p_longitude double precision,
  p_accuracy_m double precision default null,
  p_device_id text default null
)
returns table(ok boolean, status text, distance_m double precision, within_radius boolean, checked_at timestamptz)
language plpgsql
security definer
set search_path = 'public', 'pg_temp'
as $function$
declare
  s record;
  e record;
  d double precision;
  st text;
  inside boolean;
  ts timestamptz := now();
begin
  select se.user_id, se.selected_course_code into s
  from public.academic_sessions se
  where se.token = p_token and se.expires_at > now();
  if s.user_id is null then raise exception 'Sesión inválida'; end if;

  if p_latitude is null or p_longitude is null
     or p_latitude < -90 or p_latitude > 90
     or p_longitude < -180 or p_longitude > 180
     or (p_latitude = 0 and p_longitude = 0) then
    raise exception 'Coordenadas GPS inválidas';
  end if;

  if p_accuracy_m is null or p_accuracy_m <= 0 or p_accuracy_m > 35 then
    raise exception 'Precisión GPS insuficiente. Se requiere una precisión de 35 m o mejor';
  end if;

  select * into e
  from public.academic_service_events
  where id = p_event_id and active = true;
  if e.id is null or e.course_code is distinct from s.selected_course_code then
    raise exception 'Servicio no disponible';
  end if;

  d := 6371000 * 2 * asin(sqrt(
    power(sin(radians(p_latitude-e.latitude)/2),2)
    + cos(radians(e.latitude))*cos(radians(p_latitude))*power(sin(radians(p_longitude-e.longitude)/2),2)
  ));
  inside := d <= e.radius_m;

  if ts < e.starts_at-make_interval(mins=>e.checkin_before_min) then st := 'temprano';
  elsif ts > e.starts_at+make_interval(mins=>e.checkin_after_min) then st := 'tarde';
  elsif not inside then st := 'fuera_radio';
  else st := 'presente';
  end if;

  insert into public.academic_service_checkins(event_id,user_id,latitude,longitude,accuracy_m,distance_m,within_radius,status,device_id,checked_at)
  values(e.id,s.user_id,p_latitude,p_longitude,p_accuracy_m,d,inside,st,nullif(p_device_id,''),ts)
  on conflict(event_id,user_id) do update set
    latitude=excluded.latitude,
    longitude=excluded.longitude,
    accuracy_m=excluded.accuracy_m,
    distance_m=excluded.distance_m,
    within_radius=excluded.within_radius,
    status=excluded.status,
    device_id=excluded.device_id,
    checked_at=excluded.checked_at;

  return query select true, st, d, inside, ts;
end
$function$;

-- La RPC academic_set_virtual_class ya valida exclusivamente
-- role = 'administrador_general'. Se conserva sin cambios.