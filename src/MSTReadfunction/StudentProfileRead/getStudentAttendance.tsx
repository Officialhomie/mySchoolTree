import { useState, useEffect } from 'react';
import { useReadContract } from 'wagmi';
import { motion } from 'framer-motion';

/**
 * StudentAttendanceViewer Component
 * 
 * This component displays attendance information for a student in a specific term.
 * It uses the getStudentAttendance contract function to fetch data.
 * It also exports attendance data for use in other components via useAttendanceData hook.
 */
interface StudentAttendanceViewerProps {
  studentProfileContract: any; // Changed from contract to studentProfileContract
  studentContractView?: any; // Optional contract for viewing additional student info
  studentAddress?: string; // Optional pre-filled student address
  term?: number; // Optional pre-filled term
  refreshInterval?: number; // Optional interval to refresh data in milliseconds
  onDataFetched?: (termAttendance: bigint, totalAttendance: bigint) => void; // Optional callback when data is fetched
}

interface StudentInfo {
  name: string;
  isRegistered: boolean;
  currentTerm: number;
}

export interface AttendanceData {
  studentAddress: string;
  term: number;
  termAttendance?: bigint;
  totalAttendance?: bigint;
  studentInfo?: StudentInfo;
  status: {
    text: string;
    color: string;
    bg: string;
  };
  isLoading: boolean;
  error: Error | null;
  refresh: () => void;
}

// Define the expected structure of the student data array for additional info
type StudentDataArray = [string, boolean, number | bigint, number | bigint, bigint, boolean, number | bigint, bigint];

// Export a hook for other components to use the attendance data
export function useAttendanceData(
  studentProfileContract: any, // Changed from contract to studentProfileContract
  studentContractView?: any,
  defaultStudentAddress: string = '',
  defaultTerm: number = 1,
  refreshInterval: number = 0
): AttendanceData & {
  setStudentAddress: (address: string) => void;
  setTerm: (term: number) => void;
  toggleAdditionalInfo: () => void;
} {
  const [address, setAddress] = useState<string>(defaultStudentAddress);
  const [currentTerm, setCurrentTerm] = useState<number>(defaultTerm);
  const [showAdditionalInfo, setShowAdditionalInfo] = useState<boolean>(false);
  
  // Fetch attendance data from contract
  const {
    data: attendanceData,
    error: attendanceError,
    isLoading: isLoadingAttendance,
    refetch: refetchAttendance
  } = useReadContract({
    ...studentProfileContract, 
    functionName: 'getStudentAttendance',
    args: address ? [address as `0x${string}`, BigInt(currentTerm)] : undefined,
    query: {
      enabled: !!address && currentTerm > 0 && !!studentProfileContract
    }
  });
  
  // Extract attendance values
  const termAttendance = attendanceData ? (attendanceData as any)[0] : undefined;
  const totalAttendance = attendanceData ? (attendanceData as any)[1] : undefined;
  
  // Fetch additional student data if studentContractView is provided
  const {
    data: studentData,
    error: studentError,
    isLoading: isLoadingStudent,
    refetch: refetchStudent
  } = useReadContract({
    ...studentContractView,
    functionName: 'students',
    args: address ? [address as `0x${string}`] : undefined,
    query: {
      enabled: !!address && !!studentContractView && showAdditionalInfo
    }
  });
  
  // Format student data with proper type casting
  const studentInfo: StudentInfo | undefined = studentData && showAdditionalInfo
    ? {
        name: (studentData as StudentDataArray)[0],
        isRegistered: (studentData as StudentDataArray)[1],
        currentTerm: Number((studentData as StudentDataArray)[2])
      }
    : undefined;
  
  // Combined error and loading states
  const error = attendanceError || (showAdditionalInfo ? studentError : undefined);
  const isLoading = isLoadingAttendance || (showAdditionalInfo ? isLoadingStudent : false);
  
  // Get attendance status and styling
  const getAttendanceStatus = () => {
    if (!termAttendance || !totalAttendance) {
      return { text: 'No Data', color: 'text-gray-400', bg: 'bg-gray-500/20' };
    }
    
    const termCount = Number(termAttendance);
    
    if (termCount > 10) {
      return { text: 'Excellent', color: 'text-green-400', bg: 'bg-green-500/20' };
    } else if (termCount > 5) {
      return { text: 'Good', color: 'text-blue-400', bg: 'bg-blue-500/20' };
    } else if (termCount > 0) {
      return { text: 'Minimal', color: 'text-yellow-400', bg: 'bg-yellow-500/20' };
    } else {
      return { text: 'None', color: 'text-red-400', bg: 'bg-red-500/20' };
    }
  };
  
  // Set up auto-refresh if interval is provided
  useEffect(() => {
    if (refreshInterval > 0 && address && currentTerm > 0) {
      const timer = setInterval(() => {
        refetchAttendance();
        if (showAdditionalInfo && studentContractView) {
          refetchStudent();
        }
      }, refreshInterval);
      
      return () => {
        clearInterval(timer);
      };
    }
  }, [refreshInterval, address, currentTerm, showAdditionalInfo, studentContractView, refetchAttendance, refetchStudent]);
  
  const refresh = () => {
    refetchAttendance();
    if (showAdditionalInfo && studentContractView) {
      refetchStudent();
    }
  };
  
  const toggleAdditionalInfo = () => {
    const newState = !showAdditionalInfo;
    setShowAdditionalInfo(newState);
    
    // Fetch student data if turning on and not already loaded
    if (newState && studentContractView && address && !studentData) {
      refetchStudent();
    }
  };
  
  return {
    studentAddress: address,
    term: currentTerm,
    termAttendance,
    totalAttendance,
    studentInfo,
    status: getAttendanceStatus(),
    isLoading,
    error: error as Error | null,
    refresh,
    setStudentAddress: setAddress,
    setTerm: setCurrentTerm,
    toggleAdditionalInfo
  };
}

