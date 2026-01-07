import { ReactNode } from 'react';
import { usePermissions } from 'hooks/usePermissions';

interface PermissionProps {
  resources: string[];
  children: ReactNode;
  requireAll?: boolean; // Se true, requer todas as permissões. Se false, requer pelo menos uma (padrão: false)
}

/**
 * Componente para controlar a visibilidade de elementos baseado em permissões
 * @param resources - Array de nomes de permissões (ex: ['users.read', 'users.create'])
 * @param children - Elementos filhos que serão renderizados se o usuário tiver permissão
 * @param requireAll - Se true, requer todas as permissões. Se false, requer pelo menos uma (padrão: false)
 */
export default function Permission({ resources, children, requireAll = false }: PermissionProps) {
  const { hasAnyPermission, hasAllPermissions, isSuperAdmin } = usePermissions();

  // Se for super admin, sempre permite
  if (isSuperAdmin) {
    return <>{children}</>;
  }

  // Verifica permissões
  const hasAccess = requireAll ? hasAllPermissions(resources) : hasAnyPermission(resources);

  if (!hasAccess) {
    return null;
  }

  return <>{children}</>;
}

