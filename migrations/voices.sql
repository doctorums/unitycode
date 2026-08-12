-- ═══════════════════════════════════════════════════════════════════════════
-- «Вторые ворота» — Голоса (tier 2). НЕ ПРИМЕНЯТЬ автоматически.
-- Отдельный слой поверх Сети: голоса НЕ пишутся в nodes и НЕ создают связей,
-- через агентов (Привратник/Дистиллятор/Связующий) не проходят.
-- Применяет Витя вручную через Supabase, после явного «да».
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists voices (
  id uuid primary key default gen_random_uuid(),
  client_id text unique,             -- идемпотентность повторной отправки
  user_token text not null,          -- 64 hex, токен из ключевой фразы
  text text not null check (char_length(text) between 1 and 4000),
  lang text default 'ru',
  created_at timestamptz default now()
);

alter table voices enable row level security;

-- чтение всем (anon), запись только через воркер (service role)
create policy voices_read on voices for select using (true);
-- INSERT-политики для anon НЕТ намеренно — RLS включена, политики insert
-- нет вовсе, значит anon-ключ не может писать в таблицу вообще.

notify pgrst, 'reload schema';
