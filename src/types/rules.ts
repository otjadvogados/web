export type RuleItem = {
  id: string;
  name: string;
  description?: string | null;
  moduleName?: string | null;
  deletedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type RuleTreeNode = {
  name: string;
  children?: RuleTreeNode[];
  data?: RuleItem[];
};

export type RuleTreeListResponse = {
  message: string;
  data: RuleTreeNode[];
};

// resposta usada tanto para /rules quanto para /roles/:id/rules
export type RoleRulesListResponse = RuleTreeListResponse;
