// src/components/GenerateDraftDialog.tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Stack, LinearProgress, Typography
} from '@mui/material';
// import LoadingTicker from './LoadingTicker';
import { openSnackbar } from 'api/snackbar';
// TODO: generateDraft e AiDraft não existem mais - componente precisa ser atualizado ou removido
import type { AiDraft } from 'types/ai-docs';

type Props = {
  open: boolean;
  onClose: () => void;
  caseId: string;
  // filtros/escopo opcional (igual seu generateDraft API)
  templateId?: string;
  templateIds?: string[];
  categoryId?: string | null;
  // navegação após sucesso
  onDone?: (draft: AiDraft) => void;
  // duração mínima do dialog p/ UX (ms)
  minDurationMs?: number;
};

const DEFAULT_SCRIPT = [
  'Validando acesso e o caso…',
  'Localizando templates selecionados…',
  'Consultando base e contexto…',
  'Gerando rascunho inicial (LLM)…',
  'Aplicando estilo da Peça/Empresa…',
  'Finalizando e salvando…'
];

export default function GenerateDraftDialog({
  open,
  onClose,
  caseId,
  templateId,
  templateIds,
  categoryId,
  onDone,
  minDurationMs = 1600
}: Props) {
  const [running, setRunning] = useState(false);
  const [feed, setFeed] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const startRef = useRef<number | null>(null);

  const opts = useMemo(
    () => ({
      ...(templateIds?.length ? { templateIds } : {}),
      ...(templateId ? { templateId } : {}),
      ...(categoryId ? { categoryId } : {})
    }),
    [templateId, templateIds, categoryId]
  );

  // controla feed de mensagens (meramente visual enquanto aguarda a promessa)
  const push = (msg: string) => setFeed((prev) => [...prev, msg].slice(-50));

  useEffect(() => {
    if (!open) {
      setRunning(false);
      setFeed([]);
      setError(null);
      startRef.current = null;
      return;
    }
    // abriu: dispara o fluxo
    (async () => {
      setRunning(true);
      setError(null);
      setFeed([]);
      startRef.current = Date.now();

      // Enfileira as mensagens de script (vai mostrando enquanto aguarda a promise)
      // (não bloqueia: é meramente cosmético)
      let i = 0;
      const scriptTimer = window.setInterval(() => {
        if (!running) return;
        push(DEFAULT_SCRIPT[i % DEFAULT_SCRIPT.length]);
        i++;
      }, 900);

      try {
        // TODO: generateDraft não existe mais - implementar ou remover componente
        // const draft = await generateDraft(caseId, opts);
        throw new Error('Função generateDraft não está implementada. Este componente precisa ser atualizado.');

        // Código comentado porque generateDraft não existe:
        // // garante duração mínima
        // const elapsed = Date.now() - (startRef.current || Date.now());
        // if (elapsed < minDurationMs) {
        //   await new Promise((r) => setTimeout(r, minDurationMs - elapsed));
        // }
        //
        // push('Rascunho gerado com sucesso.');
        // setRunning(false);
        //
        // // feedback rápido
        // openSnackbar({
        //   open: true,
        //   message: 'Rascunho gerado!',
        //   variant: 'alert',
        //   alert: { color: 'success' }
        // } as any);
        //
        // onDone?.(draft);
      } catch (e: any) {
        const msg = e?.response?.data?.message || e?.message || 'Falha ao gerar o rascunho.';
        push('Erro ao gerar o rascunho.');
        setError(msg);
        setRunning(false);
        openSnackbar({
          open: true,
          message: msg,
          variant: 'alert',
          alert: { color: 'error' }
        } as any);
      } finally {
        window.clearInterval(scriptTimer);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, caseId]);

  return (
    <Dialog open={open} onClose={running ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>Gerando documento</DialogTitle>

      <DialogContent dividers>
        <Stack spacing={2}>
          {running && <LinearProgress />}
          {/* TODO: LoadingTicker não existe mais - implementar alternativa ou remover */}
          <Typography variant="body2" color="text.secondary">
            {feed.length > 0 ? feed[feed.length - 1] : 'Processando...'}
          </Typography>
          {!running && !error && (
            <Typography variant="body2" color="text.secondary">
              Concluído. Você será redirecionado…
            </Typography>
          )}
          {error && (
            <Typography variant="body2" color="error">
              {error}
            </Typography>
          )}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={running}>
          Fechar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
