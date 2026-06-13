import * as XLSX from 'xlsx';
import { appendWorksheetTable } from './sheetTable';

export function renderXlsx(bytes: Uint8Array, container: HTMLElement): void {
  const workbook = XLSX.read(bytes, { type: 'array' });

  const tabs = document.createElement('div');
  tabs.className = 'xlsx-tabs';
  const sheetsWrap = document.createElement('div');
  sheetsWrap.className = 'xlsx-sheets';

  container.appendChild(tabs);
  container.appendChild(sheetsWrap);

  if (workbook.SheetNames.length === 0) {
    sheetsWrap.textContent = 'シートがありません。';
    return;
  }

  const panes: HTMLElement[] = [];
  const tabButtons: HTMLElement[] = [];

  const activate = (index: number) => {
    panes.forEach((pane, i) => {
      pane.style.display = i === index ? 'block' : 'none';
    });
    tabButtons.forEach((btn, i) => {
      btn.classList.toggle('active', i === index);
    });
  };

  workbook.SheetNames.forEach((name, index) => {
    const worksheet = workbook.Sheets[name];
    const pane = document.createElement('div');
    pane.className = 'xlsx-sheet';
    appendWorksheetTable(worksheet, pane);
    pane.style.display = index === 0 ? 'block' : 'none';
    sheetsWrap.appendChild(pane);
    panes.push(pane);

    const tab = document.createElement('button');
    tab.type = 'button';
    tab.className = 'xlsx-tab' + (index === 0 ? ' active' : '');
    tab.textContent = name;
    tab.addEventListener('click', () => activate(index));
    tabs.appendChild(tab);
    tabButtons.push(tab);
  });
}
