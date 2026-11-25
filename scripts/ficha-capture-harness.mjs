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
    scripts:entry.js.filter(name => /^(hhr-ficha-|hhr-(history-date-navigation|native-ficha-presentation)\.js$)/.test(name)),
  };
}

/**
 * Injects the revision's presentation into a page that already holds a synthetic ficha and
 * starts its three readers. The page then answers two events, as the content script would
 * after a host update or a change of view: `fixture-refresh` and `fixture-theme` (detail: view id).
 */
export async function mountFicha(page, assets, {encounter = '1', theme = 'compact'} = {}) {
  for (const name of assets.styles) await page.addStyleTag({content:await assets.source(name)});
  for (const name of assets.scripts) await page.addScriptTag({content:await assets.source(name)});
  await page.evaluate(({encounter, theme}) => {
    const summary = window.HhrNativeFichaPresentation.create();
    const dates = window.HhrHistoryDateNavigation.create();
    const authors = window.HhrFichaEvolutionAuthors?.create();
    let view = theme;
    const refresh = () => {
      summary.refresh(encounter, view);
      dates.refresh(encounter);
      authors?.refresh(encounter);
    };
    window.fichaFixture = {refresh};
    document.addEventListener('fixture-refresh', refresh);
    document.addEventListener('fixture-theme', event => { view = event.detail; refresh(); });
    refresh();
  }, {encounter, theme});
  await settle(page);
}

/** Waits for fonts and for two frames, the time the readers take to measure and repack. */
export const settle = page => page.evaluate(async () => {
  await document.fonts.ready;
  await new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)));
});
