-- ═══════════════════════════════════════════════════════════════════════════
-- Внутренний рейтинг Голосов — чисто измерительный слой, не фильтр.
-- Оценка (0..10) + краткое обоснование от LLM, пишется фоново после
-- сохранения голоса (ctx.waitUntil, по образцу Связующего). Никогда не
-- блокирует запись и не влияет на eligibility (voice_check/voice_write).
-- Ошибка оценки — голос остаётся с review_score = null, ретрая нет.
-- НЕ ПРИМЕНЯТЬ автоматически. Применяет Витя вручную через Supabase,
-- после явного «да».
-- ═══════════════════════════════════════════════════════════════════════════

alter table voices add column if not exists review_score smallint
  constraint voices_review_score_range check (review_score is null or review_score between 0 and 10);
alter table voices add column if not exists review_note text;      -- краткое обоснование, 1-2 предложения
alter table voices add column if not exists reviewed_at timestamptz;  -- null = ещё не оценено

notify pgrst, 'reload schema';
