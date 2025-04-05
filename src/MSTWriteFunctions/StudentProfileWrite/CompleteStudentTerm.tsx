import { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { useWriteContract, useAccount } from 'wagmi';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';

/**
 * Types for exported data and component props
 */
export interface TermCompletionData {
  studentAddress: string;
  isCompleted: boolean;
  completionTime: Date | null;
  isProcessing: boolean;
  error: Error | null;
}

export interface StudentTermCompletionMethods {
  getCompletionData: () => TermCompletionData;
  resetComponent: () => void;
  completeTermForAddress: (address: string) => Promise<boolean>;
}

interface StudentTermCompletionProps {
  writeContract: {
    abi: any; // Contract ABI
    address: `0x${string}`; // Contract address
  }; 
  studentAddress?: `0x${string}`; // Optional: specific student address to mark as complete
  onTermCompleted?: (success: boolean, address: string, data: TermCompletionData) => void; // Enhanced callback
  onStateChange?: (data: TermCompletionData) => void; // New callback for state changes
}

/**
 * StudentTermCompletion Component
 * 
 * This component allows administrators to mark a student as having completed their
 * academic term. It provides a simple interface to input a student address and
 * submit the transaction to the blockchain.
 * 
 * The component now exposes methods through React's forwardRef/useImperativeHandle
 * allowing parent components to access completion data and control the component.
 */
const StudentTermCompletion = forwardRef<StudentTermCompletionMethods, StudentTermCompletionProps>(({
  writeContract,
  studentAddress,
  onTermCompleted,
  onStateChange
}, ref) => {
  // Access the connected wallet address
  const { address: connectedAddress } = useAccount();
  
  // Component state
  const [address, setAddress] = useState<string>(studentAddress || '');
  const [validationError, setValidationError] = useState<string>('');
  const [showConfirmation, setShowConfirmation] = useState<boolean>(false);
  const [completionNote, setCompletionNote] = useState<string>('');
  const [completionSuccess, setCompletionSuccess] = useState<boolean | undefined>(undefined);
  const [completionTime, setCompletionTime] = useState<Date | null>(null);
  const [completionError, setCompletionErrorState] = useState<Error | null>(null);
  
  // Flag to determine if user should provide their own address
  const useCustomAddress = !studentAddress;

  // Setup the contract write operation
  const { 
    writeContractAsync,
    isPending: isProcessing,
    isSuccess: isCompletionSuccess,
    isError: isCompletionError,
    error: contractError,
    reset: resetCompletion
  } = useWriteContract();

  // Expose methods to parent components using ref
  useImperativeHandle(ref, () => ({
    // Get current completion data
    getCompletionData: () => ({
      studentAddress: address,
      isCompleted: completionSuccess === true,
      completionTime,
      isProcessing,
      error: completionError
    }),
    
    // Reset the component state
    resetComponent: () => {
      if (useCustomAddress) {
        setAddress('');
      }
      setValidationError('');
      setCompletionSuccess(undefined);
      setCompletionTime(null);
      setCompletionNote('');
      setCompletionErrorState(null);
      resetCompletion();
    },
    
    // Programmatically complete term for an address
    completeTermForAddress: async (studentAddr: string): Promise<boolean> => {
      if (!validateAddress(studentAddr)) {
        return false;
      }
      
      setAddress(studentAddr);
      
      try {
        await writeContractAsync({
          abi: writeContract.abi, 
          address: writeContract.address,
          functionName: 'completeStudentTerm',
          args: [studentAddr as `0x${string}`]
        });
        
        return true;
      } catch (error) {
        console.error('Error completing student term:', error);
        return false;
      }
    }
  }));

  // Update address state when studentAddress prop changes
  useEffect(() => {
    if (studentAddress) {
      setAddress(studentAddress);
    }
  }, [studentAddress]);
  
  // Handle effects for successful term completion
  useEffect(() => {
    if (isCompletionSuccess && completionSuccess === undefined) {
      const now = new Date();
      setCompletionSuccess(true);
      setCompletionTime(now);
      setCompletionNote('Term completion recorded successfully! The student\'s academic record has been updated.');
      setShowConfirmation(false);
      
      const completionData = {
        studentAddress: address,
        isCompleted: true,
        completionTime: now,
        isProcessing: false,
        error: null
      };
      
      if (onTermCompleted) {
        onTermCompleted(true, address, completionData);
      }
      
      if (onStateChange) {
        onStateChange(completionData);
      }
    }
  }, [isCompletionSuccess, completionSuccess, address, onTermCompleted, onStateChange]);

  // Handle effects for failed term completion
  useEffect(() => {
    if (isCompletionError && completionSuccess === undefined) {
      setCompletionSuccess(false);
      setCompletionErrorState(contractError);
      setCompletionNote(`Error recording term completion: ${contractError?.message || 'Unknown error'}`);
      
      const completionData = {
        studentAddress: address,
        isCompleted: false,
        completionTime: null,
        isProcessing: false,
        error: contractError
      };
      
      if (onStateChange) {
        onStateChange(completionData);
      }
    }
  }, [isCompletionError, contractError, completionSuccess, address, onStateChange]);

  // Notify about processing state changes
  useEffect(() => {
    if (onStateChange && address) {
      onStateChange({
        studentAddress: address,
        isCompleted: completionSuccess === true,
        completionTime,
        isProcessing,
        error: completionError
      });
    }
  }, [isProcessing, address, onStateChange, completionSuccess, completionTime, completionError]);

  // Handle address input change
  const handleAddressChange = (value: string) => {
    setAddress(value);
    setValidationError('');
    setCompletionSuccess(undefined);
    setCompletionErrorState(null);
    resetCompletion();
  };

  // Validate the Ethereum address format
  const validateAddress = (input: string): boolean => {
    if (!input) {
      setValidationError('Student address is required');
      return false;
    }
    
    if (!/^0x[a-fA-F0-9]{40}$/.test(input)) {
      setValidationError('Invalid Ethereum address format');
      return false;
    }
    
    setValidationError('');
    return true;
  };

  // Handle term completion submission
  const handleCompleteStudentTerm = async () => {
    if (!validateAddress(address)) {
      return;
    }

    try {
      // Call the contract with the correctly structured parameters
      await writeContractAsync({
        abi: writeContract.abi, 
        address: writeContract.address,
        functionName: 'completeStudentTerm',
        args: [address as `0x${string}`]
      });
      
      // Note: We don't need to set success state here as it will be handled by 
      // the useEffect that watches isCompletionSuccess
      setCompletionNote('Term completion transaction submitted. It may take a moment to process.');
    } catch (error) {
      console.error('Error completing student term:', error);
      setCompletionSuccess(false);
      setCompletionErrorState(error instanceof Error ? error : new Error('Unknown error'));
      setCompletionNote('Error submitting transaction. Please try again.');
      
      if (onStateChange) {
        onStateChange({
          studentAddress: address,
          isCompleted: false,
          completionTime: null,
          isProcessing: false,
          error: error instanceof Error ? error : new Error('Unknown error')
        });
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-gray-800/50 border border-gray-700 rounded-lg p-4"
      data-testid="student-term-completion"
    >
      <h3 className="text-lg font-medium text-blue-400 mb-3">
        Student Term Completion
      </h3>
      
      {/* Connected Wallet Information */}
      {connectedAddress && (
        <div className="mb-4 bg-gray-700/30 p-3 rounded-md">
          <p className="text-xs text-gray-400">
            Connected as: <span className="text-blue-400 font-mono">{connectedAddress}</span>
          </p>
        </div>
      )}
      
      {/* Form */}
      <div className="space-y-4 bg-gray-700/30 rounded-lg p-4">
        <h4 className="text-md font-medium text-gray-300 mb-3">
          Complete Student Term
        </h4>
        
        {/* Student Address Field */}
        <div className="space-y-2">
          <label className="block text-sm text-gray-400">Student Address</label>
          {useCustomAddress ? (
            <input
              type="text"
              value={address}
              onChange={(e) => handleAddressChange(e.target.value)}
              placeholder="0x..."
              className={`w-full px-3 py-2 bg-gray-700 border ${
                validationError ? 'border-red-500' : 'border-gray-600'
              } rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
              data-testid="student-address-input"
            />
          ) : (
            <div className="flex items-center bg-gray-700 border border-gray-600 rounded-md px-3 py-2">
              <span className="text-white font-mono">{address}</span>
            </div>
          )}
          {validationError && (
            <p className="text-xs text-red-400" data-testid="validation-error">{validationError}</p>
          )}
          <p className="text-xs text-gray-400">Enter the Ethereum address of the student who has completed their term</p>
        </div>

        {/* Test Addresses */}
        {useCustomAddress && (
          <div className="space-y-2">
            <h4 className="text-xs text-gray-400 mb-1">Test Student Addresses:</h4>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleAddressChange("0x742d35Cc6634C0532925a3b844Bc454e4438f44e")}
                className="text-xs bg-gray-600 hover:bg-gray-500 text-gray-200 py-1 px-2 rounded"
                data-testid="test-address-1"
              >
                Test Student 1
              </button>
              <button
                type="button"
                onClick={() => handleAddressChange("0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199")}
                className="text-xs bg-gray-600 hover:bg-gray-500 text-gray-200 py-1 px-2 rounded"
                data-testid="test-address-2"
              >
                Test Student 2
              </button>
            </div>
          </div>
        )}
        
        {/* Form Actions */}
        <div className="flex justify-end space-x-3 mt-4">
          {useCustomAddress && (
            <button
              type="button"
              onClick={() => {
                setAddress('');
                setValidationError('');
                setCompletionSuccess(undefined);
                setCompletionErrorState(null);
                resetCompletion();
              }}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500"
              data-testid="reset-button"
            >
              Reset
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              if (validateAddress(address)) {
                setShowConfirmation(true);
              }
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isProcessing}
            data-testid="complete-term-button"
          >
            {isProcessing ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </span>
            ) : (
              'Complete Term'
            )}
          </button>
        </div>
      </div>
      
      {/* Confirmation Dialog */}
      {showConfirmation && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
          data-testid="confirmation-dialog"
        >
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 max-w-md w-full mx-4">
            <h4 className="text-lg font-medium text-blue-400 mb-4">
              Confirm Term Completion
            </h4>
            
            <div className="bg-gray-700/30 p-4 rounded-md mb-4">
              <p className="text-sm text-gray-300 mb-3">
                You are about to mark the following student as having <span className="text-blue-400 font-bold">completed their academic term</span>:
              </p>
              
              <div className="bg-gray-800/50 p-2 rounded font-mono text-xs text-gray-300 break-all mb-3">
                {address}
              </div>
              
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-md p-3 text-sm text-yellow-200">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-yellow-400 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>
                    This action will update the student's academic record on the blockchain and cannot be undone. Please ensure this is the correct student.
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowConfirmation(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500"
                data-testid="cancel-confirmation"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCompleteStudentTerm}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isProcessing}
                data-testid="confirm-completion"
              >
                {isProcessing ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </span>
                ) : (
                  'Confirm Completion'
                )}
              </button>
            </div>
          </div>
        </motion.div>
      )}
      
      {/* Completion Result */}
      {completionSuccess !== undefined && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className={`mt-6 ${
            completionSuccess 
              ? 'bg-green-900/20 border border-green-700/30' 
              : 'bg-red-900/20 border border-red-700/30'
          } rounded-lg p-4`}
          data-testid="completion-result"
        >
          <div className="flex items-start">
            {completionSuccess ? (
              <svg className="w-6 h-6 text-green-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-6 h-6 text-red-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            <div>
              <h4 className={`text-lg font-medium ${completionSuccess ? 'text-green-400' : 'text-red-400'}`}>
                {completionSuccess ? 'Term Completion Successful' : 'Term Completion Failed'}
              </h4>
              <p className="text-sm text-gray-300 mt-1">
                {completionNote}
              </p>
              
              {completionSuccess && completionTime && (
                <div className="flex items-center mt-2 text-xs text-gray-400">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Completed {formatDistanceToNow(completionTime, { addSuffix: true })}
                </div>
              )}
              
              {completionSuccess && (
                <div className="mt-3 pt-3 border-t border-green-700/30">
                  <p className="text-sm text-gray-300">
                    The student's academic record has been updated to reflect term completion. This achievement is now permanently recorded on the blockchain.
                  </p>
                  
                  <div className="mt-3 flex space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        if (useCustomAddress) {
                          setAddress('');
                        }
                        setCompletionSuccess(undefined);
                        setCompletionTime(null);
                        setCompletionErrorState(null);
                        resetCompletion();
                      }}
                      className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      data-testid="mark-another-student"
                    >
                      Mark Another Student
                    </button>
                  </div>
                </div>
              )}
              
              {!completionSuccess && (
                <div className="mt-3 pt-3 border-t border-red-700/30">
                  <button
                    type="button"
                    onClick={() => {
                      setCompletionSuccess(undefined);
                      setCompletionNote('');
                      setCompletionErrorState(null);
                    }}
                    className="px-4 py-2 bg-gray-600 text-white text-sm rounded-md hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500"
                    data-testid="try-again-button"
                  >
                    Try Again
                  </button>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
      
      {/* Educational Information */}
      <div className="mt-6 bg-gray-700/30 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-400 mb-2">About Term Completion</h4>
        <p className="text-sm text-gray-300 mb-3">
          Term completion is a significant academic milestone that officially marks the end of a student's academic term. When a student completes their term, several important processes occur:
        </p>
        <ul className="list-disc list-inside space-y-1 text-sm text-gray-300 mt-2 pl-2">
          <li>The student's academic record is updated to reflect completion</li>
          <li>Any accumulated credits are officially recorded</li>
          <li>Eligibility for advancement to the next academic level is established</li>
          <li>Certificates or credentials may be automatically issued if criteria are met</li>
        </ul>
        <div className="mt-4 bg-gray-800/50 rounded-md p-3">
          <p className="text-sm text-gray-400">
            <span className="text-blue-400 font-medium">Note:</span> Only authorized administrators can record term completion. Once recorded on the blockchain, this achievement becomes a permanent part of the student's verifiable academic record.
          </p>
        </div>
      </div>
    </motion.div>
  );
});

export default StudentTermCompletion;