import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, loginWithGoogle, logoutUser, testConnection } from '../services/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  isAshrafAdmin: boolean;
  isConnectedToFirebase: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAdmin: false,
  isAshrafAdmin: false,
  isConnectedToFirebase: false,
  login: async () => {},
  logout: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isConnectedToFirebase, setIsConnectedToFirebase] = useState(false);

  useEffect(() => {
    // Validate connection to Firestore
    testConnection().then((connected) => {
      setIsConnectedToFirebase(connected);
    });

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      await loginWithGoogle();
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (error) {
      console.error('Logout failed:', error);
      throw error;
    }
  };

  const isAshraf = user?.email?.toLowerCase() === 'ashraf170787@gmail.com';
  const isAdmin = isAshraf || Boolean(user?.emailVerified);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAdmin,
        isAshrafAdmin: isAshraf,
        isConnectedToFirebase,
        login: handleLogin,
        logout: handleLogout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
