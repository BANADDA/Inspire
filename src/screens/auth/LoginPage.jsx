import { AlertTriangle, Coffee, Eye, EyeOff, LogIn, Moon, Sun } from 'lucide-react';
import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { defaultAdminCredentials } from '../../firebase/firebase';

const LoginPage = ({ darkMode, toggleDarkMode }) => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isAdminCreating, setIsAdminCreating] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [showAuthWarning, setShowAuthWarning] = useState(false);

  // Log default credentials when component mounts
  useEffect(() => {
    console.log("Default admin credentials ready:", 
      defaultAdminCredentials.email, 
      defaultAdminCredentials.password
    );
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    setLoginAttempts(prev => prev + 1);

    try {
      if (loginAttempts >= 2 && email === defaultAdminCredentials.email) {
        // On repeated attempts with the default admin email, add a delay 
        // to ensure admin creation has enough time
        setIsAdminCreating(true);
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
      
      await login(email, password);
      navigate('/dashboard');
    } catch (error) {
      console.error('Login error:', error.code, error.message);
      let errorMessage = 'Invalid email or password';
      
      // Handle specific Firebase error codes
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        errorMessage = `Invalid email or password. Please try using the default credentials: ${defaultAdminCredentials.email} / ${defaultAdminCredentials.password}`;
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed login attempts. Please try again later.';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (error.code === 'auth/user-disabled') {
        errorMessage = 'This account has been disabled. Please contact the administrator.';
      } else if (error.code === 'auth/operation-not-allowed') {
        errorMessage = 'Email/Password authentication is not enabled in Firebase. Please check the Firebase console settings.';
        setShowAuthWarning(true);
      }
      
      setError(errorMessage);
      
      // If it's the admin account and we're still failing, suggest a refresh
      if (email === defaultAdminCredentials.email && loginAttempts > 3) {
        setError(prev => `${prev} If problems persist, try refreshing the page or wait a few moments for the system to initialize.`);
      }
    } finally {
      setIsLoading(false);
      setIsAdminCreating(false);
    }
  };

  // Add a helper to set default credentials for quick login
  const setDefaultCredentials = () => {
    setEmail(defaultAdminCredentials.email);
    setPassword(defaultAdminCredentials.password);
  };

  return (
    <div 
      className={`min-h-screen flex items-center justify-center p-4 ${
        darkMode ? 'bg-gray-900 text-white' : 'bg-[#F8F3E9] text-gray-900'
      }`}
    >
      {/* Theme toggle button */}
      <button
        onClick={toggleDarkMode}
        className={`absolute top-6 right-6 p-2 rounded-full transition-colors ${
          darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-100 shadow-md'
        }`}
        aria-label="Toggle theme"
      >
        {darkMode ? (
          <Sun className="h-5 w-5 text-yellow-400" />
        ) : (
          <Moon className="h-5 w-5 text-gray-700" />
        )}
      </button>

      <div 
        className={`max-w-md w-full p-8 rounded-2xl shadow-xl ${
          darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-100'
        }`}
      >
        {showAuthWarning && (
          <div className="mb-6 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-500 text-sm">
            <div className="flex items-start mb-2">
              <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
              <span className="font-bold">Firebase Authentication Not Configured</span>
            </div>
            <p>Email/Password authentication is not enabled in your Firebase project.</p>
            <p className="mt-2">To fix this:</p>
            <ol className="list-decimal list-inside mt-1 space-y-1">
              <li>Go to the Firebase Console</li>
              <li>Select your project</li>
              <li>Click &apos;Authentication&apos; in the sidebar</li>
              <li>Go to the &apos;Sign-in method&apos; tab</li>
              <li>Enable &apos;Email/Password&apos; provider</li>
            </ol>
            <p className="mt-2">A local development mode will be used as a temporary workaround.</p>
          </div>
        )}
        
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-green-700 text-white">
              <Coffee className="h-8 w-8" />
            </div>
          </div>
          <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Welcome to Coffee Fund
          </h1>
          <p className={`mt-2 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            Sign in to access the Coffee Fund Management System
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm">
            {error}
          </div>
        )}

        {isAdminCreating && (
          <div className="mb-6 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-500 text-sm flex items-center">
            <div className="w-4 h-4 border-t-2 border-b-2 border-yellow-500 rounded-full animate-spin mr-2"></div>
            Creating admin account... Please wait a moment.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label 
              htmlFor="email" 
              className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}
            >
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={defaultAdminCredentials.email}
              required
              className={`w-full px-4 py-3 rounded-lg text-base ${
                darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-green-500' 
                  : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400 focus:border-green-500'
              } border focus:ring-2 focus:ring-green-500/30 outline-none transition-colors`}
            />
          </div>

          <div>
            <label 
              htmlFor="password" 
              className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}
            >
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className={`w-full px-4 py-3 rounded-lg text-base ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-green-500' 
                    : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400 focus:border-green-500'
                } border focus:ring-2 focus:ring-green-500/30 outline-none transition-colors`}
              />
              <button
                type="button"
                className={`absolute right-3 top-1/2 -translate-y-1/2 ${
                  darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              <label htmlFor="remember-me" className={`ml-2 block text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Remember me
              </label>
            </div>

            <button 
              type="button"
              onClick={setDefaultCredentials}
              className={`text-sm font-medium text-green-600 hover:text-green-500`}
            >
              Use Default Login
            </button>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full flex items-center justify-center px-4 py-3 border border-transparent rounded-lg text-base font-medium text-white bg-green-700 ${
              isLoading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-green-800'
            } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors`}
          >
            {isLoading ? (
              <span className="animate-pulse">Signing in...</span>
            ) : (
              <>
                <LogIn className="w-5 h-5 mr-2" />
                Sign in
              </>
            )}
          </button>
        </form>

        <div className={`mt-6 text-center p-3 rounded-lg ${
          darkMode 
            ? 'bg-green-900/20 border border-green-800/30' 
            : 'bg-green-50 border border-green-100'
        }`}>
          <p className={`text-sm ${darkMode ? 'text-green-400' : 'text-green-700'}`}>
            <strong>Default Admin Login:</strong><br/>
            Email: {defaultAdminCredentials.email}<br/>
            Password: {defaultAdminCredentials.password}
          </p>
        </div>

        <div className="mt-8 text-center">
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Don&apos;t have an account? Contact the system administrator.
          </p>
        </div>

        <div className={`mt-8 pt-6 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <p className={`text-xs text-center ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            © {new Date().getFullYear()} Inspire Africa Coffee Fund. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

LoginPage.propTypes = {
  darkMode: PropTypes.bool.isRequired,
  toggleDarkMode: PropTypes.func.isRequired
};

export default LoginPage; 