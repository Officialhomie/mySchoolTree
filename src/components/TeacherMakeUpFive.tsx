import React, { useState, useEffect } from 'react';
import { 
  useAccount, 
  useReadContracts, 
  useWriteContract, 
  useWaitForTransactionReceipt 
} from 'wagmi';
import { motion, AnimatePresence } from 'framer-motion';

// Interfaces
export interface ReputationPoints {
  attendancePoints: string;
  behaviorPoints: string;
  academicPoints: string;
}

export interface ReputationValidation {
  isValid: boolean;
  errorMessage: string;
  isPaused?: boolean;
  hasTeacherRole?: boolean;
  isSchoolActive?: boolean;
  isStudentOfSchool?: boolean;
}

export interface ReputationStatus {
  isLoading: boolean;
  isPending: boolean;
  isConfirming: boolean;
  isSuccess: boolean;
  error: Error | null;
}

// Props interface
interface EnhancedStudentReputationUpdaterProps {
  reputationContract: any;
  roleContract: any;
  schoolContract: any;
  studentAddress?: string;
  onPointsChange?: (points: ReputationPoints) => void;
  onValidationChange?: (validation: ReputationValidation) => void;
  onStatusChange?: (status: ReputationStatus) => void;
  onUpdateSuccess?: (studentAddress: string, points: ReputationPoints) => void;
}

// Utility functions
export const ReputationUtils = {
  isValidAddress: (address: string): boolean => {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  },
  
  validatePoints: (points: string): boolean => {
    const numPoints = parseInt(points, 10);
    return !isNaN(numPoints) && numPoints >= 0 && numPoints <= 100;
  },
  
  calculateTotalPoints: (points: ReputationPoints): number => {
    return (
      parseInt(points.attendancePoints || '0', 10) +
      parseInt(points.behaviorPoints || '0', 10) +
      parseInt(points.academicPoints || '0', 10)
    );
  },
  
  formatAddress: (address: string): string => {
    if (!address || address.length < 10) return address;
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  },

  getPointsColor: (points: string): string => {
    const value = parseInt(points, 10);
    if (value >= 80) return 'text-green-400';
    if (value >= 60) return 'text-blue-400';
    if (value >= 40) return 'text-yellow-400';
    if (value >= 20) return 'text-orange-400';
    return 'text-red-400';
  },

  getPointsGradient: (points: string): string => {
    const value = parseInt(points, 10);
    if (value >= 80) return 'from-green-500 to-emerald-400';
    if (value >= 60) return 'from-blue-500 to-cyan-400';
    if (value >= 40) return 'from-yellow-500 to-amber-400';
    if (value >= 20) return 'from-orange-500 to-amber-400';
    return 'from-red-500 to-pink-400';
  }
};

