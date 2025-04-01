import { useState, useEffect } from 'react';
import { useReadContract } from 'wagmi';
import { motion } from 'framer-motion';
import { formatEther } from 'viem';

/**
 * ProgramDetailsReader Component
 * 
 * This component reads the detailed information for a specific program ID
 * from the contract and displays it. It shows the program name and term fee.
 * 
 * The component handles loading states, errors, and successful data fetching.
 */
interface ProgramDetailsReaderProps {
  contract: any;
  programId: number; // The program ID to get details for
  onDetailsRead?: (name: string, termFee: bigint) => void; // Callback when details are successfully read
}

const ProgramDetailsReader = ({ 
  contract, 
  programId,
  onDetailsRead 
}: ProgramDetailsReaderProps) => {
  // State for program details
  const [programName, setProgramName] = useState<string>('');
  const [termFee, setTermFee] = useState<bigint>(BigInt(0));
  
  // Get program details from the contract
  const { 
    data: programDetails,
    error,
    isLoading,
    isSuccess,
    refetch
  } = useReadContract({
    ...contract,
    functionName: 'getProgramDetails',
    args: [programId], // Pass the program ID as an argument
    enabled: programId > 0, // Only run the query if we have a valid program ID
  });

  // Process the program details when they're received
  useEffect(() => {
    if (programDetails && isSuccess) {
      // The result is an array of [name, termFee]
      const [name, fee] = programDetails as [string, bigint];
      
      setProgramName(name);
      setTermFee(fee);
      
      // Call the callback with the details if provided
      if (onDetailsRead) {
        onDetailsRead(name, fee);
      }
    }
  }, [programDetails, isSuccess, onDetailsRead]);

  // Render the component UI
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-gray-800/50 border border-gray-700 rounded-lg p-4"
    >
      <h3 className="text-lg font-medium text-blue-400 mb-2">
        Program Details
      </h3>
      
      {programId <= 0 && (
        <div className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded-md p-3">
          <p className="text-sm">Please select a valid program ID to view details.</p>
        </div>
      )}
      
      {programId > 0 && isLoading && (
        <div className="flex items-center justify-center py-3">
          <div className="w-5 h-5 border-2 border-t-blue-400 border-blue-200/30 rounded-full animate-spin mr-2"></div>
          <span className="text-sm text-gray-300">Reading contract data...</span>
        </div>
      )}
      
      {programId > 0 && error && (
        <div className="bg-red-500/20 text-red-400 border border-red-500/30 rounded-md p-3">
          <p className="text-sm">Error reading program details: {(error as Error).message || 'Unknown error'}</p>
          <button 
            onClick={() => refetch()} 
            className="text-xs mt-2 bg-gray-700 hover:bg-gray-600 text-gray-200 py-1 px-2 rounded"
          >
            Try Again
          </button>
        </div>
      )}
      
      {programId > 0 && isSuccess && programDetails !== undefined && (
        <div className="space-y-3">
          <div className="bg-purple-500/20 border border-purple-500/30 rounded-md p-3">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-purple-400">
                  Program Name
                </p>
                <p className="text-base text-white mt-1 font-medium">
                  {programName || 'Unnamed Program'}
                </p>
              </div>
              <div className="bg-gray-900/50 rounded px-2 py-1">
                <p className="text-xs text-gray-400">ID: {programId}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-green-500/20 border border-green-500/30 rounded-md p-3">
            <p className="text-sm font-medium text-green-400">
              Term Fee
            </p>
            <div className="flex items-baseline mt-1">
              <p className="text-xl font-bold text-white">
                {formatEther(termFee)}
              </p>
              <p className="text-xs text-gray-400 ml-1">ETH</p>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Raw Value: {termFee.toString()} wei
            </p>
          </div>
          
          <div className="bg-gray-700/50 rounded-md p-3">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-xs text-gray-400">Program Summary</p>
                <p className="text-sm text-gray-200 mt-1">
                  {programName || 'Unnamed Program'} (#{programId})
                </p>
              </div>
              <div className="rounded-full bg-blue-500/20 px-3 py-1">
                <p className="text-xs font-medium text-blue-400">
                  {formatEther(termFee)} ETH
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default ProgramDetailsReader;