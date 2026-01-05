import { ReactNode } from 'react';
import useAuth from 'hooks/useAuth';

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
  const { user } = useAuth();

  const hasPermission = () => {
    if (!user || !user.rules || !Array.isArray(user.rules)) {
      return false;
    }

    if (requireAll) {
      return resources.every((resource) => user.rules?.includes(resource));
    } else {
      return resources.some((resource) => user.rules?.includes(resource));
    }
  };

  if (!hasPermission()) {
    return null;
  }

  return <>{children}</>;
}

