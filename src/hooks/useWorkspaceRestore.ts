import { useEffect, useState, useCallback } from 'react';
import { getWorkspaceState } from 'api/workspace';
import type { WorkspaceStateData } from 'types/workspace';

interface UseWorkspaceRestoreOptions {
  /**
   * Contexto do workspace (ex: 'case-editor', 'draft-editor')
   */
  context: string;
  /**
   * ID do recurso esperado. Se fornecido, só restaura se o resourceId do estado salvo corresponder
   */
  expectedResourceId?: string | null;
  /**
   * Se deve restaurar automaticamente ao montar (padrão: true)
   */
  autoRestore?: boolean;
  /**
   * Callback chamado quando o estado é restaurado
   */
  onRestore?: (state: WorkspaceStateData) => void;
  /**
   * Callback chamado quando há erro ao carregar estado
   */
  onError?: (error: Error) => void;
}

interface UseWorkspaceRestoreReturn {
  /**
   * Estado do workspace carregado (null se não houver)
   */
  workspaceState: WorkspaceStateData | null;
  /**
   * Se está carregando o estado
   */
  isLoading: boolean;
  /**
   * Função para restaurar manualmente
   */
  restore: () => Promise<void>;
  /**
   * Função para limpar o estado carregado
   */
  clear: () => void;
}

/**
 * Hook para restaurar o estado do workspace salvo
 * 
 * @example
 * ```tsx
 * function CaseEditor({ caseId }: { caseId: string }) {
 *   const [formData, setFormData] = useState({});
 *   const [activeTab, setActiveTab] = useState(0);
 *   
 *   const { workspaceState, isLoading } = useWorkspaceRestore({
 *     context: 'case-editor',
 *     expectedResourceId: caseId,
 *     onRestore: (state) => {
 *       if (state.state.scrollPosition) {
 *         window.scrollTo(0, state.state.scrollPosition);
 *       }
 *       if (state.state.selectedTab) {
 *         setActiveTab(state.state.selectedTab);
 *       }
 *       if (state.state.formData) {
 *         setFormData(state.state.formData);
 *       }
 *     }
 *   });
 *   
 *   if (isLoading) return <Loader />;
 *   
 *   // ... resto do componente
 * }
 * ```
 */
export function useWorkspaceRestore({
  context,
  expectedResourceId,
  autoRestore = true,
  onRestore,
  onError
}: UseWorkspaceRestoreOptions): UseWorkspaceRestoreReturn {
  const [workspaceState, setWorkspaceState] = useState<WorkspaceStateData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const restore = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await getWorkspaceState(context);
      const state = response.data;

      if (state) {
        // Se expectedResourceId foi fornecido, só restaura se corresponder
        if (expectedResourceId !== undefined && state.resourceId !== expectedResourceId) {
          setWorkspaceState(null);
          setIsLoading(false);
          return;
        }

        setWorkspaceState(state);
        if (onRestore) {
          onRestore(state);
        }
      } else {
        setWorkspaceState(null);
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Erro desconhecido ao carregar estado');
      console.warn('Erro ao carregar estado do workspace:', err);
      if (onError) {
        onError(err);
      }
      setWorkspaceState(null);
    } finally {
      setIsLoading(false);
    }
  }, [context, expectedResourceId, onRestore, onError]);

  useEffect(() => {
    if (autoRestore) {
      restore();
    }
  }, [autoRestore, restore]);

  const clear = useCallback(() => {
    setWorkspaceState(null);
  }, []);

  return {
    workspaceState,
    isLoading,
    restore,
    clear
  };
}
