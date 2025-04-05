import { useState, useEffect } from 'react';
import { useReadContract } from 'wagmi';
import { motion } from 'framer-motion';

/**
 * TuitionFeeViewer Component
 * 
 * This component displays tuition fee information for a student in a specific school and term.
 * It uses the tuitionFees contract function to fetch data about payment status and details.
 * 
 * The component now exposes a useTuitionFees hook for external data access.
 */
interface TuitionFeeViewerProps {
  contract: any;
  schoolAddress?: string; // Optional pre-filled school address
  studentAddress?: string; // Optional pre-filled student address
  term?: number; // Optional pre-filled term
  refreshInterval?: number; // Optional interval to refresh data in milliseconds
  onDataFetched?: (feeData: TuitionFeeData) => void; // Optional callback when data is fetched
}

export interface TuitionFeeData {
  amount: bigint;
  dueDate: bigint;
  isPaid: boolean;
  programId: bigint;
  lateFee: bigint;
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

export interface TuitionFeeInfo {
  feeData: TuitionFeeData | undefined;
  schoolAddress: string;
  studentAddress: string;
  term: number;
  totalAmount: bigint;
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
  formatWeiToEther: (wei: bigint, decimals?: number) => string;
  formatTimestamp: (timestamp: bigint) => string;
  truncateAddress: (address: string) => string;
}

/**
 * Hook to access tuition fee data outside the component
 */
export function useTuitionFees(
  contract: any,
  initialSchoolAddress: string = '',
  initialStudentAddress: string = '',
  initialTerm: number = 1,
  refreshInterval: number = 0
): TuitionFeeInfo {
  // Form state
  const [school, setSchool] = useState<string>(initialSchoolAddress);
  const [student, setStudent] = useState<string>(initialStudentAddress);
  const [currentTerm, setCurrentTerm] = useState<number>(initialTerm);
  const [validationError, setValidationError] = useState<string>('');
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  
  // Fetch fee data from contract
  const {
    data: feeData,
    error: feeError,
    isLoading: isLoadingFees,
    refetch: refetchFees
  } = useReadContract({
    ...contract,
    functionName: 'tuitionFees',
    args: school && student ? [
      school as `0x${string}`, 
      student as `0x${string}`, 
      BigInt(currentTerm)
    ] : undefined,
    query: {
      enabled: !!school && !!student && currentTerm > 0
    }
  });
  
  // Extract fee values with proper typing
  const formattedFeeData: TuitionFeeData | undefined = feeData
    ? {
        amount: (feeData as any).amount,
        dueDate: (feeData as any).dueDate,
        isPaid: (feeData as any).isPaid,
        programId: (feeData as any).programId,
        lateFee: (feeData as any).lateFee
      }
    : undefined;
  
  // Calculate total amount (base fee + late fee if applicable)
  const calculateTotalAmount = (): bigint => {
    if (!formattedFeeData) return BigInt(0);
    
    const currentTimestamp = BigInt(Math.floor(Date.now() / 1000));
    const isLate = !formattedFeeData.isPaid && currentTimestamp > formattedFeeData.dueDate;
    
    return formattedFeeData.amount + (isLate ? formattedFeeData.lateFee : BigInt(0));
  };
  
  // Check if the due date is in the past
  const isPastDue = (): boolean => {
    if (!formattedFeeData) return false;
    
    const currentTimestamp = BigInt(Math.floor(Date.now() / 1000));
    return !formattedFeeData.isPaid && currentTimestamp > formattedFeeData.dueDate;
  };
  
  // Calculate days remaining or days overdue
  const getDaysRemainingOrOverdue = (): DaysInfo => {
    if (!formattedFeeData) return { value: 0, isOverdue: false };
    
    const currentTimestamp = BigInt(Math.floor(Date.now() / 1000));
    const dayInSeconds = BigInt(86400); // 24 hours * 60 minutes * 60 seconds
    
    if (currentTimestamp > formattedFeeData.dueDate) {
      // Overdue
      const daysLate = Number((currentTimestamp - formattedFeeData.dueDate) / dayInSeconds);
      return { value: daysLate, isOverdue: true };
    } else {
      // Still has time
      const daysRemaining = Number((formattedFeeData.dueDate - currentTimestamp) / dayInSeconds);
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
  
  // Handle checking fees
  const checkFees = () => {
    // Reset validation error first
    setValidationError('');
    
    // Validate all fields
    const isSchoolValid = validateAddress(school, 'School');
    const isStudentValid = validateAddress(student, 'Student');
    const isTermValid = validateTerm(currentTerm);
    
    if (isSchoolValid && isStudentValid && isTermValid) {
      setHasSearched(true);
      refetchFees();
    }
  };
  
  // Format Wei to Ether with the specified number of decimal places
  const formatWeiToEther = (wei: bigint, decimals: number = 6): string => {
    const etherValue = Number(wei) / 1e18;
    return etherValue.toFixed(decimals);
  };
  
  // Format timestamp to readable date and time
  const formatTimestamp = (timestamp: bigint): string => {
    const date = new Date(Number(timestamp) * 1000);
    return date.toLocaleString();
  };
  
  // Get due date formatting based on payment status
  const getDueDateFormatting = () => {
    if (!formattedFeeData) return { color: 'text-gray-400' };
    
    if (formattedFeeData.isPaid) {
      return { color: 'text-green-400' };
    }
    
    const currentTimestamp = BigInt(Math.floor(Date.now() / 1000));
    
    if (currentTimestamp > formattedFeeData.dueDate) {
      // Overdue
      return { color: 'text-red-400' };
    } else if (currentTimestamp > formattedFeeData.dueDate - BigInt(86400 * 3)) {
      // Due within 3 days
      return { color: 'text-yellow-400' };
    } else {
      // Due in more than 3 days
      return { color: 'text-blue-400' };
    }
  };
  
  // Get payment status styling
  const getPaymentStatusStyle = (): StatusStyle => {
    if (!formattedFeeData) return { text: 'Unknown', color: 'text-gray-400', bg: 'bg-gray-500/20' };
    
    if (formattedFeeData.isPaid) {
      return { text: 'Paid', color: 'text-green-400', bg: 'bg-green-500/20' };
    }
    
    const isPastDueDate = isPastDue();
    
    if (isPastDueDate) {
      return { text: 'Overdue', color: 'text-red-400', bg: 'bg-red-500/20' };
    } else {
      return { text: 'Pending', color: 'text-yellow-400', bg: 'bg-yellow-500/20' };
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
        refetchFees();
      }, refreshInterval);
      
      return () => {
        clearInterval(timer);
      };
    }
  }, [refreshInterval, school, student, currentTerm, refetchFees]);
  
