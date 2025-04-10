import { useOCAuth } from '@opencampus/ocid-connect-js';
import { useState } from 'react';

interface LoginButtonProps {
  className?: string;
}

const OCIDLoginButton = ({ className = '' }: LoginButtonProps) => {
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
          className={`px-4 py-2 bg-gray-400 text-white rounded-md cursor-not-allowed opacity-70 flex items-center space-x-2 ${className}`}
        >
          <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
      await ocAuth.signInWithRedirect({ state: 'opencampus' });
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
          className={`
            px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 
            transition-all duration-200 flex items-center space-x-2
            ${isLoading ? 'opacity-70 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}
            ${className}
          `}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
                    className="w-5 h-5 rounded-full"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center text-xs font-bold">
                    {getUserDisplayName().charAt(0).toUpperCase()}
                  </div>
                )}
                <span>{getUserDisplayName()}</span>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </>
          )}
        </button>
        {error && (
          <div className="absolute top-full left-0 mt-2 w-full px-2 py-1 text-xs text-red-500 bg-red-100 rounded">
            {error}
          </div>
        )}
        <div className="absolute hidden group-hover:block top-full left-0 mt-2 w-48 p-2 bg-gray-800 rounded-md shadow-lg">
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
        className={`
          px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 
          transition-all duration-200 flex items-center space-x-2
          ${isLoading ? 'opacity-70 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}
          ${className}
        `}
      >
        {isLoading ? (
          <>
            <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Signing in...</span>
          </>
        ) : (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
            <span>OpenCampus ID</span>
          </>
        )}
      </button>
      {error && (
        <div className="absolute top-full left-0 mt-2 w-full px-2 py-1 text-xs text-red-500 bg-red-100 rounded">
          {error}
        </div>
      )}
    </div>
  );
};

export default OCIDLoginButton;