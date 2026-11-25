/** A read-only summary of the measurements already present in the native table. */
(() => {
  'use strict';
  const clean = value => value.trim().replace(/\s+/g, ' ');
  const key = value => clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  // Names used by both medical and nursing cards, and by the native detail table.
  const signs = [
    ['PA','Presión arterial',['PA'],['Presión']],
    ['FC','Frecuencia cardíaca',['FC'],['Fre. Cardíaca','Frec. Cardíaca']],
    ['FR','Frecuencia respiratoria',['FR'],['Fre. respiratoria','Frec. respiratoria']],
    ['SatO₂','Saturación de oxígeno',['Saturación','Saturación O2','SatO2','SpO2']],
    ['T°','Temperatura',['T°']],
    ['T° ax.','Temperatura axilar',null,['T° axilar','T° ax.']],
    ['HGT','Hemoglucotest',null,['HGT']],
    ['','Glasgow',null],['','Suplemento de oxígeno',null,['Sup. Oxígeno']],['','EVA',null],
  ];
  const nameKey = text => key(text).replaceAll('₂','2').replaceAll('º','°').replaceAll('.','');
  const names = new Map();
  for (const [label,full,usual,compactAliases = []] of signs) {
    for (const alias of [full,...(usual || []),...compactAliases]) {
      const name = nameKey(alias);
      names.set(name,{label,full,compactOnly:!usual || compactAliases.includes(alias),pairedPressure:name === 'presion'});
    }
  }
  const identify = text => names.get(nameKey(text));
  const isArterialPair = (text, unit = '') => /^\s*\d{1,3}\s*\/\s*\d{1,3}\b/.test(text) && (!unit || /^mm\s*hg$/i.test(unit));
  function metric(text, compact = true) {
    const parts = /^([^()]+?)(?:\s*\(([^()]+)\))?$/.exec(clean(text));
    const sign = parts && identify(parts[1]);
    return sign?.label && (compact || !sign.compactOnly) && { ...sign, unit:parts[2] || '' };
  }
  const dateKey = stamp => {
    const match = /^(\d{2})[-/](\d{2})[-/](\d{4})[, ]+(\d{2}):(\d{2})(?::(\d{2}))?(?:\s*(?:h|hrs?))?$/i.exec(stamp);
    if (!match) return null;
    const [,day,month,year,hour,minute,second = '00'] = match;
    const calendar = new Date(Date.UTC(+year, +month - 1, +day));
    if (calendar.getUTCFullYear() !== +year || calendar.getUTCMonth() !== +month - 1 ||
        calendar.getUTCDate() !== +day || +hour > 23 || +minute > 59 || +second > 59) return null;
    return year + month + day + hour + minute + second;
  };

  function timeColumns(keys) {
    let time = keys.findIndex(k => /^(?:hora|fecha y hora|fecha hora|fecha\/hora|hora de medicion)$/.test(k));
    let date = keys.indexOf('fecha');
    if (time < 0 && date >= 0) { time = date; date = -1; }
    return {date,time};
  }
  function nativeOlderTimes(table) {
    // An attributed row may carry flags, colours, generated content or editable controls.
    // Keep it native. Compare only plain, visible timestamps, without copying clinical values.
    if (table?.tHead?.rows.length !== 1 || table.tBodies.length !== 1) return [];
    const keys = Array.from(table.tHead.rows[0].cells, cell => key(cell.textContent));
    if (new Set(keys).size !== keys.length || !keys.some(k => /^(?:autor|profesional|registrado por|profesional que registra)$/.test(k)) ||
        table.querySelector('[rowspan]:not([rowspan="1"]),[colspan]:not([colspan="1"])')) return [];
    const {date,time} = timeColumns(keys);
    const namedVitals = keys.some(k => /^(?:signo vital|signo|parametro)$/.test(k)) &&
      keys.some(k => /^(?:valor|resultado)$/.test(k));
    if (time < 0 || (!namedVitals && !keys.some(text => metric(text)))) return [];
    const times = [];
    for (const row of table.tBodies[0].rows) {
      if (row.cells.length !== keys.length) return [];
      const timestamp = row.cells[time];
      const parts = date < 0 ? [timestamp] : [row.cells[date],timestamp];
      if ([...row.cells].some(cell => cell.closest('[hidden],[aria-hidden=true]') ||
          !cell.checkVisibility?.({checkVisibilityCSS:true,checkOpacity:true}))) continue;
      if (parts.some(cell => cell.childElementCount)) return [];
      const value = dateKey(parts.map(cell => clean(cell.textContent)).join(' '));
      if (!value) return [];
      times.push({timestamp,value});
    }
    const newest = times.reduce((max, item) => item.value > max ? item.value : max, '');
    return times.filter(item => item.value < newest).map(item => item.timestamp);
  }

  function readings(table, compact) {
    if (!table || table.tHead?.rows.length !== 1 || table.tBodies.length !== 1 ||
        table.querySelector('button,a,input,select,textarea,svg,img,[role=alert],[role=progressbar],[hidden],[aria-hidden=true],[aria-busy=true],.MuiSkeleton-root,[colspan]:not([colspan="1"]),[rowspan]:not([rowspan="1"])')) return null;
    // Preserve native rows that may encode clinical flags in styling, markup or tooltips.
    if (table.tBodies[0].querySelector('td *,[style],[class],[title],[aria-label]')) return null;
    const headings = Array.from(table.tHead.rows[0].cells, cell => clean(cell.textContent));
    const keys = headings.map(key);
    const {date,time} = timeColumns(keys);
    const sign = keys.findIndex(k => /^(?:signo vital|signo|parametro)$/.test(k));
    const value = keys.findIndex(k => /^(?:valor|resultado)$/.test(k));
    const unit = keys.indexOf('unidad');
    const columns = headings.map(text => metric(text,compact));
    if (time < 0 || (sign >= 0 ? value < 0 : !columns.some(Boolean))) return null;
    if (new Set(keys).size !== keys.length || (sign < 0 && (value >= 0 || unit >= 0)) ||
        (sign >= 0 && columns.some(Boolean))) return null;
    if (keys.some((_, i) => ![time,date,sign,value,unit].includes(i) && !columns[i])) return null;
    const latest = new Map();
    function add(kind, raw, stamp, units) {
      if (!kind || !raw || !stamp || !/\b\d{1,2}:\d{2}\b/.test(stamp)) return false;
      const suffix = units || kind.unit;
      if (kind.pairedPressure && !isArterialPair(raw,suffix)) return false;
      const display = suffix && !raw.toLowerCase().endsWith(suffix.toLowerCase()) ? raw+' '+suffix : raw;
      const prev = latest.get(kind.label);
      if (prev) {
        if (prev.stamp === stamp) return prev.display === display;
        const a = dateKey(prev.stamp), b = dateKey(stamp);
        if (!a || !b) return false;
        if (a === b) return prev.display === display;
        if (a > b) return true;
      }
      latest.set(kind.label, {label:kind.label, full:kind.full, display, stamp});
      return true;
    }
    for (const row of table.tBodies[0].rows) {
      const cells = Array.from(row.cells, cell => clean(cell.textContent));
      if (cells.length !== headings.length) return null;
      const stamp = (date < 0 ? '' : cells[date]+' ') + cells[time];
      if (sign >= 0) {
        if (!add(metric(cells[sign],compact), cells[value], stamp, cells[unit])) return null;
      } else {
        for (const [i, kind] of columns.entries()) {
          if (kind && cells[i] && !add(kind, cells[i], stamp)) return null;
        }
      }
    }
    return signs.map(([label]) => latest.get(label)).filter(Boolean);
  }

  function create() {
    const bar = document.createElement('div');
    bar.className = 'hhr-ficha-vitals';
    const list = document.createElement('dl'), button = document.createElement('button');
    button.type = 'button';
    bar.append(list,button);
    let source, previous, expanded = false;
    let markedTimes = new Set();
    function markNativeTimes(cells) {
      const next = new Set(cells);
      for (const cell of markedTimes) if (!next.has(cell)) cell.removeAttribute('data-hhr-vital-older');
      for (const cell of next) if (!markedTimes.has(cell)) cell.setAttribute('data-hhr-vital-older','');
      markedTimes = next;
    }
    function display() {
      source?.toggleAttribute('data-hhr-vital-detail-folded', !expanded);
      button.textContent = expanded ? 'Ocultar registros' : 'Ver registros';
      button.setAttribute('aria-expanded', String(expanded));
    }
    button.addEventListener('click', () => { expanded = !expanded; display(); });
    function clearStrip() {
      source?.removeAttribute('data-hhr-vital-detail-folded');
      bar.remove();
      if (previous) list.replaceChildren();
      source = previous = null; expanded = false;
    }
    function refresh(section) {
      const tables = section?.querySelectorAll('table');
      const table = tables?.length === 1 ? tables[0] : null;
      const compact = document.documentElement.dataset.hhrFichaTheme === 'compact';
      const ready = table && !section.closest('[aria-busy=true]') && !section.querySelector('[aria-busy=true],.MuiSkeleton-root,[role=alert]');
      const data = ready && readings(table,compact);
      if (!data?.length) {
        clearStrip();
        markNativeTimes(ready && compact ? nativeOlderTimes(table) : []);
        return;
      }
      markNativeTimes([]);
      if (table !== source || bar.parentElement !== table.parentElement) {
        clearStrip(); source = table; table.before(bar); display();
      }
      const signature = JSON.stringify([compact,data]);
      if (signature === previous) return;
      previous = signature;
      // A time without its date cannot establish which day a measurement belongs to.
      const dates = compact ? data.map(row => dateKey(row.stamp)) : [];
      const newest = dates.length && dates.every(Boolean) ? dates.reduce((a,b) => a > b ? a : b) : null;
      list.replaceChildren(...data.map(({label, full, display, stamp}, index) => {
        const cell = document.createElement('div'), title = document.createElement('dt');
        const reading = document.createElement('dd'), time = document.createElement('small');
        title.textContent = label; title.title = full;
        title.setAttribute('aria-label', full);
        reading.textContent = display; time.textContent = stamp;
        if (newest && dates[index] < newest) time.setAttribute('data-hhr-vital-older','');
        reading.append(time); cell.append(title,reading);
        return cell;
      }));
    }
    return {refresh, clear() { clearStrip(); markNativeTimes([]); }};
  }
  globalThis.HhrFichaVitalStrip = Object.freeze({ create, identify, isArterialPair });
})();
