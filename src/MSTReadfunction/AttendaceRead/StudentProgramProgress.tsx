import { useState, useEffect, useCallback, useRef } from 'react';
import { useReadContract } from 'wagmi';
import { motion } from 'framer-motion';

// Interface for the hook's return values
interface UseStudentProgramProgressReturn {
    studentAddress: string;
    setStudentAddress: (address: string) => void;
    progress: number | null;
    showInfo: boolean;
    fetchStatus: string;
    showStatus: boolean;
    isValid: boolean;
    isLoading: boolean;
    isError: boolean;
    handleFetchInfo: () => Promise<void>;
    getProgressPercentage: () => number;
    getProgressStatus: () => { text: string; colorClass: string };
    MAX_PROGRESS: number;
    refetch: () => Promise<any>;
}

// Cache structure
interface CacheEntry {
    key: string;
    data: number;
    timestamp: number;
}

// Create a simple in-memory cache
const programProgressCache: CacheEntry[] = [];
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes in milliseconds

// Custom hook for student program progress logic and state
const useStudentProgramProgress = (
    contract: { address: `0x${string}`; abi: any },
    defaultAddress?: `0x${string}`
): UseStudentProgramProgressReturn => {
    const [studentAddress, setStudentAddress] = useState<string>(defaultAddress || '');
    const [progress, setProgress] = useState<number | null>(null);
    const [showInfo, setShowInfo] = useState(false);
    const [fetchStatus, setFetchStatus] = useState('');
    const [showStatus, setShowStatus] = useState(false);
    const [isValid, setIsValid] = useState(false);
    const [isError, setIsError] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const fetchingRef = useRef(false);

    // Set max progress value (this could be fetched from contract in a real implementation)
    const MAX_PROGRESS = 100;

    // Setup contract read with controlled fetching
    const { refetch } = useReadContract({
        ...contract,
        functionName: 'studentProgramProgress',
        args: undefined, // Don't set args to prevent auto-fetching
        query: {
            enabled: false // Disable automatic fetching
        }
    });

    // Cache management functions
    const generateCacheKey = useCallback((address: string): string => {
        return address.toLowerCase();
    }, []);

    const checkCache = useCallback((address: string): number | null => {
        const cacheKey = generateCacheKey(address);
        const now = Date.now();
        
        const cachedEntry = programProgressCache.find(entry => entry.key === cacheKey);
        
        if (cachedEntry && (now - cachedEntry.timestamp) < CACHE_EXPIRY) {
            return cachedEntry.data;
        }
        
        return null;
    }, [generateCacheKey]);

    const updateCache = useCallback((address: string, data: number): void => {
        const cacheKey = generateCacheKey(address);
        const now = Date.now();
        
        // Remove old entry if exists
        const existingIndex = programProgressCache.findIndex(entry => entry.key === cacheKey);
        if (existingIndex !== -1) {
            programProgressCache.splice(existingIndex, 1);
        }
        
        // Add new entry
        programProgressCache.push({
            key: cacheKey,
            data,
            timestamp: now
        });
        
        // Clean up old cache entries
        const expiredTime = now - CACHE_EXPIRY;
        for (let i = programProgressCache.length - 1; i >= 0; i--) {
            if (programProgressCache[i].timestamp < expiredTime) {
                programProgressCache.splice(i, 1);
            }
        }
    }, [generateCacheKey]);

    // Validate input
    useEffect(() => {
        // Check if address is a valid Ethereum address
        const validAddress = /^0x[a-fA-F0-9]{40}$/.test(studentAddress);
        setIsValid(validAddress);
    }, [studentAddress]);

    // Fetch data with caching
    const handleFetchInfo = async () => {
        if (fetchingRef.current) {
            return; // Prevent concurrent fetches
        }
        
        if (!isValid) {
            setFetchStatus('Please enter a valid Ethereum address');
            setShowStatus(true);
            return;
        }

        fetchingRef.current = true;
        setIsLoading(true);
        setIsError(false);
        
        try {
            // Check cache first
            const cachedData = checkCache(studentAddress);
            
            if (cachedData !== null) {
                setProgress(cachedData);
                setFetchStatus('Progress loaded from cache');
                setShowInfo(true);
                setIsLoading(false);
                fetchingRef.current = false;
                setShowStatus(true);
                return;
            }
            
            // No cache hit, fetch from blockchain
            const result = await refetch();
            
            if (result.data !== undefined) {
                // Convert bigint to number if needed
                const progressData = typeof result.data === 'bigint' ? Number(result.data) : result.data as number;
                setProgress(progressData);
                updateCache(studentAddress, progressData);
                setFetchStatus('Progress fetched successfully');
                setShowInfo(true);
            } else {
                setFetchStatus('Could not retrieve student progress');
                setProgress(null);
                setShowInfo(false);
            }
        } catch (error) {
            console.error('Error fetching student progress:', error);
            setIsError(true);
            setFetchStatus('Error fetching student progress');
            setProgress(null);
            setShowInfo(false);
        } finally {
            setIsLoading(false);
            fetchingRef.current = false;
            setShowStatus(true);
        }
    };

    // Clear status message after timeout
    useEffect(() => {
        if (showStatus) {
            const timer = setTimeout(() => {
                setShowStatus(false);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [showStatus]);

    // Auto-fetch if defaultAddress is provided (only once)
    useEffect(() => {
        if (defaultAddress && !progress && !fetchingRef.current) {
            // Set address and validate
            setStudentAddress(defaultAddress);
            setIsValid(true);
            // Fetch data (will run only once due to progress dependency)
            handleFetchInfo();
        }
    }, [defaultAddress]); // eslint-disable-line react-hooks/exhaustive-deps

    // Calculate progress percentage
    const getProgressPercentage = () => {
        if (progress === null) return 0;
        return Math.min(100, (progress / MAX_PROGRESS) * 100);
    };

    // Get progress status and colors
    const getProgressStatus = () => {
        if (progress === null) return { text: '', colorClass: '' };
        
        const percentage = getProgressPercentage();
        
        if (percentage >= 100) {
            return { text: 'Completed', colorClass: 'text-green-400' };
        } else if (percentage >= 75) {
            return { text: 'Advanced', colorClass: 'text-blue-400' };
        } else if (percentage >= 50) {
            return { text: 'Intermediate', colorClass: 'text-purple-400' };
        } else if (percentage >= 25) {
            return { text: 'Beginner', colorClass: 'text-yellow-400' };
        } else {
            return { text: 'Getting Started', colorClass: 'text-red-400' };
        }
    };

    return {
        studentAddress,
        setStudentAddress,
        progress,
        showInfo,
        fetchStatus,
        showStatus,
        isValid,
        isLoading,
        isError,
        handleFetchInfo,
        getProgressPercentage,
        getProgressStatus,
        MAX_PROGRESS,
        refetch
    };
};

// Main component that uses the custom hook
const GetStudentProgramProgress = ({ 
    contract, 
    defaultAddress 
}: { 
    contract: { address: `0x${string}`; abi: any };
    defaultAddress?: `0x${string}`;
}) => {
    const {
        studentAddress,
        setStudentAddress,
        progress,
        showInfo,
        fetchStatus,
        showStatus,
        isValid,
        isLoading,
        isError,
        handleFetchInfo,
        getProgressPercentage,
        getProgressStatus,
        MAX_PROGRESS
    } = useStudentProgramProgress(contract, defaultAddress);

    const progressStatus = getProgressStatus();

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="bg-gray-900/90 backdrop-blur-sm border border-gray-700 shadow-xl rounded-lg p-6 max-w-full mx-auto w-full md:max-w-full mb-9"
        >
            <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                Student Program Progress
            </h2>

            <div className="bg-gray-800/80 rounded-lg p-4 border border-gray-700 mb-4">
                <label className="block text-sm text-gray-400 mb-1">Student Address</label>
                <input
                    type="text"
                    value={studentAddress}
                    onChange={(e) => setStudentAddress(e.target.value)}
                    placeholder="0x..."
                    className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
            </div>

            <div className="mb-4 flex justify-center">
                <motion.button
                    onClick={handleFetchInfo}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={isLoading || !isValid}
                    className="bg-gradient-to-r from-blue-500 to-purple-600 text-white py-2 px-6 rounded-md hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50 transition-colors duration-300 shadow-lg disabled:opacity-50"
                >
                    {isLoading ? 'Loading...' : 'Check Progress'}
                </motion.button>
            </div>
            
            {showStatus && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="mb-4"
                >
                    <p className={`p-2 rounded-md ${fetchStatus.includes('Error') || fetchStatus.includes('Could not') || fetchStatus.includes('Please enter') ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                        {fetchStatus}
                    </p>
                </motion.div>
            )}
            
            {isLoading && (
                <div className="flex justify-center items-center h-40">
                    <div className="w-10 h-10 border-4 border-t-blue-400 border-r-purple-500 border-b-blue-400 border-l-purple-500 rounded-full animate-spin"></div>
                    <span className="ml-3 text-gray-300">Loading progress information...</span>
                </div>
            )}
            
            {isError && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-4">
                    <div className="text-red-400 text-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mx-auto mb-2" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <p className="text-lg">Error checking student progress</p>
                    </div>
                </div>
            )}
            
            {showInfo && progress !== null && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    transition={{ duration: 0.3 }}
                    className="mt-6"
                >
                    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-5 shadow-lg">
                        <h3 className="text-xl font-semibold mb-4 text-blue-400">Progress Details</h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div className="bg-gray-800/80 rounded-lg p-4 border border-gray-700">
                                <p className="text-sm text-gray-400 mb-1">Progress Points</p>
                                <div className="text-gray-200 text-2xl font-bold">
                                    {progress} / {MAX_PROGRESS}
                                </div>
                            </div>
                            
                            <div className="bg-gray-800/80 rounded-lg p-4 border border-gray-700">
                                <p className="text-sm text-gray-400 mb-1">Status</p>
                                <div className={`font-semibold text-xl ${progressStatus.colorClass}`}>
                                    {progressStatus.text}
                                </div>
                            </div>
                        </div>
                        
                        {/* Progress bar */}
                        <div className="mt-4 bg-gray-800/80 rounded-lg p-4 border border-gray-700">
                            <p className="text-sm text-gray-400 mb-1">Overall Progress</p>
                            <div className="mt-3">
                                <div className="w-full bg-gray-700 rounded-full h-4">
                                    <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: `${getProgressPercentage()}%` }}
                                        transition={{ duration: 0.8, ease: "easeOut" }}
                                        className={`h-4 rounded-full ${
                                            getProgressPercentage() < 25
                                                ? 'bg-gradient-to-r from-red-500 to-red-600'
                                                : getProgressPercentage() < 50
                                                    ? 'bg-gradient-to-r from-yellow-400 to-yellow-500'
                                                    : getProgressPercentage() < 75
                                                        ? 'bg-gradient-to-r from-purple-400 to-purple-500'
                                                        : 'bg-gradient-to-r from-blue-500 to-green-400'
                                        }`}
                                    ></motion.div>
                                </div>
                            </div>
                            <div className="flex justify-between mt-1 text-xs text-gray-400">
                                <span>0%</span>
                                <span>25%</span>
                                <span>50%</span>
                                <span>75%</span>
                                <span>100%</span>
                            </div>
                        </div>
                        
                        {/* Recommendations */}
                        <div className="mt-4 bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                            <div className="flex items-start">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-400 mr-2 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                </svg>
                                <div className="text-blue-400">
                                    {getProgressPercentage() >= 100 ? (
                                        <p>Congratulations! You've completed the program requirements.</p>
                                    ) : getProgressPercentage() >= 75 ? (
                                        <p>You're making excellent progress! Continue attending sessions to complete the program.</p>
                                    ) : getProgressPercentage() >= 50 ? (
                                        <p>You're on the right track. Keep up the good work and attend upcoming sessions.</p>
                                    ) : getProgressPercentage() >= 25 ? (
                                        <p>You've made a good start. Increasing your attendance will help boost your progress.</p>
                                    ) : (
                                        <p>Getting started is the hardest part. Join more sessions to increase your progress.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </motion.div>
    );
};

// Additional components that can be exported for use in other parts of the application

// A compact progress display component
export const StudentProgressCompact = ({ 
    progress, 
    maxProgress = 100
}: { 
    progress: number | null; 
    maxProgress?: number;
}) => {
    if (progress === null) return null;
    
    // Calculate progress percentage
    const getPercentage = () => {
        return Math.min(100, (progress / maxProgress) * 100);
    };
    
    // Get status text and color
    const getStatus = () => {
        const percentage = getPercentage();
        
        if (percentage >= 100) {
            return { text: 'Completed', color: 'text-green-500' };
        } else if (percentage >= 75) {
            return { text: 'Advanced', color: 'text-blue-500' };
        } else if (percentage >= 50) {
            return { text: 'Intermediate', color: 'text-purple-500' };
        } else if (percentage >= 25) {
            return { text: 'Beginner', color: 'text-yellow-500' };
        } else {
            return { text: 'Getting Started', color: 'text-red-500' };
        }
    };
    
    const status = getStatus();
    
    return (
        <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
            <div className="flex justify-between items-center mb-2">
                <span className="text-gray-300">Program Progress</span>
                <span className={`font-medium ${status.color}`}>{status.text}</span>
            </div>
            
            <div className="mb-1">
                <div className="w-full bg-gray-700 rounded-full h-2.5">
                    <div 
                        className={`h-2.5 rounded-full ${
                            getPercentage() < 25
                                ? 'bg-red-500'
                                : getPercentage() < 50
                                    ? 'bg-yellow-400'
                                    : getPercentage() < 75
                                        ? 'bg-purple-500'
                                        : 'bg-green-500'
                        }`}
                        style={{ width: `${getPercentage()}%` }}
                    ></div>
                </div>
            </div>
            
            <div className="flex justify-between text-xs text-gray-400">
                <span>{progress} points</span>
                <span>{Math.round(getPercentage())}%</span>
            </div>
        </div>
    );
};

// A detailed progress info component
export const StudentProgressInfo = ({
    progress,
    maxProgress = 100
}: {
    progress: number | null;
    maxProgress?: number;
}) => {
    if (progress === null) return null;
    
    // Calculate progress percentage
    const getPercentage = () => {
        return Math.min(100, (progress / maxProgress) * 100);
    };
    
    // Get status text and color
    const getStatus = () => {
        const percentage = getPercentage();
        
        if (percentage >= 100) {
            return { text: 'Completed', color: 'text-green-500' };
        } else if (percentage >= 75) {
            return { text: 'Advanced', color: 'text-blue-500' };
        } else if (percentage >= 50) {
            return { text: 'Intermediate', color: 'text-purple-500' };
        } else if (percentage >= 25) {
            return { text: 'Beginner', color: 'text-yellow-500' };
        } else {
            return { text: 'Getting Started', color: 'text-red-500' };
        }
    };
    
    const status = getStatus();
    const percentage = getPercentage();
    
    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-800 rounded-lg border border-gray-700">
                    <p className="text-sm text-gray-400">Progress</p>
                    <p className="text-lg font-bold text-white">{progress} / {maxProgress}</p>
                </div>
                
                <div className="p-3 bg-gray-800 rounded-lg border border-gray-700">
                    <p className="text-sm text-gray-400">Status</p>
                    <p className={`text-lg font-bold ${status.color}`}>{status.text}</p>
                </div>
            </div>
            
            <div className="p-3 bg-gray-800 rounded-lg border border-gray-700">
                <p className="text-sm text-gray-400 mb-2">Overall Progress</p>
                <div className="w-full bg-gray-700 rounded-full h-3">
                    <div 
                        className={`h-3 rounded-full ${
                            percentage < 25
                                ? 'bg-red-500'
                                : percentage < 50
                                    ? 'bg-yellow-400'
                                    : percentage < 75
                                        ? 'bg-purple-500'
                                        : 'bg-gradient-to-r from-blue-500 to-green-500'
                        }`}
                        style={{ width: `${percentage}%` }}
                    ></div>
                </div>
                <div className="flex justify-end mt-1">
                    <span className="text-sm text-gray-400">{Math.round(percentage)}%</span>
                </div>
            </div>
            
            <div className="p-3 bg-blue-900/20 rounded-lg border border-blue-800/30">
                <p className="text-sm text-blue-400">
                    {percentage >= 100 ? (
                        "Program completed successfully."
                    ) : percentage >= 75 ? (
                        "Advanced level reached. Nearly complete."
                    ) : percentage >= 50 ? (
                        "Intermediate progress achieved."
                    ) : percentage >= 25 ? (
                        "Beginner progress made."
                    ) : (
                        "Just getting started with the program."
                    )}
                </p>
            </div>
        </div>
    );
};

// Export the hook, main component, and additional components
export { useStudentProgramProgress };
export default GetStudentProgramProgress;