# Office Viewer

Read-only preview for `.docx`, `.xlsx`, `.pdf`, and `.pptx` files directly inside VS Code.

## Features

- **Word (.docx)** — renders text, headings, tables, lists, and styles via [docx-preview](https://github.com/VolodymyrBaydalka/docxjs)
- **Excel (.xlsx / .xlsm)** — renders all sheets with a tab switcher via [SheetJS](https://sheetjs.com/)
- **PDF (.pdf)** — renders all pages as high-resolution canvas via [pdf.js](https://mozilla.github.io/pdf.js/)
- **PowerPoint (.pptx)** — renders slides in list mode via [pptx-preview](https://github.com/meshesha/pptx-preview)

All previews are **read-only**. Files are never modified.

## Usage

Opening a supported file automatically shows the preview. To open the same file in a different editor, right-click → **Reopen Editor With…**.

## Known Limitations

- pptx rendering faithfulness depends on the complexity of the slide (animations and SmartArt may not render correctly)
- Large PDFs (200+ pages) render all pages at once; scrolling is available but initial load may take a moment
