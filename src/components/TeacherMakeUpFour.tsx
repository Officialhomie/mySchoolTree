import { useState, useEffect, useCallback } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { motion, AnimatePresence } from 'framer-motion';
import { contractAttendanceTrackingConfig } from '../contracts';

// Types
export type AttendanceRecord = {
  student: string;
  programId: string;
  present: boolean;
  timestamp: number;
};

export type ReputationRecord = {
  student: string;
  attendancePoints: string;
  behaviorPoints: string;
  academicPoints: string;
  timestamp: number;
};

export type StudentRecord = AttendanceRecord | ReputationRecord;

type TabType = 'attendance' | 'reputation';
type ProcessingState = 'form' | 'submitting' | 'completed';
type StatusType = 'success' | 'error' | 'info' | 'warning';

type StudentManagementSystemProps = {
  onAttendanceRecorded?: (record: AttendanceRecord, hash: string) => void;
  onReputationUpdated?: (record: ReputationRecord, hash: string) => void;
  externalAttendanceRecords?: AttendanceRecord[];
  externalReputationRecords?: ReputationRecord[];
};

const StudentManagementSystem = ({
  onAttendanceRecorded,
  onReputationUpdated,
  externalAttendanceRecords = [],
  externalReputationRecords = []
}: StudentManagementSystemProps) => {
  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('attendance');
  
  // Form states
  const [studentAddress, setStudentAddress] = useState('');
  const [programId, setProgramId] = useState('');
  const [present, setPresent] = useState(true);
  const [attendancePoints, setAttendancePoints] = useState('0');
  const [behaviorPoints, setBehaviorPoints] = useState('0');
  const [academicPoints, setAcademicPoints] = useState('0');
  
  // Form validation
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [validForm, setValidForm] = useState(false);
  
  // UI state
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState<StatusType>('info');
  const [showStatus, setShowStatus] = useState(false);
  const [processingState, setProcessingState] = useState<ProcessingState>('form');
  
  // Transaction states
  const { data: hash, isPending, writeContract, error: writeError, reset: resetWrite } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed, error: confirmError } = useWaitForTransactionReceipt({ hash });

  // Records history
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>(externalAttendanceRecords);
  const [reputationHistory, setReputationHistory] = useState<ReputationRecord[]>(externalReputationRecords);

  // Update history if external records change
  useEffect(() => {
    if (externalAttendanceRecords) {
      setAttendanceHistory(externalAttendanceRecords);
    }
    if (externalReputationRecords) {
      setReputationHistory(externalReputationRecords);
    }
  }, [externalAttendanceRecords, externalReputationRecords]);

  // Validation helpers
  const isValidAddress = (address: string): boolean => {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  };

  const isValidProgramId = (id: string): boolean => {
    return /^[1-9]\d*$/.test(id);
  };

  const isValidPoints = (points: string): boolean => {
    return /^\d+$/.test(points);
  };

  // Handle student address input changes
  const handleStudentAddressChange = (value: string) => {
    setStudentAddress(value);
    
    if (!isValidAddress(value) && value !== '') {
      setErrors(prev => ({ ...prev, studentAddress: 'Please enter a valid Ethereum address' }));
    } else {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.studentAddress;
        return newErrors;
      });
    }
  };

  // Handle program ID input changes
  const handleProgramIdChange = (value: string) => {
    setProgramId(value);
    
    if (!isValidProgramId(value) && value !== '') {
      setErrors(prev => ({ ...prev, programId: 'Please enter a valid program ID (positive integer)' }));
    } else {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.programId;
        return newErrors;
      });
    }
  };

  // Handle points input changes
  const handlePointsChange = (value: string, setter: React.Dispatch<React.SetStateAction<string>>, field: string) => {
    setter(value);
    
    if (!isValidPoints(value) && value !== '') {
      setErrors(prev => ({ ...prev, [field]: 'Please enter a valid non-negative integer' }));
    } else {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Validate form
  useEffect(() => {
    if (activeTab === 'attendance') {
      const isStudentAddressValid = studentAddress.trim() !== '' && isValidAddress(studentAddress);
      const isProgramIdValid = programId.trim() !== '' && isValidProgramId(programId);
      const noErrors = Object.keys(errors).length === 0;
      
      setValidForm(isStudentAddressValid && isProgramIdValid && noErrors);
    } else {
      const isStudentAddressValid = studentAddress.trim() !== '' && isValidAddress(studentAddress);
      const isAttendancePointsValid = isValidPoints(attendancePoints);
      const isBehaviorPointsValid = isValidPoints(behaviorPoints);
      const isAcademicPointsValid = isValidPoints(academicPoints);
      const noErrors = Object.keys(errors).length === 0;
      
      setValidForm(isStudentAddressValid && isAttendancePointsValid && isBehaviorPointsValid && isAcademicPointsValid && noErrors);
    }
  }, [activeTab, studentAddress, programId, attendancePoints, behaviorPoints, academicPoints, errors, present]);

  // Reset form
  const resetForm = useCallback(() => {
    setStudentAddress('');
    setProgramId('');
    setPresent(true);
    setAttendancePoints('0');
    setBehaviorPoints('0');
    setAcademicPoints('0');
    setProcessingState('form');
    resetWrite?.();
  }, [resetWrite]);

  // Handle transaction success
  useEffect(() => {
    if (isConfirmed && hash) {
      if (activeTab === 'attendance') {
        // Add attendance record to history
        const newRecord: AttendanceRecord = {
          student: studentAddress,
          programId: programId,
          present: present,
          timestamp: Date.now()
        };
        
        // Update local history
        setAttendanceHistory(prev => [newRecord, ...prev]);
        
        // Call the completion callback if provided
        if (onAttendanceRecorded) {
          onAttendanceRecorded(newRecord, hash);
        }
        
        setStatusMessage(`Attendance record successfully submitted!`);
      } else {
        // Add reputation record to history
        const newRecord: ReputationRecord = {
          student: studentAddress,
          attendancePoints,
          behaviorPoints,
          academicPoints,
          timestamp: Date.now()
        };
        
        // Update local history
        setReputationHistory(prev => [newRecord, ...prev]);
        
        // Call the completion callback if provided
        if (onReputationUpdated) {
          onReputationUpdated(newRecord, hash);
        }
        
        setStatusMessage(`Student reputation updated successfully!`);
      }
      
      setStatusType('success');
      setShowStatus(true);
      setProcessingState('completed');
    }
  }, [isConfirmed, hash, activeTab, studentAddress, programId, present, attendancePoints, behaviorPoints, academicPoints, onAttendanceRecorded, onReputationUpdated]);

  // Handle transaction errors
  useEffect(() => {
    if (writeError || confirmError) {
      const errorMessage = writeError?.message || confirmError?.message || 'An unknown error occurred';
      setStatusMessage(`Transaction failed: ${errorMessage}`);
      setStatusType('error');
      setShowStatus(true);
      setProcessingState('form');
    }
  }, [writeError, confirmError]);

  // Hide status message after a delay
  useEffect(() => {
    if (showStatus) {
      const timer = setTimeout(() => {
        setShowStatus(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showStatus]);

  // Handle form submission
  const handleSubmit = async () => {
    if (!validForm) {
      setStatusMessage('Please fix form errors before submitting');
      setStatusType('error');
      setShowStatus(true);
      return;
    }
    
    try {
      // Reset any previous errors
      resetWrite?.();
      
      // Update UI state
      setProcessingState('submitting');
      setStatusMessage(activeTab === 'attendance' ? 'Submitting attendance record...' : 'Submitting reputation update...');
      setStatusType('info');
      setShowStatus(true);
      
      // Execute the contract write
      if (activeTab === 'attendance') {
        writeContract({
          address: contractAttendanceTrackingConfig.address as `0x${string}`,
          abi: contractAttendanceTrackingConfig.abi,
          functionName: 'recordAttendance',
          args: [
            studentAddress as `0x${string}`,
            BigInt(programId),
            present
          ]
        });
      } else {
        writeContract({
          address: contractAttendanceTrackingConfig.address as `0x${string}`,
          abi: contractAttendanceTrackingConfig.abi,
          functionName: 'updateStudentReputation',
          args: [
            studentAddress as `0x${string}`,
            BigInt(attendancePoints),
            BigInt(behaviorPoints),
            BigInt(academicPoints)
          ]
        });
      }
    } catch (err) {
      console.error('Error submitting transaction:', err);
      setStatusMessage(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setStatusType('error');
      setShowStatus(true);
      setProcessingState('form');
    }
  };

  // Format timestamp for display
  const formatTimestamp = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString();
  };

  // Format address for display
  const formatAddress = (address: string): string => {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  // Handle continue recording after completion
  const continueRecording = () => {
    resetForm();
  };

  // UI Components

  const StatusMessage = () => (
    showStatus && (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3 }}
        className={`p-4 rounded-md mb-6 ${
          statusType === 'success' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 
          statusType === 'error' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 
          statusType === 'warning' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
          'bg-blue-500/20 text-blue-400 border border-blue-500/30'
        }`}
      >
        <div className="flex">
          {statusType === 'success' && (
            <svg className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
          {statusType === 'error' && (
            <svg className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
          {statusType === 'warning' && (
            <svg className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          )}
          {statusType === 'info' && (
            <svg className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
          <div>
            <p className="text-sm font-medium">{statusMessage}</p>
            {hash && (
              <div className="mt-2 pt-2 border-t border-gray-700">
                <p className="text-xs mb-1">Transaction Hash:</p>
                <div className="flex items-center">
                  <p className="text-xs font-mono truncate">{hash}</p>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(hash);
                      setStatusMessage('Transaction hash copied to clipboard!');
                      setStatusType('success');
                    }}
                    className="ml-2 p-1 bg-gray-800 hover:bg-gray-700 rounded text-gray-300"
                    title="Copy to clipboard"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                      <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    )
  );

  const TransactionProgress = () => (
    (isPending || isConfirming) && (
      <div className="flex flex-col items-center justify-center p-6 border border-gray-700 rounded-md bg-gray-800/50 mb-6">
        <div className="flex items-center justify-center mb-4">
          <div className="w-10 h-10 border-4 border-t-blue-400 border-r-purple-500 border-b-blue-400 border-l-purple-500 rounded-full animate-spin mr-4"></div>
          <span className="text-lg text-gray-100 font-medium">{isPending ? 'Waiting for wallet approval...' : 'Confirming transaction...'}</span>
        </div>
        <div className="w-full max-w-md bg-gray-700 rounded-full h-2.5 mb-4">
          <div className={`h-2.5 rounded-full ${isPending ? 'bg-blue-400 w-1/3' : 'bg-purple-500 w-2/3'}`}></div>
        </div>
        <p className="text-sm text-gray-400 text-center">
          {isPending 
            ? 'Please confirm this transaction in your wallet' 
            : 'Transaction has been submitted. Waiting for blockchain confirmation...'}
        </p>
      </div>
    )
  );

  const AttendanceForm = () => (
    <div className="space-y-6">
      <div className="bg-gray-800/50 rounded-lg p-5 border border-gray-700">
        <h3 className="text-lg font-medium text-blue-400 mb-4 flex items-center">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          Record Student Attendance
        </h3>
        <div className="space-y-4">
          {/* Student Address */}
          <div>
            <label htmlFor="studentAddress" className="block text-sm font-medium text-gray-300 mb-1">
              Student Address <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <input
                id="studentAddress"
                type="text"
                value={studentAddress}
                onChange={(e) => handleStudentAddressChange(e.target.value)}
                placeholder="0x..."
                disabled={isPending || isConfirming}
                className={`pl-10 bg-gray-800 border ${errors.studentAddress ? 'border-red-500' : 'border-gray-600'} text-gray-200 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 disabled:opacity-60`}
              />
            </div>
            {errors.studentAddress && (
              <p className="mt-1 text-xs text-red-400">{errors.studentAddress}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              The blockchain address of the student to record attendance for
            </p>
          </div>
          
          {/* Program ID */}
          <div>
            <label htmlFor="programId" className="block text-sm font-medium text-gray-300 mb-1">
              Program ID <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <input
                id="programId"
                type="text"
                value={programId}
                onChange={(e) => handleProgramIdChange(e.target.value)}
                placeholder="1"
                disabled={isPending || isConfirming}
                className={`pl-10 bg-gray-800 border ${errors.programId ? 'border-red-500' : 'border-gray-600'} text-gray-200 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 disabled:opacity-60`}
              />
            </div>
            {errors.programId && (
              <p className="mt-1 text-xs text-red-400">{errors.programId}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              The ID of the educational program to record attendance for
            </p>
          </div>
          
          {/* Attendance Status */}
          <div className="pt-2">
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Attendance Status
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div 
                className={`flex items-center justify-center p-4 rounded-lg cursor-pointer transition-colors ${
                  present ? 
                  'bg-green-900/30 border-2 border-green-500/50 text-green-400' : 
                  'bg-gray-800/50 border border-gray-600 text-gray-400 hover:bg-gray-800'
                }`}
                onClick={() => !isPending && !isConfirming && setPresent(true)}
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-medium">Present</span>
              </div>
              
              <div 
                className={`flex items-center justify-center p-4 rounded-lg cursor-pointer transition-colors ${
                  !present ? 
                  'bg-red-900/30 border-2 border-red-500/50 text-red-400' : 
                  'bg-gray-800/50 border border-gray-600 text-gray-400 hover:bg-gray-800'
                }`}
                onClick={() => !isPending && !isConfirming && setPresent(false)}
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-medium">Absent</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Action Button */}
      <motion.button
        onClick={handleSubmit}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        disabled={!validForm || isPending || isConfirming}
        className={`w-full py-3 px-4 rounded-md text-white font-medium shadow-lg transition-all duration-300 ${
          validForm 
            ? 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700' 
            : 'bg-gray-700 cursor-not-allowed'
        } ${
          isPending || isConfirming ? 'opacity-70' : 'opacity-100'
        }`}
      >
        Record Attendance
      </motion.button>
      
      {/* Attendance History */}
      {attendanceHistory.length > 0 && (
        <div className="mt-4">
          <h3 className="text-lg font-medium mb-4 text-blue-400 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Recent Attendance Records
          </h3>
          <div className="bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-800">
                  <tr>
                    <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Student
                    </th>
                    <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Program ID
                    </th>
                    <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Timestamp
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-gray-800/30 divide-y divide-gray-700">
                  {attendanceHistory.map((record, index) => (
                    <tr key={index} className={index === 0 ? 'bg-blue-900/20' : ''}>
                      <td className="px-3 py-2 whitespace-nowrap text-xs font-mono text-gray-300">
                        {formatAddress(record.student)}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-300">
                        {record.programId}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          record.present ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                        }`}>
                          {record.present ? 'Present' : 'Absent'}
                        </span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-300">
                        {formatTimestamp(record.timestamp)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const ReputationForm = () => (
    <div className="space-y-6">
      <div className="bg-gray-800/50 rounded-lg p-5 border border-gray-700">
        <h3 className="text-lg font-medium text-blue-400 mb-4 flex items-center">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          Update Student Reputation
        </h3>
        <div className="space-y-4">
          {/* Student Address */}
          <div>
            <label htmlFor="reputationStudentAddress" className="block text-sm font-medium text-gray-300 mb-1">
              Student Address <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <input
                id="reputationStudentAddress"
                type="text"
                value={studentAddress}
                onChange={(e) => handleStudentAddressChange(e.target.value)}
                placeholder="0x..."
                disabled={isPending || isConfirming}
                className={`pl-10 bg-gray-800 border ${errors.studentAddress ? 'border-red-500' : 'border-gray-600'} text-gray-200 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 disabled:opacity-60`}
              />
            </div>
            {errors.studentAddress && (
              <p className="mt-1 text-xs text-red-400">{errors.studentAddress}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              The blockchain address of the student to update reputation for
            </p>
          </div>
          
          {/* Points Sliders */}
          <div className="pt-2">
            <h4 className="text-md font-medium text-blue-400 mb-4">Reputation Points</h4>
            
            {/* Attendance Points */}
            <div className="mb-5">
              <div className="flex justify-between items-center">
                <label htmlFor="attendancePoints" className="block text-sm font-medium text-gray-300 mb-1">
                  Attendance Points
                </label>
                <div className="bg-blue-900/30 px-3 py-1 rounded-full">
                  <span className="text-sm font-medium text-blue-400">{attendancePoints}</span>
                </div>
              </div>
              <div className="relative mt-2">
                <div className="absolute inset-y-0 left-0 flex items-center pl-2 pointer-events-none">
                  <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <input
                  id="attendancePoints"
                  type="range"
                  min="0"
                  max="100"
                  value={attendancePoints}
                  onChange={(e) => handlePointsChange(e.target.value, setAttendancePoints, 'attendancePoints')}
                  disabled={isPending || isConfirming}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer disabled:opacity-60"
                  style={{ 
                    accentColor: '#3b82f6', 
                    background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${attendancePoints}%, #374151 ${attendancePoints}%, #374151 100%)` 
                  }}
                />
              </div>
              {errors.attendancePoints && (
                <p className="mt-1 text-xs text-red-400">{errors.attendancePoints}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Points for student attendance and participation
              </p>
            </div>
            
            {/* Behavior Points */}
            <div className="mb-5">
              <div className="flex justify-between items-center">
                <label htmlFor="behaviorPoints" className="block text-sm font-medium text-gray-300 mb-1">
                  Behavior Points
                </label>
                <div className="bg-purple-900/30 px-3 py-1 rounded-full">
                  <span className="text-sm font-medium text-purple-400">{behaviorPoints}</span>
                </div>
              </div>
              <div className="relative mt-2">
                <div className="absolute inset-y-0 left-0 flex items-center pl-2 pointer-events-none">
                  <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <input
                  id="behaviorPoints"
                  type="range"
                  min="0"
                  max="100"
                  value={behaviorPoints}
                  onChange={(e) => handlePointsChange(e.target.value, setBehaviorPoints, 'behaviorPoints')}
                  disabled={isPending || isConfirming}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer disabled:opacity-60"
                  style={{ 
                    accentColor: '#a855f7', 
                    background: `linear-gradient(to right, #a855f7 0%, #a855f7 ${behaviorPoints}%, #374151 ${behaviorPoints}%, #374151 100%)` 
                  }}
                />
              </div>
              {errors.behaviorPoints && (
                <p className="mt-1 text-xs text-red-400">{errors.behaviorPoints}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Points for student behavior and conduct
              </p>
            </div>
            
            {/* Academic Points */}
            <div>
              <div className="flex justify-between items-center">
                <label htmlFor="academicPoints" className="block text-sm font-medium text-gray-300 mb-1">
                  Academic Points
                </label>
                <div className="bg-green-900/30 px-3 py-1 rounded-full">
                  <span className="text-sm font-medium text-green-400">{academicPoints}</span>
                </div>
              </div>
              <div className="relative mt-2">
                <div className="absolute inset-y-0 left-0 flex items-center pl-2 pointer-events-none">
                  <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <input
                  id="academicPoints"
                  type="range"
                  min="0"
                  max="100"
                  value={academicPoints}
                  onChange={(e) => handlePointsChange(e.target.value, setAcademicPoints, 'academicPoints')}
                  disabled={isPending || isConfirming}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer disabled:opacity-60"
                  style={{ 
                    accentColor: '#22c55e', 
                    background: `linear-gradient(to right, #22c55e 0%, #22c55e ${academicPoints}%, #374151 ${academicPoints}%, #374151 100%)` 
                  }}
                />
              </div>
              {errors.academicPoints && (
                <p className="mt-1 text-xs text-red-400">{errors.academicPoints}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Points for student academic performance
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Total Reputation Preview */}
      <div className="bg-gray-800/30 p-5 rounded-lg border border-gray-700">
        <h3 className="text-md font-medium text-blue-400 mb-4 flex items-center">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
          </svg>
          Reputation Summary
        </h3>
        
        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col items-center p-3 bg-gray-800/50 rounded-lg border border-blue-800/50">
            <span className="text-blue-400 text-xs mb-1">Attendance</span>
            <span className="text-2xl font-bold text-blue-400">{attendancePoints}</span>
          </div>
          <div className="flex flex-col items-center p-3 bg-gray-800/50 rounded-lg border border-purple-800/50">
            <span className="text-purple-400 text-xs mb-1">Behavior</span>
            <span className="text-2xl font-bold text-purple-400">{behaviorPoints}</span>
          </div>
          <div className="flex flex-col items-center p-3 bg-gray-800/50 rounded-lg border border-green-800/50">
            <span className="text-green-400 text-xs mb-1">Academic</span>
            <span className="text-2xl font-bold text-green-400">{academicPoints}</span>
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t border-gray-700">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-300">Total Reputation Points</span>
            <span className="text-xl font-semibold bg-gradient-to-r from-blue-400 via-purple-400 to-green-400 bg-clip-text text-transparent">
              {Number(attendancePoints) + Number(behaviorPoints) + Number(academicPoints)}
            </span>
          </div>
          
          {/* Total points visualization */}
          <div className="h-4 bg-gray-700 rounded-full mt-2 overflow-hidden">
            <div className="h-full flex">
              <div 
                className="bg-blue-500 h-full" 
                style={{ width: `${(Number(attendancePoints) / (Number(attendancePoints) + Number(behaviorPoints) + Number(academicPoints))) * 100}%` }}
              ></div>
              <div 
                className="bg-purple-500 h-full" 
                style={{ width: `${(Number(behaviorPoints) / (Number(attendancePoints) + Number(behaviorPoints) + Number(academicPoints))) * 100}%` }}
              ></div>
              <div 
                className="bg-green-500 h-full" 
                style={{ width: `${(Number(academicPoints) / (Number(attendancePoints) + Number(behaviorPoints) + Number(academicPoints))) * 100}%` }}
              ></div>
            </div>
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-xs text-blue-400">Attendance</span>
            <span className="text-xs text-purple-400">Behavior</span>
            <span className="text-xs text-green-400">Academic</span>
          </div>
        </div>
      </div>
      
      {/* Action Button */}
      <motion.button
        onClick={handleSubmit}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        disabled={!validForm || isPending || isConfirming}
        className={`w-full py-3 px-4 rounded-md text-white font-medium shadow-lg transition-all duration-300 ${
          validForm 
            ? 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700' 
            : 'bg-gray-700 cursor-not-allowed'
        } ${
          isPending || isConfirming ? 'opacity-70' : 'opacity-100'
        }`}
      >
        Update Student Reputation
      </motion.button>
      
      {/* Reputation History */}
      {reputationHistory.length > 0 && (
        <div className="mt-4">
          <h3 className="text-lg font-medium mb-4 text-blue-400 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Recent Reputation Updates
          </h3>
          <div className="bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-800">
                  <tr>
                    <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Student
                    </th>
                    <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-blue-400 uppercase tracking-wider">
                      Attend.
                    </th>
                    <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-purple-400 uppercase tracking-wider">
                      Behavior
                    </th>
                    <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-green-400 uppercase tracking-wider">
                      Academic
                    </th>
                    <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Total
                    </th>
                    <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Timestamp
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-gray-800/30 divide-y divide-gray-700">
                  {reputationHistory.map((record, index) => (
                    <tr key={index} className={index === 0 ? 'bg-blue-900/20' : ''}>
                      <td className="px-3 py-2 whitespace-nowrap text-xs font-mono text-gray-300">
                        {formatAddress(record.student)}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-blue-400 font-medium">
                        {record.attendancePoints}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-purple-400 font-medium">
                        {record.behaviorPoints}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-green-400 font-medium">
                        {record.academicPoints}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs font-medium text-white">
                        {Number(record.attendancePoints) + Number(record.behaviorPoints) + Number(record.academicPoints)}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-300">
                        {formatTimestamp(record.timestamp)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const CompletedState = () => (
    <div className="space-y-6">
      <div className="bg-green-900/30 border border-green-700/50 rounded-md p-6 text-center">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-4 text-green-500" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        </motion.div>
        <h3 className="text-xl font-semibold text-green-400">
          {activeTab === 'attendance' ? 'Attendance Recorded Successfully' : 'Reputation Updated Successfully'}
        </h3>
        <p className="text-gray-300 mt-2">
          {activeTab === 'attendance' 
            ? 'The attendance record has been successfully submitted to the blockchain.' 
            : 'The student reputation has been successfully updated on the blockchain.'}
        </p>
      </div>
      
      {/* Transaction Details */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-md p-4">
        <h3 className="text-md font-semibold text-blue-400 mb-2">Transaction Details</h3>
        
        <div className="mt-3">
          <p className="text-sm text-gray-400 mb-1">Transaction Hash</p>
          <div className="flex items-center">
            <div className="font-mono text-xs bg-gray-800 p-2 rounded-md text-gray-300 overflow-x-auto max-w-full flex-1 break-all">
              {hash}
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(hash || '');
                setStatusMessage('Transaction hash copied to clipboard!');
                setStatusType('success');
                setShowStatus(true);
              }}
              className="ml-2 p-2 bg-gray-700 hover:bg-gray-600 rounded-md text-gray-300"
              title="Copy to clipboard"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      
      {/* Record Summary */}
      {activeTab === 'attendance' && attendanceHistory.length > 0 && (
        <div className="bg-gray-800/50 border border-gray-700 rounded-md p-4">
          <h3 className="text-md font-semibold text-blue-400 mb-3">Attendance Record Summary</h3>
          
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div className="md:col-span-2">
              <dt className="text-gray-400">Student Address</dt>
              <dd className="font-mono text-gray-300 break-all">{attendanceHistory[0]?.student}</dd>
            </div>
            <div>
              <dt className="text-gray-400">Program ID</dt>
              <dd className="text-gray-300">{attendanceHistory[0]?.programId}</dd>
            </div>
            <div>
              <dt className="text-gray-400">Attendance Status</dt>
              <dd className="text-gray-300 flex items-center">
                <span className={`inline-block w-2 h-2 rounded-full mr-2 ${attendanceHistory[0]?.present ? 'bg-green-500' : 'bg-red-500'}`}></span>
                {attendanceHistory[0]?.present ? 'Present' : 'Absent'}
              </dd>
            </div>
            <div className="md:col-span-2">
              <dt className="text-gray-400">Timestamp</dt>
              <dd className="text-gray-300">{formatTimestamp(attendanceHistory[0]?.timestamp || Date.now())}</dd>
            </div>
          </dl>
        </div>
      )}
      
      {/* Reputation Summary */}
      {activeTab === 'reputation' && reputationHistory.length > 0 && (
        <div className="bg-gray-800/50 border border-gray-700 rounded-md p-4">
          <h3 className="text-md font-semibold text-blue-400 mb-3">Reputation Update Summary</h3>
          
          <dl className="grid grid-cols-1 gap-y-2 text-sm mb-4">
            <div>
              <dt className="text-gray-400">Student Address</dt>
              <dd className="font-mono text-gray-300 break-all">{reputationHistory[0]?.student}</dd>
            </div>
            <div>
              <dt className="text-gray-400">Timestamp</dt>
              <dd className="text-gray-300">{formatTimestamp(reputationHistory[0]?.timestamp || Date.now())}</dd>
            </div>
          </dl>
          
          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="flex flex-col items-center p-3 bg-gray-800/50 rounded-lg border border-blue-800/50">
              <span className="text-blue-400 text-xs mb-1">Attendance</span>
              <span className="text-2xl font-bold text-blue-400">{reputationHistory[0]?.attendancePoints}</span>
            </div>
            <div className="flex flex-col items-center p-3 bg-gray-800/50 rounded-lg border border-purple-800/50">
              <span className="text-purple-400 text-xs mb-1">Behavior</span>
              <span className="text-2xl font-bold text-purple-400">{reputationHistory[0]?.behaviorPoints}</span>
            </div>
            <div className="flex flex-col items-center p-3 bg-gray-800/50 rounded-lg border border-green-800/50">
              <span className="text-green-400 text-xs mb-1">Academic</span>
              <span className="text-2xl font-bold text-green-400">{reputationHistory[0]?.academicPoints}</span>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-gray-700">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-300">Total Reputation</span>
              <span className="text-xl font-semibold bg-gradient-to-r from-blue-400 via-purple-400 to-green-400 bg-clip-text text-transparent">
                {Number(reputationHistory[0]?.attendancePoints) + 
                 Number(reputationHistory[0]?.behaviorPoints) + 
                 Number(reputationHistory[0]?.academicPoints)}
              </span>
            </div>
          </div>
        </div>
      )}
      
      {/* Action Buttons */}
      <div className="flex space-x-3">
        <motion.button
          onClick={continueRecording}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex-1 py-3 px-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium rounded-md shadow-lg transition-all duration-300"
        >
          {activeTab === 'attendance' ? 'Record Another Attendance' : 'Update Another Student'}
        </motion.button>
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-5xl">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-gray-900/90 backdrop-blur-sm border border-gray-700 shadow-xl rounded-lg overflow-hidden"
      >
        {/* Header with background gradient */}
        <div className="bg-gradient-to-r from-blue-900 to-purple-900 p-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
          <div className="relative z-10">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              Student Management System
            </h2>
            <p className="text-blue-100 mt-1">
              Record attendance and manage student reputation on the blockchain
            </p>
          </div>
        </div>
        
        {/* Tab Navigation */}
        <div className="flex border-b border-gray-700">
          <button
            onClick={() => setActiveTab('attendance')}
            className={`flex-1 py-4 px-4 text-center transition-all ${
              activeTab === 'attendance'
                ? 'text-blue-400 border-b-2 border-blue-500 font-medium'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            <div className="flex items-center justify-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Attendance Recorder
            </div>
          </button>
          <button
            onClick={() => setActiveTab('reputation')}
            className={`flex-1 py-4 px-4 text-center transition-all ${
              activeTab === 'reputation'
                ? 'text-purple-400 border-b-2 border-purple-500 font-medium'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            <div className="flex items-center justify-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Reputation Manager
            </div>
          </button>
        </div>
        
        {/* Main Content Area */}
        <div className="p-6">
          <StatusMessage />
          <TransactionProgress />
          
          <AnimatePresence mode="wait">
            {processingState === 'form' ? (
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                {activeTab === 'attendance' ? <AttendanceForm /> : <ReputationForm />}
              </motion.div>
            ) : processingState === 'completed' ? (
              <motion.div
                key="completed"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <CompletedState />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

export default StudentManagementSystem;