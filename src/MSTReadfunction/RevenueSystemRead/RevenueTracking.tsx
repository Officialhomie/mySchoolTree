import { useState, useEffect } from 'react';
import { useReadContract, useAccount } from 'wagmi';
import { motion } from 'framer-motion';
import { formatDistanceToNow, format } from 'date-fns';
import { formatEther } from 'viem';

/**
 * RevenueTrackingViewer Component
 * 
 * This component displays comprehensive revenue tracking information for a school,
 * including total revenue, platform share, school share, and last withdrawal time.
 */
interface RevenueTrackingViewerProps {
  trackingContract: any; // Contract for reading revenue tracking
  defaultSchool?: `0x${string}`; // Optional default school address
  hideForm?: boolean; // Optional flag to hide the form and only display revenue tracking
}

interface RevenueTracking {
  totalRevenue: bigint;
  platformShare: bigint;
  schoolShare: bigint;
  lastWithdrawalTime: bigint;
}

const RevenueTrackingViewer = ({
  trackingContract,
  defaultSchool,
  hideForm = false
}: RevenueTrackingViewerProps) => {
  // Current user's address (used if no default school is provided)
  const { address: connectedAddress } = useAccount();
  
  // State for tracking the query parameters
  const [schoolAddress, setSchoolAddress] = useState<`0x${string}` | string>(
    defaultSchool || (connectedAddress as `0x${string}`) || ''
  );
  const [customSchool, setCustomSchool] = useState<string>('');
  const [useConnectedAddress, setUseConnectedAddress] = useState<boolean>(
    !defaultSchool && !!connectedAddress
  );
  const [validationError, setValidationError] = useState<string>('');
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  
  // Update schoolAddress when default props or connected account changes
  useEffect(() => {
    if (defaultSchool) {
      setSchoolAddress(defaultSchool);
      setUseConnectedAddress(false);
    } else if (useConnectedAddress && connectedAddress) {
      setSchoolAddress(connectedAddress as `0x${string}`);
    }
  }, [defaultSchool, connectedAddress, useConnectedAddress]);
  
  // Fetch revenue tracking data
  const {
    data: revenueTrackingData,
    isLoading: isLoadingTracking,
    isError: isTrackingError,
    refetch: refetchTracking
  } = useReadContract({
    ...trackingContract,
    functionName: 'revenueTracking',
    args: [schoolAddress as `0x${string}`],
    query: {
      enabled: !!schoolAddress && /^0x[a-fA-F0-9]{40}$/.test(schoolAddress as string)
    }
  });
  
  // Parse revenue tracking data
  const revenueTracking = revenueTrackingData as RevenueTracking | undefined;
  
  // Handle custom school address input
  const handleSchoolAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomSchool(e.target.value);
    setValidationError('');
  };
  
  // Validate Ethereum address
  const validateAddress = (address: string): boolean => {
    if (!address) {
      setValidationError('School address is required');
      return false;
    }
    
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      setValidationError('Invalid Ethereum address format');
      return false;
    }
    
    setValidationError('');
    return true;
  };
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (useConnectedAddress && connectedAddress) {
      setSchoolAddress(connectedAddress as `0x${string}`);
    } else {
      if (!validateAddress(customSchool)) {
        return;
      }
      
      setSchoolAddress(customSchool as `0x${string}`);
    }
    
    setLastChecked(new Date());
    refetchTracking();
  };
  
  // Toggle between connected address and custom address
  const toggleAddressSource = () => {
    if (defaultSchool) return; // Don't toggle if defaultSchool is provided
    
    setUseConnectedAddress(!useConnectedAddress);
    if (!useConnectedAddress && connectedAddress) {
      setSchoolAddress(connectedAddress as `0x${string}`);
    } else {
      setSchoolAddress('');
      setCustomSchool('');
    }
  };
  
  // Format ETH values for display
  const formatValue = (value: bigint | undefined): string => {
    if (value === undefined) return '0 ETH';
    return `${formatEther(value)} ETH`;
  };
  
  // Format timestamp for display
  const formatTimestamp = (timestamp: bigint | undefined): string => {
    if (!timestamp || timestamp === BigInt(0)) return 'No withdrawals yet';
    
    const date = new Date(Number(timestamp) * 1000); // Convert from seconds to milliseconds
    
    // Check if date is valid
    if (isNaN(date.getTime())) return 'Invalid date';
    
    // Format date in a readable way
    return `${format(date, 'PPP')} at ${format(date, 'pp')}`;
  };
  
  // Calculate time since last withdrawal
  const getTimeSinceLastWithdrawal = (timestamp: bigint | undefined): string => {
    if (!timestamp || timestamp === BigInt(0)) return 'No withdrawals yet';
    
    const date = new Date(Number(timestamp) * 1000);
    
    // Check if date is valid
    if (isNaN(date.getTime())) return 'Invalid date';
    
    return formatDistanceToNow(date, { addSuffix: true });
  };
  
  // Helper to format time since last check
  const getTimeSinceLastCheck = () => {
    if (!lastChecked) return 'Never checked';
    return formatDistanceToNow(lastChecked, { addSuffix: true });
  };
  
  // Calculate percentage of total revenue
  const calculatePercentage = (part: bigint | undefined, total: bigint | undefined): number => {
    if (!part || !total || total === BigInt(0)) return 0;
    return Number((part * BigInt(100)) / total);
  };
  
  // Handle refresh button click
  const handleRefresh = () => {
    refetchTracking();
    setLastChecked(new Date());
  };
  
  // Determine if data is ready to display
  const hasData = !isLoadingTracking && !isTrackingError && revenueTracking;
  
  // Execute initial fetch if default school is provided or connected address is used
  useEffect(() => {
    if ((defaultSchool || (useConnectedAddress && connectedAddress)) && !lastChecked) {
      refetchTracking();
      setLastChecked(new Date());
    }
  }, [defaultSchool, connectedAddress, useConnectedAddress, lastChecked, refetchTracking]);
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-gray-800/50 border border-gray-700 rounded-lg p-4"
    >
      <h3 className="text-lg font-medium text-orange-400 mb-3">
        Revenue Tracking Overview
      </h3>
      
      {/* Query Form */}
      {!hideForm && (
        <form onSubmit={handleSubmit} className="bg-gray-700/30 rounded-lg p-4 mb-4">
          <div className="space-y-4">
            {/* School Address Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-300">
                  School Address
                </label>
                
                {!defaultSchool && connectedAddress && (
                  <button
                    type="button"
                    onClick={toggleAddressSource}
                    className="text-xs px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    {useConnectedAddress ? 'Use Custom Address' : 'Use Connected Address'}
                  </button>
                )}
              </div>
              
              {useConnectedAddress && connectedAddress ? (
                <div className="bg-gray-700/50 rounded-md p-3">
                  <p className="text-xs text-gray-400 mb-1">Connected Address:</p>
                  <div className="font-mono text-sm text-white break-all">
                    {connectedAddress}
                  </div>
                </div>
              ) : (
                <input
                  type="text"
                  value={customSchool}
                  onChange={handleSchoolAddressChange}
                  placeholder="Enter school address (0x...)"
                  disabled={!!defaultSchool}
                  className={`w-full px-3 py-2 bg-gray-700 border ${
                    validationError ? 'border-red-500' : 'border-gray-600'
                  } rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                    defaultSchool ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                />
              )}
              
              {/* Validation Errors */}
              {validationError && (
                <div className="text-xs text-red-400 mt-1">{validationError}</div>
              )}
            </div>
            
            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoadingTracking}
                className={`w-full px-4 py-2 rounded-md text-white font-medium ${
                  isLoadingTracking
                    ? 'bg-gray-600 cursor-not-allowed'
                    : 'bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500'
                }`}
              >
                {isLoadingTracking ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Loading Revenue Data...
                  </span>
                ) : (
                  'View Revenue Tracking'
                )}
              </button>
            </div>
          </div>
        </form>
      )}
      
      {/* Loading State */}
      {isLoadingTracking && (
        <div className="flex items-center justify-center py-8 bg-gray-700/20 rounded-lg mb-4">
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 border-3 border-t-orange-400 border-orange-200/30 rounded-full animate-spin mb-3"></div>
            <span className="text-sm text-gray-300">Fetching revenue tracking data...</span>
          </div>
        </div>
      )}
      
      {/* Error State */}
      {isTrackingError && !isLoadingTracking && (
        <div className="bg-red-500/20 text-red-400 border border-red-500/30 rounded-md p-4 mb-4">
          <div className="flex items-start">
            <svg className="w-5 h-5 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-medium">Revenue Tracking Error</p>
              <p className="text-xs mt-1">Unable to fetch revenue tracking data. Please verify the school address is correct.</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Revenue Tracking Display */}
      {hasData && (
        <div className="space-y-4">
          {/* School Address Banner */}
          <div className="bg-gray-700/50 rounded-md p-3">
            <p className="text-xs text-gray-400 mb-1">Revenue Tracking for School:</p>
            <div className="font-mono text-sm text-white break-all">
              {schoolAddress}
            </div>
          </div>
          
          {/* Revenue Summary */}
          <div className="bg-gray-700/30 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-300 mb-3 flex items-center">
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Revenue Summary
            </h4>
            
            <div className="mb-4">
              <div className="text-sm text-center text-gray-400 mb-1">Total Revenue Generated</div>
              <div className="text-3xl font-bold text-orange-400 text-center">{formatValue(revenueTracking?.totalRevenue)}</div>
            </div>
            
            {/* Distribution Chart */}
            <div className="bg-gray-700/50 rounded-lg p-3 mb-4">
              <p className="text-xs text-gray-400 mb-2">Revenue Distribution</p>
              
              <div className="h-6 bg-gray-800 rounded-md overflow-hidden flex mb-3">
                <div 
                  className="h-full bg-orange-500 flex items-center justify-center text-xs font-semibold text-white"
                  style={{ 
                    width: `${calculatePercentage(revenueTracking?.platformShare, revenueTracking?.totalRevenue)}%`,
                    transition: 'width 1s ease-in-out'
                  }}
                >
                  {calculatePercentage(revenueTracking?.platformShare, revenueTracking?.totalRevenue) >= 10 ? 
                    `${calculatePercentage(revenueTracking?.platformShare, revenueTracking?.totalRevenue)}%` : ''}
                </div>
                <div 
                  className="h-full bg-blue-500 flex items-center justify-center text-xs font-semibold text-white"
                  style={{ 
                    width: `${calculatePercentage(revenueTracking?.schoolShare, revenueTracking?.totalRevenue)}%`,
                    transition: 'width 1s ease-in-out'
                  }}
                >
                  {calculatePercentage(revenueTracking?.schoolShare, revenueTracking?.totalRevenue) >= 10 ? 
                    `${calculatePercentage(revenueTracking?.schoolShare, revenueTracking?.totalRevenue)}%` : ''}
                </div>
              </div>
              
              <div className="flex justify-between text-xs">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-orange-500 rounded-sm mr-1.5"></div>
                  <span className="text-gray-300">Platform Share</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-blue-500 rounded-sm mr-1.5"></div>
                  <span className="text-gray-300">School Share</span>
                </div>
              </div>
            </div>
            
            {/* Revenue Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-gray-700/40 rounded-md p-3">
                <div className="flex justify-between items-start mb-1">
                  <span className="text-sm text-gray-300">Platform Share</span>
                  <span className="text-md font-semibold text-orange-400">{formatValue(revenueTracking?.platformShare)}</span>
                </div>
                <p className="text-xs text-gray-400">Amount allocated to the platform</p>
              </div>
              
              <div className="bg-gray-700/40 rounded-md p-3">
                <div className="flex justify-between items-start mb-1">
                  <span className="text-sm text-gray-300">School Share</span>
                  <span className="text-md font-semibold text-blue-400">{formatValue(revenueTracking?.schoolShare)}</span>
                </div>
                <p className="text-xs text-gray-400">Amount allocated to the school</p>
              </div>
            </div>
          </div>
          
          {/* Last Withdrawal Information */}
          <div className="bg-gray-700/30 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-300 mb-3 flex items-center">
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Withdrawal History
            </h4>
            
            <div className="bg-gray-700/40 rounded-md p-3">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
                <div className="mb-2 sm:mb-0">
                  <p className="text-sm text-gray-300">Last Withdrawal Date</p>
                  <p className="text-md text-white">{formatTimestamp(revenueTracking?.lastWithdrawalTime)}</p>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                  revenueTracking?.lastWithdrawalTime && revenueTracking?.lastWithdrawalTime > BigInt(0)
                    ? 'bg-green-900/20 text-green-400'
                    : 'bg-yellow-900/20 text-yellow-400'
                }`}>
                  {revenueTracking?.lastWithdrawalTime && revenueTracking?.lastWithdrawalTime > BigInt(0)
                    ? getTimeSinceLastWithdrawal(revenueTracking?.lastWithdrawalTime)
                    : 'No withdrawals yet'}
                </div>
              </div>
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex justify-center">
            <button
              onClick={handleRefresh}
              disabled={isLoadingTracking}
              className="flex items-center text-xs px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <svg className="w-3 h-3 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh Revenue Data
            </button>
          </div>
          
          {/* Last Updated Information */}
          <div className="bg-gray-700/20 rounded-md p-2.5">
            <div className="text-xs text-gray-400 flex items-center justify-center">
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Last checked: {getTimeSinceLastCheck()}
            </div>
          </div>
        </div>
      )}
      
      {/* Educational Information */}
      <div className="mt-6 pt-4 border-t border-gray-700">
        <h4 className="text-sm font-medium text-gray-300 mb-2">About Revenue Tracking</h4>
        <p className="text-sm text-gray-400 mb-3">
          This component provides a complete overview of a school's revenue tracking information, including total revenue generated, distribution between the platform and school, and withdrawal history.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <div className="bg-gray-700/20 rounded-md p-3">
            <h5 className="text-xs font-medium text-orange-400 mb-1">Revenue Distribution</h5>
            <p className="text-xs text-gray-400">
              Revenue is split between the platform and the school according to pre-defined revenue sharing agreements. The distribution chart visualizes how the total revenue is allocated.
            </p>
          </div>
          
          <div className="bg-gray-700/20 rounded-md p-3">
            <h5 className="text-xs font-medium text-orange-400 mb-1">Withdrawal Tracking</h5>
            <p className="text-xs text-gray-400">
              The system tracks when schools withdraw their share of the revenue. This timestamp helps in financial reconciliation and tracking payment history.
            </p>
          </div>
        </div>
        
        <p className="text-xs text-gray-400">
          School administrators and financial officers can use this information to monitor revenue streams, understand revenue distribution, and track withdrawal history for accounting purposes.
        </p>
      </div>
    </motion.div>
  );
};

export default RevenueTrackingViewer;