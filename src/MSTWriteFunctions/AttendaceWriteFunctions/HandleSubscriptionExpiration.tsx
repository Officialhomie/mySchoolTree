import { useState, useEffect } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { motion } from 'framer-motion';

const SubscriptionExpirationHandler = ({ contract }: { contract: any }) => {
  // UI state
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState<'success' | 'error' | 'info' | 'warning'>('info');
  const [showStatus, setShowStatus] = useState(false);
  const [processingState, setProcessingState] = useState<'initial' | 'processing' | 'completed'>('initial');
  
  // Transaction state
  const { data: hash, isPending, writeContract, error: writeError, reset: resetWrite } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed, error: confirmError } = useWaitForTransactionReceipt({ hash });

  // Handle transaction success
  useEffect(() => {
    if (isConfirmed && hash) {
      setStatusMessage(`Subscription expirations handled successfully!`);
      setStatusType('success');
      setShowStatus(true);
      setProcessingState('completed');
    }
  }, [isConfirmed, hash]);

  // Handle transaction errors
  useEffect(() => {
    if (writeError || confirmError) {
      const errorMessage = writeError?.message || confirmError?.message || 'An unknown error occurred';
      setStatusMessage(`Transaction failed: ${errorMessage}`);
      setStatusType('error');
      setShowStatus(true);
      setProcessingState('initial');
    }
  }, [writeError, confirmError]);

  // Hide status message after a delay
  useEffect(() => {
    if (showStatus) {
      const timer = setTimeout(() => {
        setShowStatus(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showStatus]);

  // Handle the expiration process
  const handleExpirations = async () => {
    try {
      // Reset any previous errors
      resetWrite?.();
      
      // Update UI state
      setProcessingState('processing');
      setStatusMessage('Submitting transaction to handle subscription expirations...');
      setStatusType('info');
      setShowStatus(true);
      
      // Execute the contract write
      writeContract({
        ...contract,
        functionName: 'handleSubscriptionExpiration',
        args: []
      });
    } catch (err) {
      console.error('Error handling expirations:', err);
      setStatusMessage(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setStatusType('error');
      setShowStatus(true);
      setProcessingState('initial');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-gray-900/90 backdrop-blur-sm border border-gray-700 shadow-xl rounded-lg p-6 max-w-full mx-auto w-full md:max-w-full mb-9"
    >
      <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
        Subscription Expiration Handler
      </h2>
      
      <p className="text-gray-300 text-sm mb-6">
        Process expired subscriptions and update subscription status for all users.
      </p>

      {/* Status Messages */}
      {showStatus && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className={`p-3 rounded-md mb-6 ${
            statusType === 'success' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 
            statusType === 'error' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 
            statusType === 'warning' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
            'bg-blue-500/20 text-blue-400 border border-blue-500/30'
          }`}
        >
          <p className="text-sm">{statusMessage}</p>
          {hash && (
            <div className="mt-2 pt-2 border-t border-gray-700">
              <p className="text-xs">Transaction Hash:</p>
              <div className="flex items-center mt-1">
                <p className="text-xs font-mono truncate">{hash}</p>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(hash);
                    setStatusMessage('Transaction hash copied to clipboard!');
                    setStatusType('success');
                  }}
                  className="ml-2 p-1 bg-gray-800 hover:bg-gray-700 rounded text-gray-300"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                    <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Transaction Progress */}
      {(isPending || isConfirming) && (
        <div className="flex flex-col items-center justify-center p-4 border border-gray-700 rounded-md bg-gray-800/50 mb-6">
          <div className="flex items-center justify-center mb-3">
            <div className="w-8 h-8 border-4 border-t-blue-400 border-r-purple-500 border-b-blue-400 border-l-purple-500 rounded-full animate-spin mr-3"></div>
            <span className="text-gray-300">{isPending ? 'Waiting for wallet approval...' : 'Confirming transaction...'}</span>
          </div>
          <p className="text-xs text-gray-400 text-center">
            {isPending 
              ? 'Please confirm this transaction in your wallet' 
              : 'Transaction has been submitted. Waiting for blockchain confirmation...'}
          </p>
        </div>
      )}

      {/* Initial State */}
      {processingState === 'initial' && (
        <div className="space-y-6">
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <div className="flex items-start">
              <div className="flex-shrink-0 mt-0.5">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="ml-3 text-sm text-gray-300">
                This operation will scan all user subscriptions and process any that have expired. 
                It will update subscription statuses and trigger any necessary events or notifications.
              </p>
            </div>
          </div>
          
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-md p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0 mt-0.5">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-400">Important Note</h3>
                <p className="mt-1 text-sm text-gray-300">
                  This is an administrative function that should be run periodically to maintain system integrity.
                  Processing many expirations at once may require significant gas, so ensure your wallet has sufficient funds.
                </p>
              </div>
            </div>
          </div>
          
          {/* Action Button */}
          <motion.button
            onClick={handleExpirations}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={isPending || isConfirming}
            className={`w-full py-3 px-4 rounded-md text-white font-medium shadow-lg transition-all duration-300 ${
              'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700'
            } ${
              isPending || isConfirming ? 'opacity-70 cursor-not-allowed' : 'opacity-100'
            }`}
          >
            Process Expired Subscriptions
          </motion.button>
        </div>
      )}

      {/* Completed State */}
      {processingState === 'completed' && (
        <div className="space-y-6">
          <div className="bg-green-900/30 border border-green-700/50 rounded-md p-4 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto mb-2 text-green-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <h3 className="text-lg font-semibold text-green-400">Subscription Processing Complete</h3>
            <p className="text-sm text-gray-300 mt-2">
              All expired subscriptions have been successfully processed.
              User subscription statuses have been updated accordingly.
            </p>
          </div>
          
          {/* Transaction Details */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-md p-4">
            <h3 className="text-md font-semibold text-blue-400 mb-2">Transaction Details</h3>
            
            <div className="mt-3">
              <p className="text-sm text-gray-400 mb-1">Transaction Hash</p>
              <div className="flex items-center">
                <div className="font-mono text-xs bg-gray-800 p-2 rounded-md text-gray-300 overflow-x-auto max-w-full flex-1 break-all">
                  {hash}
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(hash || '');
                    setStatusMessage('Transaction hash copied to clipboard!');
                    setStatusType('success');
                    setShowStatus(true);
                  }}
                  className="ml-2 p-2 bg-gray-700 hover:bg-gray-600 rounded-md text-gray-300"
                  title="Copy to clipboard"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                    <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
          
          {/* Done Button */}
          <motion.button
            onClick={() => setProcessingState('initial')}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-3 px-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-medium rounded-md shadow-lg transition-all duration-300"
          >
            Process Again
          </motion.button>
        </div>
      )}
    </motion.div>
  );
};

export default SubscriptionExpirationHandler;