import { useState, useEffect } from 'react';
import { useReadContract } from 'wagmi';
import { motion } from 'framer-motion';

/**
 * TuitionStatusChecker Component
 * 
 * This component provides a simplified view of a student's tuition payment status.
 * It uses the checkTuitionStatus contract function to determine if tuition has been paid
 * and when it is/was due.
 * 
 * The component now exposes a useTuitionStatus hook for external data access.
 */
interface TuitionStatusCheckerProps {
  contract: any;
  schoolAddress?: string; // Optional pre-filled school address
  studentAddress?: string; // Optional pre-filled student address
  term?: number; // Optional pre-filled term
  refreshInterval?: number; // Optional interval to refresh data in milliseconds
  onDataFetched?: (isPaid: boolean, dueDate: bigint) => void; // Optional callback when data is fetched
}

export interface TuitionStatusData {
  isPaid: boolean;
  dueDate: bigint;
}

export interface StatusStyle {
  text: string;
  color: string;
  bg: string;
}

export interface DaysInfo {
  value: number;
  isOverdue: boolean;
}

export interface TuitionStatusInfo {
  tuitionStatus: TuitionStatusData | undefined;
  schoolAddress: string;
  studentAddress: string;
  term: number;
  statusStyle: StatusStyle;
  dueDateStyle: { color: string };
  daysInfo: DaysInfo;
  isPastDue: boolean;
  isLoading: boolean;
  error: Error | null;
  validationError: string;
  hasSearched: boolean;
  setSchoolAddress: (address: string) => void;
  setStudentAddress: (address: string) => void;
  setTerm: (term: number) => void;
  refresh: () => void;
  validateAddress: (address: string, fieldName: string) => boolean;
  validateTerm: (term: number) => boolean;
  formatTimestamp: (timestamp: bigint) => string;
  getStatusMessage: () => string;
  truncateAddress: (address: string) => string;
}

/**
 * Hook to access tuition status data outside the component
 */
