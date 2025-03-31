import { useState, useEffect } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { motion } from 'framer-motion';

const ManagementContractsSetter = ({ contract }: { contract: any }) => {
  // Input states
  const [studentManagement, setStudentManagement] = useState<string>('');
  const [programManagement, setProgramManagement] = useState<string>('');
  
  // Form validation state
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [validForm, setValidForm] = useState(false);
  
  // UI state
  const [confirmationState, setConfirmationState] = useState<'initial' | 'confirm' | 'confirmed'>('initial');
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState<'success' | 'error' | 'info' | 'warning'>('info');
  const [showStatus, setShowStatus] = useState(false);
  
  // Transaction state
  const { data: hash, isPending, writeContract, error: writeError, reset: resetWrite } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed, error: confirmError } = useWaitForTransactionReceipt({ hash });

  // Input validation for ethereum addresses
  const isValidAddress = (address: string): boolean => {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  };

  // Handle address input changes
  const handleAddressChange = (value: string, setter: React.Dispatch<React.SetStateAction<string>>, field: string) => {
    setter(value);
    
    if (!isValidAddress(value) && value !== '') {
      setErrors(prev => ({ ...prev, [field]: 'Please enter a valid Ethereum address' }));
    } else {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Validate the entire form
  useEffect(() => {
    const requiredAddresses = [studentManagement, programManagement];
    const allAddressesFilled = requiredAddresses.every(addr => addr.trim() !== '');
    const allAddressesValid = requiredAddresses.every(addr => isValidAddress(addr));
    
    const noErrors = Object.keys(errors).length === 0;
    
    setValidForm(allAddressesFilled && allAddressesValid && noErrors);
  }, [studentManagement, programManagement, errors]);

  // Handle transaction success
  useEffect(() => {
    if (isConfirmed && hash) {
      setStatusMessage(`Management contracts successfully set!`);
      setStatusType('success');
      setShowStatus(true);
      setConfirmationState('confirmed');
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

  // Initial request to set management contracts
  const handleSetRequest = () => {
    if (!validForm) {
      setStatusMessage('Please fix form errors before submitting');
      setStatusType('error');
      setShowStatus(true);
      return;
    }
    
    // Set to confirmation state
    setConfirmationState('confirm');
    
    setStatusMessage('You are about to set the management contracts. Please review the details and confirm.');
    setStatusType('warning');
    setShowStatus(true);
  };

  // Handle the set contracts action after confirmation
  const handleSetConfirm = async () => {
    try {
      // Reset any previous errors
      resetWrite?.();
      
      // Execute the contract write
      writeContract({
        ...contract,
        functionName: 'setManagementContracts',
        args: [
          studentManagement,
          programManagement
        ]
      });
      
      setStatusMessage('Transaction submitted. Waiting for confirmation...');
      setStatusType('info');
      setShowStatus(true);
    } catch (err) {
      console.error('Error setting management contracts:', err);
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

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-gray-900/90 backdrop-blur-sm border border-gray-700 shadow-xl rounded-lg p-6 max-w-full mx-auto w-full md:max-w-full mb-9"
    >
      <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
        Set Management Contracts
      </h2>
      
      <p className="text-gray-300 text-sm mb-6">
        Configure the addresses of the student and program management contracts.
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
            <div className="w-8 h-8 border-4 border-t-blue-400 border-r-purple-500 border-b-blue-400 border-l-purple-500 rounded-full animate-spin mr-3"></div>
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
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <p className="text-sm text-gray-300">
              Set the addresses of the student and program management contracts for the system.
              These contracts are essential for the proper functioning of the platform.
            </p>
          </div>
          
          {/* Contract Addresses Section */}
          <div className="bg-gray-800/20 p-4 rounded-lg border border-gray-700">
            <h3 className="text-lg font-medium mb-4 text-blue-400">Contract Addresses</h3>
            
            <div className="space-y-4">
              {/* Student Management Address */}
              <div>
                <label htmlFor="studentManagement" className="block text-sm font-medium text-gray-300 mb-1">
                  Student Management Address <span className="text-red-400">*</span>
                </label>
                <input
                  id="studentManagement"
                  type="text"
                  value={studentManagement}
                  onChange={(e) => handleAddressChange(e.target.value, setStudentManagement, 'studentManagement')}
                  placeholder="0x..."
                  disabled={isPending || isConfirming}
                  className={`bg-gray-800 border ${errors.studentManagement ? 'border-red-500' : 'border-gray-600'} text-gray-200 text-sm rounded-lg focus:ring-blue-500 focus:border-purple-500 block w-full p-2.5 disabled:opacity-60`}
                />
                {errors.studentManagement && (
                  <p className="mt-1 text-xs text-red-400">{errors.studentManagement}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  The address of the contract that manages student data and operations
                </p>
              </div>
              
              {/* Program Management Address */}
              <div>
                <label htmlFor="programManagement" className="block text-sm font-medium text-gray-300 mb-1">
                  Program Management Address <span className="text-red-400">*</span>
                </label>
                <input
                  id="programManagement"
                  type="text"
                  value={programManagement}
                  onChange={(e) => handleAddressChange(e.target.value, setProgramManagement, 'programManagement')}
                  placeholder="0x..."
                  disabled={isPending || isConfirming}
                  className={`bg-gray-800 border ${errors.programManagement ? 'border-red-500' : 'border-gray-600'} text-gray-200 text-sm rounded-lg focus:ring-blue-500 focus:border-purple-500 block w-full p-2.5 disabled:opacity-60`}
                />
                {errors.programManagement && (
                  <p className="mt-1 text-xs text-red-400">{errors.programManagement}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  The address of the contract that manages educational programs and courses
                </p>
              </div>
            </div>
          </div>
          
          {/* Action Button */}
          <motion.button
            onClick={handleSetRequest}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={!validForm || isPending || isConfirming}
            className={`w-full py-3 px-4 rounded-md text-white font-medium shadow-lg transition-all duration-300 ${
              validForm 
                ? 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700' 
                : 'bg-gray-700 cursor-not-allowed'
            } ${
              isPending || isConfirming ? 'opacity-70' : 'opacity-100'
            }`}
          >
            Set Management Contracts
          </motion.button>
        </div>
      )}

      {/* Confirmation Dialog */}
      {confirmationState === 'confirm' && (
        <div className="space-y-6">
          <div className="bg-blue-900/30 border border-blue-700/50 rounded-md p-4">
            <h3 className="text-lg font-semibold text-blue-400 mb-3">Confirm Contract Settings</h3>
            
            <div className="space-y-4">
              <div className="bg-gray-800/50 rounded-md p-3">
                <h4 className="text-md font-medium text-blue-300 mb-2">Contract Addresses</h4>
                
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-gray-400">Student Management:</p>
                    <p className="text-sm font-mono text-gray-300 break-all">{studentManagement}</p>
                  </div>
                  
                  <div>
                    <p className="text-xs text-gray-400">Program Management:</p>
                    <p className="text-sm font-mono text-gray-300 break-all">{programManagement}</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Warning Message */}
            <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-md">
              <p className="text-sm text-yellow-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline-block mr-1 mb-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <strong>Important:</strong> Setting these contract addresses will affect the overall system functionality. Make sure the addresses are correct before proceeding.
              </p>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex space-x-3">
            <motion.button
              onClick={handleCancel}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex-1 py-2 px-4 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-md transition-colors duration-300"
            >
              Cancel
            </motion.button>
            
            <motion.button
              onClick={handleSetConfirm}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={isPending || isConfirming}
              className={`flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors duration-300 ${
                isPending || isConfirming ? 'opacity-70 cursor-not-allowed' : 'opacity-100'
              }`}
            >
              {isPending 
                ? 'Submitting...' 
                : isConfirming 
                  ? 'Confirming...' 
                  : 'Confirm Settings'
              }
            </motion.button>
          </div>
        </div>
      )}
      
      {/* Success State */}
      {confirmationState === 'confirmed' && (
        <div className="space-y-6">
          <div className="bg-green-900/30 border border-green-700/50 rounded-md p-4 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto mb-2 text-green-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <h3 className="text-lg font-semibold text-green-400">Management Contracts Set</h3>
            <p className="text-sm text-gray-300 mt-2">
              The management contract addresses have been successfully set. The system is now properly configured
              to work with the student and program management contracts.
            </p>
          </div>
          
          {/* Transaction Details */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-md p-4">
            <h3 className="text-md font-semibold text-blue-400 mb-2">Transaction Details</h3>
            
            <div className="mt-3">
              <p className="text-sm text-gray-400 mb-1">Transaction Hash</p>
              <div className="flex items-center">
                <div className="font-mono text-xs bg-gray-800 p-2 rounded-md text-gray-300 overflow-x-auto max-w-full flex-1 break-all">
                  {hash}
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(hash || '');
                    setStatusMessage('Transaction hash copied to clipboard!');
                    setStatusType('success');
                    setShowStatus(true);
                  }}
                  className="ml-2 p-2 bg-gray-700 hover:bg-gray-600 rounded-md text-gray-300"
                  title="Copy to clipboard"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                    <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
          
          {/* Configuration Summary */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-md p-4">
            <h3 className="text-md font-semibold text-blue-400 mb-3">Configuration Summary</h3>
            
            <div className="space-y-2">
              <div>
                <p className="text-xs text-gray-400">Student Management Contract:</p>
                <p className="text-sm font-mono text-gray-300 break-all">{studentManagement}</p>
              </div>
              
              <div>
                <p className="text-xs text-gray-400">Program Management Contract:</p>
                <p className="text-sm font-mono text-gray-300 break-all">{programManagement}</p>
              </div>
            </div>
          </div>
          
          {/* Done Button */}
          <motion.button
            onClick={() => {
              setConfirmationState('initial');
              setStudentManagement('');
              setProgramManagement('');
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-3 px-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-medium rounded-md shadow-lg transition-all duration-300"
          >
            Done
          </motion.button>
        </div>
      )}
    </motion.div>
  );
};

export default ManagementContractsSetter;