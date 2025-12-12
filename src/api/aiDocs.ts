import axios from 'utils/axios';

export type HtmlToDocxRequest = {
  html: string;
  filename?: string;
};

/**
 * POST /ai/docs/html-to-docx - Converte HTML para DOCX
 * Retorna o arquivo DOCX como download
 */
export async function convertHtmlToDocx(
  payload: HtmlToDocxRequest
): Promise<{ blob: Blob; filename: string | null }> {
  const res = await axios.post('/ai/docs/html-to-docx', payload, {
    responseType: 'blob',
    headers: {
      Accept: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    }
  });

  const blob = res.data as Blob;
  if (!(blob instanceof Blob) || blob.size === 0) {
    throw new Error(`Falha ao converter HTML para DOCX (HTTP ${res.status})`);
  }

  // Tenta extrair filename do Content-Disposition
  const cd = (res.headers?.['content-disposition'] || '') as string;
  let filename: string | null = null;
  const m = cd.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i);
  if (m && m[1]) {
    try {
      filename = decodeURIComponent(m[1]);
    } catch {
      filename = m[1];
    }
  }

  // Se não encontrou no header, usa o filename do payload ou padrão
  if (!filename && payload.filename) {
    filename = payload.filename.endsWith('.docx') ? payload.filename : `${payload.filename}.docx`;
  }

  return { blob, filename };
}

