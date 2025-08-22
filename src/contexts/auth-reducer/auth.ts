// action - state management
import { REGISTER, LOGIN, LOGOUT, UPDATE_PROFILE } from './actions';

// types
import { AuthProps, AuthActionProps } from 'types/auth';

// initial state
const initialState: AuthProps = {
  isLoggedIn: false,
  isInitialized: false,
  user: null
};

// ==============================|| AUTH REDUCER ||============================== //

const auth = (state = initialState, action: AuthActionProps) => {
  switch (action.type) {
    case REGISTER: {
      const { user } = action.payload!;
      return {
        ...state,
        user
      };
    }
    case LOGIN: {
      const { user, expiresIn } = action.payload!;
      return {
        ...state,
        isLoggedIn: true,
        isInitialized: true,
        user,
        expiresIn
      };
    }
    case LOGOUT: {
      return {
        ...state,
        isInitialized: true,
        isLoggedIn: false,
        user: null
      };
    }
    case UPDATE_PROFILE: {
      const { user } = action.payload!;
      return {
        ...state,
        user
      };
    }
    default: {
      return { ...state };
    }
  }
};

export default auth;
