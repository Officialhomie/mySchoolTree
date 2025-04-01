import { useState, useEffect } from 'react';
import { useReadContract } from 'wagmi';
import { motion } from 'framer-motion';

/**
 * ProgramAttendanceRequirement Component
 * 
 * This component reads the attendance requirement for a specific program ID
 * from the contract and displays it. It can be used as a standalone component
 * or as part of a larger program management system.
 * 
 * The component handles loading states, errors, and successful data fetching.
 */
interface ProgramAttendanceRequirementProps {
  contract: any;
  programId: number; // The program ID to check attendance requirements for
  onRequirementRead?: (requirement: number) => void; // Callback when requirement is successfully read
}

const ProgramAttendanceRequirement = ({ 
  contract, 
  programId,
  onRequirementRead 
}: ProgramAttendanceRequirementProps) => {
  // State for requirement info
  const [requirementInfo, setRequirementInfo] = useState<string>('');
  
  // Get program attendance requirement from the contract
  const { 
    data: requirementData,
    error,
    isLoading,
    isSuccess,
    refetch
  } = useReadContract({
    ...contract,
    functionName: 'getProgramAttendanceRequirement',
    args: [programId], // Pass the program ID as an argument
    enabled: programId > 0, // Only run the query if we have a valid program ID
  });

  // Process the requirement data when it's received
  useEffect(() => {
    if (requirementData !== undefined && isSuccess) {
      const requirementAsNumber = Number(requirementData);
      
      // Format the requirement info
      if (requirementAsNumber > 0) {
        setRequirementInfo(`${requirementAsNumber} session${requirementAsNumber !== 1 ? 's' : ''}`);
      } else {
        setRequirementInfo('No attendance requirement');
      }
      
      // Call the callback with the raw requirement if provided
      if (onRequirementRead) {
        onRequirementRead(requirementAsNumber);
      }
    }
  }, [requirementData, isSuccess, onRequirementRead]);

  // Helper function to determine if there's a significant attendance requirement
  const hasSignificantRequirement = () => {
    if (requirementData !== undefined && isSuccess) {
      const requirementAsNumber = Number(requirementData);
      return requirementAsNumber > 0;
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
      
      {programId > 0 && isSuccess && requirementData !== undefined && (
        <div className="space-y-3">
          <div className={`p-3 rounded-md ${
            hasSignificantRequirement() 
              ? 'bg-blue-500/20 border border-blue-500/30' 
              : 'bg-gray-600/50 border border-gray-600/30'
          }`}>
            <p className={`text-sm font-medium ${
              hasSignificantRequirement() ? 'text-blue-400' : 'text-gray-400'
            }`}>
              {hasSignificantRequirement() ? 'Attendance Required' : 'No Attendance Required'}
            </p>
            <p className="text-xs text-gray-300 mt-1">
              Program #{programId} requires {requirementInfo} to complete
            </p>
          </div>
          
          <div className="bg-gray-700/50 rounded-md p-3">
            <p className="text-xs text-gray-400">Program ID:</p>
            <p className="text-sm text-gray-200 mt-1">#{programId}</p>
            
            <p className="text-xs text-gray-400 mt-2">Required Sessions:</p>
            <p className="text-sm font-mono text-gray-300 mt-1">{String(requirementData)}</p>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default ProgramAttendanceRequirement;