import React, { createContext, useEffect, useReducer } from 'react';

// reducer - state management
import { LOGIN, LOGOUT, UPDATE_PROFILE } from 'contexts/auth-reducer/actions';
import authReducer from 'contexts/auth-reducer/auth';

// project imports
import Loader from 'components/Loader';
import axios from 'utils/axios';
import { AuthProps, JWTContextType } from 'types/auth';
import { clearToken } from 'utils/axios';
import type { WorkspaceStateData } from 'types/workspace';

// constant
const initialState: AuthProps = {
  isLoggedIn: false,
  isInitialized: false,
  user: null
};

const setSession = (serviceToken?: string | null) => {
  if (serviceToken) {
    localStorage.setItem('serviceToken', serviceToken);
  } else {
    localStorage.removeItem('serviceToken');
  }
};

// ==============================|| JWT CONTEXT & PROVIDER ||============================== //

const JWTContext = createContext<JWTContextType | null>(null);

export const JWTProvider = ({ children }: { children: React.ReactElement }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    const init = async () => {
      try {
        // Se já havia token, ele será verificado no backend via /auth/me
        const serviceToken = window.localStorage.getItem('serviceToken');
        if (serviceToken) {
          // não decodifique para decidir — pergunte ao backend
          const response = await axios.get('/auth/me');
          
          // Baseado nos dados fornecidos, a API retorna { data: {...}, expiresIn: {...} }
          const { data: userData, expiresIn } = response.data;
          


          dispatch({
            type: LOGIN,
            payload: { isLoggedIn: true, user: userData, expiresIn }
          });
        } else {
          dispatch({ type: LOGOUT });
        }
      } catch (err: any) {
        console.error(err);
        
        // O interceptor do axios já cuida do redirecionamento para 401
        // Aqui apenas limpamos o estado local
        clearToken();
        dispatch({ type: LOGOUT });
      }
    };
    init();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      // chama seu backend real
      const response = await axios.post('/auth/login', { email, password });
      
      // A API retorna { serviceToken, user, expiresIn, lastWorkspaceState? }
      const { serviceToken, user: userData, expiresIn, lastWorkspaceState } = response.data;

      // Garante que o userData existe e tem a estrutura correta
      if (!userData) {
        throw new Error('Dados do usuário não encontrados na resposta');
      }

      setSession(serviceToken);
      dispatch({
        type: LOGIN,
        payload: { isLoggedIn: true, user: userData, expiresIn }
      });

      // Redireciona baseado no lastWorkspaceState (sessão expirada)
      // Se houver lastWorkspaceState, significa que a sessão expirou e o usuário estava trabalhando
      if (lastWorkspaceState) {
        handleWorkspaceRedirect(lastWorkspaceState);
      } else {
        // Logout manual ou primeiro acesso - redireciona para dashboard
        // O redirecionamento será feito pelo componente de login ou roteamento
      }
    } catch (error: any) {
      // Extrai a mensagem de erro da API ou usa uma mensagem padrão
      const errorMessage = error.response?.data?.message || error.message || 'Erro ao fazer login';
      throw new Error(errorMessage);
    }
  };

  /**
   * Redireciona o usuário para onde estava trabalhando baseado no estado do workspace
   */
  const handleWorkspaceRedirect = (workspaceState: WorkspaceStateData) => {
    // Prioridade 1: URL salva nos metadados
    if (workspaceState.metadata?.url) {
      window.location.href = workspaceState.metadata.url;
      return;
    }

    // Prioridade 2: Constrói URL baseada no contexto e resourceId
    if (workspaceState.resourceId) {
      let url = '';
      
      switch (workspaceState.context) {
        case 'case-editor':
          url = `/ai/cases/${workspaceState.resourceId}/edit`;
          break;
        case 'draft-editor':
          url = `/ai/drafts/${workspaceState.resourceId}/edit`;
          break;
        case 'document-viewer':
          url = `/ai/documents/${workspaceState.resourceId}`;
          break;
        default:
          // Tenta construir URL genérica baseada no contexto
          url = `/${workspaceState.context}/${workspaceState.resourceId}`;
      }

      if (url) {
        window.location.href = url;
        return;
      }
    }

    // Fallback: redireciona para dashboard
    window.location.href = '/dashboard';
  };

  // register/resetPassword podem continuar mock ou apontar para seus endpoints reais, se existirem
  const register = async () => Promise.resolve();

  const logout = async () => {
    try {
      await axios.post('/auth/logout'); // invalida refresh no servidor
    } catch {}
    setSession(null);
    dispatch({ type: LOGOUT });
  };

  const resetPassword = async (email: string) => {
    try {
      const response = await axios.post('/auth/forgot-password', { email });
      return response.data;
    } catch (error: any) {
      // Extrai a mensagem de erro da API ou usa uma mensagem padrão
      const errorMessage = error.response?.data?.message || error.message || 'Erro ao enviar e-mail de redefinição de senha';
      throw new Error(errorMessage);
    }
  };

  const updateProfile = (userData: any) => {
    dispatch({
      type: UPDATE_PROFILE,
      payload: { isLoggedIn: true, user: userData }
    });
  };

  const refreshUser = async () => {
    try {
      const response = await axios.get('/auth/me');
      const { data: userData, expiresIn } = response.data;
      
      dispatch({
        type: LOGIN,
        payload: { isLoggedIn: true, user: userData, expiresIn }
      });
    } catch (error: any) {
      console.error('Erro ao atualizar dados do usuário:', error);
      // Não faz logout em caso de erro, apenas loga o erro
    }
  };

  // Só mostra o loader se ainda não foi inicializado
  if (!state.isInitialized) {
    return <Loader />;
  }

  return <JWTContext value={{ ...state, login, logout, register, resetPassword, updateProfile, refreshUser }}>{children}</JWTContext>;
};

export default JWTContext;
