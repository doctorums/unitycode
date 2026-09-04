-- =====================================================================
-- UnityCode — Этап 1: слой наблюдаемости сети
-- Проект Supabase: lukyyqabkxzrgdixzphs
-- Дата: 4 сентября 2026
--
-- ОДИН ФАЙЛ, ВЫПОЛНЯТЬ ЦЕЛИКОМ, СВЕРХУ ВНИЗ.
-- Повторный прогон безопасен: схема не пересоздаётся, значения settings
-- не затираются, строки nodes и connections не меняются. Единственное, что
-- добавляет повтор, — ещё одну строку снимка в части 5, и это по замыслу:
-- снимки для того и нужны, чтобы копиться.
-- Все изменения аддитивные. Код воркеров и фронтенда не затрагивается.
--
-- ЗАЧЕМ: концепция выравнивается с принципом рекурсивной интеграции —
-- самоописание системы неполно без её места в целом. Прикладной перевод:
-- прежде чем сеть начнёт действовать на саму себя (обрезать связи,
-- строить контекстные выжимки), она должна научиться себя наблюдать.
--
-- ПОЧЕМУ НЕ ПРУНИНГ СНАЧАЛА: на 28 рёбрах обрезать нечего, а ошибка
-- стоит заметной доли сети. Прунинг заводится как конфигурация,
-- но остаётся выключенным до ~150 связей.
--
-- Состояние сети на момент написания: 27 узлов, 28 связей
-- (18 от Связующего, 10 от людей), 5 изолированных, 2 хаба по 9 связей.
-- Сверено с живой базой 04.09: совпадает до строчки, включая то, что
-- created_by принимает ровно два значения — linker и human.
-- =====================================================================
-- =====================================================================
-- ЧАСТЬ 1. Расширение connections: вес, причина, метаданные
-- =====================================================================
-- Шкала weight — 0–1, единая с pruning.min_weight и linker.min_confidence.
-- 1.0 = полноценная связь (дефолт), 0 = связи фактически нет.
-- Все 28 существующих связей получают максимальный вес и считаются
-- полноценными, пока будущая переоценка их не понизит.
alter table public.connections
  add column if not exists weight            numeric not null default 1.0,
  add column if not exists reason            text,
  add column if not exists meta              jsonb not null default '{}'::jsonb,
  add column if not exists last_evaluated_at timestamptz;

-- Защита от повтора — по ИМЕНИ констрейнта, не по его определению.
-- Следствие, о котором надо знать: если границы шкалы когда-нибудь
-- поменяются, этот блок молча ничего не сделает — констрейнт-то на месте.
-- Менять границы придётся явным drop constraint перед прогоном.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'connections_weight_range'
      and conrelid = 'public.connections'::regclass
  ) then
    alter table public.connections
      add constraint connections_weight_range
      check (weight >= 0 and weight <= 1);
  end if;
end $$;
comment on column public.connections.weight is
  'Сила связи, шкала 0–1. 1.0 = полноценная связь (дефолт). Понижается переоценкой.';
comment on column public.connections.reason is
  'Человекочитаемое обоснование связи. Заполняется Связующим на этапе 2.';
comment on column public.connections.meta is
  'Непредусмотренные признаки (оценки схожести, версия модели). Ключи регистрируются в settings.schema.connection_meta_keys.';
comment on column public.connections.last_evaluated_at is
  'Когда вес пересчитан последний раз. Нужно процессу переоценки, чтобы не обрабатывать одно и то же.';
create index if not exists connections_weight_idx on public.connections (weight);
create index if not exists connections_from_idx   on public.connections (from_node_id);
create index if not exists connections_to_idx     on public.connections (to_node_id);
-- =====================================================================
-- ЧАСТЬ 2. Таблица settings — единственный источник правды для порогов
-- =====================================================================
-- Воркеры читают её при старте вместо жёстко зашитых констант.
-- Новая возможность = новый ключ, без правки кода и без передеплоя.
-- Это ответ на требование гибкости под возможности, которых мы пока не знаем.
create table if not exists public.settings (
  key            text primary key,
  value          jsonb not null,
  schema_version integer not null default 1,
  description    text,
  updated_at     timestamptz not null default now()
);
comment on table public.settings is
  'Пороги, коэффициенты и флаги режимов. Правится вручную через Table Editor или воркером с service_role.';
