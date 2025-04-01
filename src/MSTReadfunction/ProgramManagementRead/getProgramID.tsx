import { useState, useEffect } from 'react';
import { useReadContract } from 'wagmi';
import { motion } from 'framer-motion';

/**
 * CurrentProgramIdReader Component
 * 
 * This component reads the current program ID from the contract
 * and provides both the raw data and formatted display. It can be used as a
 * standalone component or as part of a larger program management system.
 * 
 * The component handles loading states, errors, and successful data fetching.
 */
interface CurrentProgramIdReaderProps {
  contract: any;
  onProgramIdRead?: (programId: number) => void; // Callback when program ID is successfully read
}

const CurrentProgramIdReader = ({ 
  contract, 
  onProgramIdRead 
}: CurrentProgramIdReaderProps) => {
  // State for displaying formatted program ID info
  const [programInfo, setProgramInfo] = useState<string>('');
  
  // Get current program ID from the contract
  const { 
    data: programIdData,
    error,
    isLoading,
    isSuccess,
    refetch
  } = useReadContract({
    ...contract,
    functionName: 'getCurrentProgramId',
    args: [], // No arguments needed for this function
  });

  // Process the program ID data when it's received
  useEffect(() => {
    if (programIdData !== undefined && isSuccess) {
      const programIdAsNumber = Number(programIdData);
      
      // Set program info based on the program ID
      if (programIdAsNumber > 0) {
        setProgramInfo(`Program #${programIdAsNumber}`);
      } else {
        setProgramInfo('No active program');
      }
      
      // Call the callback with the raw program ID if provided
      if (onProgramIdRead) {
        onProgramIdRead(programIdAsNumber);
      }
    }
  }, [programIdData, isSuccess, onProgramIdRead]);

  // Helper function to determine if a program ID is valid
  const isValidProgramId = () => {
    if (programIdData !== undefined && isSuccess) {
      const programIdAsNumber = Number(programIdData);
      return programIdAsNumber > 0;
    }
    return false;
  };
  
  // Render the component UI
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-gray-800/50 border border-gray-700 rounded-lg p-4"
    >
      <h3 className="text-lg font-medium text-blue-400 mb-2">
        Current Program ID
      </h3>
      
      {isLoading && (
        <div className="flex items-center justify-center py-3">
          <div className="w-5 h-5 border-2 border-t-blue-400 border-blue-200/30 rounded-full animate-spin mr-2"></div>
          <span className="text-sm text-gray-300">Reading contract data...</span>
        </div>
      )}
      
      {error && (
        <div className="bg-red-500/20 text-red-400 border border-red-500/30 rounded-md p-3">
          <p className="text-sm">Error reading current program ID: {(error as Error).message || 'Unknown error'}</p>
          <button 
            onClick={() => refetch()} 
            className="text-xs mt-2 bg-gray-700 hover:bg-gray-600 text-gray-200 py-1 px-2 rounded"
          >
            Try Again
          </button>
        </div>
      )}
      
      {isSuccess && programIdData !== undefined && (
        <div className="space-y-3">
          <div className={`p-3 rounded-md ${
            isValidProgramId() 
              ? 'bg-green-500/20 border border-green-500/30' 
              : 'bg-yellow-500/20 border border-yellow-500/30'
          }`}>
            <p className={`text-sm font-medium ${
              isValidProgramId() ? 'text-green-400' : 'text-yellow-400'
            }`}>
              {isValidProgramId() ? 'Active Program Found' : 'No Active Program'}
            </p>
            <p className="text-xs text-gray-300 mt-1">
              {programInfo}
            </p>
          </div>
          
          <div className="bg-gray-700/50 rounded-md p-3">
            <p className="text-xs text-gray-400">Program ID:</p>
            <p className="text-sm text-gray-200 mt-1">{programInfo}</p>
            
            <p className="text-xs text-gray-400 mt-2">Raw Value:</p>
            <p className="text-xs font-mono text-gray-300 mt-1">{String(programIdData)}</p>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default CurrentProgramIdReader;