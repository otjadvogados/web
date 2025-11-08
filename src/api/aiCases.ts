import axios from 'utils/axios';

export type CaseContextFields = {
  departmentId: string;
  customerIds?: string[]; // múltiplos clientes
  pieceId: string;
  /** legado (um único tópico) */
  topicId?: string | null;
  /** NOVO: múltiplos tópicos */
  topicIds?: string[];
  topicSpecificIds?: string[];
  instruction?: string | null;
};

export type CaseContextResponse = {
  message: string;
  data: {
    /** id de correlação do processamento, para casar com os eventos WS */
    runId?: string | null;
    _infos: Record<string, any>;
    pieceId: string | null;
    docxOriginalName: string | null;
    /** HTML já com os placeholders preenchidos (fase 2) */
    html: string;
    /** Placeholders detectados na fase 1 (útil para QA) */
    placeholders: string[];
    /** Chaves efetivamente substituídas (útil para QA) */
    replacedKeys?: string[];
    /** Chaves que ficaram faltando (útil para QA) */
    missingKeys?: string[];
  };
};

/**
 * Envia o contexto do caso para o backend e retorna o JSON
 * { message, data: { html, _infos, placeholders, ... } }.
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


