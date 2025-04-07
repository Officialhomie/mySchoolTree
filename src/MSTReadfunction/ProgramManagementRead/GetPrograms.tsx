import { useEffect, useState } from 'react';
import { useReadContract } from 'wagmi';
import { motion } from 'framer-motion';
import { formatEther, Address } from 'viem';

// Import the contract configuration with address and ABI
import { contractProgramManagementConfig } from '../../contracts';

/**
 * Program structure matching the contract output
 */
export interface Program {
  name: string;
  isActive: boolean;
  termFee: bigint;
  minimumAttendance: number;
  requiredAttendance: number;
  enrolledCount: number;
  maxEnrollment: number;
}

// Define the type for program data returned from the contract
type ProgramData = [
  string,      // name
  boolean,     // isActive
  bigint,      // termFee
  number,      // minimumAttendance
  number,      // requiredAttendance
  number,      // enrolledCount
  number       // maxEnrollment
];

// Interface for the hook's return values
interface UseProgramDetailsReturn {
  program: Program | null;
  error: Error | null;
  isLoading: boolean;
  isSuccess: boolean;
  refetch: () => Promise<any>;
  calculateEnrollmentPercentage: () => number;
}

// Contract configuration type
interface ContractConfig {
  address: string;
  abi: any[];
}

/**
 * Custom hook for program details logic and data fetching
 * Uses contractProgramManagementConfig by default
 */
export const useProgramDetails = (
  programId: number,
  contract: ContractConfig = contractProgramManagementConfig
): UseProgramDetailsReturn => {
  const [program, setProgram] = useState<Program | null>(null);

  // Get program details from the contract
  const { 
    data: programData,
    error,
    isLoading,
    isSuccess,
    refetch
  } = useReadContract({
    address: contract.address as Address,
    abi: contract.abi,
    functionName: 'programs',
    args: programId > 0 ? [BigInt(programId)] : undefined,
  });

  // Process program data when received
  useEffect(() => {
    if (programData && isSuccess) {
      // Convert raw data to Program interface
      const typedData = programData as ProgramData;
      const programObj: Program = {
        name: typedData[0],
        isActive: typedData[1],
        termFee: typedData[2],
        minimumAttendance: Number(typedData[3]),
        requiredAttendance: Number(typedData[4]),
        enrolledCount: Number(typedData[5]),
        maxEnrollment: Number(typedData[6])
      };
      
      setProgram(programObj);
    }
  }, [programData, isSuccess]);

  // Calculate enrollment percentage
  const calculateEnrollmentPercentage = (): number => {
    if (!program) return 0;
    
    const { enrolledCount, maxEnrollment } = program;
    
    if (maxEnrollment === 0) return 0;
    return Math.min(100, Math.round((enrolledCount / maxEnrollment) * 100));
  };

  return {
    program,
    error,
    isLoading,
    isSuccess,
    refetch,
    calculateEnrollmentPercentage
  };
};

/**
 * Program Header Component - displays name, status, and fee
 */
