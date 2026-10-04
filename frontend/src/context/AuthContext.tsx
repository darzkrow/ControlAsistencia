import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  loginAdmin,
  logoutAdmin,
  type UsuarioAdmin,
  type RolPoliticaModelo,
} from '../services/api';

interface AuthContextType {
  user: UsuarioAdmin | null;
  token: string | null;
  politicas: RolPoliticaModelo[];
  isAuthenticated: boolean;
  login: (identifier: string, pass: string) => Promise<void>;
  logout: () => void;
  hasPermission: (
    modelo: string,
    accion: 'crear' | 'leer' | 'actualizar' | 'eliminar' | 'exportar'
  ) => boolean;
  getModelScope: (modelo: string) => 'global' | 'sede' | 'ninguno';
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = 'rapture_admin_auth';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UsuarioAdmin | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [politicas, setPoliticas] = useState<RolPoliticaModelo[]>([]);

  // Restaurar sesión al cargar
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.token && parsed.usuario) {
          setUser(parsed.usuario);
          setToken(parsed.token);
          setPoliticas(parsed.politicas || []);
        }
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const login = async (identifier: string, pass: string) => {
    const res = await loginAdmin(identifier, pass);
    setUser(res.usuario);
    setToken(res.token);
    setPoliticas(res.politicas);
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        token: res.token,
        usuario: res.usuario,
        politicas: res.politicas,
        timestamp: Date.now(),
      })
    );
  };

  const logout = () => {
    if (user?.email) {
      logoutAdmin(user.email);
    }
    setUser(null);
    setToken(null);
    setPoliticas([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  const hasPermission = (
    modelo: string,
    accion: 'crear' | 'leer' | 'actualizar' | 'eliminar' | 'exportar'
  ): boolean => {
    if (!user) return false;
    // SuperAdmin tiene pase irrestricto
    if (user.rol_codigo === 'SUPER_ADMIN') return true;

    const pol = politicas.find((p) => p.modelo_codigo === modelo);
    if (!pol) return false;

    switch (accion) {
      case 'crear':
        return pol.puede_crear;
      case 'leer':
        return pol.puede_leer;
      case 'actualizar':
        return pol.puede_actualizar;
      case 'eliminar':
        return pol.puede_eliminar;
      case 'exportar':
        return pol.puede_exportar;
      default:
        return false;
    }
  };

  const getModelScope = (modelo: string): 'global' | 'sede' | 'ninguno' => {
    if (!user) return 'ninguno';
    if (user.rol_codigo === 'SUPER_ADMIN') return 'global';
    const pol = politicas.find((p) => p.modelo_codigo === modelo);
    return pol ? pol.alcance : 'ninguno';
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        politicas,
        isAuthenticated: !!user && !!token,
        login,
        logout,
        hasPermission,
        getModelScope,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser utilizado dentro de un AuthProvider');
  }
  return context;
};
