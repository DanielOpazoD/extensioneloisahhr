/** Render the document column with the same React rows and keys as Eloísa. */
(() => {
  'use strict';
  const documents = [
    ['indications', 'Imprimir indicaciones vigentes de hoy', 'M8 5H5v15h14V5h-3 M9 3h6v4H9z M8 11h8 M8 15h6'],
    ['prescription', 'Imprimir última receta completa', 'M6 17V4h4a4 4 0 0 1 0 8H6 M9 12l9 9 M19 12l-7 9'],
  ];

  function encounterForRow(cells, discharge, route) {
    // Medical discharges have no chart link. Their native discharge actions
    // explicitly receive both patId and encId; the React row key is not an ID.
    if (discharge) {
      const action = cells.at(-1)?.props?.children?.props;
      if (!/^[1-9]\d*$/.test(action?.patId) || !/^[1-9]\d*$/.test(action?.encId)) return {};
      return { encId: String(action.encId), patientId: String(action.patId) };
    }
    const ids = new Set();
    function visit(child) {
      if (Array.isArray(child)) return child.forEach(visit);
      const props = child?.props;
      if (!props) return;
      if (typeof props.href === 'string' && props.component !== 'div') {
        const match = props.href.match(/^(\/dashboard\/encounter-list(?:-nurse)?)\/([1-9]\d*)\/?(?:\?referralGuid=[^#]*)?$/);
        if (match?.[1] === route) ids.add(match[2]);
      }
      visit(props.children);
    }
    visit(cells[1]);
    visit(cells.at(-1));
    return ids.size === 1 ? { encId: [...ids][0] } : {};
  }

  const adapt = (jsx, props, route) => {
    const { columns, children: rows } = props;
    if (!Array.isArray(columns) || !Array.isArray(rows) || !Number.isInteger(props.listLenght) ||
        columns[0]?.id !== 'location' || columns[1]?.id !== 'patient') return props;
    const ges = columns.findIndex(column => column.id === 'ges');
    const referral = ges < 0 && columns.some(column => column.id === 'referralReason');
    if (ges < 0 && !referral) return props;
    const index = referral ? 2 : ges;
    if (rows.some(row => !Array.isArray(row?.props?.children) || !row.props.children[index]?.type)) return props;
    const discharge = route === '/dashboard/encounter-list' && columns.some(col => col.id === 'medicalDischargeDatetime');
    const nextColumns = columns.slice();
    nextColumns.splice(index, referral ? 0 : 1, { id: 'hhrPrint', label: 'Imprimir', style: { width: '1%' } });
    return { ...props, columns: nextColumns, children: rows.map(row => {
      const cells = row.props.children.slice();
      const { encId, patientId } = encounterForRow(cells, discharge, route);
      const buttons = documents.map(([kind, label, path]) => jsx('button', {
        type: 'button', 'data-hhr-print-document': kind, disabled: !encId,
        'aria-label': label, title: encId ? label : 'Episodio sin acceso verificable',
        children: jsx('svg', { viewBox: '0 0 24 24', width: 17, height: 17, fill: 'none',
          stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round',
          'aria-hidden': true, children: jsx('path', { d: path }) }),
      }, kind));
      cells.splice(index, referral ? 0 : 1, jsx('td', { className: 'hhr-worklist-documents',
        'data-hhr-worklist-episode': encId, 'data-hhr-worklist-patient': patientId, children: buttons }, 'hhrPrint'));
      return jsx(row.type, { ...row.props, children: cells }, row.key ?? undefined);
    }) };
  };
  globalThis.HhrWorklistPrintColumn = Object.freeze({ adapt });
})();
