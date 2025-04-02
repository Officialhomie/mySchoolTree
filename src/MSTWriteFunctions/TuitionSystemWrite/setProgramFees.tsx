import { useState, useEffect } from 'react';
import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';

/**
 * ProgramFeeManager Component
 * 
 * This component allows administrators to set program fees.
 * It implements two critical security checks:
 * 1. Verifies the caller has the ADMIN_ROLE
 * 2. Confirms the contract is not paused before processing transactions
 */
interface ProgramFeeManagerProps {
  feeContract: any; // Contract for setting program fees
  roleContract: any; // Contract for checking ADMIN_ROLE
  pauseContract: any; // Contract for checking pause status
  onFeesUpdated?: (programId: number) => void; // Optional callback
}

const ProgramFeeManager = ({
  feeContract,
  roleContract,
  pauseContract,
  onFeesUpdated
}: ProgramFeeManagerProps) => {
  // Current user's address
  const { address: connectedAddress } = useAccount();
  
  // Form state
  const [programId, setProgramId] = useState<number>(1);
  const [registrationFee, setRegistrationFee] = useState<number>(0);
  const [termFee, setTermFee] = useState<number>(0);
  const [graduationFee, setGraduationFee] = useState<number>(0);
  const [lateFeePercentage, setLateFeePercentage] = useState<number>(0);
  const [validationError, setValidationError] = useState<string>('');
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  
  // Status tracking
  const [canManageFees, setCanManageFees] = useState<boolean>(false);
  
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
  
  // Update canManageFees when role and pause data are loaded
  useEffect(() => {
    if (!isLoading) {
      const hasRole = Boolean(hasRoleData);
      const isPaused = Boolean(pausedStatus);
      
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
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-gray-800/50 border border-gray-700 rounded-lg p-4"
    >
      <h3 className="text-lg font-medium text-purple-400 mb-3">
        Program Fee Manager
      </h3>
      
      {/* System Status Banner */}
      {!isLoading && (
        <div className={`flex items-center justify-between p-4 rounded-lg border mb-4 ${
          canManageFees 
            ? 'bg-green-900/20 border-green-700/30' 
            : 'bg-red-900/20 border-red-700/30'
        }`}>
          <div className="flex items-center">
            {canManageFees ? (
              <>
                <div className="w-3 h-3 bg-green-500 rounded-full mr-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                </div>
                <div>
                  <h4 className="text-md font-medium text-green-400">System Ready</h4>
                  <p className="text-xs text-gray-300 mt-0.5">You can set program fees</p>
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
            className="flex items-center text-xs px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500"
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
          <div className="w-5 h-5 border-2 border-t-purple-400 border-purple-200/30 rounded-full animate-spin mr-2"></div>
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
      
      {/* Fee Setting Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-gray-700/30 rounded-lg p-4 space-y-4">
          {/* Program ID Input */}
          <div className="space-y-2">
            <label htmlFor="program-id" className="block text-sm font-medium text-gray-300">
              Program ID
            </label>
            <input
              id="program-id"
              type="number"
              value={programId || ''}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                setProgramId(isNaN(value) ? 0 : value);
                setValidationError('');
              }}
              placeholder="Enter program ID"
              min="1"
              className={`w-full px-3 py-2 bg-gray-700 border ${
                validationError && (!programId || programId <= 0) ? 'border-red-500' : 'border-gray-600'
              } rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
              disabled={isProcessing || !canManageFees}
            />
            <p className="text-xs text-gray-400">Enter the ID of the program to update fees for</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Registration Fee Input */}
            <div className="space-y-2">
              <label htmlFor="registration-fee" className="block text-sm font-medium text-gray-300">
                Registration Fee (wei)
              </label>
              <input
                id="registration-fee"
                type="number"
                value={registrationFee || ''}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  setRegistrationFee(isNaN(value) ? 0 : value);
                  setValidationError('');
                }}
                placeholder="Enter registration fee"
                min="0"
                className={`w-full px-3 py-2 bg-gray-700 border ${
                  validationError && registrationFee < 0 ? 'border-red-500' : 'border-gray-600'
                } rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
                disabled={isProcessing || !canManageFees}
              />
            </div>
            
            {/* Term Fee Input */}
            <div className="space-y-2">
              <label htmlFor="term-fee" className="block text-sm font-medium text-gray-300">
                Term Fee (wei)
              </label>
              <input
                id="term-fee"
                type="number"
                value={termFee || ''}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  setTermFee(isNaN(value) ? 0 : value);
                  setValidationError('');
                }}
                placeholder="Enter term fee"
                min="0"
                className={`w-full px-3 py-2 bg-gray-700 border ${
                  validationError && termFee < 0 ? 'border-red-500' : 'border-gray-600'
                } rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
                disabled={isProcessing || !canManageFees}
              />
            </div>
            
            {/* Graduation Fee Input */}
            <div className="space-y-2">
              <label htmlFor="graduation-fee" className="block text-sm font-medium text-gray-300">
                Graduation Fee (wei)
              </label>
              <input
                id="graduation-fee"
                type="number"
                value={graduationFee || ''}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  setGraduationFee(isNaN(value) ? 0 : value);
                  setValidationError('');
                }}
                placeholder="Enter graduation fee"
                min="0"
                className={`w-full px-3 py-2 bg-gray-700 border ${
                  validationError && graduationFee < 0 ? 'border-red-500' : 'border-gray-600'
                } rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
                disabled={isProcessing || !canManageFees}
              />
            </div>
            
            {/* Late Fee Percentage Input */}
            <div className="space-y-2">
              <label htmlFor="late-fee-percentage" className="block text-sm font-medium text-gray-300">
                Late Fee Percentage (%)
              </label>
              <input
                id="late-fee-percentage"
                type="number"
                value={lateFeePercentage || ''}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  setLateFeePercentage(isNaN(value) ? 0 : value);
                  setValidationError('');
                }}
                placeholder="Enter late fee percentage"
                min="0"
                max="100"
                className={`w-full px-3 py-2 bg-gray-700 border ${
                  validationError && (lateFeePercentage < 0 || lateFeePercentage > 100) ? 'border-red-500' : 'border-gray-600'
                } rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
                disabled={isProcessing || !canManageFees}
              />
            </div>
          </div>
          
          {/* Validation Errors */}
          {renderValidationErrors()}
          
          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              className={`px-4 py-2 rounded-md text-white font-medium ${
                isProcessing || !canManageFees
                  ? 'bg-gray-600 cursor-not-allowed'
                  : 'bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500'
              }`}
              disabled={isProcessing || !canManageFees}
            >
              {isProcessing ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Setting Fees...
                </span>
              ) : (
                'Update Program Fees'
              )}
            </button>
          </div>
        </div>
      </form>
      
      {/* Transaction Success Message */}
      {isSetFeesConfirmed && !isSetFeesConfirming && (
        <div className="mt-4 bg-green-500/20 text-green-400 border border-green-500/30 rounded-md p-4">
          <div className="flex items-start">
            <svg className="w-5 h-5 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-medium">Program Fees Successfully Updated</p>
              <p className="text-xs mt-1">The program fees have been successfully updated on the blockchain.</p>
              <div className="mt-2 pt-2 border-t border-green-500/20">
                <p className="text-xs text-gray-300">Transaction Hash:</p>
                <a
                  href={`https://etherscan.io/tx/${setFeesTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-400 font-mono break-all hover:underline"
                >
                  {setFeesTxHash}
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Transaction Error Message */}
      {setFeesError && (
        <div className="mt-4 bg-red-500/20 text-red-400 border border-red-500/30 rounded-md p-4">
          <div className="flex items-start">
            <svg className="w-5 h-5 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-medium">Error Setting Program Fees</p>
              <p className="text-xs mt-1">
                {(setFeesError as Error).message || 'An unknown error occurred while setting the program fees.'}
              </p>
              <p className="text-xs mt-2 text-gray-300">
                This may happen if the program does not exist or the fee values are invalid.
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
        <h4 className="text-sm font-medium text-gray-300 mb-2">About Program Fee Management</h4>
        <p className="text-sm text-gray-400 mb-3">
          This component allows authorized administrators to set and update program fees on the blockchain. Two security checks are performed:
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <div className="bg-gray-700/20 rounded-md p-3">
            <h5 className="text-xs font-medium text-purple-400 mb-1">Role Verification</h5>
            <p className="text-xs text-gray-400">
              Only addresses with the ADMIN_ROLE can set program fees, ensuring that financial configuration is restricted to authorized administrators.
            </p>
          </div>
          
          <div className="bg-gray-700/20 rounded-md p-3">
            <h5 className="text-xs font-medium text-purple-400 mb-1">System Status Check</h5>
            <p className="text-xs text-gray-400">
              Fees cannot be updated if the system is paused, which might occur during maintenance, upgrades, or security incidents.
            </p>
          </div>
        </div>
        
        <p className="text-xs text-gray-400">
          Setting program fees updates the fee structure for a specific academic program, affecting registration, term, graduation, and late fees. These values are specified in wei (the smallest unit of Ethereum) and will be used for all future financial operations.
        </p>
      </div>
    </motion.div>
  );
};

export default ProgramFeeManager;