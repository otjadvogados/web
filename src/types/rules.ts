export type RuleItem = {
  id: string;
  name: string;
  description?: string | null;
  moduleName?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type RoleRulesListResponse = {
  message: string;
  data: RuleItem[];
};
