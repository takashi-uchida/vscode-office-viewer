import mermaid from 'mermaid';

export async function renderMermaid(bytes: Uint8Array, container: HTMLElement): Promise<void> {
  const definition = new TextDecoder().decode(bytes).trim();

  const isDark = document.body.classList.contains('vscode-dark') ||
    document.body.classList.contains('vscode-high-contrast');

  mermaid.initialize({
    startOnLoad: false,
    theme: isDark ? 'dark' : 'default',
    securityLevel: 'loose',
  });

  const id = 'mermaid-' + Math.random().toString(36).slice(2);
  const { svg } = await mermaid.render(id, definition);

  const wrap = document.createElement('div');
  wrap.className = 'mermaid-wrap';
  wrap.innerHTML = svg;
  container.appendChild(wrap);
}
