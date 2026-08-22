import { Marp } from '@marp-team/marp-core';

export async function renderMarp(bytes: Uint8Array, container: HTMLElement): Promise<void> {
  const text = new TextDecoder().decode(bytes);

  const isMarp = /^---\s*\n[\s\S]*?marp:\s*true[\s\S]*?\n---/m.test(text);
  if (!isMarp) {
    throw new Error('__FALLBACK_MARKDOWN__');
  }

  const isDark =
    document.body.classList.contains('vscode-dark') ||
    document.body.classList.contains('vscode-high-contrast');

  const marp = new Marp({
    html: true,
    math: false,
  });

  const { html, css } = marp.render(text);

  // ナビゲーション UI を container に直接構築
  container.innerHTML = '';
  container.style.cssText = 'display:flex;flex-direction:column;height:100%;overflow:hidden;';

  // ナビバー
  const nav = document.createElement('div');
  nav.style.cssText = `
    display:flex;align-items:center;justify-content:center;gap:12px;
    padding:8px 16px;
    background:${isDark ? '#2d2d2d' : '#f5f5f5'};
    border-bottom:1px solid ${isDark ? '#444' : '#ddd'};
    font-size:13px;color:${isDark ? '#ccc' : '#333'};
    flex-shrink:0;
  `;

  const prevBtn = document.createElement('button');
  prevBtn.textContent = '◀ 前';
  const nextBtn = document.createElement('button');
  nextBtn.textContent = '次 ▶';
  const pageInfo = document.createElement('span');
  pageInfo.style.minWidth = '80px';
  pageInfo.style.textAlign = 'center';
  const listBtn = document.createElement('button');
  listBtn.textContent = '一覧';

  const btnStyle = `
    padding:5px 12px;border:1px solid ${isDark ? '#555' : '#ccc'};
    border-radius:4px;background:${isDark ? '#3c3c3c' : '#fff'};
    color:${isDark ? '#ccc' : '#333'};cursor:pointer;font-size:13px;
  `;
  prevBtn.style.cssText = btnStyle;
  nextBtn.style.cssText = btnStyle;
  listBtn.style.cssText = btnStyle;

  nav.appendChild(prevBtn);
  nav.appendChild(pageInfo);
  nav.appendChild(nextBtn);
  nav.appendChild(listBtn);
  container.appendChild(nav);

  // スライド表示エリア
  const slideArea = document.createElement('div');
  slideArea.style.cssText = 'flex:1;overflow:auto;position:relative;';
  container.appendChild(slideArea);

  // Shadow DOM でスタイル分離
  const shadow = slideArea.attachShadow({ mode: 'open' });

  const styleEl = document.createElement('style');
  styleEl.textContent = `
    ${css}
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }
    .slide-wrapper {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: ${isDark ? '#1e1e1e' : '#e8e8e8'};
    }
    .slide-wrapper > svg[data-marpit-svg] {
      max-width: 95%;
      max-height: 95%;
    }
    .list-wrapper {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      padding: 16px;
      background: ${isDark ? '#1e1e1e' : '#e8e8e8'};
    }
    .list-wrapper > svg[data-marpit-svg] {
      max-width: 90%;
      height: auto;
      box-shadow: 0 2px 8px rgba(0,0,0,0.25);
      border-radius: 4px;
    }
  `;
  shadow.appendChild(styleEl);

  const contentDiv = document.createElement('div');
  shadow.appendChild(contentDiv);

  // スライドの SVG を取得
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  const slides = Array.from(tempDiv.querySelectorAll('svg[data-marpit-svg]'));
  const total = slides.length;

  let current = 0;
  let listMode = false;

  function render() {
    contentDiv.innerHTML = '';
    if (listMode) {
      contentDiv.className = 'list-wrapper';
      for (const slide of slides) {
        contentDiv.appendChild(slide.cloneNode(true));
      }
      pageInfo.textContent = `${total} スライド`;
      listBtn.textContent = 'スライド';
    } else {
      contentDiv.className = 'slide-wrapper';
      if (slides[current]) {
        contentDiv.appendChild(slides[current].cloneNode(true));
      }
      pageInfo.textContent = `${current + 1} / ${total}`;
      listBtn.textContent = '一覧';
    }
  }

  prevBtn.addEventListener('click', () => {
    if (!listMode && current > 0) { current--; render(); }
  });
  nextBtn.addEventListener('click', () => {
    if (!listMode && current < total - 1) { current++; render(); }
  });
  listBtn.addEventListener('click', () => {
    listMode = !listMode; render();
  });

  document.addEventListener('keydown', (e) => {
    if (listMode) return;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      if (current > 0) { current--; render(); }
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') {
      e.preventDefault();
      if (current < total - 1) { current++; render(); }
    } else if (e.key === 'Home') {
      current = 0; render();
    } else if (e.key === 'End') {
      current = total - 1; render();
    }
  });

  render();
}
