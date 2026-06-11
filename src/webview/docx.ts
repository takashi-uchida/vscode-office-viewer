import { renderAsync } from 'docx-preview';

export async function renderDocx(bytes: Uint8Array, container: HTMLElement): Promise<void> {
  await renderAsync(bytes, container, undefined, {
    className: 'docx',
    inWrapper: true,
    ignoreWidth: false,
    ignoreHeight: false,
    breakPages: true,
    useBase64URL: true,
  });
}
