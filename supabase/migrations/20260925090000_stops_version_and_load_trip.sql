-- 여행플래너: 일정 목록 버전(서버 발급) + 한 번에 불러오기. Supabase 월 전송량 절약용 (2026-09-25).
-- 1) 저장할 때 일정 목록(p_stops)이 실제로 바뀐 경우에만 목록을 교체하고 stops_version을 1 올린다.
-- 2) namba_load_trip: 여행·버전·일정 목록을 같은 시점에서 한 번에 돌려준다.
--    호출자가 이미 가진 버전과 같으면 일정 목록(약 240KB)은 빼고 돌려준다.
begin;

alter table public.namba_trips add column if not exists stops_version bigint not null default 0;
alter table public.namba_trips add column if not exists stops_digest text;

create or replace function public.namba_replace_trip_state(p_trip_id uuid, p_start_time time without time zone, p_planner_data jsonb, p_stops jsonb, p_updated_at timestamp with time zone)
 returns timestamp with time zone
 language plpgsql
 set search_path to 'public'
as $function$
declare
  v_existing_hotel jsonb;
  v_planner_data jsonb;
  v_digest text := md5(coalesce(p_stops, '[]'::jsonb)::text);
  v_stops_changed boolean;
  v_updated integer;
begin
  if auth.uid() is null or not exists (
    select 1 from public.namba_trip_members
    where trip_id = p_trip_id and user_id = auth.uid()
  ) then
    raise exception 'trip membership required' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_trip_id::text, 0));

  select planner_data->'selectedHotel', (stops_digest is distinct from v_digest)
  into v_existing_hotel, v_stops_changed
  from public.namba_trips
  where id = p_trip_id
  for update;

  if not found then
    raise exception 'trip not found' using errcode = 'P0002';
  end if;

  v_planner_data := coalesce(p_planner_data, '{}'::jsonb);
  if v_existing_hotel is not null
     and jsonb_typeof(v_existing_hotel) <> 'null'
     and (v_planner_data->'selectedHotel' is null or jsonb_typeof(v_planner_data->'selectedHotel') = 'null') then
    v_planner_data := jsonb_set(v_planner_data, '{selectedHotel}', v_existing_hotel, true);
  end if;

  if v_stops_changed then
    delete from public.namba_trip_stops where trip_id = p_trip_id;

    insert into public.namba_trip_stops (
      trip_id, place_id, name, address, latitude, longitude, stay_minutes,
      sort_order, is_hotel, is_fixed, fixed_role, fixed_time, planner_meta
    )
    select
      p_trip_id, stop.place_id, stop.name, coalesce(stop.address, ''),
      stop.latitude, stop.longitude, coalesce(stop.stay_minutes, 0),
      stop.sort_order, coalesce(stop.is_hotel, false), coalesce(stop.is_fixed, false),
      stop.fixed_role, nullif(stop.fixed_time, '')::time, coalesce(stop.planner_meta, '{}'::jsonb)
    from jsonb_to_recordset(coalesce(p_stops, '[]'::jsonb)) as stop(
      place_id text,
      name text,
      address text,
      latitude double precision,
      longitude double precision,
      stay_minutes integer,
      sort_order integer,
      is_hotel boolean,
      is_fixed boolean,
      fixed_role text,
      fixed_time text,
      planner_meta jsonb
    );
  end if;

  update public.namba_trips
  set start_time = p_start_time,
      planner_data = v_planner_data,
      updated_at = p_updated_at,
      stops_digest = v_digest,
      stops_version = stops_version + (case when v_stops_changed then 1 else 0 end)
  where id = p_trip_id;

  get diagnostics v_updated = row_count;
  if v_updated <> 1 then
    raise exception 'trip update failed' using errcode = 'P0002';
  end if;

  return p_updated_at;
end;
$function$;

create or replace function public.namba_load_trip(p_trip_id uuid, p_known_stops_version bigint default null)
 returns jsonb
 language sql
 stable
 set search_path to 'public'
as $function$
  select jsonb_build_object(
    'id', t.id,
    'name', t.name,
    'start_time', t.start_time,
    'updated_at', t.updated_at,
    'planner_data', t.planner_data,
    'stops_version', t.stops_version,
    'stops', case
      when p_known_stops_version is not null and p_known_stops_version = t.stops_version then null
      else (
        select coalesce(jsonb_agg(jsonb_build_object(
          'place_id', s.place_id, 'name', s.name, 'address', s.address,
          'latitude', s.latitude, 'longitude', s.longitude, 'stay_minutes', s.stay_minutes,
          'sort_order', s.sort_order, 'is_hotel', s.is_hotel, 'is_fixed', s.is_fixed,
          'fixed_role', s.fixed_role, 'fixed_time', s.fixed_time, 'planner_meta', s.planner_meta
        ) order by s.sort_order), '[]'::jsonb)
        from public.namba_trip_stops s
        where s.trip_id = t.id
      )
    end
  )
  from public.namba_trips t
  where t.id = p_trip_id;
$function$;

revoke all on function public.namba_load_trip(uuid, bigint) from public;
grant execute on function public.namba_load_trip(uuid, bigint) to authenticated;

commit;
