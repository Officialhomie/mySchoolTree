import { useState, useEffect } from 'react';
import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { parseEther } from 'viem';

/**
 * SchoolFeeManager Component
 * 
 * This component allows administrators to set custom fee structures for schools.
 * It implements two critical security checks:
 * 1. Verifies the caller has the ADMIN_ROLE
 * 2. Confirms the contract is not paused before processing transactions
 */
interface SchoolFeeManagerProps {
  feeContract: any; // Contract for setting fee structures
  roleContract: any; // Contract for checking ADMIN_ROLE
  pauseContract: any; // Contract for checking pause status
  onFeeStructureComplete?: (txHash: string) => void; // Optional callback
}

const SchoolFeeManager = ({
  feeContract,
  roleContract,
  pauseContract,
  onFeeStructureComplete
}: SchoolFeeManagerProps) => {
  // Current user's address
  const { address: connectedAddress } = useAccount();
  
  // Form state
  const [schoolAddress, setSchoolAddress] = useState<string>('');
  const [programFee, setProgramFee] = useState<string>('');
  const [subscriptionFee, setSubscriptionFee] = useState<string>('');
  const [certificateFee, setCertificateFee] = useState<string>('');
  const [revenueShare, setRevenueShare] = useState<string>('');
  
  // Converted values to wei
  const [programFeeWei, setProgramFeeWei] = useState<bigint>(BigInt(0));
  const [subscriptionFeeWei, setSubscriptionFeeWei] = useState<bigint>(BigInt(0));
  const [certificateFeeWei, setCertificateFeeWei] = useState<bigint>(BigInt(0));
  const [revenueSharePercentage, setRevenueSharePercentage] = useState<bigint>(BigInt(0));
  
  // Status tracking
  const [canSetFees, setCanSetFees] = useState<boolean>(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isFormValid, setIsFormValid] = useState<boolean>(false);
  
  // Get school management contract address
  const {
    data: schoolManagementAddress,
    isLoading: isLoadingSchoolManagement,
    isError: isSchoolManagementError
  } = useReadContract({
    ...feeContract,
    functionName: 'schoolManagement'
  });
  
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
  
  // Contract write state for setting fee structure
  const {
    data: feeTxHash,
    error: feeTxError,
    isPending: isFeePending,
    writeContract: writeSetFeeStructure
  } = useWriteContract();
  
  // Transaction receipt state
  const {
    isLoading: isFeeConfirming,
    isSuccess: isFeeConfirmed,
    error: feeConfirmError
  } = useWaitForTransactionReceipt({
    hash: feeTxHash,
  });
  
  // Combined loading state
  const isLoading = isLoadingRoleId || isLoadingPauseStatus || isLoadingRoleCheck || isLoadingSchoolManagement;
  
  // Combined processing state
  const isProcessing = isFeePending || isFeeConfirming;
  
  // Combined error state
  const feeError = feeTxError || feeConfirmError;
  
  // Update canSetFees when role and pause data are loaded
  useEffect(() => {
    if (!isLoading) {
      const hasRole = Boolean(hasRoleData);
      const isPaused = Boolean(pausedStatus);
      
      setCanSetFees(hasRole && !isPaused);
      setLastChecked(new Date());
    }
  }, [hasRoleData, pausedStatus, isLoading]);
  
  // Update fee values in Wei/percentage when string values change
  useEffect(() => {
    try {
      // Convert ETH values to Wei
      if (programFee && !isNaN(parseFloat(programFee))) {
        setProgramFeeWei(parseEther(programFee));
      } else {
        setProgramFeeWei(BigInt(0));
      }
      
      if (subscriptionFee && !isNaN(parseFloat(subscriptionFee))) {
        setSubscriptionFeeWei(parseEther(subscriptionFee));
      } else {
        setSubscriptionFeeWei(BigInt(0));
      }
      
      if (certificateFee && !isNaN(parseFloat(certificateFee))) {
        setCertificateFeeWei(parseEther(certificateFee));
      } else {
        setCertificateFeeWei(BigInt(0));
      }
      
      // Convert percentage to basis points (100% = 10000)
      if (revenueShare && !isNaN(parseFloat(revenueShare))) {
        const percentage = parseFloat(revenueShare);
        if (percentage >= 0 && percentage <= 100) {
          // Convert percentage to basis points (e.g., 25.5% = 2550)
          setRevenueSharePercentage(BigInt(Math.round(percentage * 100)));
        } else {
          setRevenueSharePercentage(BigInt(0));
        }
      } else {
        setRevenueSharePercentage(BigInt(0));
      }
    } catch (err) {
      console.error('Error parsing fee values:', err);
    }
  }, [programFee, subscriptionFee, certificateFee, revenueShare]);
  
  // Validate form
  useEffect(() => {
    const isAddressValid = /^0x[a-fA-F0-9]{40}$/.test(schoolAddress);
    
    const isProgramFeeValid = programFee.trim() !== '' && !isNaN(parseFloat(programFee)) && parseFloat(programFee) >= 0;
    const isSubscriptionFeeValid = subscriptionFee.trim() !== '' && !isNaN(parseFloat(subscriptionFee)) && parseFloat(subscriptionFee) >= 0;
    const isCertificateFeeValid = certificateFee.trim() !== '' && !isNaN(parseFloat(certificateFee)) && parseFloat(certificateFee) >= 0;
    
    const isRevenueShareValid = revenueShare.trim() !== '' && 
                               !isNaN(parseFloat(revenueShare)) && 
                               parseFloat(revenueShare) >= 0 && 
                               parseFloat(revenueShare) <= 100;
    
    setIsFormValid(
      isAddressValid && 
      isProgramFeeValid && 
      isSubscriptionFeeValid && 
      isCertificateFeeValid && 
      isRevenueShareValid
    );
  }, [schoolAddress, programFee, subscriptionFee, certificateFee, revenueShare]);
  
  // Helper to format time since last check
  const getTimeSinceLastCheck = () => {
    if (!lastChecked) return 'Never checked';
    return formatDistanceToNow(lastChecked, { addSuffix: true });
  };
  
  // Handle setting fee structure
  const handleSetFeeStructure = () => {
    // Re-check permissions and system status
    if (!canSetFees) {
      if (!Boolean(hasRoleData)) {
        setErrorMessage('You do not have the ADMIN_ROLE required to set fee structures');
      } else if (Boolean(pausedStatus)) {
        setErrorMessage('System is paused. Cannot set fee structures at this time');
      } else {
        setErrorMessage('Unable to set fee structure due to system constraints');
      }
      return;
    }
    
    // Validate input data
    if (!isFormValid) {
      if (!/^0x[a-fA-F0-9]{40}$/.test(schoolAddress)) {
        setErrorMessage('Please enter a valid Ethereum address for the school');
      } else if (!programFee || isNaN(parseFloat(programFee)) || parseFloat(programFee) < 0) {
        setErrorMessage('Please enter a valid program fee amount (must be 0 or greater)');
      } else if (!subscriptionFee || isNaN(parseFloat(subscriptionFee)) || parseFloat(subscriptionFee) < 0) {
        setErrorMessage('Please enter a valid subscription fee amount (must be 0 or greater)');
      } else if (!certificateFee || isNaN(parseFloat(certificateFee)) || parseFloat(certificateFee) < 0) {
        setErrorMessage('Please enter a valid certificate fee amount (must be 0 or greater)');
      } else if (!revenueShare || isNaN(parseFloat(revenueShare)) || parseFloat(revenueShare) < 0 || parseFloat(revenueShare) > 100) {
        setErrorMessage('Please enter a valid revenue share percentage (between 0 and 100)');
      } else {
        setErrorMessage('Please check the fee structure details and try again');
      }
      return;
    }
    
    // All checks passed, set the fee structure
    try {
      setErrorMessage('');
      writeSetFeeStructure({
        ...feeContract,
        functionName: 'setCustomFeeStructure',
        args: [
          schoolAddress as `0x${string}`, 
          programFeeWei,
          subscriptionFeeWei,
          certificateFeeWei,
          revenueSharePercentage
        ]
      });
    } catch (err) {
      console.error('Error setting fee structure:', err);
      setErrorMessage('Error initiating transaction');
    }
  };
  
  // Handle successful fee structure setting
  useEffect(() => {
    if (isFeeConfirmed && !isFeeConfirming) {
      // Call the callback if provided
      if (onFeeStructureComplete && feeTxHash) {
        onFeeStructureComplete(feeTxHash);
      }
      
      // Reset form (optionally)
      // setSchoolAddress('');
      // setProgramFee('');
      // setSubscriptionFee('');
      // setCertificateFee('');
      // setRevenueShare('');
      
      // Refresh data
      refetchRoleCheck();
      refetchPauseStatus();
      setLastChecked(new Date());
    }
  }, [isFeeConfirmed, isFeeConfirming, feeTxHash, onFeeStructureComplete, refetchRoleCheck, refetchPauseStatus]);
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-gray-800/50 border border-gray-700 rounded-lg p-4"
    >
      <h3 className="text-lg font-medium text-amber-400 mb-3">
        School Fee Structure Manager
      </h3>
      
      {/* System Info Banner */}
      {!isLoading && schoolManagementAddress !== undefined && (
        <div className="bg-gray-700/30 rounded-lg p-3 mb-4">
          <div className="flex items-center">
            <svg className="w-4 h-4 text-amber-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-gray-300">
              Connected to School Management system at: 
              <span className="ml-1 text-amber-400 font-mono text-xs">
                {schoolManagementAddress as string}
              </span>
            </p>
          </div>
        </div>
      )}
      
      {/* System Status Banner */}
      {!isLoading && (
        <div className={`flex items-center justify-between p-4 rounded-lg border mb-4 ${
          canSetFees 
            ? 'bg-green-900/20 border-green-700/30' 
            : 'bg-red-900/20 border-red-700/30'
        }`}>
          <div className="flex items-center">
            {canSetFees ? (
              <>
                <div className="w-3 h-3 bg-green-500 rounded-full mr-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                </div>
                <div>
                  <h4 className="text-md font-medium text-green-400">System Ready</h4>
                  <p className="text-xs text-gray-300 mt-0.5">You can set custom fee structures</p>
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
      
      {isSchoolManagementError && (
        <div className="bg-red-500/20 text-red-400 border border-red-500/30 rounded-md p-4 mb-4">
          <div className="flex items-start">
            <svg className="w-5 h-5 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-medium">Contract Address Error</p>
              <p className="text-xs mt-1">Unable to fetch the School Management contract address. Please try again later.</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Fee Structure Form */}
      {!isLoading && (
        <div className="bg-gray-700/30 rounded-lg p-4 mb-4">
          <div className="mb-4">
            <label htmlFor="schoolAddress" className="block text-sm font-medium text-gray-300 mb-1">
              School Address
            </label>
            <input
              id="schoolAddress"
              type="text"
              value={schoolAddress}
              onChange={(e) => setSchoolAddress(e.target.value)}
              placeholder="0x..."
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-400 mt-1">
              Enter the Ethereum address of the school for this custom fee structure
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label htmlFor="programFee" className="block text-sm font-medium text-gray-300 mb-1">
                Program Fee (ETH)
              </label>
              <div className="relative">
                <input
                  id="programFee"
                  type="text"
                  value={programFee}
                  onChange={(e) => setProgramFee(e.target.value)}
                  placeholder="0.0"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <span className="text-gray-400">ETH</span>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Base fee for new program registration
              </p>
            </div>
            
            <div>
              <label htmlFor="subscriptionFee" className="block text-sm font-medium text-gray-300 mb-1">
                Subscription Fee (ETH)
              </label>
              <div className="relative">
                <input
                  id="subscriptionFee"
                  type="text"
                  value={subscriptionFee}
                  onChange={(e) => setSubscriptionFee(e.target.value)}
                  placeholder="0.0"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <span className="text-gray-400">ETH</span>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Recurring subscription cost
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label htmlFor="certificateFee" className="block text-sm font-medium text-gray-300 mb-1">
                Certificate Fee (ETH)
              </label>
              <div className="relative">
                <input
                  id="certificateFee"
                  type="text"
                  value={certificateFee}
                  onChange={(e) => setCertificateFee(e.target.value)}
                  placeholder="0.0"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <span className="text-gray-400">ETH</span>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Fee for issuing digital certificates
              </p>
            </div>
            
            <div>
              <label htmlFor="revenueShare" className="block text-sm font-medium text-gray-300 mb-1">
                Revenue Share (%)
              </label>
              <div className="relative">
                <input
                  id="revenueShare"
                  type="text"
                  value={revenueShare}
                  onChange={(e) => setRevenueShare(e.target.value)}
                  placeholder="0.0"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <span className="text-gray-400">%</span>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Percentage of revenue shared with the platform (0-100%)
              </p>
            </div>
          </div>
          
          {/* Error Message */}
          {errorMessage && (
            <div className="w-full bg-red-500/20 text-red-400 border border-red-500/30 rounded-md p-3 mb-4 text-sm">
              {errorMessage}
            </div>
          )}
          
          {/* Set Fee Structure Button */}
          <button
            onClick={handleSetFeeStructure}
            disabled={isProcessing || !canSetFees || !isFormValid}
            className={`w-full px-4 py-3 rounded-md text-white font-medium flex items-center justify-center ${
              isProcessing || !canSetFees || !isFormValid
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
                Setting Fee Structure...
              </>
            ) : (
              <>
                <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Set Custom Fee Structure
              </>
            )}
          </button>
        </div>
      )}
      
      {/* Transaction Success Message */}
      {isFeeConfirmed && !isFeeConfirming && (
        <div className="mt-4 bg-green-500/20 text-green-400 border border-green-500/30 rounded-md p-4">
          <div className="flex items-start">
            <svg className="w-5 h-5 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-medium">Fee Structure Successfully Set</p>
              <p className="text-xs mt-1">The custom fee structure for the school has been successfully applied.</p>
              <div className="mt-2 pt-2 border-t border-green-500/20">
                <p className="text-xs text-gray-300">Transaction Hash:</p>
                <a
                  href={`https://etherscan.io/tx/${feeTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-400 font-mono break-all hover:underline"
                >
                  {feeTxHash}
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Transaction Error Message */}
      {feeError && (
        <div className="mt-4 bg-red-500/20 text-red-400 border border-red-500/30 rounded-md p-4">
          <div className="flex items-start">
            <svg className="w-5 h-5 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-medium">Error Setting Fee Structure</p>
              <p className="text-xs mt-1">
                {(feeError as Error).message || 'An unknown error occurred while setting the fee structure.'}
              </p>
              <p className="text-xs mt-2 text-gray-300">
                This may happen if the school address is invalid or if there is an issue with the transaction parameters.
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
        <h4 className="text-sm font-medium text-gray-300 mb-2">About Fee Structure Management</h4>
        <p className="text-sm text-gray-400 mb-3">
          This component allows authorized administrators to set custom fee structures for specific schools. Two security checks are performed:
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <div className="bg-gray-700/20 rounded-md p-3">
            <h5 className="text-xs font-medium text-amber-400 mb-1">Role Verification</h5>
            <p className="text-xs text-gray-400">
              Only addresses with the ADMIN_ROLE can set fee structures, ensuring that financial configurations are restricted to authorized administrators.
            </p>
          </div>
          
          <div className="bg-gray-700/20 rounded-md p-3">
            <h5 className="text-xs font-medium text-amber-400 mb-1">System Status Check</h5>
            <p className="text-xs text-gray-400">
              Fee structures cannot be modified if the system is paused, which might occur during maintenance, upgrades, or security incidents.
            </p>
          </div>
        </div>
        
        <div className="bg-gray-700/20 rounded-md p-3 mb-3">
          <h5 className="text-xs font-medium text-amber-400 mb-1">Fee Structure Components</h5>
          <ul className="text-xs text-gray-400 space-y-2 mt-2">
            <li className="flex items-start">
              <span className="text-amber-400 mr-2">•</span>
              <span><strong>Program Fee:</strong> One-time fee charged when a school registers a new educational program</span>
            </li>
            <li className="flex items-start">
              <span className="text-amber-400 mr-2">•</span>
              <span><strong>Subscription Fee:</strong> Recurring fee for maintaining active status on the platform</span>
            </li>
            <li className="flex items-start">
              <span className="text-amber-400 mr-2">•</span>
              <span><strong>Certificate Fee:</strong> Fee charged for each certificate issued to students</span>
            </li>
            <li className="flex items-start">
              <span className="text-amber-400 mr-2">•</span>
              <span><strong>Revenue Share:</strong> Percentage of the school's revenue shared with the platform</span>
            </li>
          </ul>
        </div>
        
        <p className="text-xs text-gray-400">
          Custom fee structures allow for tailored financial agreements with different educational institutions based on their size, offerings, and relationship with the platform.
        </p>
      </div>
    </motion.div>
  );
};

export default SchoolFeeManager;