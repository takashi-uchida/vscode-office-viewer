import * as pdfjsLib from 'pdfjs-dist';

declare global {
  interface Window {
    __PDF_WORKER_SRC__?: string;
  }
}

/**
 * pdf.js v4 builds its worker as an ES module. A module Worker cannot be
 * constructed from a cross-origin script URL, and the VS Code webview resource
 * (vscode-cdn.net) is a different origin than the webview document. So we fetch
 * the worker bytes (cross-origin fetch is permitted) and point workerSrc at a
 * same-origin blob: URL that the Worker constructor will accept.
 */
async function ensureWorker(): Promise<void> {
  if (pdfjsLib.GlobalWorkerOptions.workerSrc) {
    return;
  }
  const src = window.__PDF_WORKER_SRC__;
  if (!src) {
    return;
  }
  try {
    const response = await fetch(src);
    const code = await response.text();
    const blobUrl = URL.createObjectURL(new Blob([code], { type: 'text/javascript' }));
    pdfjsLib.GlobalWorkerOptions.workerSrc = blobUrl;
  } catch {
    // Fall back to the direct URI; pdf.js will degrade to a main-thread worker.
    pdfjsLib.GlobalWorkerOptions.workerSrc = src;
  }
}

export async function renderPdf(bytes: Uint8Array, container: HTMLElement): Promise<void> {
  await ensureWorker();

  const loadingTask = pdfjsLib.getDocument({ data: bytes });
  const pdf = await loadingTask.promise;

  const outputScale = window.devicePixelRatio || 1;

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1.5 });

    const canvas = document.createElement('canvas');
    canvas.className = 'pdf-page';
    canvas.width = Math.floor(viewport.width * outputScale);
    canvas.height = Math.floor(viewport.height * outputScale);
    canvas.style.width = `${Math.floor(viewport.width)}px`;
    canvas.style.height = `${Math.floor(viewport.height)}px`;
    container.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      continue;
    }
    const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined;
    await page.render({ canvasContext: ctx, viewport, transform }).promise;
  }
}
