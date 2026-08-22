import { marked } from 'marked';
import mermaid from 'mermaid';

export async function renderMarkdown(bytes: Uint8Array, container: HTMLElement): Promise<void> {
  const text = new TextDecoder().decode(bytes);

  // Marp スライドの場合はユーザーに案内を表示
  // (Marp スライドは "Open With..." → "Office File Preview (Marp Slides)" で開くか、
  //  ファイル名を *.marp.md にすると自動的に Marp プレビューが使われます)
  const isMarp = /^---\s*\n[\s\S]*?marp:\s*true[\s\S]*?\n---/m.test(text);
  if (isMarp) {
    const notice = document.createElement('div');
    notice.style.cssText = 'padding:16px;background:#fff3cd;border:1px solid #ffc107;border-radius:8px;margin:16px;font-size:14px;';
    notice.innerHTML = `
      <strong>💡 Marp スライドを検出しました</strong><br><br>
      スライドとしてプレビューするには:<br>
      ・ファイル名を <code>*.marp.md</code> に変更する<br>
      ・または右クリック → 「別のエディターで開く」→「Office File Preview (Marp Slides)」を選択<br>
      <br>
      <small>以下は通常の Markdown としてレンダリングされます</small>
    `;
    container.appendChild(notice);
  }

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
