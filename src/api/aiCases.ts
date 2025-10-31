import axios from 'utils/axios';

export type CaseContextFields = {
  departmentId: string;
  customerId?: string | null;
  pieceId: string;
  topicId?: string | null;
  topicSpecificIds?: string[];
  instruction?: string | null;
};

export type CaseContextResponse = {
  pieceXmlJson: Record<string, any>;
  placeholdersDetected: string[];
};

/**
 * Envia o contexto do caso para o backend e retorna o JSON (pieceXmlJson + placeholdersDetected).
 * Espera FormData com:
 *  - fields: JSON string (CaseContextFields)
 *  - attachments: múltiplos arquivos (pdf/imagem)
 */
export async function postCaseContext(form: FormData) {
  const { data } = await axios.post<CaseContextResponse>(
    '/ai/cases/context',
    form,
    {
      headers: { 'Content-Type': 'multipart/form-data' }
    }
  );
  return data;
}


