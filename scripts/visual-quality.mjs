// Two measures every view of the ficha keeps (docs/estilo-ficha.md): text that reads at 4.5:1 or more
// against what is painted behind it, and controls of at least 24 × 24 px (WCAG 2.2, 1.4.3 and 2.5.8).
// It reads the page as it is painted: a text hidden by its own styles or by a folded block is not read.
export const readQuality = (page, scope = 'main') => page.evaluate(scope => {
  const root = document.querySelector(scope);
  if (!root) return null;
  const css = (el, pseudo) => getComputedStyle(el, pseudo);
  const channels = colour => (colour.match(/[\d.]+/g) || []).map(Number);
  const luminance = ([r, g, b]) => [r, g, b].map(v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; })
    .reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
  // The first background painted behind an element, blended over white where it is translucent.
  const behind = el => {
    const layers = [];
    for (let node = el; node; node = node.parentElement) {
      const [r, g, b, a = 1] = channels(css(node).backgroundColor);
      if (a > 0) layers.push([r, g, b, a]);
      if (a >= 1) break;
    }
    return layers.reduceRight((under, [r, g, b, a]) => under.map((v, i) => [r, g, b][i] * a + v * (1 - a)), [255, 255, 255]);
  };
  const painted = el => el.getClientRects().length && css(el).visibility !== 'hidden' && el.checkVisibility?.({opacityProperty:true, visibilityProperty:true}) !== false;
  const outside = el => el.closest('dialog,[role=dialog],#hhr-clinical-operations-bar,[aria-hidden="true"]');
  const name = el => (el.getAttribute('aria-label') || el.title || el.closest('label')?.title || el.textContent || el.closest('label')?.textContent ||
    el.querySelector('svg[aria-label]')?.getAttribute('aria-label') || el.tagName).replace(/\s+/g, ' ').trim().slice(0, 40);

  const contrast = [], palette = new Map(), figures = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const seen = new Set();
  while (walker.nextNode()) {
    const el = walker.currentNode.parentElement;
    if (!walker.currentNode.textContent.trim() || !el || seen.has(el) || outside(el) || !painted(el)) continue;
    seen.add(el);
    const look = css(el), size = parseFloat(look.fontSize);
    if (!size || el.closest('button:disabled,.Mui-disabled,[aria-disabled="true"]')) continue;
    const [r, g, b, a = 1] = channels(look.color);
    const back = behind(el), front = [r, g, b].map((v, i) => v * a + back[i] * (1 - a));
    const [light, dark] = [luminance(front), luminance(back)].sort((x, y) => y - x);
    const ratio = (light + .05) / (dark + .05);
    const ink = 'rgb(' + front.map(Math.round).join(', ') + ')';
    if (/\d/.test(el.textContent) && !look.fontVariantNumeric.includes('tabular-nums')) figures.push(name(el));
    palette.set(ink, (palette.get(ink) || []).concat(name(el)));
    const large = size >= 24 || (size >= 18.66 && Number(look.fontWeight) >= 700);
    if (ratio < (large ? 3 : 4.5)) contrast.push(`${name(el)} ${ratio.toFixed(2)}:1 ${look.color} sobre rgb(${back.map(Math.round).join(', ')})`);
  }

  const small = [];
  const controls = [...root.querySelectorAll('button,a[href],input:not([type=hidden]),select,textarea,[role=button],[role=combobox],[role=tab],[role=checkbox],[role=switch]')]
    // A link inside a line of text is exempt (2.5.8, inline).
    .filter(control => !outside(control) && painted(control) && !control.disabled && !(control.matches('a') && css(control).display === 'inline'));
  // A control inside a label is as large as the label: the pointer takes either.
  const targets = [...new Set(controls.map(control => control.closest('label') || control))];
  const boxes = targets.map(target => {
    const rects = [target, ...(target.matches('label') ? target.querySelectorAll('input') : [])].map(el => el.getBoundingClientRect());
    const left = Math.min(...rects.map(r => r.left)), top = Math.min(...rects.map(r => r.top));
    return {target, left, top, right:Math.max(...rects.map(r => r.right)), bottom:Math.max(...rects.map(r => r.bottom))};
  });
  for (const box of boxes) {
    const width = box.right - box.left, height = box.bottom - box.top;
    if (width >= 23.5 && height >= 23.5) continue;
    // Spacing exception: a smaller target passes when a 24 px square on its centre takes no other target.
    const x = (box.left + box.right) / 2, y = (box.top + box.bottom) / 2;
    const crowded = boxes.some(other => other !== box && !other.target.contains(box.target) && !box.target.contains(other.target) &&
      other.left < x + 12 && other.right > x - 12 && other.top < y + 12 && other.bottom > y - 12);
    if (crowded) small.push(`${name(box.target.matches('label') ? box.target.querySelector('input') || box.target : box.target)} ${Math.round(width)}×${Math.round(height)}`);
  }
  return {contrast:[...new Set(contrast)], small:[...new Set(small)], figures:[...new Set(figures)], palette:Object.fromEntries([...palette].map(([ink, names]) => [ink, names.slice(0, 3)]))};
}, scope);

// Every view reads at 4.5:1 and keeps its targets at 24 px, or 24 px apart.
export async function assertQuality(page, view, assert, scope = 'main') {
  const quality = await readQuality(page, scope);
  assert.ok(quality, `${view}: no hay ${scope} que leer`);
  assert.ok(!quality.contrast.length, `${view}: todo texto se lee a 4,5:1 o más (3:1 si es grande): ${quality.contrast.join(' | ')}`);
  assert.ok(!quality.small.length, `${view}: todo control mide 24 px o deja 24 px libres a su alrededor: ${quality.small.join(' | ')}`);
}

// The inks of the view (docs/estilo-ficha.md): text, soft text, muted, action, alarm, the disabled ink and the
// two marks of an order (SOS, antimicrobial). A text in any other ink is a colour the view did not choose.
export const viewInks = ['rgb(33, 33, 33)', 'rgb(74, 74, 74)', 'rgb(102, 102, 102)', 'rgb(40, 95, 89)', 'rgb(198, 40, 40)', 'rgb(152, 163, 159)', 'rgb(21, 87, 84)', 'rgb(112, 66, 0)'];
export async function assertPalette(page, view, assert, scope = 'main', allowed = viewInks) {
  const {palette} = await readQuality(page, scope);
  const stray = Object.entries(palette).filter(([ink]) => !allowed.includes(ink));
  assert.ok(!stray.length, `${view}: todo texto usa una tinta de la vista: ` + JSON.stringify(stray));
}

// Every figure of the view takes the same width, so numbers line up from row to row.
export async function assertFigures(page, view, assert, scope = 'main') {
  const {figures} = await readQuality(page, scope);
  assert.ok(!figures.length, `${view}: todo número se lee en columna: ` + JSON.stringify(figures.slice(0, 8)));
}
