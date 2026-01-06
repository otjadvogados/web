import { NavItemType } from 'types/menu';

/**
 * Verifica se o usuário tem pelo menos uma das permissões necessárias
 * @param userPermissions - Array de permissões do usuário
 * @param requiredPermissions - Array de permissões necessárias (se vazio ou undefined, retorna true)
 * @returns true se o usuário tem pelo menos uma permissão ou se não há permissões requeridas
 */
export function hasPermission(userPermissions: string[] | undefined, requiredPermissions: string[] | undefined): boolean {
  // Se não há permissões requeridas, o item é visível para todos
  if (!requiredPermissions || requiredPermissions.length === 0) {
    return true;
  }

  // Se o usuário não tem permissões, não pode ver itens que requerem permissões
  if (!userPermissions || userPermissions.length === 0) {
    return false;
  }

  // Verifica se o usuário tem pelo menos uma das permissões necessárias
  return requiredPermissions.some((permission) => userPermissions.includes(permission));
}

/**
 * Filtra recursivamente os itens do menu baseado nas permissões do usuário
 * @param items - Array de itens do menu
 * @param userPermissions - Array de permissões do usuário
 * @returns Array de itens filtrados
 */
export function filterMenuItems(items: NavItemType[] | undefined, userPermissions: string[] | undefined): NavItemType[] {
  if (!items) {
    return [];
  }

  return items
    .map((item) => {
      // Verifica se o item tem permissões e se o usuário tem acesso
      if (!hasPermission(userPermissions, item.permissions)) {
        return null;
      }

      // Se o item tem children, filtra recursivamente
      if (item.children && item.children.length > 0) {
        const filteredChildren = filterMenuItems(item.children, userPermissions);
        
        // Se após filtrar não há children visíveis e o item requer permissões nos children,
        // remove o item pai também (a menos que tenha URL própria)
        if (filteredChildren.length === 0 && !item.url) {
          return null;
        }

        return {
          ...item,
          children: filteredChildren
        };
      }

      return item;
    })
    .filter((item): item is NavItemType => item !== null);
}

