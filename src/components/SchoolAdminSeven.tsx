import { useState, useEffect } from 'react';
import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { formatEther } from 'viem';
import { contractTuitionSystemConfig } from '../contracts';

/**
 * Financial Management Dashboard
 * 
 * A comprehensive component for managing blockchain-based financial operations
 * with advanced security checks and user-friendly interfaces.
 * 
 * Key Features:
 * 1. Contract Balance Withdrawal
 * 2. Program Fee Management
 * 3. Role-based Access Control
 * 4. Real-time System Status Monitoring
 */

export interface FinancialManagementData {
  contractBalance: bigint;
  programId: number;
  registrationFee: number;
  termFee: number;
  graduationFee: number;
  lateFeePercentage: number;
  canWithdraw: boolean;
  canManageFees: boolean;
  hasAdminRole: boolean | null;
  isSystemPaused: boolean | null;
  lastChecked: Date | null;
  errorMessage: string;
  validationError: string;
}

export interface FinancialManagementResult {
  status: 'idle' | 'checking' | 'pending' | 'confirming' | 'success' | 'error';
  financialData: FinancialManagementData;
  withdrawalHash?: string;
  feeUpdateHash?: string;
  error?: Error | null;
}

interface FinancialManagementDashboardProps {
  withdrawContract?: any;
  feeContract?: any;
  roleContract?: any;
  pauseContract?: any;
  onFinancialActionComplete?: (actionType: 'withdrawal' | 'fee-update', txHash: string) => void;
  initialFinancialData?: FinancialManagementData;
}

