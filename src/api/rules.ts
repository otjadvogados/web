import api from '../utils/axios';
import { RuleTreeNode } from '../types/rules';

const LANG = import.meta.env.VITE_APP_ACCEPT_LANGUAGE || 'pt-BR';

type ListRulesParams = {
  search?: string;
  module?: string;
};

export async function listRules(params: ListRulesParams = {}): Promise<RuleTreeNode[]> {
  const res = await api.get<{ data: RuleTreeNode[] }>('/rules', {
    params: {
      search: params.search || undefined,
      module: params.module || undefined
    },
    headers: { 'Accept-Language': LANG }
  });
  return res.data.data;
}
