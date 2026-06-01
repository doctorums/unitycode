async function loadBook() {
    const response = await fetch('./data/book.json');
    if (!response.ok) throw new Error(`Cannot load book.json (${response.status})`);
    return await response.json();
}