  const statusStyle = formattedFeeData ? getPaymentStatusStyle() : { text: 'Unknown', color: 'text-gray-400', bg: 'bg-gray-500/20' };
  const dueDateStyle = getDueDateFormatting();
  const daysInfo = getDaysRemainingOrOverdue();
  const totalAmount = calculateTotalAmount();
  
  return {
    feeData: formattedFeeData,
    schoolAddress: school,
    studentAddress: student,
    term: currentTerm,
    totalAmount,
    statusStyle,
    dueDateStyle,
    daysInfo,
    isPastDue: isPastDue(),
    isLoading: isLoadingFees,
    error: feeError as Error | null,
    validationError,
    hasSearched,
    setSchoolAddress: handleSchoolAddressChange,
    setStudentAddress: handleStudentAddressChange,
    setTerm: handleTermChange,
    refresh: checkFees,
    validateAddress,
    validateTerm,
    formatWeiToEther,
    formatTimestamp,
    truncateAddress
  };
}

const TuitionFeeViewer = ({
  contract,
  schoolAddress = '',
  studentAddress = '',
  term = 1,
  refreshInterval = 0,
  onDataFetched
}: TuitionFeeViewerProps) => {
  // Use the exported hook for handling tuition fee data
  const {
    feeData: formattedFeeData,
    schoolAddress: school,
    studentAddress: student,
    term: currentTerm,
    totalAmount,
    statusStyle,
    dueDateStyle,
    daysInfo,
    isPastDue,
    isLoading: isLoadingFees,
    error: feeError,
    validationError,
    hasSearched,
    setSchoolAddress,
    setStudentAddress,
    setTerm,
    refresh: checkFees,
    formatWeiToEther,
    formatTimestamp,
    truncateAddress
  } = useTuitionFees(contract, schoolAddress, studentAddress, term, refreshInterval);
  
  // Callback when data is fetched - using useEffect to trigger callback
  useEffect(() => {
    if (formattedFeeData && onDataFetched) {
      onDataFetched(formattedFeeData);
    }
  }, [formattedFeeData, onDataFetched]);
  
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
    checkFees();
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
        Tuition Fee Viewer
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
            <p className="text-xs text-gray-400">Enter the term number to check fees for</p>
          </div>
          
          {/* Validation Errors */}
          {hasSearched && renderValidationErrors()}
          
          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoadingFees}
            >
              {isLoadingFees ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Loading...
                </span>
              ) : (
                'View Tuition Fees'
              )}
            </button>
          </div>
        </div>
      </form>
      
      {/* Results Display */}
      {feeError ? (
        <div className="bg-red-500/20 text-red-400 border border-red-500/30 rounded-md p-3 mb-4">
          <p className="text-sm">Error fetching fee data: {(feeError as Error).message || 'Unknown error'}</p>
          <button 
            onClick={() => checkFees()} 
            className="text-xs mt-2 bg-gray-700 hover:bg-gray-600 text-gray-200 py-1 px-2 rounded"
          >
            Try Again
          </button>
        </div>
      ) : formattedFeeData ? (
        <div className="space-y-4">
          {/* Status Badge */}
          <div className={`inline-flex items-center px-3 py-1 rounded-full ${statusStyle.bg} border border-${statusStyle.color.replace('text-', '')}/30`}>
            <div className={`w-2 h-2 rounded-full ${statusStyle.color.replace('text-', 'bg-')} mr-2`}></div>
            <span className={`text-sm font-medium ${statusStyle.color}`}>
              {statusStyle.text}
            </span>
          </div>
          
          {/* Main Info Card */}
          <div className="bg-gray-700/30 rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Fee Amount */}
              <div className="space-y-1">
                <p className="text-xs text-gray-400">Base Fee Amount:</p>
                <div className="flex items-baseline">
                  <p className="text-3xl font-bold text-white">{formatWeiToEther(formattedFeeData.amount)}</p>
                  <p className="text-sm text-gray-400 ml-2">ETH</p>
                </div>
                
                {/* Program ID */}
                <p className="text-xs text-gray-400 mt-2">
                  Program ID: <span className="text-gray-300">{formattedFeeData.programId.toString()}</span>
                </p>
                
                {/* Late Fee (if applicable) */}
                {formattedFeeData.lateFee > BigInt(0) && (
                  <div className="mt-2 bg-gray-700/40 rounded-md p-2">
                    <p className="text-xs text-gray-400">Potential Late Fee:</p>
                    <div className="flex items-baseline">
                      <p className={`text-lg font-medium ${isPastDue ? 'text-red-400' : 'text-yellow-400'}`}>
                        {formatWeiToEther(formattedFeeData.lateFee)}
                      </p>
                      <p className="text-xs text-gray-400 ml-1">ETH</p>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Due Date */}
              <div className="space-y-1">
                <p className="text-xs text-gray-400">Due Date:</p>
                <div className="flex items-baseline">
                  <p className={`text-2xl font-bold ${dueDateStyle.color}`}>
                    {formatTimestamp(formattedFeeData.dueDate)}
                  </p>
                </div>
                
                {/* Days Remaining/Overdue */}
                {!formattedFeeData.isPaid && (
                  <div className="mt-2">
                    <p className={`text-sm font-medium ${daysInfo.isOverdue ? 'text-red-400' : 'text-blue-400'}`}>
                      {daysInfo.isOverdue 
                        ? `${daysInfo.value} days overdue` 
                        : `${daysInfo.value} days remaining`}
                    </p>
                    
                    {/* Due Date Progress Bar */}
                    <div className="mt-2 h-2 bg-gray-700 rounded-full overflow-hidden">
                      {daysInfo.isOverdue ? (
                        // Overdue - red
                        <div 
                          className="h-full bg-red-500"
                          style={{ width: `${Math.min(daysInfo.value * 10, 100)}%` }}
                        ></div>
                      ) : (
                        // Time remaining - gradient from green to yellow to red
                        <div 
                          className={`h-full ${
                            daysInfo.value > 7 
                              ? 'bg-green-500' 
                              : daysInfo.value > 3 
                                ? 'bg-yellow-500' 
                                : 'bg-orange-500'
                          }`}
                          style={{ width: `${100 - Math.min(daysInfo.value * 10, 100)}%` }}
                        ></div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Total Amount Due */}
              <div className="bg-gray-700/40 p-3 rounded-md md:col-span-2">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-xs text-gray-400">Total Amount Due:</p>
                    <div className="flex items-baseline">
                      <p className={`text-3xl font-bold ${formattedFeeData.isPaid ? 'text-green-400' : 'text-white'}`}>
                        {formatWeiToEther(totalAmount)}
                      </p>
                      <p className="text-sm text-gray-400 ml-2">ETH</p>
                    </div>
                    
                    {isPastDue && (
                      <p className="text-xs text-red-400 mt-1">
                        Includes late fee of {formatWeiToEther(formattedFeeData.lateFee)} ETH
                      </p>
                    )}
                  </div>
                  
                  <div className={`mt-3 md:mt-0 px-4 py-2 rounded-md ${
                    formattedFeeData.isPaid
                      ? 'bg-green-500/20 border border-green-500/30'
                      : isPastDue
                        ? 'bg-red-500/20 border border-red-500/30'
                        : 'bg-yellow-500/20 border border-yellow-500/30'
                  }`}>
                    <p className={`text-lg font-medium ${
                      formattedFeeData.isPaid
                        ? 'text-green-400'
                        : isPastDue
                          ? 'text-red-400'
                          : 'text-yellow-400'
                    }`}>
                      {formattedFeeData.isPaid
                        ? 'PAID'
                        : isPastDue
                          ? 'PAYMENT OVERDUE'
                          : 'PAYMENT PENDING'}
                    </p>
                  </div>
                </div>
                
                {formattedFeeData.isPaid ? (
                  <div className="mt-3 text-sm text-green-400">
                    <svg className="inline-block w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    This tuition fee has been fully paid
                  </div>
                ) : (
                  <div className="mt-3 pt-2 border-t border-gray-600">
                    <div className="flex justify-between items-center">
                      <p className="text-xs text-gray-400">Payment not yet processed on blockchain</p>
                      
                      {/* Note: In a real app, you would add payment functionality here */}
                      <button
                        disabled
                        className="px-3 py-1 bg-blue-600/50 text-white text-sm rounded cursor-not-allowed opacity-50"
                      >
                        Pay Now (Demo)
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Additional Details */}
          <div className="bg-gray-700/20 rounded-md p-3 text-xs">
            <h4 className="text-sm font-medium text-gray-300 mb-2">Fee Details</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-y-2 gap-x-4">
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
                <span className="text-gray-400">Program ID: </span>
                <span className="text-gray-200">{formattedFeeData.programId.toString()}</span>
              </div>
              
              <div>
                <span className="text-gray-400">Status: </span>
                <span className={`${statusStyle.color}`}>{statusStyle.text}</span>
              </div>
              
              <div>
                <span className="text-gray-400">Due Date: </span>
                <span className={`${dueDateStyle.color}`}>{formatTimestamp(formattedFeeData.dueDate)}</span>
              </div>
              
              <div>
                <span className="text-gray-400">Base Fee: </span>
                <span className="text-gray-200">{formatWeiToEther(formattedFeeData.amount)} ETH</span>
              </div>
              
              <div>
                <span className="text-gray-400">Late Fee: </span>
                <span className="text-gray-200">{formatWeiToEther(formattedFeeData.lateFee)} ETH</span>
              </div>
              
              <div>
                <span className="text-gray-400">Total Due: </span>
                <span className={`${formattedFeeData.isPaid ? 'text-green-400' : 'text-gray-200'}`}>
                  {formatWeiToEther(totalAmount)} ETH
                </span>
              </div>
            </div>
            
            <div className="mt-3 pt-2 border-t border-gray-700">
              <button 
                onClick={() => checkFees()} 
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
      ) : hasSearched && !isLoadingFees ? (
        <div className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded-md p-3">
          <p className="text-sm">No tuition fee data found for the specified school, student, and term.</p>
        </div>
      ) : null}
    </motion.div>
  );
};

export default TuitionFeeViewer;