import { useState, useEffect } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { motion } from 'framer-motion';
import { ethers } from 'ethers';

type SubscriptionInfo = {
  isActive: boolean;
  expiresAt: number;
  price: string;
  currencySymbol: string;
};

const SubscriptionRenewer = ({ contract }: { contract: any }) => {
  // Subscription state
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo>({
    isActive: false,
    expiresAt: 0,
    price: '0.01',  // Default price - in a real app, this would come from contract data
    currencySymbol: 'ETH'
  });
  
  // UI state
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState<'success' | 'error' | 'info' | 'warning'>('info');
  const [showStatus, setShowStatus] = useState(false);
  const [processingState, setProcessingState] = useState<'initial' | 'submitting' | 'completed'>('initial');
  
  // Transaction state
  const { data: hash, isPending, writeContract, error: writeError, reset: resetWrite } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed, error: confirmError } = useWaitForTransactionReceipt({ hash });

  // Handle transaction success
  useEffect(() => {
    if (isConfirmed && hash) {
      setStatusMessage(`Subscription renewed successfully!`);
      setStatusType('success');
      setShowStatus(true);
      setProcessingState('completed');
      
      // Update subscription info
      const now = new Date();
      // In a real implementation, you would fetch the actual expiration date from the contract
      const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      
      setSubscriptionInfo(prev => ({
        ...prev,
        isActive: true,
        expiresAt: thirtyDaysLater.getTime()
      }));
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

  // Handle the subscription renewal
  const renewSubscription = async () => {
    try {
      // Reset any previous errors
      resetWrite?.();
      
      // Update UI state
      setProcessingState('submitting');
      setStatusMessage('Submitting subscription renewal...');
      setStatusType('info');
      setShowStatus(true);
      
      // Convert the price to wei
      const valueInWei = ethers.parseEther(subscriptionInfo.price);
      
      // Execute the contract write
      writeContract({
        ...contract,
        functionName: 'renewSubscription',
        args: [],
        value: valueInWei
      });
    } catch (err) {
      console.error('Error renewing subscription:', err);
      setStatusMessage(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setStatusType('error');
      setShowStatus(true);
      setProcessingState('initial');
    }
  };

  // Calculate days remaining in subscription
  const calculateDaysRemaining = (): number => {
    if (!subscriptionInfo.isActive) return 0;
    
    const now = new Date().getTime();
    const diff = subscriptionInfo.expiresAt - now;
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  // Format date for display
  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString();
  };

  // Return to initial state
  const handleDone = () => {
    setProcessingState('initial');
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-gray-900/90 backdrop-blur-sm border border-gray-700 shadow-xl rounded-lg p-6 max-w-full mx-auto w-full md:max-w-full mb-9"
    >
      <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
        Subscription Management
      </h2>
      
      <p className="text-gray-300 text-sm mb-6">
        Manage and renew your educational platform subscription.
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
          {/* Subscription Status Card */}
          <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 rounded-lg overflow-hidden border border-gray-700 shadow-md">
            <div className="p-5">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-1">Premium Subscription</h3>
                  <p className="text-sm text-gray-300">
                    Access to all educational content and features
                  </p>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                  subscriptionInfo.isActive 
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                    : 'bg-red-500/20 text-red-400 border border-red-500/30'
                }`}>
                  {subscriptionInfo.isActive ? 'Active' : 'Inactive'}
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-700">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-400">Subscription Fee</span>
                  <span className="text-sm font-medium text-white">
                    {subscriptionInfo.price} {subscriptionInfo.currencySymbol}
                  </span>
                </div>
                
                {subscriptionInfo.isActive && (
                  <>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-400">Expires On</span>
                      <span className="text-sm font-medium text-white">
                        {formatDate(subscriptionInfo.expiresAt)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">Days Remaining</span>
                      <span className={`text-sm font-medium ${
                        calculateDaysRemaining() < 5 ? 'text-red-400' : 'text-white'
                      }`}>
                        {calculateDaysRemaining()} days
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
            
            <div className="px-5 py-4 bg-gray-800/50 border-t border-gray-700">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-300">
                  {subscriptionInfo.isActive 
                    ? calculateDaysRemaining() < 5 
                      ? 'Your subscription expires soon!'
                      : 'Extend your subscription anytime'
                    : 'Subscribe to access premium features'
                  }
                </span>
                <motion.button
                  onClick={renewSubscription}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={isPending || isConfirming}
                  className={`py-2 px-4 rounded-md text-white text-sm font-medium shadow-sm transition-all duration-300 ${
                    'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700'
                  } ${
                    isPending || isConfirming ? 'opacity-70 cursor-not-allowed' : 'opacity-100'
                  }`}
                >
                  {subscriptionInfo.isActive ? 'Renew Subscription' : 'Subscribe Now'}
                </motion.button>
              </div>
            </div>
          </div>
          
          {/* Subscription Details */}
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <h3 className="text-md font-medium text-blue-400 mb-3">Subscription Benefits</h3>
            
            <ul className="space-y-2">
              <li className="flex items-start">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-400 flex-shrink-0 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-sm text-gray-300">Access to all educational courses and programs</span>
              </li>
              <li className="flex items-start">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-400 flex-shrink-0 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-sm text-gray-300">Submit assignments and receive feedback</span>
              </li>
              <li className="flex items-start">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-400 flex-shrink-0 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-sm text-gray-300">Earn certificates upon course completion</span>
              </li>
              <li className="flex items-start">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-400 flex-shrink-0 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-sm text-gray-300">Direct messaging with instructors</span>
              </li>
            </ul>
          </div>
          
          {/* Renewal Notes */}
          <div className="bg-blue-900/20 rounded-lg p-4 border border-blue-700/30">
            <div className="flex items-start">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400 flex-shrink-0 mr-2 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div>
                <h3 className="text-sm font-medium text-blue-400 mb-1">Subscription Information</h3>
                <p className="text-xs text-gray-300">
                  Subscriptions auto-renew by default. You may manually renew your subscription at any time to
                  extend your access period. Renewal payments are processed on-chain and require a small gas fee
                  in addition to the subscription price.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Completed State */}
      {processingState === 'completed' && (
        <div className="space-y-6">
          <div className="bg-green-900/30 border border-green-700/50 rounded-md p-4 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto mb-2 text-green-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <h3 className="text-lg font-semibold text-green-400">Subscription Renewed!</h3>
            <p className="text-sm text-gray-300 mt-2">
              Your subscription has been successfully renewed and is now active until{' '}
              <span className="text-white font-medium">{formatDate(subscriptionInfo.expiresAt)}</span>.
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
          
          {/* Subscription Summary */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-md p-4">
            <h3 className="text-md font-semibold text-blue-400 mb-3">Subscription Summary</h3>
            
            <dl className="grid grid-cols-1 gap-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-400">Subscription Type</dt>
                <dd className="text-white font-medium">Premium Subscription</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-400">Amount Paid</dt>
                <dd className="text-white font-medium">{subscriptionInfo.price} {subscriptionInfo.currencySymbol}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-400">Valid Until</dt>
                <dd className="text-white font-medium">{formatDate(subscriptionInfo.expiresAt)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-400">Status</dt>
                <dd className="text-green-400 font-medium">Active</dd>
              </div>
            </dl>
          </div>
          
          {/* What's Next */}
          <div className="bg-blue-900/20 border border-blue-700/30 rounded-md p-4">
            <h3 className="text-md font-semibold text-blue-400 mb-2">What's Next</h3>
            <ul className="space-y-2">
              <li className="flex items-start">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400 flex-shrink-0 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-sm text-gray-300">Explore available courses and programs</span>
              </li>
              <li className="flex items-start">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400 flex-shrink-0 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-sm text-gray-300">Enroll in new educational programs</span>
              </li>
              <li className="flex items-start">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400 flex-shrink-0 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-sm text-gray-300">Track your progress in the student dashboard</span>
              </li>
            </ul>
          </div>
          
          {/* Done Button */}
          <motion.button
            onClick={handleDone}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-3 px-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-medium rounded-md shadow-lg transition-all duration-300"
          >
            Back to Subscription Dashboard
          </motion.button>
        </div>
      )}
    </motion.div>
  );
};

export default SubscriptionRenewer;