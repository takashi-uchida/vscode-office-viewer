import * as XLSX from 'xlsx';

export function appendWorksheetTable(worksheet: XLSX.WorkSheet, container: HTMLElement): void {
  // sheet_to_html returns a full <html> document; extract just the <table>
  // rather than injecting <html>/<head>/<body> into a <div>.
  const html = XLSX.utils.sheet_to_html(worksheet, { editable: false });
  const table = new DOMParser().parseFromString(html, 'text/html').querySelector('table');
  if (table) {
    container.appendChild(document.importNode(table, true));
  }
}
