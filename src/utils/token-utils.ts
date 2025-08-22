import axios from './axios';

// Tipos de token suportados
export type TokenType = 'verify' | 'unlock' | 'approve' | 'reject' | 'reset';

// Interface para resposta do precheck
export interface TokenCheckResponse {
  valid: boolean;
  message?: string;
}

// Função para fazer precheck opcional do token
export const checkToken = async (type: TokenType, token: string): Promise<TokenCheckResponse> => {
  try {
    const response = await axios.post('/auth/token/check', {
      type,
      token
    });

    return {
      valid: true,
      message: response.data?.message
    };
  } catch (error: any) {
    return {
      valid: false,
      message: error.response?.data?.message || 'Token inválido ou expirado'
    };
  }
};

// Função para extrair token da URL
export const extractTokenFromUrl = (): string | null => {
  return new URLSearchParams(location.hash.replace(/^#/, '')).get('t') ?? new URLSearchParams(location.search).get('token');
};

// Função para limpar token da URL
export const clearTokenFromUrl = (): void => {
  history.replaceState(null, '', location.pathname);
};
