import { createContext, useContext, useState } from 'react';
import api from '../services/api';

const C = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() =>
    JSON.parse(localStorage.getItem('rr_user') || 'null')
  );

  // Email and password login for admin and driver
  const login = async (data) => {
    const response = await api.post('/auth/login', data);

    localStorage.setItem('rr_token', response.data.token);
    localStorage.setItem('rr_user', JSON.stringify(response.data));

    setUser(response.data);

    return response.data;
  };

  // Register a new user
  const register = async (data) => {
    const response = await api.post('/auth/register', data);

    localStorage.setItem('rr_token', response.data.token);
    localStorage.setItem('rr_user', JSON.stringify(response.data));

    setUser(response.data);

    return response.data;
  };

  // Update authentication state after OTP login
  const loginWithOtp = (data) => {
    localStorage.setItem('rr_token', data.token);
    localStorage.setItem('rr_user', JSON.stringify(data));

    setUser(data);

    return data;
  };

  // Logout
  const logout = () => {
    localStorage.removeItem('rr_token');
    localStorage.removeItem('rr_user');

    setUser(null);
  };

  return (
    <C.Provider
      value={{
        user,
        login,
        register,
        loginWithOtp,
        logout,
        setUser,
      }}
    >
      {children}
    </C.Provider>
  );
}

export const useAuth = () => useContext(C);