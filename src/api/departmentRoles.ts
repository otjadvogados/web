import api from '../utils/axios';
import { RoleRow } from '../types/roles';

const LANG = import.meta.env.VITE_APP_ACCEPT_LANGUAGE || 'pt-BR';

export async function listDepartmentRoles(departmentId: string): Promise<RoleRow[]> {
  const res = await api.get<{ message: string; data: RoleRow[] }>(
    `/departments/${departmentId}/roles`,
    { headers: { 'Accept-Language': LANG } }
  );
  return res.data.data;
}

export async function addRoleToDepartment(departmentId: string, roleId: string) {
  const res = await api.post(
    `/departments/${departmentId}/roles/${roleId}`,
    null,
    { headers: { 'Accept-Language': LANG } }
  );
  return res.data;
}

export async function removeRoleFromDepartment(departmentId: string, roleId: string) {
  const res = await api.delete(
    `/departments/${departmentId}/roles/${roleId}`,
    { headers: { 'Accept-Language': LANG } }
  );
  return res.data;
}
