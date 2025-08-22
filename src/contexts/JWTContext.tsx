import React, { createContext, useEffect, useReducer } from 'react';

// reducer - state management
import { LOGIN, LOGOUT } from 'contexts/auth-reducer/actions';
import authReducer from 'contexts/auth-reducer/auth';

// project imports
import Loader from 'components/Loader';
import axios from 'utils/axios';
import { AuthProps, JWTContextType } from 'types/auth';

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
          const { user } = response.data;

          dispatch({
            type: LOGIN,
            payload: { isLoggedIn: true, user }
          });
        } else {
          dispatch({ type: LOGOUT });
        }
      } catch (err) {
        console.error(err);
        dispatch({ type: LOGOUT });
      }
    };
    init();
  }, []);

  const login = async (email: string, password: string) => {
    // chama seu backend real
    const response = await axios.post('/auth/login', { email, password });
    const { serviceToken, user } = response.data;

    setSession(serviceToken);
    dispatch({
      type: LOGIN,
      payload: { isLoggedIn: true, user }
    });
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
      throw new Error(error.response?.data?.message || 'Erro ao enviar e-mail de redefinição de senha');
    }
  };

  const updateProfile = () => {};

  if (state.isInitialized !== undefined && !state.isInitialized) {
    return <Loader />;
  }

  return <JWTContext value={{ ...state, login, logout, register, resetPassword, updateProfile }}>{children}</JWTContext>;
};

export default JWTContext;