const StudentAttendanceViewer = ({
  studentProfileContract, // Changed from contract to studentProfileContract
  studentContractView,
  studentAddress = '',
  term = 1,
  refreshInterval = 0,
  onDataFetched
}: StudentAttendanceViewerProps) => {
  // Use the exported hook for handling attendance data
  const {
    studentAddress: address,
    term: currentTerm,
    termAttendance,
    totalAttendance,
    studentInfo,
    status,
    isLoading,
    error,
    refresh,
    setStudentAddress,
    setTerm,
    toggleAdditionalInfo
  } = useAttendanceData(
    studentProfileContract, // Changed from contract to studentProfileContract
    studentContractView,
    studentAddress,
    term,
    refreshInterval
  );
  
  const [validationError, setValidationError] = useState<string>('');
  const [showAdditionalInfo, setShowAdditionalInfo] = useState<boolean>(false);
  
  // Update internal state when the hook's state changes
  useEffect(() => {
    setShowAdditionalInfo(!!studentInfo);
  }, [studentInfo]);
  
  // Callback when data is fetched
  useEffect(() => {
    if (termAttendance !== undefined && totalAttendance !== undefined && onDataFetched) {
      onDataFetched(termAttendance, totalAttendance);
    }
  }, [termAttendance, totalAttendance, onDataFetched]);
  
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
  
  // Validate term number
  const validateTerm = (term: number): boolean => {
    if (isNaN(term) || term <= 0) {
      setValidationError('Term must be a positive number');
      return false;
    }
    
    setValidationError('');
    return true;
  };
  
  // Handle address change
  const handleAddressChange = (value: string) => {
    setStudentAddress(value);
    setValidationError('');
  };
  
  // Handle term change
  const handleTermChange = (value: string) => {
    const termNumber = parseInt(value);
    setTerm(isNaN(termNumber) ? 0 : termNumber);
    setValidationError('');
  };
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateAddress(address) && validateTerm(currentTerm)) {
      refresh();
    }
  };
  
  // Handle toggle additional info
  const handleToggleAdditionalInfo = () => {
    toggleAdditionalInfo();
  };
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-gray-800/50 border border-gray-700 rounded-lg p-4"
    >
      <h3 className="text-lg font-medium text-blue-400 mb-3">
        Student Attendance Viewer
      </h3>
      
      {/* Query Form */}
      <form onSubmit={handleSubmit} className="space-y-4 mb-4">
        <div className="bg-gray-700/30 rounded-lg p-4 space-y-4">
          {/* Student Address Input */}
          <div className="space-y-2">
            <label htmlFor="student-address" className="block text-sm font-medium text-gray-300">
              Student Wallet Address
            </label>
            <input
              id="student-address"
              type="text"
              value={address}
              onChange={(e) => handleAddressChange(e.target.value)}
              placeholder="0x..."
              className={`w-full px-3 py-2 bg-gray-700 border ${
                validationError && !address ? 'border-red-500' : 'border-gray-600'
              } rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
            />
            <p className="text-xs text-gray-400">Enter the student's Ethereum wallet address</p>
          </div>
          
          {/* Term Input */}
          <div className="space-y-2">
            <label htmlFor="term-number" className="block text-sm font-medium text-gray-300">
              Term Number
            </label>
            <input
              id="term-number"
              type="number"
              value={currentTerm || ''}
              onChange={(e) => handleTermChange(e.target.value)}
              placeholder="Enter term number"
              min="1"
              className={`w-full px-3 py-2 bg-gray-700 border ${
                validationError && (!currentTerm || currentTerm <= 0) ? 'border-red-500' : 'border-gray-600'
              } rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
            />
            <p className="text-xs text-gray-400">Enter the term number to check attendance for</p>
          </div>
          
          {/* Error Display */}
          {validationError && (
            <div className="text-xs text-red-400 mt-1">{validationError}</div>
          )}
          
          {/* Options */}
          {studentContractView && (
            <div className="flex items-center mt-2">
              <label className="inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={showAdditionalInfo}
                  onChange={handleToggleAdditionalInfo}
                />
                <div className="relative w-10 h-5 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-300 after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                <span className="ml-3 text-sm text-gray-300">Show Additional Student Info</span>
              </label>
            </div>
          )}
          
          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Loading...
                </span>
              ) : (
                'View Attendance'
              )}
            </button>
          </div>
        </div>
      </form>
      
      {/* Results Display */}
      {error ? (
        <div className="bg-red-500/20 text-red-400 border border-red-500/30 rounded-md p-3 mb-4">
          <p className="text-sm">Error fetching attendance data: {(error as Error).message || 'Unknown error'}</p>
          <button 
            onClick={() => refresh()} 
            className="text-xs mt-2 bg-gray-700 hover:bg-gray-600 text-gray-200 py-1 px-2 rounded"
          >
            Try Again
          </button>
        </div>
      ) : termAttendance !== undefined && totalAttendance !== undefined ? (
        <div className="space-y-4">
          {/* Status Badge */}
          <div className={`inline-flex items-center px-3 py-1 rounded-full ${status.bg} border border-${status.color.replace('text-', '')}/30`}>
            <div className={`w-2 h-2 rounded-full ${status.color.replace('text-', 'bg-')} mr-2`}></div>
            <span className={`text-sm font-medium ${status.color}`}>
              {status.text} Attendance
            </span>
          </div>
          
          {/* Main Info Card */}
          <div className="bg-gray-700/30 rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Student Info (if available) */}
              {showAdditionalInfo && studentInfo && (
                <div className="space-y-2 md:col-span-2">
                  <h4 className="text-sm font-medium text-gray-300">Student Information</h4>
                  <div className="bg-gray-700/40 rounded-md p-3 border border-gray-600">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                      <div className="space-y-1">
                        <p className="text-xs text-gray-400">Name:</p>
                        <p className="text-lg font-medium text-white">{studentInfo.name || 'Unnamed Student'}</p>
                      </div>
                      <div className="flex items-center mt-2 md:mt-0">
                        <div className={`w-2 h-2 rounded-full ${studentInfo.isRegistered ? 'bg-green-400' : 'bg-red-400'} mr-2`}></div>
                        <span className={`text-sm ${studentInfo.isRegistered ? 'text-green-400' : 'text-red-400'}`}>
                          {studentInfo.isRegistered ? 'Registered' : 'Not Registered'}
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 pt-2 border-t border-gray-600">
                      <span className="text-xs text-gray-400">Current Term: </span>
                      <span className="text-sm text-white">{studentInfo.currentTerm}</span>
                      {currentTerm !== studentInfo.currentTerm && (
                        <span className="text-xs text-yellow-400 ml-2">
                          (Viewing term {currentTerm})
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Term Attendance */}
              <div className="space-y-1">
                <p className="text-xs text-gray-400">Term {currentTerm} Attendance:</p>
                <div className="flex items-baseline">
                  <p className="text-3xl font-bold text-white">{termAttendance.toString()}</p>
                  <p className="text-sm text-gray-400 ml-2">classes</p>
                </div>
                
                {Number(termAttendance) === 0 && (
                  <p className="text-xs text-red-400">No attendance recorded for this term</p>
                )}
                
                {/* Attendance Level Visual Indicator */}
                <div className="mt-2 h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${getAttendanceBarColor(Number(termAttendance))}`}
                    style={{ width: `${Math.min(Number(termAttendance) * 5, 100)}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {getAttendanceLevel(Number(termAttendance))}
                </p>
              </div>
              
              {/* Total Attendance */}
              <div className="space-y-1">
                <p className="text-xs text-gray-400">Total Attendance (All Terms):</p>
                <div className="flex items-baseline">
                  <p className="text-3xl font-bold text-white">{totalAttendance.toString()}</p>
                  <p className="text-sm text-gray-400 ml-2">classes</p>
                </div>
                
                {/* Comparison with Term Attendance */}
                {Number(termAttendance) > 0 && Number(totalAttendance) > Number(termAttendance) && (
                  <p className="text-xs text-blue-400">
                    {((Number(termAttendance) / Number(totalAttendance)) * 100).toFixed(1)}% of total attendance in current term
                  </p>
                )}
                
                {/* Total Attendance Visual Indicator */}
                <div className="mt-2 h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500"
                    style={{ width: `${Math.min(Number(totalAttendance) * 2, 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Additional Details */}
          <div className="bg-gray-700/20 rounded-md p-3 text-xs">
            <h4 className="text-sm font-medium text-gray-300 mb-2">Attendance Details</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 gap-x-4">
              <div>
                <span className="text-gray-400">Student Address: </span>
                <span className="text-gray-200 font-mono">{address}</span>
              </div>
              
              <div>
                <span className="text-gray-400">Term: </span>
                <span className="text-gray-200">{currentTerm}</span>
              </div>
              
              <div>
                <span className="text-gray-400">Term Attendance: </span>
                <span className="text-gray-200">{termAttendance.toString()} classes</span>
              </div>
              
              <div>
                <span className="text-gray-400">Total Attendance: </span>
                <span className="text-gray-200">{totalAttendance.toString()} classes</span>
              </div>
            </div>
            
            <div className="mt-3 pt-2 border-t border-gray-700">
              <button 
                onClick={() => refresh()} 
                className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 py-1 px-3 rounded flex items-center"
              >
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh Data
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </motion.div>
  );
};

// Helper functions for attendance visualization
function getAttendanceBarColor(count: number): string {
  if (count > 10) return 'bg-green-500';
  if (count > 5) return 'bg-blue-500';
  if (count > 0) return 'bg-yellow-500';
  return 'bg-red-500';
}

function getAttendanceLevel(count: number): string {
  if (count > 15) return 'Exceptional attendance level';
  if (count > 10) return 'Excellent attendance level';
  if (count > 5) return 'Good attendance level';
  if (count > 0) return 'Minimal attendance level';
  return 'No attendance recorded';
}

export default StudentAttendanceViewer;