import { useState, useEffect, useCallback } from 'react';
import { useReadContract } from 'wagmi';
import { motion } from 'framer-motion';
import { formatEther, Address } from 'viem';

// Import the contract configuration
import { contractProgramManagementConfig } from '../contracts';

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

// Contract configuration type
interface ContractConfig {
  address: string;
  abi: any[];
}

/**
 * Unified Program Data Interface
 * Combines all relevant program information
 */
export interface UnifiedProgramData {
  program: Program | null;
  programId: number;
  attendanceRequirement: number | null;
  hasSignificantRequirement: boolean;
  loading: {
    program: boolean;
    attendance: boolean;
  };
  error: {
    program: Error | null;
    attendance: Error | null;
  };
  refetch: {
    program: () => Promise<any>;
    attendance: () => Promise<any>;
    all: () => Promise<void>;
  };
  metrics: {
    enrollmentPercentage: number;
    spotsRemaining: number;
    isFullyEnrolled: boolean;
    isLimitedAvailability: boolean;
  };
}

/**
 * Custom unified hook for program data
 */
export const useUnifiedProgramData = (
  programId: number,
  contract: ContractConfig = contractProgramManagementConfig
): UnifiedProgramData => {
  const [program, setProgram] = useState<Program | null>(null);
  const [attendanceRequirement, setAttendanceRequirement] = useState<number | null>(null);

  // Program data contract call
  const { 
    data: programData,
    error: programError,
    isLoading: isProgramLoading,
    isSuccess: isProgramSuccess,
    refetch: refetchProgram
  } = useReadContract({
    address: contract.address as Address,
    abi: contract.abi,
    functionName: 'programs',
    args: programId > 0 ? [BigInt(programId)] : undefined,
  });

  // Attendance requirement contract call
  const { 
    data: requirementData,
    error: requirementError,
    isLoading: isRequirementLoading,
    isSuccess: isRequirementSuccess,
    refetch: refetchRequirement
  } = useReadContract({
    address: contract.address as Address,
    abi: contract.abi,
    functionName: 'getProgramAttendanceRequirement',
    args: programId > 0 ? [BigInt(programId)] : undefined,
  });

  // Process program data when received
  useEffect(() => {
    if (programData && isProgramSuccess) {
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
  }, [programData, isProgramSuccess]);

  // Process attendance requirement when received
  useEffect(() => {
    if (requirementData !== undefined && isRequirementSuccess) {
      setAttendanceRequirement(Number(requirementData));
    }
  }, [requirementData, isRequirementSuccess]);

  // Function to refetch all data
  const refetchAll = useCallback(async () => {
    await Promise.all([
      refetchProgram(),
      refetchRequirement()
    ]);
  }, [refetchProgram, refetchRequirement]);

  // Calculate metrics
  const calculateMetrics = useCallback(() => {
    if (!program) {
      return {
        enrollmentPercentage: 0,
        spotsRemaining: 0,
        isFullyEnrolled: false,
        isLimitedAvailability: false
      };
    }

    const { enrolledCount, maxEnrollment } = program;
    const enrollmentPercentage = maxEnrollment === 0 ? 0 : Math.min(100, Math.round((enrolledCount / maxEnrollment) * 100));
    const spotsRemaining = Math.max(0, maxEnrollment - enrolledCount);
    
    return {
      enrollmentPercentage,
      spotsRemaining,
      isFullyEnrolled: enrolledCount >= maxEnrollment,
      isLimitedAvailability: spotsRemaining <= 5 && spotsRemaining > 0
    };
  }, [program]);
  
  const metrics = calculateMetrics();
  const hasSignificantRequirement = attendanceRequirement !== null && attendanceRequirement > 0;

  return {
    program,
    programId,
    attendanceRequirement,
    hasSignificantRequirement,
    loading: {
      program: isProgramLoading,
      attendance: isRequirementLoading
    },
    error: {
      program: programError as Error | null,
      attendance: requirementError as Error | null
    },
    refetch: {
      program: refetchProgram,
      attendance: refetchRequirement,
      all: refetchAll
    },
    metrics
  };
};

/**
 * Program Status Badge Component
 */
export const ProgramStatusBadge = ({ isActive }: { isActive: boolean }) => (
  <div className={`px-2 py-0.5 text-xs font-medium rounded-full ${
    isActive 
      ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
      : 'bg-red-500/20 text-red-400 border border-red-500/30'
  }`}>
    {isActive ? 'Active' : 'Inactive'}
  </div>
);

/**
 * Program Fee Display Component
 */
export const ProgramFeeDisplay = ({ termFee }: { termFee: bigint }) => (
  <div className="bg-blue-500/20 rounded-lg px-3 py-2 border border-blue-500/30">
    <p className="text-sm font-medium text-blue-400">
      {formatEther(termFee)} ETH
    </p>
    <p className="text-xs text-gray-400 mt-1">Term Fee</p>
  </div>
);

/**
 * Enrollment Progress Bar Component
 */
export const EnrollmentProgressBar = ({ 
  enrollmentPercentage 
}: { 
  enrollmentPercentage: number 
}) => (
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
);

/**
 * Compact Data Card Component
 */
export const DataCard = ({ 
  label, 
  value,
  accentColor = 'blue'
}: { 
  label: string, 
  value: string | number | JSX.Element,
  accentColor?: 'blue' | 'green' | 'purple' | 'indigo' | 'yellow' | 'red'
}) => {
  const colors = {
    blue: 'bg-blue-500/20 border-blue-500/30 text-blue-400',
    green: 'bg-green-500/20 border-green-500/30 text-green-400',
    purple: 'bg-purple-500/20 border-purple-500/30 text-purple-400',
    indigo: 'bg-indigo-500/20 border-indigo-500/30 text-indigo-400',
    yellow: 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400',
    red: 'bg-red-500/20 border-red-500/30 text-red-400'
  };

  return (
    <div className={`rounded-lg p-3 border ${colors[accentColor]}`}>
      <p className="text-sm font-medium mb-1">{label}</p>
      <div className="text-white">{value}</div>
    </div>
  );
};

/**
 * Enrollment Status Component
 */
export const EnrollmentStatus = ({ programData }: { programData: UnifiedProgramData }) => {
  if (!programData.program) return null;
  
  const { program, metrics } = programData;
  
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
        
        <EnrollmentProgressBar enrollmentPercentage={metrics.enrollmentPercentage} />
        
        <div className="mt-2 pt-2 border-t border-gray-700">
          <p className="text-xs text-gray-400">
            {metrics.spotsRemaining} spots remaining
            {metrics.isLimitedAvailability && ' (Limited availability)'}
            {metrics.isFullyEnrolled && ' (Program is full)'}
          </p>
        </div>
      </div>
    </div>
  );
};

