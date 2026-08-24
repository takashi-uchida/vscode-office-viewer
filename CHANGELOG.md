# Changelog


## 0.4.6 (2026-08-24)

### Fixed
- Resolve relative Marp image paths from the Markdown file directory
- Rewrite relative `url(...)` references in generated and inline CSS for background images
- Add the document directory to the webview local resource roots
- Allow HTTPS images in the webview content security policy


## 0.4.5 (2026-08-24)

### Changed
- Make the Marp navigation controls a compact, content-width floating toolbar
- Reduce control height, padding, gaps, and label widths
- Render **Fit** mode at 90% of the available area for comfortable margins around the slide
- Keep **Width** mode available for users who want the slide to fill the editor width


## 0.4.4 (2026-08-24)

### Added
- Marp preview zoom controls from 25% to 300%
- **Fit** mode to keep the entire slide visible in the available viewport
- **Width** mode to fill the editor width with vertical scrolling when needed
- Keyboard shortcuts: `+` / `-` to zoom, `0` to fit, and `W` to fit width
- Ctrl/Cmd + mouse wheel zoom
- Automatic rescaling when the editor panel size changes


## 0.4.3 (2026-08-23)

### Fixed
- Preserve Marp Core's required `div.marpit > svg > foreignObject > section` DOM hierarchy so built-in and inline theme CSS applies correctly
- Scale the active SVG to the available viewport while preserving its 16:9 `viewBox`
- Keep the required `div.marpit` wrapper in overview mode as well
- Make the Marp preview use the full webview area below the navigation bar

## 0.4.0 (2026-08-22)

### Added
- **Marp slides preview**: Files with `.marp.md` extension are automatically rendered as slide presentations using [@marp-team/marp-core](https://github.com/marp-team/marp-core)
  - Slide-by-slide navigation with keyboard (← → Space) and buttons
  - All-slides overview mode
  - Dark/light theme follows VS Code
  - HTML rendering enabled for rich content
- Marp detection in regular `.md` files: shows a notice with instructions to switch to Marp preview
- New `officeViewer.marp` custom editor view type

### Changed
- Updated description and keywords to include Marp/slides/presentation

## 0.3.2

- Previous release (docx, xlsx, csv, pdf, pptx, mermaid, html, markdown support)
