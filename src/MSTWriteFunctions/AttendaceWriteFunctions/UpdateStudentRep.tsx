import { useState, useEffect, useCallback } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { motion } from 'framer-motion';
import { contractAttendanceTrackingConfig } from '../../contracts';

export type ReputationRecord = {
  student: string;
  attendancePoints: string;
  behaviorPoints: string;
  academicPoints: string;
  timestamp: number;
};

export type ReputationUpdaterExports = {
  reputationHistory: ReputationRecord[];
  updateReputation: (studentAddress: string, attendancePoints: string, behaviorPoints: string, academicPoints: string) => Promise<void>;
  isUpdating: boolean;
  lastTransactionHash: string | null;
  resetForm: () => void;
};

type StudentReputationUpdaterProps = {
  onUpdateComplete?: (record: ReputationRecord, hash: string) => void;
  onExport?: (exports: ReputationUpdaterExports) => void;
  externalRecords?: ReputationRecord[];
};

const StudentReputationUpdater = ({ 
  onUpdateComplete,
  onExport,
  externalRecords
}: StudentReputationUpdaterProps) => {
  // Form state
  const [studentAddress, setStudentAddress] = useState('');
  const [attendancePoints, setAttendancePoints] = useState('0');
  const [behaviorPoints, setBehaviorPoints] = useState('0');
  const [academicPoints, setAcademicPoints] = useState('0');
  
  // Form validation
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [validForm, setValidForm] = useState(false);
  
  // UI state
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState<'success' | 'error' | 'info' | 'warning'>('info');
  const [showStatus, setShowStatus] = useState(false);
  const [processingState, setProcessingState] = useState<'form' | 'submitting' | 'completed'>('form');
  
  // Transaction states
  const { data: hash, isPending, writeContract, error: writeError, reset: resetWrite } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed, error: confirmError } = useWaitForTransactionReceipt({ hash });

  // Record reputation history
  const [reputationHistory, setReputationHistory] = useState<ReputationRecord[]>(externalRecords || []);

  // Update history if external records change
  useEffect(() => {
    if (externalRecords) {
      setReputationHistory(externalRecords);
    }
  }, [externalRecords]);

  // Input validation for ethereum addresses
  const isValidAddress = (address: string): boolean => {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  };

  // Input validation for points (non-negative integer)
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

  // Validate the entire form
  useEffect(() => {
    const isStudentAddressValid = studentAddress.trim() !== '' && isValidAddress(studentAddress);
    const isAttendancePointsValid = isValidPoints(attendancePoints);
    const isBehaviorPointsValid = isValidPoints(behaviorPoints);
    const isAcademicPointsValid = isValidPoints(academicPoints);
    const noErrors = Object.keys(errors).length === 0;
    
    setValidForm(isStudentAddressValid && isAttendancePointsValid && isBehaviorPointsValid && isAcademicPointsValid && noErrors);
  }, [studentAddress, attendancePoints, behaviorPoints, academicPoints, errors]);

  // Reset form
  const resetForm = useCallback(() => {
    setStudentAddress('');
    setAttendancePoints('0');
    setBehaviorPoints('0');
    setAcademicPoints('0');
    setProcessingState('form');
    resetWrite?.();
  }, [resetWrite]);

  // Handle transaction success
  useEffect(() => {
    if (isConfirmed && hash) {
      // Add the record to history
      const newRecord: ReputationRecord = {
        student: studentAddress,
        attendancePoints,
        behaviorPoints,
        academicPoints,
        timestamp: Date.now()
      };
      
      // Update local history
      setReputationHistory(prev => {
        const updatedHistory = [newRecord, ...prev];
        return updatedHistory;
      });
      
      // Call the completion callback if provided
      if (onUpdateComplete) {
        onUpdateComplete(newRecord, hash);
      }
      
      setStatusMessage(`Student reputation updated successfully!`);
      setStatusType('success');
      setShowStatus(true);
      setProcessingState('completed');
    }
  }, [isConfirmed, hash, studentAddress, attendancePoints, behaviorPoints, academicPoints, onUpdateComplete]);

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

  // Export the component's functionality
  useEffect(() => {
    if (onExport) {
      const exports: ReputationUpdaterExports = {
        reputationHistory,
        updateReputation: async (studentAddr, attPoints, behPoints, acadPoints) => {
          setStudentAddress(studentAddr);
          setAttendancePoints(attPoints);
          setBehaviorPoints(behPoints);
          setAcademicPoints(acadPoints);
          
          // Force validation
          if (!isValidAddress(studentAddr)) {
            throw new Error('Invalid student address');
          }
          
          if (!isValidPoints(attPoints) || !isValidPoints(behPoints) || !isValidPoints(acadPoints)) {
            throw new Error('Invalid points value');
          }
          
          // Trigger the update process
          try {
            setProcessingState('submitting');
            setStatusMessage('Submitting reputation update...');
            setStatusType('info');
            setShowStatus(true);
            
            writeContract({
              address: contractAttendanceTrackingConfig.address as `0x${string}`,
              abi: contractAttendanceTrackingConfig.abi,
              functionName: 'updateStudentReputation',
              args: [
                studentAddr as `0x${string}`,
                BigInt(attPoints),
                BigInt(behPoints),
                BigInt(acadPoints)
              ]
            });
          } catch (err) {
            console.error('Error updating reputation:', err);
            setStatusMessage(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
            setStatusType('error');
            setShowStatus(true);
            setProcessingState('form');
            throw err;
          }
        },
        isUpdating: isPending || isConfirming,
        lastTransactionHash: hash || null,
        resetForm
      };
      
      onExport(exports);
    }
  }, [reputationHistory, isPending, isConfirming, hash, onExport, resetForm]);

  // Handle the update reputation process
  const updateReputation = async () => {
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
      setStatusMessage('Submitting reputation update...');
      setStatusType('info');
      setShowStatus(true);
      
      // Execute the contract write using the imported contract config
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
    } catch (err) {
      console.error('Error updating reputation:', err);
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

  // Handle continue updating after completion
  const continueUpdating = () => {
    resetForm();
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-gray-900/90 backdrop-blur-sm border border-gray-700 shadow-xl rounded-lg p-6 max-w-full mx-auto w-full md:max-w-full mb-9"
    >
      <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
        Student Reputation Manager
      </h2>
      
      <p className="text-gray-300 text-sm mb-6">
        Update student reputation based on attendance, behavior, and academic performance.
      </p>

      {/* Status Messages */}
      {showStatus && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className={`p-3 rounded-md mb-6 ${
            statusType === 'success' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 
            statusType === 'error' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 
            statusType === 'warning' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
            'bg-blue-500/20 text-blue-400 border border-blue-500/30'
          }`}
        >
          <p className="text-sm">{statusMessage}</p>
          {hash && (
            <div className="mt-2 pt-2 border-t border-gray-700">
              <p className="text-xs">Transaction Hash:</p>
              <div className="flex items-center mt-1">
                <p className="text-xs font-mono truncate">{hash}</p>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(hash);
                    setStatusMessage('Transaction hash copied to clipboard!');
                    setStatusType('success');
                  }}
                  className="ml-2 p-1 bg-gray-800 hover:bg-gray-700 rounded text-gray-300"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                    <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                  </svg>
                </button>
              </div>
            
              <div className="mt-3 pt-3 border-t border-gray-700">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-300">Total Reputation Points</span>
                  <span className="text-lg font-semibold text-white">
                    {Number(reputationHistory[0]?.attendancePoints) + 
                     Number(reputationHistory[0]?.behaviorPoints) + 
                     Number(reputationHistory[0]?.academicPoints)}
                  </span>
                </div>
                <p className="mt-2 text-xs text-gray-400">
                  Reputation updated at {formatTimestamp(reputationHistory[0]?.timestamp || Date.now())}
                </p>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Transaction Progress */}
      {(isPending || isConfirming) && (
        <div className="flex flex-col items-center justify-center p-4 border border-gray-700 rounded-md bg-gray-800/50 mb-6">
          <div className="flex items-center justify-center mb-3">
            <div className="w-8 h-8 border-4 border-t-blue-400 border-r-purple-500 border-b-blue-400 border-l-purple-500 rounded-full animate-spin mr-3"></div>
            <span className="text-gray-300">{isPending ? 'Waiting for wallet approval...' : 'Confirming transaction...'}</span>
          </div>
          <p className="text-xs text-gray-400 text-center">
            {isPending 
              ? 'Please confirm this transaction in your wallet' 
              : 'Transaction has been submitted. Waiting for blockchain confirmation...'}
          </p>
        </div>
      )}

      {/* Form State */}
      {processingState === 'form' && (
        <div className="space-y-6">
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <div className="space-y-4">
              {/* Student Address */}
              <div>
                <label htmlFor="studentAddress" className="block text-sm font-medium text-gray-300 mb-1">
                  Student Address <span className="text-red-400">*</span>
                </label>
                <input
                  id="studentAddress"
                  type="text"
                  value={studentAddress}
                  onChange={(e) => handleStudentAddressChange(e.target.value)}
                  placeholder="0x..."
                  disabled={isPending || isConfirming}
                  className={`bg-gray-800 border ${errors.studentAddress ? 'border-red-500' : 'border-gray-600'} text-gray-200 text-sm rounded-lg focus:ring-blue-500 focus:border-purple-500 block w-full p-2.5 disabled:opacity-60`}
                />
                {errors.studentAddress && (
                  <p className="mt-1 text-xs text-red-400">{errors.studentAddress}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  The blockchain address of the student to update reputation for
                </p>
              </div>
              
              {/* Points Sliders */}
              <div className="pt-2">
                <h3 className="text-md font-medium text-blue-400 mb-4">Reputation Points</h3>
                
                {/* Attendance Points */}
                <div className="mb-4">
                  <div className="flex justify-between items-center">
                    <label htmlFor="attendancePoints" className="block text-sm font-medium text-gray-300 mb-1">
                      Attendance Points
                    </label>
                    <input
                      type="number"
                      value={attendancePoints}
                      onChange={(e) => handlePointsChange(e.target.value, setAttendancePoints, 'attendancePoints')}
                      min="0"
                      max="100"
                      disabled={isPending || isConfirming}
                      className={`w-16 bg-gray-800 border ${errors.attendancePoints ? 'border-red-500' : 'border-gray-600'} text-gray-200 text-sm rounded-lg focus:ring-blue-500 focus:border-purple-500 p-1 text-center`}
                    />
                  </div>
                  <input
                    id="attendancePoints"
                    type="range"
                    min="0"
                    max="100"
                    value={attendancePoints}
                    onChange={(e) => handlePointsChange(e.target.value, setAttendancePoints, 'attendancePoints')}
                    disabled={isPending || isConfirming}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500 disabled:opacity-60"
                  />
                  {errors.attendancePoints && (
                    <p className="mt-1 text-xs text-red-400">{errors.attendancePoints}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    Points for student attendance and participation
                  </p>
                </div>
                
                {/* Behavior Points */}
                <div className="mb-4">
                  <div className="flex justify-between items-center">
                    <label htmlFor="behaviorPoints" className="block text-sm font-medium text-gray-300 mb-1">
                      Behavior Points
                    </label>
                    <input
                      type="number"
                      value={behaviorPoints}
                      onChange={(e) => handlePointsChange(e.target.value, setBehaviorPoints, 'behaviorPoints')}
                      min="0"
                      max="100"
                      disabled={isPending || isConfirming}
                      className={`w-16 bg-gray-800 border ${errors.behaviorPoints ? 'border-red-500' : 'border-gray-600'} text-gray-200 text-sm rounded-lg focus:ring-blue-500 focus:border-purple-500 p-1 text-center`}
                    />
                  </div>
                  <input
                    id="behaviorPoints"
                    type="range"
                    min="0"
                    max="100"
                    value={behaviorPoints}
                    onChange={(e) => handlePointsChange(e.target.value, setBehaviorPoints, 'behaviorPoints')}
                    disabled={isPending || isConfirming}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500 disabled:opacity-60"
                  />
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
                    <input
                      type="number"
                      value={academicPoints}
                      onChange={(e) => handlePointsChange(e.target.value, setAcademicPoints, 'academicPoints')}
                      min="0"
                      max="100"
                      disabled={isPending || isConfirming}
                      className={`w-16 bg-gray-800 border ${errors.academicPoints ? 'border-red-500' : 'border-gray-600'} text-gray-200 text-sm rounded-lg focus:ring-blue-500 focus:border-purple-500 p-1 text-center`}
                    />
                  </div>
                  <input
                    id="academicPoints"
                    type="range"
                    min="0"
                    max="100"
                    value={academicPoints}
                    onChange={(e) => handlePointsChange(e.target.value, setAcademicPoints, 'academicPoints')}
                    disabled={isPending || isConfirming}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-green-500 disabled:opacity-60"
                  />
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
          <div className="bg-gray-800/30 p-4 rounded-lg border border-gray-700">
            <h3 className="text-md font-medium text-gray-300 mb-3">Reputation Summary</h3>
            
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
            
            <div className="mt-3 pt-3 border-t border-gray-700">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-300">Total Reputation Points</span>
                <span className="text-lg font-semibold text-white">
                  {Number(attendancePoints) + Number(behaviorPoints) + Number(academicPoints)}
                </span>
              </div>
            </div>
          </div>
          
          {/* Action Button */}
          <motion.button
            onClick={updateReputation}
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
            <div className="mt-8">
              <h3 className="text-lg font-medium mb-4 text-blue-400">Recent Reputation Updates</h3>
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
                          Timestamp
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-gray-800/30 divide-y divide-gray-700">
                      {reputationHistory.map((record, index) => (
                        <tr key={index}>
                          <td className="px-3 py-2 whitespace-nowrap text-xs font-mono text-gray-300">
                            {record.student.substring(0, 8)}...{record.student.substring(record.student.length - 6)}
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
      )}

      {/* Completed State */}
      {processingState === 'completed' && (
        <div className="space-y-6">
          <div className="bg-green-900/30 border border-green-700/50 rounded-md p-4 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto mb-2 text-green-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <h3 className="text-lg font-semibold text-green-400">Reputation Updated Successfully</h3>
            <p className="text-sm text-gray-300 mt-2">
              The student reputation has been successfully updated on the blockchain.
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
          
          {/* Update Summary */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-md p-4">
            <h3 className="text-md font-semibold text-blue-400 mb-3">Update Summary</h3>
            
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-sm mb-4">
              <div className="md:col-span-2">
                <dt className="text-gray-400">Student Address</dt>
                <dd className="font-mono text-gray-300 break-all">{reputationHistory[0]?.student}</dd>
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
          </div>
          
          {/* Action Buttons */}
          <div className="flex space-x-3">
            <motion.button
              onClick={continueUpdating}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex-1 py-3 px-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium rounded-md shadow-lg transition-all duration-300"
            >
              Update Another Student
            </motion.button>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default StudentReputationUpdater;