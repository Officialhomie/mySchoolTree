import { useState, useEffect } from 'react';
import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { contractTuitionSystemConfig } from '../../contracts';

/**
 * ProgramFeeManager Component
 * 
 * This component allows administrators to set program fees.
 * It implements two critical security checks:
 * 1. Verifies the caller has the ADMIN_ROLE
 * 2. Confirms the contract is not paused before processing transactions
 */
export interface ProgramFeeData {
  programId: number;
  registrationFee: number;
  termFee: number;
  graduationFee: number;
  lateFeePercentage: number;
  canManageFees: boolean;
  hasAdminRole: boolean | null;
  isSystemPaused: boolean | null;
  lastChecked: Date | null;
  validationError: string;
}

export interface ProgramFeeResult {
  status: 'idle' | 'checking' | 'pending' | 'confirming' | 'success' | 'error';
  feeData: ProgramFeeData;
  hash?: string;
  error?: Error | null;
}

interface ProgramFeeManagerProps {
  feeContract?: any; // Contract for setting program fees, optional with default value
  roleContract?: any; // Contract for checking ADMIN_ROLE, optional with default value
  pauseContract?: any; // Contract for checking pause status, optional with default value
  onFeesUpdated?: (programId: number) => void; // Optional callback
  onFeeDataChange?: (feeData: ProgramFeeData) => void; // New callback for when fee data changes
  onFeeStateChange?: (result: ProgramFeeResult) => void; // New callback for fee state changes
  initialFeeData?: ProgramFeeData; // Optional initial fee data
}

