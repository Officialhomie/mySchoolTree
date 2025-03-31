import { useState, useEffect } from 'react';
import { useAccount, useBalance, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { motion } from 'framer-motion';
import { ethers } from 'ethers';

/**
 * SubscriptionRenewal Component
 * 
 * This component provides a user-friendly interface for students or members
 * to renew their subscription to educational services. The component handles
 * payment processing and provides clear feedback throughout the renewal process.
 * 
 * Key features:
 * - Current subscription status display
 * - Renewal cost information
 * - Payment handling via blockchain transaction
 * - Renewal confirmation and receipt
 * - Detailed transaction tracking
 */
const SubscriptionRenewal = ({ contract }: { contract: any }) => {
  // Connected wallet account
  const { address: connectedAddress, isConnected } = useAccount();
  
  // Get wallet balance
  const { data: balanceData } = useBalance({
    address: connectedAddress,
  });
  
  // State for subscription info
  const [subscriptionInfo, setSubscriptionInfo] = useState<{
    isActive: boolean;
    expirationDate: Date | null;
    renewalCost: string;
  }>({
    isActive: false,
    expirationDate: null,
    renewalCost: '0',
  });
  
  // UI state
  const [confirmationState, setConfirmationState] = useState<'initial' | 'confirm' | 'confirmed'>('initial');
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState<'success' | 'error' | 'info' | 'warning'>('info');
  const [showStatus, setShowStatus] = useState(false);
  
  // Transaction state
  const { data: hash, isPending, writeContract, error: writeError, reset: resetWrite } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed, error: confirmError } = useWaitForTransactionReceipt({ hash });

  // Read user's subscription info
  const { data: subscriptionData, refetch: refetchSubscription } = useReadContract({
    ...contract,
    functionName: 'getSubscriptionInfo', // Assuming this function exists to get subscription info
    args: [connectedAddress],
    enabled: isConnected,
  });

  // Read renewal cost
  const { data: costData } = useReadContract({
    ...contract,
    functionName: 'getSubscriptionRenewalCost', // Assuming this function exists to get renewal cost
    args: [],
    enabled: isConnected,
  });

  // Format a date for display
  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp * 1000); // Convert seconds to milliseconds
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  // Calculate days remaining in subscription
  const getDaysRemaining = (expirationTimestamp: number): number => {
    const now = Math.floor(Date.now() / 1000); // Current time in seconds
    const secondsRemaining = Math.max(0, expirationTimestamp - now);
    return Math.ceil(secondsRemaining / (60 * 60 * 24)); // Convert seconds to days
  };

  // Update subscription info when data is fetched
  useEffect(() => {
    if (subscriptionData && costData) {
      const { active, expirationTimestamp } = subscriptionData as { active: boolean; expirationTimestamp: number };
      const renewalCost = costData as string;
      
      setSubscriptionInfo({
        isActive: active,
        expirationDate: expirationTimestamp > 0 ? new Date(expirationTimestamp * 1000) : null,
        renewalCost: renewalCost,
      });
    }
  }, [subscriptionData, costData]);

  // Check if user has sufficient balance
  const hasSufficientBalance = (): boolean => {
    if (!balanceData || !subscriptionInfo.renewalCost) return false;
    
    const balance = ethers.parseEther(balanceData.formatted);
    const cost = ethers.parseEther(ethers.formatEther(subscriptionInfo.renewalCost));
    
    return balance >= cost;
  };

  // Handle transaction success
  useEffect(() => {
    if (isConfirmed && hash) {
      setStatusMessage('Subscription renewed successfully!');
      setStatusType('success');
      setShowStatus(true);
      setConfirmationState('confirmed');
      
      // Refresh subscription data
      refetchSubscription();
    }
  }, [isConfirmed, hash, refetchSubscription]);

  // Handle transaction errors
  useEffect(() => {
    if (writeError || confirmError) {
      const errorMessage = writeError?.message || confirmError?.message || 'An unknown error occurred';
      setStatusMessage(`Transaction failed: ${errorMessage}`);
      setStatusType('error');
      setShowStatus(true);
      setConfirmationState('initial');
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

  // Initial request to renew subscription
  const handleRenewalRequest = () => {
    if (!isConnected) {
      setStatusMessage('Please connect your wallet to proceed');
      setStatusType('error');
      setShowStatus(true);
      return;
    }
    
    if (!hasSufficientBalance()) {
      setStatusMessage('Insufficient balance in your wallet for renewal');
      setStatusType('error');
      setShowStatus(true);
      return;
    }
    
    // Set to confirmation state
    setConfirmationState('confirm');
    
    setStatusMessage('You are about to renew your subscription. Please review the details and confirm.');
    setStatusType('info');
    setShowStatus(true);
  };

  // Handle the actual renewal after confirmation
  const handleRenewalConfirm = async () => {
    try {
      // Reset any previous errors
      resetWrite?.();
      
      // Execute the contract write
      writeContract({
        ...contract,
        functionName: 'renewSubscription',
        args: [],
        value: BigInt(subscriptionInfo.renewalCost),
      });
      
      setStatusMessage('Transaction submitted. Waiting for confirmation...');
      setStatusType('info');
      setShowStatus(true);
    } catch (err) {
      console.error('Error renewing subscription:', err);
      setStatusMessage(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setStatusType('error');
      setShowStatus(true);
      setConfirmationState('initial');
    }
  };

  // Cancel the renewal request
  const handleCancel = () => {
    setConfirmationState('initial');
    setStatusMessage('Renewal cancelled');
    setStatusType('info');
    setShowStatus(true);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-gray-900/90 backdrop-blur-sm border border-gray-700 shadow-xl rounded-lg p-6 max-w-full mx-auto w-full md:max-w-2xl mb-9"
    >
      <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
        Subscription Renewal
      </h2>
      
      <p className="text-gray-300 text-sm mb-6">
        Renew your subscription to maintain access to all educational resources and services.
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

      {/* Form Content - Initial State */}
      {confirmationState === 'initial' && (
        <div className="space-y-6">
          {/* Current Subscription Status */}
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <h3 className="text-lg font-medium mb-3 text-blue-400">Current Subscription Status</h3>
            
            <div className="flex flex-col space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Status:</span>
                {subscriptionInfo.isActive ? (
                  <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-md">Active</span>
                ) : (
                  <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-md">Inactive</span>
                )}
              </div>
              
              {subscriptionInfo.expirationDate && (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Expires on:</span>
                    <span className="text-sm text-gray-300">{formatDate(subscriptionInfo.expirationDate.getTime() / 1000)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Days remaining:</span>
                    <span className={`text-sm ${
                      getDaysRemaining(subscriptionInfo.expirationDate.getTime() / 1000) > 7 
                        ? 'text-green-400' 
                        : getDaysRemaining(subscriptionInfo.expirationDate.getTime() / 1000) > 3
                          ? 'text-yellow-400'
                          : 'text-red-400'
                    }`}>
                      {getDaysRemaining(subscriptionInfo.expirationDate.getTime() / 1000)} days
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
          
          {/* Renewal Information */}
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <h3 className="text-lg font-medium mb-3 text-blue-400">Renewal Information</h3>
            
            <div className="flex flex-col space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Renewal cost:</span>
                <span className="text-sm font-medium text-gray-200">
                  {ethers.formatEther(subscriptionInfo.renewalCost)} ETH
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Your balance:</span>
                <span className={`text-sm font-medium ${
                  hasSufficientBalance() ? 'text-green-400' : 'text-red-400'
                }`}>
                  {balanceData ? balanceData.formatted : '0'} ETH
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">New expiration:</span>
                <span className="text-sm text-gray-300">
                  {subscriptionInfo.expirationDate
                    // Add 30 days to current expiration, or from now if expired
                    ? (() => {
                        const now = Math.floor(Date.now() / 1000);
                        const currentExpiry = Math.floor(subscriptionInfo.expirationDate.getTime() / 1000);
                        const baseDate = currentExpiry > now ? currentExpiry : now;
                        return formatDate(baseDate + (30 * 24 * 60 * 60)); // Add 30 days in seconds
                      })()
                    : 'N/A'
                  }
                </span>
              </div>
            </div>
          </div>
          
          {/* Benefits Reminder */}
          <div className="bg-indigo-900/20 border border-indigo-700/30 rounded-md p-4">
            <h3 className="text-md font-semibold text-indigo-400 mb-2">Subscription Benefits</h3>
            <ul className="space-y-2 text-sm text-gray-300">
              <li className="flex items-start">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-indigo-400 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Full access to all courses and educational materials</span>
              </li>
              <li className="flex items-start">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-indigo-400 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Instructor support and community forum participation</span>
              </li>
              <li className="flex items-start">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-indigo-400 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Certificate issuance upon course completion</span>
              </li>
              <li className="flex items-start">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-indigo-400 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Exclusive access to workshops and special events</span>
              </li>
            </ul>
          </div>
          
          {/* Action Button */}
          <motion.button
            onClick={handleRenewalRequest}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={isPending || isConfirming || !isConnected || !hasSufficientBalance()}
            className={`w-full py-3 px-4 rounded-md text-white font-medium shadow-lg transition-all duration-300 
              bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700
              ${(isPending || isConfirming || !isConnected || !hasSufficientBalance()) ? 'opacity-70 cursor-not-allowed' : 'opacity-100'}
            `}
          >
            Renew Subscription
          </motion.button>
          
          {!isConnected && (
            <p className="text-center text-sm text-red-400">
              Please connect your wallet to renew your subscription
            </p>
          )}
          
          {isConnected && !hasSufficientBalance() && (
            <p className="text-center text-sm text-red-400">
              Insufficient balance for renewal. Please add more funds to your wallet.
            </p>
          )}
        </div>
      )}

      {/* Confirmation Dialog */}
      {confirmationState === 'confirm' && (
        <div className="space-y-6">
          <div className="bg-blue-900/30 border border-blue-700/50 rounded-md p-4">
            <h3 className="text-lg font-semibold text-blue-400 mb-3">Confirm Subscription Renewal</h3>
            
            <div className="space-y-4">
              <div className="bg-gray-800/50 rounded-md p-3">
                <h4 className="text-md font-medium text-blue-300 mb-2">Renewal Details</h4>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Amount:</span>
                    <span className="text-sm font-medium text-gray-200">{ethers.formatEther(subscriptionInfo.renewalCost)} ETH</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Duration:</span>
                    <span className="text-sm text-gray-300">30 days</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">New expiration:</span>
                    <span className="text-sm text-gray-300">
                      {subscriptionInfo.expirationDate
                        ? (() => {
                            const now = Math.floor(Date.now() / 1000);
                            const currentExpiry = Math.floor(subscriptionInfo.expirationDate.getTime() / 1000);
                            const baseDate = currentExpiry > now ? currentExpiry : now;
                            return formatDate(baseDate + (30 * 24 * 60 * 60)); // Add 30 days in seconds
                          })()
                        : 'N/A'
                      }
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-800/50 rounded-md p-3">
                <h4 className="text-md font-medium text-blue-300 mb-2">Payment Information</h4>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">From wallet:</span>
                    <span className="text-sm font-mono text-gray-300">{connectedAddress?.slice(0, 6)}...{connectedAddress?.slice(-4)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Current balance:</span>
                    <span className="text-sm text-gray-300">{balanceData ? balanceData.formatted : '0'} ETH</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Balance after:</span>
                    <span className="text-sm text-gray-300">
                      {balanceData 
                        ? (parseFloat(balanceData.formatted) - parseFloat(ethers.formatEther(subscriptionInfo.renewalCost))).toFixed(6)
                        : '0'
                      } ETH
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Info Message */}
            <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-md">
              <p className="text-sm text-blue-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline-block mr-1 mb-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                By proceeding with this transaction, you are renewing your subscription for 30 days. Your subscription will be active immediately after transaction confirmation.
              </p>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex space-x-3">
            <motion.button
              onClick={handleCancel}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex-1 py-2 px-4 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-md transition-colors duration-300"
            >
              Cancel
            </motion.button>
            
            <motion.button
              onClick={handleRenewalConfirm}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={isPending || isConfirming}
              className={`flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors duration-300 ${
                isPending || isConfirming ? 'opacity-70 cursor-not-allowed' : 'opacity-100'
              }`}
            >
              {isPending 
                ? 'Submitting...' 
                : isConfirming 
                  ? 'Confirming...' 
                  : 'Confirm Payment & Renew'
              }
            </motion.button>
          </div>
        </div>
      )}
      
      {/* Success State */}
      {confirmationState === 'confirmed' && (
        <div className="space-y-6">
          <div className="bg-green-900/30 border border-green-700/50 rounded-md p-4 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto mb-2 text-green-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <h3 className="text-lg font-semibold text-green-400">Subscription Renewed!</h3>
            <p className="text-sm text-gray-300 mt-2">
              Your subscription has been successfully renewed and is now active. You can continue enjoying all platform services and educational content.
            </p>
          </div>
          
          {/* Updated Subscription Details */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-md p-4">
            <h3 className="text-md font-semibold text-blue-400 mb-2">Updated Subscription</h3>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Status:</span>
                <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-md">Active</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">New expiration:</span>
                <span className="text-sm text-gray-300">
                  {subscriptionInfo.expirationDate
                    ? (() => {
                        const now = Math.floor(Date.now() / 1000);
                        const currentExpiry = Math.floor(subscriptionInfo.expirationDate.getTime() / 1000);
                        const baseDate = currentExpiry > now ? currentExpiry : now;
                        return formatDate(baseDate + (30 * 24 * 60 * 60)); // Add 30 days in seconds
                      })()
                    : 'N/A'
                  }
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Amount paid:</span>
                <span className="text-sm text-gray-300">{ethers.formatEther(subscriptionInfo.renewalCost)} ETH</span>
              </div>
            </div>
          </div>
          
          {/* Transaction Details */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-md p-4">
            <h3 className="text-md font-semibold text-blue-400 mb-2">Transaction Details</h3>
            
            <div className="mt-1">
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
          
          {/* Next Steps */}
          <div className="bg-blue-900/20 border border-blue-700/30 rounded-md p-4">
            <h3 className="text-md font-semibold text-blue-400 mb-2">What's Next?</h3>
            <p className="text-sm text-gray-300">
              With your subscription renewed, you can continue your learning journey without interruption. Here are some suggestions:
            </p>
            <ul className="mt-2 space-y-2 text-sm text-gray-300">
              <li className="flex items-start">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-400 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Continue your ongoing courses where you left off</span>
              </li>
              <li className="flex items-start">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-400 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Explore newly added courses in your areas of interest</span>
              </li>
              <li className="flex items-start">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-400 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Download your course certificates for completed programs</span>
              </li>
              <li className="flex items-start">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-400 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Connect with instructors and fellow students in the community forums</span>
              </li>
            </ul>
          </div>
          
          {/* Done Button */}
          <motion.button
            onClick={() => window.location.reload()}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-3 px-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-medium rounded-md shadow-lg transition-all duration-300"
          >
            Return to Dashboard
          </motion.button>
          
          {/* Auto-renewal Information */}
          <div className="p-3 bg-gray-800/30 border border-gray-700 rounded-md mt-4">
            <p className="text-xs text-gray-400 flex items-start">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 flex-shrink-0 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <span>
                Automatic renewals are not currently enabled. To maintain continuous access, remember to manually renew your subscription before it expires.
              </span>
            </p>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default SubscriptionRenewal;