-- ═══════════════════════════════════════════════════════════════════════════
-- Слой наблюдаемости, миграция 1 из 3 — вес и обоснование у связи.
--
-- Зачем. Сейчас у связи есть только status и created_by. Почему Связующий
-- решил связать эти два узла — существует лишь свободным текстом в
-- linker_log и машинно не разбирается. Пока у ребра нет ни веса, ни
-- зафиксированной причины, ни обрезка слабых связей, ни контекстная
-- выжимка невозможны: нечего сравнивать.
--
-- Всё аддитивно. Существующие 28 связей получают weight = 1.0 и живут
-- дальше; вставка в старом формате (без новых полей) продолжает работать,
-- поэтому воркеры на этом этапе не трогаем.
--
-- Порядок: эта миграция первая. Дальше observability_2_settings.sql,
-- затем observability_3_snapshots.sql.
--
-- НЕ ПРИМЕНЯТЬ автоматически. Применяет Витя вручную через Supabase,
-- после явного «да».
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.connections
  add column if not exists weight numeric not null default 1.0,
  add column if not exists reason text,
  add column if not exists meta jsonb not null default '{}'::jsonb,
  add column if not exists last_evaluated_at timestamptz;

-- ОТЛИЧИЕ ОТ ТЗ: там было голое `add constraint`, без защиты от повтора.
-- Postgres не поддерживает `if not exists` для констрейнта, поэтому на
-- втором прогоне миграция падала бы — при том, что всё остальное в ней
-- намеренно повторяемо. Сносим прежний и ставим заново: имя наше, чужого
-- под ним быть не может.
alter table public.connections drop constraint if exists connections_weight_range;
alter table public.connections
  add constraint connections_weight_range check (weight >= 0 and weight <= 1000);

create index if not exists connections_weight_idx on public.connections (weight);
create index if not exists connections_from_idx on public.connections (from_node_id);
create index if not exists connections_to_idx on public.connections (to_node_id);

comment on column public.connections.weight is
  'Сила связи. Диапазон 0..1000 — сужать проще, чем расширять. ВНИМАНИЕ: '
  'ключ pruning.min_weight в settings равен 0.2, то есть предполагает шкалу '
  '0..1. Расхождение оставлено как в ТЗ, решать автору ТЗ. Сегодня безвредно: '
  'прунинг выключен (pruning.enabled = false).';
comment on column public.connections.reason is
  'Человекочитаемое обоснование связи. Заполняет Связующий на этапе 2.';
comment on column public.connections.meta is
  'Расширение на уровне ребра: оценки схожести, версия модели, признаки. '
  'Каждый используемый ключ документируется в settings.schema.connection_meta_keys.';
comment on column public.connections.last_evaluated_at is
  'Когда вес пересчитывался последний раз — чтобы переоценка не жевала одно и то же.';

-- PostgREST кэширует схему и молча перестаёт видеть новые поля.
-- Без этого REST продолжит отдавать connections в старом виде.
notify pgrst, 'reload schema';

-- ── Проверка после применения ──────────────────────────────────────────
-- Ожидается: total = with_default_weight = 28, broken = 0.
--
-- select count(*) as total,
--        count(*) filter (where weight = 1.0) as with_default_weight,
--        count(*) filter (where weight is null) as broken
-- from public.connections;