comment on column public.settings.schema_version is
  'Версия формы value для данного ключа. Позволяет менять форму, не ломая читателей.';
alter table public.settings enable row level security;
-- Чтение публичное: воркеры и фронтенд читают конфигурацию анонимным ключом.
-- Политики на insert/update/delete НЕ создаются намеренно: при включённом RLS
-- отсутствие политики = запрет для anon, service_role обходит RLS.
-- Это существенно: дефолтные привилегии схемы public в этом проекте выдают
-- anon полный CRUD на любую новую таблицу (проверено 04.09 по pg_default_acl:
-- для таблиц там anon=arwdDxtm). RLS здесь — единственный замок.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'settings'
      and policyname = 'settings_read_all'
  ) then
    create policy settings_read_all on public.settings
      for select using (true);
  end if;
end $$;
-- Автообновление updated_at при любой правке, включая ручную через Table Editor.
create or replace function public.settings_touch_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
drop trigger if exists settings_touch on public.settings;
create trigger settings_touch
  before update on public.settings
  for each row execute function public.settings_touch_updated_at();
-- Начальное наполнение.
-- on conflict do nothing — повторный прогон не затрёт значения,
-- изменённые вручную (Table Editor — основной инструмент в среде iPad/Safari).
insert into public.settings (key, value, description) values
  ('scale.weight',
   '{"min": 0, "max": 1, "default": 1.0}'::jsonb,
   'ЕДИНАЯ шкала для connections.weight, pruning.min_weight и linker.min_confidence. 1.0 = полноценная связь, 0 = связи фактически нет. Не менять здесь, не изменив в остальных местах.'),
  ('linker.enabled', 'true'::jsonb,
   'Главный выключатель Связующего'),
  ('linker.max_new_links_per_run', '3'::jsonb,
   'Максимум новых связей за запуск — защита от лавинообразного связывания'),
  ('linker.min_confidence', '0.55'::jsonb,
   'Порог уверенности (шкала 0–1), ниже которого связь не создаётся'),
  ('linker.hub_degree_cap', '12'::jsonb,
   'Если у узла столько связей, Связующий не добавляет новых. Текущий максимум в сети — 9: порог даёт запас и не блокирует текущее поведение'),
  ('pruning.enabled', 'false'::jsonb,
   'ВЫКЛЮЧЕНО НАМЕРЕННО. На 28 рёбрах обрезать нечего. Включать не раньше ~150 связей'),
  ('pruning.min_weight', '0.2'::jsonb,
   'Ниже этого веса (шкала 0–1) связь — кандидат на понижение видимости'),
  ('pruning.mode', '"soft"'::jsonb,
   'soft = понижение веса и скрытие из отображения; hard = удаление. Держать soft, пока надёжность не доказана: агент может ошибиться, а за связями стоит работа людей'),
  ('pruning.dry_run', 'true'::jsonb,
   'Только записывать намерения в лог, ничего не менять'),
  ('snapshot.interval_hours', '24'::jsonb,
   'Как часто снимать метрики сети. НА ЭТАПЕ 1 НИЧЕГО НЕ ЗАПУСКАЕТ: планировщика нет, снимок делается вручную вызовом take_network_snapshot(). Автоматика — этап 2 (Cron Trigger на воркере либо pg_cron)'),
  ('schema.connection_meta_keys', '{}'::jsonb,
   'Реестр используемых ключей внутри connections.meta с описанием каждого')
on conflict (key) do nothing;
-- =====================================================================
-- ЧАСТЬ 3. Снимки состояния сети — сеть, наблюдающая себя
-- =====================================================================
create table if not exists public.network_snapshots (
  id               bigserial primary key,
  created_at       timestamptz not null default now(),
  node_count       integer not null,
  connection_count integer not null,
  isolated_count   integer not null,
  avg_degree       numeric not null,
  max_degree       integer not null,
  hub_share        numeric not null,
  linker_share     numeric not null,
  metrics          jsonb not null default '{}'::jsonb
);
comment on column public.network_snapshots.isolated_count is
  'Узлы со степенью 0 — части, не принятые в целое. Операционализация принципа РИ и индикатор здоровья сети.';
