import { useState, useEffect } from 'react';
import { useReadContract } from 'wagmi';
import { motion } from 'framer-motion';
import { contractSchoolManagementFactoryConfig } from '../../contracts';

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

/**
 * GetOrganizationDetails Component
 * 
 * This component displays organization details from the contract,
 * including subscription status, duration, and time remaining.
 * 
 * Enhanced with data export capabilities for use in other components.
 */
interface GetOrganizationDetailsProps {
  contract?: any; // Contract for reading organization details (optional now as we use the imported config)
  onDetailsChange?: (details: OrganizationDetailsData | null) => void; // Callback for when details change
  onRefresh?: () => void; // Callback when user manually refreshes data
  defaultAddress?: string; // Optional default organization address to check
  autoFetch?: boolean; // Whether to automatically fetch details on mount
  hideProgressBar?: boolean; // Whether to hide the progress bar
}

interface OrganizationDetails {
    contractAddress: string;
    isActive: boolean;
    subscriptionEnd: number;
    subscriptionDuration: number;
    isInGracePeriod: boolean;
}

// Interface for the organization details data that can be exported
export interface OrganizationDetailsData {
    address: string;
    details: OrganizationDetails | null;
    subscriptionStatus: string;
    timeRemaining: {
        days: number;
        hours: number;
        minutes: number;
    };
    progress: number;
    lastFetched: Date | null;
    isLoading: boolean;
    isError: boolean;
    errorMessage: string | null;
}

