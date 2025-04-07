import { useState, useEffect } from 'react';
import { useReadContract } from 'wagmi';
import { motion } from 'framer-motion';
import { formatEther, Address } from 'viem';

// Import the contract configuration with address and ABI
import { contractProgramManagementConfig } from '../../contracts';

/**
 * Interface for the custom hook's return values
 */
interface UseProgramDetailsReturn {
  programName: string;
  termFee: bigint;
  error: Error | null;
  isLoading: boolean;
  isSuccess: boolean;
  refetch: () => Promise<any>;
}

// Contract configuration type
interface ContractConfig {
  address: string;
  abi: any[];
}

/**
 * Custom hook for fetching program details
 * Uses contractProgramManagementConfig by default
 */
export const useProgramDetails = (
  programId: number,
  contract: ContractConfig = contractProgramManagementConfig
): UseProgramDetailsReturn => {
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
    address: contract.address as Address,
    abi: contract.abi,
    functionName: 'getProgramDetails',
    args: programId > 0 ? [BigInt(programId)] : undefined, // Only provide args if programId is valid
  });

  // Process the program details when they're received
  useEffect(() => {
    if (programDetails && isSuccess) {
      // The result is an array of [name, termFee]
      const [name, fee] = programDetails as [string, bigint];
      
      setProgramName(name);
      setTermFee(fee);
    }
  }, [programDetails, isSuccess]);

  return {
    programName,
    termFee,
    error,
    isLoading,
    isSuccess,
    refetch
  };
};

/**
 * Program Name Component
 */
export const ProgramNameCard = ({ 
  programName, 
  programId 
}: { 
  programName: string, 
  programId: number 
}) => {
  return (
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
  );
};

/**
 * Term Fee Component
 */
export const TermFeeCard = ({ termFee }: { termFee: bigint }) => {
  return (
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
  );
};

/**
 * Program Summary Component
 */
export const ProgramSummary = ({ 
  programName, 
  programId, 
  termFee 
}: { 
  programName: string, 
  programId: number, 
  termFee: bigint 
}) => {
  return (
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
  );
};

/**
 * Compact Program Detail Card for use in other components
 */
export const CompactProgramDetail = ({ 
  programName, 
  programId, 
  termFee 
}: { 
  programName: string, 
  programId: number, 
  termFee: bigint 
}) => {
  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-base font-medium text-white">
          {programName || 'Unnamed Program'}
        </h3>
        <div className="bg-blue-900/30 text-blue-400 px-2 py-0.5 rounded text-xs">
          ID: {programId}
        </div>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-400">Term Fee:</span>
        <span className="text-sm font-medium text-green-400">
          {formatEther(termFee)} ETH
        </span>
      </div>
    </div>
  );
};

/**
 * ProgramDetailsReader Component
 * 
 * This component reads the detailed information for a specific program ID
 * Uses contractProgramManagementConfig by default
 */
interface ProgramDetailsReaderProps {
  programId: number; // The program ID to get details for
  contract?: ContractConfig; // Optional - will use contractProgramManagementConfig by default
  onDetailsRead?: (name: string, termFee: bigint) => void; // Callback when details are successfully read
}

const ProgramDetailsReader = ({ 
  programId,
  contract = contractProgramManagementConfig,
  onDetailsRead 
}: ProgramDetailsReaderProps) => {
  // Use the custom hook to get program details
  const {
    programName,
    termFee,
    error,
    isLoading,
    isSuccess,
    refetch
  } = useProgramDetails(programId, contract);

  // Call the callback when details are loaded
  useEffect(() => {
    if (isSuccess && onDetailsRead) {
      onDetailsRead(programName, termFee);
    }
  }, [programName, termFee, isSuccess, onDetailsRead]);

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
      
      {programId > 0 && isSuccess && (
        <div className="space-y-3">
          <ProgramNameCard programName={programName} programId={programId} />
          <TermFeeCard termFee={termFee} />
          <ProgramSummary programName={programName} programId={programId} termFee={termFee} />
        </div>
      )}
    </motion.div>
  );
};

export default ProgramDetailsReader;