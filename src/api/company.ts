import api from '../utils/axios';
import type { UserBasic } from './users';

export type Company = {
  id: string;
  name: string;
  tradeName?: string | null;
  website?: string | null;
  phone?: string | null;
  cnpj?: string | null;
  // responsável pela assinatura
  signatureUserId?: string | null;
  signatureUser?: UserBasic | null;
  createdAt?: string;
  updatedAt?: string;
};

const LANG = import.meta.env.VITE_APP_ACCEPT_LANGUAGE || 'pt-BR';

export async function getCompany() {
  const res = await api.get<{ message: string; data: Company }>('/company', {
    headers: { 'Accept-Language': LANG }
  });
  return res.data.data;
}

export type UpdateCompanyDTO = Partial<
  Pick<Company, 'name' | 'tradeName' | 'website' | 'phone' | 'cnpj' | 'signatureUserId'>
>;

export async function updateCompany(payload: UpdateCompanyDTO) {
  const res = await api.patch<{ message: string; data: Company }>('/company', payload, {
    headers: { 'Accept-Language': LANG }
  });
  return res.data;
}
