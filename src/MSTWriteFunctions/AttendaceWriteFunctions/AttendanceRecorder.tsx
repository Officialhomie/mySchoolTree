import { useState, useEffect } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { motion } from 'framer-motion';

type AttendanceRecord = {
  student: string;
  programId: string;
  present: boolean;
  timestamp: number;
};

const AttendanceRecorder = ({ contract }: { contract: any }) => {
  // Form state
  const [studentAddress, setStudentAddress] = useState('');
  const [programId, setProgramId] = useState('');
  const [present, setPresent] = useState(true);
  
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

  // Record attendance history
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([]);

  // Input validation for ethereum addresses
  const isValidAddress = (address: string): boolean => {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  };

  // Input validation for program ID (positive integer)
  const isValidProgramId = (id: string): boolean => {
    return /^[1-9]\d*$/.test(id);
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

  // Validate the entire form
  useEffect(() => {
    const isStudentAddressValid = studentAddress.trim() !== '' && isValidAddress(studentAddress);
    const isProgramIdValid = programId.trim() !== '' && isValidProgramId(programId);
    const noErrors = Object.keys(errors).length === 0;
    
    setValidForm(isStudentAddressValid && isProgramIdValid && noErrors);
  }, [studentAddress, programId, errors]);

  // Handle transaction success
  useEffect(() => {
    if (isConfirmed && hash) {
      // Add the record to history
      const newRecord: AttendanceRecord = {
        student: studentAddress,
        programId: programId,
        present: present,
        timestamp: Date.now()
      };
      
      setAttendanceHistory(prev => [newRecord, ...prev]);
      
      setStatusMessage(`Attendance record successfully submitted!`);
      setStatusType('success');
      setShowStatus(true);
      setProcessingState('completed');
      
      // Reset form for next entry
      setStudentAddress('');
      setProgramId('');
      setPresent(true);
    }
  }, [isConfirmed, hash, studentAddress, programId, present]);

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

  // Handle the record attendance process
  const recordAttendance = async () => {
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
      setStatusMessage('Submitting attendance record...');
      setStatusType('info');
      setShowStatus(true);
      
      // Execute the contract write
      writeContract({
        ...contract,
        functionName: 'recordAttendance',
        args: [
          studentAddress,
          BigInt(programId),
          present
        ]
      });
    } catch (err) {
      console.error('Error recording attendance:', err);
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

  // Handle continue recording after completion
  const continueRecording = () => {
    setProcessingState('form');
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-gray-900/90 backdrop-blur-sm border border-gray-700 shadow-xl rounded-lg p-6 max-w-full mx-auto w-full md:max-w-full mb-9"
    >
      <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
        Attendance Recorder
      </h2>
      
      <p className="text-gray-300 text-sm mb-6">
        Record student attendance for educational programs.
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
                  The blockchain address of the student to record attendance for
                </p>
              </div>
              
              {/* Program ID */}
              <div>
                <label htmlFor="programId" className="block text-sm font-medium text-gray-300 mb-1">
                  Program ID <span className="text-red-400">*</span>
                </label>
                <input
                  id="programId"
                  type="text"
                  value={programId}
                  onChange={(e) => handleProgramIdChange(e.target.value)}
                  placeholder="1"
                  disabled={isPending || isConfirming}
                  className={`bg-gray-800 border ${errors.programId ? 'border-red-500' : 'border-gray-600'} text-gray-200 text-sm rounded-lg focus:ring-blue-500 focus:border-purple-500 block w-full p-2.5 disabled:opacity-60`}
                />
                {errors.programId && (
                  <p className="mt-1 text-xs text-red-400">{errors.programId}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  The ID of the educational program to record attendance for
                </p>
              </div>
              
              {/* Attendance Status */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Attendance Status
                </label>
                <div className="flex items-center space-x-4">
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      checked={present}
                      onChange={() => setPresent(true)}
                      className="form-radio h-4 w-4 text-blue-500 border-gray-600 bg-gray-800 focus:ring-blue-500"
                      disabled={isPending || isConfirming}
                    />
                    <span className="ml-2 text-sm text-gray-300">Present</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      checked={!present}
                      onChange={() => setPresent(false)}
                      className="form-radio h-4 w-4 text-red-500 border-gray-600 bg-gray-800 focus:ring-red-500"
                      disabled={isPending || isConfirming}
                    />
                    <span className="ml-2 text-sm text-gray-300">Absent</span>
                  </label>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Record whether the student was present or absent
                </p>
              </div>
            </div>
          </div>
          
          {/* Action Button */}
          <motion.button
            onClick={recordAttendance}
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
            <div className="mt-8">
              <h3 className="text-lg font-medium mb-4 text-blue-400">Recent Attendance Records</h3>
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
                        <tr key={index}>
                          <td className="px-3 py-2 whitespace-nowrap text-xs font-mono text-gray-300">
                            {record.student.substring(0, 8)}...{record.student.substring(record.student.length - 6)}
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
      )}

      {/* Completed State */}
      {processingState === 'completed' && (
        <div className="space-y-6">
          <div className="bg-green-900/30 border border-green-700/50 rounded-md p-4 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto mb-2 text-green-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <h3 className="text-lg font-semibold text-green-400">Attendance Recorded Successfully</h3>
            <p className="text-sm text-gray-300 mt-2">
              The attendance record has been successfully submitted to the blockchain.
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
          <div className="bg-gray-800/50 border border-gray-700 rounded-md p-4">
            <h3 className="text-md font-semibold text-blue-400 mb-2">Record Summary</h3>
            
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
          
          {/* Action Buttons */}
          <div className="flex space-x-3">
            <motion.button
              onClick={continueRecording}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex-1 py-3 px-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium rounded-md shadow-lg transition-all duration-300"
            >
              Record Another Attendance
            </motion.button>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default AttendanceRecorder;