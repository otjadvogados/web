import { ReactElement } from 'react';

// ==============================|| AUTH TYPES ||============================== //

export type GuardProps = {
  children: ReactElement | null;
};

type CanRemove = {
  login?: (email: string, password: string) => Promise<void>;
  register?: (email: string, password: string, firstName: string, lastName: string) => Promise<void>;
  codeVerification?: (verificationCode: string) => Promise<void>;
  resendConfirmationCode?: () => Promise<void>;
  confirmRegister?: (email: string, code: string) => Promise<void>;
  forgotPassword?: (email: string) => Promise<void>;
  resendCodeRegister?: (email: string) => Promise<void>;
  newPassword?: (email: string, code: string, password: string) => Promise<void>;
  updatePassword?: (password: string) => Promise<void>;
  resetPassword?: (email: string) => Promise<{ message: string }>;
};

export type UserProfile = {
  id?: string;
  email?: string;
  avatar?: string;
  image?: string;
  name?: string;
  role?: string;
  tier?: string;
  // 👇 opcionais, caso o backend envie
  cpf?: string;
  birthdate?: string;
  phone?: string;
  createdAt?: string;
  updatedAt?: string;
};

export interface AuthProps {
  isLoggedIn: boolean;
  isInitialized?: boolean;
  user?: UserProfile | null;
  token?: string | null;
  expiresIn?: {
    hours: number;
    minutes: number;
    seconds: number;
  };
}

export interface AuthActionProps {
  type: string;
  payload?: AuthProps;
}

export interface InitialLoginContextProps {
  isLoggedIn: boolean;
  isInitialized?: boolean;
  user?: UserProfile | null | undefined;
}

export type JWTContextType = CanRemove & {
  isLoggedIn: boolean;
  isInitialized?: boolean;
  user?: UserProfile | null | undefined;
  expiresIn?: {
    hours: number;
    minutes: number;
    seconds: number;
  };
  logout: () => void;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, firstName: string, lastName: string) => Promise<void>;
  resetPassword: (email: string) => Promise<{ message: string }>;
  updateProfile: (userData: UserProfile) => void;
};
