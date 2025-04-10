import { useState, useEffect, useCallback, useRef } from 'react';
import { useReadContract } from 'wagmi';
import { motion } from 'framer-motion';

// Interface for attendance record
interface AttendanceRecord {
  timestamp: bigint;
  present: boolean;
  termNumber: number;
}

// Interface for attendance metrics
interface AttendanceMetrics {
  totalPresent: number;
  totalAbsent: number;
  consecutivePresent: number;
  attendancePercentage: bigint;
  history: AttendanceRecord[];
}

// Cache structure
interface CacheEntry {
  key: string;
  data: AttendanceMetrics;
  timestamp: number;
}

// Interface for hook return values
interface UseAttendanceMetricsReturn {
  studentAddress: string;
  setStudentAddress: (address: string) => void;
  termNumber: string;
  setTermNumber: (term: string) => void;
  metrics: AttendanceMetrics | null;
  isLoading: boolean;
  isError: boolean;
  isFetching: boolean;
  fetchStatus: string;
  showStatus: boolean;
  showMetrics: boolean;
  handleFetchMetrics: () => Promise<void>;
  formatTimestamp: (timestamp: bigint) => string;
  formatPercentage: (percentage: bigint | undefined) => string;
  refetch: () => Promise<any>;
}

// Create a simple in-memory cache
const metricsCache: CacheEntry[] = [];
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes in milliseconds

