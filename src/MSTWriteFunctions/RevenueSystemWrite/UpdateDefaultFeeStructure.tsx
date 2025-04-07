import { useState, useEffect } from 'react';
import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { contractRevenueSystemConfig } from '../../contracts';

/**
 * useDefaultFeeStructure Hook
 * 
 * Custom hook that provides fee structure data and update functionality
 * This can be used by other components that need access to fee structure data
 * without rendering the UI component
 */
export const useDefaultFeeStructure = (
  feeContract = contractRevenueSystemConfig,
  roleContract = contractRevenueSystemConfig,
  pauseContract = contractRevenueSystemConfig,
  onUpdateComplete?: (txHash: string) => void
) => {
  // Current user's address
  const { address: connectedAddress } = useAccount();
  
  // Form state
  const [programFee, setProgramFee] = useState('');
  const [subscriptionFee, setSubscriptionFee] = useState('');
  const [certificateFee, setCertificateFee] = useState('');
  const [revenueShare, setRevenueShare] = useState('');
  
  // Current fee structure data (for consumption by other components)
  const [currentFeeStructure, setCurrentFeeStructure] = useState({
    programFee: '',
    subscriptionFee: '',
    certificateFee: '',
    revenueShare: ''
  });
  
  // Status tracking
  const [canUpdate, setCanUpdate] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isFormValid, setIsFormValid] = useState(false);
  
  // Fetch the ADMIN_ROLE identifier
  const { 
    data: adminRoleData,
    isLoading: isLoadingRoleId,
    isError: isRoleIdError
  } = useReadContract({
    abi: roleContract.abi,
    address: roleContract.address as `0x${string}`,
    functionName: 'ADMIN_ROLE'
  });
  
  // Check if the system is paused
  const {
    data: pausedStatus,
    isLoading: isLoadingPauseStatus,
    isError: isPauseStatusError,
    refetch: refetchPauseStatus
  } = useReadContract({
    abi: pauseContract.abi,
    address: pauseContract.address as `0x${string}`,
    functionName: 'paused'
  });
  
  // Check if the current user has the ADMIN_ROLE
  const {
    data: hasRoleData,
    isLoading: isLoadingRoleCheck,
    isError: isRoleCheckError,
    refetch: refetchRoleCheck
  } = useReadContract({
    abi: roleContract.abi,
    address: roleContract.address as `0x${string}`,
    functionName: 'hasRole',
    args: adminRoleData && connectedAddress ? [
      adminRoleData,
      connectedAddress
    ] : undefined,
    query: {
      enabled: !!adminRoleData && !!connectedAddress
    }
  });
  
  // Fetch current fee structure from the contract
  const {
    data: currentFeeData,
    isLoading: isLoadingFeeData,
    isError: isFeeDataError,
    refetch: refetchFeeData
  } = useReadContract({
    abi: feeContract.abi,
    address: feeContract.address as `0x${string}`,
    functionName: 'getDefaultFeeStructure'
  });
  
  // Contract write state for updating fee structure
  const {
    data: updateTxHash,
    error: updateTxError,
    isPending: isUpdatePending,
    writeContract: writeUpdateFeeStructure
  } = useWriteContract();
  
  // Transaction receipt state
  const {
    isLoading: isUpdateConfirming,
    isSuccess: isUpdateConfirmed,
    error: updateConfirmError
  } = useWaitForTransactionReceipt({
    hash: updateTxHash,
  });
  
  // Combined loading state
  const isLoading = isLoadingRoleId || isLoadingPauseStatus || isLoadingRoleCheck || isLoadingFeeData;
  
  // Combined processing state
  const isProcessing = isUpdatePending || isUpdateConfirming;
  
  // Combined error state
  const updateError = updateTxError || updateConfirmError;
  
  // Update current fee structure from contract data
  useEffect(() => {
    if (currentFeeData && Array.isArray(currentFeeData)) {
      const [programFee, subscriptionFee, certificateFee, revenueShare] = currentFeeData;
      setCurrentFeeStructure({
        programFee: programFee.toString(),
        subscriptionFee: subscriptionFee.toString(),
        certificateFee: certificateFee.toString(),
        revenueShare: revenueShare.toString()
      });
    }
  }, [currentFeeData]);
  
  // Update canUpdate when role and pause data are loaded
  useEffect(() => {
    if (!isLoading) {
      const hasRole = Boolean(hasRoleData);
      const isPaused = Boolean(pausedStatus);
      
      setCanUpdate(hasRole && !isPaused);
      setLastChecked(new Date());
    }
  }, [hasRoleData, pausedStatus, isLoading]);
  
  // Validate form
  useEffect(() => {
    const isProgramFeeValid = /^\d+$/.test(programFee);
    const isSubscriptionFeeValid = /^\d+$/.test(subscriptionFee);
    const isCertificateFeeValid = /^\d+$/.test(certificateFee);
    const isRevenueShareValid = /^\d+$/.test(revenueShare) && parseInt(revenueShare) <= 10000; // Max 100.00%
    
    setIsFormValid(
      isProgramFeeValid && 
      isSubscriptionFeeValid && 
      isCertificateFeeValid && 
      isRevenueShareValid
    );
  }, [programFee, subscriptionFee, certificateFee, revenueShare]);
  
  // Helper to format time since last check
  const getTimeSinceLastCheck = () => {
    if (!lastChecked) return 'Never checked';
    return formatDistanceToNow(lastChecked, { addSuffix: true });
  };
  
  // Load current fee structure into form
  const loadCurrentFeeStructure = () => {
    setProgramFee(currentFeeStructure.programFee);
    setSubscriptionFee(currentFeeStructure.subscriptionFee);
    setCertificateFee(currentFeeStructure.certificateFee);
    setRevenueShare(currentFeeStructure.revenueShare);
  };
  
  // Reset form to empty values
  const resetForm = () => {
    setProgramFee('');
    setSubscriptionFee('');
    setCertificateFee('');
    setRevenueShare('');
  };
  
  // Handle updating fee structure
  const handleUpdateFeeStructure = () => {
    // Re-check permissions and system status
    if (!canUpdate) {
      if (!Boolean(hasRoleData)) {
        setErrorMessage('You do not have the ADMIN_ROLE required to update fee structures');
      } else if (Boolean(pausedStatus)) {
        setErrorMessage('System is paused. Cannot update fee structures at this time');
      } else {
        setErrorMessage('Unable to update fee structure due to system constraints');
      }
      return;
    }
    
    // Validate input data
    if (!isFormValid) {
      if (!/^\d+$/.test(programFee)) {
        setErrorMessage('Program fee must be a valid integer value');
      } else if (!/^\d+$/.test(subscriptionFee)) {
        setErrorMessage('Subscription fee must be a valid integer value');
      } else if (!/^\d+$/.test(certificateFee)) {
        setErrorMessage('Certificate fee must be a valid integer value');
      } else if (!/^\d+$/.test(revenueShare)) {
        setErrorMessage('Revenue share must be a valid integer value');
      } else if (parseInt(revenueShare) > 10000) {
        setErrorMessage('Revenue share cannot exceed 10000 (100.00%)');
      } else {
        setErrorMessage('Please check all fields and try again');
      }
      return;
    }
    
    // All checks passed, update the fee structure
    try {
      setErrorMessage('');
      writeUpdateFeeStructure({
        abi: feeContract.abi,
        address: feeContract.address as `0x${string}`,
        functionName: 'updateDefaultFeeStructure',
        args: [
          BigInt(programFee),
          BigInt(subscriptionFee),
          BigInt(certificateFee),
          BigInt(revenueShare)
        ]
      });
    } catch (err) {
      console.error('Error updating fee structure:', err);
      setErrorMessage('Error initiating transaction');
    }
  };
  
  // Handle successful fee structure update
  useEffect(() => {
    if (isUpdateConfirmed && !isUpdateConfirming) {
      // Call the callback if provided
      if (onUpdateComplete && updateTxHash) {
        onUpdateComplete(updateTxHash);
      }
      
      // Refresh data
      refetchRoleCheck();
      refetchPauseStatus();
      refetchFeeData();
      setLastChecked(new Date());
      
      // Clear form
      resetForm();
    }
  }, [isUpdateConfirmed, isUpdateConfirming, updateTxHash, onUpdateComplete, refetchRoleCheck, refetchPauseStatus, refetchFeeData]);
  
  // Refresh all data
  const refreshData = () => {
    refetchRoleCheck();
    refetchPauseStatus();
    refetchFeeData();
    setLastChecked(new Date());
  };
  
  return {
    // Fee structure data
    currentFeeStructure,
    
    // Form values
    programFee,
    subscriptionFee,
    certificateFee,
    revenueShare,
    setProgramFee,
    setSubscriptionFee,
    setCertificateFee,
    setRevenueShare,
    
    // Status
    canUpdate,
    isLoading,
    isProcessing,
    isFormValid,
    errorMessage,
    setErrorMessage,
    updateError,
    isUpdateConfirmed,
    isUpdateConfirming,
    updateTxHash,
    
    // Role and pause status
    hasRole: Boolean(hasRoleData),
    isPaused: Boolean(pausedStatus),
    
    // Loading states
    isLoadingRoleId,
    isLoadingPauseStatus,
    isLoadingRoleCheck,
    isLoadingFeeData,
    
    // Error states
    isRoleIdError,
    isPauseStatusError,
    isRoleCheckError,
    isFeeDataError,
    
    // Utility functions
    handleUpdateFeeStructure,
    refreshData,
    loadCurrentFeeStructure,
    resetForm,
    getTimeSinceLastCheck,
    
    // Last checked timestamp
    lastChecked
  };
};

