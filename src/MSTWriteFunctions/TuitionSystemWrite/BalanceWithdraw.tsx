import { useState, useEffect } from 'react';
import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { formatEther } from 'viem';
import { contractTuitionSystemConfig } from '../../contracts';

/**
 * BalanceWithdrawer Component
 * 
 * This component allows administrators to withdraw the contract's balance.
 * It implements two critical security checks:
 * 1. Verifies the caller has the ADMIN_ROLE
 * 2. Confirms the contract is not paused before processing transactions
 * 
 * Enhanced with exportable data for use in other components.
 */

export interface WithdrawalData {
  contractBalance: bigint;
  canWithdraw: boolean;
  hasAdminRole: boolean | null;
  isSystemPaused: boolean | null;
  lastChecked: Date | null;
  errorMessage: string;
}

export interface WithdrawalResult {
  status: 'idle' | 'checking' | 'pending' | 'confirming' | 'success' | 'error';
  withdrawalData: WithdrawalData;
  hash?: string;
  error?: Error | null;
}

interface BalanceWithdrawerProps {
  withdrawContract?: any; // Contract for withdrawing balance, optional with default value
  roleContract?: any; // Contract for checking ADMIN_ROLE, optional with default value
  pauseContract?: any; // Contract for checking pause status, optional with default value
  onWithdrawalComplete?: (txHash: string) => void; // Optional callback
  onWithdrawalDataChange?: (withdrawalData: WithdrawalData) => void; // New callback for when withdrawal data changes
  onWithdrawalStateChange?: (result: WithdrawalResult) => void; // New callback for withdrawal state changes
  initialWithdrawalData?: WithdrawalData; // Optional initial withdrawal data
}

