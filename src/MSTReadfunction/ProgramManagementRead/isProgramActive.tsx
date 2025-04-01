import { useState, useEffect } from 'react';
import { useReadContract } from 'wagmi';
import { motion } from 'framer-motion';

const ProgramStatusChecker = ({ 
  contract, 
  onStatusChange = () => {} 
}: { 
  contract: any,
  onStatusChange?: (programId: string, isActive: boolean) => void
}) => {
  // Form state
  const [programId, setProgramId] = useState('');
  const [hasChecked, setHasChecked] = useState(false);
  
  // UI state
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState<'success' | 'error' | 'info' | 'warning'>('info');
  const [showStatus, setShowStatus] = useState(false);
  
  // Contract read hook for checking program status
  const { 
    data: isActive, 
    isError, 
    error, 
    isPending,
    refetch 
  } = useReadContract({
    ...contract,
    functionName: 'isProgramActive',
    args: programId ? [BigInt(programId)] : undefined,
    enabled: false // We'll manually trigger the read
  });

  // Update the parent component when the status changes
  useEffect(() => {
    if (hasChecked && isActive !== undefined && !isPending && !isError) {
      onStatusChange(programId, Boolean(isActive));
    }
  }, [hasChecked, isActive, isPending, isError, programId, onStatusChange]);

  // Handle errors
  useEffect(() => {
    if (isError && error) {
      setStatusMessage(`Error checking program status: ${error.message}`);
      setStatusType('error');
      setShowStatus(true);
    }
  }, [isError, error]);

  // Hide status message after a delay
  useEffect(() => {
    if (showStatus) {
      const timer = setTimeout(() => {
        setShowStatus(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showStatus]);

  // Handle the check status action
  const handleCheckStatus = async () => {
    // Reset state
    setHasChecked(false);
    
    // Validate input
    if (!programId || isNaN(Number(programId)) || Number(programId) <= 0) {
      setStatusMessage('Please enter a valid program ID');
      setStatusType('error');
      setShowStatus(true);
      return;
    }
    
    try {
      // Fetch the program status
      await refetch();
      setHasChecked(true);
    } catch (err) {
      console.error('Error checking program status:', err);
      setStatusMessage(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setStatusType('error');
      setShowStatus(true);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-gray-900/90 backdrop-blur-sm border border-gray-700 shadow-xl rounded-lg p-6 max-w-full mx-auto w-full md:max-w-full mb-9"
    >
      <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
        Program Status Checker
      </h2>
      
      <p className="text-gray-300 text-sm mb-6">
        Check if an educational program is currently active.
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
        </motion.div>
      )}

      <div className="space-y-6">
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <div className="flex items-start">
            <div className="flex-shrink-0 mt-0.5">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3 text-sm text-gray-300">
              <p className="mb-2">
                This utility checks whether a program is currently active in the system.
                Active programs are available for enrollment and participation.
              </p>
              <p>
                Enter the program ID (a positive integer) to check its status.
              </p>
            </div>
          </div>
        </div>
        
        {/* Program ID Input */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="space-y-2 md:col-span-3">
            <label className="block text-sm font-medium text-gray-300">
              Program ID
            </label>
            <input
              type="number"
              value={programId}
              onChange={(e) => setProgramId(e.target.value)}
              className="block w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-300 text-sm"
              placeholder="Enter program ID"
              min="1"
              step="1"
            />
          </div>
          
          <motion.button
            onClick={handleCheckStatus}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={isPending || !programId}
            className={`py-2 px-4 rounded-md text-white font-medium shadow-lg transition-all duration-300 ${
              'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700'
            } ${
              isPending || !programId ? 'opacity-70 cursor-not-allowed' : 'opacity-100'
            }`}
          >
            {isPending ? 'Checking...' : 'Check Status'}
          </motion.button>
        </div>
        
        {/* Results Display */}
        {hasChecked && isActive !== undefined && !isPending && !isError && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className={`p-4 rounded-md border ${
              isActive 
                ? 'bg-green-500/20 border-green-500/30' 
                : 'bg-red-500/20 border-red-500/30'
            }`}
          >
            <div className="flex items-center">
              {isActive ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-400 mr-3" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-400 mr-3" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              )}
              <div>
                <h3 className={`font-medium ${isActive ? 'text-green-400' : 'text-red-400'}`}>
                  Program ID: {programId}
                </h3>
                <p className="text-gray-300 mt-1">
                  Status: {isActive ? 'Active' : 'Inactive'}
                </p>
                <p className="text-sm text-gray-400 mt-2">
                  {isActive 
                    ? 'This program is currently active and available for operations.' 
                    : 'This program is inactive and not accepting new enrollments.'}
                </p>
              </div>
            </div>
          </motion.div>
        )}
        
        {/* Loading State */}
        {isPending && (
          <div className="flex justify-center items-center p-4 bg-gray-800/50 rounded-md border border-gray-700">
            <div className="w-6 h-6 border-2 border-t-blue-400 border-r-purple-500 border-b-blue-400 border-l-purple-500 rounded-full animate-spin mr-3"></div>
            <p className="text-gray-300">Checking program status...</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

// This hook can be used by other components to check program status
export const useProgramStatus = (contract: any, programId?: string) => {
  const { 
    data: isActive, 
    isError, 
    error, 
    isPending,
    refetch 
  } = useReadContract({
    ...contract,
    functionName: 'isProgramActive',
    args: programId ? [BigInt(programId)] : undefined,
    enabled: !!programId // Only enable if programId is provided
  });

  return {
    isActive,
    isError,
    error,
    isPending,
    refetch
  };
};

export default ProgramStatusChecker;