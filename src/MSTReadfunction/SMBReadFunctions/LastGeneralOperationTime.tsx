import { useState, useEffect } from 'react';
import { useReadContract } from 'wagmi';
import { motion } from 'framer-motion';

// Utility function to truncate address
const truncateAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

// Utility function to format timestamp to readable date
const formatTimestamp = (timestamp: number) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp * 1000); // Convert from seconds to milliseconds
    return date.toLocaleString();
};

// Utility function to calculate time elapsed
const calculateTimeElapsed = (timestamp: number) => {
    if (!timestamp) return { days: 0, hours: 0, minutes: 0 };
    
    const now = Math.floor(Date.now() / 1000); // Current time in seconds
    const elapsed = now - timestamp; // Time elapsed in seconds
    
    const days = Math.floor(elapsed / (60 * 60 * 24));
    const hours = Math.floor((elapsed % (60 * 60 * 24)) / (60 * 60));
    const minutes = Math.floor((elapsed % (60 * 60)) / 60);
    
    return { days, hours, minutes };
};

const GetLastGeneralOperationTime = ({ contract }: { contract: { address: `0x${string}`; abi: any } }) => {
    const [address, setAddress] = useState('');
    const [lastOperationTime, setLastOperationTime] = useState(null);
    const [showInfo, setShowInfo] = useState(false);
    const [fetchStatus, setFetchStatus] = useState('');
    const [showStatus, setShowStatus] = useState(false);

    const { isError, isLoading, refetch } = useReadContract({
        ...contract,
        functionName: 'lastGeneralOperationTime',
        args: [address],
    });

    const handleFetchInfo = async () => {
        if (!address) {
            setFetchStatus('Please enter an address');
            setShowStatus(true);
            return;
        }

        try {
            const result = await refetch();
            
            if (result.data) {
                // Convert bigint to number
                setLastOperationTime(Number(result.data) as any);
                setFetchStatus('Last operation time fetched successfully');
                setShowInfo(true);
            } else {
                setFetchStatus('No operation time found or invalid address');
                setLastOperationTime(null);
                setShowInfo(false);
            }
        } catch (error) {
            console.error('Error fetching last operation time:', error);
            setFetchStatus('Error fetching last operation time');
            setLastOperationTime(null);
            setShowInfo(false);
        }
        
        setShowStatus(true);
    };

    useEffect(() => {
        if (showStatus) {
            const timer = setTimeout(() => {
                setShowStatus(false);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [showStatus]);

    // Calculate time elapsed
    const timeElapsed = lastOperationTime ? 
        calculateTimeElapsed(lastOperationTime) : 
        { days: 0, hours: 0, minutes: 0 };

    // Determine status based on time elapsed
    const getActivityStatus = () => {
        if (lastOperationTime === null) return { text: '', colorClass: '' };
        
        // Less than 1 day - Very Active
        if (timeElapsed.days < 1) {
            return { text: 'Very Active', colorClass: 'text-green-400' };
        }
        // 1-7 days - Active
        else if (timeElapsed.days < 7) {
            return { text: 'Active', colorClass: 'text-blue-400' };
        }
        // 7-30 days - Moderately Active
        else if (timeElapsed.days < 30) {
            return { text: 'Moderately Active', colorClass: 'text-yellow-400' };
        }
        // 30+ days - Inactive
        else {
            return { text: 'Inactive', colorClass: 'text-red-400' };
        }
    };
    
    const activityStatus = getActivityStatus();

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="bg-gray-900/90 backdrop-blur-sm border border-gray-700 shadow-xl rounded-lg p-6 max-w-full mx-auto w-full md:max-w-full mb-9"
        >
            <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                Last General Operation Time
            </h2>

            <div className="mb-4">
                <label htmlFor="addressInput" className="block text-sm font-medium text-gray-300 mb-1">
                    Address
                </label>
                <div className="flex space-x-3">
                    <input
                        id="addressInput"
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="0x..."
                        className="bg-gray-800 border border-gray-600 text-gray-200 text-sm rounded-lg focus:ring-blue-500 focus:border-purple-500 block w-full p-2.5"
                    />
                    <motion.button
                        onClick={handleFetchInfo}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        disabled={isLoading}
                        className="bg-gradient-to-r from-blue-500 to-purple-600 text-white py-2 px-6 rounded-md hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50 transition-colors duration-300 shadow-lg disabled:opacity-50"
                    >
                        {isLoading ? 'Loading...' : 'Fetch'}
                    </motion.button>
                </div>
            </div>
            
            {showStatus && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="mb-4"
                >
                    <p className={`p-2 rounded-md ${fetchStatus.includes('Error') || fetchStatus.includes('invalid') ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                        {fetchStatus}
                    </p>
                </motion.div>
            )}
            
            {isLoading && (
                <div className="flex justify-center items-center h-40">
                    <div className="w-10 h-10 border-4 border-t-blue-400 border-r-purple-500 border-b-blue-400 border-l-purple-500 rounded-full animate-spin"></div>
                    <span className="ml-3 text-gray-300">Loading operation information...</span>
                </div>
            )}
            
            {isError && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-4">
                    <div className="text-red-400 text-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mx-auto mb-2" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <p className="text-lg">Error fetching last operation time</p>
                    </div>
                </div>
            )}
            
            {showInfo && lastOperationTime !== null && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    transition={{ duration: 0.3 }}
                    className="mt-6"
                >
                    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-5 shadow-lg">
                        <h3 className="text-xl font-semibold mb-4 text-blue-400">Operation Details</h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div className="bg-gray-800/80 rounded-lg p-4 border border-gray-700">
                                <p className="text-sm text-gray-400 mb-1">Address</p>
                                <div className="font-mono text-gray-200 break-all">
                                    <span className="block md:hidden">{truncateAddress(address)}</span>
                                    <span className="hidden md:block">{address}</span>
                                </div>
                            </div>
                            
                            <div className="bg-gray-800/80 rounded-lg p-4 border border-gray-700">
                                <p className="text-sm text-gray-400 mb-1">Activity Status</p>
                                <div className={`font-semibold ${activityStatus.colorClass}`}>
                                    {activityStatus.text}
                                </div>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-gray-800/80 rounded-lg p-4 border border-gray-700">
                                <p className="text-sm text-gray-400 mb-1">Last Operation Time</p>
                                <div className="text-gray-200">
                                    {formatTimestamp(lastOperationTime)}
                                </div>
                            </div>
                            
                            <div className="bg-gray-800/80 rounded-lg p-4 border border-gray-700">
                                <p className="text-sm text-gray-400 mb-1">Time Elapsed</p>
                                <div className="text-gray-200">
                                    {timeElapsed.days} days, {timeElapsed.hours} hours, {timeElapsed.minutes} minutes
                                </div>
                            </div>
                        </div>
                        
                        {/* Time Elapsed Visualization */}
                        <div className="mt-4 bg-gray-800/80 rounded-lg p-4 border border-gray-700">
                            <p className="text-sm text-gray-400 mb-1">Activity Timeline</p>
                            
                            {/* Activity timeline visualization */}
                            <div className="mt-3">
                                <div className="relative pt-1">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="text-xs text-green-400">Very Active</div>
                                        <div className="text-xs text-blue-400">Active</div>
                                        <div className="text-xs text-yellow-400">Moderate</div>
                                        <div className="text-xs text-red-400">Inactive</div>
                                    </div>
                                    <div className="overflow-hidden h-4 text-xs flex rounded-full bg-gray-700">
                                        {/* Progress bars with different colors based on activity levels */}
                                        <div style={{ width: '25%' }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-green-400"></div>
                                        <div style={{ width: '25%' }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-400"></div>
                                        <div style={{ width: '25%' }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-yellow-400"></div>
                                        <div style={{ width: '25%' }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-red-400"></div>
                                    </div>
                                    
                                    {/* Activity marker */}
                                    <div 
                                        className="absolute top-1 w-4 h-8 rounded-full bg-white border-2 border-gray-800 shadow-lg transform -translate-y-2"
                                        style={{ 
                                            left: `${Math.min(
                                                98, // Keep within bounds of the bar
                                                timeElapsed.days < 1 ? 12.5 : 
                                                timeElapsed.days < 7 ? 37.5 : 
                                                timeElapsed.days < 30 ? 62.5 : 87.5
                                            )}%` 
                                        }}
                                    ></div>
                                </div>
                                <div className="flex justify-between mt-1 text-xs text-gray-400">
                                    <span>Today</span>
                                    <span>1 Week</span>
                                    <span>1 Month</span>
                                    <span>Older</span>
                                </div>
                            </div>
                        </div>
                        
                        {/* Copy Address Button */}
                        <motion.div
                            className="mt-4"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.3 }}
                        >
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(address);
                                    setFetchStatus('Address copied to clipboard!');
                                    setShowStatus(true);
                                }}
                                className="w-full bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50 transition-colors duration-300 shadow-md flex items-center justify-center"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                                    <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                                </svg>
                                Copy Address
                            </button>
                        </motion.div>
                    </div>
                </motion.div>
            )}
        </motion.div>
    );
}

export default GetLastGeneralOperationTime;