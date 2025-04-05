import { useState, useEffect } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { motion } from 'framer-motion';
import { contractStudentManagementConfig } from '../contracts';

/**
 * CombinedStudentAttendanceManager Component
 * 
 * This component combines functionality to:
 * 1. Update a student's attendance count (increase/decrease)
 * 2. Update a student's last attendance date
 * 
 * It can be used with UI or as a headless component for programmatic use.
 */
interface CombinedStudentAttendanceManagerProps {
  onCountUpdateSuccess?: (studentAddress: string, increased: boolean, txHash: string) => void;
  onDateUpdateSuccess?: (studentAddress: string, timestamp: bigint, txHash: string) => void;
  onUpdateError?: (error: Error) => void;
  // External control props
  externalStudentAddress?: string;
  externalIncrease?: boolean;
  externalDate?: string;
  externalTime?: string;
  // Callback for exporting state
  onStateChange?: (state: CombinedAttendanceState) => void;
  // Flag to show/hide UI
  renderUI?: boolean;
  // Initial tab (count or date)
  initialTab?: 'count' | 'date';
}

export interface StudentInfo {
  name: string;
  isRegistered: boolean;
  currentTerm: number;
  attendanceCount: number;
  lastAttendanceDate: bigint;
  hasFirstAttendance: boolean;
}

// Define the expected structure of the student data array
type StudentDataArray = [string, boolean, number | bigint, number | bigint, bigint, boolean, number | bigint, bigint];

// Exportable state interface
export interface CombinedAttendanceState {
  // Active tab
  activeTab: 'count' | 'date';
  setActiveTab: (tab: 'count' | 'date') => void;
  
  // Shared state
  studentAddress: string;
  setStudentAddress: (address: string) => void;
  studentInfo?: StudentInfo;
  isLoadingStudent: boolean;
  lookupAttempted: boolean;
  validationError: string;
  handleLookup: () => void;
  validateAddress: (address: string) => boolean;
  formatTimestamp: (timestamp: bigint) => string;
  
  // Count update specific state
  increase: boolean;
  setIncrease: (increase: boolean) => void;
  
  // Date update specific state
  date: string;
  time: string;
  customDate: boolean;
  setDate: (date: string) => void;
  setTime: (time: string) => void;
  handleSetCurrentDateTime: () => void;
  getTimestampFromInputs: () => bigint;
  
  // Transaction states
  isCountWritePending: boolean;
  isCountConfirming: boolean;
  isCountConfirmed: boolean;
  countHash?: `0x${string}` | undefined;
  countError?: Error | null;
  
  isDateWritePending: boolean;
  isDateConfirming: boolean;
  isDateConfirmed: boolean;
  dateHash?: string;
  dateError?: Error;
  
  // Combined state
  isProcessing: boolean;
  
  // Methods
  handleCountSubmit: (e?: React.FormEvent) => Promise<void>;
  handleDateSubmit: (e?: React.FormEvent) => Promise<void>;
  handleCombinedSubmit: (e?: React.FormEvent) => Promise<void>;
}

