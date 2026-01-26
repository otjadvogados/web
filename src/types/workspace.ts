// ==============================|| WORKSPACE TYPES ||============================== //

export interface WorkspaceState {
  scrollPosition?: number;
  selectedTab?: string | number;
  formData?: Record<string, any>;
  [key: string]: any; // Permite campos adicionais específicos do contexto
}

export interface WorkspaceMetadata {
  url?: string;
  timestamp?: string;
  [key: string]: any; // Permite campos adicionais específicos do contexto
}

export interface WorkspaceStateData {
  userId: string;
  context: string;
  resourceId: string | null;
  state: WorkspaceState;
  metadata: WorkspaceMetadata;
  lastActivityAt: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SaveWorkspaceStateRequest {
  context: string;
  resourceId: string | null;
  state: WorkspaceState;
  metadata?: WorkspaceMetadata;
}

export interface SaveWorkspaceStateResponse {
  message: string;
  data: WorkspaceStateData;
}

export interface GetWorkspaceStateResponse {
  message: string;
  data: WorkspaceStateData | null;
}

export interface ListWorkspaceStatesResponse {
  message: string;
  data: WorkspaceStateData[];
}

export interface DeleteWorkspaceStateResponse {
  message: string;
}
