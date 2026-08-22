import { Marp } from '@marp-team/marp-core';

export async function renderMarp(bytes: Uint8Array, container: HTMLElement): Promise<void> {
  const text = new TextDecoder().decode(bytes);

  // Marp スライドかどうかを判定（frontmatter に marp: true が含まれる）
  const isMarp = /^---\s*\n[\s\S]*?marp:\s*true[\s\S]*?\n---/m.test(text);
  if (!isMarp) {
    // Marp スライドでない場合は null を返し、通常の Markdown レンダラーにフォールバック
    container.dataset.fallback = 'markdown';
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

  // スライド用のスタイルとレイアウトを構築
  const wrapper = document.createElement('div');
  wrapper.className = 'marp-slides';

  const styleEl = document.createElement('style');
  styleEl.textContent = `
    ${css}
    .marp-slides {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 24px;
      padding: 24px;
      background: ${isDark ? '#1e1e1e' : '#e8e8e8'};
    }
    .marp-slides > svg {
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      border-radius: 4px;
      max-width: 100%;
      height: auto;
    }
    .marp-nav {
      position: sticky;
      top: 0;
      z-index: 100;
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 16px;
      background: ${isDark ? '#2d2d2d' : '#f5f5f5'};
      border-bottom: 1px solid ${isDark ? '#444' : '#ddd'};
      font-size: 13px;
      color: ${isDark ? '#ccc' : '#333'};
    }
    .marp-nav button {
      padding: 4px 12px;
      border: 1px solid ${isDark ? '#555' : '#ccc'};
      border-radius: 4px;
      background: ${isDark ? '#3c3c3c' : '#fff'};
      color: ${isDark ? '#ccc' : '#333'};
      cursor: pointer;
      font-size: 13px;
    }
    .marp-nav button:hover {
      background: ${isDark ? '#4a4a4a' : '#e8e8e8'};
    }
  `;

  container.appendChild(styleEl);

  // スライドをパースして個別表示
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  const slides = tempDiv.querySelectorAll('svg[data-marpit-svg]');
  const totalSlides = slides.length;

  // ナビゲーションバー
  const nav = document.createElement('div');
  nav.className = 'marp-nav';

  const prevBtn = document.createElement('button');
  prevBtn.textContent = '◀ 前';
  const nextBtn = document.createElement('button');
  nextBtn.textContent = '次 ▶';
  const pageInfo = document.createElement('span');
  const viewAllBtn = document.createElement('button');
  viewAllBtn.textContent = '一覧表示';

  nav.appendChild(prevBtn);
  nav.appendChild(pageInfo);
  nav.appendChild(nextBtn);
  nav.appendChild(viewAllBtn);
  container.appendChild(nav);
  container.appendChild(wrapper);

  let currentSlide = 0;
  let viewAll = false;

  const renderView = () => {
    wrapper.innerHTML = '';
    if (viewAll) {
      // 一覧モード
      for (const slide of slides) {
        wrapper.appendChild(slide.cloneNode(true));
      }
      pageInfo.textContent = `全 ${totalSlides} スライド`;
      viewAllBtn.textContent = 'スライド表示';
    } else {
      // 単一スライドモード
      if (slides[currentSlide]) {
        wrapper.appendChild(slides[currentSlide].cloneNode(true));
      }
      pageInfo.textContent = `${currentSlide + 1} / ${totalSlides}`;
      viewAllBtn.textContent = '一覧表示';
    }
  };

  prevBtn.addEventListener('click', () => {
    if (!viewAll && currentSlide > 0) {
      currentSlide--;
      renderView();
    }
  });

  nextBtn.addEventListener('click', () => {
    if (!viewAll && currentSlide < totalSlides - 1) {
      currentSlide++;
      renderView();
    }
  });

  viewAllBtn.addEventListener('click', () => {
    viewAll = !viewAll;
    renderView();
  });

  // キーボードナビゲーション
  document.addEventListener('keydown', (e) => {
    if (viewAll) return;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      if (currentSlide > 0) { currentSlide--; renderView(); }
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') {
      if (currentSlide < totalSlides - 1) { currentSlide++; renderView(); }
    }
  });

  renderView();
}
