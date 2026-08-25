-- ═══════════════════════════════════════════════════════════════════════════
-- echo_translations — кэш переводов «Эха мира» под язык читателя портала.
-- echoes.text всегда на русском (см. echoes.sql, комментарий к lang) —
-- независимо от языка источника, так задумано изначально. Но у портала
-- 5 языков интерфейса, и держать новости только по-русски для остальных
-- читателей нет смысла (25.08, решение Вити — обсудить с Артёмом).
--
-- Перевод — по требованию (клиент запрашивает через unitycode-analyze,
-- mode:'translate_echo'), не при сборе: не все языки нужны каждому эху,
-- переводить впрок все 5 на каждую запись — тратить MiMo зря. Кэш —
-- чтобы одну и ту же запись не переводить второй раз для второго
-- читателя с тем же языком.
--
-- ON DELETE CASCADE от echoes: когда echo стирается по retention
-- (unitycode-echo, pruneOld), перевод не остаётся сиротой — умирает
-- вместе с оригиналом сам, без отдельной очистки.
--
-- НЕ ПРИМЕНЯТЬ автоматически. Применяет Витя вручную через Supabase,
-- после явного «да».
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists echo_translations (
  id uuid primary key default gen_random_uuid(),
  echo_id uuid not null references echoes(id) on delete cascade,
  lang text not null,
  text text not null,
  created_at timestamptz default now(),
  unique(echo_id, lang)
);

alter table echo_translations enable row level security;
create policy echo_translations_read on echo_translations for select using (true);
-- insert только через service role (unitycode-analyze) — anon-политики insert нет.

notify pgrst, 'reload schema';
