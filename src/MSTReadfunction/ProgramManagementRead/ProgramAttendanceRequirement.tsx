import { useState, useEffect } from 'react';
import { useReadContract } from 'wagmi';
import { motion } from 'framer-motion';
import { Address } from 'viem';

// Import the contract configuration with address and ABI
import { contractProgramManagementConfig } from '../../contracts';

/**
 * Interface for the custom hook's return values
 */
interface UseAttendanceRequirementReturn {
  requirementInfo: string;
  requirementData: number | null;
  error: Error | null;
  isLoading: boolean;
  isSuccess: boolean;
  refetch: () => Promise<any>;
  hasSignificantRequirement: () => boolean;
}

// Contract configuration type
interface ContractConfig {
  address: string;
  abi: any[];
}

/**
 * Custom hook for fetching program attendance requirement
 * Uses contractProgramManagementConfig by default
 */
export const useAttendanceRequirement = (
  programId: number,
  contract: ContractConfig = contractProgramManagementConfig
): UseAttendanceRequirementReturn => {
  // State for requirement info
  const [requirementInfo, setRequirementInfo] = useState<string>('');
  const [requirementData, setRequirementData] = useState<number | null>(null);
  
  // Get program attendance requirement from the contract
  const { 
    data: rawRequirementData,
    error,
    isLoading,
    isSuccess,
    refetch
  } = useReadContract({
    address: contract.address as Address,
    abi: contract.abi,
    functionName: 'getProgramAttendanceRequirement',
    args: programId > 0 ? [BigInt(programId)] : undefined, // Only provide args if programId is valid
  });

  // Process the requirement data when it's received
  useEffect(() => {
    if (rawRequirementData !== undefined && isSuccess) {
      const requirementAsNumber = Number(rawRequirementData);
      setRequirementData(requirementAsNumber);
      
      // Format the requirement info
      if (requirementAsNumber > 0) {
        setRequirementInfo(`${requirementAsNumber} session${requirementAsNumber !== 1 ? 's' : ''}`);
      } else {
        setRequirementInfo('No attendance requirement');
      }
    }
  }, [rawRequirementData, isSuccess]);

  // Helper function to determine if there's a significant attendance requirement
  const hasSignificantRequirement = () => {
    return requirementData !== null && requirementData > 0;
  };

  return {
    requirementInfo,
    requirementData,
    error,
    isLoading,
    isSuccess,
    refetch,
    hasSignificantRequirement
  };
};

/**
 * Attendance Requirement Card Component
 */
export const AttendanceRequirementCard = ({ 
  requirementInfo, 
  hasSignificantRequirement,
  programId
}: { 
  requirementInfo: string, 
  hasSignificantRequirement: boolean,
  programId: number
}) => {
  return (
    <div className={`p-3 rounded-md ${
      hasSignificantRequirement 
        ? 'bg-blue-500/20 border border-blue-500/30' 
        : 'bg-gray-600/50 border border-gray-600/30'
    }`}>
      <p className={`text-sm font-medium ${
        hasSignificantRequirement ? 'text-blue-400' : 'text-gray-400'
      }`}>
        {hasSignificantRequirement ? 'Attendance Required' : 'No Attendance Required'}
      </p>
      <p className="text-xs text-gray-300 mt-1">
        Program #{programId} requires {requirementInfo} to complete
      </p>
    </div>
  );
};

/**
 * Program ID and Requirements Summary Component
 */
export const RequirementsSummary = ({ 
  programId, 
  rawRequirement 
}: { 
  programId: number, 
  rawRequirement: number | string | null 
}) => {
  return (
    <div className="bg-gray-700/50 rounded-md p-3">
      <p className="text-xs text-gray-400">Program ID:</p>
      <p className="text-sm text-gray-200 mt-1">#{programId}</p>
      
      <p className="text-xs text-gray-400 mt-2">Required Sessions:</p>
      <p className="text-sm font-mono text-gray-300 mt-1">{String(rawRequirement ?? 0)}</p>
    </div>
  );
};

/**
 * Compact Attendance Requirement Card for use in other components
 */
export const CompactAttendanceRequirement = ({ 
  requirementInfo, 
  hasSignificantRequirement,
  programId
}: { 
  requirementInfo: string, 
  hasSignificantRequirement: boolean,
  programId: number
}) => {
  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-medium text-gray-300">
          Program #{programId} Attendance
        </h3>
        <div className={`text-xs px-2 py-0.5 rounded-full ${
          hasSignificantRequirement 
            ? 'bg-blue-900/30 text-blue-400' 
            : 'bg-gray-700 text-gray-400'
        }`}>
          {hasSignificantRequirement ? 'Required' : 'Not Required'}
        </div>
      </div>
      <p className="text-xs text-gray-400">
        {requirementInfo} needed to complete the program
      </p>
    </div>
  );
};

/**
 * ProgramAttendanceRequirement Component
 * 
 * This component reads the attendance requirement for a specific program ID
 * Uses contractProgramManagementConfig by default
 */
interface ProgramAttendanceRequirementProps {
  programId: number; // The program ID to check attendance requirements for
  contract?: ContractConfig; // Optional - will use contractProgramManagementConfig by default
  onRequirementRead?: (requirement: number) => void; // Callback when requirement is successfully read
}

const ProgramAttendanceRequirement = ({ 
  programId,
  contract = contractProgramManagementConfig,
  onRequirementRead 
}: ProgramAttendanceRequirementProps) => {
  // Use the custom hook to get requirement data
  const {
    requirementInfo,
    requirementData,
    error,
    isLoading,
    isSuccess,
    refetch,
    hasSignificantRequirement
  } = useAttendanceRequirement(programId, contract);

  // Call the callback when data is loaded
  useEffect(() => {
    if (isSuccess && requirementData !== null && onRequirementRead) {
      onRequirementRead(requirementData);
    }
  }, [requirementData, isSuccess, onRequirementRead]);
  
  // Render the component UI
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-gray-800/50 border border-gray-700 rounded-lg p-4"
    >
      <h3 className="text-lg font-medium text-blue-400 mb-2">
        Program Attendance Requirement
      </h3>
      
      {programId <= 0 && (
        <div className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded-md p-3">
          <p className="text-sm">Please select a valid program ID to view attendance requirements.</p>
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
          <p className="text-sm">Error reading attendance requirement: {(error as Error).message || 'Unknown error'}</p>
          <button 
            onClick={() => refetch()} 
            className="text-xs mt-2 bg-gray-700 hover:bg-gray-600 text-gray-200 py-1 px-2 rounded"
          >
            Try Again
          </button>
        </div>
      )}
      
      {programId > 0 && isSuccess && requirementData !== null && (
        <div className="space-y-3">
          <AttendanceRequirementCard 
            requirementInfo={requirementInfo}
            hasSignificantRequirement={hasSignificantRequirement()}
            programId={programId}
          />
          
          <RequirementsSummary 
            programId={programId}
            rawRequirement={requirementData}
          />
        </div>
      )}
    </motion.div>
  );
};

export default ProgramAttendanceRequirement;