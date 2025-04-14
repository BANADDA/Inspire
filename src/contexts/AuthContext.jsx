import PropTypes from 'prop-types';
import { createContext, useContext, useEffect, useState } from 'react';
import {
    createLocalUserBypassingAuth,
    defaultAdminCredentials,
    getCurrentUser,
    loginWithEmailPassword,
    logoutUser
} from '../firebase/firebase';

// Create context
const AuthContext = createContext();

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Provider component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [devModeEnabled, setDevModeEnabled] = useState(false);

  // Check if user is already logged in on mount
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const currentUser = await getCurrentUser();
        
        if (currentUser) {
          setUser({
            uid: currentUser.uid,
            email: currentUser.email,
            displayName: currentUser.displayName,
            role: currentUser.role || 'user',
            department: currentUser.department,
            isLocalOnly: currentUser.isLocalOnly
          });
          setIsAuthenticated(true);
          
          // If this is a local-only user, set devMode
          if (currentUser.isLocalOnly) {
            setDevModeEnabled(true);
            console.warn('Running in DEVELOPMENT MODE with local-only user.');
            console.warn('Please enable Email/Password authentication in Firebase console.');
          }
        } else {
          setUser(null);
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('Auth status check error:', error);
        setAuthError(error.message);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAuthStatus();
  }, []);

  // Login function
  const login = async (email, password) => {
    setIsLoading(true);
    setAuthError(null);
    
    try {
      let userData;
      
      try {
        // First try the normal Firebase Auth login
        userData = await loginWithEmailPassword(email, password);
      } catch (error) {
        // If the error is specifically auth/operation-not-allowed and matches default credentials
        if (
          error.code === 'auth/operation-not-allowed' && 
          email === defaultAdminCredentials.email && 
          password === defaultAdminCredentials.password
        ) {
          console.warn('Firebase auth operation not allowed. Trying development mode fallback...');
          // Create a local-only user, bypassing Firebase Auth
          userData = await createLocalUserBypassingAuth();
          setDevModeEnabled(true);
        } else {
          // Re-throw for other errors
          throw error;
        }
      }
      
      setUser({
        uid: userData.uid,
        email: userData.email,
        displayName: userData.displayName,
        role: userData.role || 'user',
        department: userData.department,
        isLocalOnly: userData.isLocalOnly
      });
      
      setIsAuthenticated(true);
      return userData;
    } catch (error) {
      console.error('Login error:', error);
      setAuthError(error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    try {
      // Only call Firebase logout if not in dev mode
      if (!devModeEnabled) {
        await logoutUser();
      }
      setUser(null);
      setIsAuthenticated(false);
      setDevModeEnabled(false);
    } catch (error) {
      console.error('Logout error:', error);
      setAuthError(error.message);
      throw error;
    }
  };

  // Context value
  const value = {
    user,
    isAuthenticated,
    isLoading,
    authError,
    login,
    logout,
    devModeEnabled
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired
};

export default AuthContext; 