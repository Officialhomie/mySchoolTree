import { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { useAccount, useWriteContract, useReadContract } from 'wagmi';
import { motion } from 'framer-motion';
import { isAddress } from 'viem';
import { formatDistanceToNow } from 'date-fns';

/**
 * Types and interfaces for the StudentRecordManager component
 */
export interface StudentRecord {
  studentAddress: string;
  programId: string;
  isTermCompleted: boolean;
  lastUpdateTimestamp: Date | null;
}

export interface UpdateResult {
  success: boolean;
  timestamp: Date | null;
  errorMessage?: string;
  actionType: 'program-update' | 'term-completion' | null;
}

export interface StudentRecordData {
  studentAddress: string;
  programId: string;
  isAddressValid: boolean;
  isProgramIdValid: boolean;
  isProcessing: boolean;
  hasTeacherRole: boolean;
  isCheckingRole: boolean;
  lastUpdateResult: UpdateResult | null;
}

export interface StudentRecordManagerMethods {
  getData: () => StudentRecordData;
  resetComponent: () => void;
  updateProgram: (address: string, programId: string) => Promise<boolean>;
  completeStudentTerm: (address: string) => Promise<boolean>;
}

export interface StudentRecordManagerProps {
  contractAddress: `0x${string}`;
  contractAbi: any[];
  roleContract: any; // Contract for checking teacher role
  onStateChange?: (data: StudentRecordData) => void;
  onUpdateComplete?: (success: boolean, address: string, action: 'program-update' | 'term-completion', data: any) => void;
  title?: string;
}

/**
 * StudentRecordManager Component
 * 
 * This component combines the functionality of program updates and term completion
 * for educational institution blockchain records. It verifies the caller has the appropriate
 * role before allowing updates.
 */
const StudentRecordManager = forwardRef<StudentRecordManagerMethods, StudentRecordManagerProps>(({
  contractAddress,
  contractAbi,
  roleContract,
  onStateChange,
  onUpdateComplete,
  title = "Student Record Manager"
}, ref) => {
  // Access the connected wallet address
  const { address: connectedAddress } = useAccount();
  
  // Component state
  const [studentAddress, setStudentAddress] = useState<string>('');
  const [programId, setProgramId] = useState<string>('');
  const [isAddressValid, setIsAddressValid] = useState<boolean>(false);
  const [isProgramIdValid, setIsProgramIdValid] = useState<boolean>(false);
  const [lastUpdateResult, setLastUpdateResult] = useState<UpdateResult | null>(null);
  const [showConfirmation, setShowConfirmation] = useState<boolean>(false);
  const [confirmationAction, setConfirmationAction] = useState<'program-update' | 'term-completion' | null>(null);
  
  // Setup the contract write operation
  const { 
    writeContractAsync,
    isPending: isProcessing,
    isSuccess,
    isError,
    error,
    reset: resetContractWrite
  } = useWriteContract();

  // Read contract state to check if connected user has teacher role
  const {
    data: hasTeacherRole,
    isLoading: isCheckingRole,
    refetch: refetchRoleCheck,
  } = useReadContract({
    ...roleContract,
    functionName: 'hasTeacherRole',
    args: connectedAddress ? [connectedAddress] : undefined,
    query: {
      enabled: !!connectedAddress
    }
  });

  // Expose methods to parent components via ref
  useImperativeHandle(ref, () => ({
    // Get current component data
    getData: () => ({
      studentAddress,
      programId,
      isAddressValid,
      isProgramIdValid,
      isProcessing,
      hasTeacherRole: Boolean(hasTeacherRole),
      isCheckingRole,
      lastUpdateResult
    }),
    
    // Reset the component to initial state
    resetComponent: () => {
      setStudentAddress('');
      setProgramId('');
      setLastUpdateResult(null);
      resetContractWrite();
      setConfirmationAction(null);
    },
    
    // Programmatically update a student's program
    updateProgram: async (address: string, newProgramId: string): Promise<boolean> => {
      if (!isAddress(address) || !/^\d+$/.test(newProgramId)) {
        return false;
      }
      
      // Check if user has teacher role
      const roleCheckResult = await refetchRoleCheck();
      if (!roleCheckResult.data) {
        console.error('Error: User does not have teacher role');
        return false;
      }
      
      try {
        await writeContractAsync({
          address: contractAddress,
          abi: contractAbi,
          functionName: 'updateStudentProgram',
          args: [address as `0x${string}`, BigInt(newProgramId)]
        });
        
        return true;
      } catch (error) {
        console.error('Error updating student program:', error);
        return false;
      }
    },
    
    // Programmatically complete student term
    completeStudentTerm: async (address: string): Promise<boolean> => {
      if (!isAddress(address)) {
        return false;
      }
      
      // Check if user has teacher role
      const roleCheckResult = await refetchRoleCheck();
      if (!roleCheckResult.data) {
        console.error('Error: User does not have teacher role');
        return false;
      }
      
      try {
        await writeContractAsync({
          address: contractAddress,
          abi: contractAbi,
          functionName: 'completeStudentTerm',
          args: [address as `0x${string}`]
        });
        
        return true;
      } catch (error) {
        console.error('Error completing student term:', error);
        return false;
      }
    }
  }));

  // Address validation effect
  useEffect(() => {
    const valid = studentAddress ? isAddress(studentAddress) : false;
    setIsAddressValid(valid);
  }, [studentAddress]);

  // Program ID validation effect
  useEffect(() => {
    const valid = /^\d+$/.test(programId) && parseInt(programId) >= 0;
    setIsProgramIdValid(valid);
  }, [programId]);

  // Handle successful update
  useEffect(() => {
    if (isSuccess) {
      const result: UpdateResult = {
        success: true,
        timestamp: new Date(),
        actionType: confirmationAction
      };
      
      setLastUpdateResult(result);
      setShowConfirmation(false);
      
      if (onUpdateComplete && confirmationAction) {
        onUpdateComplete(true, studentAddress, confirmationAction, {
          studentAddress,
          programId: confirmationAction === 'program-update' ? programId : undefined,
          timestamp: result.timestamp
        });
      }
    }
  }, [isSuccess, studentAddress, programId, onUpdateComplete, confirmationAction]);

  // Handle update error
  useEffect(() => {
    if (isError && error) {
      const result: UpdateResult = {
        success: false,
        timestamp: new Date(),
        errorMessage: error.message || 'Unknown error occurred',
        actionType: confirmationAction
      };
      
      setLastUpdateResult(result);
      setShowConfirmation(false);
      
      if (onUpdateComplete && confirmationAction) {
        onUpdateComplete(false, studentAddress, confirmationAction, {
          studentAddress,
          programId: confirmationAction === 'program-update' ? programId : undefined,
          error: error.message || 'Unknown error occurred'
        });
      }
    }
  }, [isError, error, studentAddress, programId, onUpdateComplete, confirmationAction]);

  // State change notification effect
  useEffect(() => {
    if (onStateChange) {
      onStateChange({
        studentAddress,
        programId,
        isAddressValid,
        isProgramIdValid,
        isProcessing,
        hasTeacherRole: Boolean(hasTeacherRole),
        isCheckingRole,
        lastUpdateResult
      });
    }
  }, [
    studentAddress,
    programId,
    isAddressValid,
    isProgramIdValid,
    isProcessing,
    hasTeacherRole,
    isCheckingRole,
    lastUpdateResult,
    onStateChange
  ]);

  // Handle address input change
  const handleAddressChange = (value: string) => {
    setStudentAddress(value);
    setLastUpdateResult(null);
    resetContractWrite();
  };

  // Handle program ID input change
  const handleProgramIdChange = (value: string) => {
    setProgramId(value);
    setLastUpdateResult(null);
    resetContractWrite();
  };

  // Handle form submission for program update
  const handleProgramUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isAddressValid && isProgramIdValid) {
      setConfirmationAction('program-update');
      setShowConfirmation(true);
    }
  };

  // Handle form submission for term completion
  const handleTermCompletionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isAddressValid) {
      setConfirmationAction('term-completion');
      setShowConfirmation(true);
    }
  };

  // Handle confirmation for both actions
  const handleConfirmAction = async () => {
    if (!isAddressValid || !hasTeacherRole) {
      return;
    }

    try {
      if (confirmationAction === 'program-update') {
        if (!isProgramIdValid) return;
        
        await writeContractAsync({
          address: contractAddress,
          abi: contractAbi,
          functionName: 'updateStudentProgram',
          args: [studentAddress as `0x${string}`, BigInt(programId)]
        });
      } else if (confirmationAction === 'term-completion') {
        await writeContractAsync({
          address: contractAddress,
          abi: contractAbi,
          functionName: 'completeStudentTerm',
          args: [studentAddress as `0x${string}`]
        });
      }
    } catch (error) {
      console.error(`Error with ${confirmationAction}:`, error);
    }
  };

  // Test addresses for quick selection
  const testAddresses = [
    { label: "Test Student 1", address: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e" },
    { label: "Test Student 2", address: "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199" }
  ];

  // Check if user has permission to update
  const canUpdate = Boolean(hasTeacherRole) && !isCheckingRole;

  // Get action text based on confirmation action
  const getActionText = () => {
    if (confirmationAction === 'program-update') {
      return 'Program Update';
    } else if (confirmationAction === 'term-completion') {
      return 'Term Completion';
    }
    return 'Action';
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-gray-800/50 border border-gray-700 rounded-lg p-4"
      data-testid="student-record-manager"
    >
      <h3 className="text-lg font-medium text-blue-400 mb-3">
        {title}
      </h3>
      
      {/* Connected Wallet Information */}
      {connectedAddress && (
        <div className="mb-4 bg-gray-700/30 p-3 rounded-md">
          <div className="flex justify-between items-center">
            <p className="text-xs text-gray-400">
              Connected as: <span className="text-blue-400 font-mono">{connectedAddress}</span>
            </p>
            
            {/* Teacher Role Indicator */}
            {isCheckingRole ? (
              <div className="flex items-center text-xs text-gray-400">
                <div className="w-3 h-3 mr-1 border-2 border-t-white border-white/30 rounded-full animate-spin"></div>
                Checking role...
              </div>
            ) : (
              hasTeacherRole ? (
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-1 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  </div>
                  <span className="text-xs text-blue-400">Teacher Role</span>
                </div>
              ) : (
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-red-500 rounded-full mr-1"></div>
                  <span className="text-xs text-red-400">No Teacher Role</span>
                </div>
              )
            )}
          </div>
        </div>
      )}
      
      {/* Teacher Role Warning */}
      {!isCheckingRole && !hasTeacherRole && connectedAddress && (
        <div className="mb-4 bg-red-500/20 text-red-400 border border-red-500/30 rounded-md p-4">
          <div className="flex items-start">
            <svg className="w-5 h-5 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="font-medium mb-1">Teacher Role Required</p>
              <p className="text-sm">
                You need teacher privileges to manage student records. Please connect with an account that has the teacher role.
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Main Form */}
      <div className="space-y-6">
        {/* Student Identification Section */}
        <div className="bg-gray-700/30 rounded-lg p-4">
          <h4 className="text-md font-medium text-gray-300 mb-3">
            Student Identification
          </h4>
          
          {/* Student Address Field */}
          <div className="space-y-2">
            <label className="block text-sm text-gray-400">Student Address</label>
            <input
              type="text"
              value={studentAddress}
              onChange={(e) => handleAddressChange(e.target.value)}
              placeholder="0x..."
              className={`w-full px-3 py-2 bg-gray-700 border ${
                studentAddress && !isAddressValid ? 'border-red-500' : 'border-gray-600'
              } rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
              data-testid="student-address-input"
              disabled={!canUpdate}
            />
            {studentAddress && !isAddressValid && (
              <p className="text-xs text-red-400" data-testid="address-validation-error">
                Please enter a valid Ethereum address
              </p>
            )}
            <p className="text-xs text-gray-400">Enter the Ethereum address of the student</p>
          </div>
          
          {/* Test Addresses */}
          <div className="space-y-2 mt-3">
            <h4 className="text-xs text-gray-400 mb-1">Test Student Addresses:</h4>
            <div className="flex flex-wrap gap-2">
              {testAddresses.map((item, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleAddressChange(item.address)}
                  className={`text-xs bg-gray-600 hover:bg-gray-500 text-gray-200 py-1 px-2 rounded ${!canUpdate ? 'opacity-50 cursor-not-allowed' : ''}`}
                  data-testid={`test-address-${index + 1}`}
                  disabled={!canUpdate}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        
        {/* Program Update Section */}
        <form onSubmit={handleProgramUpdateSubmit} className="bg-gray-700/30 rounded-lg p-4">
          <h4 className="text-md font-medium text-gray-300 mb-3">
            Update Student Program
          </h4>
          
          {/* Program ID Field */}
          <div className="space-y-2">
            <label className="block text-sm text-gray-400">Program ID</label>
            <input
              type="text"
              value={programId}
              onChange={(e) => handleProgramIdChange(e.target.value)}
              placeholder="Enter program ID number"
              className={`w-full px-3 py-2 bg-gray-700 border ${
                programId && !isProgramIdValid ? 'border-red-500' : 'border-gray-600'
              } rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
              data-testid="program-id-input"
              disabled={!canUpdate}
            />
            {programId && !isProgramIdValid && (
              <p className="text-xs text-red-400" data-testid="program-id-validation-error">
                Please enter a valid program ID (non-negative integer)
              </p>
            )}
            <p className="text-xs text-gray-400">Enter the new program ID for the student</p>
          </div>
          
          {/* Test Program IDs */}
          <div className="space-y-2 mt-3">
            <h4 className="text-xs text-gray-400 mb-1">Test Program IDs:</h4>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleProgramIdChange("1001")}
                className={`text-xs bg-gray-600 hover:bg-gray-500 text-gray-200 py-1 px-2 rounded ${!canUpdate ? 'opacity-50 cursor-not-allowed' : ''}`}
                data-testid="test-program-id-1"
                disabled={!canUpdate}
              >
                Program 1001
              </button>
              <button
                type="button"
                onClick={() => handleProgramIdChange("2002")}
                className={`text-xs bg-gray-600 hover:bg-gray-500 text-gray-200 py-1 px-2 rounded ${!canUpdate ? 'opacity-50 cursor-not-allowed' : ''}`}
                data-testid="test-program-id-2"
                disabled={!canUpdate}
              >
                Program 2002
              </button>
            </div>
          </div>
          
          {/* Form Actions */}
          <div className="flex justify-end space-x-3 mt-4">
            <button
              type="submit"
              disabled={!isAddressValid || !isProgramIdValid || isProcessing || !canUpdate}
              className={`px-4 py-2 rounded-md text-white ${
                !isAddressValid || !isProgramIdValid || isProcessing || !canUpdate
                  ? 'bg-gray-700 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              data-testid="update-program-button"
            >
              {isProcessing && confirmationAction === 'program-update' ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </span>
              ) : (
                'Update Program'
              )}
            </button>
          </div>
        </form>
        
        {/* Term Completion Section */}
        <form onSubmit={handleTermCompletionSubmit} className="bg-gray-700/30 rounded-lg p-4">
          <h4 className="text-md font-medium text-gray-300 mb-3">
            Complete Student Term
          </h4>
          
          <p className="text-sm text-gray-300 mb-3">
            Mark the student as having completed their current academic term. This will update their record on the blockchain.
          </p>
          
          {/* Form Actions */}
          <div className="flex justify-end space-x-3 mt-4">
            <button
              type="submit"
              disabled={!isAddressValid || isProcessing || !canUpdate}
              className={`px-4 py-2 rounded-md text-white ${
                !isAddressValid || isProcessing || !canUpdate
                  ? 'bg-gray-700 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700'
              } focus:outline-none focus:ring-2 focus:ring-green-500`}
              data-testid="complete-term-button"
            >
              {isProcessing && confirmationAction === 'term-completion' ? (
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
        </form>
        
        {/* Reset Button */}
        {canUpdate && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => {
                setStudentAddress('');
                setProgramId('');
                setLastUpdateResult(null);
                resetContractWrite();
              }}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500"
              data-testid="reset-button"
            >
              Reset All
            </button>
          </div>
        )}
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
              Confirm {getActionText()}
            </h4>
            
            <div className="bg-gray-700/30 p-4 rounded-md mb-4">
              <p className="text-sm text-gray-300 mb-3">
                You are about to {confirmationAction === 'program-update' ? 'update the program for' : 'mark as term completed'} the following student:
              </p>
              
              <div className="space-y-3">
                <div>
                  <div className="text-xs text-gray-400">Student Address:</div>
                  <div className="bg-gray-800/50 p-2 rounded font-mono text-xs text-gray-300 break-all">
                    {studentAddress}
                  </div>
                </div>
                
                {confirmationAction === 'program-update' && (
                  <div>
                    <div className="text-xs text-gray-400">New Program ID:</div>
                    <div className="bg-gray-800/50 p-2 rounded font-mono text-xs text-blue-400">
                      {programId}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-md p-3 mt-3 text-sm text-yellow-200">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-yellow-400 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>
                    This action will update the student's record on the blockchain and cannot be undone. Please ensure this information is correct.
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
                onClick={handleConfirmAction}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isProcessing}
                data-testid="confirm-action"
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
                  `Confirm ${getActionText()}`
                )}
              </button>
            </div>
          </div>
        </motion.div>
      )}
      
      {/* Update Result */}
      {lastUpdateResult && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className={`mt-6 ${
            lastUpdateResult.success 
              ? 'bg-green-900/20 border border-green-700/30' 
              : 'bg-red-900/20 border border-red-700/30'
          } rounded-lg p-4`}
          data-testid="update-result"
        >
          <div className="flex items-start">
            {lastUpdateResult.success ? (
              <svg className="w-6 h-6 text-green-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-6 h-6 text-red-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            <div>
              <h4 className={`text-lg font-medium ${lastUpdateResult.success ? 'text-green-400' : 'text-red-400'}`}>
                {lastUpdateResult.actionType === 'program-update' 
                  ? (lastUpdateResult.success ? 'Program Update Successful' : 'Program Update Failed')
                  : (lastUpdateResult.success ? 'Term Completion Successful' : 'Term Completion Failed')
                }
              </h4>
              
              {lastUpdateResult.success ? (
                <p className="text-sm text-gray-300 mt-1">
                  {lastUpdateResult.actionType === 'program-update'
                    ? `The student's program has been successfully updated to ${programId}.`
                    : `The student's term has been successfully marked as completed.`
                  }
                </p>
              ) : (
                <p className="text-sm text-gray-300 mt-1">
                  {lastUpdateResult.errorMessage || 'An error occurred while updating the record.'}
                </p>
              )}
              
              {lastUpdateResult.timestamp && (
                <div className="flex items-center mt-2 text-xs text-gray-400">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {formatDistanceToNow(lastUpdateResult.timestamp, { addSuffix: true })}
                </div>
              )}
              
              <div className="mt-3 pt-3 border-t border-gray-700/30">
                <button
                  type="button"
                  onClick={() => {
                    setStudentAddress('');
                    setProgramId('');
                    setLastUpdateResult(null);
                    resetContractWrite();
                  }}
                  className={`px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 ${!canUpdate ? 'opacity-50 cursor-not-allowed' : ''}`}
                  data-testid="update-another-button"
                  disabled={!canUpdate}
                >
                  Manage Another Student
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
});

export default StudentRecordManager;