const GetOrganizationDetails = ({
    contract,
    onDetailsChange,
    onRefresh,
    defaultAddress = '',
    autoFetch = false,
    hideProgressBar = false
}: GetOrganizationDetailsProps) => {
    // Use the imported contract config if contract is not provided
    const contractConfig = contract || contractSchoolManagementFactoryConfig;
    
    const [organizationAddress, setOrganizationAddress] = useState<string>(defaultAddress);
    const [fetchedDetails, setFetchedDetails] = useState<OrganizationDetails | null>(null);
    const [showDetails, setShowDetails] = useState(false);
    const [fetchStatus, setFetchStatus] = useState('');
    const [showStatus, setShowStatus] = useState(false);
    const [lastFetched, setLastFetched] = useState<Date | null>(null);

    const { isError, isLoading, refetch } = useReadContract({
        ...contractConfig,
        functionName: 'getOrganizationDetails',
        args: [organizationAddress],
        enabled: false, // Don't automatically fetch on component mount
    });
    
    // Update organization address when defaultAddress prop changes
    useEffect(() => {
        if (defaultAddress) {
            setOrganizationAddress(defaultAddress);
        }
    }, [defaultAddress]);

    // Calculate subscription status details if we have fetchedDetails
    const subscriptionStatus = fetchedDetails ? (
        fetchedDetails.isActive ? 
            "Active" : 
            (fetchedDetails.isInGracePeriod ? "Grace Period" : "Inactive")
    ) : "";

    const timeRemaining = fetchedDetails ? 
        calculateTimeRemaining(fetchedDetails.subscriptionEnd) : 
        { days: 0, hours: 0, minutes: 0 };
        
    // Calculate progress percentage
    const calculateProgress = () => {
        if (!fetchedDetails || !fetchedDetails.subscriptionDuration) return 0;
        
        const now = Math.floor(Date.now() / 1000);
        const elapsed = Math.max(0, now - (fetchedDetails.subscriptionEnd - fetchedDetails.subscriptionDuration));
        const progress = Math.min(100, (elapsed / fetchedDetails.subscriptionDuration) * 100);
        
        return progress;
    };
    
    const progress = fetchedDetails ? calculateProgress() : 0;
    
    // Export organization details when they change
    useEffect(() => {
        if (onDetailsChange) {
            const exportData: OrganizationDetailsData = {
                address: organizationAddress,
                details: fetchedDetails,
                subscriptionStatus,
                timeRemaining,
                progress,
                lastFetched,
                isLoading,
                isError,
                errorMessage: fetchStatus.includes('Error') || fetchStatus.includes('invalid') ? fetchStatus : null
            };
            
            onDetailsChange(exportData);
        }
    }, [
        organizationAddress,
        fetchedDetails,
        subscriptionStatus,
        timeRemaining,
        progress,
        lastFetched,
        isLoading,
        isError,
        fetchStatus,
        onDetailsChange
    ]);

    const handleFetchDetails = async () => {
        if (!organizationAddress) {
            setFetchStatus('Please enter an organization address');
            setShowStatus(true);
            return;
        }

        try {
            const result = await refetch();
            
            if (result.data) {
                // Cast the data to the expected shape
                const orgDetails = result.data as [string, boolean, bigint, bigint, boolean];
                
                setFetchedDetails({
                    contractAddress: orgDetails[0],
                    isActive: orgDetails[1],
                    subscriptionEnd: Number(orgDetails[2]),
                    subscriptionDuration: Number(orgDetails[3]),
                    isInGracePeriod: orgDetails[4]
                });
                
                const now = new Date();
                setLastFetched(now);
                setFetchStatus('Organization details fetched successfully');
                setShowDetails(true);
                
                // Call refresh callback if provided
                if (onRefresh) {
                    onRefresh();
                }
            } else {
                setFetchStatus('No organization details found or invalid address');
                setFetchedDetails(null);
                setShowDetails(false);
            }
        } catch (error) {
            console.error('Error fetching organization details:', error);
            setFetchStatus('Error fetching organization details');
            setFetchedDetails(null);
            setShowDetails(false);
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
    
    // Auto-fetch details if requested
    useEffect(() => {
        if (autoFetch && organizationAddress && !lastFetched) {
            handleFetchDetails();
        }
    }, [autoFetch, organizationAddress, lastFetched]);
    
    // Public method to programmatically refresh the data
    const refreshDetails = (address?: string) => {
        if (address && address !== organizationAddress) {
            setOrganizationAddress(address);
            
            // Allow time for state to update before fetching
            setTimeout(() => {
                handleFetchDetails();
            }, 100);
        } else {
            handleFetchDetails();
        }
    };

    // Expose the refreshDetails method to parent components
    useEffect(() => {
        // Make the refreshDetails function available on the window for external access
        if (typeof window !== 'undefined') {
            (window as any).__organizationDetailsRefresh = refreshDetails;
        }
        
        return () => {
            // Clean up when component unmounts
            if (typeof window !== 'undefined') {
                delete (window as any).__organizationDetailsRefresh;
            }
        };
    }, [organizationAddress]);

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="bg-gray-900/90 backdrop-blur-sm border border-gray-700 shadow-xl rounded-lg p-6 max-w-full mx-auto w-full md:max-w-full mb-9"
        >
            <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                Organization Details
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
                        onClick={handleFetchDetails}
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
                    <span className="ml-3 text-gray-300">Loading organization details...</span>
                </div>
            )}
            
            {isError && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-4">
                    <div className="text-red-400 text-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mx-auto mb-2" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <p className="text-lg">Error fetching organization details</p>
                    </div>
                </div>
            )}
            
            {showDetails && fetchedDetails && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    transition={{ duration: 0.3 }}
                    className="mt-6"
                >
                    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-5 shadow-lg">
                        <h3 className="text-xl font-semibold mb-4 text-blue-400">Organization Information</h3>
                        
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-gray-800/80 rounded-lg p-4 border border-gray-700">
                                    <p className="text-sm text-gray-400 mb-1">Contract Address</p>
                                    <div className="font-mono text-gray-200 break-all">
                                        <span className="block md:hidden">{truncateAddress(fetchedDetails.contractAddress)}</span>
                                        <span className="hidden md:block">{fetchedDetails.contractAddress}</span>
                                    </div>
                                </div>
                                
                                <div className="bg-gray-800/80 rounded-lg p-4 border border-gray-700">
                                    <p className="text-sm text-gray-400 mb-1">Subscription Status</p>
                                    <div className={`font-semibold ${
                                        fetchedDetails.isActive ? 'text-green-400' : 
                                        (fetchedDetails.isInGracePeriod ? 'text-yellow-400' : 'text-red-400')
                                    }`}>
                                        {subscriptionStatus}
                                    </div>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-gray-800/80 rounded-lg p-4 border border-gray-700">
                                    <p className="text-sm text-gray-400 mb-1">Subscription End</p>
                                    <div className="text-gray-200">
                                        {formatTimestamp(fetchedDetails.subscriptionEnd)}
                                    </div>
                                </div>
                                
                                <div className="bg-gray-800/80 rounded-lg p-4 border border-gray-700">
                                    <p className="text-sm text-gray-400 mb-1">Subscription Duration</p>
                                    <div className="text-gray-200">
                                        {Math.floor(fetchedDetails.subscriptionDuration / 86400)} days
                                    </div>
                                </div>
                                
                                <div className="bg-gray-800/80 rounded-lg p-4 border border-gray-700">
                                    <p className="text-sm text-gray-400 mb-1">Time Remaining</p>
                                    <div className="text-gray-200">
                                        {timeRemaining.days} days, {timeRemaining.hours} hours, {timeRemaining.minutes} minutes
                                    </div>
                                </div>
                            </div>
                            
                            {/* Subscription progress bar */}
                            {fetchedDetails.isActive && !hideProgressBar && (
                                <div className="mt-4">
                                    <p className="text-sm text-gray-400 mb-2">Subscription Progress</p>
                                    <div className="w-full bg-gray-700 rounded-full h-4">
                                        {fetchedDetails.subscriptionDuration > 0 && (
                                            <div 
                                                className={`h-4 rounded-full ${
                                                    fetchedDetails.isInGracePeriod 
                                                        ? 'bg-gradient-to-r from-yellow-500 to-red-500' 
                                                        : 'bg-gradient-to-r from-blue-500 to-purple-500'
                                                }`}
                                                style={{ 
                                                    width: `${Math.min(
                                                        100, 
                                                        100 - (((fetchedDetails.subscriptionEnd - Math.floor(Date.now() / 1000)) / fetchedDetails.subscriptionDuration) * 100)
                                                    )}%` 
                                                }}
                                            ></div>
                                        )}
                                    </div>
                                </div>
                            )}
                            
                            {/* Last Fetched Information */}
                            {lastFetched && (
                                <div className="mt-4 bg-gray-700/20 rounded-md p-2.5">
                                    <div className="text-xs text-gray-400 flex items-center justify-end">
                                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Last checked: {lastFetched.toLocaleString()}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>
            )}
        </motion.div>
    );
};

// Export a utility hook for accessing organization details
export const useOrganizationDetails = (defaultAddress?: string, autoFetch: boolean = false) => {
    const [detailsData, setDetailsData] = useState<OrganizationDetailsData | null>(null);
    
    const handleDetailsChange = (data: OrganizationDetailsData | null) => {
        setDetailsData(data);
    };
    
    // Return both the component and the current data
    return {
        OrganizationDetailsComponent: () => (
            <GetOrganizationDetails
                defaultAddress={defaultAddress}
                onDetailsChange={handleDetailsChange}
                autoFetch={autoFetch}
            />
        ),
        data: detailsData,
        // Method to programmatically refresh the data
        refreshDetails: (address?: string) => {
            if (typeof window !== 'undefined' && (window as any).__organizationDetailsRefresh) {
                (window as any).__organizationDetailsRefresh(address);
            }
        }
    };
};

export default GetOrganizationDetails;