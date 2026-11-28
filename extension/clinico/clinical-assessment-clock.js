// Assessments record Rapa Nui dates and times. Reassessments are scheduled by calendar date.
(() => {
  'use strict';
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

  function nextValuationDate(date, days) {
    const day = calendarDay(date);
    if (!day) return null;
    // UTC provides calendar arithmetic without changes in the Rapa Nui clock.
    day.setUTCDate(day.getUTCDate() + days);
    return day.toISOString().split('T')[0];
  }

  globalThis.HhrClinicalAssessmentClock = Object.freeze({
    hospitalDateTimeNow, calendarDay, birthDayOf, completedYears, parseValuationStamp, nextValuationDate,
  });
})();
