/** Compose the three native nursing loaders into one table. Eloísa still owns
 * each row, its permissions, mutation handlers, filters and SWR invalidation. */
(() => {
  'use strict';
  const sources = ['Ingresos', 'Con novedad', 'Sin novedad'];
  const activity = ['Estadía', 'Última novedad', 'Última atención'];
  const columnIds = ['location', 'patient', 'hhrPrint', 'diagnosisAdmission', 'crd', 'assignesDoctor', 'isolated', 'activity', 'actions', 'link'];
  const handoffColumns = new Set(['location', 'patient', 'hhrPrint', 'diagnosisAdmission', 'activity']);
  const loadingColumns = [
    ['location', 'Ubicación', '8%'], ['patient', 'Paciente', '20%'], ['hhrPrint', 'Imprimir', '1%'],
    ['diagnosisAdmission', 'Diagnóstico Ingreso', '35%'], ['crd', 'CRD', '5%'],
    ['assignesDoctor', 'Médico tratante', '136px'], ['isolated', 'Aislado', '6%'],
    ['activity', 'Entrega de turno', '10%'], ['actions', 'Acciones', '5%'], ['link', '', '5%'],
  ].map(([id, label, width]) => ({ id, label, style: { width } }));
  const emptySource = { columns: [], children: [] };

  function joinTables(jsx, tables, handoff = globalThis.HhrNursingHandoffDemo === true) {
    const headers = new Map();
    const children = [];
    const episodes = new Set();
    // When an admission also appears in follow-up, keep the whole follow-up row
    // with its CRD and assignment actions. Native nursing row keys are encounter.id.
    for (const source of [1, 2, 0]) {
      const table = tables[source];
      if (!table) continue;
      for (const col of table.columns) headers.set(col.id, col);
      headers.set('activity', { id: 'activity', label: handoff ? 'Entrega de turno' : 'Actividad', style: { width: '10%' } });
      for (const [position, row] of table.children.entries()) {
        const episode = String(row.key ?? '');
        const valid = /^[1-9]\d*$/.test(episode);
        if (valid && episodes.has(episode)) continue;
        if (valid) episodes.add(episode);
        const cells = new Map();
        const native = row.props.children;
        table.columns.forEach(({ id }, index) => cells.set(id, native[index]));
        // The admissions renderer declares an Actions header but emits only
        // the final chart link. Keep that link in its own column.
        if (source === 0 && native.length + 1 === table.columns.length) {
          cells.delete('actions');
          cells.set('link', native.at(-1));
        }
        const detail = cells.get(['stay', 'lastNovelty', '"lastNursePublishDatetime"'][source]);
        if (handoff && valid) {
          cells.set('activity', jsx('td', { className: 'hhr-worklist-handoff', children: jsx('button', {
            type: 'button',
            'data-hhr-handoff-episode': episode,
            'aria-label': 'Abrir entrega de turno',
            title: 'Abrir entrega de turno',
            children: '✎',
          }) }));
        } else if (!handoff && detail?.props) {
          const value = detail.props.children;
          const children = typeof value === 'string' && value.startsWith('Sin registro') ? value : [activity[source], ' ', value];
          cells.set('activity', jsx(detail.type, { ...detail.props, className: 'hhr-worklist-activity', children }));
        }
        children.push({ row, cells, key: valid ? episode : source + '-' + position });
      }
    }
    const columns = columnIds.map(id => headers.get(id)).filter(Boolean);
    const rows = children.map(({ row, cells, key }) =>
      jsx(row.type, { ...row.props, children: columns.map(({ id }) => {
        const cell = cells.get(id);
        return cell?.props ? jsx(cell.type, { ...cell.props }, id) : jsx('td', {}, id);
      }) }, key));
    return { columns, listLenght: rows.length, children: globalThis.HhrWorklistPrintColumn.orderRows(rows) };
  }

  function create(require, getPage) {
    const React = require(12115);
    const { jsx } = require(95155);
    const navigation = require(20063);
    const Source = React.createContext(null);
    const Registry = React.createContext(null);
    const Novelty = React.createContext(null);
    const ReadNovelty = React.createContext(null);
    const Table = require(65672).A;
    function NoveltyLink({ episode, publication, publisher, ...marker }) {
      const read = React.useContext(ReadNovelty);
      const linkRef = React.useRef(null);
      const [resolved, setResolved] = React.useState();
      React.useEffect(() => {
        const link = linkRef.current;
        if (!read || !link || typeof IntersectionObserver !== 'function') return;
        let active = true;
        const observer = new IntersectionObserver(entries => {
          if (!entries.some(entry => entry.isIntersecting)) return;
          observer.disconnect();
          const current = () => active && link.isConnected &&
            location.pathname.replace(/\/$/, '') === '/dashboard/encounter-list-nurse';
          void read(episode, publication, publisher, current).then(kind => {
            if (current()) setResolved({ episode, publication, publisher, kind });
          });
        });
        observer.observe(link);
        return () => { active = false; observer.disconnect(); };
      }, [episode, publication, publisher, read]);
      const kind = resolved?.episode === episode && resolved.publication === publication &&
        resolved.publisher === publisher ? resolved.kind : undefined;
      return globalThis.HhrWorklistPrintColumn.renderNovelty(jsx, { ...marker, kind, linkRef });
    }
    function Capture(props) {
      const source = React.useContext(Source);
      const registry = React.useContext(Registry);
      const novelty = React.useContext(Novelty);
      const adapted = React.useMemo(() => {
        const publications = novelty && new Map(novelty.flatMap(row => row?.lastPhysicianPublishDatetime
          ? [[String(row.id), { publication: row.lastPhysicianPublishDatetime, publisher: row.legalHcpName }]] : []));
        return globalThis.HhrWorklistPrintColumn.adapt(jsx, props, '/dashboard/encounter-list-nurse', { publications, NoveltyLink });
      }, [props, novelty]);
      React.useLayoutEffect(() => {
        if (!registry || source == null) return;
        registry.set(source, adapted);
        return () => registry.set(source, null);
      }, [registry, source, adapted]);
      return registry && source != null ? null : jsx(Table, adapted);
    }
    function NativeLoading({ type, props }) {
      return React.useContext(Source) == null ? jsx(type, props) : null;
    }
    function SourceFailure({ type, props } = {}) {
      const index = React.useContext(Source);
      const registry = React.useContext(Registry);
      React.useLayoutEffect(() => {
        if (index == null || !registry) return;
        registry.set(index, emptySource);
        return () => registry.set(index, null);
      }, [index, registry]);
      return index == null ? jsx(type, props) : jsx('p', {
        role: 'alert', className: 'hhr-care-error',
        children: 'No se pudo cargar la lista de ' + sources[index].toLowerCase() + '.',
      });
    }
    function makeRegistry() {
      let tables = [null, null, null];
      const listeners = new Set();
      return {
        get: () => tables,
        subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
        set(i, value) { tables = tables.slice(); tables[i] = value; listeners.forEach(fn => fn()); },
      };
    }
    function Combined({ registry }) {
      const tables = React.useSyncExternalStore(registry.subscribe, registry.get, registry.get);
      const [expanded, setExpanded] = React.useState(false);
      const [visited, setVisited] = React.useState(false);
      const result = joinTables(jsx, tables, true);
      const loading = !result.listLenght && !tables.every(Boolean);
      const columns = expanded ? result.columns.filter(column => handoffColumns.has(column.id)).map(column =>
        column.id === 'activity' ? { ...column, style: { ...column.style, width: '52%' } } : column
      ) : result.columns.length ? result.columns : loadingColumns;
      const rows = visited ? result.children.map(row => React.cloneElement(row, { children:
        result.columns.flatMap(({ id }, index) => {
          if (expanded && !handoffColumns.has(id)) return [];
          const cell = row.props.children[index];
          if (id !== 'activity' || !/^[1-9]\d{0,15}$/.test(row.key)) return [cell];
          return [React.cloneElement(cell, { children: [
            jsx('div', { hidden: expanded, children: cell.props.children }, 'pencil'),
            jsx('div', { hidden: !expanded, 'data-hhr-handoff-inline': row.key }, 'editor'),
          ] })];
        }),
      })) : result.children;
      return jsx(React.Fragment, { children: [
        jsx('div', { className: 'hhr-handoff-toolbar', children: [
          jsx('span', { 'data-hhr-handoff-pending': '', role: 'status', hidden: !expanded }, 'pending'),
          jsx('button', {
            type: 'button', 'data-hhr-handoff-toggle': '', 'aria-expanded': expanded,
            disabled: !result.listLenght && !expanded,
            onClick: event => {
              if (!event.isTrusted) return;
              setVisited(true);
              setExpanded(previous => !previous);
            },
            children: expanded ? 'Volver a la lista' : 'Entrega de turno',
          }, 'toggle'),
        ] }, 'handoff-toolbar'),
          loading ? jsx('div', { className: 'hhr-care-loading', role: 'status', 'aria-label': 'Cargando pacientes hospitalizados',
            children: jsx(Table, { columns: loadingColumns, listLenght: 5, currentPage: 1, children:
              Array.from({ length: 5 }, (_, i) => jsx('tr', { 'aria-hidden': true, children:
                loadingColumns.map(({ id }) => jsx('td', { children: jsx('span', { className: 'hhr-care-placeholder' }) }, id)),
              }, i)) }) }, 'loading') : jsx(Table, { ...result, columns, children: rows, currentPage: 1, header: jsx('div', {
          hidden: true, children: 'Pacientes hospitalizados (' + result.listLenght + ')' }) }, 'patients'),
      ] });
    }
    function useSearchParams() {
      const params = navigation.useSearchParams();
      const index = React.useContext(Source);
      if (index == null) return params;
      const local = new URLSearchParams(params);
      local.set('tab', String(index));
      return local;
    }
    class SourceError extends React.Component {
      state = { failed: false };
      static getDerivedStateFromError() { return { failed: true }; }
      render() {
        return this.state.failed ? jsx(SourceFailure, {}) : this.props.children;
      }
    }
    function SourcePanel({ registry, index, children }) {
      const tables = React.useSyncExternalStore(registry.subscribe, registry.get, registry.get);
      // Keep each native loader mounted for refreshes, but remove its empty layout from the table's flow.
      return jsx('div', { hidden: Boolean(tables[index] && tables[index] !== emptySource), className: 'hhr-care-source', children });
    }
    function Hospitalized({ active, loaded }) {
      const [registry] = React.useState(makeRegistry);
      const [readNovelty] = React.useState(() => globalThis.HhrNursingNovelty?.createReader(async episode => {
        const response = await require(40767).A('/encounter/' + episode +
          '/getPatientEncounterHistoryReportServer/false/0/0/-14', {
          method: 'GET', headers: { 'Content-Type': 'application/json' },
        });
        return response?.status === 'error' ? undefined : response?.data;
      }));
      return jsx('section', { role: 'tabpanel', id: 'hhr-care-panel-0', 'aria-labelledby': 'hhr-care-tab-0',
        className: 'hhr-hospitalized-panel', children: jsx(Registry.Provider, { value: registry, children: [
          ...sources.map((_, index) => jsx(Source.Provider, { value: index,
            children: jsx(SourcePanel, { registry, index, children: jsx(SourceError, { children: jsx(React.Suspense, {
              fallback: null,
              children: index === active ? loaded : jsx(getPage(), {}),
            }) }) }) }, index)),
          jsx(ReadNovelty.Provider, { value: readNovelty, children: jsx(Combined, { registry }) }, 'table'),
        ] }) });
    }
    function Layout({ type, props }) {
      const source = React.useContext(Source);
      const params = navigation.useSearchParams();
      const router = navigation.useRouter();
      const resetPage = require(575).A(state => state.setCurrentPage);
      const items = props.children;
      if (source != null) return items[2 + source].props.children;
      const active = Number(params.get('tab')) || 0;
      if (active < 0 || active > 3 || !Number.isInteger(active)) return jsx(type, props);
      const discharged = active === 3;
      const tabs = jsx(require(68175).A, {
        value: discharged ? 3 : 0, 'aria-label': 'Gestión de cuidados',
        onChange: (_, value) => {
          const query = new URLSearchParams(params);
          query.set('tab', String(value));
          query.delete('page');
          resetPage(1);
          router.replace(location.pathname + '?' + query);
        },
        children: [[0, 'Pacientes hospitalizados'], [3, 'Egresos']].map(([value, label]) =>
          jsx(require(26466).A, { value, label, id: 'hhr-care-tab-' + value, 'aria-controls': 'hhr-care-panel-' + value,
            sx: { textTransform: 'none', paddingX: 0, mr: 2 } }, value)),
      });
      let panel = React.cloneElement(items[5], { id: 'hhr-care-panel-3', 'aria-labelledby': 'hhr-care-tab-3' });
      if (!discharged) {
        const session = items[2 + active].props.children.props.session;
        const scope = [session.facilityId, session.healthCarePractitionerId, session.healthCarePractitionerRoleId].join('-');
        panel = jsx(Hospitalized, { active, loaded: items[2 + active].props.children }, scope);
      }
      return jsx(type, { ...props, children: [tabs, items[1], panel, ...items.slice(6)] });
    }
    return {
      navigation: { ...navigation, useSearchParams },
      table: { ...require(65672), A: Capture },
      novelty: Novelty,
      loading: NativeLoading,
      failure: SourceFailure,
      layout(jsxs, type, props, ...rest) {
        const items = props?.children;
        if (!Array.isArray(items) || ![0, 1, 2, 3].every(i => items[i + 2]?.props?.index === i)) return jsxs(type, props, ...rest);
        return jsx(Layout, { type, props }, ...rest);
      },
    };
  }
  globalThis.HhrNursingWorklist = { create, joinTables };
})();
