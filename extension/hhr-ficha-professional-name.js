// A professional reads as a first name and a first surname, in every card.
(() => {
  'use strict';
  const particles = new Set(['de', 'del', 'la', 'las', 'los', 'da', 'das', 'do', 'dos', 'di', 'van', 'von', 'der', 'den', 'san', 'santa', 'mac', 'mc']);
  // Eloísa writes most names as four fields joined by a space: first name, second name, first surname and
  // second surname. An empty field leaves its space, so «Ana  Rojas Soto» has no second name and
  // «Ana María Rojas » no second surname (read on the page, 26-11-2026). Other cards write the first
  // name and the surnames only. The name is passed as the page has it, with its spaces.
  function short(raw) {
    const text = String(raw ?? '').replace(/\s/g, ' ').replace(/^ +/, '');
    const tokens = text.split(' ').filter(Boolean);
    if (tokens.length < 3) return tokens.join(' ');
    const noSecondName = /^\S+ {2,}/.test(text), noSecondSurname = /\S +$/.test(text);
    let at = noSecondName ? 1 : tokens.length >= 4 || noSecondSurname ? 2 : 1;
    // «Juan De la Fuente»: the surname starts right after the first name.
    if (!noSecondName && at === 2 && particles.has(tokens[1].toLowerCase())) at = 1;
    const surname = [tokens[at]];
    while (particles.has(surname.at(-1).toLowerCase()) && tokens[at + surname.length]) surname.push(tokens[at + surname.length]);
    return tokens[0] + ' ' + surname.join(' ');
  }
  globalThis.HhrFichaProfessionalName = Object.freeze({ short });
})();
