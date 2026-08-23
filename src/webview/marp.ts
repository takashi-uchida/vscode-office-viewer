import { Marp } from '@marp-team/marp-core';

export async function renderMarp(bytes: Uint8Array, container: HTMLElement): Promise<void> {
  const markdown = new TextDecoder().decode(bytes);

  if (!/^---\s*\n[\s\S]*?marp:\s*true[\s\S]*?\n---/m.test(markdown)) {
    throw new Error('Marp front matter (marp: true) が見つかりません。');
  }

  const dark =
    document.body.classList.contains('vscode-dark') ||
    document.body.classList.contains('vscode-high-contrast');

  const { html, css } = new Marp({ html: true, math: false }).render(markdown);

  // Marp の CSS は `div.marpit > svg > foreignObject > section` を前提とする。
  // SVG だけを取り出さず、生成された div.marpit をそのまま Shadow DOM 内に保持する。
  const parsed = document.createElement('template');
  parsed.innerHTML = html;
  const sourceMarpit = parsed.content.querySelector<HTMLDivElement>('div.marpit');
  if (!sourceMarpit) {
    throw new Error('Marp の生成HTMLに div.marpit が見つかりません。');
  }

  const total = sourceMarpit.querySelectorAll(':scope > svg[data-marpit-svg]').length;
  if (total === 0) {
    throw new Error('Marp スライドが生成されませんでした。');
  }

  container.replaceChildren();
  container.classList.add('marp-container');
  container.style.cssText = 'display:flex;flex-direction:column;width:100%;height:100%;overflow:hidden;';

  const nav = document.createElement('div');
  nav.className = 'marp-preview-nav';

  const prevButton = button('◀ 前');
  const page = document.createElement('span');
  page.className = 'marp-preview-page';
  const nextButton = button('次 ▶');
  const modeButton = button('一覧');

  nav.append(prevButton, page, nextButton, modeButton);

  const viewport = document.createElement('div');
  viewport.className = 'marp-preview-viewport';
  const shadow = viewport.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = `${css}
:host {
  display: block;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
}
.viewport {
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  overflow: auto;
  background: ${dark ? '#1e1e1e' : '#e8e8e8'};
}
div.marpit {
  box-sizing: border-box;
}
.viewport.single div.marpit {
  width: 100%;
  height: 100%;
}
.viewport.single div.marpit > svg[data-marpit-svg] {
  display: none;
  width: 100%;
  height: 100%;
  max-width: 100%;
  max-height: 100%;
}
.viewport.single div.marpit > svg[data-marpit-svg].active {
  display: block;
}
.viewport.list {
  padding: 24px;
}
.viewport.list div.marpit {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
}
.viewport.list div.marpit > svg[data-marpit-svg] {
  display: block;
  width: min(100%, 1280px);
  height: auto;
  flex: none;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
}
`;

  const shadowViewport = document.createElement('div');
  shadowViewport.className = 'viewport single';
  const marpit = sourceMarpit.cloneNode(true) as HTMLDivElement;
  shadowViewport.appendChild(marpit);
  shadow.append(style, shadowViewport);

  container.append(nav, viewport);

  const slides = Array.from(
    marpit.querySelectorAll<SVGElement>(':scope > svg[data-marpit-svg]')
  );
  let current = 0;
  let listMode = false;

  const render = () => {
    shadowViewport.className = listMode ? 'viewport list' : 'viewport single';
    slides.forEach((slide, index) => slide.classList.toggle('active', !listMode && index === current));
    page.textContent = listMode ? `${total} スライド` : `${current + 1} / ${total}`;
    modeButton.textContent = listMode ? 'スライド' : '一覧';
    prevButton.disabled = listMode || current === 0;
    nextButton.disabled = listMode || current === total - 1;
    if (listMode) shadowViewport.scrollTop = 0;
  };

  prevButton.addEventListener('click', () => {
    if (!listMode && current > 0) {
      current -= 1;
      render();
    }
  });
  nextButton.addEventListener('click', () => {
    if (!listMode && current < total - 1) {
      current += 1;
      render();
    }
  });
  modeButton.addEventListener('click', () => {
    listMode = !listMode;
    render();
  });

  const keydown = (event: KeyboardEvent) => {
    if (listMode) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp' || event.key === 'PageUp') {
      if (current > 0) current -= 1;
      event.preventDefault();
      render();
    } else if (
      event.key === 'ArrowRight' ||
      event.key === 'ArrowDown' ||
      event.key === 'PageDown' ||
      event.key === ' '
    ) {
      if (current < total - 1) current += 1;
      event.preventDefault();
      render();
    } else if (event.key === 'Home') {
      current = 0;
      event.preventDefault();
      render();
    } else if (event.key === 'End') {
      current = total - 1;
      event.preventDefault();
      render();
    }
  };
  document.addEventListener('keydown', keydown);

  render();
}

function button(label: string): HTMLButtonElement {
  const element = document.createElement('button');
  element.type = 'button';
  element.textContent = label;
  element.style.cssText = [
    'padding:5px 12px',
    'border:1px solid var(--vscode-button-border, transparent)',
    'border-radius:4px',
    'background:var(--vscode-button-secondaryBackground, #3c3c3c)',
    'color:var(--vscode-button-secondaryForeground, #fff)',
    'cursor:pointer',
    'font-size:13px',
  ].join(';');
  return element;
}
