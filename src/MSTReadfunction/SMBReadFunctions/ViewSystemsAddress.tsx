import { useState, useEffect } from 'react';
import { useReadContract } from 'wagmi';
import { motion } from 'framer-motion';
import { contractSchoolManagementBaseConfig } from '../../contracts';

// Utility function to truncate address
const truncateAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

/**
 * SystemAddresses Component
 * 
 * This component displays the system addresses from the contract,
 * including student profile, tuition system, and revenue system.
 * 
 * Enhanced with data export capabilities for use in other components.
 */
interface SystemAddressesProps {
  contract?: { address: `0x${string}`; abi: any }; // Contract for reading system addresses (optional now as we use the imported config)
  onAddressesChange?: (addresses: SystemAddressData | null) => void; // Callback for when addresses change
  onRefresh?: () => void; // Callback when user manually refreshes data
  autoFetch?: boolean; // Whether to automatically fetch addresses on mount
  hideVerifyLinks?: boolean; // Whether to hide the verify links
}

// Interface for the addresses data that can be exported
export interface SystemAddressData {
  studentProfile: string;
  tuitionSystem: string;
  revenueSystem: string;
  lastFetched: Date | null;
  isLoading: boolean;
  hasError: boolean;
  statusMessage: string;
}

const SystemAddresses = ({
  contract,
  onAddressesChange,
  onRefresh,
  autoFetch = false,
  hideVerifyLinks = false
}: SystemAddressesProps) => {
    // Use the imported contract config if contract is not provided
    const contractConfig = contract || contractSchoolManagementBaseConfig;
    
    // State for each system address
    const [studentProfileAddress, setStudentProfileAddress] = useState('');
    const [tuitionSystemAddress, setTuitionSystemAddress] = useState('');
    const [revenueSystemAddress, setRevenueSystemAddress] = useState('');
    
    // UI state
    const [isLoading, setIsLoading] = useState(false);
    const [fetchStatus, setFetchStatus] = useState('');
    const [showStatus, setShowStatus] = useState(false);
    const [showInfo, setShowInfo] = useState(false);
    const [lastFetched, setLastFetched] = useState<Date | null>(null);

    // Contract read hooks for each function
    const studentProfileRead = useReadContract({
        address: contractConfig.address as `0x${string}`,
        abi: contractConfig.abi,
        functionName: 'studentProfile' as const,
        query: {
            enabled: true
        }
    });

    const tuitionSystemRead = useReadContract({
        address: contractConfig.address as `0x${string}`,
        abi: contractConfig.abi,
        functionName: 'tuitionSystem' as const,
        query: {
            enabled: true
        }
    });

    const revenueSystemRead = useReadContract({
        address: contractConfig.address as `0x${string}`,
        abi: contractConfig.abi,
        functionName: 'revenueSystem' as const,
        query: {
            enabled: true
        }
    });

    // Export address data when it changes
    useEffect(() => {
        if (onAddressesChange) {
            // Check if any request had an error
            const hasError = studentProfileRead.isError || tuitionSystemRead.isError || revenueSystemRead.isError;
            
            const exportData: SystemAddressData = {
                studentProfile: studentProfileAddress,
                tuitionSystem: tuitionSystemAddress,
                revenueSystem: revenueSystemAddress,
                lastFetched,
                isLoading,
                hasError,
                statusMessage: fetchStatus
            };
            
            onAddressesChange(exportData);
        }
    }, [
        studentProfileAddress,
        tuitionSystemAddress,
        revenueSystemAddress,
        lastFetched,
        isLoading,
        fetchStatus,
        studentProfileRead.isError,
        tuitionSystemRead.isError,
        revenueSystemRead.isError,
        onAddressesChange
    ]);

    const handleFetchAll = async () => {
        setIsLoading(true);
        try {
            // Fetch all data concurrently
            const [studentResult, tuitionResult, revenueResult] = await Promise.all([
                studentProfileRead.refetch(),
                tuitionSystemRead.refetch(),
                revenueSystemRead.refetch()
            ]);
            
            // Update state with results
            if (studentResult.data) {
                setStudentProfileAddress(String(studentResult.data));
            }
            
            if (tuitionResult.data) {
                setTuitionSystemAddress(String(tuitionResult.data));
            }
            
            if (revenueResult.data) {
                setRevenueSystemAddress(String(revenueResult.data));
            }
            
            const now = new Date();
            setLastFetched(now);
            setFetchStatus('System addresses fetched successfully');
            setShowInfo(true);
            
            // Call refresh callback if provided
            if (onRefresh) {
                onRefresh();
            }
        } catch (error) {
            console.error('Error fetching system addresses:', error);
            setFetchStatus('Error fetching system addresses');
            setShowInfo(false);
        } finally {
            setIsLoading(false);
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
    
    // Auto-fetch addresses if requested
    useEffect(() => {
        if (autoFetch && !lastFetched) {
            handleFetchAll();
        }
    }, [autoFetch, lastFetched]);
    
    // Public method to programmatically refresh the data
    const refreshAddresses = () => {
        handleFetchAll();
    };

    // Expose the refreshAddresses method to parent components
    useEffect(() => {
        // Make the refreshAddresses function available on the window for external access
        if (typeof window !== 'undefined') {
            (window as any).__systemAddressesRefresh = refreshAddresses;
        }
        
        return () => {
            // Clean up when component unmounts
            if (typeof window !== 'undefined') {
                delete (window as any).__systemAddressesRefresh;
            }
        };
    }, []);

    // Check if any request had an error
    const hasError = studentProfileRead.isError || tuitionSystemRead.isError || revenueSystemRead.isError;

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="bg-gray-900/90 backdrop-blur-sm border border-gray-700 shadow-xl rounded-lg p-6 max-w-full mx-auto w-full md:max-w-full mb-9"
        >
            <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                System Addresses
            </h2>

            <div className="mb-4 flex justify-center">
                <motion.button
                    onClick={handleFetchAll}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={isLoading}
                    className="bg-gradient-to-r from-blue-500 to-purple-600 text-white py-2 px-6 rounded-md hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50 transition-colors duration-300 shadow-lg disabled:opacity-50"
                >
                    {isLoading ? 'Loading...' : 'Fetch System Addresses'}
                </motion.button>
            </div>
            
            {showStatus && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="mb-4"
                >
                    <p className={`p-2 rounded-md ${fetchStatus.includes('Error') ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                        {fetchStatus}
                    </p>
                </motion.div>
            )}
            
            {isLoading && (
                <div className="flex justify-center items-center h-40">
                    <div className="w-10 h-10 border-4 border-t-blue-400 border-r-purple-500 border-b-blue-400 border-l-purple-500 rounded-full animate-spin"></div>
                    <span className="ml-3 text-gray-300">Loading system addresses...</span>
                </div>
            )}
            
            {hasError && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-4">
                    <div className="text-red-400 text-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mx-auto mb-2" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <p className="text-lg">Error fetching one or more system addresses</p>
                    </div>
                </div>
            )}
            
            {showInfo && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    transition={{ duration: 0.3 }}
                    className="mt-6"
                >
                    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-5 shadow-lg">
                        <h3 className="text-xl font-semibold mb-4 text-blue-400">Connected Systems</h3>
                        
                        {/* Student Profile System */}
                        <div className="mb-4 bg-gray-800/80 rounded-lg p-4 border border-gray-700">
                            <div className="flex items-center mb-2">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center mr-3">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <h4 className="text-lg font-medium text-white">Student Profile System</h4>
                            </div>
                            <div className="pl-11">
                                <p className="text-sm text-gray-400 mb-1">Contract Address</p>
                                <div className="flex items-center">
                                    <div className="font-mono text-gray-200 break-all">
                                        <span className="block md:hidden">
                                            {studentProfileAddress ? truncateAddress(studentProfileAddress) : 'Not fetched'}
                                        </span>
                                        <span className="hidden md:block">
                                            {studentProfileAddress || 'Not fetched'}
                                        </span>
                                    </div>
                                    {studentProfileAddress && (
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText(studentProfileAddress);
                                                setFetchStatus('Student Profile address copied to clipboard!');
                                                setShowStatus(true);
                                            }}
                                            className="ml-2 p-1 rounded-md hover:bg-gray-700 text-gray-400 hover:text-gray-200 transition-colors duration-200"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                                                <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                                <p className="text-xs text-gray-500 mt-2">
                                    Manages student information and academic records
                                </p>
                            </div>
                        </div>
                        
                        {/* Tuition System */}
                        <div className="mb-4 bg-gray-800/80 rounded-lg p-4 border border-gray-700">
                            <div className="flex items-center mb-2">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center mr-3">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <h4 className="text-lg font-medium text-white">Tuition System</h4>
                            </div>
                            <div className="pl-11">
                                <p className="text-sm text-gray-400 mb-1">Contract Address</p>
                                <div className="flex items-center">
                                    <div className="font-mono text-gray-200 break-all">
                                        <span className="block md:hidden">
                                            {tuitionSystemAddress ? truncateAddress(tuitionSystemAddress) : 'Not fetched'}
                                        </span>
                                        <span className="hidden md:block">
                                            {tuitionSystemAddress || 'Not fetched'}
                                        </span>
                                    </div>
                                    {tuitionSystemAddress && (
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText(tuitionSystemAddress);
                                                setFetchStatus('Tuition System address copied to clipboard!');
                                                setShowStatus(true);
                                            }}
                                            className="ml-2 p-1 rounded-md hover:bg-gray-700 text-gray-400 hover:text-gray-200 transition-colors duration-200"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                                                <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                                <p className="text-xs text-gray-500 mt-2">
                                    Handles student tuition payments and fee structures
                                </p>
                            </div>
                        </div>
                        
                        {/* Revenue System */}
                        <div className="bg-gray-800/80 rounded-lg p-4 border border-gray-700">
                            <div className="flex items-center mb-2">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center mr-3">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <h4 className="text-lg font-medium text-white">Revenue System</h4>
                            </div>
                            <div className="pl-11">
                                <p className="text-sm text-gray-400 mb-1">Contract Address</p>
                                <div className="flex items-center">
                                    <div className="font-mono text-gray-200 break-all">
                                        <span className="block md:hidden">
                                            {revenueSystemAddress ? truncateAddress(revenueSystemAddress) : 'Not fetched'}
                                        </span>
                                        <span className="hidden md:block">
                                            {revenueSystemAddress || 'Not fetched'}
                                        </span>
                                    </div>
                                    {revenueSystemAddress && (
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText(revenueSystemAddress);
                                                setFetchStatus('Revenue System address copied to clipboard!');
                                                setShowStatus(true);
                                            }}
                                            className="ml-2 p-1 rounded-md hover:bg-gray-700 text-gray-400 hover:text-gray-200 transition-colors duration-200"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                                                <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                                <p className="text-xs text-gray-500 mt-2">
                                    Manages institutional revenue and financial operations
                                </p>
                            </div>
                        </div>
                        
                        {/* System interaction visualization */}
                        <div className="mt-6">
                            <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                                <h4 className="text-sm font-medium text-gray-300 mb-3">System Interaction Flow</h4>
                                <div className="flex flex-col items-center">
                                    <div className="w-full max-w-xs flex justify-between items-center">
                                        <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center border border-blue-500/30">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                        <div className="h-1 flex-grow bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
                                        <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center border border-purple-500/30">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-purple-400" viewBox="0 0 20 20" fill="currentColor">
                                                <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                    </div>
                                    <div className="h-10 w-1 bg-gradient-to-b from-purple-500 to-indigo-500 my-2"></div>
                                    <div className="w-16 h-16 bg-indigo-500/20 rounded-full flex items-center justify-center border border-indigo-500/30">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-400" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                </div>
                                <div className="flex justify-between text-xs text-gray-400 mt-4">
                                    <div className="text-center">Student Profile</div>
                                    <div className="text-center">Tuition System</div>
                                    <div className="text-center">Revenue System</div>
                                </div>
                            </div>
                        </div>
                        
                        {/* Verify on Block Explorer */}
                        {!hideVerifyLinks && (
                            <motion.div
                                className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.3 }}
                            >
                                {studentProfileAddress && (
                                    <a
                                        href={`https://etherscan.io/address/${studentProfileAddress}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50 transition-colors duration-300 shadow-md flex items-center justify-center"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M6.672 1.911a1 1 0 10-1.932.518l.259.966a1 1 0 001.932-.518l-.26-.966zM2.429 4.74a1 1 0 10-.517 1.932l.966.259a1 1 0 00.517-1.932l-.966-.26zm8.814-.569a1 1 0 00-1.415-1.414l-.707.707a1 1 0 101.415 1.415l.707-.708zm-7.071 7.072l.707-.707A1 1 0 003.465 9.12l-.708.707a1 1 0 001.415 1.415zm3.2-5.171a1 1 0 00-1.3 1.3l4 10a1 1 0 001.823.075l1.38-2.759 3.018 3.02a1 1 0 001.414-1.415l-3.019-3.02 2.76-1.379a1 1 0 00-.076-1.822l-10-4z" clipRule="evenodd" />
                                        </svg>
                                        Verify Student Profile
                                    </a>
                                )}
                                
                                {tuitionSystemAddress && (
                                    <a
                                        href={`https://etherscan.io/address/${tuitionSystemAddress}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50 transition-colors duration-300 shadow-md flex items-center justify-center"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M6.672 1.911a1 1 0 10-1.932.518l.259.966a1 1 0 001.932-.518l-.26-.966zM2.429 4.74a1 1 0 10-.517 1.932l.966.259a1 1 0 00.517-1.932l-.966-.26zm8.814-.569a1 1 0 00-1.415-1.414l-.707.707a1 1 0 101.415 1.415l.707-.708zm-7.071 7.072l.707-.707A1 1 0 003.465 9.12l-.708.707a1 1 0 001.415 1.415zm3.2-5.171a1 1 0 00-1.3 1.3l4 10a1 1 0 001.823.075l1.38-2.759 3.018 3.02a1 1 0 001.414-1.415l-3.019-3.02 2.76-1.379a1 1 0 00-.076-1.822l-10-4z" clipRule="evenodd" />
                                        </svg>
                                        Verify Tuition System
                                    </a>
                                )}
                                
                                {revenueSystemAddress && (
                                    <a
                                        href={`https://etherscan.io/address/${revenueSystemAddress}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50 transition-colors duration-300 shadow-md flex items-center justify-center"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M6.672 1.911a1 1 0 10-1.932.518l.259.966a1 1 0 001.932-.518l-.26-.966zM2.429 4.74a1 1 0 10-.517 1.932l.966.259a1 1 0 00.517-1.932l-.966-.26zm8.814-.569a1 1 0 00-1.415-1.414l-.707.707a1 1 0 101.415 1.415l.707-.708zm-7.071 7.072l.707-.707A1 1 0 003.465 9.12l-.708.707a1 1 0 001.415 1.415zm3.2-5.171a1 1 0 00-1.3 1.3l4 10a1 1 0 001.823.075l1.38-2.759 3.018 3.02a1 1 0 001.414-1.415l-3.019-3.02 2.76-1.379a1 1 0 00-.076-1.822l-10-4z" clipRule="evenodd" />
                                        </svg>
                                        Verify Revenue System
                                    </a>
                                )}
                            </motion.div>
                        )}
                    </div>
                </motion.div>
            )}
        </motion.div>
    );
};

// Export a utility hook for accessing system addresses
export const useSystemAddresses = (autoFetch: boolean = false) => {
    const [addressData, setAddressData] = useState<SystemAddressData | null>(null);
    
    const handleAddressesChange = (data: SystemAddressData | null) => {
        setAddressData(data);
    };
    
    // Return both the component and the current data
    return {
        SystemAddressesComponent: () => (
            <SystemAddresses
                onAddressesChange={handleAddressesChange}
                autoFetch={autoFetch}
            />
        ),
        data: addressData,
        // Method to programmatically refresh the data
        refreshAddresses: () => {
            if (typeof window !== 'undefined' && (window as any).__systemAddressesRefresh) {
                (window as any).__systemAddressesRefresh();
            }
        }
    };
};

export default SystemAddresses;