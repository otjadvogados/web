import { useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useWorkspaceAutosave } from 'hooks/useWorkspaceAutosave';
import { useWorkspaceRestore } from 'hooks/useWorkspaceRestore';
import { getWorkspaceContext, getResourceIdFromPath, shouldEnableAutosave, getRouteMetadata } from 'utils/workspace';
import useAuth from 'hooks/useAuth';
import type { WorkspaceStateData } from 'types/workspace';

/**
 * Componente global que gerencia autosave e restauração de estado do workspace
 * para todo o sistema automaticamente.
 * 
 * Deve ser usado no layout principal (DashboardLayout) para funcionar em todas as páginas.
 */
export default function WorkspaceManager() {
  const location = useLocation();
  const { isLoggedIn } = useAuth();
  const hasRestoredRef = useRef(false);
  const lastPathnameRef = useRef<string>('');

  // Detecta contexto e resourceId da rota atual
  const context = getWorkspaceContext(location.pathname);
  const resourceId = getResourceIdFromPath(location.pathname);
  const shouldEnable = shouldEnableAutosave(location.pathname);

  const onRestore = useCallback(
    (state: WorkspaceStateData) => {
      if (state.metadata?.url === location.pathname && state.state.scrollPosition !== undefined) {
        setTimeout(() => {
          window.scrollTo(0, state.state.scrollPosition as number);
        }, 300);
      }
    },
    [location.pathname]
  );

  const getState = useCallback(() => ({ scrollPosition: window.scrollY }), []);
  const getMetadata = useCallback(
    () => getRouteMetadata(location.pathname, location.search),
    [location.pathname, location.search]
  );
  const onAutosaveError = useCallback((error: Error) => {
    console.warn('Erro ao salvar estado do workspace:', error);
  }, []);

  // Restaura estado ao mudar de rota
  const { workspaceState } = useWorkspaceRestore({
    context,
    expectedResourceId: resourceId,
    autoRestore: shouldEnable && isLoggedIn,
    onRestore
  });

  // Restaura scroll quando a rota muda e há estado salvo
  useEffect(() => {
    if (!shouldEnable || !isLoggedIn) return;
    
    // Se mudou de rota, reseta o flag de restauração
    if (lastPathnameRef.current !== location.pathname) {
      hasRestoredRef.current = false;
      lastPathnameRef.current = location.pathname;
    }

    // Restaura scroll se houver estado salvo para esta rota
    if (workspaceState && !hasRestoredRef.current) {
      const savedUrl = workspaceState.metadata?.url?.split('?')[0];
      const currentUrl = location.pathname;
      
      if (savedUrl === currentUrl && workspaceState.state.scrollPosition !== undefined) {
        setTimeout(() => {
          window.scrollTo({
            top: workspaceState.state.scrollPosition as number,
            behavior: 'smooth'
          });
        }, 500); // Aguarda mais tempo para garantir que o conteúdo carregou
        hasRestoredRef.current = true;
      }
    }
  }, [location.pathname, workspaceState, shouldEnable, isLoggedIn]);

  // Autosave periódico do estado global
  useWorkspaceAutosave({
    context,
    resourceId,
    interval: 30000, // 30 segundos
    getState,
    getMetadata,
    saveOnMount: false, // Não salva ao montar, apenas após interação
    saveOnUnmount: true, // Salva antes de desmontar
    onError: onAutosaveError
  });

  // Não renderiza nada - é apenas um gerenciador
  return null;
}
