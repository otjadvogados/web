import { useEffect, useRef, useCallback } from 'react';
import { saveWorkspaceState } from 'api/workspace';
import type { WorkspaceState, WorkspaceMetadata } from 'types/workspace';

interface UseWorkspaceAutosaveOptions {
  /**
   * Contexto do workspace (ex: 'case-editor', 'draft-editor')
   */
  context: string;
  /**
   * ID do recurso sendo editado (ex: ID do case)
   */
  resourceId: string | null;
  /**
   * Intervalo em milissegundos para salvar automaticamente (padrão: 30000 = 30 segundos)
   */
  interval?: number;
  /**
   * Função para obter o estado atual do workspace
   */
  getState: () => WorkspaceState;
  /**
   * Função para obter metadados adicionais (opcional)
   */
  getMetadata?: () => WorkspaceMetadata;
  /**
   * Callback chamado quando há erro ao salvar (opcional)
   */
  onError?: (error: Error) => void;
  /**
   * Se deve salvar imediatamente ao montar o componente (padrão: true)
   */
  saveOnMount?: boolean;
  /**
   * Se deve salvar antes de desmontar o componente (padrão: true)
   */
  saveOnUnmount?: boolean;
  /**
   * Se o autosave está habilitado (padrão: true)
   */
  enabled?: boolean;
}

/**
 * Hook para salvar automaticamente o estado do workspace periodicamente
 * 
 * @example
 * ```tsx
 * function CaseEditor({ caseId }: { caseId: string }) {
 *   const [formData, setFormData] = useState({});
 *   const [activeTab, setActiveTab] = useState(0);
 *   
 *   useWorkspaceAutosave({
 *     context: 'case-editor',
 *     resourceId: caseId,
 *     getState: () => ({
 *       scrollPosition: window.scrollY,
 *       selectedTab: activeTab,
 *       formData
 *     }),
 *     getMetadata: () => ({
 *       url: window.location.pathname
 *     })
 *   });
 *   
 *   // ... resto do componente
 * }
 * ```
 */
export function useWorkspaceAutosave({
  context,
  resourceId,
  interval = 30000, // 30 segundos
  getState,
  getMetadata,
  onError,
  saveOnMount = true,
  saveOnUnmount = true,
  enabled = true
}: UseWorkspaceAutosaveOptions) {
  const saveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isUnmountingRef = useRef(false);

  const saveState = useCallback(async () => {
    if (isUnmountingRef.current) return;

    try {
      const state = getState();
      const metadata = getMetadata ? getMetadata() : {};

      await saveWorkspaceState({
        context,
        resourceId,
        state,
        metadata: {
          ...metadata,
          url: window.location.pathname,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Erro desconhecido ao salvar estado');
      console.warn('Erro ao salvar estado do workspace:', err);
      if (onError) {
        onError(err);
      }
    }
  }, [context, resourceId, getState, getMetadata, onError]);

  useEffect(() => {
    if (!enabled) return;

    // Salva imediatamente ao montar se configurado
    if (saveOnMount) {
      saveState();
    }

    // Configura intervalo para salvar periodicamente
    saveIntervalRef.current = setInterval(() => {
      saveState();
    }, interval);

    // Salva antes de desmontar
    return () => {
      isUnmountingRef.current = true;
      
      if (saveIntervalRef.current) {
        clearInterval(saveIntervalRef.current);
      }

      if (saveOnUnmount) {
        // Salva de forma síncrona antes de desmontar
        saveState();
      }
    };
  }, [saveState, interval, saveOnMount, saveOnUnmount, enabled]);

  // Retorna função para salvar manualmente
  return { saveState };
}
