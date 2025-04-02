import { useState, useEffect } from 'react';
import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { parseEther } from 'viem';

/**
 * TuitionPaymentProcessor Component
 * 
 * This component allows administrators to process tuition payments for students.
 * It implements two critical security checks:
 * 1. Verifies the caller has the ADMIN_ROLE
 * 2. Confirms the contract is not paused before processing transactions
 */
interface TuitionPaymentProcessorProps {
  paymentContract: any; // Contract for processing tuition payments
  roleContract: any; // Contract for checking ADMIN_ROLE
  pauseContract: any; // Contract for checking pause status
  onPaymentComplete?: (txHash: string) => void; // Optional callback
}

const TuitionPaymentProcessor = ({
  paymentContract,
  roleContract,
  pauseContract,
  onPaymentComplete
}: TuitionPaymentProcessorProps) => {
  // Current user's address
  const { address: connectedAddress } = useAccount();
  
  // Payment form state
  const [studentAddress, setStudentAddress] = useState<string>('');
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentAmountWei, setPaymentAmountWei] = useState<bigint>(BigInt(0));
  
  // Status tracking
  const [canProcess, setCanProcess] = useState<boolean>(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isFormValid, setIsFormValid] = useState<boolean>(false);
  
  // Fetch the ADMIN_ROLE identifier
  const { 
    data: adminRoleData,
    isLoading: isLoadingRoleId,
    isError: isRoleIdError
  } = useReadContract({
    ...roleContract,
    functionName: 'ADMIN_ROLE'
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
  
  // Check if the current user has the ADMIN_ROLE
  const {
    data: hasRoleData,
    isLoading: isLoadingRoleCheck,
    isError: isRoleCheckError,
    refetch: refetchRoleCheck
  } = useReadContract({
    ...roleContract,
    functionName: 'hasRole',
    args: adminRoleData && connectedAddress ? [
      adminRoleData as `0x${string}`,
      connectedAddress
    ] : undefined,
    query: {
      enabled: !!adminRoleData && !!connectedAddress
    }
  });
  
  // Contract write state for processing tuition payment
  const {
    data: paymentTxHash,
    error: paymentTxError,
    isPending: isPaymentPending,
    writeContract: writeProcessPayment
  } = useWriteContract();
  
  // Transaction receipt state
  const {
    isLoading: isPaymentConfirming,
    isSuccess: isPaymentConfirmed,
    error: paymentConfirmError
  } = useWaitForTransactionReceipt({
    hash: paymentTxHash,
  });
  
  // Combined loading state
  const isLoading = isLoadingRoleId || isLoadingPauseStatus || isLoadingRoleCheck;
  
  // Combined processing state
  const isProcessing = isPaymentPending || isPaymentConfirming;
  
  // Combined error state
  const paymentError = paymentTxError || paymentConfirmError;
  
  // Update canProcess when role and pause data are loaded
  useEffect(() => {
    if (!isLoading) {
      const hasRole = Boolean(hasRoleData);
      const isPaused = Boolean(pausedStatus);
      
      setCanProcess(hasRole && !isPaused);
      setLastChecked(new Date());
    }
  }, [hasRoleData, pausedStatus, isLoading]);
  
  // Update payment amount in Wei when ETH amount changes
  useEffect(() => {
    try {
      if (paymentAmount && !isNaN(parseFloat(paymentAmount))) {
        setPaymentAmountWei(parseEther(paymentAmount));
      } else {
        setPaymentAmountWei(BigInt(0));
      }
    } catch (err) {
      console.error('Error parsing ETH amount:', err);
      setPaymentAmountWei(BigInt(0));
    }
  }, [paymentAmount]);
  
  // Validate form
  useEffect(() => {
    const isAddressValid = /^0x[a-fA-F0-9]{40}$/.test(studentAddress);
    const isAmountValid = paymentAmount.trim() !== '' && !isNaN(parseFloat(paymentAmount)) && parseFloat(paymentAmount) > 0;
    
    setIsFormValid(isAddressValid && isAmountValid);
  }, [studentAddress, paymentAmount]);
  
  // Helper to format time since last check
  const getTimeSinceLastCheck = () => {
    if (!lastChecked) return 'Never checked';
    return formatDistanceToNow(lastChecked, { addSuffix: true });
  };
  
  // Handle payment processing
  const handleProcessPayment = () => {
    // Re-check permissions and system status
    if (!canProcess) {
      if (!Boolean(hasRoleData)) {
        setErrorMessage('You do not have the ADMIN_ROLE required to process payments');
      } else if (Boolean(pausedStatus)) {
        setErrorMessage('System is paused. Cannot process payments at this time');
      } else {
        setErrorMessage('Unable to process payment due to system constraints');
      }
      return;
    }
    
    // Validate input data
    if (!isFormValid) {
      if (!/^0x[a-fA-F0-9]{40}$/.test(studentAddress)) {
        setErrorMessage('Please enter a valid Ethereum address for the student');
      } else if (paymentAmount.trim() === '' || isNaN(parseFloat(paymentAmount)) || parseFloat(paymentAmount) <= 0) {
        setErrorMessage('Please enter a valid payment amount greater than 0');
      } else {
        setErrorMessage('Please check the payment details and try again');
      }
      return;
    }
    
    // All checks passed, process the payment
    try {
      setErrorMessage('');
      writeProcessPayment({
        ...paymentContract,
        functionName: 'processTuitionPayment',
        args: [studentAddress as `0x${string}`, paymentAmountWei],
        value: paymentAmountWei
      });
    } catch (err) {
      console.error('Error processing payment:', err);
      setErrorMessage('Error initiating transaction');
    }
  };
  
  // Handle successful payment
  useEffect(() => {
    if (isPaymentConfirmed && !isPaymentConfirming) {
      // Call the callback if provided
      if (onPaymentComplete && paymentTxHash) {
        onPaymentComplete(paymentTxHash);
      }
      
      // Reset form
      setStudentAddress('');
      setPaymentAmount('');
      
      // Refresh data
      refetchRoleCheck();
      refetchPauseStatus();
      setLastChecked(new Date());
    }
  }, [isPaymentConfirmed, isPaymentConfirming, paymentTxHash, onPaymentComplete, refetchRoleCheck, refetchPauseStatus]);
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-gray-800/50 border border-gray-700 rounded-lg p-4"
    >
      <h3 className="text-lg font-medium text-amber-400 mb-3">
        Tuition Payment Processor
      </h3>
      
      {/* System Status Banner */}
      {!isLoading && (
        <div className={`flex items-center justify-between p-4 rounded-lg border mb-4 ${
          canProcess 
            ? 'bg-green-900/20 border-green-700/30' 
            : 'bg-red-900/20 border-red-700/30'
        }`}>
          <div className="flex items-center">
            {canProcess ? (
              <>
                <div className="w-3 h-3 bg-green-500 rounded-full mr-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                </div>
                <div>
                  <h4 className="text-md font-medium text-green-400">System Ready</h4>
                  <p className="text-xs text-gray-300 mt-0.5">You can process tuition payments</p>
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
                    {!Boolean(hasRoleData) && 'You lack the required ADMIN_ROLE permissions'}
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
            className="flex items-center text-xs px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500"
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
          <div className="w-5 h-5 border-2 border-t-amber-400 border-amber-200/30 rounded-full animate-spin mr-2"></div>
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
      {!isLoading && (
        <div className="bg-gray-700/30 rounded-lg p-4 mb-4">
          <div className="mb-4">
            <label htmlFor="studentAddress" className="block text-sm font-medium text-gray-300 mb-1">
              Student Ethereum Address
            </label>
            <input
              id="studentAddress"
              type="text"
              value={studentAddress}
              onChange={(e) => setStudentAddress(e.target.value)}
              placeholder="0x..."
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-400 mt-1">
              Enter the Ethereum address of the student receiving this payment
            </p>
          </div>
          
          <div className="mb-4">
            <label htmlFor="paymentAmount" className="block text-sm font-medium text-gray-300 mb-1">
              Payment Amount (ETH)
            </label>
            <div className="relative">
              <input
                id="paymentAmount"
                type="text"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="0.0"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <span className="text-gray-400">ETH</span>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Enter the amount of ETH to send as tuition payment
            </p>
          </div>
          
          {/* Error Message */}
          {errorMessage && (
            <div className="w-full bg-red-500/20 text-red-400 border border-red-500/30 rounded-md p-3 mb-4 text-sm">
              {errorMessage}
            </div>
          )}
          
          {/* Process Payment Button */}
          <button
            onClick={handleProcessPayment}
            disabled={isProcessing || !canProcess || !isFormValid}
            className={`w-full px-4 py-3 rounded-md text-white font-medium flex items-center justify-center ${
              isProcessing || !canProcess || !isFormValid
                ? 'bg-gray-600 cursor-not-allowed'
                : 'bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500'
            }`}
          >
            {isProcessing ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing Payment...
              </>
            ) : (
              <>
                <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Process Tuition Payment
              </>
            )}
          </button>
        </div>
      )}
      
      {/* Transaction Success Message */}
      {isPaymentConfirmed && !isPaymentConfirming && (
        <div className="mt-4 bg-green-500/20 text-green-400 border border-green-500/30 rounded-md p-4">
          <div className="flex items-start">
            <svg className="w-5 h-5 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-medium">Payment Successfully Processed</p>
              <p className="text-xs mt-1">The tuition payment has been successfully processed.</p>
              <div className="mt-2 pt-2 border-t border-green-500/20">
                <p className="text-xs text-gray-300">Transaction Hash:</p>
                <a
                  href={`https://etherscan.io/tx/${paymentTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-400 font-mono break-all hover:underline"
                >
                  {paymentTxHash}
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Transaction Error Message */}
      {paymentError && (
        <div className="mt-4 bg-red-500/20 text-red-400 border border-red-500/30 rounded-md p-4">
          <div className="flex items-start">
            <svg className="w-5 h-5 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-medium">Error Processing Payment</p>
              <p className="text-xs mt-1">
                {(paymentError as Error).message || 'An unknown error occurred while processing the payment.'}
              </p>
              <p className="text-xs mt-2 text-gray-300">
                This may happen if you don't have sufficient funds or if there is an issue with the transaction.
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
                  {Boolean(hasRoleData) ? 'ADMIN_ROLE Granted' : 'Missing ADMIN_ROLE'}
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
        <h4 className="text-sm font-medium text-gray-300 mb-2">About Tuition Payment Processing</h4>
        <p className="text-sm text-gray-400 mb-3">
          This component allows authorized administrators to process tuition payments for students. Two security checks are performed:
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <div className="bg-gray-700/20 rounded-md p-3">
            <h5 className="text-xs font-medium text-amber-400 mb-1">Role Verification</h5>
            <p className="text-xs text-gray-400">
              Only addresses with the ADMIN_ROLE can process payments, ensuring that financial operations are restricted to authorized administrators.
            </p>
          </div>
          
          <div className="bg-gray-700/20 rounded-md p-3">
            <h5 className="text-xs font-medium text-amber-400 mb-1">System Status Check</h5>
            <p className="text-xs text-gray-400">
              Payments cannot be processed if the system is paused, which might occur during maintenance, upgrades, or security incidents.
            </p>
          </div>
        </div>
        
        <p className="text-xs text-gray-400">
          The payment operation transfers the specified amount of ETH to the contract while registering it against the student's address. This allows proper accounting and tracking of tuition payments for each student.
        </p>
      </div>
    </motion.div>
  );
};

export default TuitionPaymentProcessor;