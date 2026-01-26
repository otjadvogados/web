/**
 * Utilitários para gerenciar contexto e resourceId do workspace baseado na rota
 */

/**
 * Extrai o contexto do workspace baseado na rota atual
 */
export function getWorkspaceContext(pathname: string): string {
  // Remove query params e hash
  const path = pathname.split('?')[0].split('#')[0];
  
  // Mapeia rotas para contextos
  if (path.includes('/ai/cases/') && path.includes('/edit')) {
    return 'case-editor';
  }
  if (path.includes('/ai/drafts/') && path.includes('/edit')) {
    return 'draft-editor';
  }
  if (path.includes('/ai/reports/') && path.includes('/edit')) {
    return 'report-editor';
  }
  if (path.includes('/ai/documents/')) {
    return 'document-viewer';
  }
  if (path.includes('/clients/') && path.includes('/edit')) {
    return 'client-editor';
  }
  if (path === '/dashboard' || path === '/') {
    return 'dashboard';
  }
  if (path.includes('/account') || path.includes('/settings')) {
    return 'settings';
  }
  
  // Contexto genérico baseado no primeiro segmento da rota
  const segments = path.split('/').filter(Boolean);
  if (segments.length > 0) {
    return segments[0] || 'default';
  }
  
  return 'default';
}

/**
 * Extrai o resourceId da rota atual (quando aplicável)
 */
export function getResourceIdFromPath(pathname: string): string | null {
  const path = pathname.split('?')[0].split('#')[0];
  
  // Padrões de rotas com IDs
  const patterns = [
    /\/ai\/cases\/([^\/]+)\/edit/,           // /ai/cases/:id/edit
    /\/ai\/drafts\/([^\/]+)\/edit/,          // /ai/drafts/:id/edit
    /\/ai\/reports\/([^\/]+)\/([^\/]+)\/edit/, // /ai/reports/:customerId/:reportId/edit
    /\/ai\/documents\/([^\/]+)/,             // /ai/documents/:id
    /\/clients\/([^\/]+)\/edit/,              // /clients/:id/edit
    /\/clients\/([^\/]+)$/,                   // /clients/:id
  ];
  
  for (const pattern of patterns) {
    const match = path.match(pattern);
    if (match) {
      // Para rotas com múltiplos IDs, retorna o último (mais específico)
      return match[match.length - 1] || null;
    }
  }
  
  return null;
}

/**
 * Verifica se a rota deve ter autosave habilitado
 */
export function shouldEnableAutosave(pathname: string): boolean {
  const path = pathname.split('?')[0].split('#')[0];
  
  // Rotas que não devem ter autosave
  const excludedPaths = [
    '/login',
    '/register',
    '/verify',
    '/unlock',
    '/reset',
    '/approve-device',
    '/reject-device',
    '/report-login',
    '/maintenance',
    '/welcome'
  ];
  
  // Verifica se é uma rota excluída
  if (excludedPaths.some(excluded => path.startsWith(excluded))) {
    return false;
  }
  
  // Verifica se é uma rota de autenticação
  if (path.startsWith('/auth/')) {
    return false;
  }
  
  return true;
}

/**
 * Obtém metadados adicionais da rota atual
 */
export function getRouteMetadata(pathname: string, search?: string): Record<string, any> {
  const params = new URLSearchParams(search || window.location.search);
  const metadata: Record<string, any> = {
    url: pathname + (search || ''),
    timestamp: new Date().toISOString()
  };
  
  // Adiciona query params relevantes
  const relevantParams = ['tab', 'view', 'filter', 'page', 'limit'];
  relevantParams.forEach(param => {
    const value = params.get(param);
    if (value) {
      metadata[param] = value;
    }
  });
  
  return metadata;
}