const ProgramFeeManager = ({
  feeContract = contractTuitionSystemConfig,
  roleContract = contractTuitionSystemConfig,
  pauseContract = contractTuitionSystemConfig,
  onFeesUpdated,
  onFeeDataChange,
  onFeeStateChange,
  initialFeeData
}: ProgramFeeManagerProps) => {
  // Current user's address
  const { address: connectedAddress } = useAccount();
  
  // Form state
  const [programId, setProgramId] = useState<number>(initialFeeData?.programId || 1);
  const [registrationFee, setRegistrationFee] = useState<number>(initialFeeData?.registrationFee || 0);
  const [termFee, setTermFee] = useState<number>(initialFeeData?.termFee || 0);
  const [graduationFee, setGraduationFee] = useState<number>(initialFeeData?.graduationFee || 0);
  const [lateFeePercentage, setLateFeePercentage] = useState<number>(initialFeeData?.lateFeePercentage || 0);
  const [validationError, setValidationError] = useState<string>(initialFeeData?.validationError || '');
  const [lastChecked, setLastChecked] = useState<Date | null>(initialFeeData?.lastChecked || null);
  
  // Status tracking
  const [canManageFees, setCanManageFees] = useState<boolean>(initialFeeData?.canManageFees || false);
  const [hasAdminRole, setHasAdminRole] = useState<boolean | null>(initialFeeData?.hasAdminRole || null);
  const [isSystemPaused, setIsSystemPaused] = useState<boolean | null>(initialFeeData?.isSystemPaused || null);
  
  // Current fee data object
  const feeData: ProgramFeeData = {
    programId,
    registrationFee,
    termFee,
    graduationFee,
    lateFeePercentage,
    canManageFees,
    hasAdminRole,
    isSystemPaused,
    lastChecked,
    validationError
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
  
  // Contract write state for setting program fees
  const {
    data: setFeesTxHash,
    error: setFeesTxError,
    isPending: isSetFeesPending,
    writeContract: writeSetProgramFees
  } = useWriteContract();
  
  // Transaction receipt state
  const {
    isLoading: isSetFeesConfirming,
    isSuccess: isSetFeesConfirmed,
    error: setFeesConfirmError
  } = useWaitForTransactionReceipt({
    hash: setFeesTxHash,
  });
  
  // Combined loading state
  const isLoading = isLoadingRoleId || isLoadingPauseStatus || isLoadingRoleCheck;
  
  // Combined processing state
  const isProcessing = isSetFeesPending || isSetFeesConfirming;
  
  // Combined error state
  const setFeesError = setFeesTxError || setFeesConfirmError;

  // Determine fee setting status
  const getFeeSettingStatus = (): 'idle' | 'checking' | 'pending' | 'confirming' | 'success' | 'error' => {
    if (isSetFeesConfirmed) return 'success';
    if (setFeesError) return 'error';
    if (isSetFeesConfirming) return 'confirming';
    if (isSetFeesPending) return 'pending';
    if (isLoading) return 'checking';
    return 'idle';
  };

  // Current fee setting state
  const feeSettingState: ProgramFeeResult = {
    status: getFeeSettingStatus(),
    feeData,
    hash: setFeesTxHash,
    error: setFeesError as Error | null
  };
  
  // Update parent component when fee data changes
  useEffect(() => {
    if (onFeeDataChange) {
      onFeeDataChange(feeData);
    }
  }, [programId, registrationFee, termFee, graduationFee, lateFeePercentage, 
      canManageFees, hasAdminRole, isSystemPaused, lastChecked, validationError, 
      onFeeDataChange]);

  // Update parent component when fee setting state changes
  useEffect(() => {
    if (onFeeStateChange) {
      onFeeStateChange(feeSettingState);
    }
  }, [feeSettingState, onFeeStateChange]);
  
  // Update canManageFees when role and pause data are loaded
  useEffect(() => {
    if (!isLoading) {
      const hasRole = Boolean(hasRoleData);
      const isPaused = Boolean(pausedStatus);
      
      setHasAdminRole(hasRole);
      setIsSystemPaused(isPaused);
      setCanManageFees(hasRole && !isPaused);
      setLastChecked(new Date());
    }
  }, [hasRoleData, pausedStatus, isLoading]);
  
  // Helper to format time since last check
  const getTimeSinceLastCheck = () => {
    if (!lastChecked) return 'Never checked';
    return formatDistanceToNow(lastChecked, { addSuffix: true });
  };
  
  // Validate program ID
  const validateProgramId = (id: number): boolean => {
    if (isNaN(id) || id <= 0) {
      setValidationError('Program ID must be a positive number');
      return false;
    }
    
    setValidationError('');
    return true;
  };
  
  // Validate fee amounts
  const validateFees = (): boolean => {
    if (isNaN(registrationFee) || registrationFee < 0) {
      setValidationError('Registration fee must be a non-negative number');
      return false;
    }
    
    if (isNaN(termFee) || termFee < 0) {
      setValidationError('Term fee must be a non-negative number');
      return false;
    }
    
    if (isNaN(graduationFee) || graduationFee < 0) {
      setValidationError('Graduation fee must be a non-negative number');
      return false;
    }
    
    if (isNaN(lateFeePercentage) || lateFeePercentage < 0 || lateFeePercentage > 100) {
      setValidationError('Late fee percentage must be between 0 and 100');
      return false;
    }
    
    setValidationError('');
    return true;
  };
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form inputs
    if (!validateProgramId(programId) || !validateFees()) {
      return;
    }
    
    // Re-check permissions and system status
    if (!canManageFees) {
      if (!Boolean(hasRoleData)) {
        setValidationError('You do not have the ADMIN_ROLE required to set program fees');
      } else if (Boolean(pausedStatus)) {
        setValidationError('System is paused. Cannot set program fees at this time');
      } else {
        setValidationError('Unable to set program fees due to system constraints');
      }
      return;
    }
    
    // All checks passed, set the program fees
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
      setValidationError('Error initiating transaction');
    }
  };
  
  // Reset form after successful fee setting
  useEffect(() => {
    if (isSetFeesConfirmed && !isSetFeesConfirming) {
      // Call the callback if provided
      if (onFeesUpdated) {
        onFeesUpdated(programId);
      }
      
      // Don't reset form completely - keep programId but reset fee values
      setRegistrationFee(0);
      setTermFee(0);
      setGraduationFee(0);
      setLateFeePercentage(0);
      
      // Refresh permission checks
      refetchRoleCheck();
      refetchPauseStatus();
    }
  }, [isSetFeesConfirmed, isSetFeesConfirming, programId, onFeesUpdated, refetchRoleCheck, refetchPauseStatus]);
  
  // Render validation errors with proper type declaration
  const renderValidationErrors = (): React.ReactNode => {
    if (!validationError) return null;
    
    return (
      <div className="text-xs text-red-400 mt-1">{validationError}</div>
    );
  };
  
  // Function to handle program ID change
  const handleProgramIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newId = parseInt(e.target.value);
    setProgramId(newId);
    validateProgramId(newId);
  };
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-gray-800/50 border border-gray-700 rounded-lg p-4"
    >
      <h2 className="text-lg font-semibold text-white mb-4">Program Fee Management</h2>
      
      {/* Status section */}
      <div className="mb-4 p-3 bg-gray-900/50 rounded border border-gray-700">
        <h3 className="text-sm font-medium text-gray-300 mb-2">System Status</h3>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center">
            <span className="text-gray-400 mr-2">Admin Access:</span>
            {isLoadingRoleCheck ? (
              <span className="text-yellow-400">Checking...</span>
            ) : isRoleCheckError ? (
              <span className="text-red-400">Error checking role</span>
            ) : hasAdminRole ? (
              <span className="text-green-400">Granted</span>
            ) : (
              <span className="text-red-400">Denied</span>
            )}
          </div>
          <div className="flex items-center">
            <span className="text-gray-400 mr-2">System Status:</span>
            {isLoadingPauseStatus ? (
              <span className="text-yellow-400">Checking...</span>
            ) : isPauseStatusError ? (
              <span className="text-red-400">Error checking status</span>
            ) : isSystemPaused ? (
              <span className="text-red-400">Paused</span>
            ) : (
              <span className="text-green-400">Active</span>
            )}
          </div>
          <div className="flex items-center col-span-2">
            <span className="text-gray-400 mr-2">Last Checked:</span>
            <span className="text-blue-400">{getTimeSinceLastCheck()}</span>
          </div>
          {isRoleIdError && (
            <div className="col-span-2 text-red-400">
              Error retrieving role information
            </div>
          )}
        </div>
      </div>
      
      {/* Form section */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="programId" className="block text-sm font-medium text-gray-300 mb-1">
            Program ID
          </label>
          <input
            id="programId"
            type="number"
            min="1"
            value={programId}
            onChange={handleProgramIdChange}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
            disabled={isProcessing}
          />
        </div>
        
        <div>
          <label htmlFor="registrationFee" className="block text-sm font-medium text-gray-300 mb-1">
            Registration Fee
          </label>
          <input
            id="registrationFee"
            type="number"
            min="0"
            value={registrationFee}
            onChange={(e) => setRegistrationFee(parseFloat(e.target.value))}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
            disabled={isProcessing}
          />
        </div>
        
        <div>
          <label htmlFor="termFee" className="block text-sm font-medium text-gray-300 mb-1">
            Term Fee
          </label>
          <input
            id="termFee"
            type="number"
            min="0"
            value={termFee}
            onChange={(e) => setTermFee(parseFloat(e.target.value))}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
            disabled={isProcessing}
          />
        </div>
        
        <div>
          <label htmlFor="graduationFee" className="block text-sm font-medium text-gray-300 mb-1">
            Graduation Fee
          </label>
          <input
            id="graduationFee"
            type="number"
            min="0"
            value={graduationFee}
            onChange={(e) => setGraduationFee(parseFloat(e.target.value))}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
            disabled={isProcessing}
          />
        </div>
        
        <div>
          <label htmlFor="lateFeePercentage" className="block text-sm font-medium text-gray-300 mb-1">
            Late Fee Percentage
          </label>
          <input
            id="lateFeePercentage"
            type="number"
            min="0"
            max="100"
            value={lateFeePercentage}
            onChange={(e) => setLateFeePercentage(parseFloat(e.target.value))}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
            disabled={isProcessing}
          />
        </div>
        
        {renderValidationErrors()}
        
        <button
          type="submit"
          disabled={!canManageFees || isProcessing}
          className={`w-full py-2 px-4 rounded font-medium transition-colors ${
            !canManageFees
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
              : isProcessing
              ? 'bg-blue-700 text-blue-200 cursor-wait'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {isProcessing ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {isSetFeesConfirming ? 'Confirming...' : 'Processing...'}
            </span>
          ) : (
            'Set Program Fees'
          )}
        </button>
      </form>
      
      {/* Transaction Status */}
      {setFeesTxHash && (
        <div className="mt-4 p-3 bg-gray-900/50 rounded border border-gray-700">
          <h3 className="text-sm font-medium text-gray-300 mb-2">Transaction Status</h3>
          <div className="text-xs break-all">
            <span className="text-gray-400 mr-2">Transaction Hash:</span>
            <span className="text-blue-400">{setFeesTxHash}</span>
          </div>
          <div className="mt-2 text-xs">
            <span className="text-gray-400 mr-2">Status:</span>
            {isSetFeesConfirming ? (
              <span className="text-yellow-400">Confirming transaction...</span>
            ) : isSetFeesConfirmed ? (
              <span className="text-green-400">Transaction confirmed successfully!</span>
            ) : setFeesError ? (
              <span className="text-red-400">Error: {setFeesError.message}</span>
            ) : (
              <span className="text-blue-400">Waiting for confirmation...</span>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
};

// Export both the component and its types for easier importing in parent components
export { ProgramFeeManager };
export default ProgramFeeManager;