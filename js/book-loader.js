// ═══════════════════════════════════════════════════════════════
// UNITYCODE — загрузчик книги для kniga.html
// ═══════════════════════════════════════════════════════════════
// Язык берётся так же, как в i18n.js: ?lang → localStorage → браузер.
//
// ВАЖНО про откат. Раньше здесь было `if (!['en'].includes(lang)) lang = 'ru'`,
// то есть ЛЮБОЙ язык кроме английского проваливался в русский. После того как
// интерфейс стал пятиязычным, это выглядело как поломка: человек читает сайт
// по-испански, открывает книгу — и получает кириллицу. Теперь откат идёт по
// цепочке «нужный язык → английский → русский»: непонятный язык лучше, чем
// нечитаемая письменность.
//
// AVAILABLE — языки, для которых файл РЕАЛЬНО лежит в data/. Список явный, а не
// «попробуем и посмотрим»: иначе каждая загрузка на испанском начиналась бы с
// заведомого 404 и лишнего round-trip на слабом канале. Появился перевод —
// добавь сюда код языка, это единственная правка.
// ═══════════════════════════════════════════════════════════════

const BOOK_AVAILABLE = ['ru', 'en'];
const BOOK_FALLBACK  = ['en', 'ru'];   // порядок отката, ru — последний рубеж

function bookFileFor(lang) {
  return lang === 'ru' ? './data/book.json' : './data/book_' + lang + '.json';
}

function resolveBookLang() {
  var lang = '';
  try {
    lang = new URLSearchParams(window.location.search).get('lang')
        || localStorage.getItem('uc_lang')
        || (navigator.language || '').toLowerCase().split('-')[0]
        || 'ru';
  } catch (e) {
    lang = 'ru';
  }
  return String(lang).toLowerCase().slice(0, 2);
}

async function loadBook() {
  var lang = resolveBookLang();

  // Очередь попыток: нужный язык (если файл есть), затем откат.
  // Дубликаты убираем, чтобы не дёргать один и тот же файл дважды.
  var queue = [];
  if (BOOK_AVAILABLE.indexOf(lang) !== -1) queue.push(lang);
  BOOK_FALLBACK.forEach(function (l) {
    if (queue.indexOf(l) === -1) queue.push(l);
  });

  var lastErr = null;
  for (var i = 0; i < queue.length; i++) {
    var file = bookFileFor(queue[i]);
    try {
      var response = await fetch(file);
      if (!response.ok) { lastErr = new Error('HTTP ' + response.status + ' ' + file); continue; }
      var data = await response.json();
      // Минимальная проверка формы: битый или обрезанный на слабом канале JSON
      // не должен считаться успехом — пусть лучше отработает следующий в очереди.
      if (data && Array.isArray(data.sections) && data.sections.length) return data;
      lastErr = new Error('unexpected shape in ' + file);
    } catch (e) {
      // Обрыв связи или невалидный JSON — пробуем следующий вариант.
      lastErr = e;
    }
  }

  throw lastErr || new Error('Cannot load book');
}
