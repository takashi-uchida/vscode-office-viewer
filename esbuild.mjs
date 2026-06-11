import * as esbuild from 'esbuild';
import { copyFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const watch = process.argv.includes('--watch');
const production = process.argv.includes('--production');

mkdirSync('media', { recursive: true });
mkdirSync('dist', { recursive: true });

// Copy the pdf.js worker so the webview can load it as a local resource.
const workerCandidates = [
  'pdfjs-dist/build/pdf.worker.min.mjs',
  'pdfjs-dist/build/pdf.worker.mjs',
  'pdfjs-dist/build/pdf.worker.min.js',
  'pdfjs-dist/build/pdf.worker.js',
];
let workerCopied = false;
for (const candidate of workerCandidates) {
  try {
    copyFileSync(require.resolve(candidate), 'media/pdf.worker.min.mjs');
    workerCopied = true;
    console.log(`copied pdf worker from ${candidate}`);
    break;
  } catch {
    // try next candidate
  }
}
if (!workerCopied) {
  console.warn('WARNING: pdf.js worker not found — PDF preview may fail.');
}

const common = {
  bundle: true,
  minify: production,
  sourcemap: !production,
  logLevel: 'info',
};

/** @type {esbuild.BuildOptions} */
const extensionConfig = {
  ...common,
  entryPoints: ['src/extension.ts'],
  outfile: 'dist/extension.js',
  platform: 'node',
  format: 'cjs',
  external: ['vscode'],
};

/** @type {esbuild.BuildOptions} */
const webviewConfig = {
  ...common,
  // One entry per format so each webview only loads its own renderer's
  // libraries (e.g. echarts is pulled in by pptx-preview alone).
  entryPoints: {
    'webview-docx': 'src/webview/entry-docx.ts',
    'webview-xlsx': 'src/webview/entry-xlsx.ts',
    'webview-pdf': 'src/webview/entry-pdf.ts',
    'webview-pptx': 'src/webview/entry-pptx.ts',
  },
  outdir: 'dist',
  platform: 'browser',
  format: 'iife',
  // The bundled libraries reference `global`; map it to the browser global.
  // `process`/`Buffer` references inside them are all typeof-guarded, so no
  // shim is needed (and shimming would flip those guards into Node paths).
  define: { global: 'globalThis' },
};

if (watch) {
  const extCtx = await esbuild.context(extensionConfig);
  const webCtx = await esbuild.context(webviewConfig);
  await Promise.all([extCtx.watch(), webCtx.watch()]);
  console.log('watching…');
} else {
  await Promise.all([
    esbuild.build(extensionConfig),
    esbuild.build(webviewConfig),
  ]);
  console.log('build complete');
}
