import { marked } from 'marked';
import mermaid from 'mermaid';

export async function renderMarkdown(bytes: Uint8Array, container: HTMLElement): Promise<void> {
  const text = new TextDecoder().decode(bytes);

  const isDark =
    document.body.classList.contains('vscode-dark') ||
    document.body.classList.contains('vscode-high-contrast');

  mermaid.initialize({
    startOnLoad: false,
    theme: isDark ? 'dark' : 'default',
    securityLevel: 'loose',
  });

  // Pull out mermaid code blocks before handing off to marked so they are not
  // HTML-escaped. Each block is replaced with a placeholder <div>.
  const mermaidDefs: string[] = [];
  const preprocessed = text.replace(
    /^```mermaid[ \t]*\r?\n([\s\S]*?)^```[ \t]*$/gm,
    (_, definition: string) => {
      const index = mermaidDefs.length;
      mermaidDefs.push(definition.trim());
      return `<div class="mermaid-placeholder" data-mermaid-index="${index}"></div>`;
    }
  );

  const article = document.createElement('article');
  article.className = 'markdown-body';
  article.innerHTML = marked.parse(preprocessed) as string;
  container.appendChild(article);

  // Render each mermaid placeholder in document order.
  const placeholders = article.querySelectorAll<HTMLElement>('.mermaid-placeholder');
  for (const el of placeholders) {
    const index = parseInt(el.dataset.mermaidIndex ?? '0', 10);
    const definition = mermaidDefs[index];
    if (!definition) {
      continue;
    }
    try {
      const { svg } = await mermaid.render(`mermaid-md-${index}`, definition);
      el.innerHTML = svg;
      el.className = 'mermaid-wrap';
    } catch (err) {
      el.innerHTML = `<pre class="mermaid-error">${String(err)}</pre>`;
    }
  }
}
