declare module 'docx-preview' {
  export function renderAsync(
    data: ArrayBuffer | Blob,
    container: HTMLElement,
    target?: HTMLElement | null,
    options?: Record<string, unknown>
  ): Promise<void>;
}