export const ProgramHeader = ({ program }: { program: Program }) => {
  return (
    <div className="bg-gray-700/30 rounded-lg p-4 border border-gray-700">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-xl font-bold text-white">
            {program.name || 'Unnamed Program'}
          </h2>
          <div className="flex items-center mt-1">
            <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
              program.isActive ? 'bg-green-500' : 'bg-red-500'
            }`}></span>
            <span className={`text-sm ${
              program.isActive ? 'text-green-400' : 'text-red-400'
            }`}>
              {program.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
        <div className="bg-blue-500/20 rounded-lg px-3 py-2 border border-blue-500/30">
          <p className="text-sm font-medium text-blue-400">
            {formatEther(program.termFee)} ETH
          </p>
          <p className="text-xs text-gray-400 mt-1">Term Fee</p>
        </div>
      </div>
    </div>
  );
};

/**
 * Attendance Requirements Component
 */
export const AttendanceRequirements = ({ program }: { program: Program }) => {
  return (
    <div className="bg-purple-500/20 border border-purple-500/30 rounded-lg p-4">
      <h4 className="text-sm font-medium text-purple-400 mb-3">
        Attendance Requirements
      </h4>
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-300">Minimum Attendance:</p>
          <p className="text-sm font-medium text-white">
            {program.minimumAttendance} sessions
          </p>
        </div>
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-300">Required for Completion:</p>
          <p className="text-sm font-medium text-white">
            {program.requiredAttendance} sessions
          </p>
        </div>
        <div className="mt-2 pt-2 border-t border-gray-700">
          <p className="text-xs text-gray-400">
            Students must attend at least {program.minimumAttendance} sessions to pass, 
            and {program.requiredAttendance} sessions to receive a completion certificate.
          </p>
        </div>
      </div>
    </div>
  );
};

/**
 * Enrollment Status Component
 */
export const EnrollmentStatus = ({ 
  program, 
  calculateEnrollmentPercentage 
}: { 
  program: Program, 
  calculateEnrollmentPercentage: () => number 
}) => {
  const enrollmentPercentage = calculateEnrollmentPercentage();

  return (
    <div className="bg-indigo-500/20 border border-indigo-500/30 rounded-lg p-4">
      <h4 className="text-sm font-medium text-indigo-400 mb-3">
        Enrollment Status
      </h4>
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-300">Current Enrollment:</p>
          <p className="text-sm font-medium text-white">
            {program.enrolledCount} / {program.maxEnrollment}
          </p>
        </div>
        <div>
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>0%</span>
            <span>{enrollmentPercentage}%</span>
            <span>100%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className={`h-2 rounded-full ${
                enrollmentPercentage >= 90 ? 'bg-red-500' :
                enrollmentPercentage >= 75 ? 'bg-orange-500' :
                enrollmentPercentage >= 50 ? 'bg-yellow-500' : 'bg-green-500'
              }`} 
              style={{ width: `${enrollmentPercentage}%` }}
            ></div>
          </div>
        </div>
        <div className="mt-2 pt-2 border-t border-gray-700">
          <p className="text-xs text-gray-400">
            {program.maxEnrollment - program.enrolledCount} spots remaining
            {program.maxEnrollment - program.enrolledCount <= 5 && 
             program.maxEnrollment > program.enrolledCount && 
              ' (Limited availability)'
            }
            {program.enrolledCount >= program.maxEnrollment && ' (Program is full)'}
          </p>
        </div>
      </div>
    </div>
  );
};

/**
 * Program Summary Component
 */
export const ProgramSummary = ({ 
  program, 
  onRefresh 
}: { 
  program: Program, 
  onRefresh?: () => void 
}) => {
  return (
    <div className="bg-gray-700/50 rounded-lg p-3 mt-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 mb-1">
          <p className="text-xs text-gray-400">Program Summary</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Name:</p>
          <p className="text-sm text-gray-200">{program.name || 'Unnamed Program'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Status:</p>
          <p className={`text-sm ${program.isActive ? 'text-green-400' : 'text-red-400'}`}>
            {program.isActive ? 'Active' : 'Inactive'}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Term Fee:</p>
          <p className="text-sm text-gray-200">{formatEther(program.termFee)} ETH</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Enrollment:</p>
          <p className="text-sm text-gray-200">{program.enrolledCount} / {program.maxEnrollment}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Min. Attendance:</p>
          <p className="text-sm text-gray-200">{program.minimumAttendance} sessions</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Required Attendance:</p>
          <p className="text-sm text-gray-200">{program.requiredAttendance} sessions</p>
        </div>
      </div>
      {onRefresh && (
        <div className="flex justify-end mt-3">
          <button
            onClick={onRefresh}
            className="text-xs bg-blue-600/30 hover:bg-blue-600/40 text-blue-400 py-1 px-3 rounded"
          >
            Refresh Data
          </button>
        </div>
      )}
    </div>
  );
};

/**
 * Compact Program Card for use in lists or dashboards
 */
export const CompactProgramCard = ({ program }: { program: Program }) => {
  if (!program) return null;
  
  const enrollmentPercentage = Math.min(100, Math.round((program.enrolledCount / program.maxEnrollment) * 100));
  
  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-base font-medium text-gray-200">
          {program.name || 'Unnamed Program'}
        </h3>
        <div className={`text-xs px-2 py-0.5 rounded-full ${program.isActive ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
          {program.isActive ? 'Active' : 'Inactive'}
        </div>
      </div>
      
      <div className="flex justify-between text-xs text-gray-400 mb-1 mt-3">
        <span>Fee: {formatEther(program.termFee)} ETH</span>
        <span>{program.enrolledCount}/{program.maxEnrollment} enrolled</span>
      </div>
      
      <div className="w-full bg-gray-700 rounded-full h-1.5 mt-1">
        <div 
          className={`h-1.5 rounded-full ${
            enrollmentPercentage >= 90 ? 'bg-red-500' :
            enrollmentPercentage >= 75 ? 'bg-orange-500' :
            enrollmentPercentage >= 50 ? 'bg-yellow-500' : 'bg-green-500'
          }`} 
          style={{ width: `${enrollmentPercentage}%` }}
        ></div>
      </div>
    </div>
  );
};

