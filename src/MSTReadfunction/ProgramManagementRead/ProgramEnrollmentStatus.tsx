import { useState, useEffect } from 'react';
import { useReadContract } from 'wagmi';
import { motion } from 'framer-motion';

// Import the CurrentProgramIdReader component
import CurrentProgramIdReader from './getProgramID';

/**
 * ProgramEnrollmentStatus Component
 * 
 * This component combines program enrollment data by fetching:
 * 1. Current enrollment count
 * 2. Maximum enrollment limit
 * 
 * It also includes the CurrentProgramIdReader to ensure we have a valid program ID.
 */
interface ProgramEnrollmentStatusProps {
  contract: any;
  initialProgramId?: number; // Optional initial program ID
  onEnrollmentDataRead?: (currentEnrollment: number, maxEnrollment: number, programId: number) => void;
}

const ProgramEnrollmentStatus = ({
  contract,
  initialProgramId = 0,
  onEnrollmentDataRead
}: ProgramEnrollmentStatusProps) => {
  // State for program ID and enrollment data
  const [programId, setProgramId] = useState<number>(initialProgramId);
  const [currentEnrollment, setCurrentEnrollment] = useState<number>(0);
  const [maxEnrollment, setMaxEnrollment] = useState<number>(0);
  
  // Get current enrollment count from the contract
  const { 
    data: enrollmentCountData,
    error: enrollmentCountError,
    isLoading: isLoadingCount,
    isSuccess: isSuccessCount,
    refetch: refetchCount
  } = useReadContract({
    ...contract,
    functionName: 'getProgramEnrollmentCount',
    args: [programId],
    enabled: programId > 0, // Only run when we have a valid program ID
  });

  // Get maximum enrollment limit from the contract
  const {
    data: maxEnrollmentData,
    error: maxEnrollmentError,
    isLoading: isLoadingMax,
    isSuccess: isSuccessMax,
    refetch: refetchMax
  } = useReadContract({
    ...contract,
    functionName: 'getProgramMaxEnrollment',
    args: [programId],
    enabled: programId > 0, // Only run when we have a valid program ID
  });

  // Process enrollment count data
  useEffect(() => {
    if (enrollmentCountData !== undefined && isSuccessCount) {
      setCurrentEnrollment(Number(enrollmentCountData));
    }
  }, [enrollmentCountData, isSuccessCount]);

  // Process max enrollment data
  useEffect(() => {
    if (maxEnrollmentData !== undefined && isSuccessMax) {
      setMaxEnrollment(Number(maxEnrollmentData));
    }
  }, [maxEnrollmentData, isSuccessMax]);

  // Call callback when both data points are available
  useEffect(() => {
    if (isSuccessCount && isSuccessMax && programId > 0 && onEnrollmentDataRead) {
      onEnrollmentDataRead(currentEnrollment, maxEnrollment, programId);
    }
  }, [currentEnrollment, maxEnrollment, programId, isSuccessCount, isSuccessMax, onEnrollmentDataRead]);

  // Calculate enrollment percentage
  const calculateEnrollmentPercentage = () => {
    if (maxEnrollment > 0) {
      return Math.min(100, Math.round((currentEnrollment / maxEnrollment) * 100));
    }
    return 0;
  };

  // Get enrollment status text and color
  const getEnrollmentStatus = () => {
    const percentage = calculateEnrollmentPercentage();
    
    if (percentage >= 100) {
      return {
        text: 'Full',
        color: 'text-red-400',
        bgColor: 'bg-red-500/20',
        borderColor: 'border-red-500/30'
      };
    } else if (percentage >= 75) {
      return {
        text: 'Almost Full',
        color: 'text-orange-400',
        bgColor: 'bg-orange-500/20',
        borderColor: 'border-orange-500/30'
      };
    } else if (percentage >= 25) {
      return {
        text: 'Filling Up',
        color: 'text-yellow-400',
        bgColor: 'bg-yellow-500/20',
        borderColor: 'border-yellow-500/30'
      };
    } else if (percentage > 0) {
      return {
        text: 'Open',
        color: 'text-green-400',
        bgColor: 'bg-green-500/20',
        borderColor: 'border-green-500/30'
      };
    } else {
      return {
        text: 'No Enrollment Data',
        color: 'text-gray-400',
        bgColor: 'bg-gray-500/20',
        borderColor: 'border-gray-500/30'
      };
    }
  };

  // Handle refetching all data
  const refetchAllData = () => {
    if (programId > 0) {
      refetchCount();
      refetchMax();
    }
  };

  // Callback when program ID is read from CurrentProgramIdReader
  const onProgramIdRead = (id: number) => {
    setProgramId(id);
  };

  // Get enrollment status
  const status = getEnrollmentStatus();
  const enrollmentPercentage = calculateEnrollmentPercentage();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="space-y-6"
    >
      {/* Include the CurrentProgramIdReader component */}
      <CurrentProgramIdReader 
        contract={contract}
        onProgramIdRead={onProgramIdRead}
      />
      
      {/* Enrollment Status Card */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="bg-gray-800/50 border border-gray-700 rounded-lg p-4"
      >
        <h3 className="text-lg font-medium text-blue-400 mb-2">
          Program Enrollment Status
        </h3>
        
        {programId <= 0 && (
          <div className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded-md p-3">
            <p className="text-sm">Please select a valid program ID to view enrollment data.</p>
          </div>
        )}
        
        {programId > 0 && (isLoadingCount || isLoadingMax) && (
          <div className="flex items-center justify-center py-3">
            <div className="w-5 h-5 border-2 border-t-blue-400 border-blue-200/30 rounded-full animate-spin mr-2"></div>
            <span className="text-sm text-gray-300">Reading enrollment data...</span>
          </div>
        )}
        
        {programId > 0 && (enrollmentCountError || maxEnrollmentError) && (
          <div className="bg-red-500/20 text-red-400 border border-red-500/30 rounded-md p-3">
            <p className="text-sm">Error reading enrollment data: {
              ((enrollmentCountError || maxEnrollmentError) as Error).message || 'Unknown error'
            }</p>
            <button 
              onClick={refetchAllData} 
              className="text-xs mt-2 bg-gray-700 hover:bg-gray-600 text-gray-200 py-1 px-2 rounded"
            >
              Try Again
            </button>
          </div>
        )}
        
        {programId > 0 && isSuccessCount && isSuccessMax && (
          <div className="space-y-3">
            {/* Enrollment Status Badge */}
            <div className={`${status.bgColor} ${status.borderColor} rounded-md p-3`}>
              <div className="flex justify-between items-center">
                <div>
                  <p className={`text-sm font-medium ${status.color}`}>
                    {status.text}
                  </p>
                  <p className="text-xs text-gray-300 mt-1">
                    Program #{programId}
                  </p>
                </div>
                <div className="bg-gray-900/40 rounded-full px-3 py-1">
                  <p className={`text-xs font-medium ${status.color}`}>
                    {enrollmentPercentage}% Full
                  </p>
                </div>
              </div>
            </div>
            
            {/* Enrollment Progress Bar */}
            <div className="bg-gray-700/50 rounded-md p-3">
              <div className="flex justify-between items-center mb-1">
                <p className="text-xs text-gray-400">Current Enrollment</p>
                <p className="text-xs text-gray-300">
                  {currentEnrollment} / {maxEnrollment}
                </p>
              </div>
              
              <div className="w-full bg-gray-700 rounded-full h-2.5">
                <div 
                  className={`h-2.5 rounded-full ${
                    enrollmentPercentage >= 100 ? 'bg-red-500' :
                    enrollmentPercentage >= 75 ? 'bg-orange-500' :
                    enrollmentPercentage >= 25 ? 'bg-yellow-500' : 'bg-green-500'
                  }`} 
                  style={{ width: `${enrollmentPercentage}%` }}
                ></div>
              </div>
              
              <div className="flex justify-between mt-3">
                <div>
                  <p className="text-xs text-gray-400">Available Spots</p>
                  <p className="text-sm text-gray-200 mt-1">
                    {Math.max(0, maxEnrollment - currentEnrollment)} remaining
                  </p>
                </div>
                <button
                  onClick={refetchAllData}
                  className="text-xs bg-blue-600/30 hover:bg-blue-600/40 text-blue-400 py-1 px-2 rounded"
                >
                  Refresh
                </button>
              </div>
            </div>
            
            {/* Raw Data Display */}
            <div className="bg-gray-900/40 rounded-md p-2 flex justify-between text-xs">
              <div className="flex flex-col text-gray-400">
                <span>Current: {String(enrollmentCountData)}</span>
                <span>Maximum: {String(maxEnrollmentData)}</span>
              </div>
              <div className="text-right text-gray-400">
                <span>Program ID: {programId}</span>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default ProgramEnrollmentStatus;