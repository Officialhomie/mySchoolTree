import { useEffect } from 'react';
import { useReadContract } from 'wagmi';
import { motion } from 'framer-motion';
import { formatEther } from 'viem';

/**
 * Program structure matching the contract output
 */
interface Program {
  name: string;
  isActive: boolean;
  termFee: bigint;
  minimumAttendance: number;
  requiredAttendance: number;
  enrolledCount: number;
  maxEnrollment: number;
}

/**
 * ProgramDetailsViewer Component
 * 
 * This component fetches and displays comprehensive details for a specific program ID
 * from the contract. It shows various program attributes including name, status,
 * fees, attendance requirements, and enrollment statistics.
 */
interface ProgramDetailsViewerProps {
  contract: any;
  programId: number;
  onProgramRead?: (program: Program) => void; // Callback when program details are successfully read
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

const ProgramDetailsViewer = ({ 
  contract, 
  programId,
  onProgramRead 
}: ProgramDetailsViewerProps) => {
  // Get program details from the contract
  const { 
    data: programData,
    error,
    isLoading,
    isSuccess,
    refetch
  } = useReadContract({
    ...contract,
    functionName: 'programs',
    args: [programId],
    enabled: programId > 0, // Only run the query if we have a valid program ID
  });

  // Process program data when received
  useEffect(() => {
    if (programData && isSuccess && onProgramRead) {
      // Convert raw data to Program interface
      const typedData = programData as ProgramData;
      const program: Program = {
        name: typedData[0],
        isActive: typedData[1],
        termFee: typedData[2],
        minimumAttendance: Number(typedData[3]),
        requiredAttendance: Number(typedData[4]),
        enrolledCount: Number(typedData[5]),
        maxEnrollment: Number(typedData[6])
      };
      
      onProgramRead(program);
    }
  }, [programData, isSuccess, onProgramRead]);

  // Calculate enrollment percentage
  const calculateEnrollmentPercentage = (): number => {
    if (!programData || !isSuccess) return 0;
    
    const typedData = programData as ProgramData;
    const enrolledCount = Number(typedData[5]);
    const maxEnrollment = Number(typedData[6]);
    
    if (maxEnrollment === 0) return 0;
    return Math.min(100, Math.round((enrolledCount / maxEnrollment) * 100));
  };

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
      
      {programId > 0 && isSuccess && programData !== undefined && (
        <div className="space-y-4">
          {/* Program Header */}
          <div className="bg-gray-700/30 rounded-lg p-4 border border-gray-700">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold text-white">
                  {(programData as ProgramData)[0] || 'Unnamed Program'}
                </h2>
                <div className="flex items-center mt-1">
                  <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                    (programData as ProgramData)[1] ? 'bg-green-500' : 'bg-red-500'
                  }`}></span>
                  <span className={`text-sm ${
                    (programData as ProgramData)[1] ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {(programData as ProgramData)[1] ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
              <div className="bg-blue-500/20 rounded-lg px-3 py-2 border border-blue-500/30">
                <p className="text-sm font-medium text-blue-400">
                  {formatEther((programData as ProgramData)[2])} ETH
                </p>
                <p className="text-xs text-gray-400 mt-1">Term Fee</p>
              </div>
            </div>
          </div>
          
          {/* Attendance Requirements */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-purple-500/20 border border-purple-500/30 rounded-lg p-4">
              <h4 className="text-sm font-medium text-purple-400 mb-3">
                Attendance Requirements
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-300">Minimum Attendance:</p>
                  <p className="text-sm font-medium text-white">
                    {(programData as ProgramData)[3]} sessions
                  </p>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-300">Required for Completion:</p>
                  <p className="text-sm font-medium text-white">
                    {(programData as ProgramData)[4]} sessions
                  </p>
                </div>
                <div className="mt-2 pt-2 border-t border-gray-700">
                  <p className="text-xs text-gray-400">
                    Students must attend at least {(programData as ProgramData)[3]} sessions to pass, 
                    and {(programData as ProgramData)[4]} sessions to receive a completion certificate.
                  </p>
                </div>
              </div>
            </div>
            
            {/* Enrollment Status */}
            <div className="bg-indigo-500/20 border border-indigo-500/30 rounded-lg p-4">
              <h4 className="text-sm font-medium text-indigo-400 mb-3">
                Enrollment Status
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-300">Current Enrollment:</p>
                  <p className="text-sm font-medium text-white">
                    {(programData as ProgramData)[5]} / {(programData as ProgramData)[6]}
                  </p>
                </div>
                <div>
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>0%</span>
                    <span>{calculateEnrollmentPercentage()}%</span>
                    <span>100%</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        calculateEnrollmentPercentage() >= 90 ? 'bg-red-500' :
                        calculateEnrollmentPercentage() >= 75 ? 'bg-orange-500' :
                        calculateEnrollmentPercentage() >= 50 ? 'bg-yellow-500' : 'bg-green-500'
                      }`} 
                      style={{ width: `${calculateEnrollmentPercentage()}%` }}
                    ></div>
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-gray-700">
                  <p className="text-xs text-gray-400">
                    {(programData as ProgramData)[6] - (programData as ProgramData)[5]} spots remaining
                    {(programData as ProgramData)[6] - (programData as ProgramData)[5] <= 5 && 
                     (programData as ProgramData)[6] > (programData as ProgramData)[5] && 
                      ' (Limited availability)'
                    }
                    {(programData as ProgramData)[5] >= (programData as ProgramData)[6] && ' (Program is full)'}
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Program Summary */}
          <div className="bg-gray-700/50 rounded-lg p-3 mt-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 mb-1">
                <p className="text-xs text-gray-400">Program Summary</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Name:</p>
                <p className="text-sm text-gray-200">{(programData as ProgramData)[0] || 'Unnamed Program'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Status:</p>
                <p className={`text-sm ${(programData as ProgramData)[1] ? 'text-green-400' : 'text-red-400'}`}>
                  {(programData as ProgramData)[1] ? 'Active' : 'Inactive'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Term Fee:</p>
                <p className="text-sm text-gray-200">{formatEther((programData as ProgramData)[2])} ETH</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Enrollment:</p>
                <p className="text-sm text-gray-200">{(programData as ProgramData)[5]} / {(programData as ProgramData)[6]}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Min. Attendance:</p>
                <p className="text-sm text-gray-200">{(programData as ProgramData)[3]} sessions</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Required Attendance:</p>
                <p className="text-sm text-gray-200">{(programData as ProgramData)[4]} sessions</p>
              </div>
            </div>
            <div className="flex justify-end mt-3">
              <button
                onClick={() => refetch()}
                className="text-xs bg-blue-600/30 hover:bg-blue-600/40 text-blue-400 py-1 px-3 rounded"
              >
                Refresh Data
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default ProgramDetailsViewer;