import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { motion } from 'framer-motion';

// Import all the hooks and types from the individual components
import { useAttendanceData, AttendanceData } from '../MSTReadfunction/StudentProfileRead/getStudentAttendance';
import { useStudentReputation, ReputationData, ReputationInfo, ReputationLevel, NextLevelInfo, DominantCategory, REPUTATION_LEVELS, calculatePercentage } from '../MSTReadfunction/StudentProfileRead/getStudentReputation';
import { useStudentSchoolVerification, VerificationStatus as SchoolVerificationStatus } from '../MSTReadfunction/StudentProfileRead/isStudentOfSchool';
import { useTermCompletionVerification, VerificationStatus as TermCompletionStatus } from '../MSTReadfunction/StudentProfileRead/checkCompletedTerms';

/**
 * StudentVerificationHub Component
 * 
 * This component provides a unified interface for accessing all student verification
 * functionality including attendance, reputation, school verification, and term completion.
 * It exports all four hooks from the individual components.
 */

export interface StudentVerificationHubProps {
  studentProfileContract?: any;
  studentContractView?: any;
  reputationContract?: any;
  schoolVerificationContract?: any;
  termCompletionContract?: any;
  studentAddress?: string;
  schoolAddress?: string;
  termNumber?: number;
  refreshInterval?: number;
  defaultMode?: 'attendance' | 'reputation' | 'school' | 'termCompletion';
  onDataFetched?: (data: any) => void;
}

export type VerificationMode = 'attendance' | 'reputation' | 'school' | 'termCompletion';

// Export all hooks from individual components for external use
export { 
  useAttendanceData, 
  useStudentReputation, 
  useStudentSchoolVerification, 
  useTermCompletionVerification,
  REPUTATION_LEVELS,
  calculatePercentage
};

// Export all types from individual components for external use
export type {
  AttendanceData,
  ReputationData,
  ReputationInfo,
  ReputationLevel,
  NextLevelInfo,
  DominantCategory,
  SchoolVerificationStatus as VerificationStatus,
  TermCompletionStatus
};

