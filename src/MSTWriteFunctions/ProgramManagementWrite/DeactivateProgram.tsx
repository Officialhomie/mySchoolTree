import { useState, useEffect } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { motion } from 'framer-motion';
import { useProgramStatus } from '../../MSTReadfunction/ProgramManagementRead/isProgramActive';

// Sample program data structure for display purposes
interface Program {
  id: number;
  name: string;
  termFee: string;
  requiredAttendance: number;
  maxEnrollment: number;
  enrolledStudents: number;
}

const DeactivateProgramComponent = ({ 
  contract, 
  programs = [],
  onSuccess = () => {}
}: { 
  contract: any, 
  programs?: Program[],
  onSuccess?: () => void
}) => {
  // Form state
  const [selectedProgramId, setSelectedProgramId] = useState<string>('');
  const [confirmText, setConfirmText] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isStatusVerified, setIsStatusVerified] = useState(false);
  
  // UI state
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState<'success' | 'error' | 'info' | 'warning'>('info');
  const [showStatus, setShowStatus] = useState(false);
  const [processingState, setProcessingState] = useState<'initial' | 'verifying' | 'confirmation' | 'processing' | 'completed'>('initial');
  
  // Selected program details
  const selectedProgram = programs.find(p => p.id.toString() === selectedProgramId);
  
  // Use the program status hook to check if the program is active
  const { 
    isActive, 
    isPending: isStatusCheckPending, 
    isError: isStatusCheckError,
    error: statusCheckError,
    refetch: refetchStatus
  } = useProgramStatus(selectedProgramId ? selectedProgramId.toString() : undefined);
  
  // Transaction state
  const { data: hash, isPending, writeContract, error: writeError, reset: resetWrite } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed, error: confirmError } = useWaitForTransactionReceipt({ hash });

  // Reset status verification when program selection changes
  useEffect(() => {
    setIsStatusVerified(false);
    setConfirmText('');
    setShowConfirmation(false);
    setProcessingState('initial');
  }, [selectedProgramId]);
  
  // Handle program status check results
  useEffect(() => {
    if (processingState === 'verifying' && !isStatusCheckPending) {
      if (isStatusCheckError) {
        setStatusMessage(`Error checking program status: ${statusCheckError?.message || 'Unknown error'}`);
        setStatusType('error');
        setShowStatus(true);
        setProcessingState('initial');
        return;
      }
      
      if (isActive === false) {
        setStatusMessage('This program is already inactive. No action needed.');
        setStatusType('warning');
        setShowStatus(true);
        setProcessingState('initial');
        return;
      }
      
      if (isActive === true) {
        setIsStatusVerified(true);
        setProcessingState('confirmation');
        setShowConfirmation(true);
      }
    }
  }, [isActive, isStatusCheckPending, isStatusCheckError, statusCheckError, processingState]);

  // Handle transaction success
  useEffect(() => {
    if (isConfirmed && hash) {
      setStatusMessage(`Program successfully deactivated!`);
      setStatusType('success');
      setShowStatus(true);
      setProcessingState('completed');
      
      // Call the success callback if provided
      onSuccess();
    }
  }, [isConfirmed, hash, onSuccess]);

  // Handle transaction errors
  useEffect(() => {
    if (writeError || confirmError) {
      const errorMessage = writeError?.message || confirmError?.message || 'An unknown error occurred';
      setStatusMessage(`Transaction failed: ${errorMessage}`);
      setStatusType('error');
      setShowStatus(true);
      setProcessingState('initial');
      setShowConfirmation(false);
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

  // Handle the initial verification step
  const handleInitiateDeactivation = () => {
    if (!selectedProgramId) {
      setStatusMessage('Please select a program to deactivate');
      setStatusType('error');
      setShowStatus(true);
      return;
    }
    
    // Set verifying state and verify program status on-chain
    setProcessingState('verifying');
    setStatusMessage('Checking program status on the blockchain...');
    setStatusType('info');
    setShowStatus(true);
    
    // Trigger the status check
    refetchStatus();
  };

  // Handle the program deactivation process
  const handleDeactivateProgram = async () => {
    try {
      // Check confirmation text matches "DEACTIVATE"
      if (confirmText !== 'DEACTIVATE') {
        setStatusMessage('Please type DEACTIVATE to confirm');
        setStatusType('error');
        setShowStatus(true);
        return;
      }
      
      // Verify status check was successful
      if (!isStatusVerified) {
        setStatusMessage('Program status verification is required');
        setStatusType('error');
        setShowStatus(true);
        return;
      }
      
      // Reset any previous errors
      resetWrite?.();
      
      // Update UI state
      setProcessingState('processing');
      setStatusMessage('Submitting transaction to deactivate program...');
      setStatusType('info');
      setShowStatus(true);
      
      // Execute the contract write
      writeContract({
        ...contract,
        functionName: 'deactivateProgram',
        args: [BigInt(selectedProgramId)]
      });
    } catch (err) {
      console.error('Error deactivating program:', err);
      setStatusMessage(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setStatusType('error');
      setShowStatus(true);
      setProcessingState('initial');
      setShowConfirmation(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-gray-900/90 backdrop-blur-sm border border-gray-700 shadow-xl rounded-lg p-6 max-w-full mx-auto w-full md:max-w-full mb-9"
    >
      <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-yellow-400 to-red-500 bg-clip-text text-transparent">
        Deactivate Program
      </h2>
      
      <p className="text-gray-300 text-sm mb-6">
        Remove a program from active status to prevent new enrollments.
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

      {/* Status Check Progress */}
      {isStatusCheckPending && processingState === 'verifying' && (
        <div className="flex flex-col items-center justify-center p-4 border border-gray-700 rounded-md bg-gray-800/50 mb-6">
          <div className="flex items-center justify-center mb-3">
            <div className="w-8 h-8 border-4 border-t-yellow-400 border-r-red-500 border-b-yellow-400 border-l-red-500 rounded-full animate-spin mr-3"></div>
            <span className="text-gray-300">Checking program status...</span>
          </div>
          <p className="text-xs text-gray-400 text-center">
            Verifying if the program is active on the blockchain.
          </p>
        </div>
      )}

      {/* Transaction Progress */}
      {(isPending || isConfirming) && processingState === 'processing' && (
        <div className="flex flex-col items-center justify-center p-4 border border-gray-700 rounded-md bg-gray-800/50 mb-6">
          <div className="flex items-center justify-center mb-3">
            <div className="w-8 h-8 border-4 border-t-yellow-400 border-r-red-500 border-b-yellow-400 border-l-red-500 rounded-full animate-spin mr-3"></div>
            <span className="text-gray-300">{isPending ? 'Waiting for wallet approval...' : 'Confirming transaction...'}</span>
          </div>
          <p className="text-xs text-gray-400 text-center">
            {isPending 
              ? 'Please confirm this transaction in your wallet' 
              : 'Transaction has been submitted. Waiting for blockchain confirmation...'}
          </p>
        </div>
      )}

      {/* Initial State */}
      {processingState === 'initial' && (
        <div className="space-y-6">
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0 mt-0.5">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3 text-sm text-gray-300">
                <h3 className="font-medium text-yellow-400">Important Information</h3>
                <p className="mt-2">
                  Deactivating a program will:
                </p>
                <ul className="list-disc list-inside pl-2 mt-2 space-y-1 text-gray-400">
                  <li>Prevent new enrollments to the program</li>
                  <li>Keep existing enrollments active</li>
                  <li>Allow current students to complete their education</li>
                  <li>Maintain all program data and history</li>
                </ul>
                <p className="mt-2">
                  This action is reversible by administrators if needed in the future.
                </p>
              </div>
            </div>
          </div>
          
          {/* Program Selection */}
          <div className="space-y-2">
            <label htmlFor="programSelect" className="block text-sm font-medium text-gray-300">
              Select Program to Deactivate
            </label>
            <select
              id="programSelect"
              value={selectedProgramId}
              onChange={(e) => setSelectedProgramId(e.target.value)}
              className="block w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 text-gray-300 text-sm"
            >
              <option value="">-- Select a program --</option>
              {programs.map((program) => (
                <option key={program.id} value={program.id.toString()}>
                  {program.name} (ID: {program.id})
                </option>
              ))}
            </select>
          </div>
          
          {/* Selected Program Details */}
          {selectedProgram && (
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
              <h3 className="text-md font-semibold text-blue-400 mb-3">Program Details</h3>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-gray-400">Program Name</p>
                  <p className="text-sm font-medium text-gray-200 mt-1">{selectedProgram.name}</p>
                </div>
                
                <div>
                  <p className="text-xs text-gray-400">Program ID</p>
                  <p className="text-sm font-medium text-gray-200 mt-1">{selectedProgram.id}</p>
                </div>
                
                <div>
                  <p className="text-xs text-gray-400">Term Fee</p>
                  <p className="text-sm font-medium text-gray-200 mt-1">{selectedProgram.termFee} wei</p>
                </div>
                
                <div>
                  <p className="text-xs text-gray-400">Required Attendance</p>
                  <p className="text-sm font-medium text-gray-200 mt-1">{(selectedProgram.requiredAttendance / 100).toFixed(2)}%</p>
                </div>
                
                <div>
                  <p className="text-xs text-gray-400">Current Enrollment</p>
                  <p className="text-sm font-medium text-gray-200 mt-1">
                    {selectedProgram.enrolledStudents} / {selectedProgram.maxEnrollment} students
                  </p>
                </div>
                
                <div>
                  <p className="text-xs text-gray-400">Status</p>
                  <div className="flex items-center mt-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400 mr-1" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                    <p className="text-sm font-medium text-gray-400">
                      Will be verified on-chain
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Action Button */}
          <motion.button
            onClick={handleInitiateDeactivation}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={!selectedProgramId || isStatusCheckPending}
            className={`w-full py-3 px-4 rounded-md text-white font-medium shadow-lg transition-all duration-300 ${
              'bg-gradient-to-r from-yellow-500 to-red-600 hover:from-yellow-600 hover:to-red-700'
            } ${
              !selectedProgramId || isStatusCheckPending ? 'opacity-70 cursor-not-allowed' : 'opacity-100'
            }`}
          >
            {isStatusCheckPending ? 'Checking Status...' : 'Deactivate Program'}
          </motion.button>
        </div>
      )}

      {/* Confirmation Step */}
      {processingState === 'confirmation' && showConfirmation && (
        <div className="space-y-6">
          <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-medium text-center text-yellow-400 mb-4">Confirm Program Deactivation</h3>
            
            {selectedProgram && (
              <div className="bg-gray-900/50 p-3 rounded-md mb-4">
                <p className="text-sm text-gray-400">You are about to deactivate:</p>
                <p className="text-md font-medium text-gray-200 mt-1">{selectedProgram.name} (ID: {selectedProgram.id})</p>
                <p className="text-sm text-gray-400 mt-2">With current enrollment:</p>
                <p className="text-md font-medium text-gray-200 mt-1">
                  {selectedProgram.enrolledStudents} / {selectedProgram.maxEnrollment} students
                </p>
                <div className="mt-3 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-400 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <p className="text-sm font-medium text-green-400">
                    Program verified as active on the blockchain
                  </p>
                </div>
              </div>
            )}
            
            <p className="text-gray-300 text-sm mb-4 text-center">
              To confirm deactivation, please type <span className="font-bold text-yellow-400">DEACTIVATE</span> below:
            </p>
            
            <div className="space-y-2">
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                className="block w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 text-gray-300 text-sm text-center uppercase"
                placeholder="Type DEACTIVATE"
              />
            </div>
            
            <div className="mt-6 grid grid-cols-2 gap-4">
              <motion.button
                onClick={() => {
                  setProcessingState('initial');
                  setShowConfirmation(false);
                  setConfirmText('');
                  setIsStatusVerified(false);
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="py-2 px-4 rounded-md text-gray-300 font-medium shadow-lg transition-all duration-300 bg-gray-700 hover:bg-gray-600"
              >
                Cancel
              </motion.button>
              
              <motion.button
                onClick={handleDeactivateProgram}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={confirmText !== 'DEACTIVATE' || isPending || isConfirming}
                className={`py-2 px-4 rounded-md text-white font-medium shadow-lg transition-all duration-300 ${
                  confirmText === 'DEACTIVATE'
                    ? 'bg-gradient-to-r from-yellow-500 to-red-600 hover:from-yellow-600 hover:to-red-700'
                    : 'bg-gray-600'
                } ${
                  confirmText !== 'DEACTIVATE' || isPending || isConfirming ? 'opacity-70 cursor-not-allowed' : 'opacity-100'
                }`}
              >
                Confirm Deactivation
              </motion.button>
            </div>
          </div>
        </div>
      )}

      {/* Completed State */}
      {processingState === 'completed' && (
        <div className="space-y-6">
          <div className="bg-green-900/30 border border-green-700/50 rounded-md p-4 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto mb-2 text-green-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <h3 className="text-lg font-semibold text-green-400">Program Successfully Deactivated</h3>
            <p className="text-sm text-gray-300 mt-2">
              The program has been deactivated and is no longer accepting new enrollments.
            </p>
          </div>
          
          {/* Deactivated Program Details */}
          {selectedProgram && (
            <div className="bg-gray-800/50 border border-gray-700 rounded-md p-4">
              <h3 className="text-md font-semibold text-blue-400 mb-4">Deactivated Program</h3>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <p className="text-xs text-gray-400">Program Name</p>
                  <p className="text-sm font-medium text-gray-200 mt-1">{selectedProgram.name}</p>
                </div>
                
                <div>
                  <p className="text-xs text-gray-400">Program ID</p>
                  <p className="text-sm font-medium text-gray-200 mt-1">{selectedProgram.id}</p>
                </div>
                
                <div>
                  <p className="text-xs text-gray-400">Current Enrollment</p>
                  <p className="text-sm font-medium text-gray-200 mt-1">
                    {selectedProgram.enrolledStudents} students
                  </p>
                </div>
                
                <div className="col-span-2">
                  <p className="text-xs text-gray-400">New Status</p>
                  <p className="text-sm font-medium text-red-400 mt-1">Inactive</p>
                </div>
              </div>
            </div>
          )}
          
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
          
          {/* Action Button */}
          <motion.button
            onClick={() => {
              setProcessingState('initial');
              setSelectedProgramId('');
              setConfirmText('');
              setIsStatusVerified(false);
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium rounded-md shadow-lg transition-all duration-300"
          >
            Deactivate Another Program
          </motion.button>
        </div>
      )}
    </motion.div>
  );
};

export default DeactivateProgramComponent;