/**
 * DefaultFeeStructureUpdate Component
 * 
 * This component allows administrators to update the default fee structure for the platform.
 * It implements two critical security checks:
 * 1. Verifies the caller has the ADMIN_ROLE
 * 2. Confirms the contract is not paused before processing transactions
 * 
 * The component now uses the useDefaultFeeStructure hook for its functionality,
 * allowing other components to also use the same hook for fee structure data.
 */
interface DefaultFeeStructureUpdateProps {
  feeContract?: any; // Contract for updating fee structure (optional, defaults to contractRevenueSystemConfig)
  roleContract?: any; // Contract for checking ADMIN_ROLE (optional, defaults to contractRevenueSystemConfig)
  pauseContract?: any; // Contract for checking pause status (optional, defaults to contractRevenueSystemConfig)
  onUpdateComplete?: (txHash: string) => void; // Optional callback
}

const DefaultFeeStructureUpdate = ({
  feeContract = contractRevenueSystemConfig,
  roleContract = contractRevenueSystemConfig,
  pauseContract = contractRevenueSystemConfig,
  onUpdateComplete
}: DefaultFeeStructureUpdateProps) => {
  // Use the custom hook for all fee structure functionality
  const {
    // Form values
    programFee,
    subscriptionFee,
    certificateFee,
    revenueShare,
    setProgramFee,
    setSubscriptionFee,
    setCertificateFee,
    setRevenueShare,
    
    // Status
    canUpdate,
    isLoading,
    isProcessing,
    isFormValid,
    errorMessage,
    updateError,
    isUpdateConfirmed,
    isUpdateConfirming,
    updateTxHash,
    
    // Role and pause status
    hasRole,
    isPaused,
    
    // Loading states
    isRoleIdError,
    isPauseStatusError,
    isRoleCheckError,
    
    // Utility functions
    handleUpdateFeeStructure,
    refreshData,
    getTimeSinceLastCheck,
    loadCurrentFeeStructure
  } = useDefaultFeeStructure(feeContract, roleContract, pauseContract, onUpdateComplete);
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-gray-800/50 border border-gray-700 rounded-lg p-4"
    >
      <h3 className="text-lg font-medium text-amber-400 mb-3">
        Default Fee Structure Update
      </h3>
      
      {/* System Status Banner */}
      {!isLoading && (
        <div className={`flex items-center justify-between p-4 rounded-lg border mb-4 ${
          canUpdate 
            ? 'bg-green-900/20 border-green-700/30' 
            : 'bg-red-900/20 border-red-700/30'
        }`}>
          <div className="flex items-center">
            {canUpdate ? (
              <>
                <div className="w-3 h-3 bg-green-500 rounded-full mr-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                </div>
                <div>
                  <h4 className="text-md font-medium text-green-400">System Ready</h4>
                  <p className="text-xs text-gray-300 mt-0.5">You can update the default fee structure</p>
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
                    {!hasRole && 'You lack the required ADMIN_ROLE permissions'}
                    {hasRole && isPaused && 'The system is currently paused'}
                  </p>
                </div>
              </>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={loadCurrentFeeStructure}
              className="flex items-center text-xs px-3 py-1.5 bg-blue-700 hover:bg-blue-600 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            >
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Load Current
            </button>
            
            <button
              onClick={refreshData}
              className="flex items-center text-xs px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>
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
      
      {/* Update Form */}
      {!isLoading && (
        <div className="bg-gray-700/30 rounded-lg p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label htmlFor="programFee" className="block text-sm font-medium text-gray-300 mb-1">
                Program Fee (wei)
              </label>
              <input
                id="programFee"
                type="text"
                value={programFee}
                onChange={(e) => setProgramFee(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-400 mt-1">
                Fee charged when creating a new program
              </p>
            </div>
            
            <div>
              <label htmlFor="subscriptionFee" className="block text-sm font-medium text-gray-300 mb-1">
                Subscription Fee (wei)
              </label>
              <input
                id="subscriptionFee"
                type="text"
                value={subscriptionFee}
                onChange={(e) => setSubscriptionFee(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-400 mt-1">
                Fee charged for subscription services
              </p>
            </div>
            
            <div>
              <label htmlFor="certificateFee" className="block text-sm font-medium text-gray-300 mb-1">
                Certificate Fee (wei)
              </label>
              <input
                id="certificateFee"
                type="text"
                value={certificateFee}
                onChange={(e) => setCertificateFee(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-400 mt-1">
                Fee charged for issuing certificates
              </p>
            </div>
            
            <div>
              <label htmlFor="revenueShare" className="block text-sm font-medium text-gray-300 mb-1">
                Revenue Share (basis points)
              </label>
              <input
                id="revenueShare"
                type="text"
                value={revenueShare}
                onChange={(e) => setRevenueShare(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-400 mt-1">
                Revenue share in basis points (1-10000, where 10000 = 100%)
              </p>
            </div>
          </div>
          
          {/* Error Message */}
          {errorMessage && (
            <div className="w-full bg-red-500/20 text-red-400 border border-red-500/30 rounded-md p-3 mb-4 text-sm">
              {errorMessage}
            </div>
          )}
          
          {/* Description Card */}
          <div className="bg-gray-700/40 rounded-md p-3 mb-4">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-amber-400 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-gray-200">What this does</p>
                <p className="text-xs text-gray-400 mt-1">
                  Updating the default fee structure changes the baseline fees and revenue sharing percentages for all new schools and programs.
                  Existing schools will need to sync their fee structures to adopt these changes.
                </p>
              </div>
            </div>
          </div>
          
          {/* Update Button */}
          <button
            onClick={handleUpdateFeeStructure}
            disabled={isProcessing || !canUpdate || !isFormValid}
            className={`w-full px-4 py-3 rounded-md text-white font-medium flex items-center justify-center ${
              isProcessing || !canUpdate || !isFormValid
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
                Updating...
              </>
            ) : (
              <>
                <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Update Default Fee Structure
              </>
            )}
          </button>
        </div>
      )}
      
      {/* Transaction Success Message */}
      {isUpdateConfirmed && !isUpdateConfirming && (
        <div className="mt-4 bg-green-500/20 text-green-400 border border-green-500/30 rounded-md p-4">
          <div className="flex items-start">
            <svg className="w-5 h-5 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-medium">Default Fee Structure Successfully Updated</p>
              <p className="text-xs mt-1">The default fee structure has been successfully updated. New schools will use these values.</p>
              <div className="mt-2 pt-2 border-t border-green-500/20">
                <p className="text-xs text-gray-300">Transaction Hash:</p>
                <a
                  href={`https://etherscan.io/tx/${updateTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-400 font-mono break-all hover:underline"
                >
                  {updateTxHash}
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Transaction Error Message */}
      {updateError && (
        <div className="mt-4 bg-red-500/20 text-red-400 border border-red-500/30 rounded-md p-4">
          <div className="flex items-start">
            <svg className="w-5 h-5 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-medium">Error Updating Fee Structure</p>
              <p className="text-xs mt-1">
                {(updateError as Error).message || 'An unknown error occurred while updating the default fee structure.'}
              </p>
              <p className="text-xs mt-2 text-gray-300">
                This may happen if one of the fee values is invalid or exceeds system limits.
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
                <div className={`w-2 h-2 rounded-full ${hasRole ? 'bg-green-500' : 'bg-red-500'} mr-2`}></div>
                <p className={`text-sm ${hasRole ? 'text-green-400' : 'text-red-400'}`}>
                  {hasRole ? 'ADMIN_ROLE Granted' : 'Missing ADMIN_ROLE'}
                </p>
              </div>
            </div>
            
            <div className="bg-gray-700/40 rounded-md p-2">
              <p className="text-xs text-gray-400">Contract Status:</p>
              <div className="flex items-center mt-1">
                <div className={`w-2 h-2 rounded-full ${isPaused ? 'bg-red-500' : 'bg-green-500'} mr-2`}></div>
                <p className={`text-sm ${isPaused ? 'text-red-400' : 'text-green-400'}`}>
                  {isPaused ? 'System Paused' : 'System Active'}
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
        <h4 className="text-sm font-medium text-gray-300 mb-2">About Default Fee Structure</h4>
        <p className="text-sm text-gray-400 mb-3">
          This component allows authorized administrators to update the platform's default fee structure. Two security checks are performed:
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <div className="bg-gray-700/20 rounded-md p-3">
            <h5 className="text-xs font-medium text-amber-400 mb-1">Role Verification</h5>
            <p className="text-xs text-gray-400">
              Only addresses with the ADMIN_ROLE can update fee structures, ensuring that financial configurations are restricted to authorized administrators.
            </p>
          </div>
          
          <div className="bg-gray-700/20 rounded-md p-3">
            <h5 className="text-xs font-medium text-amber-400 mb-1">System Status Check</h5>
            <p className="text-xs text-gray-400">
              Fee structures cannot be updated if the system is paused, which might occur during maintenance, upgrades, or security incidents.
            </p>
          </div>
        </div>
        
        <div className="bg-gray-700/20 rounded-md p-3 mb-3">
          <h5 className="text-xs font-medium text-amber-400 mb-1">Fee Structure Components</h5>
          <p className="text-xs text-gray-400 mb-2">
            The default fee structure consists of multiple components:
          </p>
          <ul className="text-xs text-gray-400 space-y-2">
            <li className="flex items-start">
              <span className="text-amber-400 mr-2">•</span>
              <span><strong>Program Fee:</strong> One-time fee charged when creating a new educational program</span>
            </li>
            <li className="flex items-start">
              <span className="text-amber-400 mr-2">•</span>
              <span><strong>Subscription Fee:</strong> Recurring fee for subscription-based access to platform services</span>
            </li>
            <li className="flex items-start">
              <span className="text-amber-400 mr-2">•</span>
              <span><strong>Certificate Fee:</strong> Fee charged when issuing certificates to students</span>
            </li>
            <li className="flex items-start">
              <span className="text-amber-400 mr-2">•</span>
              <span><strong>Revenue Share:</strong> Percentage of revenue shared with the platform (in basis points, where 10000 = 100%)</span>
            </li>
          </ul>
        </div>
        
        <p className="text-xs text-gray-400">
          After updating the default fee structure, you may need to use the Fee Structure Sync tool to apply these changes to existing schools.
          The new fee structure will automatically apply to any newly created schools.
        </p>
      </div>
    </motion.div>
  );
};

export default DefaultFeeStructureUpdate;