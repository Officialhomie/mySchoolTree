import { useState, useEffect } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { motion } from 'framer-motion';
import { contractStudentManagementConfig } from '../../contracts';

/**
 * StudentAttendanceUpdater Component
 * 
 * This component provides an interface to update a student's attendance count.
 * It can increase or decrease the attendance count for a specific student.
 * The component can be used with UI or as a headless component for programmatic use.
 */
interface StudentAttendanceUpdaterProps {
  onUpdateSuccess?: (studentAddress: string, increased: boolean, txHash: string) => void;
  onUpdateError?: (error: Error) => void;
  // New props for external control
  externalStudentAddress?: string;
  externalIncrease?: boolean;
  // Callback for exporting the component's state
  onStateChange?: (state: StudentAttendanceState) => void;
  // Flag to show/hide UI (for headless usage)
  renderUI?: boolean;
}

export interface StudentInfo {
  name: string;
  isRegistered: boolean;
  currentTerm: number;
  attendanceCount: number;
  lastAttendanceDate: bigint;
  hasFirstAttendance: boolean;
}

// Exportable state interface
export interface StudentAttendanceState {
  // Form state
  studentAddress: string;
  increase: boolean;
  validationError: string;
  lookupAttempted: boolean;
  
  // Student data
  studentInfo?: StudentInfo;
  isLoadingStudent: boolean;
  
  // Transaction state
  isWritePending: boolean;
  isConfirming: boolean;
  isConfirmed: boolean;
  hash?: `0x${string}` | undefined;
  error?: Error | null;
  
  // Computed values
  isProcessing: boolean;
  isEligibleForUpdate: boolean;
  
  // Methods
  setStudentAddress: (address: string) => void;
  setIncrease: (increase: boolean) => void;
  handleLookup: () => void;
  handleSubmit: (e?: React.FormEvent) => Promise<void>;
  validateAddress: (address: string) => boolean;
  formatTimestamp: (timestamp: bigint) => string;
}

