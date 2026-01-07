import { NavItemType } from 'types/menu';
import { SUPER_RULE } from 'config';

/**
 * Verifica se o usuário tem pelo menos uma das permissões necessárias
 * @param userPermissions - Array de permissões do usuário
 * @param requiredPermissions - Array de permissões necessárias (se vazio ou undefined, retorna true)
 * @param hasSuperRule - Se true, o usuário tem acesso total (padrão: false)
 * @returns true se o usuário tem pelo menos uma permissão ou se não há permissões requeridas
 */
export function hasPermission(
  userPermissions: string[] | undefined,
  requiredPermissions: string[] | undefined,
  hasSuperRule: boolean = false
): boolean {
  // Se não há permissões requeridas, o item é visível para todos
  if (!requiredPermissions || requiredPermissions.length === 0) {
    return true;
  }

  // Se o usuário tem SUPER_RULE, sempre retorna true
  if (hasSuperRule) {
    return true;
  }

  // Se o usuário não tem permissões, não pode ver itens que requerem permissões
  if (!userPermissions || userPermissions.length === 0) {
    return false;
  }

  // Normaliza as permissões para comparação
  const normalizedUserPermissions = userPermissions.map((p) => p.trim().toLowerCase());
  const normalizedSuperRule = SUPER_RULE.trim().toLowerCase();

  // Verifica se o usuário tem SUPER_RULE nas permissões (fallback)
  if (normalizedUserPermissions.includes(normalizedSuperRule)) {
    return true;
  }

  // Verifica se o usuário tem pelo menos uma das permissões necessárias
  const normalizedRequired = requiredPermissions.map((p) => p.trim().toLowerCase());
  return normalizedRequired.some((permission) => normalizedUserPermissions.includes(permission));
}

/**
 * Filtra recursivamente os itens do menu baseado nas permissões do usuário
 * @param items - Array de itens do menu
 * @param userPermissions - Array de permissões do usuário
 * @param hasSuperRule - Se true, o usuário tem acesso total (padrão: false)
 * @returns Array de itens filtrados
 */
export function filterMenuItems(
  items: NavItemType[] | undefined,
  userPermissions: string[] | undefined,
  hasSuperRule: boolean = false
): NavItemType[] {
  if (!items) {
    return [];
  }

  return items
    .map((item) => {
      // Verifica se o item tem permissões e se o usuário tem acesso
      if (!hasPermission(userPermissions, item.permissions, hasSuperRule)) {
        return null;
      }

      // Se o item tem children, filtra recursivamente
      if (item.children && item.children.length > 0) {
        const filteredChildren = filterMenuItems(item.children, userPermissions, hasSuperRule);
        
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

