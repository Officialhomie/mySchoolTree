import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { motion, AnimatePresence } from 'framer-motion';

interface TeacherRemovalProps {
  contract: {
    address: `0x${string}`;
    abi: any[];
  };
  onRemovalComplete?: (teacherAddress: string, success: boolean) => void;
  onRemovalStart?: (teacherAddress: string) => void;
}

export const TeacherRemoval = ({ 
  contract, 
  onRemovalComplete,
  onRemovalStart 
}: TeacherRemovalProps) => {
  // State variables
  const [teacherAddress, setTeacherAddress] = useState<string>('');
  const [isValidAddress, setIsValidAddress] = useState<boolean>(false);
  const [confirmationStep, setConfirmationStep] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [removalHistory, setRemovalHistory] = useState<Array<{
    address: string;
    timestamp: Date;
    success: boolean;
  }>>([]);
  const [showHistory, setShowHistory] = useState<boolean>(false);

  // Get current user's address
  const { isConnected } = useAccount();

  // Contract write hook for removing a teacher
  const { 
    writeContract,
    isPending: isWritePending,
    data: txHash,
    error: writeError,
    reset: resetWrite
  } = useWriteContract();

  // Hook to wait for transaction receipt
  const { 
    isLoading: isConfirming,
    isSuccess,
    isError: isConfirmError,
    error: confirmError
  } = useWaitForTransactionReceipt({ 
    hash: txHash,
    confirmations: 1
  });

  // Validate Ethereum address format
  useEffect(() => {
    const isValid = /^0x[a-fA-F0-9]{40}$/.test(teacherAddress);
    setIsValidAddress(isValid);
    
    // Reset confirmation step when address changes
    if (confirmationStep) {
      setConfirmationStep(false);
    }
    
    // Reset any error messages when address changes
    if (errorMessage) {
      setErrorMessage('');
    }
  }, [teacherAddress, confirmationStep, errorMessage]);

  // Handle write contract errors
  useEffect(() => {
    if (writeError) {
      console.error('Error removing teacher:', writeError);
      setErrorMessage(writeError instanceof Error ? writeError.message : 'Failed to remove teacher');
      setConfirmationStep(false);
    }
  }, [writeError]);

  // Handle confirm transaction errors
  useEffect(() => {
    if (isConfirmError && confirmError) {
      console.error('Error confirming transaction:', confirmError);
      setErrorMessage(confirmError instanceof Error ? confirmError.message : 'Transaction failed');
    }
  }, [isConfirmError, confirmError]);

  // Handle successful transaction
  useEffect(() => {
    if (isSuccess && txHash) {
      // Add to history
      const newHistoryItem = {
        address: teacherAddress,
        timestamp: new Date(),
        success: true
      };
      
      setRemovalHistory(prev => [newHistoryItem, ...prev].slice(0, 5));
      
      // Call completion callback if provided
      if (onRemovalComplete) {
        onRemovalComplete(teacherAddress, true);
      }
      
      // Reset the form
      setTeacherAddress('');
      setConfirmationStep(false);
      setErrorMessage('');
    }
  }, [isSuccess, txHash, teacherAddress, onRemovalComplete]);

  // Handle initial step - request confirmation
  const handleRequestRemoval = () => {
    if (!isValidAddress) {
      setErrorMessage('Please enter a valid Ethereum address');
      return;
    }
    
    setErrorMessage('');
    setConfirmationStep(true);
  };

  // Handle confirmed removal
  const handleConfirmRemoval = () => {
    if (!isValidAddress || !confirmationStep) {
      return;
    }
    
    try {
      // Call onRemovalStart callback if provided
      if (onRemovalStart) {
        onRemovalStart(teacherAddress);
      }
      
      // Execute the contract write
      writeContract({
        ...contract,
        functionName: 'removeTeacher',
        args: [teacherAddress as `0x${string}`]
      });
    } catch (error) {
      console.error('Error initiating removal:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to initiate removal');
    }
  };

  // Handle cancellation
  const handleCancelRemoval = () => {
    setConfirmationStep(false);
    resetWrite();
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.3 } }
  };

  return (
    <motion.div
      className="rounded-lg border border-gray-700 bg-gray-800/50 p-5 shadow-lg"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <h2 className="mb-4 text-xl font-semibold text-red-400">Teacher Removal</h2>
      
      {/* Form Section */}
      <div className="mb-6 rounded-lg bg-gray-700/30 p-5">
        {!isConnected ? (
          <div className="rounded-md bg-yellow-900/20 p-4 text-yellow-500">
            <div className="flex items-start">
              <svg className="mr-2 mt-0.5 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <h3 className="font-medium">Wallet Not Connected</h3>
                <p className="mt-1 text-sm">Please connect your wallet to use this feature.</p>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Input field */}
            <div className="mb-4">
              <label htmlFor="teacherAddress" className="mb-1 block text-sm font-medium text-gray-300">
                Teacher Address
              </label>
              <input
                id="teacherAddress"
                type="text"
                value={teacherAddress}
                onChange={(e) => setTeacherAddress(e.target.value)}
                placeholder="0x..."
                disabled={confirmationStep || isWritePending || isConfirming}
                className="w-full rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-white placeholder-gray-500 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:cursor-not-allowed disabled:opacity-70"
              />
              <p className="mt-1 text-xs text-gray-400">
                Enter the Ethereum address of the teacher to remove
              </p>
            </div>
            
            {/* Error Message */}
            {errorMessage && (
              <div className="mb-4 rounded-md border border-red-500/30 bg-red-500/20 p-3 text-sm text-red-400">
                {errorMessage}
              </div>
            )}
            
            {/* Success Message */}
            {isSuccess && (
              <div className="mb-4 rounded-md border border-green-500/30 bg-green-500/20 p-3 text-sm text-green-400">
                Teacher successfully removed! Transaction hash: {txHash?.substring(0, 8)}...{txHash?.substring(txHash.length - 6)}
              </div>
            )}
            
            {/* Confirmation Step */}
            <AnimatePresence mode="wait">
              {!confirmationStep ? (
                <motion.div
                  key="request"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <button
                    onClick={handleRequestRemoval}
                    disabled={!isValidAddress || isWritePending || isConfirming}
                    className={`flex w-full items-center justify-center rounded-md px-4 py-3 font-medium text-white transition focus:outline-none ${
                      !isValidAddress || isWritePending || isConfirming
                        ? 'cursor-not-allowed bg-gray-600'
                        : 'bg-red-600 hover:bg-red-700 focus:ring-2 focus:ring-red-500'
                    }`}
                  >
                    <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" />
                    </svg>
                    Remove Teacher Access
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="confirm"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-3"
                >
                  <div className="rounded-md bg-red-900/30 p-4 text-red-300">
                    <div className="flex items-start">
                      <svg className="mr-3 mt-0.5 h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <div>
                        <h3 className="font-medium text-red-400">Confirm Teacher Removal</h3>
                        <p className="mt-1 text-sm">
                          You are about to remove teacher privileges from: 
                          <br />
                          <span className="mt-1 block font-mono text-red-300">
                            {teacherAddress.substring(0, 8)}...{teacherAddress.substring(teacherAddress.length - 6)}
                          </span>
                        </p>
                        <p className="mt-2 text-sm">
                          This action cannot be undone. The teacher will lose all access to teacher-specific functions.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex space-x-3">
                    <button
                      onClick={handleCancelRemoval}
                      disabled={isWritePending || isConfirming}
                      className="flex-1 rounded-md border border-gray-600 bg-transparent py-2 text-sm font-medium text-gray-300 transition hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleConfirmRemoval}
                      disabled={isWritePending || isConfirming}
                      className="flex flex-1 items-center justify-center rounded-md bg-red-600 py-2 text-sm font-medium text-white transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {isWritePending || isConfirming ? (
                        <>
                          <svg className="mr-2 h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          {isWritePending ? 'Sending...' : 'Confirming...'}
                        </>
                      ) : (
                        'Confirm Removal'
                      )}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>
      
      {/* Removal History */}
      {removalHistory.length > 0 && (
        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-300">Recent Removals</h3>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center text-xs text-red-400 hover:text-red-300 focus:outline-none"
            >
              {showHistory ? 'Hide' : 'Show'} History
              <svg className={`ml-1 h-4 w-4 transition-transform ${showHistory ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
          
          <AnimatePresence>
            {showHistory && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="rounded-lg bg-gray-700/20 p-3">
                  <ul className="divide-y divide-gray-700">
                    {removalHistory.map((item, index) => (
                      <li key={index} className="py-2 first:pt-1 last:pb-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className={`mr-2 h-2 w-2 rounded-full ${item.success ? 'bg-green-500' : 'bg-red-500'}`}></div>
                            <span className="font-mono text-xs text-gray-300">
                              {item.address.substring(0, 10)}...{item.address.substring(item.address.length - 8)}
                            </span>
                          </div>
                          <div className="flex items-center">
                            <span className={`mr-3 rounded-full px-2 py-0.5 text-xs ${
                              item.success ? 'bg-green-900/20 text-green-400' : 'bg-red-900/20 text-red-400'
                            }`}>
                              {item.success ? 'Success' : 'Failed'}
                            </span>
                            <span className="text-xs text-gray-400">
                              {formatTimeAgo(item.timestamp)}
                            </span>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
      
      {/* Educational Section */}
      <div className="border-t border-gray-700 pt-4">
        <h3 className="mb-3 text-sm font-medium text-gray-300">About Teacher Removal</h3>
        
        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="rounded-md bg-gray-700/20 p-3">
            <h4 className="mb-1 text-xs font-medium text-red-400">Admin Privileges Required</h4>
            <p className="text-xs text-gray-400">
              Only administrators can remove teacher privileges. This action will trigger a blockchain transaction that must be confirmed with your wallet.
            </p>
          </div>
          
          <div className="rounded-md bg-gray-700/20 p-3">
            <h4 className="mb-1 text-xs font-medium text-red-400">Impact on Teacher</h4>
            <p className="text-xs text-gray-400">
              When a teacher's access is removed, they will immediately lose the ability to create content, grade assignments, and manage students within the platform.
            </p>
          </div>
        </div>
        
        <div className="rounded-md bg-gray-700/20 p-3">
          <h4 className="mb-1 text-xs font-medium text-red-400">Important Considerations</h4>
          <ul className="mt-2 space-y-2 text-xs text-gray-400">
            <li className="flex items-start">
              <span className="mr-2 text-red-400">•</span>
              <span>Removing a teacher is permanent and cannot be undone without re-granting privileges.</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2 text-red-400">•</span>
              <span>All existing content created by the teacher will remain in the system.</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2 text-red-400">•</span>
              <span>Consider notifying the teacher before removal to allow for any necessary data transfers or student reassignments.</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2 text-red-400">•</span>
              <span>Gas fees will be required to process this blockchain transaction.</span>
            </li>
          </ul>
        </div>
      </div>
    </motion.div>
  );
};

// Helper function to format time ago
const formatTimeAgo = (date: Date): string => {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + ' years ago';
  
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + ' months ago';
  
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + ' days ago';
  
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + ' hours ago';
  
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + ' minutes ago';
  
  return Math.floor(seconds) + ' seconds ago';
};

export default TeacherRemoval;