const FinancialManagementDashboard = ({
  withdrawContract = contractTuitionSystemConfig,
  feeContract = contractTuitionSystemConfig,
  roleContract = contractTuitionSystemConfig,
  pauseContract = contractTuitionSystemConfig,
  onFinancialActionComplete,
  initialFinancialData
}: FinancialManagementDashboardProps) => {
  // Current user's address
  const { address: connectedAddress } = useAccount();
  
  // Active tab state
  const [activeTab, setActiveTab] = useState<'withdraw' | 'fees'>('withdraw');
  
  // State management for financial operations
  const [programId, setProgramId] = useState<number>(initialFinancialData?.programId || 1);
  const [registrationFee, setRegistrationFee] = useState<number>(initialFinancialData?.registrationFee || 0);
  const [termFee, setTermFee] = useState<number>(initialFinancialData?.termFee || 0);
  const [graduationFee, setGraduationFee] = useState<number>(initialFinancialData?.graduationFee || 0);
  const [lateFeePercentage, setLateFeePercentage] = useState<number>(initialFinancialData?.lateFeePercentage || 0);
  
  const [contractBalance, setContractBalance] = useState<bigint>(initialFinancialData?.contractBalance || BigInt(0));
  const [canWithdraw, setCanWithdraw] = useState<boolean>(initialFinancialData?.canWithdraw || false);
  const [canManageFees, setCanManageFees] = useState<boolean>(initialFinancialData?.canManageFees || false);
  
  const [hasAdminRole, setHasAdminRole] = useState<boolean | null>(initialFinancialData?.hasAdminRole || null);
  const [isSystemPaused, setIsSystemPaused] = useState<boolean | null>(initialFinancialData?.isSystemPaused || null);
  
  const [lastChecked, setLastChecked] = useState<Date | null>(initialFinancialData?.lastChecked || null);
  const [errorMessage, setErrorMessage] = useState<string>(initialFinancialData?.errorMessage || '');
  const [validationError, setValidationError] = useState<string>(initialFinancialData?.validationError || '');
  
  // Current financial data object
  const financialData: FinancialManagementData = {
    contractBalance,
    programId,
    registrationFee,
    termFee,
    graduationFee,
    lateFeePercentage,
    canWithdraw,
    canManageFees,
    hasAdminRole,
    isSystemPaused,
    lastChecked,
    errorMessage,
    validationError
  };
  
  // Contract interaction hooks
  const { 
    data: adminRoleData,
    isLoading: isLoadingRoleId,
    isError: isRoleIdError
  } = useReadContract({
    ...roleContract,
    functionName: 'ADMIN_ROLE'
  });
  
  const {
    data: pausedStatus,
    isLoading: isLoadingPauseStatus,
    isError: isPauseStatusError,
    refetch: refetchPauseStatus
  } = useReadContract({
    ...pauseContract,
    functionName: 'paused'
  });
  
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
  
  // Withdrawal transaction hooks
  const {
    data: withdrawTxHash,
    error: withdrawTxError,
    isPending: isWithdrawPending,
    writeContract: writeWithdrawBalance
  } = useWriteContract();
  
  const {
    isLoading: isWithdrawConfirming,
    isSuccess: isWithdrawConfirmed,
    error: withdrawConfirmError
  } = useWaitForTransactionReceipt({
    hash: withdrawTxHash,
  });
  
  // Fee update transaction hooks
  const {
    data: setFeesTxHash,
    error: setFeesTxError,
    isPending: isSetFeesPending,
    writeContract: writeSetProgramFees
  } = useWriteContract();
  
  const {
    isLoading: isSetFeesConfirming,
    isSuccess: isSetFeesConfirmed,
    error: setFeesConfirmError
  } = useWaitForTransactionReceipt({
    hash: setFeesTxHash,
  });
  
  // Combined loading and processing states
  const isLoading = isLoadingRoleId || isLoadingPauseStatus || 
                    isLoadingRoleCheck || isLoadingBalance;
  const isProcessing = isWithdrawPending || isWithdrawConfirming || 
                       isSetFeesPending || isSetFeesConfirming;
  
  // Determine overall financial management status
  const getFinancialManagementStatus = (): 
    'idle' | 'checking' | 'pending' | 'confirming' | 'success' | 'error' => {
    if (isWithdrawConfirmed || isSetFeesConfirmed) return 'success';
    if (withdrawTxError || setFeesTxError) return 'error';
    if (isWithdrawConfirming || isSetFeesConfirming) return 'confirming';
    if (isWithdrawPending || isSetFeesPending) return 'pending';
    if (isLoading) return 'checking';
    return 'idle';
  };
  
  // Current financial management state
  const financialManagementState: FinancialManagementResult = {
    status: getFinancialManagementStatus(),
    financialData,
    withdrawalHash: withdrawTxHash,
    feeUpdateHash: setFeesTxHash,
    error: (withdrawTxError || setFeesTxError) as Error | null
  };
  
  // Validation methods
  const validateProgramId = (id: number): boolean => {
    if (isNaN(id) || id <= 0) {
      setValidationError('Program ID must be a positive number');
      return false;
    }
    setValidationError('');
    return true;
  };
  
  const validateFees = (): boolean => {
    const feeValidations = [
      { value: registrationFee, name: 'Registration fee' },
      { value: termFee, name: 'Term fee' },
      { value: graduationFee, name: 'Graduation fee' }
    ];
    
    for (const fee of feeValidations) {
      if (isNaN(fee.value) || fee.value < 0) {
        setValidationError(`${fee.name} must be a non-negative number`);
        return false;
      }
    }
    
    if (isNaN(lateFeePercentage) || lateFeePercentage < 0 || lateFeePercentage > 100) {
      setValidationError('Late fee percentage must be between 0 and 100');
      return false;
    }
    
    setValidationError('');
    return true;
  };
  
  // Action handlers
  const handleWithdraw = () => {
    if (!canWithdraw) {
      setErrorMessage(
        !Boolean(hasRoleData) 
          ? 'You do not have the ADMIN_ROLE required to withdraw funds'
          : Boolean(pausedStatus)
          ? 'System is paused. Cannot withdraw funds at this time'
          : 'Unable to withdraw funds due to system constraints'
      );
      return;
    }
    
    if (!contractBalance || contractBalance <= BigInt(0)) {
      setErrorMessage('No balance available to withdraw');
      return;
    }
    
    try {
      setErrorMessage('');
      writeWithdrawBalance({
        ...withdrawContract,
        functionName: 'withdrawBalance',
        args: []
      });
    } catch (err) {
      console.error('Error withdrawing balance:', err);
      setErrorMessage('Error initiating withdrawal');
    }
  };
  
  const handleSetProgramFees = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateProgramId(programId) || !validateFees()) {
      return;
    }
    
    if (!canManageFees) {
      setValidationError(
        !Boolean(hasRoleData)
          ? 'You do not have the ADMIN_ROLE required to set program fees'
          : Boolean(pausedStatus)
          ? 'System is paused. Cannot set program fees at this time'
          : 'Unable to set program fees due to system constraints'
      );
      return;
    }
    
    try {
      writeSetProgramFees({
        ...feeContract,
        functionName: 'setProgramFees',
        args: [
          BigInt(programId),
          BigInt(registrationFee),
          BigInt(termFee),
          BigInt(graduationFee),
          BigInt(lateFeePercentage)
        ]
      });
    } catch (err) {
      console.error('Error setting program fees:', err);
      setValidationError('Error initiating fee update');
    }
  };
  
  // Effect for updating system state
  useEffect(() => {
    if (!isLoading) {
      const hasRole = Boolean(hasRoleData);
      const isPaused = Boolean(pausedStatus);
      
      setHasAdminRole(hasRole);
      setIsSystemPaused(isPaused);
      setCanWithdraw(hasRole && !isPaused);
      setCanManageFees(hasRole && !isPaused);
      setLastChecked(new Date());
      
      if (balanceData) {
        setContractBalance(balanceData as bigint);
      }
      
      // Handle error states
      if (isRoleIdError || isPauseStatusError || isRoleCheckError || isBalanceError) {
        setErrorMessage('Error connecting to blockchain. Please check your connection and try again.');
      } else {
        setErrorMessage('');
      }
    }
  }, [hasRoleData, pausedStatus, balanceData, isLoading, isRoleIdError, isPauseStatusError, isRoleCheckError, isBalanceError]);
  
  // Effect for handling successful transactions
  useEffect(() => {
    if ((isWithdrawConfirmed || isSetFeesConfirmed) && !isProcessing) {
      if (onFinancialActionComplete) {
        if (isWithdrawConfirmed && withdrawTxHash) {
          onFinancialActionComplete('withdrawal', withdrawTxHash);
        }
        if (isSetFeesConfirmed && setFeesTxHash) {
          onFinancialActionComplete('fee-update', setFeesTxHash);
        }
      }
      
      // Reset form and refresh data
      refetchRoleCheck();
      refetchPauseStatus();
      refetchBalance();
      
      // Reset fee-related fields
      setRegistrationFee(0);
      setTermFee(0);
      setGraduationFee(0);
      setLateFeePercentage(0);
    }
  }, [
    isWithdrawConfirmed, 
    isSetFeesConfirmed, 
    isProcessing, 
    withdrawTxHash, 
    setFeesTxHash, 
    onFinancialActionComplete,
    refetchRoleCheck,
    refetchPauseStatus,
    refetchBalance
  ]);
  
  // Effect for handling transaction errors
  useEffect(() => {
    if (withdrawConfirmError) {
      setErrorMessage(`Transaction error: ${withdrawConfirmError.message}`);
    } else if (setFeesConfirmError) {
      setValidationError(`Transaction error: ${setFeesConfirmError.message}`);
    }
  }, [withdrawConfirmError, setFeesConfirmError]);
  
  // Helper to format time since last check
  const getTimeSinceLastCheck = () => {
    if (!lastChecked) return 'Never checked';
    return formatDistanceToNow(lastChecked, { addSuffix: true });
  };
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-gray-900 text-white p-6 rounded-xl shadow-2xl border border-gray-800"
    >
      <h1 className="text-2xl font-bold mb-6 text-center text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-600">
        Financial Management Dashboard
      </h1>
      
      {/* Overall Status Indicator */}
      <div className="mb-4 text-center">
        <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
          financialManagementState.status === 'success' ? 'bg-green-500/20 text-green-400' :
          financialManagementState.status === 'error' ? 'bg-red-500/20 text-red-400' :
          financialManagementState.status === 'pending' || financialManagementState.status === 'confirming' ? 'bg-yellow-500/20 text-yellow-400' :
          financialManagementState.status === 'checking' ? 'bg-blue-500/20 text-blue-400' :
          'bg-gray-500/20 text-gray-400'
        }`}>
          Status: {financialManagementState.status.charAt(0).toUpperCase() + financialManagementState.status.slice(1)}
        </span>
      </div>
      
      {/* System Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Current Contract Balance</h3>
          <div className="text-2xl font-bold text-green-400">
            {contractBalance ? `${formatEther(contractBalance)} ETH` : '0 ETH'}
          </div>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <h3 className="text-sm font-medium text-gray-400 mb-2">System Status</h3>
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-2 ${hasAdminRole ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className={`text-sm ${hasAdminRole ? 'text-green-400' : 'text-red-400'}`}>
                {hasAdminRole ? 'Admin Access: Granted' : 'Admin Access: Denied'}
              </span>
            </div>
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-2 ${!isSystemPaused ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className={`text-sm ${!isSystemPaused ? 'text-green-400' : 'text-red-400'}`}>
                {!isSystemPaused ? 'System: Active' : 'System: Paused'}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Tabs for Financial Operations */}
      <div className="mb-6">
        <div className="flex border-b border-gray-700">
          <button 
            onClick={() => setActiveTab('withdraw')}
            className={`px-4 py-2 text-sm font-medium 
              text-gray-300 hover:text-white hover:bg-gray-800 
              border-b-2 ${activeTab === 'withdraw' ? 'border-amber-500 text-white' : 'border-transparent'} 
              focus:outline-none transition-colors`}
          >
            Withdraw Balance
          </button>
          <button 
            onClick={() => setActiveTab('fees')}
            className={`px-4 py-2 text-sm font-medium 
              text-gray-300 hover:text-white hover:bg-gray-800 
              border-b-2 ${activeTab === 'fees' ? 'border-purple-500 text-white' : 'border-transparent'} 
              focus:outline-none transition-colors`}
          >
            Manage Program Fees
          </button>
        </div>
      </div>
      
      {/* Withdraw Balance Section */}
      {activeTab === 'withdraw' && (
        <div className="bg-gray-800 rounded-lg p-6 mb-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-amber-400 mb-4">
            Contract Balance Withdrawal
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-400 mb-2">
                Current Withdrawable Balance
              </p>
              <div className="text-2xl font-bold text-green-400 mb-4">
                {contractBalance ? `${formatEther(contractBalance)} ETH` : '0 ETH'}
              </div>
              
              {errorMessage && (
                <div className="bg-red-500/20 text-red-400 border border-red-500/30 rounded-md p-3 mb-4 text-sm">
                  {errorMessage}
                </div>
              )}
            </div>
            
            <div className="flex flex-col justify-center">
              <button
                onClick={handleWithdraw}
                disabled={isProcessing || !canWithdraw || !contractBalance || contractBalance <= BigInt(0)}
                className={`w-full py-3 rounded-md font-medium transition-colors ${
                  isProcessing || !canWithdraw || !contractBalance || contractBalance <= BigInt(0)
                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    : 'bg-amber-600 hover:bg-amber-700 text-white'
                }`}
              >
                {isProcessing ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing Withdrawal...
                  </span>
                ) : (
                  'Withdraw All Funds'
                )}
              </button>
              
              <p className="text-xs text-gray-400 mt-2 text-center">
                Requires admin role and active system status
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Program Fee Management Section */}
      {activeTab === 'fees' && (
        <form onSubmit={handleSetProgramFees} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-purple-400 mb-4">
            Program Fee Configuration
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label htmlFor="programId" className="block text-sm font-medium text-gray-300 mb-2">
                Program ID
              </label>
              <input
                id="programId"
                type="number"
                min="1"
                value={programId}
                onChange={(e) => {
                  const newId = parseInt(e.target.value);
                  setProgramId(newId);
                  validateProgramId(newId);
                }}
                className={`w-full px-3 py-2 bg-gray-700 border rounded text-white ${
                  validationError && (!programId || programId <= 0) 
                    ? 'border-red-500' 
                    : 'border-gray-600'
                }`}
                disabled={isProcessing || !canManageFees}
              />
            </div>
            
            <div>
              <label htmlFor="registrationFee" className="block text-sm font-medium text-gray-300 mb-2">
                Registration Fee (wei)
              </label>
              <input
                id="registrationFee"
                type="number"
                min="0"
                value={registrationFee}
                onChange={(e) => {
                  setRegistrationFee(parseFloat(e.target.value));
                  validateFees();
                }}
                className={`w-full px-3 py-2 bg-gray-700 border rounded text-white ${
                  validationError && registrationFee < 0 
                    ? 'border-red-500' 
                    : 'border-gray-600'
                }`}
                disabled={isProcessing || !canManageFees}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label htmlFor="termFee" className="block text-sm font-medium text-gray-300 mb-2">
                Term Fee (wei)
              </label>
              <input
                id="termFee"
                type="number"
                min="0"
                value={termFee}
                onChange={(e) => {
                  setTermFee(parseFloat(e.target.value));
                  validateFees();
                }}
                className={`w-full px-3 py-2 bg-gray-700 border rounded text-white ${
                  validationError && termFee < 0 
                    ? 'border-red-500' 
                    : 'border-gray-600'
                }`}
                disabled={isProcessing || !canManageFees}
              />
            </div>
            
            <div>
              <label htmlFor="graduationFee" className="block text-sm font-medium text-gray-300 mb-2">
                Graduation Fee (wei)
              </label>
              <input
                id="graduationFee"
                type="number"
                min="0"
                value={graduationFee}
                onChange={(e) => {
                  setGraduationFee(parseFloat(e.target.value));
                  validateFees();
                }}
                className={`w-full px-3 py-2 bg-gray-700 border rounded text-white ${
                  validationError && graduationFee < 0 
                    ? 'border-red-500' 
                    : 'border-gray-600'
                }`}
                disabled={isProcessing || !canManageFees}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label htmlFor="lateFeePercentage" className="block text-sm font-medium text-gray-300 mb-2">
                Late Fee Percentage (0-100%)
              </label>
              <input
                id="lateFeePercentage"
                type="number"
                min="0"
                max="100"
                value={lateFeePercentage}
                onChange={(e) => {
                  setLateFeePercentage(parseFloat(e.target.value));
                  validateFees();
                }}
                className={`w-full px-3 py-2 bg-gray-700 border rounded text-white ${
                  validationError && (lateFeePercentage < 0 || lateFeePercentage > 100)
                    ? 'border-red-500' 
                    : 'border-gray-600'
                }`}
                disabled={isProcessing || !canManageFees}
              />
            </div>
          </div>
          
          {/* Validation Error Display */}
          {validationError && (
            <div className="bg-red-500/20 text-red-400 border border-red-500/30 rounded-md p-3 mb-4 text-sm">
              {validationError}
            </div>
          )}
          
          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isProcessing || !canManageFees}
              className={`px-6 py-3 rounded-md font-medium transition-colors ${
                isProcessing || !canManageFees
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : 'bg-purple-600 hover:bg-purple-700 text-white'
              }`}
            >
              {isProcessing ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Updating Fees...
                </span>
              ) : (
                'Set Program Fees'
              )}
            </button>
          </div>
        </form>
      )}
      
      {/* Transaction History and Status */}
      {(withdrawTxHash || setFeesTxHash) && (
        <div className="mt-6 bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-blue-400 mb-4">
            Recent Transaction
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-400 mb-2">
                Transaction Hash
              </p>
              <p className="text-xs text-blue-300 break-all">
                {withdrawTxHash || setFeesTxHash}
              </p>
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-400 mb-2">
                Transaction Status
              </p>
              <div className={`text-sm font-medium ${
                isWithdrawConfirmed || isSetFeesConfirmed
                  ? 'text-green-400'
                  : isProcessing
                  ? 'text-yellow-400'
                  : 'text-red-400'
              }`}>
                {isWithdrawConfirmed || isSetFeesConfirmed
                  ? 'Transaction Confirmed'
                  : isProcessing
                  ? 'Processing...'
                  : 'Transaction Failed'}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Error Status Display */}
      {(isRoleIdError || isPauseStatusError || isRoleCheckError || isBalanceError) && (
        <div className="mt-6 bg-red-500/10 rounded-lg p-4 border border-red-500/30">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"></path>
            </svg>
            <h3 className="text-sm font-medium text-red-400">
              Connection Error
            </h3>
          </div>
          <p className="mt-2 text-xs text-red-300">
            There was an error connecting to the blockchain network. Please check your connection and try again.
          </p>
        </div>
      )}
      
      {/* System Information */}
      <div className="mt-6 bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-gray-300 mb-4">
          System Information
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium text-gray-400 mb-2">
              Last Checked
            </p>
            <p className="text-sm text-blue-300">
              {getTimeSinceLastCheck()}
            </p>
          </div>
          
          <div>
            <button
              onClick={() => {
                refetchRoleCheck();
                refetchPauseStatus();
                refetchBalance();
                setLastChecked(new Date());
              }}
              className="w-full py-2 px-4 bg-gray-700 hover:bg-gray-600 rounded-md text-sm text-white transition-colors"
            >
              Refresh System Status
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Export both the component and its types for easier importing in parent components
export { FinancialManagementDashboard };
export default FinancialManagementDashboard;