const EnhancedStudentReputationUpdater: React.FC<EnhancedStudentReputationUpdaterProps> = ({
  reputationContract,
  roleContract,
  schoolContract,
  studentAddress: initialStudentAddress = '',
  onPointsChange,
  onValidationChange,
  onStatusChange,
  onUpdateSuccess
}) => {
  // User account and state management
  const { address: connectedAddress } = useAccount();

  // Form state
  const [studentAddress, setStudentAddress] = useState<string>(initialStudentAddress);
  const [attendancePoints, setAttendancePoints] = useState<string>('0');
  const [behaviorPoints, setBehaviorPoints] = useState<string>('0');
  const [academicPoints, setAcademicPoints] = useState<string>('0');
  const [validationError, setValidationError] = useState<string>('');
  const [showGuidelines, setShowGuidelines] = useState<boolean>(false);

  // Comprehensive contract checks
  const { 
    data: contractData, 
    isLoading: isLoadingChecks,
    refetch: refetchChecks
  } = useReadContracts({
    contracts: [
      // Check if contract is paused
      { 
        ...reputationContract, 
        functionName: 'paused' 
      },
      // Check caller's teacher role
      { 
        ...roleContract, 
        functionName: 'hasRole', 
        args: [roleContract.teacherRole, connectedAddress] 
      },
      // Check school status for caller's address
      { 
        ...schoolContract, 
        functionName: 'isActiveSchool', 
        args: [connectedAddress] 
      },
      // Check if student belongs to school
      { 
        ...schoolContract, 
        functionName: 'isStudentOfSchool', 
        args: [studentAddress && ReputationUtils.isValidAddress(studentAddress) ? studentAddress : '0x0000000000000000000000000000000000000000', connectedAddress] 
      }
    ],
    query: {
      enabled: !!connectedAddress && !!studentAddress && ReputationUtils.isValidAddress(studentAddress)
    }
  });

  // Write contract for reputation update
  const { 
    data: updateHash, 
    error: updateError, 
    isPending: isUpdatePending,
    writeContract,
    reset: resetWriteContract
  } = useWriteContract();

  // Transaction receipt
  const { 
    isLoading: isConfirming, 
    isSuccess: isUpdateSuccess 
  } = useWaitForTransactionReceipt({ 
    hash: updateHash 
  });

  // Check if student address is valid
  const isAddressValid = studentAddress ? ReputationUtils.isValidAddress(studentAddress) : false;

  // Update studentAddress when prop changes
  useEffect(() => {
    if (initialStudentAddress) {
      setStudentAddress(initialStudentAddress);
    }
  }, [initialStudentAddress]);

  // Refetch contract data when studentAddress changes
  useEffect(() => {
    if (studentAddress && ReputationUtils.isValidAddress(studentAddress)) {
      refetchChecks();
    }
  }, [studentAddress, refetchChecks]);

  // Export points data when changes occur
  useEffect(() => {
    if (onPointsChange) {
      const points: ReputationPoints = {
        attendancePoints,
        behaviorPoints,
        academicPoints
      };
      onPointsChange(points);
    }
  }, [attendancePoints, behaviorPoints, academicPoints, onPointsChange]);

  // Export validation status
  useEffect(() => {
    if (onValidationChange) {
      const validation: ReputationValidation = {
        isValid: !validationError,
        errorMessage: validationError
      };
      
      if (contractData && contractData.length === 4) {
        const [isPaused, hasTeacherRole, isSchoolActive, isStudentOfSchool] = 
          contractData.map(result => result.result);
          
        validation.isPaused = isPaused as boolean;
        validation.hasTeacherRole = hasTeacherRole as boolean;
        validation.isSchoolActive = isSchoolActive as boolean;
        validation.isStudentOfSchool = isStudentOfSchool as boolean;
      }
      
      onValidationChange(validation);
    }
  }, [validationError, contractData, onValidationChange]);

  // Export transaction status
  useEffect(() => {
    if (onStatusChange) {
      const status: ReputationStatus = {
        isLoading: isLoadingChecks,
        isPending: isUpdatePending,
        isConfirming,
        isSuccess: isUpdateSuccess,
        error: updateError || null
      };
      onStatusChange(status);
    }
  }, [isLoadingChecks, isUpdatePending, isConfirming, isUpdateSuccess, updateError, onStatusChange]);

  // Handle successful updates
  useEffect(() => {
    if (isUpdateSuccess && onUpdateSuccess) {
      const points: ReputationPoints = {
        attendancePoints,
        behaviorPoints,
        academicPoints
      };
      onUpdateSuccess(studentAddress, points);
    }
  }, [isUpdateSuccess, studentAddress, attendancePoints, behaviorPoints, academicPoints, onUpdateSuccess]);

  // Validate points input
  const validatePoints = (points: string): boolean => {
    const numPoints = parseInt(points, 10);
    if (isNaN(numPoints) || numPoints < 0 || numPoints > 100) {
      setValidationError('Points must be a number between 0 and 100');
      return false;
    }
    return true;
  };

  // Handle reputation update
  const handleUpdateReputation = () => {
    // Reset validation error
    setValidationError('');

    // Validate student address
    if (!studentAddress) {
      setValidationError('Student address is required');
      return;
    }

    if (!ReputationUtils.isValidAddress(studentAddress)) {
      setValidationError('Invalid Ethereum address format');
      return;
    }

    // Validate points
    if (!validatePoints(attendancePoints)) return;
    if (!validatePoints(behaviorPoints)) return;
    if (!validatePoints(academicPoints)) return;

    // Perform all checks before updating
    if (!contractData || contractData.length !== 4) {
      setValidationError('Unable to perform all required checks');
      return;
    }

    const [
      isPaused, 
      hasTeacherRole, 
      isSchoolActive, 
      isStudentOfSchool
    ] = contractData.map(result => result.result);

    // Comprehensive validation
    if (isPaused) {
      setValidationError('System is currently paused');
      return;
    }

    if (!hasTeacherRole) {
      setValidationError('Caller must have teacher role');
      return;
    }

    if (!isSchoolActive) {
      setValidationError('School is not active');
      return;
    }

    if (!isStudentOfSchool) {
      setValidationError('Student is not enrolled in this school');
      return;
    }

    // Proceed with reputation update
    resetWriteContract();
    writeContract({
      ...reputationContract,
      functionName: 'updateReputation',
      args: [
        studentAddress as `0x${string}`, 
        BigInt(attendancePoints), 
        BigInt(behaviorPoints), 
        BigInt(academicPoints)
      ]
    });
  };

  // Reset the form
  const handleReset = () => {
    setAttendancePoints('0');
    setBehaviorPoints('0');
    setAcademicPoints('0');
    resetWriteContract();
  };

  // Calculate total points
  const totalPoints = ReputationUtils.calculateTotalPoints({
    attendancePoints,
    behaviorPoints,
    academicPoints
  });

  // Calculate percentage for each category
  const attendancePercentage = totalPoints > 0 ? (parseInt(attendancePoints, 10) / 300) * 100 : 0;
  const behaviorPercentage = totalPoints > 0 ? (parseInt(behaviorPoints, 10) / 300) * 100 : 0;
  const academicPercentage = totalPoints > 0 ? (parseInt(academicPoints, 10) / 300) * 100 : 0;

  // Determine if all requirements are met
  const requirementsMet = contractData && contractData.length === 4 && 
    !contractData[0].result && // Not paused
    contractData[1].result && // Has teacher role
    contractData[2].result && // School is active
    contractData[3].result && // Student is in school
    ReputationUtils.isValidAddress(studentAddress);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-gray-900/90 backdrop-blur-sm border border-gray-700 rounded-lg shadow-xl overflow-hidden"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-800 to-purple-800 p-5 relative">
        <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
        <div className="relative z-10">
          <h2 className="text-2xl font-bold text-white flex items-center">
            <svg className="w-6 h-6 mr-2 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Student Reputation Manager
          </h2>
          <p className="text-blue-200 mt-1">
            Update and track student performance metrics
          </p>
        </div>
      </div>

      <div className="p-5">
        {/* Status Messages */}
        <AnimatePresence>
          {validationError && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-red-500/20 text-red-400 border border-red-500/30 rounded-md p-4 mb-5 flex items-start"
            >
              <svg className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="font-medium">Error</p>
                <p className="text-sm mt-1">{validationError}</p>
              </div>
            </motion.div>
          )}

          {isUpdateSuccess && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-green-500/20 text-green-400 border border-green-500/30 rounded-md p-4 mb-5 flex items-start"
            >
              <svg className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="font-medium">Success</p>
                <p className="text-sm mt-1">Student reputation successfully updated!</p>
                {updateHash && (
                  <div className="mt-2 pt-2 border-t border-green-500/20">
                    <p className="text-xs mb-1">Transaction Hash:</p>
                    <div className="flex items-center">
                      <code className="text-xs font-mono bg-gray-800 p-1 rounded-md mr-2 overflow-hidden overflow-ellipsis max-w-[200px]">
                        {updateHash}
                      </code>
                      <button
                        onClick={() => navigator.clipboard.writeText(updateHash)}
                        className="p-1 rounded-md bg-gray-800 hover:bg-gray-700"
                        title="Copy to clipboard"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {(isUpdatePending || isConfirming) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-md p-4 mb-5 flex items-center"
            >
              <div className="mr-3 flex-shrink-0">
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
              <div>
                <p className="font-medium">
                  {isUpdatePending ? 'Waiting for wallet approval' : 'Confirming transaction'}
                </p>
                <p className="text-sm mt-1">
                  {isUpdatePending 
                    ? 'Please confirm this transaction in your wallet' 
                    : 'Your transaction has been submitted and is being processed'}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          {/* Left Side - Form */}
          <div className="md:col-span-3 space-y-5">
            {/* Student Address */}
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
              <h3 className="text-lg font-medium text-blue-400 mb-4">Student Information</h3>
              
              <div>
                <label 
                  htmlFor="student-address" 
                  className="block text-sm font-medium text-gray-300 mb-2"
                >
                  Student Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <input
                    id="student-address"
                    type="text"
                    value={studentAddress}
                    onChange={(e) => {
                      setStudentAddress(e.target.value);
                      setValidationError('');
                    }}
                    placeholder="0x..."
                    className={`w-full pl-10 pr-3 py-2 bg-gray-700/70 border ${
                      !isAddressValid && studentAddress ? 'border-red-500' : 'border-gray-600'
                    } rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    disabled={isUpdatePending || isConfirming}
                  />
                </div>
                {!isAddressValid && studentAddress && (
                  <p className="mt-1 text-xs text-red-400">Invalid Ethereum address format</p>
                )}
                <p className="mt-1 text-xs text-gray-400">Enter the blockchain address of the student</p>
              </div>
            </div>

            {/* Reputation Points */}
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
              <h3 className="text-lg font-medium text-blue-400 mb-4">Reputation Points</h3>
              
              {/* Attendance Points */}
              <div className="mb-5">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium text-gray-300 flex items-center">
                    <svg className="w-4 h-4 mr-1 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Attendance Points
                  </label>
                  <div className="bg-blue-900/30 px-3 py-1 rounded-full">
                    <span className={`text-sm font-medium ${ReputationUtils.getPointsColor(attendancePoints)}`}>
                      {attendancePoints}
                    </span>
                  </div>
                </div>
                
                <div className="relative">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={attendancePoints}
                    onChange={(e) => setAttendancePoints(e.target.value)}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${attendancePoints}%, #374151 ${attendancePoints}%, #374151 100%)`
                    }}
                    disabled={isUpdatePending || isConfirming}
                  />
                  <div className="flex justify-between mt-1 text-xs text-gray-400">
                    <span>0</span>
                    <span>25</span>
                    <span>50</span>
                    <span>75</span>
                    <span>100</span>
                  </div>
                </div>
                
                <p className="mt-2 text-xs text-gray-400">
                  Points reflecting the student's class attendance and participation
                </p>
              </div>
              
              {/* Behavior Points */}
              <div className="mb-5">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium text-gray-300 flex items-center">
                    <svg className="w-4 h-4 mr-1 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Behavior Points
                  </label>
                  <div className="bg-purple-900/30 px-3 py-1 rounded-full">
                    <span className={`text-sm font-medium ${ReputationUtils.getPointsColor(behaviorPoints)}`}>
                      {behaviorPoints}
                    </span>
                  </div>
                </div>
                
                <div className="relative">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={behaviorPoints}
                    onChange={(e) => setBehaviorPoints(e.target.value)}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, #a855f7 0%, #a855f7 ${behaviorPoints}%, #374151 ${behaviorPoints}%, #374151 100%)`
                    }}
                    disabled={isUpdatePending || isConfirming}
                  />
                  <div className="flex justify-between mt-1 text-xs text-gray-400">
                    <span>0</span>
                    <span>25</span>
                    <span>50</span>
                    <span>75</span>
                    <span>100</span>
                  </div>
                </div>
                
                <p className="mt-2 text-xs text-gray-400">
                  Points reflecting the student's conduct and behavior in school
                </p>
              </div>
              
              {/* Academic Points */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium text-gray-300 flex items-center">
                    <svg className="w-4 h-4 mr-1 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    Academic Points
                  </label>
                  <div className="bg-green-900/30 px-3 py-1 rounded-full">
                    <span className={`text-sm font-medium ${ReputationUtils.getPointsColor(academicPoints)}`}>
                      {academicPoints}
                    </span>
                  </div>
                </div>
                
                <div className="relative">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={academicPoints}
                    onChange={(e) => setAcademicPoints(e.target.value)}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, #22c55e 0%, #22c55e ${academicPoints}%, #374151 ${academicPoints}%, #374151 100%)`
                    }}
                    disabled={isUpdatePending || isConfirming}
                  />
                  <div className="flex justify-between mt-1 text-xs text-gray-400">
                    <span>0</span>
                    <span>25</span>
                    <span>50</span>
                    <span>75</span>
                    <span>100</span>
                  </div>
                </div>
                
                <p className="mt-2 text-xs text-gray-400">
                  Points reflecting the student's academic performance and achievements
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleUpdateReputation}
                disabled={isLoadingChecks || isUpdatePending || isConfirming || !isAddressValid}
                className={`flex-1 py-3 rounded-lg font-medium transition-all ${
                  isLoadingChecks || isUpdatePending || isConfirming || !isAddressValid
                    ? 'bg-gray-700 cursor-not-allowed text-gray-400'
                    : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg'
                }`}
              >
                {isLoadingChecks ? 'Checking Permissions...' : 
                isUpdatePending ? 'Updating Reputation...' : 
                isConfirming ? 'Confirming Transaction...' : 
                'Update Reputation'}
              </button>
              
              <button
                type="button"
                onClick={handleReset}
                disabled={isUpdatePending || isConfirming}
                className="px-4 py-3 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                title="Reset points to zero"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>

          {/* Right Side - Summary and Status */}
          <div className="md:col-span-2 space-y-5">
            {/* Total Reputation Summary */}
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
              <h3 className="text-lg font-medium text-blue-400 mb-4">Reputation Summary</h3>
              
              <div className="text-center mb-4">
                <div className="inline-flex items-center justify-center rounded-full w-24 h-24 border-4 border-gray-700 bg-gray-800 mb-3">
                  <span className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-green-400 bg-clip-text text-transparent">
                    {totalPoints}
                  </span>
                </div>
                <p className="text-sm text-gray-300">Total Reputation Points</p>
                <p className="text-xs text-gray-400">Out of 300 possible points</p>
              </div>
              
              <div className="space-y-3">
                {/* Attendance Points Distribution */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-blue-400">Attendance</span>
                    <span className="text-blue-400">{attendancePoints} pts</span>
                  </div>
                  <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500" 
                      style={{ width: `${attendancePercentage}%` }}
                    ></div>
                  </div>
                </div>
                
                {/* Behavior Points Distribution */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-purple-400">Behavior</span>
                    <span className="text-purple-400">{behaviorPoints} pts</span>
                  </div>
                  <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-purple-500" 
                      style={{ width: `${behaviorPercentage}%` }}
                    ></div>
                  </div>
                </div>
                
                {/* Academic Points Distribution */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-green-400">Academic</span>
                    <span className="text-green-400">{academicPoints} pts</span>
                  </div>
                  <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-500" 
                      style={{ width: `${academicPercentage}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* System Requirements */}
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-blue-400">Requirements</h3>
                
                {isLoadingChecks && (
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="text-xs text-gray-400">Checking...</span>
                  </div>
                )}
              </div>
              
              <ul className="space-y-2 text-sm">
                <li className={`flex items-center p-2 rounded ${isAddressValid ? 'bg-green-900/20' : 'bg-gray-700/30'}`}>
                  {isAddressValid ? (
                    <svg className="w-5 h-5 mr-2 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                  <span className={isAddressValid ? 'text-green-400' : 'text-gray-400'}>
                    Valid Student Address
                  </span>
                </li>
                
                {contractData && contractData.length === 4 && (
                  <>
                    <li className={`flex items-center p-2 rounded ${!contractData[0].result ? 'bg-green-900/20' : 'bg-red-900/20'}`}>
                      {!contractData[0].result ? (
                        <svg className="w-5 h-5 mr-2 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 mr-2 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                      <span className={!contractData[0].result ? 'text-green-400' : 'text-red-400'}>
                        System Active (Not Paused)
                      </span>
                    </li>
                    
                    <li className={`flex items-center p-2 rounded ${contractData[1].result ? 'bg-green-900/20' : 'bg-red-900/20'}`}>
                      {contractData[1].result ? (
                        <svg className="w-5 h-5 mr-2 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 mr-2 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                      <span className={contractData[1].result ? 'text-green-400' : 'text-red-400'}>
                        Teacher Role
                      </span>
                    </li>
                    
                    <li className={`flex items-center p-2 rounded ${contractData[2].result ? 'bg-green-900/20' : 'bg-red-900/20'}`}>
                      {contractData[2].result ? (
                        <svg className="w-5 h-5 mr-2 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 mr-2 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                      <span className={contractData[2].result ? 'text-green-400' : 'text-red-400'}>
                        Active School
                      </span>
                    </li>
                    
                    <li className={`flex items-center p-2 rounded ${contractData[3].result ? 'bg-green-900/20' : 'bg-red-900/20'}`}>
                      {contractData[3].result ? (
                        <svg className="w-5 h-5 mr-2 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 mr-2 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                      <span className={contractData[3].result ? 'text-green-400' : 'text-red-400'}>
                        Student Enrolled in School
                      </span>
                    </li>
                  </>
                )}
              </ul>
              
              {/* Requirements Summary */}
              <div className={`mt-4 p-3 rounded-lg ${
                requirementsMet 
                  ? 'bg-green-900/20 border border-green-800/30' 
                  : 'bg-red-900/20 border border-red-800/30'
              }`}>
                <div className="flex items-center">
                  {requirementsMet ? (
                    <>
                      <svg className="w-5 h-5 mr-2 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm font-medium text-green-400">All requirements met</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-2 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm font-medium text-red-400">Some requirements not met</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            
            {/* Guidelines Toggle */}
            <div className="bg-gray-800/50 rounded-lg overflow-hidden border border-gray-700">
              <button
                type="button"
                onClick={() => setShowGuidelines(!showGuidelines)}
                className="w-full p-4 text-left flex justify-between items-center"
              >
                <span className="text-lg font-medium text-blue-400">Guidelines</span>
                <svg className={`w-5 h-5 text-gray-400 transition-transform ${showGuidelines ? 'transform rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              <AnimatePresence>
                {showGuidelines && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="px-4 pb-4">
                      <ul className="text-sm text-gray-400 space-y-2">
                        <li className="flex items-start">
                          <span className="text-blue-400 mr-2">•</span>
                          Only teachers can update student reputation
                        </li>
                        <li className="flex items-start">
                          <span className="text-blue-400 mr-2">•</span>
                          Points range from 0 to 100 for each category
                        </li>
                        <li className="flex items-start">
                          <span className="text-blue-400 mr-2">•</span>
                          The school must be an active institution
                        </li>
                        <li className="flex items-start">
                          <span className="text-blue-400 mr-2">•</span>
                          The student must be enrolled in the teacher's school
                        </li>
                        <li className="flex items-start">
                          <span className="text-blue-400 mr-2">•</span>
                          The system must not be paused
                        </li>
                      </ul>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default EnhancedStudentReputationUpdater;