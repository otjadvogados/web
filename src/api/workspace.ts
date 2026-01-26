import axios from 'utils/axios';
import type {
  SaveWorkspaceStateRequest,
  SaveWorkspaceStateResponse,
  GetWorkspaceStateResponse,
  ListWorkspaceStatesResponse,
  DeleteWorkspaceStateResponse,
  WorkspaceStateData
} from 'types/workspace';

/**
 * Salva o estado do workspace do usuário no Redis
 */
export async function saveWorkspaceState(
  payload: SaveWorkspaceStateRequest
): Promise<SaveWorkspaceStateResponse> {
  const { data } = await axios.post<SaveWorkspaceStateResponse>('/workspace/save', payload);
  return data;
}

/**
 * Recupera o estado do workspace do usuário
 * @param context - Contexto específico (ex: 'case-editor'). Se não fornecido, retorna o mais recente
 */
export async function getWorkspaceState(
  context?: string
): Promise<GetWorkspaceStateResponse> {
  const { data } = await axios.get<GetWorkspaceStateResponse>('/workspace/state', {
    params: context ? { context } : undefined
  });
  return data;
}

/**
 * Lista todos os estados do workspace do usuário
 */
export async function listWorkspaceStates(): Promise<ListWorkspaceStatesResponse> {
  const { data } = await axios.get<ListWorkspaceStatesResponse>('/workspace/states');
  return data;
}

/**
 * Remove um estado específico do workspace
 * @param context - Contexto específico a ser removido
 */
export async function deleteWorkspaceState(
  context: string
): Promise<DeleteWorkspaceStateResponse> {
  const { data } = await axios.delete<DeleteWorkspaceStateResponse>('/workspace/state', {
    params: { context }
  });
  return data;
}

/**
 * Remove todos os estados do workspace do usuário
 */
export async function clearAllWorkspaceStates(): Promise<void> {
  const response = await listWorkspaceStates();
  if (response.data && response.data.length > 0) {
    await Promise.all(
      response.data.map((state) => deleteWorkspaceState(state.context))
    );
  }
}
