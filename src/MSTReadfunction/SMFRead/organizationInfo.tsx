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

interface OrganizationInfo {
    isDeployed: boolean;
    isActive: boolean;
    subscriptionEnd: number;
    subscriptionDuration: number;
}

const GetOrganizationInfo = ({ contract }: { contract: any }) => {
    const [organizationAddress, setOrganizationAddress] = useState<string>('');
    const [orgInfo, setOrgInfo] = useState<OrganizationInfo | null>(null);
    const [showInfo, setShowInfo] = useState(false);
    const [fetchStatus, setFetchStatus] = useState('');
    const [showStatus, setShowStatus] = useState(false);

    const { isError, isLoading, refetch } = useReadContract({
        ...contract,
        functionName: 'organizationInfo',
        args: [organizationAddress],
        enabled: false, // Don't automatically fetch on component mount
    });

    const handleFetchInfo = async () => {
        if (!organizationAddress) {
            setFetchStatus('Please enter an organization address');
            setShowStatus(true);
            return;
        }

        try {
            const result = await refetch();
            
            if (result.data) {
                // Cast the data to the expected shape
                const info = result.data as [boolean, boolean, bigint, bigint];
                
                setOrgInfo({
                    isDeployed: info[0],
                    isActive: info[1],
                    subscriptionEnd: Number(info[2]),
                    subscriptionDuration: Number(info[3])
                });
                
                setFetchStatus('Organization information fetched successfully');
                setShowInfo(true);
            } else {
                setFetchStatus('No organization information found or invalid address');
                setOrgInfo(null);
                setShowInfo(false);
            }
        } catch (error) {
            console.error('Error fetching organization information:', error);
            setFetchStatus('Error fetching organization information');
            setOrgInfo(null);
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

    // Calculate additional status values
    const isInGracePeriod = orgInfo ? 
        (orgInfo.subscriptionEnd > Math.floor(Date.now() / 1000) && !orgInfo.isActive) : 
        false;
        
    const timeRemaining = orgInfo ? 
        calculateTimeRemaining(orgInfo.subscriptionEnd) : 
        { days: 0, hours: 0, minutes: 0 };

    // Determine the subscription status text and color
    const getStatusInfo = () => {
        if (!orgInfo) return { text: '', colorClass: '' };
        
        if (!orgInfo.isDeployed) {
            return { text: 'Not Deployed', colorClass: 'text-gray-400' };
        } else if (orgInfo.isActive) {
            return { text: 'Active', colorClass: 'text-green-400' };
        } else if (isInGracePeriod) {
            return { text: 'Grace Period', colorClass: 'text-yellow-400' };
        } else {
            return { text: 'Inactive', colorClass: 'text-red-400' };
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
                Organization Information
            </h2>

            <div className="mb-4">
                <label htmlFor="orgAddress" className="block text-sm font-medium text-gray-300 mb-1">
                    Organization Address
                </label>
                <div className="flex space-x-3">
                    <input
                        id="orgAddress"
                        type="text"
                        value={organizationAddress}
                        onChange={(e) => setOrganizationAddress(e.target.value)}
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
                    <span className="ml-3 text-gray-300">Loading organization information...</span>
                </div>
            )}
            
            {isError && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-4">
                    <div className="text-red-400 text-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mx-auto mb-2" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <p className="text-lg">Error fetching organization information</p>
                    </div>
                </div>
            )}
            
            {showInfo && orgInfo && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    transition={{ duration: 0.3 }}
                    className="mt-6"
                >
                    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-5 shadow-lg">
                        <h3 className="text-xl font-semibold mb-4 text-blue-400">Organization Status</h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div className="bg-gray-800/80 rounded-lg p-4 border border-gray-700">
                                <p className="text-sm text-gray-400 mb-1">Organization Address</p>
                                <div className="font-mono text-gray-200 break-all">
                                    <span className="block md:hidden">{truncateAddress(organizationAddress)}</span>
                                    <span className="hidden md:block">{organizationAddress}</span>
                                </div>
                            </div>
                            
                            <div className="bg-gray-800/80 rounded-lg p-4 border border-gray-700">
                                <p className="text-sm text-gray-400 mb-1">Status</p>
                                <div className={`font-semibold ${statusInfo.colorClass}`}>
                                    {statusInfo.text}
                                </div>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div className="bg-gray-800/80 rounded-lg p-4 border border-gray-700">
                                <p className="text-sm text-gray-400 mb-1">Deployment Status</p>
                                <div className={`font-semibold ${orgInfo.isDeployed ? 'text-green-400' : 'text-red-400'}`}>
                                    {orgInfo.isDeployed ? 'Deployed' : 'Not Deployed'}
                                </div>
                            </div>
                            
                            <div className="bg-gray-800/80 rounded-lg p-4 border border-gray-700">
                                <p className="text-sm text-gray-400 mb-1">Subscription Status</p>
                                <div className={`font-semibold ${orgInfo.isActive ? 'text-green-400' : (isInGracePeriod ? 'text-yellow-400' : 'text-red-400')}`}>
                                    {orgInfo.isActive ? 'Active' : (isInGracePeriod ? 'Grace Period' : 'Inactive')}
                                </div>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-gray-800/80 rounded-lg p-4 border border-gray-700">
                                <p className="text-sm text-gray-400 mb-1">Subscription End</p>
                                <div className="text-gray-200">
                                    {formatTimestamp(orgInfo.subscriptionEnd)}
                                </div>
                            </div>
                            
                            <div className="bg-gray-800/80 rounded-lg p-4 border border-gray-700">
                                <p className="text-sm text-gray-400 mb-1">Subscription Duration</p>
                                <div className="text-gray-200">
                                    {Math.floor(orgInfo.subscriptionDuration / 86400)} days
                                </div>
                            </div>
                        </div>
                        
                        {/* Time Remaining */}
                        {(orgInfo.isActive || isInGracePeriod) && (
                            <div className="mt-4 bg-gray-800/80 rounded-lg p-4 border border-gray-700">
                                <p className="text-sm text-gray-400 mb-1">Time Remaining</p>
                                <div className="text-gray-200">
                                    {timeRemaining.days} days, {timeRemaining.hours} hours, {timeRemaining.minutes} minutes
                                </div>
                                
                                {/* Subscription progress bar */}
                                <div className="mt-3">
                                    <div className="w-full bg-gray-700 rounded-full h-4">
                                        {orgInfo.subscriptionDuration > 0 && (
                                            <div 
                                                className={`h-4 rounded-full ${
                                                    isInGracePeriod 
                                                        ? 'bg-gradient-to-r from-yellow-500 to-red-500' 
                                                        : 'bg-gradient-to-r from-blue-500 to-purple-500'
                                                }`}
                                                style={{ 
                                                    width: `${Math.min(
                                                        100, 
                                                        100 - (((orgInfo.subscriptionEnd - Math.floor(Date.now() / 1000)) / orgInfo.subscriptionDuration) * 100)
                                                    )}%` 
                                                }}
                                            ></div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        {/* Copy Address Button */}
                        <motion.div
                            className="mt-4"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.3 }}
                        >
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(organizationAddress);
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

export default GetOrganizationInfo;