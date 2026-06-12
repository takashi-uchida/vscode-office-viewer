export async function renderHtml(bytes: Uint8Array, container: HTMLElement): Promise<void> {
  const text = new TextDecoder().decode(bytes);
  const blob = new Blob([text], { type: 'text/html' });
  const url = URL.createObjectURL(blob);

  const iframe = document.createElement('iframe');
  // allow-same-origin lets relative assets resolve; allow-scripts lets the
  // page run its own JS so the preview looks accurate.
  iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups');
  iframe.src = url;
  iframe.className = 'html-frame';
  container.appendChild(iframe);

  iframe.addEventListener('load', () => URL.revokeObjectURL(url), { once: true });
}
