import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { motion } from 'framer-motion';

/**
 * ContractRecovery Component
 * 
 * This component provides an interface for system administrators to recover a contract
 * that may be in an emergency or locked state. Contract recovery is a critical administrative
 * function that should only be accessible to authorized personnel and used in specific
 * scenarios when normal operation is disrupted.
 * 
 * Key features:
 * - Clear explanation of the recovery process and its implications
 * - Authorization verification
 * - Multi-step confirmation to prevent accidental activation
 * - Detailed feedback on recovery progress and completion
 * - Post-recovery guidance
 */
const ContractRecovery = ({ contract }: { contract: any }) => {
  // Connected wallet account
  const { address: connectedAddress, isConnected } = useAccount();
  
  // Recovery state and authorization
  const [isInRecoveryMode, setIsInRecoveryMode] = useState<boolean>(false);
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  
  // UI state
  const [confirmationState, setConfirmationState] = useState<'initial' | 'confirm' | 'confirmed'>('initial');
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState<'success' | 'error' | 'info' | 'warning'>('info');
  const [showStatus, setShowStatus] = useState(false);
  
  // Transaction state
  const { data: hash, isPending, writeContract, error: writeError, reset: resetWrite } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed, error: confirmError } = useWaitForTransactionReceipt({ hash });

  // Check if contract is in recovery mode
  const { data: recoveryModeData, refetch: refetchRecoveryMode } = useReadContract({
    ...contract,
    functionName: 'isInRecoveryMode', // Assuming this function exists
    args: [],
    enabled: isConnected,
  });

  // Check if connected address is authorized to recover
  const { data: authorizedData } = useReadContract({
    ...contract,
    functionName: 'canRecover', // Assuming this function exists
    args: [connectedAddress],
    enabled: isConnected && !!connectedAddress,
  });

  // Update recovery state when data is fetched
  useEffect(() => {
    if (recoveryModeData !== undefined) {
      setIsInRecoveryMode(recoveryModeData as boolean);
    }
  }, [recoveryModeData]);

  // Update authorization when data is fetched
  useEffect(() => {
    if (authorizedData !== undefined) {
      setIsAuthorized(authorizedData as boolean);
    }
  }, [authorizedData, connectedAddress]);

  // Handle transaction success
  useEffect(() => {
    if (isConfirmed && hash) {
      setStatusMessage('Contract recovery completed successfully!');
      setStatusType('success');
      setShowStatus(true);
      setConfirmationState('confirmed');
      
      // Refresh contract state
      refetchRecoveryMode();
    }
  }, [isConfirmed, hash, refetchRecoveryMode]);

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

  // Initial request to recover contract
  const handleRecoveryRequest = () => {
    if (!isConnected) {
      setStatusMessage('Please connect your wallet to proceed');
      setStatusType('error');
      setShowStatus(true);
      return;
    }
    
    if (!isAuthorized) {
      setStatusMessage('Your wallet is not authorized to perform contract recovery');
      setStatusType('error');
      setShowStatus(true);
      return;
    }
    
    // Set to confirmation state
    setConfirmationState('confirm');
    
    setStatusMessage('You are about to recover the contract from an emergency state. Please review the implications and confirm.');
    setStatusType('warning');
    setShowStatus(true);
  };

  // Handle the actual recovery after confirmation
  const handleRecoveryConfirm = async () => {
    try {
      // Reset any previous errors
      resetWrite?.();
      
      // Execute the contract write
      writeContract({
        ...contract,
        functionName: 'recoverContract',
        args: []
      });
      
      setStatusMessage('Transaction submitted. Waiting for confirmation...');
      setStatusType('info');
      setShowStatus(true);
    } catch (err) {
      console.error('Error recovering contract:', err);
      setStatusMessage(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setStatusType('error');
      setShowStatus(true);
      setConfirmationState('initial');
    }
  };

  // Cancel the recovery request
  const handleCancel = () => {
    setConfirmationState('initial');
    setStatusMessage('Recovery cancelled');
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
      <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-amber-400 to-red-500 bg-clip-text text-transparent">
        Contract Recovery
      </h2>
      
      <p className="text-gray-300 text-sm mb-6">
        This specialized administrative function allows for the recovery of the contract from an emergency or locked state.
        Only authorized administrators should use this function.
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
            <div className="w-8 h-8 border-4 border-t-amber-400 border-r-red-500 border-b-amber-400 border-l-red-500 rounded-full animate-spin mr-3"></div>
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
          {/* Current Contract Status */}
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <h3 className="text-lg font-medium mb-3 text-amber-400">Contract Status</h3>
            
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm text-gray-400">Recovery Mode:</span>
              {isInRecoveryMode ? (
                <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-md">Active</span>
              ) : (
                <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-md">Inactive</span>
              )}
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Your Authorization:</span>
              {isAuthorized ? (
                <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-md">Authorized</span>
              ) : (
                <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-md">Unauthorized</span>
              )}
            </div>
          </div>
          
          {/* Recovery Information */}
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <h3 className="text-lg font-medium mb-3 text-amber-400">About Contract Recovery</h3>
            
            <p className="text-sm text-gray-300 mb-4">
              Contract recovery is a safety mechanism designed to restore normal operation when the contract is in an emergency or locked state.
              This function should only be used in specific scenarios where normal operation has been disrupted.
            </p>
            
            <div className="space-y-4">
              <div>
                <h4 className="text-md font-medium text-gray-200 mb-2">When to Use Recovery</h4>
                <ul className="list-disc pl-5 space-y-1 text-sm text-gray-300">
                  <li>After an emergency withdrawal to restore normal functions</li>
                  <li>When administrative functions are locked due to a bug or exploit</li>
                  <li>Following a security incident to reset contract state</li>
                  <li>When directed by the development team to address system issues</li>
                </ul>
              </div>
              
              <div>
                <h4 className="text-md font-medium text-gray-200 mb-2">Recovery Process</h4>
                <ul className="list-disc pl-5 space-y-1 text-sm text-gray-300">
                  <li>Verification of administrator credentials</li>
                  <li>Execution of recovery function through a secure transaction</li>
                  <li>Reset of emergency flags and locked states</li>
                  <li>Restoration of normal contract operations</li>
                  <li>Event log generation for auditing purposes</li>
                </ul>
              </div>
            </div>
          </div>
          
          {/* Security Warning */}
          <div className="bg-red-900/20 border border-red-800/30 rounded-md p-4">
            <h3 className="text-md font-semibold text-red-400 mb-2">Important Security Notice</h3>
            <p className="text-sm text-gray-300">
              Contract recovery should be performed with extreme caution. This action will reset emergency states and potentially impact ongoing transactions. Before proceeding, ensure you understand the current state of the system and the implications of recovery.
            </p>
            <p className="text-sm text-red-400 mt-2">
              Unauthorized recovery attempts will be rejected by the contract.
            </p>
          </div>
          
          {/* Action Button */}
          <motion.button
            onClick={handleRecoveryRequest}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={isPending || isConfirming || !isConnected || !isAuthorized}
            className={`w-full py-3 px-4 rounded-md text-white font-medium shadow-lg transition-all duration-300 
              bg-gradient-to-r from-amber-500 to-red-600 hover:from-amber-600 hover:to-red-700
              ${(isPending || isConfirming || !isConnected || !isAuthorized) ? 'opacity-70 cursor-not-allowed' : 'opacity-100'}
            `}
          >
            Initiate Contract Recovery
          </motion.button>
          
          {!isConnected && (
            <p className="text-center text-sm text-red-400">
              Please connect your wallet to proceed
            </p>
          )}
          
          {isConnected && !isAuthorized && (
            <p className="text-center text-sm text-red-400">
              Your wallet is not authorized to perform contract recovery
            </p>
          )}
        </div>
      )}

      {/* Confirmation Dialog */}
      {confirmationState === 'confirm' && (
        <div className="space-y-6">
          <div className="bg-amber-900/30 border border-amber-700/50 rounded-md p-4">
            <h3 className="text-lg font-semibold text-amber-400 mb-3">Confirm Contract Recovery</h3>
            
            <div className="space-y-4">
              <div className="bg-gray-800/50 rounded-md p-3">
                <h4 className="text-md font-medium text-amber-300 mb-2">Recovery Operation</h4>
                
                <p className="text-sm text-gray-300">
                  You are about to execute the contract recovery function. This will:
                </p>
                <ul className="list-disc pl-5 mt-2 space-y-1 text-sm text-gray-300">
                  <li>Reset all emergency flags in the contract</li>
                  <li>Restore normal operation of contract functions</li>
                  <li>Re-enable regular administrative capabilities</li>
                  <li>Generate recovery event logs for audit purposes</li>
                </ul>
              </div>
              
              <div className="bg-gray-800/50 rounded-md p-3">
                <h4 className="text-md font-medium text-amber-300 mb-2">Administrator Information</h4>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Admin Address:</span>
                    <span className="text-sm font-mono text-gray-300">{connectedAddress}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Authorization:</span>
                    <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-md">Verified</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Warning Message */}
            <div className="mt-4 p-3 bg-red-500/20 border border-red-500/30 rounded-md">
              <p className="text-sm text-red-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline-block mr-1 mb-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <strong>Caution:</strong> Recovery should only be performed when the contract is in an emergency state or when normal operations are disrupted. This action will be logged and cannot be reversed. Make sure you understand the implications before proceeding.
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
              onClick={handleRecoveryConfirm}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={isPending || isConfirming}
              className={`flex-1 py-2 px-4 bg-amber-600 hover:bg-amber-700 text-white rounded-md transition-colors duration-300 ${
                isPending || isConfirming ? 'opacity-70 cursor-not-allowed' : 'opacity-100'
              }`}
            >
              {isPending 
                ? 'Submitting...' 
                : isConfirming 
                  ? 'Confirming...' 
                  : 'Confirm Recovery'
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
            <h3 className="text-lg font-semibold text-green-400">Recovery Successful!</h3>
            <p className="text-sm text-gray-300 mt-2">
              The contract has been successfully recovered and normal operations have been restored. All emergency flags have been reset.
            </p>
          </div>
          
          {/* Updated Contract Status */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-md p-4">
            <h3 className="text-md font-semibold text-blue-400 mb-2">Updated Contract Status</h3>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Recovery Mode:</span>
                <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-md">Inactive</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Normal Operations:</span>
                <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-md">Restored</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">System Functions:</span>
                <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-md">Enabled</span>
              </div>
            </div>
          </div>
          
          {/* Transaction Details */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-md p-4">
            <h3 className="text-md font-semibold text-blue-400 mb-2">Transaction Details</h3>
            
            <div>
              <p className="text-sm text-gray-400 mb-1">Recovery Performed By</p>
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
          <div className="bg-blue-900/20 border border-blue-700/30 rounded-md p-4">
            <h3 className="text-md font-semibold text-blue-400 mb-2">Recommended Next Steps</h3>
            <p className="text-sm text-gray-300">
              Now that the contract has been recovered, it's important to perform these follow-up actions:
            </p>
            <ul className="mt-2 space-y-2 text-sm text-gray-300">
              <li className="flex items-start">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-400 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Verify all system functions are working correctly</span>
              </li>
              <li className="flex items-start">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-400 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Check user permissions and role assignments</span>
              </li>
              <li className="flex items-start">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-400 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Review system logs to understand what triggered the emergency state</span>
              </li>
              <li className="flex items-start">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-400 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Implement any necessary security improvements or patches</span>
              </li>
              <li className="flex items-start">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-400 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Notify stakeholders that the system has been restored</span>
              </li>
            </ul>
          </div>
          
          {/* Recovery Documentation */}
          <div className="bg-amber-900/20 border border-amber-700/30 rounded-md p-4">
            <h3 className="text-md font-semibold text-amber-400 mb-2">Important Documentation Notice</h3>
            <p className="text-sm text-gray-300">
              For audit and governance purposes, please document the following information about this recovery:
            </p>
            <ul className="mt-2 space-y-1 text-sm text-gray-300 list-disc pl-5">
              <li>Date and time of recovery</li>
              <li>Reason for entering recovery mode</li>
              <li>Steps taken before recovery</li>
              <li>Transaction ID (copied above)</li>
              <li>Any observations about system state after recovery</li>
            </ul>
            <p className="mt-2 text-sm text-gray-300">
              This documentation should be securely stored with other administrative records.
            </p>
          </div>
          
          {/* Done Button */}
          <motion.button
            onClick={() => window.location.reload()}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-3 px-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-medium rounded-md shadow-lg transition-all duration-300"
          >
            Return to Administration Panel
          </motion.button>
        </div>
      )}
    </motion.div>
  );
};

export default ContractRecovery;