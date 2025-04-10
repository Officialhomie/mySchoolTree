import { useState, useEffect, useCallback, useRef } from 'react';
import { useReadContract, useAccount } from 'wagmi';
import { motion } from 'framer-motion';

/**
 * StudentReputationViewer Component
 * 
 * This component visualizes a student's reputation metrics including
 * attendance, behavior, and academic performance. It provides both
 * numeric data and visual representations to help understand a student's
 * standing in the educational system.
 */
interface StudentReputationViewerProps {
  contract: any;
  studentAddress?: `0x${string}`; // Optional: specific student address to view
  onDataFetched?: (reputationData: ReputationData) => void; // Optional callback
}

interface ReputationData {
  attendancePoints: bigint;
  behaviorPoints: bigint;
  academicPoints: bigint;
  lastUpdateTime: bigint;
  totalPoints: bigint;
}

// Cache structure
interface CacheEntry {
  key: string;
  data: ReputationData;
  timestamp: number;
}

// Create a simple in-memory cache
const reputationCache: CacheEntry[] = [];
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes in milliseconds

// Define reputation level thresholds
const REPUTATION_LEVELS = [
  { name: 'Novice', threshold: 0, color: 'gray' },
  { name: 'Apprentice', threshold: 100, color: 'green' },
  { name: 'Scholar', threshold: 250, color: 'blue' },
  { name: 'Master', threshold: 500, color: 'purple' },
  { name: 'Virtuoso', threshold: 1000, color: 'indigo' }
];

