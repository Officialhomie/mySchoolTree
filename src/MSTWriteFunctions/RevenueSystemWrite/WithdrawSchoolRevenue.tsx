import { useState, useEffect } from 'react';
import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';

/**
 * SchoolRevenueWithdrawal Component
 * 
 * This component allows school administrators to withdraw their accumulated revenue.
 * It implements two critical security checks:
 * 1. Verifies the caller has the SCHOOL_ADMIN_ROLE
 * 2. Confirms the contract is not paused before processing transactions
 */
interface SchoolRevenueWithdrawalProps {
  revenueContract: any; // Contract for withdrawing revenue
  roleContract: any; // Contract for checking SCHOOL_ADMIN_ROLE
  pauseContract: any; // Contract for checking pause status
  onWithdrawComplete?: (txHash: string) => void; // Optional callback
}

const SchoolRevenueWithdrawal = ({
  revenueContract,
  roleContract,
  pauseContract,
  onWithdrawComplete
}: SchoolRevenueWithdrawalProps) => {
  // Current user's address
  const { address: connectedAddress } = useAccount();
  
  // Status tracking
  const [canWithdraw, setCanWithdraw] = useState<boolean>(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [availableBalance, setAvailableBalance] = useState<string>('0');
  
  // Fetch the SCHOOL_ADMIN_ROLE identifier
  const { 
    data: schoolAdminRoleData,
    isLoading: isLoadingRoleId,
    isError: isRoleIdError
  } = useReadContract({
    ...roleContract,
    functionName: 'SCHOOL_ADMIN_ROLE'
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
  
  // Check if the current user has the SCHOOL_ADMIN_ROLE
  const {
    data: hasRoleData,
    isLoading: isLoadingRoleCheck,
    isError: isRoleCheckError,
    refetch: refetchRoleCheck
  } = useReadContract({
    ...roleContract,
    functionName: 'hasRole',
    args: schoolAdminRoleData && connectedAddress ? [
      schoolAdminRoleData as `0x${string}`,
      connectedAddress
    ] : undefined,
    query: {
      enabled: !!schoolAdminRoleData && !!connectedAddress
    }
  });
  
  // Get available balance to withdraw
  const {
    data: balanceData,
    isLoading: isLoadingBalance,
    isError: isBalanceError,
    refetch: refetchBalance
  } = useReadContract({
    ...revenueContract,
    functionName: 'getWithdrawableAmount',
    args: connectedAddress ? [connectedAddress] : undefined,
    query: {
      enabled: !!connectedAddress
    }
  });
  
  // Contract write state for withdrawing revenue
  const {
    data: withdrawTxHash,
    error: withdrawTxError,
    isPending: isWithdrawPending,
    writeContract: writeWithdrawRevenue
  } = useWriteContract();
  
  // Transaction receipt state
  const {
    isLoading: isWithdrawConfirming,
    isSuccess: isWithdrawConfirmed,
    error: withdrawConfirmError
  } = useWaitForTransactionReceipt({
    hash: withdrawTxHash,
  });
  
  // Combined loading state
  const isLoading = isLoadingRoleId || isLoadingPauseStatus || isLoadingRoleCheck || isLoadingBalance;
  
  // Combined processing state
  const isProcessing = isWithdrawPending || isWithdrawConfirming;
  
  // Combined error state
  const withdrawError = withdrawTxError || withdrawConfirmError;
  
  // Update available balance
  useEffect(() => {
    if (balanceData) {
      setAvailableBalance(balanceData.toString());
    }
  }, [balanceData]);
  
  // Update canWithdraw when role and pause data are loaded
  useEffect(() => {
    if (!isLoading) {
      const hasRole = Boolean(hasRoleData);
      const isPaused = Boolean(pausedStatus);
      const hasBalance = balanceData !== undefined && balanceData !== null && BigInt(balanceData as string) > BigInt(0);
      
      setCanWithdraw(hasRole && !isPaused && hasBalance);
      setLastChecked(new Date());
    }
  }, [hasRoleData, pausedStatus, balanceData, isLoading]);
  // Helper to format time since last check
  const getTimeSinceLastCheck = () => {
    if (!lastChecked) return 'Never checked';
    return formatDistanceToNow(lastChecked, { addSuffix: true });
  };
  
  // Format wei to ETH
  const formatWeiToEth = (weiAmount: string) => {
    try {
      const wei = BigInt(weiAmount);
      const eth = Number(wei) / 1e18;
      return eth.toFixed(6);
    } catch (error) {
      return '0.000000';
    }
  };
  
  // Handle withdrawing revenue
  const handleWithdrawRevenue = () => {
    // Re-check permissions and system status
    if (!canWithdraw) {
      if (!Boolean(hasRoleData)) {
        setErrorMessage('You do not have the SCHOOL_ADMIN_ROLE required to withdraw revenue');
      } else if (Boolean(pausedStatus)) {
        setErrorMessage('System is paused. Cannot withdraw revenue at this time');
      } else if (balanceData !== undefined && balanceData !== null && BigInt(balanceData.toString()) <= BigInt(0)) {
        setErrorMessage('No revenue available to withdraw');
      } else {
        setErrorMessage('Unable to withdraw revenue due to system constraints');
      }
      return;
    }
    
    // All checks passed, withdraw the revenue
    try {
      setErrorMessage('');
      writeWithdrawRevenue({
        ...revenueContract,
        functionName: 'withdrawSchoolRevenue'
      });
    } catch (err) {
      console.error('Error withdrawing revenue:', err);
      setErrorMessage('Error initiating transaction');
    }
  };
  
  // Handle successful revenue withdrawal
  useEffect(() => {
    if (isWithdrawConfirmed && !isWithdrawConfirming) {
      // Call the callback if provided
      if (onWithdrawComplete && withdrawTxHash) {
        onWithdrawComplete(withdrawTxHash);
      }
      
      // Refresh data
      refetchRoleCheck();
      refetchPauseStatus();
      refetchBalance();
      setLastChecked(new Date());
    }
  }, [isWithdrawConfirmed, isWithdrawConfirming, withdrawTxHash, onWithdrawComplete, refetchRoleCheck, refetchPauseStatus, refetchBalance]);
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-gray-800/50 border border-gray-700 rounded-lg p-4"
    >
      <h3 className="text-lg font-medium text-amber-400 mb-3">
        School Revenue Withdrawal
      </h3>
      
      {/* System Status Banner */}
      {!isLoading && (
        <div className={`flex items-center justify-between p-4 rounded-lg border mb-4 ${
          canWithdraw 
            ? 'bg-green-900/20 border-green-700/30' 
            : 'bg-red-900/20 border-red-700/30'
        }`}>
          <div className="flex items-center">
            {canWithdraw ? (
              <>
                <div className="w-3 h-3 bg-green-500 rounded-full mr-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                </div>
                <div>
                  <h4 className="text-md font-medium text-green-400">Ready to Withdraw</h4>
                  <p className="text-xs text-gray-300 mt-0.5">You can withdraw your school's revenue</p>
                </div>
              </>
            ) : (
              <>
                <div className="w-3 h-3 bg-red-500 rounded-full mr-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                </div>
                <div>
                  <h4 className="text-md font-medium text-red-400">Withdrawal Unavailable</h4>
                  <p className="text-xs text-gray-300 mt-0.5">
                    {!Boolean(hasRoleData) && 'You lack the required SCHOOL_ADMIN_ROLE permissions'}
                    {Boolean(hasRoleData) && Boolean(pausedStatus) && 'The system is currently paused'}
                    {Boolean(hasRoleData) && !Boolean(pausedStatus) && balanceData !== undefined && balanceData !== null && BigInt(balanceData.toString()) <= BigInt(0) && 'No revenue available to withdraw'}
                  </p>
                </div>
              </>
            )}
          </div>
          
          <button
            onClick={() => {
              refetchRoleCheck();
              refetchPauseStatus();
              refetchBalance();
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
      
      {isBalanceError && (
        <div className="bg-red-500/20 text-red-400 border border-red-500/30 rounded-md p-4 mb-4">
          <div className="flex items-start">
            <svg className="w-5 h-5 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-medium">Balance Check Error</p>
              <p className="text-xs mt-1">Unable to check your available revenue balance. Please try again later.</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Available Balance Card */}
      {!isLoading && !isBalanceError && (
        <div className="bg-gray-700/30 rounded-lg p-4 mb-4">
          <div className="mb-4">
            <h4 className="text-md font-medium text-gray-300 mb-2">Available Revenue</h4>
            <div className="bg-gray-800/70 rounded-lg p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400">Amount available to withdraw:</p>
                <div className="flex items-baseline mt-1">
                  <p className="text-xl font-semibold text-amber-400">{formatWeiToEth(availableBalance)}</p>
                  <p className="text-sm text-gray-300 ml-2">ETH</p>
                </div>
              </div>
              <div className="bg-gray-700/50 rounded-full p-3">
                <svg className="w-8 h-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
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
                  This will withdraw all available revenue from your school's account directly to your connected wallet address.
                  The transaction will fail if there is no revenue to withdraw or if you don't have the proper permissions.
                </p>
              </div>
            </div>
          </div>
          
          {/* Withdraw Button */}
          <button
            onClick={handleWithdrawRevenue}
            disabled={isProcessing || !canWithdraw}
            className={`w-full px-4 py-3 rounded-md text-white font-medium flex items-center justify-center ${
              isProcessing || !canWithdraw
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
                Processing Withdrawal...
              </>
            ) : (
              <>
                <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Withdraw School Revenue
              </>
            )}
          </button>
        </div>
      )}
      
      {/* Transaction Success Message */}
      {isWithdrawConfirmed && !isWithdrawConfirming && (
        <div className="mt-4 bg-green-500/20 text-green-400 border border-green-500/30 rounded-md p-4">
          <div className="flex items-start">
            <svg className="w-5 h-5 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-medium">Revenue Successfully Withdrawn</p>
              <p className="text-xs mt-1">Your school's revenue has been successfully withdrawn to your wallet.</p>
              <div className="mt-2 pt-2 border-t border-green-500/20">
                <p className="text-xs text-gray-300">Transaction Hash:</p>
                <a
                  href={`https://etherscan.io/tx/${withdrawTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-400 font-mono break-all hover:underline"
                >
                  {withdrawTxHash}
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Transaction Error Message */}
      {withdrawError && (
        <div className="mt-4 bg-red-500/20 text-red-400 border border-red-500/30 rounded-md p-4">
          <div className="flex items-start">
            <svg className="w-5 h-5 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-medium">Error Withdrawing Revenue</p>
              <p className="text-xs mt-1">
                {(withdrawError as Error).message || 'An unknown error occurred while withdrawing your revenue.'}
              </p>
              <p className="text-xs mt-2 text-gray-300">
                This may happen if there is no revenue to withdraw or if you don't have the proper permissions.
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
                  {Boolean(hasRoleData) ? 'SCHOOL_ADMIN_ROLE Granted' : 'Missing SCHOOL_ADMIN_ROLE'}
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
        <h4 className="text-sm font-medium text-gray-300 mb-2">About School Revenue Withdrawal</h4>
        <p className="text-sm text-gray-400 mb-3">
          This component allows school administrators to withdraw their accumulated revenue from the platform. Two security checks are performed:
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <div className="bg-gray-700/20 rounded-md p-3">
            <h5 className="text-xs font-medium text-amber-400 mb-1">Role Verification</h5>
            <p className="text-xs text-gray-400">
              Only addresses with the SCHOOL_ADMIN_ROLE can withdraw school revenue, ensuring that funds are only accessible to authorized school administrators.
            </p>
          </div>
          
          <div className="bg-gray-700/20 rounded-md p-3">
            <h5 className="text-xs font-medium text-amber-400 mb-1">System Status Check</h5>
            <p className="text-xs text-gray-400">
              Revenue cannot be withdrawn if the system is paused, which might occur during maintenance, upgrades, or security incidents.
            </p>
          </div>
        </div>
        
        <div className="bg-gray-700/20 rounded-md p-3 mb-3">
          <h5 className="text-xs font-medium text-amber-400 mb-1">Revenue Sources</h5>
          <p className="text-xs text-gray-400 mb-2">
            School revenue typically comes from the following sources:
          </p>
          <ul className="text-xs text-gray-400 space-y-2">
            <li className="flex items-start">
              <span className="text-amber-400 mr-2">•</span>
              <span>Student enrollment fees</span>
            </li>
            <li className="flex items-start">
              <span className="text-amber-400 mr-2">•</span>
              <span>Program participation fees</span>
            </li>
            <li className="flex items-start">
              <span className="text-amber-400 mr-2">•</span>
              <span>Certificate issuance fees</span>
            </li>
            <li className="flex items-start">
              <span className="text-amber-400 mr-2">•</span>
              <span>Revenue sharing with affiliated educators</span>
            </li>
          </ul>
        </div>
        
        <p className="text-xs text-gray-400">
          When you withdraw school revenue, the entire available balance will be transferred to your connected wallet address.
          Make sure your wallet is secure and that you have access to its private keys before proceeding.
        </p>
      </div>
    </motion.div>
  );
};

export default SchoolRevenueWithdrawal;