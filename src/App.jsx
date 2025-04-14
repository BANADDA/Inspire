// App.jsx
import { Coffee } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import BottomNavbar from './components/BottomNavbar';
import PageTransitionProvider from './components/PageTransitionProvider';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './screens/auth/LoginPage';
import WelcomePage from './screens/auth/WelcomePage';
import CoffeeFundDashboard from './screens/CoffeeFundDashboard';

// SVG background patterns
const lightPatternBg = `data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E`;
const darkPatternBg = `data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23FFFFFF' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E`;

function AppContent() {
  const [appInitialized, setAppInitialized] = useState(false);
  const [initializationError, setInitializationError] = useState(null);
  const location = useLocation();
  const { user } = useAuth();
  
  // Extract active section from URL params or set default
  const urlParams = new URLSearchParams(location.search);
  const activeSection = urlParams.get('section') || 'dashboard';
  
  // Initialize dark mode based on system preference or saved preference
  const [darkMode, setDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    if (!savedTheme || savedTheme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return savedTheme === 'dark';
  });

  // Set initialization timeout to give Firebase time to set up
  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log("Initializing application and waiting for Firebase setup...");
        // Give Firebase more time to initialize and create the admin user if needed
        await new Promise(resolve => setTimeout(resolve, 5000));
        console.log("Initialization period complete");
        setAppInitialized(true);
      } catch (error) {
        console.error("Error during initialization:", error);
        setInitializationError(error.message);
        setAppInitialized(true); // Allow app to continue even with error
      }
    };
    
    initializeApp();
  }, []);

  // Update dark mode when system preference changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleSystemThemeChange = (e) => {
      const savedTheme = localStorage.getItem('theme');
      if (!savedTheme || savedTheme === 'system') {
        setDarkMode(e.matches);
      }
    };

    mediaQuery.addEventListener('change', handleSystemThemeChange);
    
    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
    };
  }, []);

  // Toggle dark mode function
  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem('theme', newDarkMode ? 'dark' : 'light');
  };

  // Show loading screen while Firebase initializes
  if (!appInitialized) {
    return (
      <div 
        className={`min-h-screen flex flex-col items-center justify-center p-4 ${
          darkMode ? 'bg-gray-900 text-white' : 'bg-[#F8F3E9] text-gray-900'
        }`}
        style={{
          backgroundImage: `url("${darkMode ? darkPatternBg : lightPatternBg}")`,
          backgroundRepeat: 'repeat',
          backgroundAttachment: 'fixed',
          backgroundSize: 'auto'
        }}
      >
        <div className="flex items-center justify-center w-20 h-20 rounded-full bg-green-700 text-white text-2xl font-bold mb-6">
          <Coffee className="h-10 w-10" />
        </div>
        <h1 className={`text-2xl font-bold mb-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Initializing Coffee Fund...
        </h1>
        <div className="w-16 h-16 border-t-4 border-b-4 border-green-700 rounded-full animate-spin"></div>
        <p className="mt-4 text-sm text-gray-500">
          Setting up system and creating default admin account...
        </p>
      </div>
    );
  }

  return (
    <div 
      className={`flex flex-col min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-[#F8F3E9] text-gray-900'}`}
      style={{
        backgroundImage: `url("${darkMode ? darkPatternBg : lightPatternBg}")`,
        backgroundRepeat: 'repeat',
        backgroundAttachment: 'fixed',
        backgroundSize: 'auto'
      }}
    >
      <Toaster
        position="bottom-right"
        toastOptions={{
          // Default options for all toasts
          duration: 3000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          // Custom success styles
          success: {
            style: {
              background: '#1F2937',
              border: '1px solid #374151',
            },
            iconTheme: {
              primary: '#10B981',
              secondary: '#fff',
            },
          },
          // Custom error styles
          error: {
            style: {
              background: '#1F2937',
              border: '1px solid #374151',
            },
            iconTheme: {
              primary: '#EF4444',
              secondary: '#fff',
            },
          },
        }}
      />
      
      {initializationError && (
        <div className="bg-red-500 text-white p-4 text-center">
          <p>Error initializing app: {initializationError}</p>
          <p className="text-sm">Please refresh the page or contact system administrator.</p>
        </div>
      )}
      
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<WelcomePage darkMode={darkMode} toggleDarkMode={toggleDarkMode} />} />
        <Route path="/login" element={<LoginPage darkMode={darkMode} toggleDarkMode={toggleDarkMode} />} />
        
        {/* Protected routes */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <CoffeeFundDashboard darkMode={darkMode} updateDarkMode={toggleDarkMode} />
          </ProtectedRoute>
        } />
        
        {/* Fallback redirect for any unknown routes */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      
      {/* Bottom Navbar - only show on authenticated pages */}
      {user && !location.pathname.includes('/login') && !location.pathname.includes('/') && (
        <BottomNavbar darkMode={darkMode} activeSection={activeSection} />
      )}
      
      {/* Add pb-16 padding on mobile when bottom navbar is visible */}
      {user && !location.pathname.includes('/login') && !location.pathname.includes('/') && (
        <div className="h-16 md:hidden"></div> 
      )}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <PageTransitionProvider>
        <AppContent />
      </PageTransitionProvider>
    </AuthProvider>
  );
}

export default App;