/**
 * Attendance Requirements Component
 */
export const AttendanceRequirements = ({ programData }: { programData: UnifiedProgramData }) => {
  if (!programData.program) return null;
  
  const { program, attendanceRequirement, hasSignificantRequirement } = programData;
  
  return (
    <div className={`rounded-lg p-4 ${
      hasSignificantRequirement 
        ? 'bg-purple-500/20 border border-purple-500/30' 
        : 'bg-gray-700/30 border border-gray-700'
    }`}>
      <h4 className={`text-sm font-medium mb-3 ${
        hasSignificantRequirement ? 'text-purple-400' : 'text-gray-400'
      }`}>
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
        {attendanceRequirement !== null && (
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-300">Contract Requirement:</p>
            <p className="text-sm font-medium text-white">
              {attendanceRequirement} sessions
            </p>
          </div>
        )}
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
 * Program Header Component
 */
export const ProgramHeader = ({ programData }: { programData: UnifiedProgramData }) => {
  if (!programData.program) return null;
  
  const { program, programId } = programData;
  
  return (
    <div className="bg-gray-700/30 rounded-lg p-4 border border-gray-700">
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center">
            <h2 className="text-xl font-bold text-white mr-3">
              {program.name || 'Unnamed Program'}
            </h2>
            <div className="bg-gray-800 px-2 py-0.5 rounded text-xs text-gray-400">
              ID: {programId}
            </div>
          </div>
          <div className="flex items-center mt-2">
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
        <ProgramFeeDisplay termFee={program.termFee} />
      </div>
    </div>
  );
};

/**
 * Program Summary Component
 */
export const ProgramSummary = ({ 
  programData, 
  onRefresh 
}: { 
  programData: UnifiedProgramData,
  onRefresh?: () => Promise<void>
}) => {
  if (!programData.program) return null;
  
  const { program, programId, attendanceRequirement } = programData;
  
  return (
    <div className="bg-gray-700/50 rounded-lg p-4 mt-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 mb-1">
          <p className="text-xs text-gray-400">Program Summary</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Name:</p>
          <p className="text-sm text-gray-200">{program.name || 'Unnamed Program'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Program ID:</p>
          <p className="text-sm text-gray-200">#{programId}</p>
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
        {attendanceRequirement !== null && (
          <div>
            <p className="text-xs text-gray-400">Contract Requirement:</p>
            <p className="text-sm text-gray-200">{attendanceRequirement} sessions</p>
          </div>
        )}
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
export const CompactProgramCard = ({ programData }: { programData: UnifiedProgramData }) => {
  if (!programData.program) return null;
  
  const { program, programId, metrics } = programData;
  
  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center">
          <h3 className="text-base font-medium text-gray-200 mr-2">
            {program.name || 'Unnamed Program'}
          </h3>
          <div className="text-xs bg-gray-700 px-1.5 py-0.5 rounded text-gray-400">
            #{programId}
          </div>
        </div>
        <ProgramStatusBadge isActive={program.isActive} />
      </div>
      
      <div className="flex justify-between text-xs text-gray-400 mb-1 mt-3">
        <span>Fee: {formatEther(program.termFee)} ETH</span>
        <span>{program.enrolledCount}/{program.maxEnrollment} enrolled</span>
      </div>
      
      <EnrollmentProgressBar enrollmentPercentage={metrics.enrollmentPercentage} />
      
      {programData.hasSignificantRequirement && (
        <div className="mt-2 pt-2 border-t border-gray-700/50 text-xs text-purple-400 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          Requires {programData.attendanceRequirement} sessions
        </div>
      )}
    </div>
  );
};

/**
 * UnifiedProgramComponent Props
 */
interface UnifiedProgramComponentProps {
  programId: number;
  contract?: ContractConfig;
  onProgramDataLoad?: (programData: UnifiedProgramData) => void;
  compact?: boolean;
}

/**
 * Unified Program Component
 * Combines program details, attendance requirements, and enrollment information
 */
const UnifiedProgramComponent = ({
  programId,
  contract = contractProgramManagementConfig,
  onProgramDataLoad,
  compact = false
}: UnifiedProgramComponentProps) => {
  // Use the unified hook to get all program data
  const programData = useUnifiedProgramData(programId, contract);
  const isLoading = programData.loading.program || programData.loading.attendance;
  const hasError = programData.error.program || programData.error.attendance;
  
  // Callback when data is loaded
  useEffect(() => {
    if (programData.program && onProgramDataLoad) {
      onProgramDataLoad(programData);
    }
  }, [programData, onProgramDataLoad]);

  // Compact view
  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {programId <= 0 ? (
          <div className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded-md p-3 text-sm">
            Please select a valid program ID
          </div>
        ) : isLoading ? (
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3 flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-t-blue-400 border-blue-200/30 rounded-full animate-spin mr-2"></div>
            <span className="text-sm text-gray-300">Loading program data...</span>
          </div>
        ) : hasError ? (
          <div className="bg-red-500/20 text-red-400 border border-red-500/30 rounded-md p-3 text-sm">
            Error loading program data
          </div>
        ) : programData.program ? (
          <CompactProgramCard programData={programData} />
        ) : (
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3 text-sm text-gray-400">
            No program data available
          </div>
        )}
      </motion.div>
    );
  }

  // Full view
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-gray-800/50 border border-gray-700 rounded-lg p-5"
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold text-blue-400">
          Program Overview
        </h3>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={programData.refetch.all}
          disabled={isLoading}
          className="bg-blue-500/20 text-blue-400 px-3 py-1.5 rounded hover:bg-blue-500/30 transition-colors duration-300 disabled:opacity-50 text-sm"
        >
          {isLoading ? 'Loading...' : 'Refresh'}
        </motion.button>
      </div>
      
      {programId <= 0 && (
        <div className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded-md p-4">
          <p className="text-sm">Please provide a valid program ID to view details.</p>
        </div>
      )}
      
      {programId > 0 && isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-3 border-t-blue-400 border-r-purple-500 border-b-blue-400 border-l-purple-500 rounded-full animate-spin mr-3"></div>
          <span className="text-base text-gray-300">Loading program data...</span>
        </div>
      )}
      
      {programId > 0 && hasError && (
        <div className="bg-red-500/20 text-red-400 border border-red-500/30 rounded-md p-4">
          <p className="text-sm">
            {programData.error.program ? 
              `Error loading program: ${programData.error.program.message || 'Unknown error'}` : 
              programData.error.attendance ? 
                `Error loading attendance: ${programData.error.attendance.message || 'Unknown error'}` : 
                'An error occurred while loading program data'
            }
          </p>
          <button 
            onClick={programData.refetch.all} 
            className="text-xs mt-3 bg-gray-700 hover:bg-gray-600 text-gray-200 py-1 px-3 rounded"
          >
            Try Again
          </button>
        </div>
      )}
      
      {programId > 0 && !isLoading && !hasError && programData.program && (
        <div className="space-y-4">
          {/* Program Header */}
          <ProgramHeader programData={programData} />
          
          {/* Attendance and Enrollment */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AttendanceRequirements programData={programData} />
            <EnrollmentStatus programData={programData} />
          </div>
          
          {/* Program Summary */}
          <ProgramSummary 
            programData={programData} 
            onRefresh={programData.refetch.all} 
          />
        </div>
      )}
    </motion.div>
  );
};

export default UnifiedProgramComponent;