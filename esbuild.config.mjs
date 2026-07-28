import * as esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';

const production = process.argv.includes('--production');

function appsScriptFooter() {
  return [
    'var __valorisReportingEntrypoints = globalThis.__valorisReporting;',
    'function doGet(e){return __valorisReportingEntrypoints.doGet(e);}',
    'function onInstall(e){return __valorisReportingEntrypoints.onInstall(e);}',
    'function configureScriptProperties(spreadsheetId,driveRootFolderId,pmNotificationEmail,assetManagementEmail){return __valorisReportingEntrypoints.configureScriptProperties(spreadsheetId,driveRootFolderId,pmNotificationEmail,assetManagementEmail);}',
    'function setupSpreadsheet(){return __valorisReportingEntrypoints.setupSpreadsheet();}',
    'function processIntake(){return __valorisReportingEntrypoints.processIntake();}',
    'function evaluateStatuses(){return __valorisReportingEntrypoints.evaluateStatuses();}',
    'function extendCalendar(){return __valorisReportingEntrypoints.extendCalendar();}',
    'function installDevTriggers(){return __valorisReportingEntrypoints.installDevTriggers();}',
    'function getCurrentUser(){return __valorisReportingEntrypoints.getCurrentUser();}',
    'function getPortfolioSummary(){return __valorisReportingEntrypoints.getPortfolioSummary();}',
    'function getPropertyList(){return __valorisReportingEntrypoints.getPropertyList();}',
    'function getReportTimeline(propertyId){return __valorisReportingEntrypoints.getReportTimeline(propertyId);}',
    'function getDashboardData(propertyId){return __valorisReportingEntrypoints.getDashboardData(propertyId);}',
    'function syncReportsNow(){return __valorisReportingEntrypoints.syncReportsNow();}',
  ].join('\n');
}

/** @returns {import('esbuild').Plugin} */
function copyHtmlPlugin() {
  return {
    name: 'copy-html',
    setup(build) {
      build.onEnd(() => {
        const srcDir = 'src/web';
        const destDir = 'dist';
        if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
        const files = fs.readdirSync(srcDir).filter(f => f.endsWith('.html'));
        for (const file of files) {
          fs.copyFileSync(path.join(srcDir, file), path.join(destDir, file));
        }
        fs.copyFileSync(path.join(srcDir, 'app.html'), path.join(destDir, 'index.html'));
        fs.copyFileSync('appsscript.json', path.join(destDir, 'appsscript.json'));
      });
    },
  };
}

await esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  outfile: 'dist/Code.js',
  platform: 'neutral',
  target: 'es2020',
  format: 'iife',
  minify: production,
  sourcemap: !production,
  footer: {
    js: appsScriptFooter(),
  },
  plugins: [copyHtmlPlugin()],
});
