import { useState, useEffect } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { motion } from 'framer-motion';

const CreateProgramComponent = ({ contract }: { contract: any }) => {
  // Form state
  const [programName, setProgramName] = useState('');
  const [termFee, setTermFee] = useState('');
  const [requiredAttendance, setRequiredAttendance] = useState('');
  const [maxEnrollment, setMaxEnrollment] = useState('');
  
  // UI state
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState<'success' | 'error' | 'info' | 'warning'>('info');
  const [showStatus, setShowStatus] = useState(false);
  const [processingState, setProcessingState] = useState<'initial' | 'processing' | 'completed'>('initial');
  
  // Transaction state
  const { data: hash, isPending, writeContract, error: writeError, reset: resetWrite } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed, error: confirmError } = useWaitForTransactionReceipt({ hash });

  // Handle transaction success
  useEffect(() => {
    if (isConfirmed && hash) {
      setStatusMessage(`Program "${programName}" has been successfully created!`);
      setStatusType('success');
      setShowStatus(true);
      setProcessingState('completed');
    }
  }, [isConfirmed, hash, programName]);

  // Handle transaction errors
  useEffect(() => {
    if (writeError || confirmError) {
      const errorMessage = writeError?.message || confirmError?.message || 'An unknown error occurred';
      setStatusMessage(`Transaction failed: ${errorMessage}`);
      setStatusType('error');
      setShowStatus(true);
      setProcessingState('initial');
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

  // Form validation
  const validateForm = () => {
    if (!programName.trim()) {
      setStatusMessage('Program name is required');
      setStatusType('error');
      setShowStatus(true);
      return false;
    }
    
    if (!termFee || isNaN(Number(termFee)) || Number(termFee) < 0) {
      setStatusMessage('Please enter a valid term fee');
      setStatusType('error');
      setShowStatus(true);
      return false;
    }
    
    if (!requiredAttendance || isNaN(Number(requiredAttendance)) || 
        Number(requiredAttendance) < 0 || Number(requiredAttendance) > 10000) {
      setStatusMessage('Required attendance must be a value between 0 and 10000 (0-100%)');
      setStatusType('error');
      setShowStatus(true);
      return false;
    }
    
    if (!maxEnrollment || isNaN(Number(maxEnrollment)) || 
        !Number.isInteger(Number(maxEnrollment)) || Number(maxEnrollment) <= 0) {
      setStatusMessage('Maximum enrollment must be a positive integer');
      setStatusType('error');
      setShowStatus(true);
      return false;
    }
    
    return true;
  };

  // Handle the program creation process
  const handleCreateProgram = async () => {
    try {
      // Reset any previous errors
      resetWrite?.();
      
      // Validate form
      if (!validateForm()) {
        return;
      }
      
      // Update UI state
      setProcessingState('processing');
      setStatusMessage('Submitting transaction to create program...');
      setStatusType('info');
      setShowStatus(true);
      
      // Convert input values to appropriate types for the contract
      const termFeeValue = BigInt(termFee);
      const requiredAttendanceValue = Number(requiredAttendance);
      const maxEnrollmentValue = Number(maxEnrollment);
      
      // Execute the contract write
      writeContract({
        ...contract,
        functionName: 'createProgram',
        args: [
          programName,
          termFeeValue,
          requiredAttendanceValue,
          maxEnrollmentValue
        ],
        value: BigInt(0) // Set to appropriate value if creating a program requires ETH
      });
    } catch (err) {
      console.error('Error creating program:', err);
      setStatusMessage(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setStatusType('error');
      setShowStatus(true);
      setProcessingState('initial');
    }
  };

  // Reset form
  const resetForm = () => {
    setProgramName('');
    setTermFee('');
    setRequiredAttendance('');
    setMaxEnrollment('');
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-gray-900/90 backdrop-blur-sm border border-gray-700 shadow-xl rounded-lg p-6 max-w-full mx-auto w-full md:max-w-full mb-9"
    >
      <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
        Create Educational Program
      </h2>
      
      <p className="text-gray-300 text-sm mb-6">
        Launch a new educational program with customized parameters.
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

      {/* Initial State with Form */}
      {processingState === 'initial' && (
        <div className="space-y-6">
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <div className="flex items-start">
              <div className="flex-shrink-0 mt-0.5">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3 text-sm text-gray-300">
                <p>
                  Creating a new educational program requires setting up several parameters:
                </p>
                <ul className="mt-2 space-y-1 list-disc list-inside pl-1 text-gray-400">
                  <li>Program Name: A unique identifier for the program</li>
                  <li>Term Fee: The cost for one term of enrollment (in smallest unit, e.g., wei)</li>
                  <li>Required Attendance: Percentage required (0-10000 represents 0-100%)</li>
                  <li>Maximum Enrollment: The maximum number of students allowed</li>
                </ul>
              </div>
            </div>
          </div>
          
          {/* Program Input Form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <label className="block text-sm font-medium text-gray-300">
                Program Name
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <input
                  type="text"
                  value={programName}
                  onChange={(e) => setProgramName(e.target.value)}
                  className="block w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-300 text-sm"
                  placeholder="Advanced Blockchain Development"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                Term Fee
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <input
                  type="number"
                  value={termFee}
                  onChange={(e) => setTermFee(e.target.value)}
                  className="block w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-300 text-sm"
                  placeholder="0"
                  min="0"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <span className="text-gray-400 sm:text-sm">wei</span>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Fee for one term in wei (1 ETH = 10<sup>18</sup> wei)
              </p>
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                Required Attendance (%)
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <input
                  type="number"
                  value={requiredAttendance}
                  onChange={(e) => setRequiredAttendance(e.target.value)}
                  className="block w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-300 text-sm"
                  placeholder="7500"
                  min="0"
                  max="10000"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <span className="text-gray-400 sm:text-sm">bps</span>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Enter in basis points (7500 = 75%)
              </p>
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                Maximum Enrollment
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <input
                  type="number"
                  value={maxEnrollment}
                  onChange={(e) => setMaxEnrollment(e.target.value)}
                  className="block w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-300 text-sm"
                  placeholder="50"
                  min="1"
                  step="1"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <span className="text-gray-400 sm:text-sm">students</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-2 md:col-span-2">
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-md p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0 mt-0.5">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-400">About This Function</h3>
                    <p className="mt-1 text-sm text-gray-300">
                      Creating a program will require a transaction fee (gas) and may require a creation fee if configured in the contract.
                      Once created, the program will be immediately available for enrollment.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <motion.button
              onClick={resetForm}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="py-3 px-4 rounded-md text-white font-medium shadow-lg transition-all duration-300 bg-gray-700 hover:bg-gray-600"
            >
              Reset Form
            </motion.button>
            
            <motion.button
              onClick={handleCreateProgram}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={isPending || isConfirming}
              className={`py-3 px-4 rounded-md text-white font-medium shadow-lg transition-all duration-300 ${
                'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700'
              } ${
                isPending || isConfirming ? 'opacity-70 cursor-not-allowed' : 'opacity-100'
              }`}
            >
              Create Program
            </motion.button>
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
            <h3 className="text-lg font-semibold text-green-400">Program Created Successfully</h3>
            <p className="text-sm text-gray-300 mt-2">
              Your new educational program has been created and is now available on the blockchain.
            </p>
          </div>
          
          {/* Program Summary */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-md p-4">
            <h3 className="text-md font-semibold text-blue-400 mb-4">Program Details</h3>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 bg-gray-800 p-3 rounded-md">
                <p className="text-xs text-gray-400">Program Name</p>
                <p className="text-sm font-medium text-gray-200 mt-1">{programName}</p>
              </div>
              
              <div className="bg-gray-800 p-3 rounded-md">
                <p className="text-xs text-gray-400">Term Fee</p>
                <p className="text-sm font-medium text-gray-200 mt-1">{termFee} wei</p>
              </div>
              
              <div className="bg-gray-800 p-3 rounded-md">
                <p className="text-xs text-gray-400">Required Attendance</p>
                <p className="text-sm font-medium text-gray-200 mt-1">{(Number(requiredAttendance) / 100).toFixed(2)}%</p>
              </div>
              
              <div className="bg-gray-800 p-3 rounded-md">
                <p className="text-xs text-gray-400">Maximum Enrollment</p>
                <p className="text-sm font-medium text-gray-200 mt-1">{maxEnrollment} students</p>
              </div>
              
              <div className="col-span-2 bg-gray-800 p-3 rounded-md">
                <p className="text-xs text-gray-400">Next Steps</p>
                <p className="text-sm text-gray-300 mt-1">
                  Your program is now created. You can now set up courses, enrollment periods, and share the program details with potential students.
                </p>
              </div>
            </div>
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
          
          {/* Action Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <motion.button
              onClick={() => {
                setProcessingState('initial');
                resetForm();
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium rounded-md shadow-lg transition-all duration-300"
            >
              Create Another Program
            </motion.button>
            
            <motion.button
              onClick={() => {
                // Logic to navigate to program management or view programs
                console.log('Navigate to program management');
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-3 px-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-medium rounded-md shadow-lg transition-all duration-300"
            >
              Manage Programs
            </motion.button>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default CreateProgramComponent;