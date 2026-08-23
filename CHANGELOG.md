# Changelog


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