const StudentVerificationHub = ({
    studentProfileContract, // Changed from attendanceContract to studentProfileContract
    studentContractView,
    reputationContract,
    schoolVerificationContract,
    termCompletionContract,
    studentAddress = '',
    schoolAddress = '',
    termNumber = 1,
    refreshInterval = 0,
    defaultMode = 'attendance',
  onDataFetched
}: StudentVerificationHubProps) => {
  // State for active mode
  const [activeMode, setActiveMode] = useState<VerificationMode>(defaultMode);
  const [isAddressSynced, setIsAddressSynced] = useState<boolean>(true);
  const [sharedStudentAddress, setSharedStudentAddress] = useState<string>(studentAddress);
  
  // Get connected wallet address for default values
  const { address: connectedAddress } = useAccount();
  
  // Effect to update shared address when prop changes
  useEffect(() => {
    if (studentAddress) {
      setSharedStudentAddress(studentAddress);
    }
  }, [studentAddress]);
  
  // Initialize all hooks based on active mode
  const attendance = studentProfileContract ? // Changed from attendanceContract to studentProfileContract
    useAttendanceData(
      studentProfileContract, // Updated parameter order to match hook definition
      studentContractView,
      isAddressSynced ? sharedStudentAddress : '',
      termNumber,
      refreshInterval
    ) : null;
  
  const reputation = reputationContract ? 
    useStudentReputation(
      reputationContract,
      isAddressSynced ? sharedStudentAddress as `0x${string}` || undefined : undefined
    ) : null;
  
  const schoolVerification = schoolVerificationContract ? 
    useStudentSchoolVerification(
      schoolVerificationContract,
      isAddressSynced ? sharedStudentAddress : '',
      schoolAddress,
      refreshInterval
    ) : null;
  
  const termCompletion = termCompletionContract ? 
    useTermCompletionVerification(
      termCompletionContract,
      isAddressSynced ? sharedStudentAddress : '',
      termNumber,
      refreshInterval
    ) : null;
  
  // Sync student address across all components
  const updateSharedStudentAddress = (address: string) => {
    if (isAddressSynced) {
      setSharedStudentAddress(address);
    }
  };
  
  // Handle mode changes
  const handleModeChange = (mode: VerificationMode) => {
    setActiveMode(mode);
  };
  
  // Callback when data is fetched - using useEffect to trigger callback
  useEffect(() => {
    if (!onDataFetched) return;
    
    let data: any;
    
    switch (activeMode) {
      case 'attendance':
        if (attendance && attendance.termAttendance !== undefined && attendance.totalAttendance !== undefined) {
          data = {
            mode: 'attendance',
            termAttendance: attendance.termAttendance,
            totalAttendance: attendance.totalAttendance,
            studentAddress: attendance.studentAddress,
            term: attendance.term
          };
          onDataFetched(data);
        }
        break;
        
      case 'reputation':
        if (reputation && reputation.data) {
          data = {
            mode: 'reputation',
            reputationData: reputation.data,
            level: reputation.level,
            nextLevel: reputation.nextLevel,
            dominantCategory: reputation.dominantCategory,
            studentAddress: reputation.effectiveAddress
          };
          onDataFetched(data);
        }
        break;
        
      case 'school':
        if (schoolVerification && schoolVerification.isVerified !== undefined) {
          data = {
            mode: 'school',
            isVerified: schoolVerification.isVerified,
            studentAddress: schoolVerification.studentAddress,
            schoolAddress: schoolVerification.schoolAddress
          };
          onDataFetched(data);
        }
        break;
        
      case 'termCompletion':
        if (termCompletion && termCompletion.isCompleted !== undefined) {
          data = {
            mode: 'termCompletion',
            isCompleted: termCompletion.isCompleted,
            studentAddress: termCompletion.studentAddress,
            termNumber: termCompletion.termNumber
          };
          onDataFetched(data);
        }
        break;
    }
  }, [
    activeMode, 
    attendance?.termAttendance, 
    attendance?.totalAttendance, 
    reputation?.data, 
    schoolVerification?.isVerified, 
    termCompletion?.isCompleted, 
    onDataFetched
  ]);
  
  // Verify that the required contract for the active mode is available
  const isModeAvailable = (mode: VerificationMode): boolean => {
    switch (mode) {
      case 'attendance':
        return !!studentProfileContract; // Changed from attendanceContract to studentProfileContract
      case 'reputation':
        return !!reputationContract;
      case 'school':
        return !!schoolVerificationContract;
      case 'termCompletion':
        return !!termCompletionContract;
      default:
        return false;
    }
  };
  
  // If the current mode is not available, switch to the first available mode
  useEffect(() => {
    if (!isModeAvailable(activeMode)) {
      if (studentProfileContract) setActiveMode('attendance');
      else if (reputationContract) setActiveMode('reputation');
      else if (schoolVerificationContract) setActiveMode('school');
      else if (termCompletionContract) setActiveMode('termCompletion');
    }
  }, [activeMode, studentProfileContract, reputationContract, schoolVerificationContract, termCompletionContract]);
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-gray-800/50 border border-gray-700 rounded-lg p-4"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-blue-400">
          Student Verification Hub
        </h3>
        
        {/* Address Sync Toggle */}
        <div className="flex items-center">
          <label className="inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={isAddressSynced}
              onChange={() => setIsAddressSynced(!isAddressSynced)}
            />
            <div className="relative w-10 h-5 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-300 after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
            <span className="ml-3 text-sm text-gray-300">Sync Student Address</span>
          </label>
        </div>
      </div>
      
      {/* Verification Mode Selector */}
      <div className="flex flex-wrap gap-2 mb-4">
        {studentProfileContract && (
          <button
            type="button"
            onClick={() => handleModeChange('attendance')}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              activeMode === 'attendance' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Attendance
          </button>
        )}
        
        {reputationContract && (
          <button
            type="button"
            onClick={() => handleModeChange('reputation')}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              activeMode === 'reputation' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Reputation
          </button>
        )}
        
        {schoolVerificationContract && (
          <button
            type="button"
            onClick={() => handleModeChange('school')}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              activeMode === 'school' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            School Verification
          </button>
        )}
        
        {termCompletionContract && (
          <button
            type="button"
            onClick={() => handleModeChange('termCompletion')}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              activeMode === 'termCompletion' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Term Completion
          </button>
        )}
      </div>
      
      {/* Shared Student Address Input when address sync is enabled */}
      {isAddressSynced && (
        <div className="mb-4 space-y-2">
          <label htmlFor="shared-student-address" className="block text-sm font-medium text-gray-300">
            Student Wallet Address
          </label>
          <div className="flex space-x-2">
            <input
              id="shared-student-address"
              type="text"
              value={sharedStudentAddress}
              onChange={(e) => updateSharedStudentAddress(e.target.value)}
              placeholder="0x..."
              className="flex-grow px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            
            {connectedAddress && (
              <button
                type="button"
                onClick={() => updateSharedStudentAddress(connectedAddress)}
                className="px-3 py-2 bg-gray-600 text-gray-200 rounded-md hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                title="Use connected wallet address"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </button>
            )}
          </div>
          <p className="text-xs text-gray-400">This address will be used across all verification modes</p>
        </div>
      )}
      
      {/* Dynamic Content based on the active mode */}
      <div className="mt-4">
        {/* Attendance Verification */}
        {activeMode === 'attendance' && studentProfileContract && (
          <div className="space-y-4">
            <motion.div
              key="attendance"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* Form to select term (if address is not synced, attendance component will handle address input) */}
              <div className="bg-gray-700/30 rounded-lg p-4 space-y-4 mb-4">
                {!isAddressSynced && (
                  <div className="space-y-2">
                    <label htmlFor="attendance-student-address" className="block text-sm font-medium text-gray-300">
                      Student Wallet Address
                    </label>
                    <input
                      id="attendance-student-address"
                      type="text"
                      value={attendance?.studentAddress || ''}
                      onChange={(e) => attendance?.setStudentAddress(e.target.value)}
                      placeholder="0x..."
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-400">Enter the student's Ethereum wallet address</p>
                  </div>
                )}
                
                <div className="space-y-2">
                  <label htmlFor="attendance-term" className="block text-sm font-medium text-gray-300">
                    Term Number
                  </label>
                  <input
                    id="attendance-term"
                    type="number"
                    value={attendance?.term || 1}
                    onChange={(e) => attendance?.setTerm(parseInt(e.target.value) || 1)}
                    placeholder="Enter term number"
                    min="1"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-400">Enter the term number to check attendance for</p>
                </div>
                
                {studentContractView && (
                  <div className="flex items-center mt-2">
                    <label className="inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={!!attendance?.studentInfo}
                        onChange={() => attendance?.toggleAdditionalInfo()}
                      />
                      <div className="relative w-10 h-5 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-300 after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                      <span className="ml-3 text-sm text-gray-300">Show Additional Student Info</span>
                    </label>
                  </div>
                )}
                
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => attendance?.refresh()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={attendance?.isLoading}
                  >
                    {attendance?.isLoading ? (
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
              
              {/* Results Display - Simple version of attendance data */}
              {attendance?.error ? (
                <div className="bg-red-500/20 text-red-400 border border-red-500/30 rounded-md p-3 mb-4">
                  <p className="text-sm">Error fetching attendance data: {attendance.error.message || 'Unknown error'}</p>
                </div>
              ) : attendance?.termAttendance !== undefined && attendance?.totalAttendance !== undefined ? (
                <div className="space-y-4">
                  {/* Status Badge */}
                  <div className={`inline-flex items-center px-3 py-1 rounded-full ${attendance.status.bg} border border-${attendance.status.color.replace('text-', '')}/30`}>
                    <div className={`w-2 h-2 rounded-full ${attendance.status.color.replace('text-', 'bg-')} mr-2`}></div>
                    <span className={`text-sm font-medium ${attendance.status.color}`}>
                      {attendance.status.text} Attendance
                    </span>
                  </div>
                  
                  {/* Attendance Summary Card */}
                  <div className="bg-gray-700/30 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Term Attendance */}
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-gray-300">Term {attendance.term} Attendance:</p>
                        <div className="flex items-baseline">
                          <p className="text-2xl font-bold text-white">{attendance.termAttendance.toString()}</p>
                          <p className="text-sm text-gray-400 ml-2">classes</p>
                        </div>
                      </div>
                      
                      {/* Total Attendance */}
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-gray-300">Total Attendance:</p>
                        <div className="flex items-baseline">
                          <p className="text-2xl font-bold text-white">{attendance.totalAttendance.toString()}</p>
                          <p className="text-sm text-gray-400 ml-2">classes</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </motion.div>
          </div>
        )}
        
        {/* Reputation Verification */}
        {activeMode === 'reputation' && reputationContract && (
          <div className="space-y-4">
            <motion.div
              key="reputation"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* Form inputs - only show if address sync is disabled */}
              {!isAddressSynced && (
                <div className="mb-4 space-y-2">
                  <div className="flex space-x-2">
                    <div className="flex-grow">
                      <input
                        type="text"
                        value={reputation?.effectiveAddress || ''}
                        onChange={(e) => reputation?.setCustomAddress(e.target.value)}
                        placeholder="Student address (0x...)"
                        className={`w-full px-3 py-2 bg-gray-700 border ${
                          reputation?.validationError ? 'border-red-500' : 'border-gray-600'
                        } rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => reputation?.refresh()}
                      className="px-3 py-2 bg-gray-600 text-gray-200 rounded-md hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={reputation?.isLoading}
                    >
                      {reputation?.isLoading ? (
                        <div className="w-5 h-5 border-2 border-t-blue-400 border-blue-200/30 rounded-full animate-spin"></div>
                      ) : (
                        'Lookup'
                      )}
                    </button>
                  </div>
                  {reputation?.validationError && (
                    <p className="text-xs text-red-400">{reputation.validationError}</p>
                  )}
                </div>
              )}
              
              {/* Results Display - Simplified reputation data */}
              {reputation?.isLoading && (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-t-blue-400 border-blue-200/30 rounded-full animate-spin mr-3"></div>
                  <span className="text-sm text-gray-300">Loading reputation data...</span>
                </div>
              )}
              
              {reputation?.isError && (
                <div className="bg-red-500/20 text-red-400 border border-red-500/30 rounded-md p-4">
                  <p className="text-sm">Error loading reputation data. Please try again later.</p>
                </div>
              )}
              
              {reputation?.data && reputation.level && reputation.nextLevel && reputation.dominantCategory && (
                <div className="space-y-4">
                  {/* Student Address Display */}
                  <div className="bg-gray-700/20 rounded-md p-3">
                    <h4 className="text-xs text-gray-400 mb-1">Student Address:</h4>
                    <div className="flex items-center">
                      <span className="text-sm font-mono text-gray-300 truncate">{reputation.effectiveAddress}</span>
                    </div>
                  </div>
                  
                  {/* Reputation Level Badge */}
                  <div className={`bg-${reputation.level.color}-500/20 border border-${reputation.level.color}-500/30 rounded-lg p-4 flex flex-col items-center`}>
                    <div className={`text-${reputation.level.color}-400 text-xl font-bold mb-1`}>
                      {reputation.level.name}
                    </div>
                    <div className="text-gray-300 text-sm">
                      Reputation Level
                    </div>
                  </div>
                  
                  {/* Total Points Display */}
                  <div className="bg-gray-700/30 rounded-lg p-4">
                    <div className="flex items-end justify-between mb-3">
                      <h4 className="text-sm font-medium text-gray-300">Total Reputation</h4>
                      <div className="text-2xl font-bold text-white">
                        {reputation.data.totalPoints.toString()}
                        <span className="text-sm text-gray-400 ml-1">points</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Reputation Categories */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Attendance Points */}
                    <div className="bg-gray-700/30 rounded-lg p-4">
                      <h5 className="text-xs text-gray-400 mb-2">Attendance</h5>
                      <div className="text-xl font-bold text-green-400 mb-2">
                        {reputation.data.attendancePoints.toString()}
                      </div>
                    </div>
                    
                    {/* Behavior Points */}
                    <div className="bg-gray-700/30 rounded-lg p-4">
                      <h5 className="text-xs text-gray-400 mb-2">Behavior</h5>
                      <div className="text-xl font-bold text-blue-400 mb-2">
                        {reputation.data.behaviorPoints.toString()}
                      </div>
                    </div>
                    
                    {/* Academic Points */}
                    <div className="bg-gray-700/30 rounded-lg p-4">
                      <h5 className="text-xs text-gray-400 mb-2">Academic</h5>
                      <div className="text-xl font-bold text-purple-400 mb-2">
                        {reputation.data.academicPoints.toString()}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Empty State */}
              {!reputation?.isLoading && !reputation?.data && reputation?.effectiveAddress && !reputation?.isError && (
                <div className="bg-gray-700/20 rounded-md p-6 text-center">
                  <svg className="w-12 h-12 text-gray-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-gray-400 mb-3">No reputation data found for this address.</p>
                  <p className="text-xs text-gray-500">This could be because the student hasn't begun building their reputation yet or the address is not registered in the system.</p>
                </div>
              )}
            </motion.div>
          </div>
        )}
        
        {/* School Verification */}
        {activeMode === 'school' && schoolVerificationContract && (
          <div className="space-y-4">
            <motion.div
              key="school"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* Form for verification */}
              <div className="bg-gray-700/30 rounded-lg p-4 space-y-4 mb-4">
                {/* Only show student address field if address sync is disabled */}
                {!isAddressSynced && (
                  <div className="space-y-2">
                    <label htmlFor="school-student-address" className="block text-sm font-medium text-gray-300">
                      Student Wallet Address
                    </label>
                    <input
                      id="school-student-address"
                      type="text"
                      value={schoolVerification?.studentAddress || ''}
                      onChange={(e) => schoolVerification?.setStudentAddress(e.target.value)}
                      placeholder="0x..."
                      className={`w-full px-3 py-2 bg-gray-700 border ${
                        schoolVerification?.validationError && !schoolVerification.studentAddress ? 'border-red-500' : 'border-gray-600'
                      } rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                    />
                    <p className="text-xs text-gray-400">Enter the student's Ethereum wallet address</p>
                  </div>
                )}
                
                {/* School Address Input */}
                <div className="space-y-2">
                  <label htmlFor="school-address" className="block text-sm font-medium text-gray-300">
                    School Address
                  </label>
                  <input
                    id="school-address"
                    type="text"
                    value={schoolVerification?.schoolAddress || ''}
                    onChange={(e) => schoolVerification?.setSchoolAddress(e.target.value)}
                    placeholder="0x..."
                    className={`w-full px-3 py-2 bg-gray-700 border ${
                      schoolVerification?.validationError && !schoolVerification.schoolAddress ? 'border-red-500' : 'border-gray-600'
                    } rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                  />
                  <p className="text-xs text-gray-400">Enter the school's Ethereum address</p>
                </div>
                
                {/* Error Display */}
                {schoolVerification?.validationError && (
                  <div className="text-xs text-red-400 mt-1">{schoolVerification.validationError}</div>
                )}
                
                {/* Quick Test Buttons */}
                <div className="flex flex-wrap gap-2 mt-2">
                  <div>
                    <h4 className="text-xs text-gray-400 mb-1">School Test Addresses:</h4>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => schoolVerification?.setSchoolAddress("0xdD2FD4581271e230360230F9337D5c0430Bf44C0")}
                        className="text-xs bg-gray-600 hover:bg-gray-500 text-gray-200 py-1 px-2 rounded"
                      >
                        Test School 1
                      </button>
                      <button
                        type="button"
                        onClick={() => schoolVerification?.setSchoolAddress("0x5FbDB2315678afecb367f032d93F642f64180aa3")}
                        className="text-xs bg-gray-600 hover:bg-gray-500 text-gray-200 py-1 px-2 rounded"
                      >
                        Test School 2
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Submit Button */}
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => schoolVerification?.refresh()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={schoolVerification?.isLoading}
                  >
                    {schoolVerification?.isLoading ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Verifying...
                      </span>
                    ) : (
                      'Verify Relationship'
                    )}
                  </button>
                </div>
              </div>
              
              {/* Results Display */}
              {schoolVerification?.error ? (
                <div className="bg-red-500/20 text-red-400 border border-red-500/30 rounded-md p-3 mb-4">
                  <p className="text-sm">Error verifying relationship: {schoolVerification.error.message || 'Unknown error'}</p>
                </div>
              ) : schoolVerification?.isVerified !== undefined ? (
                <div className="space-y-4">
                  {/* Status Badge */}
                  <div className={`inline-flex items-center px-3 py-1 rounded-full ${schoolVerification.status.bg} border border-${schoolVerification.status.color.replace('text-', '')}/30`}>
                    <div className={`w-2 h-2 rounded-full ${schoolVerification.status.color.replace('text-', 'bg-')} mr-2`}></div>
                    <span className={`text-sm font-medium ${schoolVerification.status.color}`}>
                      {schoolVerification.status.text}
                    </span>
                  </div>
                  
                  {/* Main Info Card */}
                  <div className="bg-gray-700/30 rounded-lg p-4">
                    <div className="grid grid-cols-1 gap-4">
                      {/* Verification Result */}
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-gray-300">Verification Result</h4>
                        <div className="bg-gray-700/40 rounded-md p-3 border border-gray-600">
                          <div className="flex items-center justify-center p-3">
                            {schoolVerification.isVerified ? (
                              <div className="flex flex-col items-center">
                                <div className="w-16 h-16 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center mb-2">
                                  <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                </div>
                                <p className="text-lg font-medium text-green-400">Verified Student</p>
                                <p className="text-sm text-gray-400 mt-1">This student is enrolled at the specified school</p>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center">
                                <div className="w-16 h-16 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center mb-2">
                                  <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </div>
                                <p className="text-lg font-medium text-red-400">Not Verified</p>
                                <p className="text-sm text-gray-400 mt-1">This student is not enrolled at the specified school</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </motion.div>
          </div>
        )}
        
        {/* Term Completion Verification */}
        {activeMode === 'termCompletion' && termCompletionContract && (
          <div className="space-y-4">
            <motion.div
              key="termCompletion"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* Form for verification */}
              <div className="bg-gray-700/30 rounded-lg p-4 space-y-4 mb-4">
                {/* Only show student address field if address sync is disabled */}
                {!isAddressSynced && (
                  <div className="space-y-2">
                    <label htmlFor="term-student-address" className="block text-sm font-medium text-gray-300">
                      Student Wallet Address
                    </label>
                    <input
                      id="term-student-address"
                      type="text"
                      value={termCompletion?.studentAddress || ''}
                      onChange={(e) => termCompletion?.setStudentAddress(e.target.value)}
                      placeholder="0x..."
                      className={`w-full px-3 py-2 bg-gray-700 border ${
                        termCompletion?.validationError && !termCompletion.studentAddress ? 'border-red-500' : 'border-gray-600'
                      } rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                    />
                    <p className="text-xs text-gray-400">Enter the student's Ethereum wallet address</p>
                  </div>
                )}
                
                {/* Term Number Input */}
                <div className="space-y-2">
                  <label htmlFor="term-number" className="block text-sm font-medium text-gray-300">
                    Term Number
                  </label>
                  <input
                    id="term-number"
                    type="number"
                    value={termCompletion?.termNumber || 1}
                    onChange={(e) => termCompletion?.setTermNumber(parseInt(e.target.value) || 1)}
                    placeholder="Enter term number"
                    min="1"
                    className={`w-full px-3 py-2 bg-gray-700 border ${
                      termCompletion?.validationError && (!termCompletion.termNumber || termCompletion.termNumber <= 0) ? 'border-red-500' : 'border-gray-600'
                    } rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                  />
                  <p className="text-xs text-gray-400">Enter the term number to check completion status</p>
                </div>
                
                {/* Error Display */}
                {termCompletion?.validationError && (
                  <div className="text-xs text-red-400 mt-1">{termCompletion.validationError}</div>
                )}
                
                {/* Quick Test Buttons */}
                <div className="flex flex-wrap gap-2 mt-2">
                  <div>
                    <h4 className="text-xs text-gray-400 mb-1">Term Numbers:</h4>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => termCompletion?.setTermNumber(1)}
                        className="text-xs bg-gray-600 hover:bg-gray-500 text-gray-200 py-1 px-2 rounded"
                      >
                        Term 1
                      </button>
                      <button
                        type="button"
                        onClick={() => termCompletion?.setTermNumber(2)}
                        className="text-xs bg-gray-600 hover:bg-gray-500 text-gray-200 py-1 px-2 rounded"
                      >
                        Term 2
                      </button>
                      <button
                        type="button"
                        onClick={() => termCompletion?.setTermNumber(3)}
                        className="text-xs bg-gray-600 hover:bg-gray-500 text-gray-200 py-1 px-2 rounded"
                      >
                        Term 3
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Submit Button */}
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => termCompletion?.refresh()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={termCompletion?.isLoading}
                  >
                    {termCompletion?.isLoading ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Verifying...
                      </span>
                    ) : (
                      'Verify Completion'
                    )}
                  </button>
                </div>
              </div>
              
              {/* Results Display */}
              {termCompletion?.error ? (
                <div className="bg-red-500/20 text-red-400 border border-red-500/30 rounded-md p-3 mb-4">
                  <p className="text-sm">Error verifying term completion: {termCompletion.error.message || 'Unknown error'}</p>
                </div>
              ) : termCompletion?.isCompleted !== undefined ? (
                <div className="space-y-4">
                  {/* Status Badge */}
                  <div className={`inline-flex items-center px-3 py-1 rounded-full ${termCompletion.status.bg} border border-${termCompletion.status.color.replace('text-', '')}/30`}>
                    <div className={`w-2 h-2 rounded-full ${termCompletion.status.color.replace('text-', 'bg-')} mr-2`}></div>
                    <span className={`text-sm font-medium ${termCompletion.status.color}`}>
                      {termCompletion.status.text}
                    </span>
                  </div>
                  
                  {/* Main Info Card */}
                  <div className="bg-gray-700/30 rounded-lg p-4">
                    <div className="grid grid-cols-1 gap-4">
                      {/* Completion Result */}
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-gray-300">Term Completion Result</h4>
                        <div className="bg-gray-700/40 rounded-md p-3 border border-gray-600">
                          <div className="flex items-center justify-center p-3">
                            {termCompletion.isCompleted ? (
                              <div className="flex flex-col items-center">
                                <div className="w-16 h-16 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center mb-2">
                                  <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                </div>
                                <p className="text-lg font-medium text-green-400">Term {termCompletion.termNumber} Completed</p>
                                <p className="text-sm text-gray-400 mt-1">This student has successfully completed term {termCompletion.termNumber}</p>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center">
                                <div className="w-16 h-16 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center mb-2">
                                  <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </div>
                                <p className="text-lg font-medium text-red-400">Term {termCompletion.termNumber} Not Completed</p>
                                <p className="text-sm text-gray-400 mt-1">This student has not yet completed term {termCompletion.termNumber}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </motion.div>
          </div>
        )}
        
        {/* No Contract Warning */}
        {!studentProfileContract && !reputationContract && !schoolVerificationContract && !termCompletionContract && (
          <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-md p-4 text-yellow-400">
            <p className="text-sm font-medium">No contracts provided</p>
            <p className="text-xs mt-1">Please provide at least one contract to use the Student Verification Hub.</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default StudentVerificationHub;