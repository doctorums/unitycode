-- UnityCode — запись только через service-ключ (внутри worker-write),
-- публичный (sb_publishable_/anon) ключ = только чтение.
-- Запускать в Supabase → SQL Editor.

-- 0) Сначала посмотри текущие политики и сними старые разрешающие запись:
--    select schemaname, tablename, policyname, cmd, roles
--    from pg_policies where tablename in ('nodes','connections');
--    -- затем для каждой лишней (insert/update/delete для anon):
--    -- drop policy if exists "<имя_политики>" on public.nodes;

-- 1) NODES -----------------------------------------------------------------
alter table public.nodes enable row level security;

drop policy if exists "uc_nodes_public_read" on public.nodes;
create policy "uc_nodes_public_read"
  on public.nodes for select
  to anon, authenticated
  using (true);

-- подстраховка: отнять прямые права записи у роли anon
revoke insert, update, delete on public.nodes from anon;

-- 2) CONNECTIONS -----------------------------------------------------------
alter table public.connections enable row level security;

drop policy if exists "uc_conn_public_read" on public.connections;
create policy "uc_conn_public_read"
  on public.connections for select
  to anon, authenticated
  using (status = 'accepted');

revoke insert, update, delete on public.connections from anon;

-- ПРИМЕЧАНИЕ: service_role ключ (только внутри worker-write) ОБХОДИТ RLS,
-- поэтому шлюз сохраняет полный доступ на запись. Браузер с публичным ключом
-- теперь может читать, но не писать и не фабриковать связи.
