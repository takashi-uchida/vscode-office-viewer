import assert from 'node:assert/strict';
import test from 'node:test';
import { Buffer } from 'node:buffer';
import * as esbuild from 'esbuild';

const result = await esbuild.build({
  entryPoints: ['src/webview/csv.ts'],
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node20',
  write: false,
});
const moduleUrl = `data:text/javascript;base64,${Buffer.from(result.outputFiles[0].contents).toString('base64')}`;
const { createDelimitedTextParser, decodeDelimitedText } = await import(moduleUrl);

function parseAll(text, delimiter, batchSize = 100) {
  const parser = createDelimitedTextParser(text, delimiter);
  const rows = [];
  while (!parser.done) {
    rows.push(...parser.nextRows(batchSize));
  }
  return rows;
}

test('CSVの引用符、改行、エスケープ済み引用符を従来どおり解析する', () => {
  const rows = parseAll(
    'name,note\r\nAlice,"hello,\nworld"\r\nBob,"He said ""Hi"""\r\n',
    ','
  );

  assert.deepEqual(rows, [
    ['name', 'note'],
    ['Alice', 'hello,\nworld'],
    ['Bob', 'He said "Hi"'],
  ]);
});

test('TSVをタブ区切りの行列として解析する', () => {
  const rows = parseAll('name\trole\r\nAlice\tEngineer\r\nBob\tDesigner', '\t');

  assert.deepEqual(rows, [
    ['name', 'role'],
    ['Alice', 'Engineer'],
    ['Bob', 'Designer'],
  ]);
});

test('TSVの引用符内にあるタブ、改行、二重引用符を値として保持する', () => {
  const rows = parseAll('id\tdetail\n1\t"tab:\t line:\n quote:""ok"""\n', '\t');

  assert.deepEqual(rows, [
    ['id', 'detail'],
    ['1', 'tab:\t line:\n quote:"ok"'],
  ]);
});

test('末尾改行なしの空の引用フィールドを1セルとして保持する', () => {
  assert.deepEqual(parseAll('""', '\t'), [['']]);
  assert.deepEqual(parseAll('""', ','), [['']]);
});

test('ストリーミング解析で指定行数ずつ取得できる', () => {
  const parser = createDelimitedTextParser('a\tb\n1\t2\n3\t4', '\t');

  assert.deepEqual(parser.nextRows(1), [['a', 'b']]);
  assert.equal(parser.done, false);
  assert.deepEqual(parser.nextRows(1), [['1', '2']]);
  assert.deepEqual(parser.nextRows(1), [['3', '4']]);
  assert.equal(parser.done, true);
});

test('UTF-8 BOMを除去してデコードする', () => {
  const bytes = new Uint8Array([0xef, 0xbb, 0xbf, ...Buffer.from('name\tvalue', 'utf8')]);

  assert.equal(decodeDelimitedText(bytes), 'name\tvalue');
});

test('UTF-8として不正なバイト列をShift_JISとしてデコードする', () => {
  const bytes = new Uint8Array([0x82, 0xa0, 0x09, 0x31]);

  assert.equal(decodeDelimitedText(bytes), 'あ\t1');
});
