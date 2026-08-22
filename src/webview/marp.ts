import { Marp } from '@marp-team/marp-core';

export async function renderMarp(bytes: Uint8Array, container: HTMLElement): Promise<void> {
  const text = new TextDecoder().decode(bytes);

  // Marp スライドかどうかを判定（frontmatter に marp: true が含まれる）
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

  // Marp の出力を iframe 内に表示することで、スタイルの干渉を防ぐ
  const slideHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
${css}

/* スライド一覧表示用のスタイル */
body {
  margin: 0;
  padding: 16px;
  background: ${isDark ? '#1e1e1e' : '#e8e8e8'};
  display: flex;
  flex-direction: column;
  align-items: center;
}
body.single-mode {
  padding: 0;
  background: transparent;
  display: block;
}
body.single-mode > svg[data-marpit-svg] {
  width: 100vw;
  height: 100vh;
  display: none;
}
body.single-mode > svg[data-marpit-svg].active {
  display: block;
}
body.list-mode > svg[data-marpit-svg] {
  max-width: 100%;
  height: auto;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.25);
  border-radius: 4px;
}

/* ナビゲーションバー */
#nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 10px 16px;
  background: ${isDark ? 'rgba(30,30,30,0.95)' : 'rgba(255,255,255,0.95)'};
  border-top: 1px solid ${isDark ? '#444' : '#ddd'};
  font-family: -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 13px;
  color: ${isDark ? '#ccc' : '#333'};
  z-index: 1000;
  backdrop-filter: blur(8px);
}
#nav button {
  padding: 6px 14px;
  border: 1px solid ${isDark ? '#555' : '#ccc'};
  border-radius: 6px;
  background: ${isDark ? '#3c3c3c' : '#fff'};
  color: ${isDark ? '#ccc' : '#333'};
  cursor: pointer;
  font-size: 13px;
  transition: background 0.15s;
}
#nav button:hover {
  background: ${isDark ? '#4a4a4a' : '#e8e8e8'};
}
#nav button:active {
  background: ${isDark ? '#555' : '#ddd'};
}
#nav button.active-mode {
  background: ${isDark ? '#0078d4' : '#0078d4'};
  color: #fff;
  border-color: ${isDark ? '#0078d4' : '#005a9e'};
}
#nav span {
  min-width: 80px;
  text-align: center;
}
</style>
</head>
<body class="single-mode">
${html}
<div id="nav">
  <button id="prevBtn">◀ 前</button>
  <span id="pageInfo">1 / 1</span>
  <button id="nextBtn">次 ▶</button>
  <button id="listBtn">一覧</button>
</div>
<script>
(function() {
  const slides = document.querySelectorAll('svg[data-marpit-svg]');
  const total = slides.length;
  let current = 0;
  let listMode = false;
  const pageInfo = document.getElementById('pageInfo');
  const listBtn = document.getElementById('listBtn');

  function render() {
    if (listMode) {
      document.body.className = 'list-mode';
      slides.forEach(s => s.style.display = '');
      pageInfo.textContent = total + ' スライド';
      listBtn.textContent = 'スライド';
      listBtn.classList.add('active-mode');
    } else {
      document.body.className = 'single-mode';
      slides.forEach((s, i) => {
        s.classList.toggle('active', i === current);
      });
      pageInfo.textContent = (current + 1) + ' / ' + total;
      listBtn.textContent = '一覧';
      listBtn.classList.remove('active-mode');
    }
  }

  document.getElementById('prevBtn').onclick = function() {
    if (!listMode && current > 0) { current--; render(); }
  };
  document.getElementById('nextBtn').onclick = function() {
    if (!listMode && current < total - 1) { current++; render(); }
  };
  document.getElementById('listBtn').onclick = function() {
    listMode = !listMode; render();
  };

  document.addEventListener('keydown', function(e) {
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
})();
</script>
</body>
</html>`;

  // iframe でスライドを表示（Marp CSSがホストと干渉しない）
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'width:100%;height:100%;border:none;position:absolute;top:0;left:0;right:0;bottom:0;';
  iframe.sandbox.add('allow-scripts');
  container.style.position = 'relative';
  container.style.width = '100%';
  container.style.height = '100%';
  container.appendChild(iframe);

  // blob URL で iframe にコンテンツを設定
  const blob = new Blob([slideHtml], { type: 'text/html' });
  iframe.src = URL.createObjectURL(blob);
}
