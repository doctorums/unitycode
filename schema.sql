-- ============================================================================
-- SCHEMA.SQL — эталонная схема базы UnityCode.
-- Снята с боевой базы 05.07.2026 (information_schema + pg_constraint).
-- Выполнить один раз в Supabase (SQL Editor) при разворачивании своего узла.
-- Заменяет старые create tables.sql / add connections.sql / миграции.
-- ============================================================================

-- ─── УЗЛЫ ───────────────────────────────────────────────────────────────────
-- Каждый вплетённый шум + отклик ИИ.
create table if not exists nodes (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz default now(),
  raw_noise         text not null,            -- что ввёл человек
  ai_interpretation text not null,            -- отклик Спирали
  parent_id         uuid references nodes(id) on delete set null,
  lat               double precision,
  lng               double precision,
  user_token        text,                     -- анонимный токен владельца
  essence           text,                     -- квинтэссенция (Distill) для Материи
  client_id         text unique,              -- ключ идемпотентности с клиента:
                                              -- вставка с Prefer: resolution=ignore-duplicates,
                                              -- повторная отправка не создаёт дубликат
  tz                text                      -- IANA-таймзона браузера на момент вплетения
);

create index if not exists nodes_user_token_idx on nodes(user_token);

-- ─── СВЯЗИ ──────────────────────────────────────────────────────────────────
-- Горизонтальная сеть «многие ко многим». Удаление узла каскадно
-- уносит его связи.
create table if not exists connections (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz default now(),
  from_node_id uuid references nodes(id) on delete cascade,
  to_node_id   uuid references nodes(id) on delete cascade,
  status       text default 'pending'
               check (status in ('pending','accepted','declined')),
  created_by   text not null default 'human' -- 'human' | 'linker' (агент-Связующий)
);

-- ─── СОБЫТИЯ ────────────────────────────────────────────────────────────────
-- Append-only журнал (пишет только write-воркер). НЕ чистить, НЕ изменять.
-- node_id намеренно БЕЗ foreign key: журнал не зависит от того, жив ли узел.
create table if not exists events (
  id         bigint generated always as identity primary key,
  type       text not null,                  -- node_created | connection_created |
                                             -- node_duplicate_retry | ...
  client_id  text,
  node_id    uuid,
  payload    jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ─── ЛОГ СВЯЗУЮЩЕГО ─────────────────────────────────────────────────────────
-- Трассировка прогонов агента-Связующего (пишет только write-воркер).
-- node_id — text без FK (диагностический лог, не часть графа).
create table if not exists linker_log (
  id         bigserial primary key,
  node_id    text,
  trace      text,
  created_at timestamptz default now()
);

-- ─── КЭШ АНАЛИЗА ────────────────────────────────────────────────────────────
-- Кэш аналитика (unitycode-analyze). Ключ — четыре измерения:
-- срез, язык, пользователь (изоляция!), тон анализа.
-- angle='' и user_token='' — ПОЛНОЦЕННЫЕ значения ключа, не «нет записи».
create table if not exists analysis_cache (
  scope          text not null,              -- 'personal' | 'collective'
  interpretation text not null,
  node_count     integer not null default 0, -- счётчики графа на момент записи —
  conn_count     integer not null default 0, -- по ним воркер решает: кэш или пересчёт
  lang           text not null default 'ru',
  updated_at     timestamptz not null default now(),
  user_token     text not null default '',
  angle          text not null default '',
  primary key (scope, lang, user_token, angle)
);

-- ─── ДОСТУП (RLS) ───────────────────────────────────────────────────────────
-- Запись — только через write-воркер (service-ключ, обходит RLS).
-- Публичный ключ браузера = только чтение nodes и принятых connections.
alter table nodes          enable row level security;
alter table connections    enable row level security;
alter table events         enable row level security;
alter table linker_log     enable row level security;
alter table analysis_cache enable row level security;

drop policy if exists "uc_nodes_public_read" on nodes;
create policy "uc_nodes_public_read"
  on nodes for select to anon, authenticated using (true);

drop policy if exists "uc_conn_public_read" on connections;
create policy "uc_conn_public_read"
  on connections for select to anon, authenticated using (status = 'accepted');

-- events / linker_log / analysis_cache — политик нет: доступны только
-- service-ключу воркеров.

revoke insert, update, delete on nodes          from anon;
revoke insert, update, delete on connections    from anon;
revoke all                    on events         from anon;
revoke all                    on linker_log     from anon;
revoke all                    on analysis_cache from anon;
