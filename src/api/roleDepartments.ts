import api from '../utils/axios';
import { Department } from './departments';

const LANG = import.meta.env.VITE_APP_ACCEPT_LANGUAGE || 'pt-BR';

export async function listRoleDepartments(roleId: string): Promise<Department[]> {
  const res = await api.get<{ message: string; data: Department[] }>(
    `/roles/${roleId}/departments`,
    { headers: { 'Accept-Language': LANG } }
  );
  return res.data.data;
}

export async function addDepartmentToRole(roleId: string, departmentId: string) {
  const res = await api.post(`/roles/${roleId}/departments/${departmentId}`, null, {
    headers: { 'Accept-Language': LANG }
  });
  return res.data;
}

export async function removeDepartmentFromRole(roleId: string, departmentId: string) {
  const res = await api.delete(`/roles/${roleId}/departments/${departmentId}`, {
    headers: { 'Accept-Language': LANG }
  });
  return res.data;
}
