import { useState, useEffect } from 'react';
import { useReadContract } from 'wagmi';
import { motion } from 'framer-motion';

// Utility function to format timestamp to readable date
const formatTimestamp = (timestamp: number) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp * 1000); // Convert from seconds to milliseconds
    return date.toLocaleString();
};

// Utility function to calculate time remaining
const calculateTimeRemaining = (endTimestamp: number) => {
    if (!endTimestamp) return { days: 0, hours: 0, minutes: 0 };
    
    const now = Math.floor(Date.now() / 1000); // Current time in seconds
    const timeRemaining = Math.max(0, endTimestamp - now); // Ensure non-negative
    
    const days = Math.floor(timeRemaining / (60 * 60 * 24));
    const hours = Math.floor((timeRemaining % (60 * 60 * 24)) / (60 * 60));
    const minutes = Math.floor((timeRemaining % (60 * 60)) / 60);
    
    return { days, hours, minutes };
};

const GetSubscriptionEndTime = ({ contract }: { contract: { address: `0x${string}`; abi: any } }) => {
    const [subscriptionEndTime, setSubscriptionEndTime] = useState<number | null>(null);
    const [showInfo, setShowInfo] = useState(false);
    const [fetchStatus, setFetchStatus] = useState('');
    const [showStatus, setShowStatus] = useState(false);

    const { isError, isLoading, refetch } = useReadContract({
        ...contract,
        functionName: 'subscriptionEndTime',
        args: [],
    });

    const handleFetchInfo = async () => {
        try {
            const result = await refetch();
            
            if (result.data) {
                // Convert bigint to number
                setSubscriptionEndTime(Number(result.data));
                setFetchStatus('Subscription end time fetched successfully');
                setShowInfo(true);
            } else {
                setFetchStatus('Could not retrieve subscription end time');
                setSubscriptionEndTime(null);
                setShowInfo(false);
            }
        } catch (error) {
            console.error('Error fetching subscription end time:', error);
            setFetchStatus('Error fetching subscription end time');
            setSubscriptionEndTime(null);
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

    // Calculate subscription status
    const now = Math.floor(Date.now() / 1000);
    const isActive = subscriptionEndTime ? subscriptionEndTime > now : false;
    const timeRemaining = subscriptionEndTime ? 
        calculateTimeRemaining(subscriptionEndTime) : 
        { days: 0, hours: 0, minutes: 0 };

    // Determine how much time is left as a percentage
    const getTimeRemainingPercentage = () => {
        if (!subscriptionEndTime) return 0;
        
        // Assume a typical subscription period of 30 days
        const typicalPeriod = 30 * 24 * 60 * 60; // 30 days in seconds
        const remaining = Math.max(0, subscriptionEndTime - now);
        
        // If less than 30 days left, show percentage of a month
        // If more than 30 days, cap at 100%
        return Math.min(100, (remaining / typicalPeriod) * 100);
    };

    // Status colors and text based on time remaining
    const getStatusInfo = () => {
        if (subscriptionEndTime === null) return { text: '', colorClass: '' };
        
        if (!isActive) {
            return { text: 'Expired', colorClass: 'text-red-400' };
        } else if (timeRemaining.days < 3) {
            return { text: 'Critical', colorClass: 'text-red-400' };
        } else if (timeRemaining.days < 7) {
            return { text: 'Warning', colorClass: 'text-yellow-400' };
        } else {
            return { text: 'Active', colorClass: 'text-green-400' };
        }
    };
    
    const statusInfo = getStatusInfo();

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="bg-gray-900/90 backdrop-blur-sm border border-gray-700 shadow-xl rounded-lg p-6 max-w-full mx-auto w-full md:max-w-full mb-9"
        >
            <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                Subscription End Time
            </h2>

            <div className="mb-4 flex justify-center">
                <motion.button
                    onClick={handleFetchInfo}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={isLoading}
                    className="bg-gradient-to-r from-blue-500 to-purple-600 text-white py-2 px-6 rounded-md hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50 transition-colors duration-300 shadow-lg disabled:opacity-50"
                >
                    {isLoading ? 'Loading...' : 'Fetch Subscription End Time'}
                </motion.button>
            </div>
            
            {showStatus && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="mb-4"
                >
                    <p className={`p-2 rounded-md ${fetchStatus.includes('Error') || fetchStatus.includes('Could not') ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                        {fetchStatus}
                    </p>
                </motion.div>
            )}
            
            {isLoading && (
                <div className="flex justify-center items-center h-40">
                    <div className="w-10 h-10 border-4 border-t-blue-400 border-r-purple-500 border-b-blue-400 border-l-purple-500 rounded-full animate-spin"></div>
                    <span className="ml-3 text-gray-300">Loading subscription information...</span>
                </div>
            )}
            
            {isError && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-4">
                    <div className="text-red-400 text-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mx-auto mb-2" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <p className="text-lg">Error fetching subscription end time</p>
                    </div>
                </div>
            )}
            
            {showInfo && subscriptionEndTime !== null && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    transition={{ duration: 0.3 }}
                    className="mt-6"
                >
                    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-5 shadow-lg">
                        <h3 className="text-xl font-semibold mb-4 text-blue-400">Subscription Details</h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div className="bg-gray-800/80 rounded-lg p-4 border border-gray-700">
                                <p className="text-sm text-gray-400 mb-1">End Date & Time</p>
                                <div className="text-gray-200">
                                    {formatTimestamp(subscriptionEndTime)}
                                </div>
                            </div>
                            
                            <div className="bg-gray-800/80 rounded-lg p-4 border border-gray-700">
                                <p className="text-sm text-gray-400 mb-1">Status</p>
                                <div className={`font-semibold ${statusInfo.colorClass}`}>
                                    {statusInfo.text}
                                </div>
                            </div>
                        </div>
                        
                        {/* Time Remaining */}
                        {isActive && (
                            <div className="mt-4 bg-gray-800/80 rounded-lg p-4 border border-gray-700">
                                <p className="text-sm text-gray-400 mb-1">Time Remaining</p>
                                <div className="text-gray-200">
                                    {timeRemaining.days} days, {timeRemaining.hours} hours, {timeRemaining.minutes} minutes
                                </div>
                                
                                {/* Subscription progress bar */}
                                <div className="mt-3">
                                    <div className="w-full bg-gray-700 rounded-full h-4">
                                        <div 
                                            className={`h-4 rounded-full ${
                                                timeRemaining.days < 3
                                                    ? 'bg-gradient-to-r from-red-500 to-red-600'
                                                    : timeRemaining.days < 7
                                                        ? 'bg-gradient-to-r from-yellow-400 to-yellow-500'
                                                        : 'bg-gradient-to-r from-blue-500 to-purple-500'
                                            }`}
                                            style={{ 
                                                width: `${getTimeRemainingPercentage()}%` 
                                            }}
                                        ></div>
                                    </div>
                                </div>
                                <div className="flex justify-between mt-1 text-xs text-gray-400">
                                    <span>0 days</span>
                                    <span>15 days</span>
                                    <span>30 days</span>
                                </div>
                            </div>
                        )}
                        
                        {/* Expired notice */}
                        {!isActive && (
                            <div className="mt-4 bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                                <div className="flex items-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-400 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                    <p className="text-red-400">
                                        Subscription has expired. The subscription ended {Math.floor((now - subscriptionEndTime) / (60 * 60 * 24))} days ago.
                                    </p>
                                </div>
                            </div>
                        )}
                        
                        {/* Renewal recommendation */}
                        {isActive && timeRemaining.days < 7 && (
                            <div className="mt-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                                <div className="flex items-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-400 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                    </svg>
                                    <p className="text-yellow-400">
                                        {timeRemaining.days < 3 
                                            ? 'Critical: Your subscription is about to expire. Please renew as soon as possible.' 
                                            : 'Warning: Your subscription will expire soon. Consider renewing in the next few days.'}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>
            )}
        </motion.div>
    );
}

export default GetSubscriptionEndTime;