/**
 * ProgramDetailsViewer Component
 * 
 * This component fetches and displays comprehensive details for a specific program ID
 * Uses the contractProgramManagementConfig by default
 */
interface ProgramDetailsViewerProps {
  programId: number;
  contract?: ContractConfig; // Optional - will use contractProgramManagementConfig by default
  onProgramRead?: (program: Program) => void; // Callback when program details are successfully read
}

const ProgramDetailsViewer = ({ 
  programId,
  contract = contractProgramManagementConfig,
  onProgramRead 
}: ProgramDetailsViewerProps) => {
  // Use the custom hook to get program details
  const {
    program,
    error,
    isLoading,
    isSuccess,
    refetch,
    calculateEnrollmentPercentage
  } = useProgramDetails(programId, contract);

  // Trigger the callback when data is loaded
  useEffect(() => {
    if (program && isSuccess && onProgramRead) {
      onProgramRead(program);
    }
  }, [program, isSuccess, onProgramRead]);

  // Render the component UI
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-gray-800/50 border border-gray-700 rounded-lg p-4"
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-blue-400">
          Program Details
        </h3>
        <div className="bg-gray-700/70 rounded-full px-3 py-1">
          <p className="text-xs font-medium text-gray-300">
            ID: {programId}
          </p>
        </div>
      </div>
      
      {programId <= 0 && (
        <div className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded-md p-3">
          <p className="text-sm">Please provide a valid program ID to view details.</p>
        </div>
      )}
      
      {programId > 0 && isLoading && (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-t-blue-400 border-blue-200/30 rounded-full animate-spin mr-2"></div>
          <span className="text-sm text-gray-300">Loading program details...</span>
        </div>
      )}
      
      {programId > 0 && error && (
        <div className="bg-red-500/20 text-red-400 border border-red-500/30 rounded-md p-4">
          <p className="text-sm">Error reading program details: {(error as Error).message || 'Unknown error'}</p>
          <button 
            onClick={() => refetch()} 
            className="text-xs mt-3 bg-gray-700 hover:bg-gray-600 text-gray-200 py-1 px-3 rounded"
          >
            Try Again
          </button>
        </div>
      )}
      
      {programId > 0 && isSuccess && program && (
        <div className="space-y-4">
          {/* Program Header */}
          <ProgramHeader program={program} />
          
          {/* Attendance and Enrollment */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AttendanceRequirements program={program} />
            <EnrollmentStatus 
              program={program} 
              calculateEnrollmentPercentage={calculateEnrollmentPercentage} 
            />
          </div>
          
          {/* Program Summary */}
          <ProgramSummary 
            program={program} 
            onRefresh={() => refetch()} 
          />
        </div>
      )}
    </motion.div>
  );
};

export default ProgramDetailsViewer;