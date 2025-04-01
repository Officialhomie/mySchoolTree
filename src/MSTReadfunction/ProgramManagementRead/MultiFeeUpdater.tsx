import { useState, useEffect } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, useReadContract, useAccount } from 'wagmi';
import { motion } from 'framer-motion';
import { formatEther, parseEther } from 'viem';

// Import the components we need to integrate
import CurrentProgramIdReader from './getProgramID';
import RoleChecker from './hasRole';

/**
 * MultiFeeUpdater Component
 * 
 * This component manages the updating of multiple program fees including:
 * - Program Fee
 * - Certificate Fee
 * - Subscription Fee
 * - Revenue Share (percentage)
 * 
 * It follows a step-by-step workflow:
 * 1. Select a program
 * 2. Verify admin role
 * 3. Update the fees if authorized
 */
interface MultiFeeUpdaterProps {
  contract: any;
  onFeesUpdated?: (
    success: boolean, 
    programId: number, 
    fees: {
      programFee: bigint,
      certificateFee: bigint,
      subscriptionFee: bigint,
      revenueShare: bigint
    }, 
    txHash?: string
  ) => void;
}

interface ProgramFeesData {
  programFee: bigint;
  certificateFee: bigint;
  subscriptionFee: bigint;
  revenueShare: bigint;
  [key: string]: any;
}

