import { useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { motion } from 'framer-motion';

/**
 * StudentAttendanceDateUpdater Component
 * 
 * This component provides an interface to update a student's last attendance date.
 * It uses the updateStudentAttendanceDate contract function.
 */
interface StudentAttendanceDateUpdaterProps {
  contract: any;
  studentContractView?: any; // Optional contract for viewing student info
  onUpdateSuccess?: (studentAddress: string, timestamp: bigint, txHash: string) => void;
  onUpdateError?: (error: Error) => void;
}

interface StudentInfo {
  name: string;
  isRegistered: boolean;
  currentTerm: number;
  attendanceCount: number;
  lastAttendanceDate: bigint;
  hasFirstAttendance: boolean;
}

// Define the expected structure of the student data array
type StudentDataArray = [string, boolean, number | bigint, number | bigint, bigint, boolean, number | bigint, bigint];

const StudentAttendanceDateUpdater = ({
  contract,
  studentContractView,
  onUpdateSuccess,
  onUpdateError
}: StudentAttendanceDateUpdaterProps) => {
  // Form state
  const [studentAddress, setStudentAddress] = useState<string>('');
  const [date, setDate] = useState<string>(getCurrentDateString());
  const [time, setTime] = useState<string>(getCurrentTimeString());
  const [customDate, setCustomDate] = useState<boolean>(false);
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
  // // TODO: fix this block
  const { 
    data: studentData,
    isLoading: isLoadingStudent,
    refetch: refetchStudent
  } = useReadContract({
    ...studentContractView,
    functionName: 'students',
    args: studentAddress ? [studentAddress as `0x${string}`] : undefined,
    query: {
      enabled: !!studentAddress && !!studentContractView && lookupAttempted
    }
  });
  
  // Format student data with proper type casting
  const studentInfo: StudentInfo | undefined = studentData 
    ? {
        name: (studentData as StudentDataArray)[0],
        isRegistered: (studentData as StudentDataArray)[1],
        currentTerm: Number((studentData as StudentDataArray)[2]),
        attendanceCount: Number((studentData as StudentDataArray)[3]),
        lastAttendanceDate: (studentData as StudentDataArray)[4],
        hasFirstAttendance: (studentData as StudentDataArray)[5]
      } 
    : undefined;
  
  // Combined error state
  const error = writeError || confirmError;
  const isProcessing = isWritePending || isConfirming;
  
  // Get current date and time string helpers
  function getCurrentDateString(): string {
    const now = new Date();
    return now.toISOString().split('T')[0]; // YYYY-MM-DD
  }
  
  function getCurrentTimeString(): string {
    const now = new Date();
    return now.toTimeString().split(' ')[0].substring(0, 5); // HH:MM
  }
  
  // Format timestamp to readable date
  const formatTimestamp = (timestamp: bigint): string => {
    if (!timestamp || timestamp === BigInt(0)) return 'Never';
    const date = new Date(Number(timestamp) * 1000);
    return date.toLocaleString();
  };
  
  // Convert date and time inputs to unix timestamp (seconds)
  const getTimestampFromInputs = (): bigint => {
    const dateTimeString = `${date}T${time}:00`;
    const milliseconds = Date.parse(dateTimeString);
    
    if (isNaN(milliseconds)) {
      throw new Error('Invalid date or time format');
    }
    
    // Convert to seconds and ensure it fits in uint64
    return BigInt(Math.floor(milliseconds / 1000));
  };
  
  // Set current date and time
  const handleSetCurrentDateTime = () => {
    setDate(getCurrentDateString());
    setTime(getCurrentTimeString());
    setCustomDate(false);
  };
  
  // Handle date or time change
  const handleDateTimeChange = (value: string, field: 'date' | 'time') => {
    if (field === 'date') {
      setDate(value);
    } else {
      setTime(value);
    }
    setCustomDate(true);
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
  
  // Validate date and time
  const validateDateTime = (): boolean => {
    try {
      const timestamp = getTimestampFromInputs();
      const now = BigInt(Math.floor(Date.now() / 1000));
      
      // Check if date is in the future
      if (timestamp > now) {
        setValidationError('Attendance date cannot be in the future');
        return false;
      }
      
      // Check if date is too far in the past (e.g., more than 10 years)
      const tenYearsInSeconds = BigInt(10 * 365 * 24 * 60 * 60);
      if (now - timestamp > tenYearsInSeconds) {
        setValidationError('Attendance date is too far in the past');
        return false;
      }
      
      return true;
    } catch (err) {
      setValidationError('Invalid date or time format');
      return false;
    }
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
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Validate student address
      if (!validateAddress(studentAddress)) {
        return;
      }
      
      // Validate date and time
      if (!validateDateTime()) {
        return;
      }
      
      // Validate student eligibility if data is available
      if (studentInfo) {
        if (!studentInfo.isRegistered) {
          setValidationError('Student is not registered');
          return;
        }
        
        if (!studentInfo.hasFirstAttendance) {
          setValidationError('Student needs to record first attendance before updating attendance date');
          return;
        }
      }
      
      // Get timestamp from date and time inputs
      const timestamp = getTimestampFromInputs();
      
      // Execute contract call
      writeContract({
        ...contract,
        functionName: 'updateStudentAttendanceDate',
        args: [studentAddress as `0x${string}`, timestamp]
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setValidationError(errorMessage);
      
      if (onUpdateError && err instanceof Error) {
        onUpdateError(err);
      }
    }
  };
  
  // Call success callback when confirmed
  if (isConfirmed && hash && !isConfirming) {
    const timestamp = getTimestampFromInputs();
    
    if (onUpdateSuccess) {
      onUpdateSuccess(studentAddress, timestamp, hash);
    }
  }
  
  // Get update status and styling
  const getUpdateStatus = () => {
    if (isWritePending) {
      return { 
        text: 'Updating Attendance Date', 
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
        text: 'Date Updated', 
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
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-gray-800/50 border border-gray-700 rounded-lg p-4"
    >
      <h3 className="text-lg font-medium text-blue-400 mb-3">
        Update Attendance Date
      </h3>
      
      {/* Status Badge */}
      <div className={`inline-flex items-center px-3 py-1 rounded-full ${status.bg} border border-${status.color.replace('text-', '')}/30 mb-4`}>
        <div className={`w-2 h-2 rounded-full ${status.color.replace('text-', 'bg-')} mr-2`}></div>
        <span className={`text-sm font-medium ${status.color}`}>
          {status.text}
        </span>
      </div>
      
      {/* Form */}
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
            <div className="p-3 bg-gray-700/40 rounded-md border border-gray-600">
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
                  <span className="text-sm text-white">{studentInfo.attendanceCount}</span>
                </div>
                
                <div className="flex items-center">
                  <span className="text-xs text-gray-400 mr-1">Last Attendance Date: </span>
                  <span className="text-sm text-white font-medium">{formatTimestamp(studentInfo.lastAttendanceDate)}</span>
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
                      studentInfo.isRegistered && studentInfo.hasFirstAttendance
                        ? 'bg-green-400' 
                        : 'bg-red-400'
                    } mr-1`}></div>
                    <span className="text-xs text-gray-400">Eligibility: </span>
                    <span className={`text-xs ${
                      studentInfo.isRegistered && studentInfo.hasFirstAttendance
                        ? 'text-green-400' 
                        : 'text-red-400'
                    } ml-1 font-medium`}>
                      {!studentInfo.isRegistered 
                        ? 'Not registered' 
                        : !studentInfo.hasFirstAttendance 
                          ? 'First attendance not recorded' 
                          : 'Eligible for update'
                      }
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Date and Time Inputs */}
          <div className="space-y-3 mt-2">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-300">
                Attendance Date and Time
              </label>
              <button
                type="button"
                onClick={handleSetCurrentDateTime}
                className={`text-xs px-2 py-1 rounded-md ${
                  !customDate 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
                disabled={isProcessing}
              >
                Use Current Time
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label htmlFor="attendance-date" className="block text-xs text-gray-400">
                  Date
                </label>
                <input
                  id="attendance-date"
                  type="date"
                  value={date}
                  onChange={(e) => handleDateTimeChange(e.target.value, 'date')}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  max={getCurrentDateString()} // Prevent future dates
                  disabled={isProcessing}
                />
              </div>
              
              <div className="space-y-1">
                <label htmlFor="attendance-time" className="block text-xs text-gray-400">
                  Time
                </label>
                <input
                  id="attendance-time"
                  type="time"
                  value={time}
                  onChange={(e) => handleDateTimeChange(e.target.value, 'time')}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isProcessing}
                />
              </div>
            </div>
            
            <div className="text-xs text-gray-400 flex items-center mt-1">
              <svg className="w-4 h-4 mr-1 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              The selected date and time will be recorded as the student's last attendance date.
            </div>
            
            <div className="mt-2 p-2 bg-blue-500/10 border border-blue-500/30 rounded-md">
              <div className="flex items-center text-sm">
                <span className="text-gray-300 mr-2">New attendance timestamp:</span>
                <span className="text-blue-400 font-medium">
                  {formatTimestamp(getTimestampFromInputs())}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Error Display */}
        {error && (
          <div className="bg-red-500/20 text-red-400 border border-red-500/30 rounded-md p-3">
            <p className="text-sm">Error updating attendance date: {(error as Error).message || 'Unknown error'}</p>
          </div>
        )}
        
        {/* Success Display */}
        {isConfirmed && hash && (
          <div className="bg-green-500/20 text-green-400 border border-green-500/30 rounded-md p-3">
            <p className="text-sm">
              Successfully updated attendance date for student!
            </p>
            <div className="flex flex-col space-y-1 mt-2">
              <div className="flex items-center">
                <span className="text-xs text-gray-400 w-24">Student:</span>
                <span className="text-xs text-white font-mono truncate">{studentAddress}</span>
              </div>
              {studentInfo && (
                <div className="flex items-center">
                  <span className="text-xs text-gray-400 w-24">Name:</span>
                  <span className="text-xs text-white">{studentInfo.name}</span>
                </div>
              )}
              <div className="flex items-center">
                <span className="text-xs text-gray-400 w-24">New Date:</span>
                <span className="text-xs text-white">{formatTimestamp(getTimestampFromInputs())}</span>
              </div>
              {studentInfo && studentInfo.lastAttendanceDate > BigInt(0) && (
                <div className="flex items-center">
                  <span className="text-xs text-gray-400 w-24">Previous Date:</span>
                  <span className="text-xs text-gray-400">{formatTimestamp(studentInfo.lastAttendanceDate)}</span>
                </div>
              )}
              <div className="flex items-center mt-1">
                <span className="text-xs text-gray-400 w-24">TX Hash:</span>
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
                : studentInfo && (!studentInfo.isRegistered || !studentInfo.hasFirstAttendance)
                  ? 'bg-gray-600 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
            }`}
            disabled={isProcessing || (studentInfo && (!studentInfo.isRegistered || !studentInfo.hasFirstAttendance))}
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
              'Update Attendance Date'
            )}
          </button>
        </div>
      </form>
      
      {/* Additional Information */}
      <div className="mt-4 pt-4 border-t border-gray-700">
        <h4 className="text-sm font-medium text-gray-300 mb-2">Attendance Date Information</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 gap-x-4 text-xs">
          <div>
            <span className="text-gray-400">Function: </span>
            <span className="text-gray-200 font-mono">updateStudentAttendanceDate(address,uint64)</span>
          </div>
          <div>
            <span className="text-gray-400">Transaction Type: </span>
            <span className="text-gray-200">Non-payable</span>
          </div>
          <div>
            <span className="text-gray-400">Gas Estimate: </span>
            <span className="text-gray-200">~65,000 gas</span>
          </div>
          <div>
            <span className="text-gray-400">Confirmation Time: </span>
            <span className="text-gray-200">~15-30 seconds</span>
          </div>
        </div>
        <div className="mt-3 text-xs text-gray-400">
          <p className="mb-1">This function updates a student's last attendance date to a specific timestamp.</p>
          <p>Students must be registered and have their first attendance recorded before their attendance date can be updated.</p>
        </div>
      </div>
    </motion.div>
  );
};

export default StudentAttendanceDateUpdater;