// Custom hook for attendance metrics logic and state
export const useAttendanceMetrics = (contract: { address: `0x${string}`; abi: any }): UseAttendanceMetricsReturn => {
  const [studentAddress, setStudentAddress] = useState<string>('');
  const [termNumber, setTermNumber] = useState<string>('1');
  const [metrics, setMetrics] = useState<AttendanceMetrics | null>(null);
  const [showMetrics, setShowMetrics] = useState<boolean>(false);
  const [fetchStatus, setFetchStatus] = useState<string>('');
  const [showStatus, setShowStatus] = useState<boolean>(false);
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const fetchingRef = useRef(false);

  // Generate a cache key from student address and term number
  const generateCacheKey = useCallback((address: string, term: string): string => {
    return `${address.toLowerCase()}_${term}`;
  }, []);

  // Check cache for existing data
  const checkCache = useCallback((address: string, term: string): AttendanceMetrics | null => {
    const cacheKey = generateCacheKey(address, term);
    const now = Date.now();
    
    const cachedEntry = metricsCache.find(entry => entry.key === cacheKey);
    
    if (cachedEntry && (now - cachedEntry.timestamp) < CACHE_EXPIRY) {
      return cachedEntry.data;
    }
    
    return null;
  }, [generateCacheKey]);

  // Add or update cache
  const updateCache = useCallback((address: string, term: string, data: AttendanceMetrics): void => {
    const cacheKey = generateCacheKey(address, term);
    const now = Date.now();
    
    // Remove old entry if exists
    const existingIndex = metricsCache.findIndex(entry => entry.key === cacheKey);
    if (existingIndex !== -1) {
      metricsCache.splice(existingIndex, 1);
    }
    
    // Add new entry
    metricsCache.push({
      key: cacheKey,
      data,
      timestamp: now
    });
    
    // Clean up old cache entries
    const expiredTime = now - CACHE_EXPIRY;
    for (let i = metricsCache.length - 1; i >= 0; i--) {
      if (metricsCache[i].timestamp < expiredTime) {
        metricsCache.splice(i, 1);
      }
    }
  }, [generateCacheKey]);

  // Use controlled read contract - disable automatic fetching
  const { isError, isLoading, refetch } = useReadContract({
    ...contract,
    functionName: 'getAttendanceMetrics',
    args: [studentAddress as `0x${string}`, BigInt(termNumber)],
    query: {
      enabled: false, // Disable automatic fetching
    }
  });

  // Function to format timestamp to readable date
  const formatTimestamp = (timestamp: bigint): string => {
    const date = new Date(Number(timestamp) * 1000);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  // Format percentage for display
  const formatPercentage = (percentage: bigint | undefined): string => {
    if (!percentage) return '0';
    return (Number(percentage) / 100).toFixed(2);
  };

  // Handle fetch metrics with cache and blockchain optimization
  const handleFetchMetrics = async () => {
    if (fetchingRef.current) {
      return; // Prevent concurrent fetches
    }
    
    if (!studentAddress) {
      setFetchStatus('Please enter a student address');
      setShowStatus(true);
      return;
    }

    fetchingRef.current = true;
    setIsFetching(true);
    
    try {
      // Check cache first
      const cachedData = checkCache(studentAddress, termNumber);
      
      if (cachedData) {
        setMetrics(cachedData);
        setFetchStatus('Attendance metrics loaded from cache');
        setShowMetrics(true);
        setIsFetching(false);
        fetchingRef.current = false;
        setShowStatus(true);
        return;
      }
      
      // No cache hit, need to fetch from blockchain
      const result = await refetch();
      
      if (result.data) {
        const metricsData = result.data as AttendanceMetrics;
        setMetrics(metricsData);
        updateCache(studentAddress, termNumber, metricsData);
        setFetchStatus('Attendance metrics fetched successfully');
        setShowMetrics(true);
      } else {
        setFetchStatus('No metrics data found');
        setMetrics(null);
        setShowMetrics(false);
      }
    } catch (error) {
      console.error('Error fetching attendance metrics:', error);
      setFetchStatus('Error fetching attendance metrics');
      setMetrics(null);
      setShowMetrics(false);
    } finally {
      setIsFetching(false);
      fetchingRef.current = false;
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
    termNumber,
    setTermNumber,
    metrics,
    isLoading,
    isError,
    isFetching,
    fetchStatus,
    showStatus,
    showMetrics,
    handleFetchMetrics,
    formatTimestamp,
    formatPercentage,
    refetch
  };
};

// Main component that uses the custom hook
const AttendanceMetricsViewer = ({ contract }: { contract: { address: `0x${string}`; abi: any } }) => {
  const {
    studentAddress,
    setStudentAddress,
    termNumber,
    setTermNumber,
    metrics,
    isLoading,
    isError,
    isFetching,
    fetchStatus,
    showStatus,
    showMetrics,
    handleFetchMetrics,
    formatTimestamp,
    formatPercentage
  } = useAttendanceMetrics(contract);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-gray-900/90 backdrop-blur-sm border border-gray-700 shadow-xl rounded-lg p-6 max-w-full mx-auto w-full md:max-w-full mb-9"
    >
      <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
        Student Attendance Metrics
      </h2>

      <p className="text-gray-300 text-sm mb-4">
        View detailed attendance metrics for a student in a specific term.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
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
        
        <div>
          <label className="block text-gray-300 text-sm font-medium mb-2">
            Term Number
          </label>
          <input
            type="number"
            value={termNumber}
            onChange={(e) => setTermNumber(e.target.value)}
            min="1"
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
      </div>

      <motion.button
        onClick={handleFetchMetrics}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        disabled={isLoading || isFetching}
        className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-2 px-4 rounded-md hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50 transition-colors duration-300 shadow-lg disabled:opacity-50"
      >
        {isLoading || isFetching ? 'Loading...' : 'Fetch Attendance Metrics'}
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
          <span className="ml-3 text-gray-300">Loading attendance metrics...</span>
        </div>
      )}
      
      {isError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-4 mt-4">
          <div className="text-red-400 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mx-auto mb-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <p className="text-lg">Error fetching attendance metrics</p>
          </div>
        </div>
      )}
      
      {showMetrics && metrics && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          transition={{ duration: 0.3 }}
          className="mt-6"
        >
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-5 shadow-lg">
            <h3 className="text-xl font-semibold mb-4 text-blue-400">Attendance Summary</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {/* Attendance Percentage */}
              <div className="bg-gray-800/80 rounded-lg p-4 border border-gray-700">
                <p className="text-sm text-gray-400 mb-1">Attendance Rate</p>
                <div className="flex items-baseline space-x-1">
                  <span className="text-2xl font-bold text-gray-200">{formatPercentage(metrics.attendancePercentage)}</span>
                  <span className="text-gray-400">%</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Overall attendance percentage</p>
              </div>
              
              {/* Total Present */}
              <div className="bg-gray-800/80 rounded-lg p-4 border border-gray-700">
                <p className="text-sm text-gray-400 mb-1">Present</p>
                <div className="flex items-baseline space-x-1">
                  <span className="text-2xl font-bold text-gray-200">{metrics.totalPresent}</span>
                  <span className="text-gray-400">days</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Total days present</p>
              </div>
              
              {/* Total Absent */}
              <div className="bg-gray-800/80 rounded-lg p-4 border border-gray-700">
                <p className="text-sm text-gray-400 mb-1">Absent</p>
                <div className="flex items-baseline space-x-1">
                  <span className="text-2xl font-bold text-gray-200">{metrics.totalAbsent}</span>
                  <span className="text-gray-400">days</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Total days absent</p>
              </div>
              
              {/* Consecutive Present */}
              <div className="bg-gray-800/80 rounded-lg p-4 border border-gray-700">
                <p className="text-sm text-gray-400 mb-1">Streak</p>
                <div className="flex items-baseline space-x-1">
                  <span className="text-2xl font-bold text-gray-200">{metrics.consecutivePresent}</span>
                  <span className="text-gray-400">days</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Current consecutive days present</p>
              </div>
            </div>
            
            {/* Attendance History */}
            <div className="mt-6">
              <h4 className="text-lg font-semibold mb-3 text-gray-300">Attendance History</h4>
              
              <div className="bg-gray-900/50 rounded-lg border border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-700">
                    <thead className="bg-gray-800/50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Date</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Term</th>
                      </tr>
                    </thead>
                    <tbody className="bg-gray-900/30 divide-y divide-gray-800">
                      {metrics.history.map((record, index) => (
                        <tr key={index} className={index % 2 === 0 ? 'bg-gray-800/20' : 'bg-gray-800/10'}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                            {formatTimestamp(record.timestamp)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              record.present ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {record.present ? 'Present' : 'Absent'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                            {record.termNumber}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            
            {/* Raw Data */}
            <div className="mt-6">
              <details className="group">
                <summary className="flex items-center justify-between cursor-pointer list-none text-gray-400 hover:text-blue-400 transition-colors duration-300">
                  <span className="text-sm font-medium">View Raw Data</span>
                  <span className="transform group-open:rotate-180 transition-transform duration-200">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </span>
                </summary>
                <div className="mt-2 grid grid-cols-1 gap-2 pl-2 border-l-2 border-gray-700">
                  <div className="text-xs text-gray-400">
                    <span className="text-gray-500">Total Present:</span> {metrics.totalPresent}
                  </div>
                  <div className="text-xs text-gray-400">
                    <span className="text-gray-500">Total Absent:</span> {metrics.totalAbsent}
                  </div>
                  <div className="text-xs text-gray-400">
                    <span className="text-gray-500">Consecutive Present:</span> {metrics.consecutivePresent}
                  </div>
                  <div className="text-xs text-gray-400">
                    <span className="text-gray-500">Attendance Percentage:</span> {metrics.attendancePercentage.toString()} (basis points)
                  </div>
                  <div className="text-xs text-gray-400">
                    <span className="text-gray-500">History Records:</span> {metrics.history.length}
                  </div>
                </div>
              </details>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

// Additional components that can be exported for use in other parts of the application

// A simple data view component for use in other places
export const AttendanceMetricsData = ({ 
  metrics,
  formatPercentage
}: { 
  metrics: AttendanceMetrics; 
  formatPercentage: (percentage: bigint | undefined) => string;
}) => {
  if (!metrics) return null;
  
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="text-sm">
        <span className="font-medium">Attendance Rate:</span> {formatPercentage(metrics.attendancePercentage)}%
      </div>
      <div className="text-sm">
        <span className="font-medium">Present:</span> {metrics.totalPresent} days
      </div>
      <div className="text-sm">
        <span className="font-medium">Absent:</span> {metrics.totalAbsent} days
      </div>
      <div className="text-sm">
        <span className="font-medium">Current Streak:</span> {metrics.consecutivePresent} days
      </div>
    </div>
  );
};

// Export the hook, main component, and additional components
export type { AttendanceMetrics };
export default AttendanceMetricsViewer;