comment on column public.network_snapshots.hub_share is
  'Доля рёбер у двух самых связанных узлов. ГЛАВНАЯ метрика раннего предупреждения: устойчивый рост = скатывание в гиперсвязность, где всё связано со всем и различия стираются.';
comment on column public.network_snapshots.linker_share is
  'Доля связей от Связующего, а не от людей. Резкий рост = сеть плетёт себя быстрее, чем в ней участвуют люди.';
comment on column public.network_snapshots.metrics is
  'Место для будущих метрик (кластеризация, модульность, распределение весов) без миграции.';
create index if not exists network_snapshots_created_idx
  on public.network_snapshots (created_at desc);
alter table public.network_snapshots enable row level security;
-- Чтение публичное: страница Узор должна уметь показывать динамику.
-- Запись — только service_role (политика не создаётся намеренно).
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'network_snapshots'
      and policyname = 'network_snapshots_read_all'
  ) then
    create policy network_snapshots_read_all on public.network_snapshots
      for select using (true);
  end if;
end $$;
-- Функция расчёта снимка.
-- security invoker (по умолчанию) — вызывается воркером с service_role-ключом,
-- поэтому обход RLS не нужен и целый класс проблем с правами не возникает.
-- CTE вместо temp table: temp table с on commit drop падала при повторном
-- вызове функции в одной транзакции.
--
-- pg_temp прописан в search_path ПОСЛЕДНИМ намеренно. Не укажи его вовсе —
-- Postgres всё равно ищет там таблицы, причём ПЕРВЫМ, и временный объект
-- может заслонить настоящий. Здесь это неопасно (функция и так исполняется
-- правами вызывающего), но привычка дешевле разбирательства.
create or replace function public.take_network_snapshot()
returns public.network_snapshots
language plpgsql
set search_path = public, pg_temp
as $$
declare
  rec public.network_snapshots;
begin
  with deg as (
    select n.id, count(c.id)::integer as degree
    from nodes n
    left join connections c
      on c.from_node_id = n.id or c.to_node_id = n.id
    group by n.id
  ),
  totals as (
    select (select count(*) from nodes)       as v_nodes,
           (select count(*) from connections) as v_conns
  ),
  agg as (
    select count(*) filter (where degree = 0) as v_isolated,
           coalesce(avg(degree), 0)           as v_avg,
           coalesce(max(degree), 0)::integer  as v_max
    from deg
  ),
  top2 as (
    select coalesce(sum(degree), 0) as top_sum
    from (select degree from deg order by degree desc limit 2) t
  ),
  linker as (
    select count(*) filter (where created_by = 'linker')::numeric as n_linker
    from connections
  )
  insert into network_snapshots
    (node_count, connection_count, isolated_count,
     avg_degree, max_degree, hub_share, linker_share)
  select
    totals.v_nodes,
    totals.v_conns,
    agg.v_isolated,
    round(agg.v_avg, 3),
    agg.v_max,
    -- Делитель v_conns*2: каждое ребро даёт вклад в степень двух узлов,
    -- поэтому сумма всех степеней равна удвоенному числу рёбер.
    -- Проверено на живых данных 04.09: сумма степеней 56 = 2×28, висячих
    -- рёбер, NULL-концов и петель в базе нет.
    -- ОГОВОРКА: если два хаба соединены общим ребром, метрика слегка завышена.
    -- Приемлемо для индикатора тренда; учесть, если станет порогом решения.
    -- На 04.09 два хаба между собой НЕ соединены — 0.3214 число точное.
    case when totals.v_conns = 0 then 0
         else round(top2.top_sum::numeric / (totals.v_conns * 2), 4) end,
    case when totals.v_conns = 0 then 0
         else round(linker.n_linker / totals.v_conns, 4) end
  from totals, agg, top2, linker
  returning * into rec;
  return rec;
