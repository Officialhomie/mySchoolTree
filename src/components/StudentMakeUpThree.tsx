import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

// Import hooks and types from individual components
import { useTuitionFees, TuitionFeeInfo } from '../MSTReadfunction/TuitionSystemRead/getTuitionFees';
import { useTuitionStatus, TuitionStatusInfo} from '../MSTReadfunction/TuitionSystemRead/checkTuitionStatus';
import type { TuitionFeeData } from '../MSTReadfunction/TuitionSystemRead/getTuitionFees';
import type { TuitionStatusData } from '../MSTReadfunction/TuitionSystemRead/checkTuitionStatus';

/**
 * TuitionManager Component
 * 
 * This component combines the TuitionFeeViewer and TuitionStatusChecker functionality
 * into a single unified interface for managing and viewing tuition information.
 */
interface TuitionManagerProps {
  feeContract: any; // Contract for tuition fees
  statusContract: any; // Contract for tuition status
  schoolAddress?: string; // Optional pre-filled school address
  studentAddress?: string; // Optional pre-filled student address
  term?: number; // Optional pre-filled term
  refreshInterval?: number; // Optional interval to refresh data in milliseconds
  onFeesDataFetched?: (feeData: TuitionFeeData) => void; // Optional callback when fee data is fetched
  onStatusDataFetched?: (isPaid: boolean, dueDate: bigint) => void; // Optional callback when status data is fetched
  defaultMode?: 'fees' | 'status';
}

export type TuitionManagerMode = 'fees' | 'status';

// Export all hooks and types from individual components
export { 
  useTuitionFees, 
  useTuitionStatus
};
export type { TuitionFeeData, TuitionStatusData };

// Export combined hook for accessing both fee and status data
export interface CombinedTuitionInfo {
  fees: TuitionFeeInfo | null;
  status: TuitionStatusInfo | null;
  activeMode: TuitionManagerMode;
  setMode: (mode: TuitionManagerMode) => void;
  schoolAddress: string;
  studentAddress: string;
  term: number;
  setSchoolAddress: (address: string) => void;
  setStudentAddress: (address: string) => void;
  setTerm: (term: number) => void;
  refresh: () => void;
  synchronizeAddresses: boolean;
  setSynchronizeAddresses: (sync: boolean) => void;
}

export function useTuitionManager(
  feeContract: any,
  statusContract: any,
  initialSchoolAddress: string = '',
  initialStudentAddress: string = '',
  initialTerm: number = 1,
  refreshInterval: number = 0,
  initialMode: TuitionManagerMode = 'fees'
): CombinedTuitionInfo {
  // State for active mode
  const [activeMode, setActiveMode] = useState<TuitionManagerMode>(initialMode);
  const [synchronizeAddresses, setSynchronizeAddresses] = useState<boolean>(true);
  
  // Shared state for synchronized addresses
  const [sharedSchoolAddress, setSharedSchoolAddress] = useState<string>(initialSchoolAddress);
  const [sharedStudentAddress, setSharedStudentAddress] = useState<string>(initialStudentAddress);
  const [sharedTerm, setSharedTerm] = useState<number>(initialTerm);
  
  // Initialize hooks based on active mode and synchronization status
  const fees = synchronizeAddresses ? 
    useTuitionFees(
      feeContract,
      sharedSchoolAddress,
      sharedStudentAddress,
      sharedTerm,
      refreshInterval
    ) : null;
  
  const status = synchronizeAddresses ? 
    useTuitionStatus(
      statusContract,
      sharedSchoolAddress,
      sharedStudentAddress,
      sharedTerm,
      refreshInterval
    ) : null;
  
  // Use fees data when in fees mode and not synchronized
  const feesIndependent = !synchronizeAddresses && activeMode === 'fees' ? 
    useTuitionFees(
      feeContract,
      initialSchoolAddress,
      initialStudentAddress,
      initialTerm,
      refreshInterval
    ) : null;
  
  // Use status data when in status mode and not synchronized
  const statusIndependent = !synchronizeAddresses && activeMode === 'status' ? 
    useTuitionStatus(
      statusContract,
      initialSchoolAddress,
      initialStudentAddress,
      initialTerm,
      refreshInterval
    ) : null;
  
  // Determine which data sources to use based on synchronization and mode
  const effectiveFees = synchronizeAddresses ? fees : feesIndependent;
  const effectiveStatus = synchronizeAddresses ? status : statusIndependent;
  
  // Update shared addresses
  const handleSetSharedSchoolAddress = (address: string) => {
    setSharedSchoolAddress(address);
  };
  
  const handleSetSharedStudentAddress = (address: string) => {
    setSharedStudentAddress(address);
  };
  
  const handleSetSharedTerm = (term: number) => {
    setSharedTerm(term);
  };
  
  // Refresh data for the active mode
  const refreshActiveMode = () => {
    if (activeMode === 'fees' && effectiveFees) {
      effectiveFees.refresh();
    } else if (activeMode === 'status' && effectiveStatus) {
      effectiveStatus.refresh();
    }
  };
  
  return {
    fees: effectiveFees,
    status: effectiveStatus,
    activeMode,
    setMode: setActiveMode,
    schoolAddress: sharedSchoolAddress,
    studentAddress: sharedStudentAddress,
    term: sharedTerm,
    setSchoolAddress: handleSetSharedSchoolAddress,
    setStudentAddress: handleSetSharedStudentAddress,
    setTerm: handleSetSharedTerm,
    refresh: refreshActiveMode,
    synchronizeAddresses,
    setSynchronizeAddresses
  };
}

