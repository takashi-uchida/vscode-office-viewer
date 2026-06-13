const INITIAL_ROWS = 1000;
const ROW_INCREMENT = 5000;

export function renderCsv(bytes: Uint8Array, container: HTMLElement): void {
  const text = decodeCsv(bytes);
  const parser = createCsvParser(text);

  const pane = document.createElement('div');
  pane.className = 'xlsx-sheet csv-sheet';
  container.appendChild(pane);

  const firstRows = parser.nextRows(INITIAL_ROWS);
  if (firstRows.length === 0) {
    pane.textContent = 'データがありません。';
    return;
  }

  const table = document.createElement('table');
  const tbody = document.createElement('tbody');
  table.appendChild(tbody);

  const controls = document.createElement('div');
  controls.className = 'csv-controls';
  const count = document.createElement('span');
  const more = document.createElement('button');
  more.type = 'button';
  more.className = 'csv-more';
  more.textContent = 'さらに表示';
  controls.appendChild(count);
  controls.appendChild(more);

  pane.appendChild(controls);
  pane.appendChild(table);

  let renderedRows = 0;

  const appendRows = (rows: string[][]) => {
    const fragment = document.createDocumentFragment();
    for (const row of rows) {
      fragment.appendChild(createRow(row));
    }
    tbody.appendChild(fragment);
    renderedRows += rows.length;
    count.textContent = `${renderedRows.toLocaleString()} 行表示中`;
    more.style.display = parser.done ? 'none' : 'inline-block';
  };

  more.addEventListener('click', () => appendRows(parser.nextRows(ROW_INCREMENT)));
  appendRows(firstRows);
}

function createRow(values: string[]): HTMLTableRowElement {
  const tr = document.createElement('tr');
  for (const value of values) {
    const td = document.createElement('td');
    td.textContent = value;
    tr.appendChild(td);
  }
  return tr;
}

function createCsvParser(text: string): { readonly done: boolean; nextRows(limit: number): string[][] } {
  let index = 0;
  let row: string[] = [];
  let value = '';
  let quoted = false;
  let done = false;

  return {
    get done() {
      return done;
    },
    nextRows(limit: number): string[][] {
      const rows: string[][] = [];

      while (!done && rows.length < limit) {
        if (index >= text.length) {
          if (value.length > 0 || row.length > 0) {
            row.push(value);
            rows.push(row);
          }
          done = true;
          break;
        }

        const ch = text[index++];

        if (quoted) {
          if (ch === '"') {
            if (text[index] === '"') {
              value += '"';
              index++;
            } else {
              quoted = false;
            }
          } else {
            value += ch;
          }
          continue;
        }

        if (ch === '"' && value.length === 0) {
          quoted = true;
        } else if (ch === ',') {
          row.push(value);
          value = '';
        } else if (ch === '\n') {
          row.push(value);
          rows.push(row);
          row = [];
          value = '';
        } else if (ch !== '\r') {
          value += ch;
        }
      }

      return rows;
    },
  };
}

function decodeCsv(bytes: Uint8Array): string {
  try {
    return stripBom(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch {
    return new TextDecoder('shift_jis').decode(bytes);
  }
}

function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}