end;
$$;

-- Право вызова: только сервис-ключ.
-- Дыры и без этого нет: функция security invoker, поэтому вызов анонимным
-- ключом упрётся в RLS на вставке и завершится ошибкой, ничего не записав.
-- Но эндпоинт /rest/v1/rpc/take_network_snapshot был бы открыт всякому, кто
-- взял анонимный ключ из исходника страницы, а каждый вызов — это полный
-- обход nodes и connections. Отзываем, чтобы не держать открытым то, чем
-- никто снаружи пользоваться не должен.
revoke execute on function public.take_network_snapshot() from public;
revoke execute on function public.take_network_snapshot() from anon;
revoke execute on function public.take_network_snapshot() from authenticated;
grant  execute on function public.take_network_snapshot() to service_role;
-- =====================================================================
-- ЧАСТЬ 4. Удобное чтение — представление для Table Editor
-- =====================================================================
-- Диагностика должна быть видна глазами: devtools в среде iPad/Safari нет.
create or replace view public.v_network_health as
select
  created_at,
  node_count      as "узлов",
  connection_count as "связей",
  isolated_count  as "изолировано",
  avg_degree      as "средняя_степень",
  max_degree      as "макс_степень",
  hub_share       as "доля_хабов",
  linker_share    as "доля_связующего"
from public.network_snapshots
order by created_at desc;
comment on view public.v_network_health is
  'Читаемая сводка снимков для Table Editor. Следить в первую очередь за доля_хабов (рост = гиперсвязность) и изолировано.';
-- =====================================================================
-- ЧАСТЬ 4.5. ОБНОВЛЕНИЕ КЭША СХЕМЫ POSTGREST — НЕ УДАЛЯТЬ
-- =====================================================================
-- Железное правило 3 проекта. PostgREST держит схему в кэше и сам его не
-- обновляет: без этой строки REST API не увидит ни settings, ни
-- network_snapshots, ни v_network_health, ни четыре новые колонки
-- connections — и, что хуже, МОЛЧА. Именно так проект однажды потерял
-- записи в events: таблица есть, запросы уходят, ответ выглядит нормально,
-- в базе пусто.
--
-- Стоит здесь, после всей DDL и до первого снимка. В одной транзакции
-- уведомление доставляется на коммите, так что порядок внутри файла
-- значения не имеет — важно, что оно есть.
notify pgrst, 'reload schema';
-- =====================================================================
-- ЧАСТЬ 5. Первый снимок и проверка
-- =====================================================================
select * from public.take_network_snapshot();
-- Ожидается на текущих данных: 27 узлов, 28 связей, 5 изолированных,
-- средняя степень 2.074, макс. степень 9,
-- доля хабов 0.3214, доля Связующего 0.6429.
-- Логика функции прогнана на живой базе 04.09 отдельным SELECT без вставки
-- и дала ровно эти числа. Расхождение = либо сеть выросла с момента замера,
-- либо ошибка в функции.
select count(*) as всего,
       count(*) filter (where weight = 1.0)   as с_дефолтным_весом,
       count(*) filter (where weight is null) as сломано
from public.connections;
-- Ожидается: всего = с_дефолтным_весом = 28, сломано = 0
select key, value from public.settings order by key;
-- Ожидается 11 ключей (10 из ТЗ плюс scale.weight)

-- ── Проверка замков (можно прогнать отдельно) ──────────────────────────
-- Ожидается: rls_settings = true, rls_snapshots = true,
--            политик на запись 0, anon_can_call = false
--
-- select
--   (select relrowsecurity from pg_class where relname='settings')          as rls_settings,
--   (select relrowsecurity from pg_class where relname='network_snapshots') as rls_snapshots,
--   (select count(*) from pg_policies
--      where tablename in ('settings','network_snapshots') and cmd <> 'SELECT') as write_policies,
--   has_function_privilege('anon','public.take_network_snapshot()','EXECUTE')   as anon_can_call;
