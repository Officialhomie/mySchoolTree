// src/components/RedirectPage.tsx
import { useNavigate } from 'react-router-dom';
import { LoginCallBack, useOCAuth } from '@opencampus/ocid-connect-js';
import { useState, useCallback, memo, useEffect } from 'react';

// Helper to get the correct redirect URI
const getRedirectUri = () => {
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    
    // For localhost, use port 5173
    if (hostname === 'localhost') {
      return `${protocol}//${hostname}:5173`;
    }
    
    // For production, don't include the port
    return `${protocol}//${hostname}`;
  }
  return 'http://localhost:5173'; // Fallback
};

// Custom loading component
const LoadingComponent = memo(({ isProcessing }: { isProcessing: boolean }) => (
  <div className="flex items-center justify-center min-h-screen bg-gray-900">
    <div className="text-center">
      <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-4"></div>
      <p className="text-xl text-gray-300">
        {isProcessing ? 'Finalizing your login...' : 'Processing your login...'}
      </p>
      <p className="text-gray-400 mt-2 text-sm">
        {isProcessing ? 'We are preparing your home page' : 'Validating your credentials'}
      </p>
    </div>
  </div>
));

// Custom error component
const ErrorComponent = memo(() => {
  const navigate = useNavigate();
  const { authState } = useOCAuth();
  
  const handleReturn = useCallback(() => {
    navigate('/');
  }, [navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900">
      <div className="text-center p-8 bg-gray-800 rounded-lg shadow-xl">
        <p className="text-xl text-red-500 mb-4">Login Error</p>
        <p className="text-gray-300">{authState.error?.message || 'An unknown error occurred'}</p>
        <button 
          onClick={handleReturn}
          className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Return to Home
        </button>
      </div>
    </div>
  );
});

const RedirectPage = () => {
  const navigate = useNavigate();
  const { ocAuth, isInitialized, authState } = useOCAuth();
  const [isProcessing, setIsProcessing] = useState(false);

  // Success callback - handles successful login and navigation
  const loginSuccess = useCallback(async () => {
    try {
      console.log('Login successful, preparing navigation...');
      setIsProcessing(true);

      // Wait for auth to be initialized
      if (!isInitialized) {
        await new Promise(resolve => setTimeout(resolve, 5500));
      }

      // Get the redirect URI first
      const redirectUri = getRedirectUri();
      console.log('Configured redirect URI:', redirectUri);

      // Check authentication status from authState
      if (authState.isAuthenticated) {
        try {
          // Log auth state details for debugging
          console.log('Auth State:', {
            isAuthenticated: authState.isAuthenticated,
            user: authState.user,
            token: authState.token,
            session: authState.session
          });

          if (ocAuth) {
            try {
              // Attempt to refresh the session
              await ocAuth.signInWithRedirect({ 
                redirectUri,
                state: 'opencampus'
              });
            } catch (redirectError) {
              console.warn('Redirect configuration error:', redirectError);
              // Continue with navigation even if redirect fails
            }
          }
        } catch (error) {
          console.warn('Auth state handling error:', error);
          // Continue execution even if verification fails
        }
      } else {
        console.warn('User not authenticated in authState');
      }

      // Short delay before navigation to ensure state is updated
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Use React Router navigation with replace to avoid history issues
      navigate('/', { replace: true });
      
    } catch (error) {
      console.error('Error in login success handler:', error);
      // Ensure we still navigate even if there's an error
      navigate('/', { replace: true });
    } finally {
      setIsProcessing(false);
    }
  }, [navigate, isInitialized, ocAuth, authState]);

  // Error callback - handles login errors
  const loginError = useCallback((error: Error) => {
    console.error('Authentication error:', error);
    navigate('/', { replace: true });
  }, [navigate]);

  // Handle cleanup on unmount
  useEffect(() => {
    return () => {
      setIsProcessing(false);
    };
  }, []);

  return (
    <LoginCallBack 
      errorCallback={loginError} 
      successCallback={loginSuccess}
      customErrorComponent={<ErrorComponent />}
      customLoadingComponent={<LoadingComponent isProcessing={isProcessing} />}
    />
  );
};

export default RedirectPage;