const StudentMakeUpFour = ({
  onCountUpdateSuccess,
  onDateUpdateSuccess,
  onUpdateError,
  externalStudentAddress,
  externalIncrease,
  externalDate,
  externalTime,
  onStateChange,
  renderUI = true,
  initialTab = 'count'
}: CombinedStudentAttendanceManagerProps) => {
  // Shared state
  const [activeTab, setActiveTab] = useState<'count' | 'date'>(initialTab);
  const [studentAddress, setStudentAddressInternal] = useState<string>(externalStudentAddress || '');
  const [validationError, setValidationError] = useState<string>('');
  const [lookupAttempted, setLookupAttempted] = useState<boolean>(false);
  
  // Count update specific state
  const [increase, setIncreaseInternal] = useState<boolean>(externalIncrease !== undefined ? externalIncrease : true);
  
  // Date update specific state
  const [date, setDateInternal] = useState<string>(externalDate || getCurrentDateString());
  const [time, setTimeInternal] = useState<string>(externalTime || getCurrentTimeString());
  const [customDate, setCustomDate] = useState<boolean>(false);
  
  // Contract write states - Count update
  const { 
    data: countHash,
    error: countWriteError,
    isPending: isCountWritePending,
    writeContract: writeCountContract
  } = useWriteContract();
  
  // Transaction receipt state - Count update
  const { 
    isLoading: isCountConfirming,
    isSuccess: isCountConfirmed,
    error: countConfirmError
  } = useWaitForTransactionReceipt({ 
    hash: countHash,
  });
  
  // Contract write states - Date update
  const { 
    data: dateHash,
    error: dateWriteError,
    isPending: isDateWritePending,
    writeContract: writeDateContract
  } = useWriteContract();
  
  // Transaction receipt state - Date update
  const { 
    isLoading: isDateConfirming,
    isSuccess: isDateConfirmed,
    error: dateConfirmError
  } = useWaitForTransactionReceipt({ 
    hash: dateHash,
  });
  
  // Student lookup state
  const { 
    data: studentData,
    isLoading: isLoadingStudent,
    refetch: refetchStudent
  } = useReadContract({
    address: contractStudentManagementConfig.address as `0x${string}`,
    abi: contractStudentManagementConfig.abi,
    functionName: 'students',
    args: studentAddress ? [studentAddress as `0x${string}`] : undefined,
    query: {
      enabled: !!studentAddress && lookupAttempted
    }
  });
  
  // Format student data
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
  
  // Combined error and processing states
  const countError = countWriteError || countConfirmError;
  const dateError = dateWriteError || dateConfirmError;
  const isProcessing = isCountWritePending || isCountConfirming || 
                       isDateWritePending || isDateConfirming;
  
  // Helper functions
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
    
    // Convert to seconds
    return BigInt(Math.floor(milliseconds / 1000));
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
  
  const setDate = (value: string) => {
    setDateInternal(value);
    setCustomDate(true);
  };
  
  const setTime = (value: string) => {
    setTimeInternal(value);
    setCustomDate(true);
  };
  
  // Set current date and time
  const handleSetCurrentDateTime = () => {
    setDateInternal(getCurrentDateString());
    setTimeInternal(getCurrentTimeString());
    setCustomDate(false);
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
    if (validateAddress(studentAddress)) {
      setLookupAttempted(true);
      refetchStudent();
    }
  };
  
  // Handle address change
  const handleAddressChange = (value: string) => {
    setStudentAddress(value);
  };
  
  // Handle count update submission
  const handleCountSubmit = async (e?: React.FormEvent) => {
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
      writeCountContract({
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
  
  // Handle date update submission
  const handleDateSubmit = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    
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
      writeDateContract({
        abi: contractStudentManagementConfig.abi,
        address: contractStudentManagementConfig.address as `0x${string}`,
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
  
  // Combined submission handler
  const handleCombinedSubmit = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    
    try {
      if (activeTab === 'count') {
        await handleCountSubmit();
      } else {
        await handleDateSubmit();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setValidationError(errorMessage);
      
      if (onUpdateError && err instanceof Error) {
        onUpdateError(err);
      }
    }
  };
  
  // Build the exportable state
  const exportableState: CombinedAttendanceState = {
    // Active tab
    activeTab,
    setActiveTab,
    
    // Shared state
    studentAddress,
    setStudentAddress,
    studentInfo,
    isLoadingStudent,
    lookupAttempted,
    validationError,
    handleLookup,
    validateAddress,
    formatTimestamp,
    
    // Count update specific state
    increase,
    setIncrease,
    
    // Date update specific state
    date,
    time,
    customDate,
    setDate,
    setTime,
    handleSetCurrentDateTime,
    getTimestampFromInputs,
    
    // Transaction states
    isCountWritePending,
    isCountConfirming,
    isCountConfirmed: !!isCountConfirmed,
    countHash,
    countError: countError as Error | null,
    
    isDateWritePending,
    isDateConfirming,
    isDateConfirmed: !!isDateConfirmed,
    dateHash: dateHash as string | undefined,
    dateError: dateError as Error | undefined,
    
    // Combined state
    isProcessing,
    
    // Methods
    handleCountSubmit,
    handleDateSubmit,
    handleCombinedSubmit
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
  
  useEffect(() => {
    if (externalDate !== undefined && externalDate !== date) {
      setDate(externalDate);
    }
  }, [externalDate]);
  
  useEffect(() => {
    if (externalTime !== undefined && externalTime !== time) {
      setTime(externalTime);
    }
  }, [externalTime]);
  
  // Call the onStateChange callback whenever relevant state changes
  useEffect(() => {
    if (onStateChange) {
      onStateChange(exportableState);
    }
  }, [
    activeTab, studentAddress, increase, date, time, customDate, validationError, lookupAttempted,
    studentInfo, isLoadingStudent, isCountWritePending, isCountConfirming, isCountConfirmed,
    isDateWritePending, isDateConfirming, isDateConfirmed, countHash, dateHash, countError, dateError
  ]);
  
  // Call success callbacks when confirmed
  useEffect(() => {
    if (isCountConfirmed && countHash && !isCountConfirming) {
      if (onCountUpdateSuccess) {
        onCountUpdateSuccess(studentAddress, increase, countHash);
      }
    }
  }, [isCountConfirmed, countHash, isCountConfirming, onCountUpdateSuccess, studentAddress, increase]);
  
  useEffect(() => {
    if (isDateConfirmed && dateHash && !isDateConfirming) {
      const timestamp = getTimestampFromInputs();
      
      if (onDateUpdateSuccess) {
        onDateUpdateSuccess(studentAddress, timestamp, dateHash);
      }
    }
  }, [isDateConfirmed, dateHash, isDateConfirming, onDateUpdateSuccess, studentAddress]);
  
  // Get update status and styling for count
  const getCountUpdateStatus = () => {
    if (isCountWritePending) {
      return { 
        text: increase ? 'Increasing Attendance' : 'Decreasing Attendance', 
        color: 'text-yellow-400', 
        bg: 'bg-yellow-500/20' 
      };
    }
    
    if (isCountConfirming) {
      return { 
        text: 'Confirming Update', 
        color: 'text-blue-400', 
        bg: 'bg-blue-500/20' 
      };
    }
    
    if (isCountConfirmed) {
      return { 
        text: 'Attendance Updated', 
        color: 'text-green-400', 
        bg: 'bg-green-500/20' 
      };
    }
    
    if (countError) {
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
  
  // Get update status and styling for date
  const getDateUpdateStatus = () => {
    if (isDateWritePending) {
      return { 
        text: 'Updating Attendance Date', 
        color: 'text-yellow-400', 
        bg: 'bg-yellow-500/20' 
      };
    }
    
    if (isDateConfirming) {
      return { 
        text: 'Confirming Update', 
        color: 'text-blue-400', 
        bg: 'bg-blue-500/20' 
      };
    }
    
    if (isDateConfirmed) {
      return { 
        text: 'Date Updated', 
        color: 'text-green-400', 
        bg: 'bg-green-500/20' 
      };
    }
    
    if (dateError) {
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
  
  const countStatus = getCountUpdateStatus();
  const dateStatus = getDateUpdateStatus();
  
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
        Student Attendance Manager
      </h3>
      
      {/* Tab Navigation */}
      <div className="flex mb-4 border-b border-gray-700">
        <button
          onClick={() => setActiveTab('count')}
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === 'count' 
              ? 'text-blue-400 border-b-2 border-blue-400' 
              : 'text-gray-400 hover:text-gray-300'
          }`}
          disabled={isProcessing}
        >
          Update Count
        </button>
        <button
          onClick={() => setActiveTab('date')}
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === 'date' 
              ? 'text-blue-400 border-b-2 border-blue-400' 
              : 'text-gray-400 hover:text-gray-300'
          }`}
          disabled={isProcessing}
        >
          Update Date
        </button>
      </div>
      
      {/* Status Badge - Count or Date based on active tab */}
      <div className={`inline-flex items-center px-3 py-1 rounded-full ${
        activeTab === 'count' ? countStatus.bg : dateStatus.bg
      } border border-${
        activeTab === 'count' ? countStatus.color.replace('text-', '') : dateStatus.color.replace('text-', '')
      }/30 mb-4`}>
        <div className={`w-2 h-2 rounded-full ${
          activeTab === 'count' 
            ? countStatus.color.replace('text-', 'bg-') 
            : dateStatus.color.replace('text-', 'bg-')
        } mr-2`}></div>
        <span className={`text-sm font-medium ${
          activeTab === 'count' ? countStatus.color : dateStatus.color
        }`}>
          {activeTab === 'count' ? countStatus.text : dateStatus.text}
        </span>
      </div>
      
      {/* Combined Form */}
      <form onSubmit={handleCombinedSubmit} className="space-y-4">
        <div className="bg-gray-700/30 rounded-lg p-4 space-y-4">
          {/* Student Address Input with Lookup Button - Shared */}
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
          
          {/* Student Info Display (if available) - Shared */}
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
                  <span className="text-sm font-medium text-white">{studentInfo.attendanceCount}</span>
                  {activeTab === 'count' && (
                    increase ? (
                      <span className="ml-2 text-xs text-green-400">→ {studentInfo.attendanceCount + 1}</span>
                    ) : (
                      <span className="ml-2 text-xs text-red-400">→ {Math.max(0, studentInfo.attendanceCount - 1)}</span>
                    )
                  )}
                </div>
                
                <div className="flex items-center">
                  <span className="text-xs text-gray-400 mr-1">Last Attendance Date: </span>
                  <span className="text-sm text-white font-medium">{formatTimestamp(studentInfo.lastAttendanceDate)}</span>
                  {activeTab === 'date' && (
                    <span className="ml-2 text-xs text-blue-400">→ {formatTimestamp(getTimestampFromInputs())}</span>
                  )}
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
                      activeTab === 'count'
                        ? (studentInfo.isRegistered && studentInfo.hasFirstAttendance && (increase || studentInfo.attendanceCount > 0)
                            ? 'bg-green-400' : 'bg-red-400')
                        : (studentInfo.isRegistered && studentInfo.hasFirstAttendance
                            ? 'bg-green-400' : 'bg-red-400')
                    } mr-1`}></div>
                    <span className="text-xs text-gray-400">Eligibility: </span>
                    <span className={`text-xs ${
                      activeTab === 'count'
                        ? (studentInfo.isRegistered && studentInfo.hasFirstAttendance && (increase || studentInfo.attendanceCount > 0)
                            ? 'text-green-400' : 'text-red-400')
                        : (studentInfo.isRegistered && studentInfo.hasFirstAttendance
                            ? 'text-green-400' : 'text-red-400')
                    } ml-1 font-medium`}>
                      {!studentInfo.isRegistered 
                        ? 'Not registered' 
                        : !studentInfo.hasFirstAttendance 
                          ? 'First attendance not recorded' 
                          : activeTab === 'count' && !increase && studentInfo.attendanceCount === 0
                            ? 'Cannot decrease below zero'
                            : 'Eligible for update'
                      }
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Tab-Specific Content */}
          {activeTab === 'count' ? (
            /* Count Update UI */
            <div className="space-y-4 mt-4">
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
            </div>
          ) : (
            /* Date Update UI */
            <div className="space-y-4 mt-4">
              {/* Date and Time Inputs */}
              <div className="space-y-3">
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
                      onChange={(e) => setDate(e.target.value)}
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
                      onChange={(e) => setTime(e.target.value)}
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
          )}
        </div>
      </form>
    </motion.div>
  );
};

export default StudentMakeUpFour;