const StudentMakeUpThree = ({
  feeContract,
  statusContract,
  schoolAddress = '',
  studentAddress = '',
  term = 1,
  refreshInterval = 0,
  onFeesDataFetched,
  onStatusDataFetched,
  defaultMode = 'fees'
}: TuitionManagerProps) => {
  // Use the combined hook for managing tuition data
  const {
    fees,
    status,
    activeMode,
    setMode,
    schoolAddress: sharedSchoolAddress,
    studentAddress: sharedStudentAddress,
    term: sharedTerm,
    setSchoolAddress,
    setStudentAddress,
    setTerm,
    synchronizeAddresses,
    setSynchronizeAddresses
  } = useTuitionManager(
    feeContract,
    statusContract,
    schoolAddress,
    studentAddress,
    term,
    refreshInterval,
    defaultMode
  );
  
  // Callbacks for data fetching
  useEffect(() => {
    if (fees?.feeData && onFeesDataFetched) {
      onFeesDataFetched(fees.feeData);
    }
  }, [fees?.feeData, onFeesDataFetched]);
  
  useEffect(() => {
    if (status?.tuitionStatus && onStatusDataFetched) {
      onStatusDataFetched(status.tuitionStatus.isPaid, status.tuitionStatus.dueDate);
    }
  }, [status?.tuitionStatus, onStatusDataFetched]);
  
  // Handle form field changes
  const handleSchoolAddressChange = (value: string) => {
    setSchoolAddress(value);
  };
  
  const handleStudentAddressChange = (value: string) => {
    setStudentAddress(value);
  };
  
  const handleTermChange = (value: string) => {
    const termNumber = parseInt(value);
    setTerm(isNaN(termNumber) ? 0 : termNumber);
  };
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (activeMode === 'fees' && fees) {
      fees.refresh();
    } else if (activeMode === 'status' && status) {
      status.refresh();
    }
  };
  
  // Render validation errors
  const renderValidationErrors = (): React.ReactNode => {
    const activeInfo = activeMode === 'fees' ? fees : status;
    const validationError = activeInfo?.validationError;
    
    if (!validationError) return null;
    
    return (
      <div className="text-xs text-red-400 mt-1">{validationError}</div>
    );
  };
  
  // Get the active hook's loading state
  const isLoading = activeMode === 'fees' ? fees?.isLoading : status?.isLoading;
  
  // Get the active hook's has searched state
  const hasSearched = activeMode === 'fees' ? fees?.hasSearched : status?.hasSearched;
  
  // Get the active hook's error
  const activeError = activeMode === 'fees' ? fees?.error : status?.error;
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-gray-800/50 border border-gray-700 rounded-lg p-4"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-blue-400">
          {activeMode === 'fees' ? 'Tuition Fee Manager' : 'Tuition Status Manager'}
        </h3>
        
        {/* Toggle for synchronizing addresses */}
        <div className="flex items-center">
          <label className="inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={synchronizeAddresses}
              onChange={() => setSynchronizeAddresses(!synchronizeAddresses)}
            />
            <div className="relative w-10 h-5 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-300 after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
            <span className="ml-3 text-sm text-gray-300">Common Inputs</span>
          </label>
        </div>
      </div>
      
      {/* Mode Selection Tabs */}
      <div className="flex space-x-2 mb-4">
        <button
          type="button"
          onClick={() => setMode('fees')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeMode === 'fees' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Fee Details
        </button>
        <button
          type="button"
          onClick={() => setMode('status')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeMode === 'status' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Payment Status
        </button>
      </div>
      
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
              value={sharedSchoolAddress}
              onChange={(e) => handleSchoolAddressChange(e.target.value)}
              placeholder="0x..."
              className={`w-full px-3 py-2 bg-gray-700 border ${
                fees?.validationError || status?.validationError ? 'border-red-500' : 'border-gray-600'
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
              value={sharedStudentAddress}
              onChange={(e) => handleStudentAddressChange(e.target.value)}
              placeholder="0x..."
              className={`w-full px-3 py-2 bg-gray-700 border ${
                fees?.validationError || status?.validationError ? 'border-red-500' : 'border-gray-600'
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
              value={sharedTerm || ''}
              onChange={(e) => handleTermChange(e.target.value)}
              placeholder="Enter term number"
              min="1"
              className={`w-full px-3 py-2 bg-gray-700 border ${
                fees?.validationError || status?.validationError ? 'border-red-500' : 'border-gray-600'
              } rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
            />
            <p className="text-xs text-gray-400">
              Enter the term number to check {activeMode === 'fees' ? 'fees' : 'status'} for
            </p>
          </div>
          
          {/* Validation Errors */}
          {hasSearched && renderValidationErrors()}
          
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
                activeMode === 'fees' ? 'View Tuition Fees' : 'Check Status'
              )}
            </button>
          </div>
        </div>
      </form>
      
      {/* Results Display */}
      {activeError ? (
        <div className="bg-red-500/20 text-red-400 border border-red-500/30 rounded-md p-3 mb-4">
          <p className="text-sm">
            Error fetching {activeMode === 'fees' ? 'fee' : 'status'} data: 
            {(activeError as Error).message || 'Unknown error'}
          </p>
          <button 
            onClick={() => activeMode === 'fees' ? fees?.refresh() : status?.refresh()} 
            className="text-xs mt-2 bg-gray-700 hover:bg-gray-600 text-gray-200 py-1 px-2 rounded"
          >
            Try Again
          </button>
        </div>
      ) : (
        <>
          {/* Fee Details Display */}
          {activeMode === 'fees' && fees?.feeData && (
            <div className="space-y-4">
              {/* Status Badge */}
              <div className={`inline-flex items-center px-3 py-1 rounded-full ${fees.statusStyle.bg} border border-${fees.statusStyle.color.replace('text-', '')}/30`}>
                <div className={`w-2 h-2 rounded-full ${fees.statusStyle.color.replace('text-', 'bg-')} mr-2`}></div>
                <span className={`text-sm font-medium ${fees.statusStyle.color}`}>
                  {fees.statusStyle.text}
                </span>
              </div>
              
              {/* Main Info Card */}
              <div className="bg-gray-700/30 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Fee Amount */}
                  <div className="space-y-1">
                    <p className="text-xs text-gray-400">Base Fee Amount:</p>
                    <div className="flex items-baseline">
                      <p className="text-3xl font-bold text-white">
                        {fees.formatWeiToEther(fees.feeData.amount)}
                      </p>
                      <p className="text-sm text-gray-400 ml-2">ETH</p>
                    </div>
                    
                    {/* Program ID */}
                    <p className="text-xs text-gray-400 mt-2">
                      Program ID: <span className="text-gray-300">{fees.feeData.programId.toString()}</span>
                    </p>
                    
                    {/* Late Fee (if applicable) */}
                    {fees.feeData.lateFee > BigInt(0) && (
                      <div className="mt-2 bg-gray-700/40 rounded-md p-2">
                        <p className="text-xs text-gray-400">Potential Late Fee:</p>
                        <div className="flex items-baseline">
                          <p className={`text-lg font-medium ${fees.isPastDue ? 'text-red-400' : 'text-yellow-400'}`}>
                            {fees.formatWeiToEther(fees.feeData.lateFee)}
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
                      <p className={`text-2xl font-bold ${fees.dueDateStyle.color}`}>
                        {fees.formatTimestamp(fees.feeData.dueDate)}
                      </p>
                    </div>
                    
                    {/* Days Remaining/Overdue */}
                    {!fees.feeData.isPaid && (
                      <div className="mt-2">
                        <p className={`text-sm font-medium ${fees.daysInfo.isOverdue ? 'text-red-400' : 'text-blue-400'}`}>
                          {fees.daysInfo.isOverdue 
                            ? `${fees.daysInfo.value} days overdue` 
                            : `${fees.daysInfo.value} days remaining`}
                        </p>
                        
                        {/* Due Date Progress Bar */}
                        <div className="mt-2 h-2 bg-gray-700 rounded-full overflow-hidden">
                          {fees.daysInfo.isOverdue ? (
                            // Overdue - red
                            <div 
                              className="h-full bg-red-500"
                              style={{ width: `${Math.min(fees.daysInfo.value * 10, 100)}%` }}
                            ></div>
                          ) : (
                            // Time remaining - gradient from green to yellow to red
                            <div 
                              className={`h-full ${
                                fees.daysInfo.value > 7 
                                  ? 'bg-green-500' 
                                  : fees.daysInfo.value > 3 
                                    ? 'bg-yellow-500' 
                                    : 'bg-orange-500'
                              }`}
                              style={{ width: `${100 - Math.min(fees.daysInfo.value * 10, 100)}%` }}
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
                          <p className={`text-3xl font-bold ${fees.feeData.isPaid ? 'text-green-400' : 'text-white'}`}>
                            {fees.formatWeiToEther(fees.totalAmount)}
                          </p>
                          <p className="text-sm text-gray-400 ml-2">ETH</p>
                        </div>
                        
                        {fees.isPastDue && (
                          <p className="text-xs text-red-400 mt-1">
                            Includes late fee of {fees.formatWeiToEther(fees.feeData.lateFee)} ETH
                          </p>
                        )}
                      </div>
                      
                      <div className={`mt-3 md:mt-0 px-4 py-2 rounded-md ${
                        fees.feeData.isPaid
                          ? 'bg-green-500/20 border border-green-500/30'
                          : fees.isPastDue
                            ? 'bg-red-500/20 border border-red-500/30'
                            : 'bg-yellow-500/20 border border-yellow-500/30'
                      }`}>
                        <p className={`text-lg font-medium ${
                          fees.feeData.isPaid
                            ? 'text-green-400'
                            : fees.isPastDue
                              ? 'text-red-400'
                              : 'text-yellow-400'
                        }`}>
                          {fees.feeData.isPaid
                            ? 'PAID'
                            : fees.isPastDue
                              ? 'PAYMENT OVERDUE'
                              : 'PAYMENT PENDING'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Status Details Display */}
          {activeMode === 'status' && status?.tuitionStatus && (
            <div className="space-y-4">
              {/* Large Status Indicator */}
              <div className={`p-4 rounded-lg ${status.statusStyle.bg} border border-${status.statusStyle.color.replace('text-', '')}/30 flex flex-col items-center justify-center text-center`}>
                <div className={`w-16 h-16 rounded-full ${status.statusStyle.bg} border-2 border-${status.statusStyle.color.replace('text-', '')} flex items-center justify-center mb-2`}>
                  {status.tuitionStatus.isPaid ? (
                    <svg className={`w-8 h-8 ${status.statusStyle.color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : status.isPastDue ? (
                    <svg className={`w-8 h-8 ${status.statusStyle.color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ) : (
                    <svg className={`w-8 h-8 ${status.statusStyle.color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </div>
                <h3 className={`text-2xl font-bold ${status.statusStyle.color}`}>
                  {status.statusStyle.text}
                </h3>
                <p className="text-gray-300 mt-2 max-w-md">
                  {status.getStatusMessage()}
                </p>
              </div>
              
              {/* Payment Timeline */}
              {!status.tuitionStatus.isPaid && (
                <div className="bg-gray-700/30 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-300 mb-3">Payment Timeline</h4>
                  
                  <div className="relative pt-2">
                    {/* Timeline Track */}
                    <div className="h-1 w-full bg-gray-700 rounded-full"></div>
                    
                    {/* Due Date Marker */}
                    <div className="relative h-0">
                      <div 
                        className={`absolute top-0 w-4 h-4 rounded-full -mt-1.5 ${status.dueDateStyle.color.replace('text-', 'bg-')}`}
                        style={{ left: 'calc(50% - 8px)' }}
                      ></div>
                      <div
                        className={`absolute top-6 transform -translate-x-1/2 ${status.dueDateStyle.color}`}
                        style={{ left: '50%' }}
                      >
                        <span className="text-xs">Due Date</span>
                        <p className="text-sm font-medium whitespace-nowrap">
                          {status.formatTimestamp(status.tuitionStatus.dueDate)}
                        </p>
                      </div>
                    </div>
                    
                    {/* Today Marker */}
                    <div className="relative h-0">
                      <div 
                        className="absolute top-0 w-4 h-4 rounded-full border-2 border-blue-400 bg-gray-800 -mt-1.5"
                        style={{ 
                          left: `calc(${status.daysInfo.isOverdue ? '75' : '25'}% - 8px)` 
                        }}
                      ></div>
                      <div
                        className="absolute top-6 transform -translate-x-1/2 text-blue-400"
                        style={{ 
                          left: `${status.daysInfo.isOverdue ? '75' : '25'}%` 
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
                        <p className={`text-lg font-medium ${status.statusStyle.color}`}>{status.statusStyle.text}</p>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-xs text-gray-400">
                          {status.daysInfo.isOverdue ? 'Overdue by:' : 'Due in:'}
                        </p>
                        <p className={`text-lg font-medium ${status.daysInfo.isOverdue ? 'text-red-400' : 'text-blue-400'}`}>
                          {status.daysInfo.value} day{status.daysInfo.value !== 1 ? 's' : ''}
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
                    <span className="text-gray-200 font-mono">{status.truncateAddress(status.schoolAddress)}</span>
                  </div>
                  
                  <div>
                    <span className="text-gray-400">Student: </span>
                    <span className="text-gray-200 font-mono">{status.truncateAddress(status.studentAddress)}</span>
                  </div>
                  
                  <div>
                    <span className="text-gray-400">Term: </span>
                    <span className="text-gray-200">{status.term}</span>
                  </div>
                  
                  <div>
                    <span className="text-gray-400">Payment Status: </span>
                    <span className={`${status.statusStyle.color}`}>{status.statusStyle.text}</span>
                  </div>
                  
                  <div>
                    <span className="text-gray-400">Due Date: </span>
                    <span className={`${status.dueDateStyle.color}`}>
                      {status.formatTimestamp(status.tuitionStatus.dueDate)}
                    </span>
                  </div>
                  
                  <div>
                    <span className="text-gray-400">
                      {status.daysInfo.isOverdue ? 'Days Overdue:' : 'Days Remaining:'}
                    </span>
                    <span className={`${status.daysInfo.isOverdue ? 'text-red-400' : 'text-blue-400'}`}>
                      {status.daysInfo.value}
                    </span>
                  </div>
                </div>
                
                <div className="mt-3 pt-2 border-t border-gray-700">
                  <button 
                    onClick={() => status.refresh()} 
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
          )}
          
          {/* Empty State */}
          {hasSearched && !isLoading && (
            activeMode === 'fees' ? !fees?.feeData : !status?.tuitionStatus
          ) && (
            <div className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded-md p-3">
              <p className="text-sm">
                No {activeMode === 'fees' ? 'tuition fee' : 'tuition status'} data found for the specified school, student, and term.
              </p>
            </div>
          )}
        </>
      )}
      
      {/* Component Usage Information */}
      <div className="mt-6 pt-4 border-t border-gray-700 text-xs text-gray-400">
        <p>
          This component combines tuition fee and status information. Toggle between modes to see different aspects of the student's tuition.
        </p>
        <p className="mt-2">
          <span className="font-medium text-blue-400">Common Inputs:</span> When enabled, the same school, student, and term values are used for both fee and status information.
        </p>
      </div>
    </motion.div>
  );
};






export default StudentMakeUpThree;