const StudentReputationViewer = ({
  contract,
  studentAddress,
  onDataFetched
}: StudentReputationViewerProps) => {
  // State for the displayed student address
  const { address: connectedAddress } = useAccount();
  const [displayAddress, setDisplayAddress] = useState<string>(studentAddress || '');
  // Set customAddress based on whether studentAddress prop is provided
  const [customAddress, setCustomAddress] = useState<boolean>(!studentAddress);
  const [validationError, setValidationError] = useState<string>('');
  // State for loading and data
  const [isLoadingReputation, setIsLoadingReputation] = useState<boolean>(false);
  const [isReputationError, setIsReputationError] = useState<boolean>(false);
  const [processedData, setProcessedData] = useState<ReputationData | null>(null);
  const fetchingRef = useRef(false);
  
  // Update display address when studentAddress prop changes
  useEffect(() => {
    if (studentAddress) {
      setDisplayAddress(studentAddress);
      setCustomAddress(false);
    } else {
      setCustomAddress(true);
    }
  }, [studentAddress]);
  
  // Derived state for the effective address to use
  const effectiveAddress = customAddress 
    ? displayAddress 
    : (studentAddress || connectedAddress || '');
  
  // Setup contract read with controlled fetching (disabled by default)
  const { refetch: refetchReputation } = useReadContract({
    ...contract,
    functionName: 'getStudentReputation',
    args: undefined, // Don't set args immediately to prevent automatic fetching
    query: {
      enabled: false // Disable automatic fetching
    }
  });
  
  // Cache management functions
  const generateCacheKey = useCallback((address: string): string => {
    return address.toLowerCase();
  }, []);

  const checkCache = useCallback((address: string): ReputationData | null => {
    const cacheKey = generateCacheKey(address);
    const now = Date.now();
    
    const cachedEntry = reputationCache.find(entry => entry.key === cacheKey);
    
    if (cachedEntry && (now - cachedEntry.timestamp) < CACHE_EXPIRY) {
      return cachedEntry.data;
    }
    
    return null;
  }, [generateCacheKey]);

  const updateCache = useCallback((address: string, data: ReputationData): void => {
    const cacheKey = generateCacheKey(address);
    const now = Date.now();
    
    // Remove old entry if exists
    const existingIndex = reputationCache.findIndex(entry => entry.key === cacheKey);
    if (existingIndex !== -1) {
      reputationCache.splice(existingIndex, 1);
    }
    
    // Add new entry
    reputationCache.push({
      key: cacheKey,
      data,
      timestamp: now
    });
    
    // Clean up old cache entries
    const expiredTime = now - CACHE_EXPIRY;
    for (let i = reputationCache.length - 1; i >= 0; i--) {
      if (reputationCache[i].timestamp < expiredTime) {
        reputationCache.splice(i, 1);
      }
    }
  }, [generateCacheKey]);
  
  // Validate address format
  const validateAddress = (address: string): boolean => {
    if (!address) {
      setValidationError('Student address is required');
      return false;
    }
    
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      setValidationError('Invalid Ethereum address format');
      return false;
    }
    
    setValidationError('');
    return true;
  };
  
  // Handle address change
  const handleAddressChange = (value: string) => {
    setDisplayAddress(value);
    setValidationError('');
  };
  
  // Fetch reputation data with cache check
  const fetchReputationData = useCallback(async (address: string) => {
    if (fetchingRef.current || !address) return;
    
    fetchingRef.current = true;
    setIsLoadingReputation(true);
    setIsReputationError(false);
    
    try {
      // Check cache first
      const cachedData = checkCache(address);
      
      if (cachedData) {
        setProcessedData(cachedData);
        if (onDataFetched) {
          onDataFetched(cachedData);
        }
        setIsLoadingReputation(false);
        fetchingRef.current = false;
        return;
      }
      
      // No cache hit, fetch from blockchain
      const result = await refetchReputation();
      
      if (result.data) {
        // Cast reputationData to the correct tuple type based on the contract's return type
        const reputationTuple = result.data as [bigint, bigint, bigint, bigint];
        
        const data: ReputationData = {
          attendancePoints: reputationTuple[0],
          behaviorPoints: reputationTuple[1],
          academicPoints: reputationTuple[2],
          lastUpdateTime: reputationTuple[3],
          // Calculate total points
          totalPoints: reputationTuple[0] + reputationTuple[1] + reputationTuple[2]
        };
        
        setProcessedData(data);
        updateCache(address, data);
        
        if (onDataFetched) {
          onDataFetched(data);
        }
      } else {
        setProcessedData(null);
      }
    } catch (error) {
      console.error('Error fetching reputation data:', error);
      setIsReputationError(true);
      setProcessedData(null);
    } finally {
      setIsLoadingReputation(false);
      fetchingRef.current = false;
    }
  }, [refetchReputation, checkCache, updateCache, onDataFetched]);
  
  // Auto-fetch data for provided student address (only once on mount or address change)
  useEffect(() => {
    if (studentAddress && !customAddress) {
      fetchReputationData(studentAddress);
    }
  }, [studentAddress, customAddress, fetchReputationData]);
  
  // Handle manual lookup
  const handleLookup = () => {
    if (validateAddress(displayAddress)) {
      fetchReputationData(displayAddress);
    }
  };
  
  // Format timestamp to readable date
  const formatTimestamp = (timestamp: bigint): string => {
    if (!timestamp || timestamp === BigInt(0)) return 'Never';
    const date = new Date(Number(timestamp) * 1000);
    return date.toLocaleString();
  };
  
  // Calculate time since last update
  const getTimeSinceUpdate = (timestamp: bigint): string => {
    if (!timestamp || timestamp === BigInt(0)) return 'Never updated';
    
    const now = Date.now() / 1000;
    const updateTime = Number(timestamp);
    const diffSeconds = now - updateTime;
    
    if (diffSeconds < 60) return 'Just now';
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)} minutes ago`;
    if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)} hours ago`;
    return `${Math.floor(diffSeconds / 86400)} days ago`;
  };
  
  // Get reputation level based on total points
  const getReputationLevel = (totalPoints: bigint): typeof REPUTATION_LEVELS[0] => {
    const points = Number(totalPoints);
    let highestLevel = REPUTATION_LEVELS[0];
    
    for (const level of REPUTATION_LEVELS) {
      if (points >= level.threshold) {
        highestLevel = level;
      } else {
        break;
      }
    }
    
    return highestLevel;
  };
  
  // Calculate percentage for progress bars
  const calculatePercentage = (value: bigint, max: number = 500): number => {
    const percentage = Number(value) / max * 100;
    return Math.min(percentage, 100); // Cap at 100%
  };
  
  // Calculate next level information
  const getNextLevelInfo = (totalPoints: bigint) => {
    const points = Number(totalPoints);
    let nextLevel = null;
    
    for (const level of REPUTATION_LEVELS) {
      if (points < level.threshold) {
        nextLevel = level;
        break;
      }
    }
    
    if (!nextLevel) {
      // Already at max level
      const currentLevel = getReputationLevel(totalPoints);
      return {
        name: `${currentLevel.name} (Max Level)`,
        pointsNeeded: 0,
        progress: 100
      };
    }
    
    // Find the current level threshold
    const currentLevel = getReputationLevel(totalPoints);
    const pointsNeeded = nextLevel.threshold - points;
    const progressRange = nextLevel.threshold - currentLevel.threshold;
    const pointsGained = points - currentLevel.threshold;
    const progress = Math.floor((pointsGained / progressRange) * 100);
    
    return {
      name: nextLevel.name,
      pointsNeeded,
      progress
    };
  };
  
  // Determine the dominant reputation category
  const getDominantCategory = (data: ReputationData) => {
    const categories = [
      { name: 'Attendance', value: data.attendancePoints, color: 'green' },
      { name: 'Behavior', value: data.behaviorPoints, color: 'blue' },
      { name: 'Academic', value: data.academicPoints, color: 'purple' }
    ];
    
    return categories.sort((a, b) => Number(b.value - a.value))[0];
  };
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-gray-800/50 border border-gray-700 rounded-lg p-4"
    >
      <h3 className="text-lg font-medium text-blue-400 mb-3">
        Student Reputation Profile
      </h3>
      
      {/* Address Input (if no specific student address provided) */}
      {customAddress && (
        <div className="mb-4 space-y-2">
          <div className="flex space-x-2">
            <div className="flex-grow">
              <input
                type="text"
                value={displayAddress}
                onChange={(e) => handleAddressChange(e.target.value)}
                placeholder="Student address (0x...)"
                className={`w-full px-3 py-2 bg-gray-700 border ${
                  validationError ? 'border-red-500' : 'border-gray-600'
                } rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
              />
            </div>
            <button
              type="button"
              onClick={handleLookup}
              className="px-3 py-2 bg-gray-600 text-gray-200 rounded-md hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoadingReputation || !displayAddress}
            >
              {isLoadingReputation ? (
                <div className="w-5 h-5 border-2 border-t-blue-400 border-blue-200/30 rounded-full animate-spin"></div>
              ) : (
                'Lookup'
              )}
            </button>
          </div>
          {validationError && (
            <p className="text-xs text-red-400">{validationError}</p>
          )}
        </div>
      )}
      
      {/* Loading State */}
      {isLoadingReputation && (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-t-blue-400 border-blue-200/30 rounded-full animate-spin mr-3"></div>
          <span className="text-sm text-gray-300">Loading reputation data...</span>
        </div>
      )}
      
      {/* Error State */}
      {isReputationError && (
        <div className="bg-red-500/20 text-red-400 border border-red-500/30 rounded-md p-4">
          <p className="text-sm">Error loading reputation data. Please try again later.</p>
        </div>
      )}
      
      {/* Reputation Data Display */}
      {processedData && (
        <div className="space-y-4">
          {/* Student Address Display */}
          <div className="bg-gray-700/20 rounded-md p-3">
            <h4 className="text-xs text-gray-400 mb-1">Student Address:</h4>
            <div className="flex items-center">
              <span className="text-sm font-mono text-gray-300 truncate">{effectiveAddress}</span>
            </div>
          </div>
          
          {/* Reputation Level Badge */}
          {(() => {
            const level = getReputationLevel(processedData.totalPoints);
            return (
              <div className={`bg-${level.color}-500/20 border border-${level.color}-500/30 rounded-lg p-4 flex flex-col items-center`}>
                <div className={`text-${level.color}-400 text-xl font-bold mb-1`}>
                  {level.name}
                </div>
                <div className="text-gray-300 text-sm">
                  Reputation Level
                </div>
                
                {/* Next Level Progress */}
                {(() => {
                  const nextLevel = getNextLevelInfo(processedData.totalPoints);
                  return (
                    <div className="w-full mt-3">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-gray-400">
                          Progress to {nextLevel.name}
                        </span>
                        <span className="text-xs text-gray-400">
                          {nextLevel.pointsNeeded > 0 
                            ? `${nextLevel.pointsNeeded} points needed` 
                            : 'Max level reached'}
                        </span>
                      </div>
                      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div 
                          className={`h-full bg-${level.color}-500 rounded-full`}
                          style={{ width: `${nextLevel.progress}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            );
          })()}
          
          {/* Total Points Display */}
          <div className="bg-gray-700/30 rounded-lg p-4">
            <div className="flex items-end justify-between mb-3">
              <h4 className="text-sm font-medium text-gray-300">Total Reputation</h4>
              <div className="text-2xl font-bold text-white">
                {processedData.totalPoints.toString()}
                <span className="text-sm text-gray-400 ml-1">points</span>
              </div>
            </div>
            
            {/* Last Update Time */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center text-gray-400">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Last updated: {getTimeSinceUpdate(processedData.lastUpdateTime)}
              </div>
              <div className="text-gray-500">
                {formatTimestamp(processedData.lastUpdateTime)}
              </div>
            </div>
          </div>
          
          {/* Reputation Categories */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Attendance Points */}
            <div className="bg-gray-700/30 rounded-lg p-4">
              <h5 className="text-xs text-gray-400 mb-2">Attendance</h5>
              <div className="text-xl font-bold text-green-400 mb-2">
                {processedData.attendancePoints.toString()}
              </div>
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-500 rounded-full transition-all duration-500"
                  style={{ width: `${calculatePercentage(processedData.attendancePoints)}%` }}
                ></div>
              </div>
            </div>
            
            {/* Behavior Points */}
            <div className="bg-gray-700/30 rounded-lg p-4">
              <h5 className="text-xs text-gray-400 mb-2">Behavior</h5>
              <div className="text-xl font-bold text-blue-400 mb-2">
                {processedData.behaviorPoints.toString()}
              </div>
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 rounded-full transition-all duration-500"
                  style={{ width: `${calculatePercentage(processedData.behaviorPoints)}%` }}
                ></div>
              </div>
            </div>
            
            {/* Academic Points */}
            <div className="bg-gray-700/30 rounded-lg p-4">
              <h5 className="text-xs text-gray-400 mb-2">Academic</h5>
              <div className="text-xl font-bold text-purple-400 mb-2">
                {processedData.academicPoints.toString()}
              </div>
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-purple-500 rounded-full transition-all duration-500"
                  style={{ width: `${calculatePercentage(processedData.academicPoints)}%` }}
                ></div>
              </div>
            </div>
          </div>
          
          {/* Reputation Analysis */}
          {(() => {
            const dominant = getDominantCategory(processedData);
            return (
              <div className={`bg-${dominant.color}-500/10 border border-${dominant.color}-500/30 rounded-md p-3 mt-2`}>
                <h4 className={`text-sm font-medium text-${dominant.color}-400 mb-1`}>
                  Reputation Analysis
                </h4>
                <p className="text-xs text-gray-300">
                  This student shows particular strength in <span className={`text-${dominant.color}-400 font-medium`}>{dominant.name}</span> with {dominant.value.toString()} points.
                  {Number(processedData.totalPoints) >= 250 ? 
                    " Their overall reputation level is impressive, placing them among the higher-achieving students." : 
                    " Continued focus on improving all areas will help them reach higher reputation levels."}
                </p>
              </div>
            );
          })()}
        </div>
      )}
      
      {/* Empty State */}
      {!isLoadingReputation && !processedData && effectiveAddress && !isReputationError && (
        <div className="bg-gray-700/20 rounded-md p-6 text-center">
          <svg className="w-12 h-12 text-gray-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-gray-400 mb-3">No reputation data found for this address.</p>
          <p className="text-xs text-gray-500">This could be because the student hasn't begun building their reputation yet or the address is not registered in the system.</p>
        </div>
      )}
      
      {/* Educational Information */}
      <div className="mt-4 pt-4 border-t border-gray-700">
        <h4 className="text-sm font-medium text-gray-300 mb-2">About Student Reputation</h4>
        <p className="text-xs text-gray-400 mb-2">
          Student reputation is a holistic measure of a student's standing in the educational system. It comprises three key components:
        </p>
        <ul className="space-y-1 text-xs text-gray-400 mb-2">
          <li className="flex items-start">
            <div className="w-4 h-4 rounded-full bg-green-500/30 text-green-400 flex items-center justify-center mr-2 mt-0.5">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span><span className="text-green-400 font-medium">Attendance Points</span> - Earned through consistent class participation and punctuality.</span>
          </li>
          <li className="flex items-start">
            <div className="w-4 h-4 rounded-full bg-blue-500/30 text-blue-400 flex items-center justify-center mr-2 mt-0.5">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span><span className="text-blue-400 font-medium">Behavior Points</span> - Reflect positive conduct, cooperation, and adherence to community standards.</span>
          </li>
          <li className="flex items-start">
            <div className="w-4 h-4 rounded-full bg-purple-500/30 text-purple-400 flex items-center justify-center mr-2 mt-0.5">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span><span className="text-purple-400 font-medium">Academic Points</span> - Awarded for achievements in coursework, examinations, and projects.</span>
          </li>
        </ul>
        <p className="text-xs text-gray-400">
          As students accumulate points across all three categories, they progress through reputation levels from Novice to Virtuoso. Higher reputation levels may unlock additional privileges, opportunities, and recognition within the educational system.
        </p>
      </div>
    </motion.div>
  );
};

export default StudentReputationViewer;