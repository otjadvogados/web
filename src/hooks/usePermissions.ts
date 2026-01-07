import { useMemo } from 'react';
import useAuth from './useAuth';
import { SUPER_RULE } from 'config';

/**
 * Hook para gerenciar permissões do usuário
 * 
 * @returns Objeto com funções para verificar permissões e informações do usuário
 */
export function usePermissions() {
  const { user } = useAuth();

  const permissions = useMemo(() => {
    if (!user) {
      return {
        hasPermission: () => false,
        hasAnyPermission: () => false,
        hasAllPermissions: () => false,
        isSuperAdmin: false,
        rules: [],
      };
    }

    // Normaliza as regras (remove espaços e converte para lowercase)
    const normalizedRules = (user.rules || []).map((r) => r.trim().toLowerCase());
    const normalizedSuperRule = SUPER_RULE.trim().toLowerCase();

    // Verifica se é super admin
    const isSuperAdmin = user.hasSuperRule || normalizedRules.includes(normalizedSuperRule);

    /**
     * Verifica se o usuário tem uma permissão específica
     * Se for SUPER_ADMIN, sempre retorna true
     */
    const hasPermission = (rule: string): boolean => {
      if (isSuperAdmin) return true;

      const normalizedRule = rule.trim().toLowerCase();
      return normalizedRules.includes(normalizedRule);
    };

    /**
     * Verifica se o usuário tem pelo menos uma das permissões
     */
    const hasAnyPermission = (rules: string[]): boolean => {
      if (isSuperAdmin) return true;

      const normalized = rules.map((r) => r.trim().toLowerCase());
      return normalized.some((r) => normalizedRules.includes(r));
    };

    /**
     * Verifica se o usuário tem todas as permissões
     */
    const hasAllPermissions = (rules: string[]): boolean => {
      if (isSuperAdmin) return true;

      const normalized = rules.map((r) => r.trim().toLowerCase());
      return normalized.every((r) => normalizedRules.includes(r));
    };

    return {
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
      isSuperAdmin,
      rules: user.rules || [],
    };
  }, [user]);

  return permissions;
}

