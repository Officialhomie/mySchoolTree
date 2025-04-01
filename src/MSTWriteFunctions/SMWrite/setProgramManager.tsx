import { useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { motion } from 'framer-motion';

/**
 * ProgramManagementSetter Component
 * 
 * This component provides an admin interface to set the program management address.
 * It uses the setProgramManagement contract function to update the address that has
 * authority over program management operations.
 */
interface ProgramManagementSetterProps {
  contract: any;
  currentProgramManagement?: string; // Optional: current program management address
  onUpdateSuccess?: (newAddress: string, txHash: string) => void;
  onUpdateError?: (error: Error) => void;
}

const ProgramManagementSetter = ({
  contract,
  currentProgramManagement = '',
  onUpdateSuccess,
  onUpdateError
}: ProgramManagementSetterProps) => {
  // Form state
  const [programManagementAddress, setProgramManagementAddress] = useState<string>(currentProgramManagement);
  const [validationError, setValidationError] = useState<string>('');
  
  // Contract write state
  const { 
    data: hash,
    error: writeError,
    isPending: isWritePending,
    writeContract
  } = useWriteContract();
  
  // Transaction receipt state
  const { 
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    error: confirmError
  } = useWaitForTransactionReceipt({ 
    hash,
  });
  
  // Combined error and processing states
  const error = writeError || confirmError;
  const isProcessing = isWritePending || isConfirming;
  
  // Validate address format
  const validateAddress = (address: string): boolean => {
    if (!address) {
      setValidationError('Program management address is required');
      return false;
    }
    
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      setValidationError('Invalid Ethereum address format');
      return false;
    }
    
    setValidationError('');
    return true;
  };
  
  // Handle address change
  const handleAddressChange = (value: string) => {
    setProgramManagementAddress(value);
    if (validationError) {
      setValidationError('');
    }
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Validate address
      if (!validateAddress(programManagementAddress)) {
        return;
      }
      
      // Check if it's the same as current address
      if (currentProgramManagement && 
          programManagementAddress.toLowerCase() === currentProgramManagement.toLowerCase()) {
        setValidationError('New address is the same as the current address');
        return;
      }
      
      // Execute contract call
      writeContract({
        ...contract,
        functionName: 'setProgramManagement',
        args: [programManagementAddress as `0x${string}`]
      });
    } catch (err) {
      if (onUpdateError && err instanceof Error) {
        onUpdateError(err);
      }
    }
  };
  
  // Call success callback when confirmed
  if (isConfirmed && hash && !isConfirming) {
    if (onUpdateSuccess) {
      onUpdateSuccess(programManagementAddress, hash);
    }
  }
  
  // Get update status and styling
  const getUpdateStatus = () => {
    if (isWritePending) {
      return { text: 'Updating Address', color: 'text-yellow-400', bg: 'bg-yellow-500/20' };
    }
    
    if (isConfirming) {
      return { text: 'Confirming Update', color: 'text-blue-400', bg: 'bg-blue-500/20' };
    }
    
    if (isConfirmed) {
      return { text: 'Address Updated', color: 'text-green-400', bg: 'bg-green-500/20' };
    }
    
    if (error) {
      return { text: 'Update Failed', color: 'text-red-400', bg: 'bg-red-500/20' };
    }
    
    return { text: 'Admin Function', color: 'text-purple-400', bg: 'bg-purple-500/20' };
  };
  
  const status = getUpdateStatus();
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-gray-800/50 border border-gray-700 rounded-lg p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-medium text-blue-400">
          Program Management Setting
        </h3>
        
        {/* Admin Badge */}
        <div className="px-2 py-1 bg-purple-500/20 border border-purple-400/30 rounded-md">
          <span className="text-xs font-medium text-purple-400">Admin Only</span>
        </div>
      </div>
      
      {/* Status Badge */}
      <div className={`inline-flex items-center px-3 py-1 rounded-full ${status.bg} border border-${status.color.replace('text-', '')}/30 mb-4`}>
        <div className={`w-2 h-2 rounded-full ${status.color.replace('text-', 'bg-')} mr-2`}></div>
        <span className={`text-sm font-medium ${status.color}`}>
          {status.text}
        </span>
      </div>
      
      {/* Current Address Display (if available) */}
      {currentProgramManagement && (
        <div className="mb-4 p-3 bg-gray-700/20 rounded-md border border-gray-600">
          <p className="text-xs text-gray-400 mb-1">Current Program Management Address:</p>
          <div className="flex items-center">
            <span className="text-sm font-mono text-gray-300 truncate">{currentProgramManagement}</span>
          </div>
        </div>
      )}
      
      {/* Update Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-gray-700/30 rounded-lg p-4">
          <div className="space-y-2">
            <label htmlFor="program-management-address" className="block text-sm font-medium text-gray-300">
              New Program Management Address
            </label>
            <input
              id="program-management-address"
              type="text"
              value={programManagementAddress}
              onChange={(e) => handleAddressChange(e.target.value)}
              placeholder="0x..."
              className={`w-full px-3 py-2 bg-gray-700 border ${
                validationError ? 'border-red-500' : 'border-gray-600'
              } rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
              disabled={isProcessing}
            />
            {validationError && (
              <p className="text-xs text-red-400">{validationError}</p>
            )}
            <p className="text-xs text-gray-400">
              Enter the Ethereum address that will be granted program management authority
            </p>
          </div>
        </div>
        
        {/* Warning Notice */}
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-md p-3">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-yellow-400 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <h5 className="text-sm font-medium text-yellow-400 mb-1">Administrative Permission Change</h5>
              <p className="text-xs text-gray-300">
                Changing the program management address transfers control of program-related functions to a new address. 
                This action can only be performed by the contract administrator and cannot be easily reversed.
              </p>
            </div>
          </div>
        </div>
        
        {/* Error Display */}
        {error && (
          <div className="bg-red-500/20 text-red-400 border border-red-500/30 rounded-md p-3">
            <p className="text-sm">Error updating program management: {(error as Error).message || 'Unknown error'}</p>
          </div>
        )}
        
        {/* Success Display */}
        {isConfirmed && hash && (
          <div className="bg-green-500/20 text-green-400 border border-green-500/30 rounded-md p-3">
            <p className="text-sm">Program management address successfully updated!</p>
            <div className="flex flex-col space-y-1 mt-2">
              <div className="flex items-center">
                <span className="text-xs text-gray-400 w-20">New Address:</span>
                <span className="text-xs text-white font-mono truncate">{programManagementAddress}</span>
              </div>
              <div className="flex items-center mt-1">
                <span className="text-xs text-gray-400 w-20">TX Hash:</span>
                <a 
                  href={`https://etherscan.io/tx/${hash}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-blue-400 font-mono truncate hover:underline"
                >
                  {hash}
                </a>
              </div>
            </div>
          </div>
        )}
        
        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            className={`px-4 py-2 rounded-md text-white font-medium transition-colors ${
              isProcessing
                ? 'bg-gray-600 cursor-not-allowed'
                : 'bg-purple-600 hover:bg-purple-700'
            }`}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {isWritePending ? 'Updating...' : 'Confirming...'}
              </span>
            ) : isConfirmed ? (
              'Update Complete'
            ) : (
              'Update Program Management'
            )}
          </button>
        </div>
      </form>
      
      {/* Additional Information */}
      <div className="mt-4 pt-4 border-t border-gray-700">
        <h4 className="text-sm font-medium text-gray-300 mb-2">Administrative Function Information</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 gap-x-4 text-xs">
          <div>
            <span className="text-gray-400">Function: </span>
            <span className="text-gray-200 font-mono">setProgramManagement(address)</span>
          </div>
          <div>
            <span className="text-gray-400">Access Level: </span>
            <span className="text-purple-400">Administrator Only</span>
          </div>
          <div>
            <span className="text-gray-400">Transaction Type: </span>
            <span className="text-gray-200">Non-payable</span>
          </div>
          <div>
            <span className="text-gray-400">Gas Estimate: </span>
            <span className="text-gray-200">~50,000 gas</span>
          </div>
        </div>
        <div className="mt-3 text-xs text-gray-400">
          <p className="mb-1">This function sets the address that has authority to manage educational programs.</p>
          <p>The program management address can perform operations like creating, updating, and managing program-related data.</p>
        </div>
      </div>
    </motion.div>
  );
};

export default ProgramManagementSetter;