const MultiFeeUpdater = ({ 
  contract,
  onFeesUpdated
}: MultiFeeUpdaterProps) => {
  // Get current connected wallet address
  const { address } = useAccount();
  
  // State for component workflow
  const [programId, setProgramId] = useState<number>(0);
  const [hasAdminRole, setHasAdminRole] = useState<boolean>(false);
  const [roleCheckComplete, setRoleCheckComplete] = useState<boolean>(false);
  
  // State for current fees
  const [currentFees, setCurrentFees] = useState<ProgramFeesData>({
    programFee: BigInt(0),
    certificateFee: BigInt(0),
    subscriptionFee: BigInt(0),
    revenueShare: BigInt(0)
  });
  
  // State for new fee inputs
  const [newProgramFee, setNewProgramFee] = useState<string>('');
  const [newCertificateFee, setNewCertificateFee] = useState<string>('');
  const [newSubscriptionFee, setNewSubscriptionFee] = useState<string>('');
  const [newRevenueShare, setNewRevenueShare] = useState<string>('');
  
  // Input validation
  const [inputErrors, setInputErrors] = useState<{
    programFee: string;
    certificateFee: string;
    subscriptionFee: string;
    revenueShare: string;
  }>({
    programFee: '',
    certificateFee: '',
    subscriptionFee: '',
    revenueShare: ''
  });
  
  // Transaction state
  const [showSuccess, setShowSuccess] = useState<boolean>(false);
  
  // Define the ADMIN_ROLE constant
  const ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000"; // Default admin role
  
  // Predefined roles for the RoleChecker
  const predefinedRoles = {
    "Admin Role": ADMIN_ROLE,
  };
  
  // Get current program fees when programId changes
  const { 
    data: feesData,
    isLoading: isLoadingFees,
    isSuccess: isFeesSuccess,
    refetch: refetchFees
  } = useReadContract({
    ...contract,
    functionName: 'getProgramFees', // Assuming this function exists to get the current fees
    args: [programId],
    enabled: programId > 0, // Only run if we have a valid program ID
  });

  // Extract current fees from data
  useEffect(() => {
    if (feesData && isFeesSuccess) {
      setCurrentFees(feesData as ProgramFeesData);
    }
  }, [feesData, isFeesSuccess]);

  // Write contract hook for updating program fees
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

  // Helper function to validate numerical input
  const validateFeeInput = (value: string, isPercentage = false): string => {
    if (!value) return '';
    
    try {
      const parsedValue = parseFloat(value);
      if (isNaN(parsedValue)) {
        return 'Please enter a valid number';
      }

      if (parsedValue < 0) {
        return 'Fee cannot be negative';
      }

      if (isPercentage && parsedValue > 100) {
        return 'Percentage cannot exceed 100%';
      }

      return '';
    } catch (err) {
      return 'Invalid amount';
    }
  };

  // Validate inputs as user types
  useEffect(() => {
    setInputErrors({
      programFee: validateFeeInput(newProgramFee),
      certificateFee: validateFeeInput(newCertificateFee),
      subscriptionFee: validateFeeInput(newSubscriptionFee),
      revenueShare: validateFeeInput(newRevenueShare, true)
    });
  }, [newProgramFee, newCertificateFee, newSubscriptionFee, newRevenueShare]);

  // Check if form is valid
  const isFormValid = (): boolean => {
    const hasErrors = Object.values(inputErrors).some(error => error !== '');
    const hasInputs = Boolean(newProgramFee || newCertificateFee || newSubscriptionFee || newRevenueShare);
    return !hasErrors && hasInputs;
  };

  // Handle fee update submission
  const handleUpdateFees = async () => {
    if (isLoading || !hasAdminRole || !isFormValid() || programId <= 0) return;
    
    try {
      setShowSuccess(false);
      
      // Use current values if new ones aren't provided
      const programFeeInWei = newProgramFee 
        ? parseEther(newProgramFee) 
        : currentFees.programFee;
        
      const certificateFeeInWei = newCertificateFee 
        ? parseEther(newCertificateFee) 
        : currentFees.certificateFee;
        
      const subscriptionFeeInWei = newSubscriptionFee 
        ? parseEther(newSubscriptionFee) 
        : currentFees.subscriptionFee;
      
      // For revenue share, convert percentage to basis points (e.g., 1% = 100)
      // Assuming the contract expects basis points for revenue share
      const revenueShareValue = newRevenueShare
        ? BigInt(Math.round(parseFloat(newRevenueShare) * 100)) // Convert to basis points
        : currentFees.revenueShare;
      
      const hash = await writeContractAsync({
        ...contract,
        functionName: 'updateProgramFees',
        args: [
          programFeeInWei,
          certificateFeeInWei,
          subscriptionFeeInWei,
          revenueShareValue
        ]
      });
      
      // Call onFeesUpdated callback if provided
      if (onFeesUpdated) {
        onFeesUpdated(
          true, 
          programId, 
          {
            programFee: programFeeInWei,
            certificateFee: certificateFeeInWei,
            subscriptionFee: subscriptionFeeInWei,
            revenueShare: revenueShareValue
          },
          hash
        );
      }
    } catch (err) {
      if (onFeesUpdated) {
        onFeesUpdated(
          false, 
          programId, 
          {
            programFee: BigInt(0),
            certificateFee: BigInt(0),
            subscriptionFee: BigInt(0),
            revenueShare: BigInt(0)
          }
        );
      }
      console.error('Error updating program fees:', err);
    }
  };

  // Reset form
  const resetForm = () => {
    setNewProgramFee('');
    setNewCertificateFee('');
    setNewSubscriptionFee('');
    setNewRevenueShare('');
    setInputErrors({
      programFee: '',
      certificateFee: '',
      subscriptionFee: '',
      revenueShare: ''
    });
    if (resetWrite) resetWrite();
    setShowSuccess(false);
    refetchFees();
  };

  // Show success message when confirmed
  useEffect(() => {
    if (isConfirmed && !showSuccess) {
      setShowSuccess(true);
    }
  }, [isConfirmed, showSuccess]);

  // Format basis points (e.g., 1000 = 10%) for display
  const formatBasisPoints = (basisPoints: bigint): string => {
    return (Number(basisPoints) / 100).toFixed(2);
  };

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
          This panel allows administrators to update all program fees including the program fee, 
          certificate fee, subscription fee, and revenue share percentage.
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
            Step 3: Update Program Fees
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
              {/* Current Fees Display */}
              <div className="bg-gray-700/50 rounded-md p-3">
                <p className="text-sm text-gray-400 mb-2">Current Fees for Program #{programId}:</p>
                {isLoadingFees ? (
                  <div className="flex items-center">
                    <div className="w-4 h-4 border-2 border-t-blue-400 border-blue-200/30 rounded-full animate-spin mr-2"></div>
                    <span className="text-sm text-gray-300">Loading current fees...</span>
                  </div>
                ) : isFeesSuccess ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-400">Program Fee:</p>
                      <p className="text-md font-medium text-white">{formatEther(currentFees.programFee)} ETH</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Certificate Fee:</p>
                      <p className="text-md font-medium text-white">{formatEther(currentFees.certificateFee)} ETH</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Subscription Fee:</p>
                      <p className="text-md font-medium text-white">{formatEther(currentFees.subscriptionFee)} ETH</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Revenue Share:</p>
                      <p className="text-md font-medium text-white">{formatBasisPoints(currentFees.revenueShare)}%</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-red-400">Error loading current fees</p>
                )}
              </div>
              
              {/* Fee Input Form */}
              <div className="space-y-4">
                <h5 className="text-sm font-medium text-gray-300">Update Fees:</h5>
                <p className="text-xs text-gray-400">Leave fields blank to keep current values.</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Program Fee Input */}
                  <div>
                    <label htmlFor="program-fee-input" className="block text-sm text-gray-400 mb-1">
                      Program Fee (ETH):
                    </label>
                    <div className="relative">
                      <input
                        id="program-fee-input"
                        type="text"
                        value={newProgramFee}
                        onChange={(e) => setNewProgramFee(e.target.value)}
                        disabled={isLoading}
                        placeholder={formatEther(currentFees.programFee)}
                        className={`w-full bg-gray-700/50 border ${
                          inputErrors.programFee
                            ? 'border-red-500/50 focus:border-red-500'
                            : 'border-gray-600 focus:border-blue-500'
                        } rounded px-3 py-2 text-sm text-gray-200 focus:outline-none`}
                      />
                      {inputErrors.programFee && (
                        <p className="absolute text-xs text-red-400 mt-1">{inputErrors.programFee}</p>
                      )}
                    </div>
                  </div>
                  
                  {/* Certificate Fee Input */}
                  <div>
                    <label htmlFor="certificate-fee-input" className="block text-sm text-gray-400 mb-1">
                      Certificate Fee (ETH):
                    </label>
                    <div className="relative">
                      <input
                        id="certificate-fee-input"
                        type="text"
                        value={newCertificateFee}
                        onChange={(e) => setNewCertificateFee(e.target.value)}
                        disabled={isLoading}
                        placeholder={formatEther(currentFees.certificateFee)}
                        className={`w-full bg-gray-700/50 border ${
                          inputErrors.certificateFee
                            ? 'border-red-500/50 focus:border-red-500'
                            : 'border-gray-600 focus:border-blue-500'
                        } rounded px-3 py-2 text-sm text-gray-200 focus:outline-none`}
                      />
                      {inputErrors.certificateFee && (
                        <p className="absolute text-xs text-red-400 mt-1">{inputErrors.certificateFee}</p>
                      )}
                    </div>
                  </div>
                  
                  {/* Subscription Fee Input */}
                  <div>
                    <label htmlFor="subscription-fee-input" className="block text-sm text-gray-400 mb-1">
                      Subscription Fee (ETH):
                    </label>
                    <div className="relative">
                      <input
                        id="subscription-fee-input"
                        type="text"
                        value={newSubscriptionFee}
                        onChange={(e) => setNewSubscriptionFee(e.target.value)}
                        disabled={isLoading}
                        placeholder={formatEther(currentFees.subscriptionFee)}
                        className={`w-full bg-gray-700/50 border ${
                          inputErrors.subscriptionFee
                            ? 'border-red-500/50 focus:border-red-500'
                            : 'border-gray-600 focus:border-blue-500'
                        } rounded px-3 py-2 text-sm text-gray-200 focus:outline-none`}
                      />
                      {inputErrors.subscriptionFee && (
                        <p className="absolute text-xs text-red-400 mt-1">{inputErrors.subscriptionFee}</p>
                      )}
                    </div>
                  </div>
                  
                  {/* Revenue Share Input */}
                  <div>
                    <label htmlFor="revenue-share-input" className="block text-sm text-gray-400 mb-1">
                      Revenue Share (%):
                    </label>
                    <div className="relative">
                      <input
                        id="revenue-share-input"
                        type="text"
                        value={newRevenueShare}
                        onChange={(e) => setNewRevenueShare(e.target.value)}
                        disabled={isLoading}
                        placeholder={formatBasisPoints(currentFees.revenueShare)}
                        className={`w-full bg-gray-700/50 border ${
                          inputErrors.revenueShare
                            ? 'border-red-500/50 focus:border-red-500'
                            : 'border-gray-600 focus:border-blue-500'
                        } rounded px-3 py-2 text-sm text-gray-200 focus:outline-none`}
                      />
                      {inputErrors.revenueShare && (
                        <p className="absolute text-xs text-red-400 mt-1">{inputErrors.revenueShare}</p>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Submit Button */}
                <div className="pt-4 flex justify-end">
                  <button
                    onClick={handleUpdateFees}
                    disabled={isLoading || !isFormValid()}
                    className={`px-6 py-2 rounded-md text-sm font-medium ${
                      isLoading || !isFormValid()
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
                      'Update All Fees'
                    )}
                  </button>
                </div>
              </div>
              
              {/* Transaction Status */}
              {error && (
                <div className="bg-red-500/20 text-red-400 border border-red-500/30 rounded-md p-3">
                  <p className="text-sm">Error: {(error as Error).message || 'Failed to update program fees'}</p>
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
                      <p className="text-sm font-medium">Program fees successfully updated!</p>
                      <div className="text-xs mt-2 space-y-1">
                        {newProgramFee && (
                          <p>Program Fee: {newProgramFee} ETH</p>
                        )}
                        {newCertificateFee && (
                          <p>Certificate Fee: {newCertificateFee} ETH</p>
                        )}
                        {newSubscriptionFee && (
                          <p>Subscription Fee: {newSubscriptionFee} ETH</p>
                        )}
                        {newRevenueShare && (
                          <p>Revenue Share: {newRevenueShare}%</p>
                        )}
                      </div>
                      {txHash && (
                        <p className="text-xs mt-2 break-all">
                          Transaction Hash: {txHash}
                        </p>
                      )}
                      <button 
                        onClick={resetForm}
                        className="text-xs mt-3 bg-green-800/30 hover:bg-green-800/50 text-green-300 py-1 px-2 rounded"
                      >
                        Update More Fees
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

export default MultiFeeUpdater;