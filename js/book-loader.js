async function loadBook() {
    const params = new URLSearchParams(window.location.search);
    let lang = params.get('lang')
        || localStorage.getItem('uc_lang')
        || (navigator.language || '').toLowerCase().split('-')[0]
        || 'ru';
    if (!['en'].includes(lang)) lang = 'ru';
    const file = lang === 'en' ? './data/book_en.json' : './data/book.json';
    const response = await fetch(file);
    if (!response.ok) throw new Error(`Cannot load ${file} (${response.status})`);
    return await response.json();
}
