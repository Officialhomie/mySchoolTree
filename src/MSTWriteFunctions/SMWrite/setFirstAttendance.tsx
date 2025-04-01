import { useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { motion } from 'framer-motion';

/**
 * FirstAttendanceRecorder Component
 * 
 * This component provides a form to record the first attendance for a student.
 * It uses the setFirstAttendance contract function and also fetches student data
 * to display relevant information and verify eligibility.
 */
interface FirstAttendanceRecorderProps {
  contract: any;
  studentContractView?: any; // Optional contract for viewing student info
  onAttendanceSuccess?: (studentAddress: string, txHash: string) => void;
  onAttendanceError?: (error: Error) => void;
}

interface StudentInfo {
  name: string;
  isRegistered: boolean;
  hasFirstAttendance: boolean;
}

const FirstAttendanceRecorder = ({
  contract,
  studentContractView,
  onAttendanceSuccess,
  onAttendanceError
}: FirstAttendanceRecorderProps) => {
  // Form state
  const [studentAddress, setStudentAddress] = useState<string>('');
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
  
  // Student lookup state (if studentContractView is provided)
  const { 
    data: studentData,
    isLoading: isLoadingStudent,
    error: lookupError,
    refetch: refetchStudent
  } = useReadContract({
    ...studentContractView,
    functionName: 'students',
    args: studentAddress ? [studentAddress as `0x${string}`] : undefined,
    query: {
      enabled: !!studentAddress && !!studentContractView && lookupAttempted
    }
  });
  
  // Format student data
  const studentInfo: StudentInfo | undefined = studentData ? {
    name: (studentData as any)[0] as string,
    isRegistered: (studentData as any)[1] as boolean,
    hasFirstAttendance: (studentData as any)[5] as boolean
  } : undefined;
  
  // Combined error state
  const error = writeError || confirmError || lookupError;
  const isProcessing = isWritePending || isConfirming;
  
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
    if (validateAddress(studentAddress) && studentContractView) {
      setLookupAttempted(true);
      refetchStudent();
    }
  };
  
  // Handle address change
  const handleAddressChange = (value: string) => {
    setStudentAddress(value);
    setValidationError('');
    setLookupAttempted(false);
  };
  
  // Handle attendance submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
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
        
        if (studentInfo.hasFirstAttendance) {
          setValidationError('Student already has first attendance recorded');
          return;
        }
      }
      
      // Execute contract call
      writeContract({
        ...contract,
        functionName: 'setFirstAttendance',
        args: [studentAddress as `0x${string}`]
      });
    } catch (err) {
      if (onAttendanceError && err instanceof Error) {
        onAttendanceError(err);
      }
    }
  };
  
  // Call success callback when confirmed
  if (isConfirmed && hash && !isConfirming) {
    if (onAttendanceSuccess) {
      onAttendanceSuccess(studentAddress, hash);
    }
    
    // Reset form on success if no callback provided
    if (!onAttendanceSuccess) {
      setStudentAddress('');
      setLookupAttempted(false);
    }
  }
  
  // Get attendance status and styling
  const getAttendanceStatus = () => {
    if (isWritePending) {
      return { text: 'Recording Attendance', color: 'text-yellow-400', bg: 'bg-yellow-500/20' };
    }
    
    if (isConfirming) {
      return { text: 'Confirming Attendance', color: 'text-blue-400', bg: 'bg-blue-500/20' };
    }
    
    if (isConfirmed) {
      return { text: 'Attendance Recorded', color: 'text-green-400', bg: 'bg-green-500/20' };
    }
    
    if (error) {
      return { text: 'Recording Failed', color: 'text-red-400', bg: 'bg-red-500/20' };
    }
    
    if (studentInfo) {
      if (!studentInfo.isRegistered) {
        return { text: 'Not Registered', color: 'text-red-400', bg: 'bg-red-500/20' };
      }
      
      if (studentInfo.hasFirstAttendance) {
        return { text: 'Already Recorded', color: 'text-yellow-400', bg: 'bg-yellow-500/20' };
      }
      
      return { text: 'Ready to Record', color: 'text-green-400', bg: 'bg-green-500/20' };
    }
    
    return { text: 'Ready', color: 'text-gray-400', bg: 'bg-gray-500/20' };
  };
  
  const status = getAttendanceStatus();
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-gray-800/50 border border-gray-700 rounded-lg p-4"
    >
      <h3 className="text-lg font-medium text-blue-400 mb-3">
        First Attendance Record
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
        <div className="bg-gray-700/30 rounded-lg p-4">
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
              {studentContractView && (
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
              )}
            </div>
            {validationError && (
              <p className="text-xs text-red-400">{validationError}</p>
            )}
            <p className="text-xs text-gray-400">Enter the student's Ethereum wallet address</p>
          </div>
          
          {/* Student Info Display (if available) */}
          {studentInfo && lookupAttempted && !isLoadingStudent && (
            <div className="mt-4 p-3 bg-gray-700/40 rounded-md border border-gray-600">
              <h4 className="text-sm font-medium text-gray-300 mb-2">Student Information</h4>
              <div className="space-y-2">
                <div>
                  <span className="text-xs text-gray-400">Name: </span>
                  <span className="text-sm text-white">{studentInfo.name || 'Not available'}</span>
                </div>
                <div className="flex space-x-4">
                  <div className="flex items-center">
                    <div className={`w-2 h-2 rounded-full ${studentInfo.isRegistered ? 'bg-green-400' : 'bg-red-400'} mr-1`}></div>
                    <span className="text-xs text-gray-400">Registration Status: </span>
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
                      studentInfo.isRegistered && !studentInfo.hasFirstAttendance 
                        ? 'bg-green-400' 
                        : 'bg-red-400'
                    } mr-1`}></div>
                    <span className="text-xs text-gray-400">Eligibility: </span>
                    <span className={`text-xs ${
                      studentInfo.isRegistered && !studentInfo.hasFirstAttendance 
                        ? 'text-green-400' 
                        : 'text-red-400'
                    } ml-1 font-medium`}>
                      {studentInfo.isRegistered && !studentInfo.hasFirstAttendance 
                        ? 'Eligible for first attendance' 
                        : studentInfo.hasFirstAttendance 
                          ? 'Already has first attendance' 
                          : 'Not registered'
                      }
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Error Display */}
        {error && error !== lookupError && (
          <div className="bg-red-500/20 text-red-400 border border-red-500/30 rounded-md p-3">
            <p className="text-sm">Error recording attendance: {(error as Error).message || 'Unknown error'}</p>
          </div>
        )}
        
        {/* Lookup Error Display */}
        {lookupError && (
          <div className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded-md p-3">
            <p className="text-sm">Error looking up student: {(lookupError as Error).message || 'Unknown error'}</p>
            <p className="text-xs mt-1">You can still proceed with recording attendance if you're sure the address is correct.</p>
          </div>
        )}
        
        {/* Success Display */}
        {isConfirmed && hash && (
          <div className="bg-green-500/20 text-green-400 border border-green-500/30 rounded-md p-3">
            <p className="text-sm">First attendance successfully recorded!</p>
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
                : studentInfo && (!studentInfo.isRegistered || studentInfo.hasFirstAttendance)
                  ? 'bg-gray-600 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
            }`}
            disabled={isProcessing || (studentInfo && (!studentInfo.isRegistered || studentInfo.hasFirstAttendance))}
          >
            {isProcessing ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {isWritePending ? 'Recording...' : 'Confirming...'}
              </span>
            ) : isConfirmed ? (
              'Attendance Recorded'
            ) : (
              'Record First Attendance'
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
            <span className="text-gray-200 font-mono">setFirstAttendance(address)</span>
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
          <p className="mb-1">First attendance is a one-time event that activates a student's account after registration.</p>
          <p>Students must be registered before their first attendance can be recorded.</p>
        </div>
      </div>
    </motion.div>
  );
};

export default FirstAttendanceRecorder;