const BalanceWithdrawer = ({
  withdrawContract = contractTuitionSystemConfig,
  roleContract = contractTuitionSystemConfig,
  pauseContract = contractTuitionSystemConfig,
  onWithdrawalComplete,
  onWithdrawalDataChange,
  onWithdrawalStateChange,
  initialWithdrawalData
}: BalanceWithdrawerProps) => {
  // Current user's address
  const { address: connectedAddress } = useAccount();
  
  // Status tracking
  const [canWithdraw, setCanWithdraw] = useState<boolean>(initialWithdrawalData?.canWithdraw || false);
  const [lastChecked, setLastChecked] = useState<Date | null>(initialWithdrawalData?.lastChecked || null);
  const [errorMessage, setErrorMessage] = useState<string>(initialWithdrawalData?.errorMessage || '');
  const [contractBalance, setContractBalance] = useState<bigint>(initialWithdrawalData?.contractBalance || BigInt(0));
  const [hasAdminRole, setHasAdminRole] = useState<boolean | null>(initialWithdrawalData?.hasAdminRole || null);
  const [isSystemPaused, setIsSystemPaused] = useState<boolean | null>(initialWithdrawalData?.isSystemPaused || null);
  
  // Current withdrawal data object
  const withdrawalData: WithdrawalData = {
    contractBalance,
    canWithdraw,
    hasAdminRole,
    isSystemPaused,
    lastChecked,
    errorMessage
  };
  
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
  
  // Get contract balance
  const {
    data: balanceData,
    isLoading: isLoadingBalance,
    isError: isBalanceError,
    refetch: refetchBalance
  } = useReadContract({
    ...withdrawContract,
    functionName: 'getBalance',
    query: {
      enabled: true
    }
  });
  
  // Contract write state for withdrawing balance
  const {
    data: withdrawTxHash,
    error: withdrawTxError,
    isPending: isWithdrawPending,
    writeContract: writeWithdrawBalance
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

  // Determine withdrawal status
  const getWithdrawalStatus = (): 'idle' | 'checking' | 'pending' | 'confirming' | 'success' | 'error' => {
    if (isWithdrawConfirmed) return 'success';
    if (withdrawError) return 'error';
    if (isWithdrawConfirming) return 'confirming';
    if (isWithdrawPending) return 'pending';
    if (isLoading) return 'checking';
    return 'idle';
  };

  // Current withdrawal state
  const withdrawalState: WithdrawalResult = {
    status: getWithdrawalStatus(),
    withdrawalData,
    hash: withdrawTxHash,
    error: withdrawError as Error | null
  };

  // Update parent component when withdrawal data changes
  useEffect(() => {
    if (onWithdrawalDataChange) {
      onWithdrawalDataChange(withdrawalData);
    }
  }, [contractBalance, canWithdraw, hasAdminRole, isSystemPaused, lastChecked, errorMessage, onWithdrawalDataChange]);

  // Update parent component when withdrawal state changes
  useEffect(() => {
    if (onWithdrawalStateChange) {
      onWithdrawalStateChange(withdrawalState);
    }
  }, [withdrawalState, onWithdrawalStateChange]);
  
  // Update canWithdraw when role and pause data are loaded
  useEffect(() => {
    if (!isLoading) {
      const hasRole = Boolean(hasRoleData);
      const isPaused = Boolean(pausedStatus);
      
      setHasAdminRole(hasRole);
      setIsSystemPaused(isPaused);
      setCanWithdraw(hasRole && !isPaused);
      setLastChecked(new Date());
      
      if (balanceData) {
        setContractBalance(balanceData as bigint);
      }
    }
  }, [hasRoleData, pausedStatus, balanceData, isLoading]);
  
  // Helper to format time since last check
  const getTimeSinceLastCheck = () => {
    if (!lastChecked) return 'Never checked';
    return formatDistanceToNow(lastChecked, { addSuffix: true });
  };
  
  // Handle withdrawal
  const handleWithdraw = () => {
    // Re-check permissions and system status
    if (!canWithdraw) {
      if (!Boolean(hasRoleData)) {
        setErrorMessage('You do not have the ADMIN_ROLE required to withdraw funds');
      } else if (Boolean(pausedStatus)) {
        setErrorMessage('System is paused. Cannot withdraw funds at this time');
      } else {
        setErrorMessage('Unable to withdraw funds due to system constraints');
      }
      return;
    }
    
    // Check if there's a balance to withdraw
    if (!contractBalance || contractBalance <= BigInt(0)) {
      setErrorMessage('No balance available to withdraw');
      return;
    }
    
    // All checks passed, withdraw the balance
    try {
      setErrorMessage('');
      writeWithdrawBalance({
        ...withdrawContract,
        functionName: 'withdrawBalance',
        args: []
      });
    } catch (err) {
      console.error('Error withdrawing balance:', err);
      setErrorMessage('Error initiating transaction');
    }
  };
  
  // Handle successful withdrawal
  useEffect(() => {
    if (isWithdrawConfirmed && !isWithdrawConfirming) {
      // Call the callback if provided
      if (onWithdrawalComplete && withdrawTxHash) {
        onWithdrawalComplete(withdrawTxHash);
      }
      
      // Refresh data
      refetchRoleCheck();
      refetchPauseStatus();
      refetchBalance();
      setLastChecked(new Date());
    }
  }, [isWithdrawConfirmed, isWithdrawConfirming, withdrawTxHash, onWithdrawalComplete, refetchRoleCheck, refetchPauseStatus, refetchBalance]);
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-gray-800/50 border border-gray-700 rounded-lg p-4"
    >
      <h3 className="text-lg font-medium text-amber-400 mb-3">
        Contract Balance Manager
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
                  <h4 className="text-md font-medium text-green-400">System Ready</h4>
                  <p className="text-xs text-gray-300 mt-0.5">You can withdraw the contract balance</p>
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
              <p className="text-xs mt-1">Unable to fetch contract balance. Please try again later.</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Balance Display */}
      {!isLoading && (
        <div className="bg-gray-700/30 rounded-lg p-4 mb-4">
          <div className="flex flex-col items-center justify-center">
            <h4 className="text-sm font-medium text-gray-300 mb-2">Current Contract Balance</h4>
            <div className="text-2xl font-bold text-amber-400 mb-2">
              {contractBalance ? `${formatEther(contractBalance)} ETH` : '0 ETH'}
            </div>
            <p className="text-xs text-gray-400 text-center mb-4">
              This is the current balance available for withdrawal to the admin wallet
            </p>
            
            {/* Error Message */}
            {errorMessage && (
              <div className="w-full bg-red-500/20 text-red-400 border border-red-500/30 rounded-md p-3 mb-4 text-sm">
                {errorMessage}
              </div>
            )}
            
            {/* Withdraw Button */}
            <button
              onClick={handleWithdraw}
              disabled={isProcessing || !canWithdraw || !contractBalance || contractBalance <= BigInt(0)}
              className={`w-full px-4 py-3 rounded-md text-white font-medium flex items-center justify-center ${
                isProcessing || !canWithdraw || !contractBalance || contractBalance <= BigInt(0)
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Withdraw All Funds
                </>
              )}
            </button>
          </div>
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
              <p className="text-sm font-medium">Funds Successfully Withdrawn</p>
              <p className="text-xs mt-1">The contract balance has been successfully withdrawn to your wallet.</p>
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
              <p className="text-sm font-medium">Error Withdrawing Funds</p>
              <p className="text-xs mt-1">
                {(withdrawError as Error).message || 'An unknown error occurred while withdrawing the funds.'}
              </p>
              <p className="text-xs mt-2 text-gray-300">
                This may happen if the contract has no balance or if there is an issue with the transaction.
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
        <h4 className="text-sm font-medium text-gray-300 mb-2">About Contract Balance Withdrawal</h4>
        <p className="text-sm text-gray-400 mb-3">
          This component allows authorized administrators to withdraw the accumulated balance from the contract to the admin wallet. Two security checks are performed:
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <div className="bg-gray-700/20 rounded-md p-3">
            <h5 className="text-xs font-medium text-amber-400 mb-1">Role Verification</h5>
            <p className="text-xs text-gray-400">
              Only addresses with the ADMIN_ROLE can withdraw funds, ensuring that financial operations are restricted to authorized administrators.
            </p>
          </div>
          
          <div className="bg-gray-700/20 rounded-md p-3">
            <h5 className="text-xs font-medium text-amber-400 mb-1">System Status Check</h5>
            <p className="text-xs text-gray-400">
              Funds cannot be withdrawn if the system is paused, which might occur during maintenance, upgrades, or security incidents.
            </p>
          </div>
        </div>
        
        <p className="text-xs text-gray-400">
          The withdrawal operation transfers the entire contract balance to the caller's address. This is useful for collecting accumulated fees and ensuring proper financial management of the contract.
        </p>
      </div>
    </motion.div>
  );
};

// Export both the component and its types for easier importing in parent components
export { BalanceWithdrawer };
export default BalanceWithdrawer;