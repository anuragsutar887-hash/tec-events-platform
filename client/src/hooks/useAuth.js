import { useState, useEffect } from 'react';

/**
 * Auth hook for admin panel.
 * Reads from localStorage and provides login/logout methods.
 */
export function useAuth() {
  const [admin, setAdmin] = useState(() => {
    try {
      const stored = localStorage.getItem('admin_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const login = (token, adminData) => {
    localStorage.setItem('admin_token', token);
    localStorage.setItem('admin_user', JSON.stringify(adminData));
    setAdmin(adminData);
  };

  const logout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    setAdmin(null);
  };

  const isAuthenticated = Boolean(admin && localStorage.getItem('admin_token'));

  return { admin, isAuthenticated, login, logout };
}
