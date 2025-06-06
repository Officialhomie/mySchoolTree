import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { motion } from 'framer-motion';

/**
 * EmergencyWithdraw Component
 * 
 * This component provides an interface for administrators to perform emergency withdrawals
 * of funds from the contract in case of critical situations.
 * 
 * The component includes:
 * - Detailed explanation of the emergency withdrawal purpose and implications
 * - Confirmation workflow to prevent accidental triggering
 * - Status feedback for transaction progress and result
 * - Visual indicators for each step of the process
 */
const EmergencyWithdraw = ({ contract }: { contract: any }) => {
  // Connected wallet account
  const { address: connectedAddress, isConnected } = useAccount();
  
  // UI state
  const [confirmationState, setConfirmationState] = useState<'initial' | 'confirm' | 'confirmed'>('initial');
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState<'success' | 'error' | 'info' | 'warning'>('info');
  const [showStatus, setShowStatus] = useState(false);
  
  // Transaction state
  const { data: hash, isPending, writeContract, error: writeError, reset: resetWrite } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed, error: confirmError } = useWaitForTransactionReceipt({ hash });

  // Handle transaction success
  useEffect(() => {
    if (isConfirmed && hash) {
      setStatusMessage('Emergency withdrawal completed successfully!');
      setStatusType('success');
      setShowStatus(true);
      setConfirmationState('confirmed');
    }
  }, [isConfirmed, hash]);

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

  // Initial request to withdraw
  const handleWithdrawRequest = () => {
    if (!isConnected) {
      setStatusMessage('Please connect your wallet to proceed');
      setStatusType('error');
      setShowStatus(true);
      return;
    }
    
    // Set to confirmation state
    setConfirmationState('confirm');
    
    setStatusMessage('You are about to execute an emergency withdrawal. This is only meant for critical situations.');
    setStatusType('warning');
    setShowStatus(true);
  };

  // Handle the actual withdrawal after confirmation
  const handleWithdrawConfirm = async () => {
    try {
      // Reset any previous errors
      resetWrite?.();
      
      // Execute the contract write
      writeContract({
        ...contract,
        functionName: 'emergencyWithdraw',
        args: []
      });
      
      setStatusMessage('Transaction submitted. Waiting for confirmation...');
      setStatusType('info');
      setShowStatus(true);
    } catch (err) {
      console.error('Error performing emergency withdrawal:', err);
      setStatusMessage(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setStatusType('error');
      setShowStatus(true);
      setConfirmationState('initial');
    }
  };

  // Cancel the withdrawal request
  const handleCancel = () => {
    setConfirmationState('initial');
    setStatusMessage('Emergency withdrawal cancelled');
    setStatusType('info');
    setShowStatus(true);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-gray-900/90 backdrop-blur-sm border border-gray-700 shadow-xl rounded-lg p-6 max-w-full mx-auto w-full md:max-w-full mb-9"
    >
      <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-red-400 to-orange-500 bg-clip-text text-transparent">
        Emergency Withdraw
      </h2>
      
      <p className="text-gray-300 text-sm mb-6">
        This function allows administrators to withdraw all funds from the contract in emergency situations.
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
            <div className="w-8 h-8 border-4 border-t-red-400 border-r-orange-500 border-b-red-400 border-l-orange-500 rounded-full animate-spin mr-3"></div>
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
          <div className="bg-red-900/30 border border-red-800/50 rounded-lg p-4">
            <h3 className="text-lg font-medium text-red-400 mb-3">Emergency Use Only</h3>
            <p className="text-sm text-gray-300">
              The emergency withdrawal function should only be used in critical situations where immediate access to funds is necessary. This operation:
            </p>
            <ul className="list-disc pl-5 mt-3 space-y-1 text-sm text-gray-300">
              <li>Withdraws all available funds from the contract</li>
              <li>Bypasses normal withdrawal restrictions and limits</li>
              <li>Sends funds to the contract administrator</li>
              <li>Cannot be reversed once executed</li>
            </ul>
            <p className="mt-3 text-sm font-medium text-yellow-500">
              Warning: Using this function may disrupt normal contract operations and should only be used in genuine emergency situations.
            </p>
          </div>
          
          {/* Action Button */}
          <motion.button
            onClick={handleWithdrawRequest}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={isPending || isConfirming || !isConnected}
            className={`w-full py-3 px-4 rounded-md text-white font-medium shadow-lg transition-all duration-300 
              bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700
              ${(isPending || isConfirming || !isConnected) ? 'opacity-70 cursor-not-allowed' : 'opacity-100'}
            `}
          >
            Initiate Emergency Withdrawal
          </motion.button>
          
          {!isConnected && (
            <p className="text-center text-sm text-red-400">
              Please connect your wallet to use this function
            </p>
          )}
        </div>
      )}

      {/* Confirmation Dialog */}
      {confirmationState === 'confirm' && (
        <div className="space-y-6">
          <div className="bg-red-900/30 border border-red-800/50 rounded-md p-4">
            <h3 className="text-lg font-semibold text-red-400 mb-3">Confirm Emergency Withdrawal</h3>
            
            <div className="bg-gray-800/50 rounded-md p-3 mb-4">
              <p className="text-sm text-gray-300">
                You are about to execute an emergency withdrawal that will transfer all available funds from the contract to the administrator address.
              </p>
            </div>
            
            <div className="bg-gray-800/50 rounded-md p-3 mb-4">
              <h4 className="text-md font-medium text-orange-300 mb-2">Connected Wallet</h4>
              <p className="text-sm font-mono text-gray-300 break-all">{connectedAddress}</p>
            </div>
            
            {/* Warning Message */}
            <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-md">
              <p className="text-sm text-red-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline-block mr-1 mb-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <strong>Caution:</strong> This action cannot be undone and will withdraw all available funds. It should only be used in genuine emergencies. Normal contract operations may be disrupted after this action.
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
              onClick={handleWithdrawConfirm}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={isPending || isConfirming}
              className={`flex-1 py-2 px-4 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors duration-300 ${
                isPending || isConfirming ? 'opacity-70 cursor-not-allowed' : 'opacity-100'
              }`}
            >
              {isPending 
                ? 'Submitting...' 
                : isConfirming 
                  ? 'Confirming...' 
                  : 'Confirm Emergency Withdrawal'
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
            <h3 className="text-lg font-semibold text-green-400">Emergency Withdrawal Successful</h3>
            <p className="text-sm text-gray-300 mt-2">
              All available funds have been successfully withdrawn from the contract.
            </p>
          </div>
          
          {/* Transaction Details */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-md p-4">
            <h3 className="text-md font-semibold text-blue-400 mb-2">Transaction Details</h3>
            
            <div>
              <p className="text-sm text-gray-400 mb-1">Withdrawal Address</p>
              <div className="font-mono text-sm bg-gray-800 p-2 rounded-md text-gray-300 break-all">
                {connectedAddress}
              </div>
            </div>
            
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
          
          {/* Next Steps */}
          <div className="bg-yellow-900/20 border border-yellow-700/30 rounded-md p-4">
            <h3 className="text-md font-semibold text-yellow-400 mb-2">Important Notice</h3>
            <p className="text-sm text-gray-300">
              The emergency withdrawal has been completed. Normal contract operations may now be disrupted. Contact the system administrator or development team to address the emergency situation and restore normal functionality.
            </p>
          </div>
          
          {/* Done Button */}
          <motion.button
            onClick={() => window.location.reload()}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium rounded-md shadow-lg transition-all duration-300"
          >
            Done
          </motion.button>
        </div>
      )}
    </motion.div>
  );
};

export default EmergencyWithdraw;