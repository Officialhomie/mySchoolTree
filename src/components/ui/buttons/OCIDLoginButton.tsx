import { useOCAuth } from '@opencampus/ocid-connect-js';
import { useState } from 'react';

interface LoginButtonProps {
  className?: string;
  variant?: 'default' | 'compact';
}

// Helper to get the base URL
const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
    // Check if we're on localhost (development)
    if (window.location.hostname === 'localhost') {
      return 'http://localhost:5173';
    }
    // Production URL
    return 'https://my-school-tree.vercel.app';
  }
  // Fallback to production URL if window is not defined
  return 'https://my-school-tree.vercel.app';
};

const OCIDLoginButton = ({ className = '', variant = 'default' }: LoginButtonProps) => {
  const { isInitialized, isAuthenticated, user, ocAuth } = useOCAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Format user display name
  const getUserDisplayName = () => {
    if (!user) return 'User';
    return user.name || user.email || user.sub || 'User';
  };

  // If not initialized yet, show a loading state
  if (!isInitialized) {
    return (
      <div className="relative inline-block">
        <button 
          disabled
          className={`p-3 sm:p-4 bg-gray-500/20 rounded-xl border border-gray-500/30 text-gray-400 flex items-center justify-center w-full sm:w-auto text-sm sm:text-base ${className}`}
        >
          <svg className="animate-spin h-4 w-4 sm:h-5 sm:w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>Initializing...</span>
        </button>
      </div>
    );
  }

  // Handle logout
  const handleLogout = async () => {
    try {
      setIsLoading(true);
      setError(null);
      await ocAuth.logout();
      console.log('Logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
      setError('Failed to log out. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle login
  const handleLogin = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const baseUrl = getBaseUrl();
      
      await ocAuth.signInWithRedirect({ 
        state: 'opencampus',
        redirectUri: `${baseUrl}/` // Ensure we redirect back to the root path
      });
      
      console.log('Redirecting to login...');
    } catch (error) {
      console.error('Login error:', error);
      setError('Failed to initiate login. Please try again.');
      setIsLoading(false);
    }
  };

  if (isAuthenticated && user) {
    return (
      <div className="relative inline-block group">
        <button 
          onClick={handleLogout}
          disabled={isLoading}
          className={`p-3 sm:p-4 bg-green-500/20 rounded-xl border border-green-500/30 text-green-400 flex items-center justify-center w-full sm:w-auto text-sm sm:text-base transition-all duration-200 ${isLoading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-green-500/30'} ${className}`}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-4 w-4 sm:h-5 sm:w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Signing out...</span>
            </>
          ) : (
            <>
              <div className="flex items-center space-x-2">
                {user.picture ? (
                  <img 
                    src={user.picture} 
                    alt="Profile" 
                    className="w-4 h-4 sm:w-5 sm:h-5 rounded-full"
                  />
                ) : (
                  <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-green-500/30 flex items-center justify-center text-xs font-bold">
                    {getUserDisplayName().charAt(0).toUpperCase()}
                  </div>
                )}
                <span className={variant === 'compact' ? 'hidden sm:inline' : ''}>
                  {getUserDisplayName()}
                </span>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </>
          )}
        </button>
        {error && (
          <div className="absolute top-full left-0 mt-2 w-full px-2 py-1 text-xs text-red-500 bg-red-100 rounded-xl">
            {error}
          </div>
        )}
        <div className="absolute hidden group-hover:block top-full left-0 mt-2 w-48 p-2 bg-gray-800/90 backdrop-blur-sm rounded-xl border border-gray-700/50 shadow-xl">
          <div className="text-sm text-gray-300 p-2">
            <div className="font-medium text-white">{user.name}</div>
            <div className="text-xs text-gray-400 truncate">{user.email}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative inline-block">
      <button
        onClick={handleLogin}
        disabled={isLoading}
        className={`p-3 sm:p-4 bg-blue-500/20 rounded-xl border border-blue-500/30 text-blue-400 flex items-center justify-center w-full sm:w-auto text-sm sm:text-base transition-all duration-200 ${isLoading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-blue-500/30'} ${className}`}
      >
        {isLoading ? (
          <>
            <svg className="animate-spin h-4 w-4 sm:h-5 sm:w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Signing in...</span>
          </>
        ) : (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
            <span className={variant === 'compact' ? 'hidden sm:inline' : ''}>OpenCampus ID</span>
          </>
        )}
      </button>
      {error && (
        <div className="absolute top-full left-0 mt-2 w-full px-2 py-1 text-xs text-red-500 bg-red-100 rounded-xl">
          {error}
        </div>
      )}
    </div>
  );
};

export default OCIDLoginButton;