export function useTuitionStatus(
  contract: any,
  initialSchoolAddress: string = '',
  initialStudentAddress: string = '',
  initialTerm: number = 1,
  refreshInterval: number = 0
): TuitionStatusInfo {
  // Form state
  const [school, setSchool] = useState<string>(initialSchoolAddress);
  const [student, setStudent] = useState<string>(initialStudentAddress);
  const [currentTerm, setCurrentTerm] = useState<number>(initialTerm);
  const [validationError, setValidationError] = useState<string>('');
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  
  // Fetch tuition status from contract
  const {
    data: statusData,
    error: statusError,
    isLoading: isLoadingStatus,
    refetch: refetchStatus
  } = useReadContract({
    ...contract,
    functionName: 'checkTuitionStatus',
    args: school && student ? [
      school as `0x${string}`, 
      student as `0x${string}`, 
      BigInt(currentTerm)
    ] : undefined,
    query: {
      enabled: !!school && !!student && currentTerm > 0
    }
  });
  
  // Extract status values with proper typing
  const tuitionStatus: TuitionStatusData | undefined = statusData
    ? {
        isPaid: (statusData as any).isPaid,
        dueDate: (statusData as any).dueDate
      }
    : undefined;
  
  // Check if the due date is in the past
  const isPastDue = (): boolean => {
    if (!tuitionStatus) return false;
    
    const currentTimestamp = BigInt(Math.floor(Date.now() / 1000));
    return !tuitionStatus.isPaid && currentTimestamp > tuitionStatus.dueDate;
  };
  
  // Calculate days remaining or days overdue
  const getDaysRemainingOrOverdue = (): DaysInfo => {
    if (!tuitionStatus) return { value: 0, isOverdue: false };
    
    const currentTimestamp = BigInt(Math.floor(Date.now() / 1000));
    const dayInSeconds = BigInt(86400); // 24 hours * 60 minutes * 60 seconds
    
    if (currentTimestamp > tuitionStatus.dueDate) {
      // Overdue
      const daysLate = Number((currentTimestamp - tuitionStatus.dueDate) / dayInSeconds);
      return { value: daysLate, isOverdue: true };
    } else {
      // Still has time
      const daysRemaining = Number((tuitionStatus.dueDate - currentTimestamp) / dayInSeconds);
      return { value: daysRemaining, isOverdue: false };
    }
  };
  
  // Validate address format
  const validateAddress = (address: string, fieldName: string): boolean => {
    if (!address) {
      setValidationError(`${fieldName} address is required`);
      return false;
    }
    
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      setValidationError(`Invalid ${fieldName} Ethereum address format`);
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
  
  // Handle school address change
  const handleSchoolAddressChange = (value: string) => {
    setSchool(value);
    setValidationError('');
  };
  
  // Handle student address change
  const handleStudentAddressChange = (value: string) => {
    setStudent(value);
    setValidationError('');
  };
  
  // Handle term change
  const handleTermChange = (value: number) => {
    setCurrentTerm(isNaN(value) ? 0 : value);
    setValidationError('');
  };
  
  // Handle checking status
  const checkStatus = () => {
    // Reset validation error first
    setValidationError('');
    
    // Validate all fields
    const isSchoolValid = validateAddress(school, 'School');
    const isStudentValid = validateAddress(student, 'Student');
    const isTermValid = validateTerm(currentTerm);
    
    if (isSchoolValid && isStudentValid && isTermValid) {
      setHasSearched(true);
      refetchStatus();
    }
  };
  
  // Format timestamp to readable date and time
  const formatTimestamp = (timestamp: bigint): string => {
    const date = new Date(Number(timestamp) * 1000);
    return date.toLocaleString();
  };
  
  // Get payment status styling
  const getPaymentStatusStyle = (): StatusStyle => {
    if (!tuitionStatus) return { text: 'Unknown', color: 'text-gray-400', bg: 'bg-gray-500/20' };
    
    if (tuitionStatus.isPaid) {
      return { text: 'Paid', color: 'text-green-400', bg: 'bg-green-500/20' };
    }
    
    const isPastDueDate = isPastDue();
    
    if (isPastDueDate) {
      return { text: 'Overdue', color: 'text-red-400', bg: 'bg-red-500/20' };
    } else {
      return { text: 'Pending', color: 'text-yellow-400', bg: 'bg-yellow-500/20' };
    }
  };
  
  // Get due date formatting based on payment status
  const getDueDateFormatting = () => {
    if (!tuitionStatus) return { color: 'text-gray-400' };
    
    if (tuitionStatus.isPaid) {
      return { color: 'text-green-400' };
    }
    
    const currentTimestamp = BigInt(Math.floor(Date.now() / 1000));
    
    if (currentTimestamp > tuitionStatus.dueDate) {
      // Overdue
      return { color: 'text-red-400' };
    } else if (currentTimestamp > tuitionStatus.dueDate - BigInt(86400 * 3)) {
      // Due within 3 days
      return { color: 'text-yellow-400' };
    } else {
      // Due in more than 3 days
      return { color: 'text-blue-400' };
    }
  };
  
  // Generate a descriptive message based on payment status
  const getStatusMessage = (): string => {
    if (!tuitionStatus) return 'No tuition data available.';
    
    if (tuitionStatus.isPaid) {
      return 'Tuition has been paid successfully. The student is in good academic standing.';
    }
    
    const daysInfo = getDaysRemainingOrOverdue();
    
    if (daysInfo.isOverdue) {
      return `Tuition payment is overdue by ${daysInfo.value} day${daysInfo.value !== 1 ? 's' : ''}. The student may face late fees and administrative holds.`;
    } else {
      return `Tuition payment is due in ${daysInfo.value} day${daysInfo.value !== 1 ? 's' : ''}. Please ensure timely payment to avoid late fees.`;
    }
  };
  
  // Helper function to truncate Ethereum addresses for display
  const truncateAddress = (address: string): string => {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };
  
  // Set up auto-refresh if interval is provided
  useEffect(() => {
    if (refreshInterval > 0 && school && student && currentTerm > 0) {
      const timer = setInterval(() => {
        refetchStatus();
      }, refreshInterval);
      
      return () => {
        clearInterval(timer);
      };
    }
  }, [refreshInterval, school, student, currentTerm, refetchStatus]);
  
  const statusStyle = tuitionStatus ? getPaymentStatusStyle() : { text: 'Unknown', color: 'text-gray-400', bg: 'bg-gray-500/20' };
  const dueDateStyle = getDueDateFormatting();
  const daysInfo = getDaysRemainingOrOverdue();
  
  return {
    tuitionStatus,
    schoolAddress: school,
    studentAddress: student,
    term: currentTerm,
    statusStyle,
    dueDateStyle,
    daysInfo,
    isPastDue: isPastDue(),
    isLoading: isLoadingStatus,
    error: statusError as Error | null,
    validationError,
    hasSearched,
    setSchoolAddress: handleSchoolAddressChange,
    setStudentAddress: handleStudentAddressChange,
    setTerm: handleTermChange,
    refresh: checkStatus,
    validateAddress,
    validateTerm,
    formatTimestamp,
    getStatusMessage,
    truncateAddress
  };
}

const TuitionStatusChecker = ({
  contract,
  schoolAddress = '',
  studentAddress = '',
  term = 1,
  refreshInterval = 0,
  onDataFetched
}: TuitionStatusCheckerProps) => {
  // Use the exported hook for handling tuition status data
  const {
    tuitionStatus,
    schoolAddress: school,
    studentAddress: student,
    term: currentTerm,
    statusStyle,
    dueDateStyle,
    daysInfo,
    isPastDue,
    isLoading: isLoadingStatus,
    error: statusError,
    validationError,
    hasSearched,
    setSchoolAddress,
    setStudentAddress,
    setTerm,
    refresh: checkStatus,
    formatTimestamp,
    getStatusMessage,
    truncateAddress
  } = useTuitionStatus(contract, schoolAddress, studentAddress, term, refreshInterval);
  
  // Callback when data is fetched - using useEffect to trigger callback
  useEffect(() => {
    if (tuitionStatus && onDataFetched) {
      onDataFetched(tuitionStatus.isPaid, tuitionStatus.dueDate);
    }
  }, [tuitionStatus, onDataFetched]);
  
  // Handle school address change
  const handleSchoolAddressChange = (value: string) => {
    setSchoolAddress(value);
  };
  
  // Handle student address change
  const handleStudentAddressChange = (value: string) => {
    setStudentAddress(value);
  };
  
  // Handle term change
  const handleTermChange = (value: string) => {
    const termNumber = parseInt(value);
    setTerm(isNaN(termNumber) ? 0 : termNumber);
  };
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    checkStatus();
  };
  
  // Render validation errors with proper type declaration
  const renderValidationErrors = (): React.ReactNode => {
    if (!validationError) return null;
    
    return (
      <div className="text-xs text-red-400 mt-1">{validationError}</div>
    );
  };
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-gray-800/50 border border-gray-700 rounded-lg p-4"
    >
      <h3 className="text-lg font-medium text-blue-400 mb-3">
        Tuition Status Checker
      </h3>
      
      {/* Query Form */}
      <form onSubmit={handleSubmit} className="space-y-4 mb-4">
        <div className="bg-gray-700/30 rounded-lg p-4 space-y-4">
          {/* School Address Input */}
          <div className="space-y-2">
            <label htmlFor="school-address" className="block text-sm font-medium text-gray-300">
              School Contract Address
            </label>
            <input
              id="school-address"
              type="text"
              value={school}
              onChange={(e) => handleSchoolAddressChange(e.target.value)}
              placeholder="0x..."
              className={`w-full px-3 py-2 bg-gray-700 border ${
                validationError && !school ? 'border-red-500' : 'border-gray-600'
              } rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
            />
            <p className="text-xs text-gray-400">Enter the school's contract address</p>
          </div>
          
          {/* Student Address Input */}
          <div className="space-y-2">
            <label htmlFor="student-address" className="block text-sm font-medium text-gray-300">
              Student Wallet Address
            </label>
            <input
              id="student-address"
              type="text"
              value={student}
              onChange={(e) => handleStudentAddressChange(e.target.value)}
              placeholder="0x..."
              className={`w-full px-3 py-2 bg-gray-700 border ${
                validationError && !student ? 'border-red-500' : 'border-gray-600'
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
            <p className="text-xs text-gray-400">Enter the term number to check tuition status for</p>
          </div>
          
          {/* Validation Errors */}
          {hasSearched && renderValidationErrors()}
          
          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoadingStatus}
            >
              {isLoadingStatus ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Loading...
                </span>
              ) : (
                'Check Status'
              )}
            </button>
          </div>
        </div>
      </form>
      
      {/* Results Display */}
      {statusError ? (
        <div className="bg-red-500/20 text-red-400 border border-red-500/30 rounded-md p-3 mb-4">
          <p className="text-sm">Error checking tuition status: {(statusError as Error).message || 'Unknown error'}</p>
          <button 
            onClick={() => checkStatus()} 
            className="text-xs mt-2 bg-gray-700 hover:bg-gray-600 text-gray-200 py-1 px-2 rounded"
          >
            Try Again
          </button>
        </div>
      ) : tuitionStatus ? (
        <div className="space-y-4">
          {/* Large Status Indicator */}
          <div className={`p-4 rounded-lg ${statusStyle.bg} border border-${statusStyle.color.replace('text-', '')}/30 flex flex-col items-center justify-center text-center`}>
            <div className={`w-16 h-16 rounded-full ${statusStyle.bg} border-2 border-${statusStyle.color.replace('text-', '')} flex items-center justify-center mb-2`}>
              {tuitionStatus.isPaid ? (
                <svg className={`w-8 h-8 ${statusStyle.color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : isPastDue ? (
                <svg className={`w-8 h-8 ${statusStyle.color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className={`w-8 h-8 ${statusStyle.color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>
            <h3 className={`text-2xl font-bold ${statusStyle.color}`}>
              {statusStyle.text}
            </h3>
            <p className="text-gray-300 mt-2 max-w-md">
              {getStatusMessage()}
            </p>
          </div>
          
          {/* Payment Timeline */}
          {!tuitionStatus.isPaid && (
            <div className="bg-gray-700/30 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-300 mb-3">Payment Timeline</h4>
              
              <div className="relative pt-2">
                {/* Timeline Track */}
                <div className="h-1 w-full bg-gray-700 rounded-full"></div>
                
                {/* Due Date Marker */}
                <div className="relative h-0">
                  <div 
                    className={`absolute top-0 w-4 h-4 rounded-full -mt-1.5 ${dueDateStyle.color.replace('text-', 'bg-')}`}
                    style={{ left: 'calc(50% - 8px)' }}
                  ></div>
                  <div
                    className={`absolute top-6 transform -translate-x-1/2 ${dueDateStyle.color}`}
                    style={{ left: '50%' }}
                  >
                    <span className="text-xs">Due Date</span>
                    <p className="text-sm font-medium whitespace-nowrap">{formatTimestamp(tuitionStatus.dueDate)}</p>
                  </div>
                </div>
                
                {/* Today Marker */}
                <div className="relative h-0">
                  <div 
                    className="absolute top-0 w-4 h-4 rounded-full border-2 border-blue-400 bg-gray-800 -mt-1.5"
                    style={{ 
                      left: `calc(${daysInfo.isOverdue ? '75' : '25'}% - 8px)` 
                    }}
                  ></div>
                  <div
                    className="absolute top-6 transform -translate-x-1/2 text-blue-400"
                    style={{ 
                      left: `${daysInfo.isOverdue ? '75' : '25'}%` 
                    }}
                  >
                    <span className="text-xs">Today</span>
                    <p className="text-sm font-medium">{new Date().toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
              
              <div className="mt-16 pt-4 border-t border-gray-600">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-xs text-gray-400">Status:</p>
                    <p className={`text-lg font-medium ${statusStyle.color}`}>{statusStyle.text}</p>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-xs text-gray-400">
                      {daysInfo.isOverdue ? 'Overdue by:' : 'Due in:'}
                    </p>
                    <p className={`text-lg font-medium ${daysInfo.isOverdue ? 'text-red-400' : 'text-blue-400'}`}>
                      {daysInfo.value} day{daysInfo.value !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Additional Details */}
          <div className="bg-gray-700/20 rounded-md p-3 text-xs">
            <h4 className="text-sm font-medium text-gray-300 mb-2">Status Details</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 gap-x-4">
              <div>
                <span className="text-gray-400">School: </span>
                <span className="text-gray-200 font-mono">{truncateAddress(school)}</span>
              </div>
              
              <div>
                <span className="text-gray-400">Student: </span>
                <span className="text-gray-200 font-mono">{truncateAddress(student)}</span>
              </div>
              
              <div>
                <span className="text-gray-400">Term: </span>
                <span className="text-gray-200">{currentTerm}</span>
              </div>
              
              <div>
                <span className="text-gray-400">Payment Status: </span>
                <span className={`${statusStyle.color}`}>{statusStyle.text}</span>
              </div>
              
              <div>
                <span className="text-gray-400">Due Date: </span>
                <span className={`${dueDateStyle.color}`}>{formatTimestamp(tuitionStatus.dueDate)}</span>
              </div>
              
              <div>
                <span className="text-gray-400">
                  {daysInfo.isOverdue ? 'Days Overdue:' : 'Days Remaining:'}
                </span>
                <span className={`${daysInfo.isOverdue ? 'text-red-400' : 'text-blue-400'}`}>
                  {daysInfo.value}
                </span>
              </div>
            </div>
            
            <div className="mt-3 pt-2 border-t border-gray-700">
              <button 
                onClick={() => checkStatus()} 
                className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 py-1 px-3 rounded flex items-center"
              >
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh Status
              </button>
            </div>
          </div>
        </div>
      ) : hasSearched && !isLoadingStatus ? (
        <div className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded-md p-3">
          <p className="text-sm">No tuition status data found for the specified school, student, and term.</p>
        </div>
      ) : null}
    </motion.div>
  );
};

export default TuitionStatusChecker;