import api from '../utils/axios';
import { RuleItem } from '../types/rules';

const LANG = import.meta.env.VITE_APP_ACCEPT_LANGUAGE || 'pt-BR';

type ListRulesParams = {
  search?: string;
  module?: string;
};

export async function listRules(params: ListRulesParams = {}): Promise<RuleItem[]> {
  const res = await api.get<{ data: RuleItem[] }>('/rules', {
    params: {
      flat: true, // ✅ garante lista plana
      search: params.search || undefined,
      module: params.module || undefined
    },
    headers: { 'Accept-Language': LANG }
  });
  return res.data.data;
}
