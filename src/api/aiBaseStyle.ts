// src/api/aiBaseStyle.ts
import axios from 'utils/axios';

export type CompanyBaseStyle = {
  companyId: string;
  companyName: string;
  fileId?: string | null;
  styleStyleJson?: any;
  styleWdocJson?: any;
  updatedAt?: string | null;
  hasStyle: boolean;
};

const LANG = import.meta.env.VITE_APP_ACCEPT_LANGUAGE || 'pt-BR';

export async function getCompanyBaseStyle() {
  const { data } = await axios.get<{ message: string; data: CompanyBaseStyle }>('/ai/base-style', {
    headers: { 'Accept-Language': LANG }
  });
  return data.data;
}

export async function uploadCompanyBaseStyleDocx(file: File) {
  const fd = new FormData();
  fd.append('file', file);
  const { data } = await axios.post<{ message: string; fileId: string }>(
    '/ai/base-style',
    fd,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return data;
}

export async function removeCompanyBaseStyle() {
  const { data } = await axios.delete<{ message: string }>('/ai/base-style');
  return data;
}

export async function downloadCompanyBaseStyleBlob() {
  const info = await getCompanyBaseStyle();
  if (!info.fileId) throw new Error('Nenhum Documento Base configurado.');
  const { data } = await axios.get(
    `/ai/base-style/docx?v=${encodeURIComponent(info.fileId)}`,
    { responseType: 'blob' }
  );
  return data as Blob;
}