const StudentAttendanceUpdater = ({
  onUpdateSuccess,
  onUpdateError,
  externalStudentAddress,
  externalIncrease,
  onStateChange,
  renderUI = true
}: StudentAttendanceUpdaterProps) => {
  // Form state
  const [studentAddress, setStudentAddressInternal] = useState<string>(externalStudentAddress || '');
  const [increase, setIncreaseInternal] = useState<boolean>(externalIncrease !== undefined ? externalIncrease : true);
  const [validationError, setValidationError] = useState<string>('');
  const [lookupAttempted, setLookupAttempted] = useState<boolean>(false);
  
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
  
  // Student lookup state
  const { 
    data: studentData,
    isLoading: isLoadingStudent,
    refetch: refetchStudent
  } = useReadContract({
    abi: contractStudentManagementConfig.abi,
    address: contractStudentManagementConfig.address as `0x${string}`,
    functionName: 'students',
    args: studentAddress ? [studentAddress as `0x${string}`] : undefined,
    query: {
      enabled: !!studentAddress && lookupAttempted
    }
  });
  
  // Format student data
  const studentInfo: StudentInfo | undefined = studentData ? {
    name: Array.isArray(studentData) ? (studentData[0] as string) : '',
    isRegistered: Array.isArray(studentData) ? (studentData[1] as boolean) : false,
    currentTerm: Array.isArray(studentData) ? Number(studentData[2]) : 0,
    attendanceCount: Array.isArray(studentData) ? Number(studentData[3]) : 0,
    lastAttendanceDate: Array.isArray(studentData) ? (studentData[4] as bigint) : BigInt(0),
    hasFirstAttendance: Array.isArray(studentData) ? (studentData[5] as boolean) : false
  } : undefined;

  // Combined error state
  const error = writeError || confirmError;
  const isProcessing = isWritePending || isConfirming;
  
  // Format timestamp to readable date
  const formatTimestamp = (timestamp: bigint): string => {
    if (!timestamp || timestamp === BigInt(0)) return 'Never';
    const date = new Date(Number(timestamp) * 1000);
    return date.toLocaleString();
  };
  
  // Wrapper functions to handle state updates
  const setStudentAddress = (value: string) => {
    setStudentAddressInternal(value);
    setValidationError('');
    setLookupAttempted(false);
  };
  
  const setIncrease = (value: boolean) => {
    setIncreaseInternal(value);
  };
  
  // Validate address format
  const validateAddress = (address: string): boolean => {
    if (!address) {
      setValidationError('Student address is required');
      return false;
    }
    
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      setValidationError('Invalid Ethereum address format');
      return false;
    }
    
    setValidationError('');
    return true;
  };
  
  // Handle address lookup
  const handleLookup = () => {
    if (validateAddress(studentAddress)) {
      setLookupAttempted(true);
      refetchStudent();
    }
  };
  
  // Handle address change
  const handleAddressChange = (value: string) => {
    setStudentAddress(value);
  };
  
  // Handle attendance submission
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    
    try {
      // Validate student address
      if (!validateAddress(studentAddress)) {
        return;
      }
      
      // Validate student eligibility if data is available
      if (studentInfo) {
        if (!studentInfo.isRegistered) {
          setValidationError('Student is not registered');
          return;
        }
        
        if (!studentInfo.hasFirstAttendance) {
          setValidationError('Student needs to record first attendance before updating attendance count');
          return;
        }
        
        // For decreasing attendance, make sure there's attendance to decrease
        if (!increase && studentInfo.attendanceCount === 0) {
          setValidationError('Cannot decrease attendance count below zero');
          return;
        }
      }
      
      // Execute contract call
      writeContract({
        abi: contractStudentManagementConfig.abi,
        address: contractStudentManagementConfig.address as `0x${string}`,
        functionName: 'updateStudentAttendance',
        args: [studentAddress as `0x${string}`, increase]
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setValidationError(errorMessage);
      
      if (onUpdateError && err instanceof Error) {
        onUpdateError(err);
      }
    }
  };
  
  // Check if student is eligible for attendance update
  const isEligibleForUpdate = studentInfo
    ? studentInfo.isRegistered && studentInfo.hasFirstAttendance && (increase || studentInfo.attendanceCount > 0)
    : false;
  
  // Build the exportable state
  const exportableState: StudentAttendanceState = {
    // Form state
    studentAddress,
    increase,
    validationError,
    lookupAttempted,
    
    // Student data
    studentInfo,
    isLoadingStudent,
    
    // Transaction state
    isWritePending,
    isConfirming,
    isConfirmed: !!isConfirmed,
    hash,
    error: error as Error | null,
    
    // Computed values
    isProcessing,
    isEligibleForUpdate,
    
    // Methods
    setStudentAddress,
    setIncrease,
    handleLookup,
    handleSubmit,
    validateAddress,
    formatTimestamp
  };
  
  // Update state from external props when they change
  useEffect(() => {
    if (externalStudentAddress !== undefined && externalStudentAddress !== studentAddress) {
      setStudentAddress(externalStudentAddress);
    }
  }, [externalStudentAddress]);
  
  useEffect(() => {
    if (externalIncrease !== undefined && externalIncrease !== increase) {
      setIncrease(externalIncrease);
    }
  }, [externalIncrease]);
  
  // Call the onStateChange callback whenever relevant state changes
  useEffect(() => {
    if (onStateChange) {
      onStateChange(exportableState);
    }
  }, [
    studentAddress, increase, validationError, lookupAttempted,
    studentInfo, isLoadingStudent, isWritePending, isConfirming, isConfirmed,
    hash, error
  ]);
  
  // Call success callback when confirmed
  useEffect(() => {
    if (isConfirmed && hash && !isConfirming) {
      if (onUpdateSuccess) {
        onUpdateSuccess(studentAddress, increase, hash);
      }
    }
  }, [isConfirmed, hash, isConfirming, onUpdateSuccess, studentAddress, increase]);
  
  // Get update status and styling
  const getUpdateStatus = () => {
    if (isWritePending) {
      return { 
        text: increase ? 'Increasing Attendance' : 'Decreasing Attendance', 
        color: 'text-yellow-400', 
        bg: 'bg-yellow-500/20' 
      };
    }
    
    if (isConfirming) {
      return { 
        text: 'Confirming Update', 
        color: 'text-blue-400', 
        bg: 'bg-blue-500/20' 
      };
    }
    
    if (isConfirmed) {
      return { 
        text: 'Attendance Updated', 
        color: 'text-green-400', 
        bg: 'bg-green-500/20' 
      };
    }
    
    if (error) {
      return { 
        text: 'Update Failed', 
        color: 'text-red-400', 
        bg: 'bg-red-500/20' 
      };
    }
    
    return { 
      text: 'Ready to Update', 
      color: 'text-gray-400', 
      bg: 'bg-gray-500/20' 
    };
  };
  
  const status = getUpdateStatus();
  
  // If not rendering UI, just return null
  if (!renderUI) {
    return null;
  }
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-gray-800/50 border border-gray-700 rounded-lg p-4"
    >
      <h3 className="text-lg font-medium text-blue-400 mb-3">
        Update Student Attendance
      </h3>
      
      {/* Status Badge */}
      <div className={`inline-flex items-center px-3 py-1 rounded-full ${status.bg} border border-${status.color.replace('text-', '')}/30 mb-4`}>
        <div className={`w-2 h-2 rounded-full ${status.color.replace('text-', 'bg-')} mr-2`}></div>
        <span className={`text-sm font-medium ${status.color}`}>
          {status.text}
        </span>
      </div>
      
      {/* Attendance Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-gray-700/30 rounded-lg p-4 space-y-4">
          {/* Student Address Input with Lookup Button */}
          <div className="space-y-2">
            <label htmlFor="student-address" className="block text-sm font-medium text-gray-300">
              Student Wallet Address
            </label>
            <div className="flex space-x-2">
              <div className="flex-grow">
                <input
                  id="student-address"
                  type="text"
                  value={studentAddress}
                  onChange={(e) => handleAddressChange(e.target.value)}
                  placeholder="0x..."
                  className={`w-full px-3 py-2 bg-gray-700 border ${
                    validationError ? 'border-red-500' : 'border-gray-600'
                  } rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                  disabled={isProcessing}
                />
              </div>
              <button
                type="button"
                onClick={handleLookup}
                className="px-3 py-2 bg-gray-600 text-gray-200 rounded-md hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isProcessing || isLoadingStudent || !studentAddress}
              >
                {isLoadingStudent ? (
                  <div className="w-5 h-5 border-2 border-t-blue-400 border-blue-200/30 rounded-full animate-spin"></div>
                ) : (
                  'Lookup'
                )}
              </button>
            </div>
            {validationError && (
              <p className="text-xs text-red-400">{validationError}</p>
            )}
            <p className="text-xs text-gray-400">Enter the student's Ethereum wallet address</p>
          </div>
          
          {/* Attendance Action Selection */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">
              Attendance Action
            </label>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => setIncrease(true)}
                className={`flex-1 px-3 py-2 rounded-md text-white ${
                  increase 
                    ? 'bg-green-600 border border-green-500' 
                    : 'bg-gray-700 border border-gray-600 hover:bg-gray-600'
                }`}
                disabled={isProcessing}
              >
                <div className="flex items-center justify-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span>Increase</span>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setIncrease(false)}
                className={`flex-1 px-3 py-2 rounded-md text-white ${
                  !increase 
                    ? 'bg-red-600 border border-red-500' 
                    : 'bg-gray-700 border border-gray-600 hover:bg-gray-600'
                }`}
                disabled={isProcessing}
              >
                <div className="flex items-center justify-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                  </svg>
                  <span>Decrease</span>
                </div>
              </button>
            </div>
            <p className="text-xs text-gray-400">
              Select whether to increase or decrease the student's attendance count
            </p>
          </div>
          
          {/* Student Info Display (if available) */}
          {studentInfo && lookupAttempted && !isLoadingStudent && (
            <div className="mt-2 p-3 bg-gray-700/40 rounded-md border border-gray-600">
              <h4 className="text-sm font-medium text-gray-300 mb-2">Student Information</h4>
              <div className="space-y-2">
                <div>
                  <span className="text-xs text-gray-400">Name: </span>
                  <span className="text-sm text-white">{studentInfo.name || 'Not available'}</span>
                </div>
                
                <div className="flex items-center">
                  <span className="text-xs text-gray-400 mr-1">Current Term: </span>
                  <span className="text-sm text-white">{studentInfo.currentTerm}</span>
                </div>
                
                <div className="flex items-center">
                  <span className="text-xs text-gray-400 mr-1">Attendance Count: </span>
                  <span className="text-sm font-medium text-white">{studentInfo.attendanceCount}</span>
                  {increase ? (
                    <span className="ml-2 text-xs text-green-400">→ {studentInfo.attendanceCount + 1}</span>
                  ) : (
                    <span className="ml-2 text-xs text-red-400">→ {Math.max(0, studentInfo.attendanceCount - 1)}</span>
                  )}
                </div>
                
                <div className="flex items-center">
                  <span className="text-xs text-gray-400 mr-1">Last Attendance: </span>
                  <span className="text-sm text-white">{formatTimestamp(studentInfo.lastAttendanceDate)}</span>
                </div>
                
                <div className="flex space-x-4 mt-1">
                  <div className="flex items-center">
                    <div className={`w-2 h-2 rounded-full ${studentInfo.isRegistered ? 'bg-green-400' : 'bg-red-400'} mr-1`}></div>
                    <span className="text-xs text-gray-400">Registration: </span>
                    <span className={`text-xs ${studentInfo.isRegistered ? 'text-green-400' : 'text-red-400'} ml-1`}>
                      {studentInfo.isRegistered ? 'Registered' : 'Not Registered'}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <div className={`w-2 h-2 rounded-full ${studentInfo.hasFirstAttendance ? 'bg-green-400' : 'bg-yellow-400'} mr-1`}></div>
                    <span className="text-xs text-gray-400">First Attendance: </span>
                    <span className={`text-xs ${studentInfo.hasFirstAttendance ? 'text-green-400' : 'text-yellow-400'} ml-1`}>
                      {studentInfo.hasFirstAttendance ? 'Recorded' : 'Not Recorded'}
                    </span>
                  </div>
                </div>
                
                {/* Eligibility Status */}
                <div className="mt-2 pt-2 border-t border-gray-600">
                  <div className="flex items-center">
                    <div className={`w-2 h-2 rounded-full ${
                      studentInfo.isRegistered && studentInfo.hasFirstAttendance && (increase || studentInfo.attendanceCount > 0)
                        ? 'bg-green-400' 
                        : 'bg-red-400'
                    } mr-1`}></div>
                    <span className="text-xs text-gray-400">Eligibility: </span>
                    <span className={`text-xs ${
                      studentInfo.isRegistered && studentInfo.hasFirstAttendance && (increase || studentInfo.attendanceCount > 0)
                        ? 'text-green-400' 
                        : 'text-red-400'
                    } ml-1 font-medium`}>
                      {!studentInfo.isRegistered 
                        ? 'Not registered' 
                        : !studentInfo.hasFirstAttendance 
                          ? 'First attendance not recorded' 
                          : !increase && studentInfo.attendanceCount === 0
                            ? 'Cannot decrease below zero'
                            : 'Eligible for update'
                      }
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Error Display */}
        {error && (
          <div className="bg-red-500/20 text-red-400 border border-red-500/30 rounded-md p-3">
            <p className="text-sm">Error updating attendance: {(error as Error).message || 'Unknown error'}</p>
          </div>
        )}
        
        {/* Success Display */}
        {isConfirmed && hash && (
          <div className="bg-green-500/20 text-green-400 border border-green-500/30 rounded-md p-3">
            <p className="text-sm">
              Successfully {increase ? 'increased' : 'decreased'} attendance for student!
            </p>
            <div className="flex flex-col space-y-1 mt-2">
              <div className="flex items-center">
                <span className="text-xs text-gray-400 w-20">Student:</span>
                <span className="text-xs text-white font-mono truncate">{studentAddress}</span>
              </div>
              {studentInfo && (
                <div className="flex items-center">
                  <span className="text-xs text-gray-400 w-20">Name:</span>
                  <span className="text-xs text-white">{studentInfo.name}</span>
                </div>
              )}
              {studentInfo && (
                <div className="flex items-center">
                  <span className="text-xs text-gray-400 w-20">New Count:</span>
                  <span className="text-xs text-white">
                    {increase ? studentInfo.attendanceCount + 1 : Math.max(0, studentInfo.attendanceCount - 1)}
                  </span>
                  <span className="text-xs text-gray-400 ml-1">(was {studentInfo.attendanceCount})</span>
                </div>
              )}
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
                : studentInfo && (!studentInfo.isRegistered || !studentInfo.hasFirstAttendance || (!increase && studentInfo.attendanceCount === 0))
                  ? 'bg-gray-600 cursor-not-allowed'
                  : increase
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
            }`}
            disabled={isProcessing || (studentInfo && (!studentInfo.isRegistered || !studentInfo.hasFirstAttendance || (!increase && studentInfo.attendanceCount === 0)))}
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
              increase ? 'Increase Attendance' : 'Decrease Attendance'
            )}
          </button>
        </div>
      </form>
      
      {/* Additional Information */}
      <div className="mt-4 pt-4 border-t border-gray-700">
        <h4 className="text-sm font-medium text-gray-300 mb-2">Attendance Information</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 gap-x-4 text-xs">
          <div>
            <span className="text-gray-400">Function: </span>
            <span className="text-gray-200 font-mono">updateStudentAttendance(address,bool)</span>
          </div>
          <div>
            <span className="text-gray-400">Transaction Type: </span>
            <span className="text-gray-200">Non-payable</span>
          </div>
          <div>
            <span className="text-gray-400">Gas Estimate: </span>
            <span className="text-gray-200">~60,000 gas</span>
          </div>
          <div>
            <span className="text-gray-400">Confirmation Time: </span>
            <span className="text-gray-200">~15-30 seconds</span>
          </div>
        </div>
        <div className="mt-3 text-xs text-gray-400">
          <p className="mb-1">This function updates a student's attendance count (increase or decrease).</p>
          <p>Students must be registered and have their first attendance recorded before their attendance count can be updated.</p>
        </div>
      </div>
    </motion.div>
  );
};

