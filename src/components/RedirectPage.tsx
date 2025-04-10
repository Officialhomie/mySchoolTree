// src/components/RedirectPage.tsx
import { useNavigate } from 'react-router-dom';
import { LoginCallBack, useOCAuth } from '@opencampus/ocid-connect-js';
import { useState } from 'react';

const RedirectPage = () => {
  const navigate = useNavigate();
  const { refreshUser } = useOCAuth();
  const [isProcessing, setIsProcessing] = useState(false);

  // Success callback - refreshes user data and then redirects to homepage
  const loginSuccess = async () => {
    try {
      console.log('Login successful, refreshing user data...');
      setIsProcessing(true);
      
      // Force a user data refresh to ensure all components have the latest data
      await refreshUser();
      
      // Short delay to ensure auth state propagates
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Always navigate to homepage
      navigate('/');
    } catch (error) {
      console.error('Error refreshing user data:', error);
      navigate('/');
    } finally {
      setIsProcessing(false);
    }
  };

  // Error callback - handles login errors
  const loginError = (error: any) => {
    console.error('Authentication error:', error);
    navigate('/');
  };

  // Custom loading component
  const CustomLoadingComponent = () => (
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
  );

  // Custom error component
  const CustomErrorComponent = () => {
    const { authState } = useOCAuth();
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center p-8 bg-gray-800 rounded-lg shadow-xl">
          <p className="text-xl text-red-500 mb-4">Login Error</p>
          <p className="text-gray-300">{authState.error?.message || 'An unknown error occurred'}</p>
          <button 
            onClick={() => navigate('/')}
            className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  };

  return (
    <LoginCallBack 
      errorCallback={loginError} 
      successCallback={loginSuccess}
      customErrorComponent={CustomErrorComponent}
      customLoadingComponent={CustomLoadingComponent}
    />
  );
};

export default RedirectPage;