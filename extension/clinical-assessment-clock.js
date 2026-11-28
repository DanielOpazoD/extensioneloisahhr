// Valuation dates are Rapa Nui wall clocks. Calendar-day and elapsed-hour schedules differ at DST.
(() => {
  'use strict';
  const HOUR_MS = 3_600_000;
  const DAY_MS = 24 * HOUR_MS;
  const STAMP = /^(\d{4}-\d{2}-\d{2}) ((?:[01]\d|2[0-3]):[0-5]\d)(?: · [^\n]+)?$/;
  const hospitalClock = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Pacific/Easter', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  });

  function hospitalDateTimeNow(now = new Date()) {
    const parts = Object.fromEntries(hospitalClock.formatToParts(now).map(part => [part.type, part.value]));
    return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
  }

  function calendarDay(value) {
    const text = String(value || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
    const day = new Date(text + 'T00:00:00Z');
    return Number.isFinite(day.getTime()) && day.toISOString().startsWith(text) ? day : null;
  }

  // Birthdates, unlike timestamps of clinical events, are civil dates.
  const birthDayOf = value => calendarDay(String(value || '').trim().match(/^\d{4}-\d{2}-\d{2}(?=$|[T ])/i)?.[0]);
  function completedYears(birth, assessment) {
    const month = assessment.getUTCMonth();
    const birthMonth = birth.getUTCMonth();
    const beforeBirthday = month < birthMonth || (month === birthMonth && assessment.getUTCDate() < birth.getUTCDate());
    return assessment.getUTCFullYear() - birth.getUTCFullYear() - Number(beforeBirthday);
  }

  function parseValuationStamp(line) {
    const stamp = STAMP.exec(line || '');
    return stamp && calendarDay(stamp[1]) ? { date: stamp[1], time: stamp[2] } : null;
  }

  const wallTime = ({ date, time }) => Date.parse(date + 'T' + time + ':00Z');

  function localInstants(stamp) {
    const wall = wallTime(stamp);
    const candidates = new Set();
    for (const probe of [wall - DAY_MS, wall + DAY_MS]) {
      const offset = wallTime(hospitalDateTimeNow(new Date(probe))) - probe;
      const instant = wall - offset;
      if (wallTime(hospitalDateTimeNow(new Date(instant))) === wall) candidates.add(instant);
    }
    return [...candidates];
  }

  function nextValuation(stamp, cadence) {
    if (cadence.days) {
      const date = new Date(wallTime(stamp) + cadence.days * DAY_MS).toISOString().slice(0, 10);
      const next = { date, time: stamp.time };
      return localInstants(next).length ? next : { date, time: '' };
    }
    const instants = localInstants(stamp);
    return instants.length === 1 ? hospitalDateTimeNow(new Date(instants[0] + cadence.hours * HOUR_MS)) : null;
  }

  globalThis.HhrClinicalAssessmentClock = Object.freeze({
    hospitalDateTimeNow, calendarDay, birthDayOf, completedYears, parseValuationStamp, nextValuation,
  });
})();
