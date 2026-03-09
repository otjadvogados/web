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
        if (result.alreadyRunning) {
          setFilesWithOcr((prev) =>
            prev.map((e) =>
              e.id === entryId ? { ...e, verifying: false } : e
            )
          );
          openSnackbar({
            open: true,
            message: 'Teste em andamento.',
            variant: 'alert',
            alert: { color: 'default' }
          } as any);
        } else {
          setFilesWithOcr((prev) =>
            prev.map((e) =>
              e.id === entryId ? { ...e, ocrResult: result, verifying: false } : e
            )
          );
          if (result.ocr === 'Sucesso') {
            const desc = result.message?.trim();
            const msg = desc
              ? `OCR verificado: ${file.name}. ${desc.length > 220 ? desc.slice(0, 220) + '...' : desc}`
              : `OCR verificado: ${file.name}`;
            openSnackbar({
              open: true,
              message: msg,
              variant: 'alert',
              alert: { color: 'success' }
            } as any);
          } else if (result.ocr === 'Atenção') {
            const desc = result.message?.trim();
            const msg = desc
              ? `Atenção no OCR: ${file.name}. ${desc.length > 220 ? desc.slice(0, 220) + '...' : desc}`
              : `Atenção no OCR: ${file.name}`;
            openSnackbar({
              open: true,
              message: msg,
              variant: 'alert',
              alert: { color: 'warning' }
            } as any);
          } else {
            openSnackbar({
              open: true,
              message: result.message?.trim() || `Erro no OCR: ${file.name}`,
              variant: 'alert',
              alert: { color: 'error' }
            } as any);
          }
        }
      } catch (err: any) {
        const serverMessage = err?.response?.data?.message ?? err?.message ?? 'Erro desconhecido';
        const isAlreadyRunning = err?.response?.data?.alreadyRunning === true;
        if (isAlreadyRunning) {
          setFilesWithOcr((prev) =>
            prev.map((e) =>
              e.id === entryId ? { ...e, verifying: false } : e
            )
          );
          openSnackbar({
            open: true,
            message: 'Teste em andamento.',
            variant: 'alert',
            alert: { color: 'default' }
          } as any);
        } else {
          openSnackbar({
            open: true,
            message: `Falha ao verificar OCR de ${file.name}: ${serverMessage}`,
            variant: 'alert',
            alert: { color: 'error' }
          } as any);
          setFilesWithOcr((prev) =>
            prev.map((e) => (e.id === entryId ? { ...e, verifying: false } : e))
          );
        }
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
