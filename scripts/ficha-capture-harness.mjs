// Shared mounting for the visual captures of the ficha: the same synthetic page is decorated
// with the styles and content scripts that a given revision declares in its manifest.
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';

/** Reads one extension file from a git revision, or from the working tree with WORKTREE. */
export const extensionSource = revision => filename => revision === 'WORKTREE'
  ? readFile('extension/' + filename, 'utf8')
  : execFileSync('git', ['show', revision + ':extension/' + filename], {encoding:'utf8'});

/** The presentation files of the ficha that the revision ships, in manifest order. */
export async function fichaAssets(revision) {
  const source = extensionSource(revision);
  const manifest = JSON.parse(await source('manifest.json'));
  const entry = manifest.content_scripts.find(group => group.js?.includes('hhr-native-ficha-presentation.js'));
  return {
    source, version:manifest.version,
    styles:entry.css.filter(name => name.startsWith('hhr-ficha-') || name === 'clinical-checklist.css'),
    scripts:entry.js.filter(name => /^(hhr-ficha-|hhr-(history-date-navigation|native-ficha-presentation)\.js$|clinical-(assessment-clock|braden-notes|checklist-(falls|braden(?:-templates)?))\.js$)/.test(name)),
  };
}

/**
 * Injects the revision's presentation into a page that already holds a synthetic ficha and
 * starts its three readers. The page then answers two events, as the content script would
 * after a host update or a change of view: `fixture-refresh` and `fixture-theme` (detail: view id).
 * `sans` replaces the family of the views, to measure them with the text of another platform.
 * `notes` gives the reader of evolutions what the worker would answer, by window of days.
 */
export async function mountFicha(page, assets, {encounter = '1', theme = 'compact', sans = '', notes = null} = {}) {
  for (const name of assets.styles) await page.addStyleTag({content:await assets.source(name)});
  if (sans) await page.addStyleTag({content:`html[data-hhr-ficha-theme]{--hhr-ficha-sans:${sans}}`});
  for (const name of assets.scripts) await page.addScriptTag({content:await assets.source(name)});
  await page.evaluate(({encounter, theme, notes}) => {
    const summary = window.HhrNativeFichaPresentation.create();
    const dates = window.HhrHistoryDateNavigation.create();
    // `notes` stands for the worker: what it would answer for each window of days, or an error.
    window.fichaNoteRequests = [];
    const authors = window.HhrFichaEvolutionAuthors?.create(notes ? {readNotes:async (encId, days = 14) => {
      window.fichaNoteRequests.push([encId, days]);
      const answer = (window.fichaNotes || notes)[days];
      return typeof answer === 'string' ? {error:answer} : {ok:true, encId, days, older:{14:60, 60:365}[days] || null, notes:answer || []};
    }} : undefined);
    let view = theme;
    const refresh = () => {
      summary.refresh(encounter, view);
      dates.refresh(encounter);
      authors?.refresh(encounter);
    };
    window.fichaFixture = {refresh, authors};
    document.addEventListener('fixture-refresh', refresh);
    document.addEventListener('fixture-theme', event => { view = event.detail; refresh(); });
    refresh();
  }, {encounter, theme, notes});
  await settle(page);
}

/** A wide family present on macOS (Verdana) or on Linux (DejaVu Sans): what a threshold tuned with one system font misses. */
export const wideSans = 'Verdana,"DejaVu Sans",sans-serif';

/** Waits for fonts and for two frames, the time the readers take to measure and repack. */
export const settle = page => page.evaluate(async () => {
  await document.fonts.ready;
  await new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)));
});
