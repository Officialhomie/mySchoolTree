import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { motion } from 'framer-motion';
import { ethers } from 'ethers';

/**
 * ProgramFeesManagement Component
 * 
 * This component provides an interface for updating program fees in a smart contract.
 * It allows administrators to update the following fee types:
 * 1. Program Fee - The fee charged for program enrollment
 * 2. Certificate Fee - The fee charged for certificate issuance
 * 3. Subscription Fee - The fee charged for subscription services
 * 4. Revenue Share - The percentage of revenue shared with stakeholders
 * 
 * The component provides validation, confirmation workflows, and educational
 * content to ensure administrators understand the implications of fee changes.
 */
const ProgramFeesManagement = ({ contract }: { contract: any }) => {
  // Connected wallet account
  useAccount();

  // Fee states
  const [programFee, setProgramFee] = useState<string>('');
  const [certificateFee, setCertificateFee] = useState<string>('');
  const [subscriptionFee, setSubscriptionFee] = useState<string>('');
  const [revenueShare, setRevenueShare] = useState<string>('');

  // Current fee states (from blockchain)
  const [currentFees, setCurrentFees] = useState({
    programFee: '',
    certificateFee: '',
    subscriptionFee: '',
    revenueShare: ''
  });

  // Form validation state
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [validForm, setValidForm] = useState(false);

  // UI state
  const [confirmationState, setConfirmationState] = useState<'initial' | 'confirm' | 'confirmed'>('initial');
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState<'success' | 'error' | 'info' | 'warning'>('info');
  const [showStatus, setShowStatus] = useState(false);
  const [loadingCurrentFees, setLoadingCurrentFees] = useState(false);

  // Transaction state
  const { data: hash, isPending, writeContract, error: writeError, reset: resetWrite } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed, error: confirmError } = useWaitForTransactionReceipt({ hash });

  // Function to fetch current fees
  const fetchCurrentFees = async () => {
    setLoadingCurrentFees(true);
    
    try {
      // Assuming there are getter functions for each fee type
      // Replace these with the actual contract function names
      const getProgramFee = await useReadContract({
        ...contract,
        functionName: 'getProgramFee', // Replace with actual getter function name
        enabled: false,
      }).refetch();
      
      const getCertificateFee = await useReadContract({
        ...contract,
        functionName: 'getCertificateFee', // Replace with actual getter function name
        enabled: false,
      }).refetch();
      
      const getSubscriptionFee = await useReadContract({
        ...contract,
        functionName: 'getSubscriptionFee', // Replace with actual getter function name
        enabled: false,
      }).refetch();
      
      const getRevenueShare = await useReadContract({
        ...contract,
        functionName: 'getRevenueShare', // Replace with actual getter function name
        enabled: false,
      }).refetch();
      
      if (getProgramFee.data !== undefined) {
        setCurrentFees(prev => ({ 
          ...prev, 
          programFee: ethers.formatEther(getProgramFee.data as bigint) 
        }));
        setProgramFee(ethers.formatEther(getProgramFee.data as bigint));
      }
      
      if (getCertificateFee.data !== undefined) {
        setCurrentFees(prev => ({ 
          ...prev, 
          certificateFee: ethers.formatEther(getCertificateFee.data as bigint)
        }));
        setCertificateFee(ethers.formatEther(getCertificateFee.data as bigint));
      }
      
      if (getSubscriptionFee.data !== undefined) {
        setCurrentFees(prev => ({ 
          ...prev, 
          subscriptionFee: ethers.formatEther(getSubscriptionFee.data as bigint)
        }));
        setSubscriptionFee(ethers.formatEther(getSubscriptionFee.data as bigint));
      }
      
      if (getRevenueShare.data !== undefined) {
        // Assuming revenue share is stored as basis points (e.g., 1000 = 10%)
        const revenueSharePercent = Number(getRevenueShare.data) / 100;
        setCurrentFees(prev => ({ 
          ...prev, 
          revenueShare: revenueSharePercent.toString()
        }));
        setRevenueShare(revenueSharePercent.toString());
      }
      
    } catch (err) {
      console.error('Error fetching current fees:', err);
      setStatusMessage(`Error fetching current fees: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setStatusType('error');
      setShowStatus(true);
    } finally {
      setLoadingCurrentFees(false);
    }
  };

  // Fetch current fees on component mount
  useEffect(() => {
    fetchCurrentFees();
  }, [contract]);

  // Validate fee input
  const validateFeeInput = (value: string, fieldName: string): boolean => {
    if (value.trim() === '') {
      setErrors(prev => ({ ...prev, [fieldName]: 'This field is required' }));
      return false;
    }
    
    // Check if it's a valid number
    const num = Number(value);
    if (isNaN(num) || num < 0) {
      setErrors(prev => ({ ...prev, [fieldName]: 'Please enter a valid positive number' }));
      return false;
    }
    
    // Special validation for revenue share (must be between 0 and 100)
    if (fieldName === 'revenueShare' && (num < 0 || num > 100)) {
      setErrors(prev => ({ ...prev, [fieldName]: 'Revenue share must be between 0 and 100%' }));
      return false;
    }
    
    // Clear error if valid
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
    
    return true;
  };

  // Handle fee input changes
  const handleFeeChange = (value: string, setter: React.Dispatch<React.SetStateAction<string>>, fieldName: string) => {
    setter(value);
    validateFeeInput(value, fieldName);
  };

  // Validate the entire form
  useEffect(() => {
    const allFieldsFilled = programFee !== '' && certificateFee !== '' && 
                           subscriptionFee !== '' && revenueShare !== '';
    const noErrors = Object.keys(errors).length === 0;
    
    setValidForm(allFieldsFilled && noErrors);
  }, [programFee, certificateFee, subscriptionFee, revenueShare, errors]);

  // Handle transaction success
  useEffect(() => {
    if (isConfirmed && hash) {
      setStatusMessage('Fees updated successfully!');
      setStatusType('success');
      setShowStatus(true);
      setConfirmationState('confirmed');
      
      // Refresh the current fees
      fetchCurrentFees();
    }
  }, [isConfirmed, hash]);

  // Handle transaction errors
  useEffect(() => {
    if (writeError || confirmError) {
      const errorMessage = writeError?.message || confirmError?.message || 'An unknown error occurred';
      setStatusMessage(`Transaction failed: ${errorMessage}`);
      setStatusType('error');
      setShowStatus(true);
      setConfirmationState('initial');
    }
  }, [writeError, confirmError]);

  // Hide status message after a delay
  useEffect(() => {
    if (showStatus) {
      const timer = setTimeout(() => {
        setShowStatus(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showStatus]);

  // Initial request to update fees
  const handleUpdateFeesRequest = () => {
    if (!validForm) {
      setStatusMessage('Please fix form errors before submitting');
      setStatusType('error');
      setShowStatus(true);
      return;
    }
    
    setConfirmationState('confirm');
    setStatusMessage('You are about to update the program fees. Please review the details and confirm.');
    setStatusType('warning');
    setShowStatus(true);
  };

  // Handle fee update after confirmation
  const handleUpdateFeesConfirm = async () => {
    try {
      // Reset any previous errors
      resetWrite?.();
      
      // Convert fees to wei (except revenue share which is in basis points)
      const programFeeWei = ethers.parseEther(programFee);
      const certificateFeeWei = ethers.parseEther(certificateFee);
      const subscriptionFeeWei = ethers.parseEther(subscriptionFee);
      // Convert percentage to basis points (e.g., 10% = 1000)
      const revenueShareBasisPoints = Math.round(parseFloat(revenueShare) * 100);
      
      // Execute the contract write
      writeContract({
        ...contract,
        functionName: 'updateProgramFees',
        args: [
          programFeeWei,
          certificateFeeWei,
          subscriptionFeeWei,
          revenueShareBasisPoints
        ]
      });
      
      setStatusMessage('Transaction submitted. Waiting for confirmation...');
      setStatusType('info');
      setShowStatus(true);
    } catch (err) {
      console.error('Error updating fees:', err);
      setStatusMessage(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setStatusType('error');
      setShowStatus(true);
      setConfirmationState('initial');
    }
  };

  // Cancel the operation request
  const handleCancel = () => {
    setConfirmationState('initial');
    setStatusMessage('Operation cancelled');
    setStatusType('info');
    setShowStatus(true);
  };

  // Reset to default values
  const handleReset = () => {
    setProgramFee(currentFees.programFee);
    setCertificateFee(currentFees.certificateFee);
    setSubscriptionFee(currentFees.subscriptionFee);
    setRevenueShare(currentFees.revenueShare);
    setErrors({});
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-gray-900/90 backdrop-blur-sm border border-gray-700 shadow-xl rounded-lg p-6 max-w-full mx-auto w-full md:max-w-full mb-9"
    >
      <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-green-400 to-teal-500 bg-clip-text text-transparent">
        Program Fees Management
      </h2>
      
      <p className="text-gray-300 text-sm mb-6">
        Update the fees charged for program services and revenue sharing percentages.
      </p>

      {/* Status Messages */}
      {showStatus && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className={`p-3 rounded-md mb-6 ${
            statusType === 'success' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 
            statusType === 'error' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 
            statusType === 'warning' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
            'bg-blue-500/20 text-blue-400 border border-blue-500/30'
          }`}
        >
          <p className="text-sm">{statusMessage}</p>
          {hash && (
            <div className="mt-2 pt-2 border-t border-gray-700">
              <p className="text-xs">Transaction Hash:</p>
              <div className="flex items-center mt-1">
                <p className="text-xs font-mono truncate">{hash}</p>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(hash);
                    setStatusMessage('Transaction hash copied to clipboard!');
                    setStatusType('success');
                  }}
                  className="ml-2 p-1 bg-gray-800 hover:bg-gray-700 rounded text-gray-300"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                    <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Transaction Progress */}
      {(isPending || isConfirming) && (
        <div className="flex flex-col items-center justify-center p-4 border border-gray-700 rounded-md bg-gray-800/50 mb-6">
          <div className="flex items-center justify-center mb-3">
            <div className="w-8 h-8 border-4 border-t-green-400 border-r-teal-500 border-b-green-400 border-l-teal-500 rounded-full animate-spin mr-3"></div>
            <span className="text-gray-300">{isPending ? 'Waiting for wallet approval...' : 'Confirming transaction...'}</span>
          </div>
          <p className="text-xs text-gray-400 text-center">
            {isPending 
              ? 'Please confirm this transaction in your wallet' 
              : 'Transaction has been submitted. Waiting for blockchain confirmation...'}
          </p>
        </div>
      )}

      {/* Form Content - Initial State */}
      {confirmationState === 'initial' && (
        <div className="space-y-6">
          {/* Educational Info */}
          <div className="bg-blue-900/20 rounded-lg p-4 border border-blue-700/30">
            <p className="text-sm text-gray-300">
              This interface allows you to update the fees associated with the program. These fees affect how users interact with the system and how revenue is distributed. Please ensure you understand the implications of these changes before proceeding.
            </p>
          </div>
          
          {/* Current Fees Display */}
          {!loadingCurrentFees && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                <h3 className="text-sm font-semibold text-gray-400 mb-1">Current Program Fee</h3>
                <p className="text-lg font-mono text-green-400">{currentFees.programFee || '0'} ETH</p>
              </div>
              <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                <h3 className="text-sm font-semibold text-gray-400 mb-1">Current Certificate Fee</h3>
                <p className="text-lg font-mono text-green-400">{currentFees.certificateFee || '0'} ETH</p>
              </div>
              <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                <h3 className="text-sm font-semibold text-gray-400 mb-1">Current Subscription Fee</h3>
                <p className="text-lg font-mono text-green-400">{currentFees.subscriptionFee || '0'} ETH</p>
              </div>
              <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                <h3 className="text-sm font-semibold text-gray-400 mb-1">Current Revenue Share</h3>
                <p className="text-lg font-mono text-green-400">{currentFees.revenueShare || '0'}%</p>
              </div>
            </div>
          )}
          
          {loadingCurrentFees && (
            <div className="flex justify-center py-6">
              <div className="w-8 h-8 border-4 border-t-green-400 border-r-teal-500 border-b-green-400 border-l-teal-500 rounded-full animate-spin"></div>
              <span className="ml-3 text-gray-300">Loading current fee settings...</span>
            </div>
          )}
          
          {/* Fee Update Form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Program Fee */}
            <div>
              <label htmlFor="programFee" className="block text-sm font-medium text-gray-300 mb-1">
                Program Fee (ETH) <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <input
                  id="programFee"
                  type="text"
                  value={programFee}
                  onChange={(e) => handleFeeChange(e.target.value, setProgramFee, 'programFee')}
                  placeholder="0.0"
                  disabled={isPending || isConfirming}
                  className={`bg-gray-800 border ${errors.programFee ? 'border-red-500' : 'border-gray-600'} text-gray-200 text-sm rounded-lg focus:ring-green-500 focus:border-green-500 block w-full p-2.5 pr-12 disabled:opacity-60`}
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <span className="text-gray-400">ETH</span>
                </div>
              </div>
              {errors.programFee && (
                <p className="mt-1 text-xs text-red-400">{errors.programFee}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Fee charged for enrolling in the program
              </p>
            </div>
            
            {/* Certificate Fee */}
            <div>
              <label htmlFor="certificateFee" className="block text-sm font-medium text-gray-300 mb-1">
                Certificate Fee (ETH) <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <input
                  id="certificateFee"
                  type="text"
                  value={certificateFee}
                  onChange={(e) => handleFeeChange(e.target.value, setCertificateFee, 'certificateFee')}
                  placeholder="0.0"
                  disabled={isPending || isConfirming}
                  className={`bg-gray-800 border ${errors.certificateFee ? 'border-red-500' : 'border-gray-600'} text-gray-200 text-sm rounded-lg focus:ring-green-500 focus:border-green-500 block w-full p-2.5 pr-12 disabled:opacity-60`}
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <span className="text-gray-400">ETH</span>
                </div>
              </div>
              {errors.certificateFee && (
                <p className="mt-1 text-xs text-red-400">{errors.certificateFee}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Fee charged for issuing certificates
              </p>
            </div>
            
            {/* Subscription Fee */}
            <div>
              <label htmlFor="subscriptionFee" className="block text-sm font-medium text-gray-300 mb-1">
                Subscription Fee (ETH) <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <input
                  id="subscriptionFee"
                  type="text"
                  value={subscriptionFee}
                  onChange={(e) => handleFeeChange(e.target.value, setSubscriptionFee, 'subscriptionFee')}
                  placeholder="0.0"
                  disabled={isPending || isConfirming}
                  className={`bg-gray-800 border ${errors.subscriptionFee ? 'border-red-500' : 'border-gray-600'} text-gray-200 text-sm rounded-lg focus:ring-green-500 focus:border-green-500 block w-full p-2.5 pr-12 disabled:opacity-60`}
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <span className="text-gray-400">ETH</span>
                </div>
              </div>
              {errors.subscriptionFee && (
                <p className="mt-1 text-xs text-red-400">{errors.subscriptionFee}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Fee charged for subscription services
              </p>
            </div>
            
            {/* Revenue Share */}
            <div>
              <label htmlFor="revenueShare" className="block text-sm font-medium text-gray-300 mb-1">
                Revenue Share (%) <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <input
                  id="revenueShare"
                  type="text"
                  value={revenueShare}
                  onChange={(e) => handleFeeChange(e.target.value, setRevenueShare, 'revenueShare')}
                  placeholder="0"
                  disabled={isPending || isConfirming}
                  className={`bg-gray-800 border ${errors.revenueShare ? 'border-red-500' : 'border-gray-600'} text-gray-200 text-sm rounded-lg focus:ring-green-500 focus:border-green-500 block w-full p-2.5 pr-12 disabled:opacity-60`}
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <span className="text-gray-400">%</span>
                </div>
              </div>
              {errors.revenueShare && (
                <p className="mt-1 text-xs text-red-400">{errors.revenueShare}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Percentage of revenue shared with stakeholders (0-100%)
              </p>
            </div>
          </div>
          
          {/* Submit Buttons */}
          <div className="flex justify-between">
            <button
              onClick={handleReset}
              disabled={isPending || isConfirming}
              className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-200 font-medium text-sm disabled:opacity-50"
            >
              Reset to Current
            </button>
            
            <button
              onClick={handleUpdateFeesRequest}
              disabled={!validForm || isPending || isConfirming}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 text-white font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Update Fees
            </button>
          </div>
        </div>
      )}

      {/* Confirmation State */}
      {confirmationState === 'confirm' && (
        <div className="space-y-6">
          <div className="bg-yellow-900/20 rounded-lg p-4 border border-yellow-700/30">
            <h3 className="text-lg font-semibold text-gray-200 mb-3">Confirm Fee Updates</h3>
            
            <div className="space-y-4 mb-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-400">Current Program Fee</p>
                  <p className="text-md text-gray-200 font-mono">{currentFees.programFee || '0'} ETH</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">New Program Fee</p>
                  <p className="text-md text-green-400 font-mono">{programFee} ETH</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-400">Current Certificate Fee</p>
                  <p className="text-md text-gray-200 font-mono">{currentFees.certificateFee || '0'} ETH</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">New Certificate Fee</p>
                  <p className="text-md text-green-400 font-mono">{certificateFee} ETH</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-400">Current Subscription Fee</p>
                  <p className="text-md text-gray-200 font-mono">{currentFees.subscriptionFee || '0'} ETH</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">New Subscription Fee</p>
                  <p className="text-md text-green-400 font-mono">{subscriptionFee} ETH</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-400">Current Revenue Share</p>
                  <p className="text-md text-gray-200 font-mono">{currentFees.revenueShare || '0'}%</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">New Revenue Share</p>
                  <p className="text-md text-green-400 font-mono">{revenueShare}%</p>
                </div>
              </div>
            </div>
            
            <div className="bg-yellow-500/10 p-3 rounded border border-yellow-500/20 mt-4">
              <p className="text-sm text-yellow-400">
                Please review the fee changes carefully. These changes will affect all future transactions in the system. Existing transactions will not be affected.
              </p>
            </div>
          </div>
          
          <div className="flex justify-between">
            <button
              onClick={handleCancel}
              disabled={isPending || isConfirming}
              className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-200 font-medium text-sm disabled:opacity-50"
            >
              Cancel
            </button>
            
            <button
              onClick={handleUpdateFeesConfirm}
              disabled={isPending || isConfirming}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 text-white font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending || isConfirming ? 'Processing...' : 'Confirm Updates'}
            </button>
          </div>
        </div>
      )}

      {/* Confirmed State */}
      {confirmationState === 'confirmed' && (
        <div className="flex flex-col items-center justify-center py-8">
          <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
          
          <h3 className="text-xl font-bold text-green-400 mb-2">Fee Updates Successful</h3>
          <p className="text-center text-gray-300 mb-6">
            The program fees have been successfully updated in the system.
          </p>
          
          <button
            onClick={() => {
              setConfirmationState('initial');
              // Update form values to current (latest) values
              setProgramFee(currentFees.programFee);
              setCertificateFee(currentFees.certificateFee);
              setSubscriptionFee(currentFees.subscriptionFee);
              setRevenueShare(currentFees.revenueShare);
            }}
            className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-200 font-medium text-sm"
          >
            Make Another Update
          </button>
        </div>
      )}
    </motion.div>
  );
};

export default ProgramFeesManagement;