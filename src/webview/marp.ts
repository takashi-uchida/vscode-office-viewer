import { Marp } from '@marp-team/marp-core';
import type { RenderContext } from './bootstrap';
import { resolveResourceUri, rewriteCssUrls } from './resourceUri';

type ScaleMode = 'fit' | 'width' | 'custom';

const MIN_ZOOM = 25;
const MAX_ZOOM = 300;
const ZOOM_STEP = 10;
const SLIDE_PADDING = 32;
const FIT_SCALE_RATIO = 0.9;

export async function renderMarp(
  bytes: Uint8Array,
  container: HTMLElement,
  context: RenderContext
): Promise<void> {
  const markdown = new TextDecoder().decode(bytes);

  if (!/^---\s*\n[\s\S]*?marp:\s*true[\s\S]*?\n---/m.test(markdown)) {
    throw new Error('Marp front matter (marp: true) が見つかりません。');
  }

  const dark =
    document.body.classList.contains('vscode-dark') ||
    document.body.classList.contains('vscode-high-contrast');

  const rendered = new Marp({ html: true, math: false }).render(markdown);
  const html = rendered.html;
  const css = rewriteCssUrls(rendered.css, context.baseUri);

  // Marp の CSS は `div.marpit > svg > foreignObject > section` を前提とする。
  // SVG だけを取り出さず、生成された div.marpit をそのまま Shadow DOM 内に保持する。
  const parsed = document.createElement('template');
  parsed.innerHTML = html;
  const sourceMarpit = parsed.content.querySelector<HTMLDivElement>('div.marpit');
  if (!sourceMarpit) {
    throw new Error('Marp の生成HTMLに div.marpit が見つかりません。');
  }
  rewriteMarpResources(sourceMarpit, context.baseUri);

  const total = sourceMarpit.querySelectorAll(':scope > svg[data-marpit-svg]').length;
  if (total === 0) {
    throw new Error('Marp スライドが生成されませんでした。');
  }

  container.replaceChildren();
  container.classList.add('marp-container');
  container.style.cssText = 'display:flex;flex-direction:column;width:100%;height:100%;overflow:hidden;';

  const nav = document.createElement('div');
  nav.className = 'marp-preview-nav';

  const prevButton = button('◀ 前', '前のスライド（← / PageUp）');
  const page = document.createElement('span');
  page.className = 'marp-preview-page';
  const nextButton = button('次 ▶', '次のスライド（→ / PageDown / Space）');
  const separator1 = separator();
  const zoomOutButton = button('−', '縮小（−）');
  const scale = document.createElement('span');
  scale.className = 'marp-preview-scale';
  const zoomInButton = button('＋', '拡大（＋）');
  const fitButton = button('全体', 'スライド全体を表示（0）');
  const widthButton = button('幅', '幅に合わせる（W）');
  const separator2 = separator();
  const modeButton = button('一覧', '全スライドの一覧表示');

  nav.append(
    prevButton,
    page,
    nextButton,
    separator1,
    zoomOutButton,
    scale,
    zoomInButton,
    fitButton,
    widthButton,
    separator2,
    modeButton
  );

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
  display: grid;
  place-items: center;
  min-width: 100%;
  min-height: 100%;
}
.viewport.single div.marpit > svg[data-marpit-svg] {
  display: none;
  width: var(--marp-preview-slide-width);
  height: var(--marp-preview-slide-height);
  max-width: none;
  max-height: none;
  flex: none;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
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
  const viewBox = slides[0].viewBox.baseVal;
  const slideWidth = viewBox.width || 1280;
  const slideHeight = viewBox.height || 720;

  let current = 0;
  let listMode = false;
  let scaleMode: ScaleMode = 'fit';
  let zoomPercent = 100;

  const scales = () => {
    const availableWidth = Math.max(1, shadowViewport.clientWidth - SLIDE_PADDING);
    const availableHeight = Math.max(1, shadowViewport.clientHeight - SLIDE_PADDING);
    const fitScale =
      Math.min(availableWidth / slideWidth, availableHeight / slideHeight) * FIT_SCALE_RATIO;
    const widthScale = availableWidth / slideWidth;
    return { fitScale, widthScale };
  };

  const updateScale = () => {
    if (listMode) {
      marpit.style.width = '';
      marpit.style.height = '';
      marpit.style.removeProperty('--marp-preview-slide-width');
      marpit.style.removeProperty('--marp-preview-slide-height');
      return;
    }

    const { fitScale, widthScale } = scales();
    const selectedScale =
      scaleMode === 'fit'
        ? fitScale
        : scaleMode === 'width'
          ? widthScale
          : fitScale * (zoomPercent / 100);
    const renderedWidth = Math.max(1, Math.round(slideWidth * selectedScale));
    const renderedHeight = Math.max(1, Math.round(slideHeight * selectedScale));

    marpit.style.setProperty('--marp-preview-slide-width', `${renderedWidth}px`);
    marpit.style.setProperty('--marp-preview-slide-height', `${renderedHeight}px`);
    marpit.style.width = `${Math.max(shadowViewport.clientWidth, renderedWidth + SLIDE_PADDING)}px`;
    marpit.style.height = `${Math.max(shadowViewport.clientHeight, renderedHeight + SLIDE_PADDING)}px`;

    scale.textContent =
      scaleMode === 'fit' ? '全体' : scaleMode === 'width' ? '幅' : `${zoomPercent}%`;
    fitButton.classList.toggle('selected', scaleMode === 'fit');
    widthButton.classList.toggle('selected', scaleMode === 'width');
    zoomOutButton.disabled = zoomPercent <= MIN_ZOOM;
    zoomInButton.disabled = zoomPercent >= MAX_ZOOM;
  };

  const setCustomZoom = (delta: number) => {
    if (listMode) return;
    if (scaleMode !== 'custom') {
      const { fitScale, widthScale } = scales();
      zoomPercent =
        scaleMode === 'width' ? Math.round((widthScale / fitScale) * 100) : 100;
    }
    zoomPercent = clamp(
      Math.round(zoomPercent / ZOOM_STEP) * ZOOM_STEP + delta,
      MIN_ZOOM,
      MAX_ZOOM
    );
    scaleMode = 'custom';
    updateScale();
  };

  const render = () => {
    shadowViewport.className = listMode ? 'viewport list' : 'viewport single';
    slides.forEach((slide, index) => slide.classList.toggle('active', !listMode && index === current));
    page.textContent = listMode ? `${total} スライド` : `${current + 1} / ${total}`;
    modeButton.textContent = listMode ? 'スライド' : '一覧';
    prevButton.disabled = listMode || current === 0;
    nextButton.disabled = listMode || current === total - 1;
    zoomOutButton.disabled = listMode || zoomPercent <= MIN_ZOOM;
    zoomInButton.disabled = listMode || zoomPercent >= MAX_ZOOM;
    fitButton.disabled = listMode;
    widthButton.disabled = listMode;
    if (listMode) shadowViewport.scrollTop = 0;
    requestAnimationFrame(updateScale);
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
  zoomOutButton.addEventListener('click', () => setCustomZoom(-ZOOM_STEP));
  zoomInButton.addEventListener('click', () => setCustomZoom(ZOOM_STEP));
  fitButton.addEventListener('click', () => {
    scaleMode = 'fit';
    zoomPercent = 100;
    updateScale();
  });
  widthButton.addEventListener('click', () => {
    scaleMode = 'width';
    updateScale();
  });
  modeButton.addEventListener('click', () => {
    listMode = !listMode;
    render();
  });

  viewport.addEventListener(
    'wheel',
    (event) => {
      if (!listMode && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        setCustomZoom(event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP);
      }
    },
    { passive: false }
  );

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
    } else if (event.key === '+' || event.key === '=') {
      event.preventDefault();
      setCustomZoom(ZOOM_STEP);
    } else if (event.key === '-') {
      event.preventDefault();
      setCustomZoom(-ZOOM_STEP);
    } else if (event.key === '0') {
      scaleMode = 'fit';
      zoomPercent = 100;
      event.preventDefault();
      updateScale();
    } else if (event.key.toLowerCase() === 'w') {
      scaleMode = 'width';
      event.preventDefault();
      updateScale();
    }
  };
  document.addEventListener('keydown', keydown);

  const resizeObserver = new ResizeObserver(updateScale);
  resizeObserver.observe(viewport);

  render();
}

function rewriteMarpResources(root: HTMLElement, baseUri?: string): void {
  if (!baseUri) {
    return;
  }

  for (const image of root.querySelectorAll<HTMLImageElement>('img[src]')) {
    const source = image.getAttribute('src');
    if (!source) continue;
    image.setAttribute('src', resolveResourceUri(source, baseUri));
  }

  for (const element of root.querySelectorAll<HTMLElement>('[style]')) {
    const inlineStyle = element.getAttribute('style');
    if (!inlineStyle) continue;
    element.setAttribute('style', rewriteCssUrls(inlineStyle, baseUri));
  }
}

function button(label: string, title: string): HTMLButtonElement {
  const element = document.createElement('button');
  element.type = 'button';
  element.textContent = label;
  element.title = title;
  return element;
}

function separator(): HTMLSpanElement {
  const element = document.createElement('span');
  element.className = 'marp-preview-separator';
  return element;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}
