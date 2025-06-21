import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthContextType, User } from '../types';
import { connectStellarWallet } from '../utils/stellar';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isWalletConnected, setIsWalletConnected] = useState(false);

  useEffect(() => {
    // Check for existing session
    const savedUser = localStorage.getItem('LexStamp_user');
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser) as User;
      setUser(parsedUser);
      if (parsedUser.publicKey && parsedUser.publicKey !== '') {
        setIsWalletConnected(true);
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (): Promise<void> => {
    setIsLoading(true);
    try {
      // Simulate passkey authentication
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: new Uint8Array(32),
          rp: { name: "LexStamp" },
          user: {
            id: new Uint8Array(16),
            name: "user@example.com",
            displayName: "User"
          },
          pubKeyCredParams: [{ alg: -7, type: "public-key" }],
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            userVerification: "required"
          }
        }
      });

      if (credential && user?.publicKey) {
        const newUser: User = {
          id: user.id || ('user_' + Date.now()),
          publicKey: user.publicKey,
          credentialId: credential.id
        };
        setUser(newUser);
        localStorage.setItem('LexStamp_user', JSON.stringify(newUser));
      }
    } catch (error) {
      console.error('Authentication failed:', error);
      if (isWalletConnected && user?.publicKey) {
        const mockUser: User = {
          id: user.id || 'demo_user',
          publicKey: user.publicKey,
          credentialId: 'demo_credential'
        };
        setUser(mockUser);
        localStorage.setItem('LexStamp_user', JSON.stringify(mockUser));
      } else {
        throw new Error('Wallet not connected or authentication failed.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = (): void => {
    setUser(null);
    setIsWalletConnected(false);
    localStorage.removeItem('LexStamp_user');
  };

  const connectWallet = async (address: string): Promise<void> => {
    setIsLoading(true);
    try {
      const publicKey = address; // Freighter'dan gelen adres
      if (publicKey) {
        const updatedUser = user
          ? { ...user, publicKey }
          : { id: 'user_' + Date.now(), publicKey, credentialId: '' };
        setUser(updatedUser);
        localStorage.setItem('LexStamp_user', JSON.stringify(updatedUser));
        setIsWalletConnected(true);
      }
    } catch (error) {
      console.error('Wallet connection failed:', error);
      if (user) {
        const updatedUser = { ...user, publicKey: 'GDEMO123ABCDEF...' }; // Demo key
        setUser(updatedUser);
        localStorage.setItem('LexStamp_user', JSON.stringify(updatedUser));
        setIsWalletConnected(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const stellarAddress = user?.publicKey || '';

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        stellarAddress,
        connectWallet,
        isWalletConnected
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};