-- Минимум для текста голоса поднят с 1 до 50 символов — совсем короткая
-- запись не то, ради чего существуют «вторые ворота». Максимум (4000)
-- не трогаю, он и так был в спеке. Применяет Витя вручную (или я — после
-- явного «да»), затем нужно синхронно поправить проверку в воркере
-- (workers/unitycode-write.js, VOICE_TEXT_MIN) — она отдельная копия
-- того же правила, PostgREST её не подхватывает автоматически.

alter table voices drop constraint voices_text_check;
alter table voices add constraint voices_text_check
  check (char_length(text) between 50 and 4000);
