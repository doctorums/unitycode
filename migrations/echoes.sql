-- ═══════════════════════════════════════════════════════════════════════════
-- «Эхо мира» — короткие срезы из внешних источников (новости/наука),
-- независимый слой поверх Сети. НЕ узлы графа, НЕ связаны с nodes напрямую,
-- НЕ проходят через Привратника/Дистиллятор/Связующего. Собирает отдельный
-- воркер unitycode-echo (cron), не unitycode-write. Тот же принцип, что и
-- у Голосов — необратимость смешивания популяций (DECISIONS.md, 15.08):
-- отдельная таблица, а не nodes с меткой типа.
--
-- echo_responses — только маппинг «человек откликнулся своим шумом на
-- это эхо»: node_id указывает на уже созданный обычным путём узел
-- (Привратник → Distill → Связующий отработали как всегда, echo здесь
-- ни при чём). INSERT в обе таблицы — только через service role
-- (воркеры unitycode-echo и unitycode-write), anon-политик insert нет.
--
-- НЕ ПРИМЕНЯТЬ автоматически. Применяет Витя вручную через Supabase,
-- после явного «да».
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists echoes (
  id uuid primary key default gen_random_uuid(),
  client_id text unique,              -- дедуп: хэш от source_url + опубликованной даты
  text text not null check (char_length(text) between 1 and 500),  -- дистиллят, короче голоса
  lang text default 'ru',
  category text check (category in ('politics','science','culture','sport','tech','economy')),
  source_name text,
  source_url text,
  place text,                         -- название места, извлечённое LLM из текста ("Осака")
  lat double precision,               -- nullable, geocoding — будущий шаг
  lon double precision,
  event_time timestamptz,             -- когда произошло/опубликовано, если известно
  created_at timestamptz default now()
);

-- индекс для фильтра по категории на карте (частый select с category=eq.)
create index if not exists echoes_category_idx on echoes(category);

alter table echoes enable row level security;
create policy echoes_read on echoes for select using (true);
-- insert только через service role (unitycode-echo) — anon-политики insert нет.

create table if not exists echo_responses (
  id uuid primary key default gen_random_uuid(),
  echo_id uuid not null references echoes(id) on delete cascade,
  node_id uuid not null references nodes(id) on delete cascade,
  created_at timestamptz default now(),
  unique(echo_id, node_id)
);

alter table echo_responses enable row level security;
create policy echo_responses_read on echo_responses for select using (true);
-- insert только через service role (unitycode-write, при наличии echo_id в запросе).

notify pgrst, 'reload schema';
