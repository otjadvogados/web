import { useLocation } from 'react-router-dom';
import { useRef, useEffect } from 'react';
import { getWorkspaceContext, getResourceIdFromPath } from 'utils/workspace';
import { useWorkspaceAutosave } from 'hooks/useWorkspaceAutosave';
import { useWorkspaceRestore } from 'hooks/useWorkspaceRestore';
import type { WorkspaceState, WorkspaceStateData } from 'types/workspace';

export interface UsePageWorkspaceOptions {
  /**
   * Função que retorna o estado atual da tela (scroll, página, filtros, abas, etc.)
   */
  getState: () => WorkspaceState;
  /**
   * Callback chamado quando há estado salvo a restaurar. Aplique state.state nos setStates da tela.
   */
  onRestore?: (data: WorkspaceStateData) => void;
  /**
   * Intervalo de autosave em ms (padrão 30000)
   */
  interval?: number;
  /**
   * Salvar ao montar (padrão false para não sobrescrever estado ao entrar)
   */
  saveOnMount?: boolean;
  /**
   * Salvar ao desmontar (padrão true)
   */
  saveOnUnmount?: boolean;
  /**
   * Desabilitar save/restore (ex.: enquanto carrega dados)
   */
  enabled?: boolean;
}

/**
 * Hook unificado para salvar e restaurar estado da tela (scroll, filtros, abas, etc.).
 * Usa a rota atual para derivar contexto e resourceId automaticamente.
 *
 * Uso em qualquer página:
 *
 * const [page, setPage] = useState(0);
 * const [search, setSearch] = useState('');
 *
 * const { workspaceState } = usePageWorkspace({
 *   getState: () => ({ scrollPosition: window.scrollY, page, limit: 10, search }),
 *   onRestore: (data) => {
 *     const s = data.state;
 *     if (s.page !== undefined) setPage(s.page as number);
 *     if (s.search !== undefined) setSearch(s.search as string);
 *     if (s.scrollPosition !== undefined) setTimeout(() => window.scrollTo(0, s.scrollPosition as number), 100);
 *   },
 *   enabled: !!dadosCarregados,
 * });
 *
 * useEffect(() => {
 *   if (!workspaceState || hasRestoredRef.current) return;
 *   onRestore(workspaceState); // ou aplicar manualmente
 *   hasRestoredRef.current = true;
 * }, [workspaceState]);
 */
export function usePageWorkspace({
  getState,
  onRestore,
  interval = 30000,
  saveOnMount = false,
  saveOnUnmount = true,
  enabled = true
}: UsePageWorkspaceOptions) {
  const location = useLocation();
  const pathname = location.pathname;
  const context = getWorkspaceContext(pathname);
  const resourceId = getResourceIdFromPath(pathname);
  const hasRestoredRef = useRef(false);

  const { workspaceState } = useWorkspaceRestore({
    context,
    expectedResourceId: resourceId,
    autoRestore: enabled,
    onRestore: undefined
  });

  // Aplica restauração uma vez quando workspaceState chega
  useEffect(() => {
    if (!enabled || !workspaceState || !onRestore || hasRestoredRef.current) return;
    const savedUrl = workspaceState.metadata?.url?.split('?')[0];
    if (savedUrl !== pathname) return;
    hasRestoredRef.current = true;
    onRestore(workspaceState);
  }, [enabled, workspaceState, onRestore, pathname]);

  useWorkspaceAutosave({
    context,
    resourceId,
    interval,
    getState: () => ({
      ...getState(),
      scrollPosition: typeof window !== 'undefined' ? window.scrollY : 0
    }),
    getMetadata: () => ({
      url: pathname + (location.search || ''),
      timestamp: new Date().toISOString()
    }),
    saveOnMount,
    saveOnUnmount,
    enabled,
    onError: (err) => console.warn('usePageWorkspace save error:', err)
  });

  return { workspaceState, context, resourceId };
}
