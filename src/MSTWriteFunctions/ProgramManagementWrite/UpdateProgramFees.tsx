import { useState, useEffect } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, useReadContract, useAccount } from 'wagmi';
import { motion } from 'framer-motion';
import { formatEther, parseEther } from 'viem';

// Import the components we need to integrate
import CurrentProgramIdReader from '../../MSTReadfunction/ProgramManagementRead/getProgramID';  
import RoleChecker from '../../MSTReadfunction/ProgramManagementRead/hasRole';

/**
 * Integrated ProgramFeeUpdater Component
 * 
 * This component integrates program ID reading, role checking, and fee updating
 * into a streamlined workflow. It ensures that:
 * 1. The current program ID is retrieved first
 * 2. The user has the ADMIN_ROLE before allowing fee updates
 * 3. The program fee is updated only if both conditions are met
 */
interface ProgramFeeUpdaterProps {
  contract: any;
  onFeeUpdated?: (success: boolean, programId: number, newFee: bigint, txHash?: string) => void;
}

interface ProgramData {
  termFee: bigint;
  [key: string]: any;
}

const ProgramFeeUpdater = ({ 
  contract,
  onFeeUpdated
}: ProgramFeeUpdaterProps) => {
  // Get current connected wallet address
  const { address } = useAccount();
  
  // State for component workflow
  const [programId, setProgramId] = useState<number>(0);
  const [hasAdminRole, setHasAdminRole] = useState<boolean>(false);
  const [roleCheckComplete, setRoleCheckComplete] = useState<boolean>(false);
  
  // State for fee management
  const [currentFee, setCurrentFee] = useState<bigint>(BigInt(0));
  const [newFeeInput, setNewFeeInput] = useState<string>('');
  const [inputError, setInputError] = useState<string>('');
  const [showSuccess, setShowSuccess] = useState<boolean>(false);
  
  // Define the ADMIN_ROLE constant - typically this would come from a constants file
  const ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000"; // Default admin role
  
  // Predefined roles for the RoleChecker
  const predefinedRoles = {
    "Admin Role": ADMIN_ROLE,
    // Add other roles as needed
  };
  
  // Get current program fee when programId changes
  const { 
    data: programData,
    isLoading: isLoadingProgram,
    isSuccess: isProgramSuccess,
    refetch: refetchProgram
  } = useReadContract({
    ...contract,
    functionName: 'programs',
    args: [programId],
    enabled: programId > 0, // Only run if we have a valid program ID
  });

  // Extract current fee from program data
  useEffect(() => {
    if (programData && isProgramSuccess) {
      setCurrentFee((programData as ProgramData).termFee);
    }
  }, [programData, isProgramSuccess]);

  // Write contract hook for updating program fee
  const { 
    writeContractAsync, 
    data: txHash,
    error: writeError,
    isPending: isWritePending,
    reset: resetWrite
  } = useWriteContract();

  // Hook to wait for transaction receipt
  const { 
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    error: confirmError
  } = useWaitForTransactionReceipt({ 
    hash: txHash
  });

  // Loading states and errors
  const isLoading = isWritePending || isConfirming;
  const error = writeError || confirmError;

  // Callback when program ID is read
  const handleProgramIdRead = (id: number) => {
    setProgramId(id);
  };

  // Callback when role check is complete
  const handleRoleCheckResult = (hasRole: boolean) => {
    setHasAdminRole(hasRole);
    setRoleCheckComplete(true);
  };

  // Validate input as user types
  useEffect(() => {
    if (!newFeeInput) {
      setInputError('');
      return;
    }

    try {
      const parsedValue = parseFloat(newFeeInput);
      if (isNaN(parsedValue)) {
        setInputError('Please enter a valid number');
        return;
      }

      if (parsedValue < 0) {
        setInputError('Fee cannot be negative');
        return;
      }

      setInputError('');
    } catch (err) {
      setInputError('Invalid fee amount');
    }
  }, [newFeeInput]);

  // Handle fee update submission
  const handleUpdateFee = async () => {
    if (isLoading || !hasAdminRole || inputError || !newFeeInput || programId <= 0) return;
    
    try {
      setShowSuccess(false);
      
      // Convert ETH input to wei
      const newFeeInWei = parseEther(newFeeInput);
      
      const hash = await writeContractAsync({
        ...contract,
        functionName: 'updateProgramFee',
        args: [programId, newFeeInWei]
      });
      
      // Call onFeeUpdated callback if provided
      if (onFeeUpdated) {
        onFeeUpdated(true, programId, newFeeInWei, hash);
      }
    } catch (err) {
      if (onFeeUpdated) {
        onFeeUpdated(false, programId, BigInt(0));
      }
      console.error('Error updating program fee:', err);
    }
  };

  // Reset form
  const resetForm = () => {
    setNewFeeInput('');
    setInputError('');
    if (resetWrite) resetWrite();
    setShowSuccess(false);
    refetchProgram();
  };

  // Show success message when confirmed
  useEffect(() => {
    if (isConfirmed && !showSuccess) {
      setShowSuccess(true);
    }
  }, [isConfirmed, showSuccess]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 space-y-6"
    >
      <h3 className="text-xl font-medium text-blue-400 mb-1">
        Program Fee Management
      </h3>
      
      <div className="bg-gray-700/30 rounded-md p-3">
        <p className="text-sm text-gray-300">
          This panel allows administrators to update program fees. First, select a program,
          then verify your admin role, and finally update the fee.
        </p>
      </div>
      
      {/* Step 1: Program ID Reader Section */}
      <div className="border border-gray-700 rounded-lg p-4">
        <h4 className="text-md font-medium text-blue-400 mb-3">Step 1: Select Program</h4>
        <CurrentProgramIdReader 
          contract={contract}
          onProgramIdRead={handleProgramIdRead}
        />
      </div>
      
      {/* Step 2: Role Checker Section */}
      {programId > 0 && (
        <div className="border border-gray-700 rounded-lg p-4">
          <h4 className="text-md font-medium text-blue-400 mb-3">Step 2: Verify Admin Role</h4>
          <RoleChecker
            contract={contract}
            initialRoleId={ADMIN_ROLE}
            initialAddress={address || ''}
            predefinedRoles={predefinedRoles}
            onRoleCheckResult={handleRoleCheckResult}
          />
        </div>
      )}
      
      {/* Step 3: Fee Updater Section */}
      {programId > 0 && roleCheckComplete && (
        <div className="border border-gray-700 rounded-lg p-4">
          <h4 className="text-md font-medium text-blue-400 mb-3">
            Step 3: Update Program Fee
            {!hasAdminRole && (
              <span className="ml-2 text-red-400 text-sm">(Admin role required)</span>
            )}
          </h4>
          
          {!hasAdminRole ? (
            <div className="bg-red-500/20 text-red-400 border border-red-500/30 rounded-md p-3">
              <p className="text-sm">
                You do not have the Admin role required to update program fees.
                Please contact your administrator for assistance.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Current Fee Display */}
              <div className="bg-gray-700/50 rounded-md p-3">
                <p className="text-xs text-gray-400 mb-1">Current Program Fee for Program #{programId}:</p>
                {isLoadingProgram ? (
                  <div className="flex items-center">
                    <div className="w-4 h-4 border-2 border-t-blue-400 border-blue-200/30 rounded-full animate-spin mr-2"></div>
                    <span className="text-sm text-gray-300">Loading...</span>
                  </div>
                ) : isProgramSuccess ? (
                  <div className="flex items-baseline">
                    <p className="text-xl font-bold text-white">{formatEther(currentFee)}</p>
                    <p className="text-sm text-gray-400 ml-1">ETH</p>
                  </div>
                ) : (
                  <p className="text-sm text-red-400">Error loading current fee</p>
                )}
              </div>
              
              {/* New Fee Input */}
              <div>
                <label htmlFor="new-fee-input" className="block text-sm text-gray-400 mb-1">
                  New Fee (ETH):
                </label>
                <div className="flex space-x-2">
                  <div className="relative flex-1">
                    <input
                      id="new-fee-input"
                      type="text"
                      value={newFeeInput}
                      onChange={(e) => setNewFeeInput(e.target.value)}
                      disabled={isLoading}
                      placeholder="0.01"
                      className={`w-full bg-gray-700/50 border ${
                        inputError
                          ? 'border-red-500/50 focus:border-red-500'
                          : 'border-gray-600 focus:border-blue-500'
                      } rounded px-3 py-2 text-sm text-gray-200 focus:outline-none`}
                    />
                    {inputError && (
                      <p className="absolute text-xs text-red-400 mt-1">{inputError}</p>
                    )}
                  </div>
                  
                  <button
                    onClick={handleUpdateFee}
                    disabled={isLoading || !!inputError || !newFeeInput}
                    className={`px-4 py-2 rounded-md text-sm font-medium ${
                      isLoading || !!inputError || !newFeeInput
                        ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    {isLoading ? (
                      <div className="flex items-center">
                        <div className="w-4 h-4 border-2 border-t-white border-white/30 rounded-full animate-spin mr-2"></div>
                        {isConfirming ? 'Confirming...' : 'Processing...'}
                      </div>
                    ) : (
                      'Update Fee'
                    )}
                  </button>
                </div>
              </div>
              
              {/* Transaction Status */}
              {error && (
                <div className="bg-red-500/20 text-red-400 border border-red-500/30 rounded-md p-3">
                  <p className="text-sm">Error: {(error as Error).message || 'Failed to update program fee'}</p>
                  <button 
                    onClick={resetForm}
                    className="text-xs mt-2 bg-gray-700 hover:bg-gray-600 text-gray-200 py-1 px-2 rounded"
                  >
                    Reset
                  </button>
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
                      <p className="text-sm font-medium">Program fee successfully updated!</p>
                      <p className="text-xs mt-1">
                        Program #{programId} new fee: {newFeeInput} ETH
                      </p>
                      {txHash && (
                        <p className="text-xs mt-1 break-all">
                          Transaction Hash: {txHash}
                        </p>
                      )}
                      <button 
                        onClick={resetForm}
                        className="text-xs mt-2 bg-green-800/30 hover:bg-green-800/50 text-green-300 py-1 px-2 rounded"
                      >
                        Update Another Fee
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          )}
        </div>
      )}
      
      {/* Help text when no program is selected */}
      {!programId && (
        <div className="bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-md p-3">
          <p className="text-sm">
            Please select a program using the program reader above to continue.
          </p>
        </div>
      )}
    </motion.div>
  );
};

export default ProgramFeeUpdater;