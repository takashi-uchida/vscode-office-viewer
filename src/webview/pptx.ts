import { init } from 'pptx-preview';

export async function renderPptx(bytes: Uint8Array, container: HTMLElement): Promise<void> {
  const width = container.clientWidth || 960;
  const height = Math.round((width * 9) / 16);

  const previewer = init(container, {
    width,
    height,
    mode: 'list',
  });

  // pptx-preview expects an ArrayBuffer — copy into a fresh one.
  const arrayBuffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(arrayBuffer).set(bytes);
  await previewer.preview(arrayBuffer);
}
