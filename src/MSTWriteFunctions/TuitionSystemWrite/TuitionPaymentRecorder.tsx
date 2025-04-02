import { useState, useEffect } from 'react';
import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';

/**
 * TuitionPaymentRecorder Component
 * 
 * This component allows school administrators to record tuition payments for students.
 * It implements two critical security checks:
 * 1. Verifies the caller has the SCHOOL_ROLE
 * 2. Confirms the contract is not paused before processing transactions
 */
interface TuitionPaymentRecorderProps {
  paymentContract: any; // Contract for recording tuition payments
  roleContract: any; // Contract for checking SCHOOL_ROLE
  pauseContract: any; // Contract for checking pause status
  onPaymentRecorded?: (student: string, term: number) => void; // Optional callback
}

const TuitionPaymentRecorder = ({
  paymentContract,
  roleContract,
  pauseContract,
  onPaymentRecorded
}: TuitionPaymentRecorderProps) => {
  // Current user's address
  const { address: connectedAddress } = useAccount();
  
  // Form state
  const [studentAddress, setStudentAddress] = useState<string>('');
  const [termNumber, setTermNumber] = useState<number>(1);
  const [validationError, setValidationError] = useState<string>('');
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  
  // Status tracking
  const [canProcessPayments, setCanProcessPayments] = useState<boolean>(false);
  
  // Fetch the SCHOOL_ROLE identifier
  const { 
    data: schoolRoleData,
    isLoading: isLoadingRoleId,
    isError: isRoleIdError
  } = useReadContract({
    ...roleContract,
    functionName: 'SCHOOL_ROLE'
  });
  
  // Check if the system is paused
  const {
    data: pausedStatus,
    isLoading: isLoadingPauseStatus,
    isError: isPauseStatusError,
    refetch: refetchPauseStatus
  } = useReadContract({
    ...pauseContract,
    functionName: 'paused'
  });
  
  // Check if the current user has the SCHOOL_ROLE
  const {
    data: hasRoleData,
    isLoading: isLoadingRoleCheck,
    isError: isRoleCheckError,
    refetch: refetchRoleCheck
  } = useReadContract({
    ...roleContract,
    functionName: 'hasRole',
    args: schoolRoleData && connectedAddress ? [
      schoolRoleData as `0x${string}`,
      connectedAddress
    ] : undefined,
    query: {
      enabled: !!schoolRoleData && !!connectedAddress
    }
  });
  
  // Contract write state for recording payments
  const {
    data: recordTxHash,
    error: recordTxError,
    isPending: isRecordPending,
    writeContract: writeRecordPayment
  } = useWriteContract();
  
  // Transaction receipt state
  const {
    isLoading: isRecordConfirming,
    isSuccess: isRecordConfirmed,
    error: recordConfirmError
  } = useWaitForTransactionReceipt({
    hash: recordTxHash,
  });
  
  // Combined loading state
  const isLoading = isLoadingRoleId || isLoadingPauseStatus || isLoadingRoleCheck;
  
  // Combined processing state
  const isProcessing = isRecordPending || isRecordConfirming;
  
  // Combined error state
  const recordError = recordTxError || recordConfirmError;
  
  // Update canProcessPayments when role and pause data are loaded
  useEffect(() => {
    if (!isLoading) {
      const hasRole = Boolean(hasRoleData);
      const isPaused = Boolean(pausedStatus);
      
      setCanProcessPayments(hasRole && !isPaused);
      setLastChecked(new Date());
    }
  }, [hasRoleData, pausedStatus, isLoading]);
  
  // Helper to format time since last check
  const getTimeSinceLastCheck = () => {
    if (!lastChecked) return 'Never checked';
    return formatDistanceToNow(lastChecked, { addSuffix: true });
  };
  
  // Validate student address
  const validateAddress = (address: string): boolean => {
    if (!address) {
      setValidationError('Student address is required');
      return false;
    }
    
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      setValidationError('Invalid Ethereum address format');
      return false;
    }
    
    setValidationError('');
    return true;
  };
  
  // Validate term number
  const validateTerm = (term: number): boolean => {
    if (isNaN(term) || term <= 0) {
      setValidationError('Term must be a positive number');
      return false;
    }
    
    setValidationError('');
    return true;
  };
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form inputs
    if (!validateAddress(studentAddress) || !validateTerm(termNumber)) {
      return;
    }
    
    // Re-check permissions and system status
    if (!canProcessPayments) {
      if (!Boolean(hasRoleData)) {
        setValidationError('You do not have the SCHOOL_ROLE required to record payments');
      } else if (Boolean(pausedStatus)) {
        setValidationError('System is paused. Cannot record payments at this time');
      } else {
        setValidationError('Unable to process payment due to system constraints');
      }
      return;
    }
    
    // All checks passed, record the payment
    try {
      writeRecordPayment({
        ...paymentContract,
        functionName: 'recordTuitionPayment',
        args: [
          studentAddress as `0x${string}`,
          BigInt(termNumber)
        ]
      });
    } catch (err) {
      console.error('Error recording payment:', err);
      setValidationError('Error initiating transaction');
    }
  };
  
  // Reset form after successful payment recording
  useEffect(() => {
    if (isRecordConfirmed && !isRecordConfirming) {
      // Call the callback if provided
      if (onPaymentRecorded) {
        onPaymentRecorded(studentAddress, termNumber);
      }
      
      // Reset form
      setStudentAddress('');
      setTermNumber(1);
      
      // Refresh permission checks
      refetchRoleCheck();
      refetchPauseStatus();
    }
  }, [isRecordConfirmed, isRecordConfirming, studentAddress, termNumber, onPaymentRecorded, refetchRoleCheck, refetchPauseStatus]);
  
  // Render validation errors with proper type declaration
  const renderValidationErrors = (): React.ReactNode => {
    if (!validationError) return null;
    
    return (
      <div className="text-xs text-red-400 mt-1">{validationError}</div>
    );
  };
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-gray-800/50 border border-gray-700 rounded-lg p-4"
    >
      <h3 className="text-lg font-medium text-blue-400 mb-3">
        Tuition Payment Recorder
      </h3>
      
      {/* System Status Banner */}
      {!isLoading && (
        <div className={`flex items-center justify-between p-4 rounded-lg border mb-4 ${
          canProcessPayments 
            ? 'bg-green-900/20 border-green-700/30' 
            : 'bg-red-900/20 border-red-700/30'
        }`}>
          <div className="flex items-center">
            {canProcessPayments ? (
              <>
                <div className="w-3 h-3 bg-green-500 rounded-full mr-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                </div>
                <div>
                  <h4 className="text-md font-medium text-green-400">System Ready</h4>
                  <p className="text-xs text-gray-300 mt-0.5">You can record tuition payments</p>
                </div>
              </>
            ) : (
              <>
                <div className="w-3 h-3 bg-red-500 rounded-full mr-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                </div>
                <div>
                  <h4 className="text-md font-medium text-red-400">System Unavailable</h4>
                  <p className="text-xs text-gray-300 mt-0.5">
                    {!Boolean(hasRoleData) && 'You lack the required SCHOOL_ROLE permissions'}
                    {Boolean(hasRoleData) && Boolean(pausedStatus) && 'The system is currently paused'}
                  </p>
                </div>
              </>
            )}
          </div>
          
          <button
            onClick={() => {
              refetchRoleCheck();
              refetchPauseStatus();
              setLastChecked(new Date());
            }}
            className="flex items-center text-xs px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      )}
      
      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-4 bg-gray-700/20 rounded-lg mb-4">
          <div className="w-5 h-5 border-2 border-t-blue-400 border-blue-200/30 rounded-full animate-spin mr-2"></div>
          <span className="text-sm text-gray-300">Checking system status...</span>
        </div>
      )}
      
      {/* Error States */}
      {(isRoleIdError || isRoleCheckError) && (
        <div className="bg-red-500/20 text-red-400 border border-red-500/30 rounded-md p-4 mb-4">
          <div className="flex items-start">
            <svg className="w-5 h-5 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-medium">Permission Check Error</p>
              <p className="text-xs mt-1">Unable to verify your role permissions. Please try again later.</p>
            </div>
          </div>
        </div>
      )}
      
      {isPauseStatusError && (
        <div className="bg-red-500/20 text-red-400 border border-red-500/30 rounded-md p-4 mb-4">
          <div className="flex items-start">
            <svg className="w-5 h-5 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-medium">System Status Error</p>
              <p className="text-xs mt-1">Unable to check if system is paused. Please try again later.</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Payment Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-gray-700/30 rounded-lg p-4 space-y-4">
          {/* Student Address Input */}
          <div className="space-y-2">
            <label htmlFor="student-address" className="block text-sm font-medium text-gray-300">
              Student Wallet Address
            </label>
            <input
              id="student-address"
              type="text"
              value={studentAddress}
              onChange={(e) => {
                setStudentAddress(e.target.value);
                setValidationError('');
              }}
              placeholder="0x..."
              className={`w-full px-3 py-2 bg-gray-700 border ${
                validationError && !studentAddress ? 'border-red-500' : 'border-gray-600'
              } rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
              disabled={isProcessing || !canProcessPayments}
            />
            <p className="text-xs text-gray-400">Enter the student's Ethereum wallet address</p>
          </div>
          
          {/* Term Number Input */}
          <div className="space-y-2">
            <label htmlFor="term-number" className="block text-sm font-medium text-gray-300">
              Term Number
            </label>
            <input
              id="term-number"
              type="number"
              value={termNumber || ''}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                setTermNumber(isNaN(value) ? 0 : value);
                setValidationError('');
              }}
              placeholder="Enter term number"
              min="1"
              className={`w-full px-3 py-2 bg-gray-700 border ${
                validationError && (!termNumber || termNumber <= 0) ? 'border-red-500' : 'border-gray-600'
              } rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
              disabled={isProcessing || !canProcessPayments}
            />
            <p className="text-xs text-gray-400">Enter the term number to record payment for</p>
          </div>
          
          {/* Validation Errors */}
          {renderValidationErrors()}
          
          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              className={`px-4 py-2 rounded-md text-white font-medium ${
                isProcessing || !canProcessPayments
                  ? 'bg-gray-600 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500'
              }`}
              disabled={isProcessing || !canProcessPayments}
            >
              {isProcessing ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing Payment...
                </span>
              ) : (
                'Record Payment'
              )}
            </button>
          </div>
        </div>
      </form>
      
      {/* Transaction Success Message */}
      {isRecordConfirmed && !isRecordConfirming && (
        <div className="mt-4 bg-green-500/20 text-green-400 border border-green-500/30 rounded-md p-4">
          <div className="flex items-start">
            <svg className="w-5 h-5 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-medium">Payment Successfully Recorded</p>
              <p className="text-xs mt-1">The tuition payment has been successfully recorded on the blockchain.</p>
              <div className="mt-2 pt-2 border-t border-green-500/20">
                <p className="text-xs text-gray-300">Transaction Hash:</p>
                <a
                  href={`https://etherscan.io/tx/${recordTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-400 font-mono break-all hover:underline"
                >
                  {recordTxHash}
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Transaction Error Message */}
      {recordError && (
        <div className="mt-4 bg-red-500/20 text-red-400 border border-red-500/30 rounded-md p-4">
          <div className="flex items-start">
            <svg className="w-5 h-5 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-medium">Error Recording Payment</p>
              <p className="text-xs mt-1">
                {(recordError as Error).message || 'An unknown error occurred while recording the payment.'}
              </p>
              <p className="text-xs mt-2 text-gray-300">
                This may happen if the student is not registered, the term is invalid, or the payment was already recorded.
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* System Status Information */}
      {!isLoading && (
        <div className="mt-4 bg-gray-700/20 rounded-md p-3">
          <h4 className="text-sm font-medium text-gray-300 mb-2">System Status</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-gray-700/40 rounded-md p-2">
              <p className="text-xs text-gray-400">Permission Status:</p>
              <div className="flex items-center mt-1">
                <div className={`w-2 h-2 rounded-full ${Boolean(hasRoleData) ? 'bg-green-500' : 'bg-red-500'} mr-2`}></div>
                <p className={`text-sm ${Boolean(hasRoleData) ? 'text-green-400' : 'text-red-400'}`}>
                  {Boolean(hasRoleData) ? 'SCHOOL_ROLE Granted' : 'Missing SCHOOL_ROLE'}
                </p>
              </div>
            </div>
            
            <div className="bg-gray-700/40 rounded-md p-2">
              <p className="text-xs text-gray-400">Contract Status:</p>
              <div className="flex items-center mt-1">
                <div className={`w-2 h-2 rounded-full ${Boolean(pausedStatus) ? 'bg-red-500' : 'bg-green-500'} mr-2`}></div>
                <p className={`text-sm ${Boolean(pausedStatus) ? 'text-red-400' : 'text-green-400'}`}>
                  {Boolean(pausedStatus) ? 'System Paused' : 'System Active'}
                </p>
              </div>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-gray-600">
            <div className="text-xs text-gray-400 flex items-center justify-end">
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Last checked: {getTimeSinceLastCheck()}
            </div>
          </div>
        </div>
      )}
      
      {/* Educational Information */}
      <div className="mt-6 pt-4 border-t border-gray-700">
        <h4 className="text-sm font-medium text-gray-300 mb-2">About Tuition Payment Recording</h4>
        <p className="text-sm text-gray-400 mb-3">
          This component allows authorized school administrators to record student tuition payments on the blockchain. Two security checks are performed:
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <div className="bg-gray-700/20 rounded-md p-3">
            <h5 className="text-xs font-medium text-green-400 mb-1">Role Verification</h5>
            <p className="text-xs text-gray-400">
              Only addresses with the SCHOOL_ROLE can record tuition payments, ensuring that financial operations are restricted to authorized personnel.
            </p>
          </div>
          
          <div className="bg-gray-700/20 rounded-md p-3">
            <h5 className="text-xs font-medium text-green-400 mb-1">System Status Check</h5>
            <p className="text-xs text-gray-400">
              Payments cannot be recorded if the system is paused, which might occur during maintenance, upgrades, or security incidents.
            </p>
          </div>
        </div>
        
        <p className="text-xs text-gray-400">
          Recording a payment updates the student's tuition status for the specified term. This operation does not involve token or currency transfers; it simply marks the payment as completed in the system.
        </p>
      </div>
    </motion.div>
  );
};

export default TuitionPaymentRecorder;