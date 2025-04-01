import { useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { motion } from 'framer-motion';

/**
 * EnrollmentIncrementer Component
 * 
 * This component provides a UI for incrementing the enrollment count
 * for a specific program ID. It handles the write transaction process,
 * including pending state, success, and error handling.
 */
interface EnrollmentIncrementerProps {
  contract: any;
  programId: number;
  onEnrollmentIncremented?: (success: boolean, programId: number, txHash?: string) => void;
  disabled?: boolean;
}

const EnrollmentIncrementer = ({ 
  contract, 
  programId,
  onEnrollmentIncremented,
  disabled = false
}: EnrollmentIncrementerProps) => {
  // State for transaction feedback
  const [showSuccess, setShowSuccess] = useState<boolean>(false);
  
  // Write contract hook for incrementing enrollment
  const { 
    writeContractAsync, 
    data: txHash,
    error: writeError,
    isPending: isWritePending
  } = useWriteContract();

  // Hook to wait for transaction receipt
  const { 
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    error: confirmError
  } = useWaitForTransactionReceipt({ 
    hash: txHash
  });

  // Determine if the component is in a loading state
  const isLoading = isWritePending || isConfirming;
  
  // Calculate errors
  const error = writeError || confirmError;

  // Handle incrementing enrollment
  const handleIncrementEnrollment = async () => {
    if (disabled || isLoading) return;
    
    try {
      setShowSuccess(false);
      const hash = await writeContractAsync({
        ...contract,
        functionName: 'incrementEnrollment',
        args: [programId]
      });
      
      // If onEnrollmentIncremented callback is provided, call it with success=true and the transaction hash
      if (onEnrollmentIncremented) {
        onEnrollmentIncremented(true, programId, hash);
      }
    } catch (err) {
      // If onEnrollmentIncremented callback is provided, call it with success=false
      if (onEnrollmentIncremented) {
        onEnrollmentIncremented(false, programId);
      }
      console.error('Error incrementing enrollment:', err);
    }
  };

  // Show success message when confirmed
  if (isConfirmed && !showSuccess) {
    setShowSuccess(true);
  }

  // Render the component UI
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-gray-800/50 border border-gray-700 rounded-lg p-4"
    >
      <h3 className="text-lg font-medium text-blue-400 mb-3">
        Increment Program Enrollment
      </h3>
      
      <div className="bg-gray-700/30 rounded-md p-3 mb-4">
        <p className="text-sm text-gray-300">
          This action will increase the enrollment count for Program #{programId} by 1.
          Make sure you have the necessary permissions to perform this action.
        </p>
      </div>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-300">Program ID:</p>
            <p className="text-lg font-medium text-white">{programId}</p>
          </div>
          
          <button
            onClick={handleIncrementEnrollment}
            disabled={disabled || isLoading}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              disabled || isLoading
                ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            {isLoading ? (
              <div className="flex items-center">
                <div className="w-4 h-4 border-2 border-t-white border-white/30 rounded-full animate-spin mr-2"></div>
                {isConfirming ? 'Confirming...' : 'Processing...'}
              </div>
            ) : (
              'Increment Enrollment'
            )}
          </button>
        </div>
        
        {error && (
          <div className="bg-red-500/20 text-red-400 border border-red-500/30 rounded-md p-3">
            <p className="text-sm">Error: {(error as Error).message || 'Failed to increment enrollment'}</p>
          </div>
        )}
        
        {showSuccess && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-green-500/20 text-green-400 border border-green-500/30 rounded-md p-3"
          >
            <div className="flex items-start">
              <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <div>
                <p className="text-sm font-medium">Enrollment successfully incremented!</p>
                {txHash && (
                  <p className="text-xs mt-1 break-all">
                    Transaction Hash: {txHash}
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default EnrollmentIncrementer;