import { useState, useCallback } from 'react';
import { testOcr, type OcrTestResponse } from 'api/aiDocs';
import { openSnackbar } from 'api/snackbar';

export type FileWithOcr = {
  id: string;
  file: File;
  ocrResult?: OcrTestResponse;
  verifying: boolean;
};

/**
 * Hook para gerenciar arquivos de relatório com validação OCR (mesmo fluxo dos Casos).
 * Para cada arquivo adicionado chama POST /ai/ocr-test e exibe o resultado:
 * - Sucesso → OK, segue para gerar relatório
 * - Atenção → avisa que o texto foi lido, mas pode estar ruim / não jurídico
 * - Erro → sugere reenviar arquivo melhor (PDF nativo, imagem com mais qualidade)
 */
export function useReportFilesWithOcr() {
  const [filesWithOcr, setFilesWithOcr] = useState<FileWithOcr[]>([]);

  const addFiles = useCallback(async (newFiles: File[]) => {
    if (!newFiles.length) return;
    const newEntries: FileWithOcr[] = newFiles.map((file, i) => ({
      id: `report-file-${Date.now()}-${i}-${file.name}`,
      file,
      verifying: true
    }));
    setFilesWithOcr((prev) => [...prev, ...newEntries]);

    for (let i = 0; i < newFiles.length; i++) {
      const file = newFiles[i];
      const entryId = newEntries[i].id;
      const fileClone = new File([file], file.name, {
        type: file.type,
        lastModified: file.lastModified
      });
      try {
        const result = await testOcr(fileClone);
        setFilesWithOcr((prev) =>
          prev.map((e) =>
            e.id === entryId ? { ...e, ocrResult: result, verifying: false } : e
          )
        );
        if (result.ocr === 'Sucesso') {
          openSnackbar({
            open: true,
            message: `OCR verificado: ${file.name}`,
            variant: 'alert',
            alert: { color: 'success' }
          } as any);
        } else if (result.ocr === 'Atenção') {
          openSnackbar({
            open: true,
            message: `Atenção no OCR: ${file.name}`,
            variant: 'alert',
            alert: { color: 'warning' }
          } as any);
        } else {
          openSnackbar({
            open: true,
            message: `Erro no OCR: ${file.name}`,
            variant: 'alert',
            alert: { color: 'error' }
          } as any);
        }
      } catch (err: any) {
        openSnackbar({
          open: true,
          message: `Falha ao verificar OCR de ${file.name}: ${err?.response?.data?.message || err?.message || 'Erro desconhecido'}`,
          variant: 'alert',
          alert: { color: 'error' }
        } as any);
        setFilesWithOcr((prev) =>
          prev.map((e) => (e.id === entryId ? { ...e, verifying: false } : e))
        );
      }
    }
  }, []);

  const removeFile = useCallback((index: number) => {
    setFilesWithOcr((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const files = filesWithOcr.map((e) => e.file);
  const hasOcrError = filesWithOcr.some((e) => e.ocrResult?.ocr === 'Erro');
  const ocrErrorFileNames = filesWithOcr
    .filter((e) => e.ocrResult?.ocr === 'Erro')
    .map((e) => e.file.name);
  const hasOcrWarning = filesWithOcr.some((e) => e.ocrResult?.ocr === 'Atenção');
  const isVerifying = filesWithOcr.some((e) => e.verifying);

  return {
    filesWithOcr,
    files,
    addFiles,
    removeFile,
    hasOcrError,
    ocrErrorFileNames,
    hasOcrWarning,
    isVerifying
  };
}
