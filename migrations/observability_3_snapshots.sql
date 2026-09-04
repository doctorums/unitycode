-- ═══════════════════════════════════════════════════════════════════════════
-- Слой наблюдаемости, миграция 3 из 3 — снимки состояния сети.
--
-- Зачем. Прежде чем сеть начнёт действовать на саму себя (резать связи,
-- строить выжимки), она должна научиться себя наблюдать. Снимок — это
-- замер формы сети на момент времени; смысл появляется от второго-третьего
-- снимка, когда видно направление.
--
-- Порядок: после observability_1 и observability_2.
--
-- НЕ ПРИМЕНЯТЬ автоматически. Применяет Витя вручную через Supabase,
-- после явного «да».
--
-- ── ТРИ ОТЛИЧИЯ ОТ ТЗ, ВСЕ ОСОЗНАННЫЕ ─────────────────────────────────
--
-- 1. Включена RLS. В ТЗ таблица создавалась без неё. Дефолтные привилегии
--    схемы public в этом проекте выдают anon полный CRUD на любую новую
--    таблицу — проверено 04.09 запросом к pg_default_acl, там для таблиц
--    стоит anon=arwdDxtm (a=insert, w=update, d=delete). Анонимный ключ
--    лежит открытым текстом в исходнике страницы. Без RLS таблица была бы
--    открыта на запись и удаление любому, кто её открыл. Все девять
--    существующих таблиц проекта RLS имеют, исключений нет.
--
-- 2. Функция НЕ вызывается анонимным ключом. ТЗ предлагало обратное — как
--    решение, чтобы «не открывать прямой доступ на запись в таблицу». Но
--    security definer + право вызова у anon и есть доступ на запись, просто
--    через RPC вместо REST: любой мог бы дёргать эндпоинт в цикле. Дефолт
--    схемы для функций — anon=X, то есть право вызова выдалось бы само.
--    Это ровно то, что железное правило 6 велит отклонять. Снимок снимается
--    сервис-ключом: из unitycode-write на этапе 2 или руками из Table
--    Editor, что на этапе 1 и так единственный способ.
--
-- 3. Вместо временной таблицы — CTE. `create temp table _deg on commit drop`
--    падает при втором вызове внутри одной транзакции. И отдельно: `set
--    search_path = public` без pg_temp работает лишь потому, что Postgres
--    неявно смотрит в pg_temp ПЕРВЫМ для таблиц — то есть функция опиралась
--    ровно на ту лазейку, которую set search_path в security definer и
--    должен закрывать. С CTE вопрос снимается целиком, а pg_temp прописан
--    последним, как и рекомендует Postgres для security definer.
-- ═══════════════════════════════════════════════════════════════════════════

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

create index if not exists network_snapshots_created_idx
  on public.network_snapshots (created_at desc);

alter table public.network_snapshots enable row level security;

-- Чтение публичное — метрики не секрет, и будущая страница со сводкой
-- прочитает их тем же публичным ключом, что и всё остальное. В ТЗ политики
-- не было вовсе; при включённой RLS это означало бы, что не читает никто.
drop policy if exists network_snapshots_read_all on public.network_snapshots;
create policy network_snapshots_read_all on public.network_snapshots
  for select using (true);

-- Политик на запись нет: пишет только функция ниже, от имени владельца.

comment on column public.network_snapshots.isolated_count is
  'Узлы со степенью 0 — части, не принятые в целое. На 04.09 их 5 из 27.';
comment on column public.network_snapshots.hub_share is
  'Доля рёбер у двух самых связанных узлов. На 04.09 = 0.3214. Главная '
  'метрика раннего предупреждения: устойчивый рост означает сползание в '
  'гиперсвязность, где связано всё со всем и различия стираются. Если два '
  'хаба соединены между собой, общее ребро считается дважды и метрика слегка '
  'завышена — на 04.09 они НЕ соединены, число точное.';
comment on column public.network_snapshots.linker_share is
  'Доля связей, сплетённых Связующим, а не людьми. На 04.09 = 0.6429. Резкий '
  'рост = сеть плетёт себя быстрее, чем в ней участвуют люди.';
comment on column public.network_snapshots.metrics is
  'Место для метрик, которые появятся позже (кластеризация, модульность, '
  'распределение весов) — без миграции.';

-- ── Функция расчёта ────────────────────────────────────────────────────
create or replace function public.take_network_snapshot()
returns public.network_snapshots
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  rec public.network_snapshots;
begin
  with deg as (
    -- Степень узла: сколько рёбер его касается любым концом. Сумма всех
    -- степеней = 2 × число рёбер (проверено на живых данных 04.09: 56 = 2×28).
    select n.id, count(c.id)::integer as degree
    from nodes n
    left join connections c
      on c.from_node_id = n.id or c.to_node_id = n.id
    group by n.id
  ),
  tot as (select count(*)::numeric as conns from connections),
  -- Тай-брейк по id: при равных степенях (сейчас ровно так — два узла по 9)
  -- без него выбор двух из нескольких равных не определён, и hub_share
  -- дрожала бы от снимка к снимку без всякой причины.
  top2 as (select degree from deg order by degree desc, id limit 2)
  insert into network_snapshots
    (node_count, connection_count, isolated_count,
     avg_degree, max_degree, hub_share, linker_share)
  select
    (select count(*) from nodes),
    (select conns from tot)::integer,
    (select count(*) filter (where degree = 0) from deg),
    (select round(coalesce(avg(degree), 0), 3) from deg),
    (select coalesce(max(degree), 0) from deg),
    case when (select conns from tot) = 0 then 0
         else round((select coalesce(sum(degree), 0) from top2)::numeric
                    / ((select conns from tot) * 2), 4) end,
    case when (select conns from tot) = 0 then 0
         else round((select count(*) filter (where created_by = 'linker')
                     from connections)::numeric
                    / (select conns from tot), 4) end
  returning * into rec;

  return rec;
end;
$$;

comment on function public.take_network_snapshot() is
  'Снимает метрики сети в network_snapshots. Вызывается ТОЛЬКО сервис-ключом '
  '(см. revoke ниже) — железное правило 6.';

-- Право вызова: только сервис-ключ. Дефолт схемы выдал бы X (execute) и
-- anon, и authenticated; PUBLIC получает execute от самого Postgres.
-- Снимаем всё и выдаём точечно.
revoke execute on function public.take_network_snapshot() from public;
revoke execute on function public.take_network_snapshot() from anon;
revoke execute on function public.take_network_snapshot() from authenticated;
grant  execute on function public.take_network_snapshot() to service_role;

notify pgrst, 'reload schema';

-- ── Проверка после применения ──────────────────────────────────────────
--
-- 1) Первый снимок (из SQL Editor — он ходит сервис-ролью):
--    select * from public.take_network_snapshot();
--
--    Ожидается на данных 04.09:
--      node_count 27, connection_count 28, isolated_count 5,
--      avg_degree 2.074, max_degree 9, hub_share 0.3214, linker_share 0.6429
--
-- 2) Что anon действительно не может вызвать функцию (ожидается false):
--    select has_function_privilege('anon', 'public.take_network_snapshot()', 'EXECUTE');
--
-- 3) Что RLS стоит и политика на запись отсутствует (ожидается true и 0):
--    select relrowsecurity from pg_class where relname = 'network_snapshots';
--    select count(*) from pg_policies
--    where tablename = 'network_snapshots' and cmd <> 'SELECT';
