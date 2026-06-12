import * as vscode from 'vscode';
import { randomBytes } from 'node:crypto';

export type ViewerKind = 'docx' | 'xlsx' | 'pdf' | 'pptx' | 'mermaid' | 'html';

/**
 * A read-only custom editor that renders an office/pdf document inside a
 * webview. The host reads the file bytes and hands them to the webview, which
 * runs the format-specific renderer bundled in dist/webview.js.
 */
export class OfficeViewerProvider implements vscode.CustomReadonlyEditorProvider {
  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly kind: ViewerKind
  ) {}

  openCustomDocument(uri: vscode.Uri): vscode.CustomDocument {
    return { uri, dispose: () => {} };
  }

  async resolveCustomEditor(
    document: vscode.CustomDocument,
    webviewPanel: vscode.WebviewPanel
  ): Promise<void> {
    const webview = webviewPanel.webview;
    webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.context.extensionUri, 'dist'),
        vscode.Uri.joinPath(this.context.extensionUri, 'media'),
      ],
    };

    const sendDocument = async () => {
      try {
        const bytes = await vscode.workspace.fs.readFile(document.uri);
        // Encode as base64 — VS Code webview message serialization does not
        // reliably preserve typed arrays across all versions.
        const base64 = Buffer.from(bytes).toString('base64');
        await webview.postMessage({
          type: 'render',
          kind: this.kind,
          data: base64,
          fileName: this.basename(document.uri),
        });
      } catch (err) {
        await webview.postMessage({
          type: 'error',
          message: err instanceof Error ? err.message : String(err),
        });
      }
    };

    // Register the message listener before setting html so the webview's
    // 'ready' handshake cannot be missed.
    const sub = webview.onDidReceiveMessage((msg) => {
      if (msg?.type === 'ready') {
        void sendDocument();
      }
    });
    webviewPanel.onDidDispose(() => sub.dispose());

    webview.html = this.getHtml(webview);
  }

  private basename(uri: vscode.Uri): string {
    const path = uri.path;
    const idx = path.lastIndexOf('/');
    return idx >= 0 ? path.slice(idx + 1) : path;
  }

  private getHtml(webview: vscode.Webview): string {
    const nonce = getNonce();
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'dist', `webview-${this.kind}.js`)
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'media', 'viewer.css')
    );
    const workerUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'media', 'pdf.worker.min.mjs')
    );

    const csp = [
      `default-src 'none'`,
      `img-src ${webview.cspSource} blob: data:`,
      `style-src ${webview.cspSource} 'unsafe-inline'`,
      `font-src ${webview.cspSource} data:`,
      `script-src 'nonce-${nonce}' ${webview.cspSource}`,
      `worker-src ${webview.cspSource} blob:`,
      `connect-src ${webview.cspSource} blob: data:`,
      // HTML preview uses a sandboxed blob: iframe.
      `frame-src blob:`,
    ].join('; ');

    return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="${csp}" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="stylesheet" href="${styleUri}" />
</head>
<body>
  <div id="status" class="status">読み込み中…</div>
  <div id="container" class="container"></div>
  <script nonce="${nonce}">window.__PDF_WORKER_SRC__ = ${JSON.stringify(workerUri.toString())};</script>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }
}

function getNonce(): string {
  return randomBytes(16).toString('base64');
}