// Create a custom hook to use the StudentAttendanceUpdater functionalities
export const useStudentAttendanceUpdater = (initialProps: Omit<StudentAttendanceUpdaterProps, 'onStateChange' | 'renderUI'> = {}) => {
  const [state, setState] = useState<StudentAttendanceState | null>(null);
  
  // Render the component with UI
  const renderComponent = (props: Omit<StudentAttendanceUpdaterProps, 'onStateChange'> = {}) => (
    <StudentAttendanceUpdater
      {...initialProps}
      {...props}
      onStateChange={setState}
    />
  );
  
  // Render the component without UI
  const renderHeadless = (props: Omit<StudentAttendanceUpdaterProps, 'onStateChange' | 'renderUI'> = {}) => (
    <StudentAttendanceUpdater
      {...initialProps}
      {...props}
      onStateChange={setState}
      renderUI={false}
    />
  );
  
  // Execute contract functions directly without rendering
  const executeHeadless = {
    lookupStudent: async (address: string) => {
      if (!state) return null;
      
      const tempState = {...state};
      tempState.setStudentAddress(address);
      
      if (tempState.validateAddress(address)) {
        await new Promise<void>((resolve) => {
          const newProps = {
            ...initialProps,
            externalStudentAddress: address,
            onStateChange: (newState: StudentAttendanceState) => {
              setState(newState);
              if (!newState.isLoadingStudent) {
                resolve();
              }
            }
          };
          renderHeadless(newProps);
        });
        
        return state?.studentInfo;
      }
      
      return null;
    },
    
    updateAttendance: async (
      address: string,
      increase: boolean = true
    ): Promise<boolean> => {
      if (!state) {
        throw new Error("Component not initialized");
      }
      
      // Set up the state with the provided values
      const props = {
        ...initialProps,
        externalStudentAddress: address,
        externalIncrease: increase,
      };
      
      // Create a promise that resolves when the transaction is confirmed
      return new Promise<boolean>((resolve, reject) => {
        const updatedProps = {
          ...props,
          onStateChange: (newState: StudentAttendanceState) => {
            setState(newState);
            if (newState.isConfirmed) {
              resolve(true);
            } else if (newState.error) {
              reject(newState.error);
            }
          },
          onUpdateSuccess: () => resolve(true),
          onUpdateError: (error: Error) => reject(error)
        };
        
        renderHeadless(updatedProps);
        
        // Trigger the submission after rendering
        setTimeout(() => {
          if (state) {
            state.handleSubmit();
          }
        }, 100);
      });
    }
  };
  
  return {
    state,
    render: renderComponent,
    renderHeadless,
    execute: executeHeadless
  };
};

export default StudentAttendanceUpdater;

