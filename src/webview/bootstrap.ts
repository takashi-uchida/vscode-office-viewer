type RenderFn = (bytes: Uint8Array, container: HTMLElement) => void | Promise<void>;

declare function acquireVsCodeApi(): { postMessage(msg: unknown): void };

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Shared webview bootstrap: wires up the host <-> webview handshake and hands
 * the decoded file bytes to a single format-specific renderer. Each format has
 * its own entry point so only that format's libraries are bundled and loaded.
 */
export function mount(render: RenderFn): void {
  const vscode = acquireVsCodeApi();
  const statusEl = document.getElementById('status') as HTMLElement;
  const containerEl = document.getElementById('container') as HTMLElement;

  const setStatus = (text: string | null) => {
    if (text === null) {
      statusEl.style.display = 'none';
    } else {
      statusEl.style.display = 'block';
      statusEl.textContent = text;
    }
  };

  window.addEventListener('message', async (event: MessageEvent) => {
    const msg = event.data;
    if (!msg) {
      return;
    }
    if (msg.type === 'error') {
      setStatus(`ファイルの読み込みに失敗しました: ${msg.message}`);
      return;
    }
    if (msg.type !== 'render') {
      return;
    }

    containerEl.innerHTML = '';
    setStatus('プレビューを生成中…');
    try {
      await render(base64ToBytes(msg.data), containerEl);
      setStatus(null);
    } catch (err) {
      setStatus(
        `プレビューの生成に失敗しました: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  });

  vscode.postMessage({ type: 'ready' });
}
