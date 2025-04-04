import { useState, useEffect } from 'react';
import { useReadContract } from 'wagmi';
import { motion } from 'framer-motion';

// Interface for the hook's return values
interface UseStudentProgressTrackerReturn {
  studentAddress: string;
  setStudentAddress: (address: string) => void;
  progress: bigint | null;
  showProgress: boolean;
  fetchStatus: string;
  showStatus: boolean;
  isFetching: boolean;
  isLoading: boolean;
  isError: boolean;
  handleFetchProgress: () => Promise<void>;
  formatProgressPercentage: (progressValue: bigint | null) => string;
  getProgressPercentage: (progressValue: bigint | null) => number;
  getProgressColor: (percent: number) => string;
  refetch: () => Promise<any>;
}

// Custom hook for student progress tracker logic and state
const useStudentProgressTracker = (
  contract: { address: `0x${string}`; abi: any },
  initialAddress: string = ''
): UseStudentProgressTrackerReturn => {
  const [studentAddress, setStudentAddress] = useState<string>(initialAddress);
  const [progress, setProgress] = useState<bigint | null>(null);
  const [showProgress, setShowProgress] = useState<boolean>(false);
  const [fetchStatus, setFetchStatus] = useState<string>('');
  const [showStatus, setShowStatus] = useState<boolean>(false);
  const [isFetching, setIsFetching] = useState<boolean>(false);

  // Read contract hook
  const { isError, isLoading, refetch } = useReadContract({
    ...contract,
    functionName: 'getStudentProgress',
    args: studentAddress ? [studentAddress] : undefined,
  });

  // Format progress percentage for display
  const formatProgressPercentage = (progressValue: bigint | null): string => {
    if (!progressValue) return '0';
    return (Number(progressValue) / 100).toFixed(2);
  };

  // Get visual representation of progress (0-100%)
  const getProgressPercentage = (progressValue: bigint | null): number => {
    if (!progressValue) return 0;
    const percent = Number(progressValue) / 100;
    return Math.min(Math.max(percent, 0), 100); // Clamp between 0-100
  };

  // Get color based on progress level
  const getProgressColor = (percent: number): string => {
    if (percent < 30) return 'from-red-500 to-red-600';
    if (percent < 70) return 'from-yellow-500 to-yellow-600';
    return 'from-green-500 to-green-600';
  };

  // Handle fetch progress
  const handleFetchProgress = async () => {
    if (!studentAddress) {
      setFetchStatus('Please enter a student address');
      setShowStatus(true);
      return;
    }

    setIsFetching(true);
    
    try {
      const result = await refetch();
      
      if (result.data !== undefined) {
        setProgress(result.data as bigint);
        setFetchStatus('Student progress fetched successfully');
        setShowProgress(true);
      } else {
        setFetchStatus('No progress data found');
        setProgress(null);
        setShowProgress(false);
      }
    } catch (error) {
      console.error('Error fetching student progress:', error);
      setFetchStatus('Error fetching student progress');
      setProgress(null);
      setShowProgress(false);
    } finally {
      setIsFetching(false);
      setShowStatus(true);
    }
  };

  useEffect(() => {
    if (showStatus) {
      const timer = setTimeout(() => {
        setShowStatus(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showStatus]);

  return {
    studentAddress,
    setStudentAddress,
    progress,
    showProgress,
    fetchStatus,
    showStatus,
    isFetching,
    isLoading,
    isError,
    handleFetchProgress,
    formatProgressPercentage,
    getProgressPercentage,
    getProgressColor,
    refetch
  };
};

// Main component that uses the custom hook
const StudentProgressTracker = ({ contract }: { contract: { address: `0x${string}`; abi: any } }) => {
  const {
    studentAddress,
    setStudentAddress,
    progress,
    showProgress,
    fetchStatus,
    showStatus,
    isFetching,
    isLoading,
    isError,
    handleFetchProgress,
    formatProgressPercentage,
    getProgressPercentage,
    getProgressColor
  } = useStudentProgressTracker(contract);

  const progressPercent = getProgressPercentage(progress);
  const progressColorClass = getProgressColor(progressPercent);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-gray-900/90 backdrop-blur-sm border border-gray-700 shadow-xl rounded-lg p-6 max-w-full mx-auto w-full md:max-w-full mb-9"
    >
      <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
        Student Progress Tracker
      </h2>

      <p className="text-gray-300 text-sm mb-4">
        Check a student's overall progress in their educational journey.
      </p>

      <div className="mb-6">
        <label className="block text-gray-300 text-sm font-medium mb-2">
          Student Address
        </label>
        <input
          type="text"
          value={studentAddress}
          onChange={(e) => setStudentAddress(e.target.value)}
          placeholder="0x..."
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-gray-300 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
      </div>

      <motion.button
        onClick={handleFetchProgress}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        disabled={isLoading || isFetching}
        className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-2 px-4 rounded-md hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50 transition-colors duration-300 shadow-lg disabled:opacity-50"
      >
        {isLoading || isFetching ? 'Loading...' : 'Check Progress'}
      </motion.button>
      
      {showStatus && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="mt-4"
        >
          <p className={`p-2 rounded-md ${fetchStatus.includes('Error') || fetchStatus.includes('Please enter') ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
            {fetchStatus}
          </p>
        </motion.div>
      )}
      
      {(isLoading || isFetching) && (
        <div className="flex justify-center items-center h-40">
          <div className="w-10 h-10 border-4 border-t-blue-400 border-r-purple-500 border-b-blue-400 border-l-purple-500 rounded-full animate-spin"></div>
          <span className="ml-3 text-gray-300">Loading student progress...</span>
        </div>
      )}
      
      {isError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-4 mt-4">
          <div className="text-red-400 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mx-auto mb-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <p className="text-lg">Error fetching student progress</p>
          </div>
        </div>
      )}
      
      {showProgress && progress !== null && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          transition={{ duration: 0.3 }}
          className="mt-6"
        >
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-5 shadow-lg">
            <h3 className="text-xl font-semibold mb-4 text-blue-400">Progress Summary</h3>
            
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-300">Overall Progress</span>
                <span className="text-gray-300 font-bold">{formatProgressPercentage(progress)}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-4 overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className={`h-full bg-gradient-to-r ${progressColorClass}`}
                ></motion.div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
              {/* Progress Level Card */}
              <div className="bg-gray-800/80 rounded-lg p-4 border border-gray-700">
                <p className="text-sm text-gray-400 mb-1">Progress Level</p>
                <div className="flex items-baseline space-x-1">
                  <span className="text-2xl font-bold text-gray-200">{formatProgressPercentage(progress)}</span>
                  <span className="text-gray-400">%</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Overall completion percentage</p>
              </div>
              
              {/* Status Card */}
              <div className="bg-gray-800/80 rounded-lg p-4 border border-gray-700">
                <p className="text-sm text-gray-400 mb-1">Status</p>
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${
                    progressPercent < 30 ? 'bg-red-500' : 
                    progressPercent < 70 ? 'bg-yellow-500' : 
                    'bg-green-500'
                  }`}></div>
                  <span className="text-lg font-bold text-gray-200">
                    {progressPercent < 30 ? 'Starting' : 
                     progressPercent < 70 ? 'In Progress' : 
                     'Advanced'}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Current learning status</p>
              </div>
              
              {/* Raw Value Card */}
              <div className="bg-gray-800/80 rounded-lg p-4 border border-gray-700">
                <p className="text-sm text-gray-400 mb-1">Raw Value</p>
                <div className="flex items-baseline space-x-1">
                  <span className="text-md font-bold text-gray-200 truncate">{progress?.toString()}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Raw progress value (basis points)</p>
              </div>
            </div>
            
            {/* Progress Assessment */}
            <div className="mt-6 p-4 bg-gray-800/30 rounded-lg border border-gray-700">
              <h4 className="font-medium text-gray-300 mb-2">Assessment</h4>
              <p className="text-sm text-gray-400">
                {progressPercent < 30 ? 
                  'The student is in the early stages of their educational journey. More focus and engagement may be needed to improve progress.' : 
                 progressPercent < 70 ? 
                  'The student is making steady progress in their educational journey. Continued engagement will help them reach advanced stages.' : 
                  'The student is at an advanced stage in their educational journey. They are demonstrating excellent progress and engagement.'
                }
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

// Additional exportable components for reuse in other parts of the application

// A simple progress bar component
export const ProgressBar = ({ 
  progress,
  formatProgressPercentage,
  getProgressPercentage,
  getProgressColor,
  showPercentage = true,
  height = "h-4",
  animated = true
}: { 
  progress: bigint | null;
  formatProgressPercentage: (progress: bigint | null) => string;
  getProgressPercentage: (progress: bigint | null) => number;
  getProgressColor: (percent: number) => string;
  showPercentage?: boolean;
  height?: string;
  animated?: boolean;
}) => {
  const progressPercent = getProgressPercentage(progress);
  const progressColorClass = getProgressColor(progressPercent);

  return (
    <div>
      {showPercentage && (
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm text-gray-400">Progress</span>
          <span className="text-sm font-medium text-gray-300">{formatProgressPercentage(progress)}%</span>
        </div>
      )}
      <div className={`w-full bg-gray-700 rounded-full ${height} overflow-hidden`}>
        {animated ? (
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className={`h-full bg-gradient-to-r ${progressColorClass}`}
          ></motion.div>
        ) : (
          <div 
            className={`h-full bg-gradient-to-r ${progressColorClass}`}
            style={{ width: `${progressPercent}%` }}
          ></div>
        )}
      </div>
    </div>
  );
};

// A compact progress indicator component
export const CompactProgressIndicator = ({
  progress
}: {
  progress: bigint | null;
}) => {
  // Format progress percentage for display
  const formatProgressPercentage = (progressValue: bigint | null): string => {
    if (!progressValue) return '0';
    return (Number(progressValue) / 100).toFixed(2);
  };

  // Get visual representation of progress (0-100%)
  const getProgressPercentage = (progressValue: bigint | null): number => {
    if (!progressValue) return 0;
    const percent = Number(progressValue) / 100;
    return Math.min(Math.max(percent, 0), 100); // Clamp between 0-100
  };

  // Get color based on progress level
  const getProgressColor = (percent: number): string => {
    if (percent < 30) return 'from-red-500 to-red-600';
    if (percent < 70) return 'from-yellow-500 to-yellow-600';
    return 'from-green-500 to-green-600';
  };

  const progressPercent = getProgressPercentage(progress);
  
  // Determine status text based on progress level
  const getStatusText = (percent: number): string => {
    if (percent < 30) return 'Starting';
    if (percent < 70) return 'In Progress';
    return 'Advanced';
  };

  // Determine status color based on progress level
  const getStatusColor = (percent: number): string => {
    if (percent < 30) return 'text-red-500';
    if (percent < 70) return 'text-yellow-500';
    return 'text-green-500';
  };

  const statusText = getStatusText(progressPercent);
  const statusColor = getStatusColor(progressPercent);

  return (
    <div className="p-3 bg-gray-800 rounded-lg border border-gray-700">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm text-gray-400">Progress</span>
        <span className={`text-sm font-medium ${statusColor}`}>{statusText}</span>
      </div>
      
      <ProgressBar 
        progress={progress}
        formatProgressPercentage={formatProgressPercentage}
        getProgressPercentage={getProgressPercentage}
        getProgressColor={getProgressColor}
        showPercentage={false}
        height="h-2"
        animated={false}
      />
      
      <div className="flex justify-end mt-1">
        <span className="text-sm font-medium text-gray-300">{formatProgressPercentage(progress)}%</span>
      </div>
    </div>
  );
};

// A detailed progress summary component
export const ProgressSummary = ({
  progress
}: {
  progress: bigint | null;
}) => {
  // Format progress percentage for display
  const formatProgressPercentage = (progressValue: bigint | null): string => {
    if (!progressValue) return '0';
    return (Number(progressValue) / 100).toFixed(2);
  };

  // Get visual representation of progress (0-100%)
  const getProgressPercentage = (progressValue: bigint | null): number => {
    if (!progressValue) return 0;
    const percent = Number(progressValue) / 100;
    return Math.min(Math.max(percent, 0), 100); // Clamp between 0-100
  };

  // Get color based on progress level
  const getProgressColor = (percent: number): string => {
    if (percent < 30) return 'from-red-500 to-red-600';
    if (percent < 70) return 'from-yellow-500 to-yellow-600';
    return 'from-green-500 to-green-600';
  };

  const progressPercent = getProgressPercentage(progress);

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-5 shadow-lg">
      <h3 className="text-xl font-semibold mb-4 text-blue-400">Progress Details</h3>
      
      <div className="mb-4">
        <ProgressBar 
          progress={progress}
          formatProgressPercentage={formatProgressPercentage}
          getProgressPercentage={getProgressPercentage}
          getProgressColor={getProgressColor}
          height="h-4"
          animated={true}
        />
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
        {/* Progress Level Card */}
        <div className="bg-gray-800/80 rounded-lg p-4 border border-gray-700">
          <p className="text-sm text-gray-400 mb-1">Progress Level</p>
          <div className="flex items-baseline space-x-1">
            <span className="text-2xl font-bold text-gray-200">{formatProgressPercentage(progress)}</span>
            <span className="text-gray-400">%</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">Overall completion percentage</p>
        </div>
        
        {/* Status Card */}
        <div className="bg-gray-800/80 rounded-lg p-4 border border-gray-700">
          <p className="text-sm text-gray-400 mb-1">Status</p>
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${
              progressPercent < 30 ? 'bg-red-500' : 
              progressPercent < 70 ? 'bg-yellow-500' : 
              'bg-green-500'
            }`}></div>
            <span className="text-lg font-bold text-gray-200">
              {progressPercent < 30 ? 'Starting' : 
                progressPercent < 70 ? 'In Progress' : 
                'Advanced'}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">Current learning status</p>
        </div>
      </div>
      
      {/* Progress Assessment */}
      <div className="mt-6 p-4 bg-gray-800/30 rounded-lg border border-gray-700">
        <h4 className="font-medium text-gray-300 mb-2">Assessment</h4>
        <p className="text-sm text-gray-400">
          {progressPercent < 30 ? 
            'The student is in the early stages of their educational journey. More focus and engagement may be needed to improve progress.' : 
            progressPercent < 70 ? 
            'The student is making steady progress in their educational journey. Continued engagement will help them reach advanced stages.' : 
            'The student is at an advanced stage in their educational journey. They are demonstrating excellent progress and engagement.'
          }
        </p>
      </div>
    </div>
  );
};

// Export the hook, main component, and additional components
export { useStudentProgressTracker };
export default StudentProgressTracker;