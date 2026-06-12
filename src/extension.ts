import * as vscode from 'vscode';
import { OfficeViewerProvider, ViewerKind } from './providers/officeViewerProvider';

const VIEW_TYPES: { viewType: string; kind: ViewerKind }[] = [
  { viewType: 'officeViewer.docx', kind: 'docx' },
  { viewType: 'officeViewer.xlsx', kind: 'xlsx' },
  { viewType: 'officeViewer.pdf', kind: 'pdf' },
  { viewType: 'officeViewer.pptx', kind: 'pptx' },
  { viewType: 'officeViewer.mermaid', kind: 'mermaid' },
  { viewType: 'officeViewer.html', kind: 'html' },
];

export function activate(context: vscode.ExtensionContext): void {
  for (const { viewType, kind } of VIEW_TYPES) {
    context.subscriptions.push(
      vscode.window.registerCustomEditorProvider(
        viewType,
        new OfficeViewerProvider(context, kind),
        {
          webviewOptions: { retainContextWhenHidden: true },
          supportsMultipleEditorsPerDocument: true,
        }
      )
    );
  }
}

export function deactivate(): void {
  // nothing to clean up
}
