/** A read-only summary of the measurements already present in the native table. */
(() => {
  'use strict';
  const clean = value => value.trim().replace(/\s+/g, ' ');
  const key = value => clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const signs = new Map([
    ['presion arterial','PA'], ['pa','PA'], ['frecuencia cardiaca','FC'], ['fc','FC'],
    ['frecuencia respiratoria','FR'], ['fr','FR'], ['saturacion','SatO₂'], ['saturacion de oxigeno','SatO₂'],
    ['saturacion o2','SatO₂'], ['sato2','SatO₂'], ['spo2','SatO₂'], ['temperatura','T°'], ['t°','T°'],
  ]);
  function metric(text) {
    const parts = /^([^()]+?)(?:\s*\(([^()]+)\))?$/.exec(clean(text));
    const label = parts && signs.get(key(parts[1]).replaceAll('₂','2'));
    return label && { label, unit:parts[2] || '' };
  }
  const dateKey = stamp => {
    const match = /^(\d{2})[-/](\d{2})[-/](\d{4})[, ]+(\d{2}):(\d{2})(?::(\d{2}))?(?:\s*(?:h|hrs?))?$/i.exec(stamp);
    return match && match[3]+match[2]+match[1]+match[4]+match[5]+(match[6] || '00');
  };

  function readings(table) {
    if (!table || table.tHead?.rows.length !== 1 || table.tBodies.length !== 1 ||
        table.querySelector('button,a,input,select,textarea,svg,img,[role=alert],[role=progressbar],[hidden],[aria-hidden=true],[aria-busy=true],.MuiSkeleton-root,[colspan]:not([colspan="1"]),[rowspan]:not([rowspan="1"])')) return null;
    const headings = Array.from(table.tHead.rows[0].cells, cell => clean(cell.textContent));
    const keys = headings.map(key);
    let time = keys.findIndex(k => /^(?:hora|fecha y hora|fecha hora|fecha\/hora|hora de medicion)$/.test(k));
    let date = keys.indexOf('fecha');
    if (time < 0 && date >= 0) { time = date; date = -1; }
    const sign = keys.findIndex(k => /^(?:signo vital|signo|parametro)$/.test(k));
    const value = keys.findIndex(k => /^(?:valor|resultado)$/.test(k));
    const unit = keys.indexOf('unidad');
    const columns = headings.map(metric);
    if (time < 0 || (sign >= 0 ? value < 0 : !columns.some(Boolean))) return null;
    if (new Set(keys).size !== keys.length || (sign < 0 && (value >= 0 || unit >= 0)) ||
        (sign >= 0 && columns.some(Boolean))) return null;
    if (keys.some((_, i) => ![time,date,sign,value,unit].includes(i) && !columns[i])) return null;
    const latest = new Map();
    function add(kind, raw, stamp, units) {
      if (!kind || !raw || !stamp || !/\b\d{1,2}:\d{2}\b/.test(stamp)) return false;
      const suffix = units || kind.unit;
      const display = suffix && !raw.toLowerCase().endsWith(suffix.toLowerCase()) ? raw+' '+suffix : raw;
      const prev = latest.get(kind.label);
      if (prev) {
        if (prev.stamp === stamp) return prev.display === display;
        const a = dateKey(prev.stamp), b = dateKey(stamp);
        if (!a || !b || a === b) return false;
        if (a > b) return true;
      }
      latest.set(kind.label, {label:kind.label, display, stamp});
      return true;
    }
    for (const row of table.tBodies[0].rows) {
      const cells = Array.from(row.cells, cell => clean(cell.textContent));
      if (cells.length !== headings.length) return null;
      const stamp = (date < 0 ? '' : cells[date]+' ') + cells[time];
      if (sign >= 0) {
        if (!add(metric(cells[sign]), cells[value], stamp, cells[unit])) return null;
      } else {
        for (const [i, kind] of columns.entries()) {
          if (kind && cells[i] && !add(kind, cells[i], stamp)) return null;
        }
      }
    }
    return ['PA','FC','FR','SatO₂','T°'].map(label => latest.get(label)).filter(Boolean);
  }

  function create() {
    const bar = document.createElement('div');
    bar.className = 'hhr-ficha-vitals';
    const list = document.createElement('dl'), button = document.createElement('button');
    button.type = 'button';
    bar.append(list,button);
    let source, previous, expanded = false;
    function display() {
      source?.toggleAttribute('data-hhr-vital-detail-folded', !expanded);
      button.textContent = expanded ? 'Ocultar registros' : 'Ver registros';
      button.setAttribute('aria-expanded', String(expanded));
    }
    button.addEventListener('click', () => { expanded = !expanded; display(); });
    function clear() {
      source?.removeAttribute('data-hhr-vital-detail-folded');
      bar.remove();
      if (previous) list.replaceChildren();
      source = previous = null; expanded = false;
    }
    function refresh(section) {
      const tables = section?.querySelectorAll('table');
      const table = tables?.length === 1 ? tables[0] : null;
      const data = table && !section.closest('[aria-busy=true]') && !section.querySelector('[aria-busy=true],.MuiSkeleton-root,[role=alert]') && readings(table);
      if (!data?.length) { clear(); return; }
      if (table !== source || bar.parentElement !== table.parentElement) {
        clear(); source = table; table.before(bar); display();
      }
      const signature = JSON.stringify(data);
      if (signature === previous) return;
      previous = signature;
      list.replaceChildren(...data.map(({label, display, stamp}) => {
        const cell = document.createElement('div'), title = document.createElement('dt');
        const reading = document.createElement('dd'), time = document.createElement('small');
        title.textContent = label; reading.textContent = display; time.textContent = stamp;
        reading.append(time); cell.append(title,reading);
        return cell;
      }));
    }
    return {refresh,clear};
  }
  globalThis.HhrFichaVitalStrip = Object.freeze({ create });
})();
