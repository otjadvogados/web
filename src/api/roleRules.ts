import api from '../utils/axios';
import { RoleRulesListResponse, RuleItem } from '../types/rules';

const LANG = import.meta.env.VITE_APP_ACCEPT_LANGUAGE || 'pt-BR';

export async function listRoleRules(roleId: string): Promise<RuleItem[]> {
  const res = await api.get<RoleRulesListResponse>(`/roles/${roleId}/rules`, {
    headers: { 'Accept-Language': LANG }
  });
  return res.data.data;
}

export async function addRuleToRole(roleId: string, ruleId: string) {
  const res = await api.post(`/roles/${roleId}/rules/${ruleId}`, null, {
    headers: { 'Accept-Language': LANG }
  });
  return res.data;
}

export async function removeRuleFromRole(roleId: string, ruleId: string) {
  const res = await api.delete(`/roles/${roleId}/rules/${ruleId}`, {
    headers: { 'Accept-Language': LANG }
  });
  return res.data;
}
