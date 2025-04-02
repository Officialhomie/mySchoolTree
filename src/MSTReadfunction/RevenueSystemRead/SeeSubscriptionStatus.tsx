import { useState, useEffect } from 'react';
import { useReadContract, useAccount } from 'wagmi';
import { motion } from 'framer-motion';
import { formatDistanceToNow, format, isFuture, addSeconds } from 'date-fns';

/**
 * SubscriptionStatusViewer Component
 * 
 * This component displays the subscription status and end time for a school address.
 * It shows whether the subscription is active, expired, or non-existent, and provides
 * time-to-expiration or time-since-expiration information.
 */
interface SubscriptionStatusViewerProps {
  subscriptionContract: any; // Contract for reading subscription data
  defaultSchool?: `0x${string}`; // Optional default school address
  hideForm?: boolean; // Optional flag to hide the form and only display subscription status
}

const SubscriptionStatusViewer = ({
  subscriptionContract,
  defaultSchool,
  hideForm = false
}: SubscriptionStatusViewerProps) => {
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
  
  // Fetch subscription end time
  const {
    data: endTimeData,
    isLoading: isLoadingEndTime,
    isError: isEndTimeError,
    refetch: refetchEndTime
  } = useReadContract({
    ...subscriptionContract,
    functionName: 'subscriptionEndTimes',
    args: [schoolAddress as `0x${string}`],
    query: {
      enabled: !!schoolAddress && /^0x[a-fA-F0-9]{40}$/.test(schoolAddress as string)
    }
  });
  
  // Convert end time to Date object
  const getEndTimeDate = (): Date | null => {
    if (!endTimeData || endTimeData === BigInt(0)) return null;
    return new Date(Number(endTimeData) * 1000); // Convert from seconds to milliseconds
  };
  
  const endTimeDate = getEndTimeDate();
  
  // Check if subscription exists and is active
  const subscriptionExists = endTimeData !== null && endTimeData !== undefined && typeof endTimeData === 'bigint' && endTimeData > BigInt(0);
  const isSubscriptionActive = endTimeDate ? isFuture(endTimeDate) : false;
  
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
    refetchEndTime();
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
  
  // Format subscription end time
  const formatEndTime = (): string => {
    if (!endTimeDate) return 'No subscription found';
    return format(endTimeDate, 'PPP') + ' at ' + format(endTimeDate, 'p');
  };
  
  // Get time remaining or time since expiration
  const getTimeStatus = (): string => {
    if (!endTimeDate) return 'No subscription found';
    
    if (isSubscriptionActive) {
      return `Expires ${formatDistanceToNow(endTimeDate, { addSuffix: true })}`;
    } else {
      return `Expired ${formatDistanceToNow(endTimeDate, { addSuffix: true })}`;
    }
  };
  
  // Helper to format time since last check
  const getTimeSinceLastCheck = () => {
    if (!lastChecked) return 'Never checked';
    return formatDistanceToNow(lastChecked, { addSuffix: true });
  };
  
  // Get subscription status
  const getSubscriptionStatus = (): { status: string; color: string } => {
    if (!subscriptionExists) {
      return { status: 'No Subscription', color: 'yellow' };
    }
    
    if (isSubscriptionActive) {
      // Check if expiring soon (within 7 days)
      const now = new Date();
      const sevenDaysFromNow = addSeconds(now, 7 * 24 * 60 * 60);
      
      if (endTimeDate && endTimeDate < sevenDaysFromNow) {
        return { status: 'Expiring Soon', color: 'orange' };
      }
      
      return { status: 'Active', color: 'green' };
    } else {
      return { status: 'Expired', color: 'red' };
    }
  };
  
  const subscriptionStatus = getSubscriptionStatus();
  
  // Handle refresh button click
  const handleRefresh = () => {
    refetchEndTime();
    setLastChecked(new Date());
  };
  
  // Calculate progress percentage for subscription timeline
  const calculateProgress = (): number => {
    if (!endTimeDate || !isSubscriptionActive) return 0;
    
    const now = new Date().getTime();
    const endTime = endTimeDate.getTime();
    const oneMonthInMs = 30 * 24 * 60 * 60 * 1000; // Approximation for visualization purposes
    const startTime = endTime - oneMonthInMs;
    
    // If we're within the expected timeframe
    if (now >= startTime && now <= endTime) {
      return 100 - ((endTime - now) / (endTime - startTime) * 100);
    }
    
    // If somehow we're beyond the end time (should not happen due to isSubscriptionActive check)
    if (now > endTime) return 100;
    
    // If somehow we're before the assumed start time
    return 0;
  };
  
  // Execute initial fetch if default school is provided or connected address is used
  useEffect(() => {
    if ((defaultSchool || (useConnectedAddress && connectedAddress)) && !lastChecked) {
      refetchEndTime();
      setLastChecked(new Date());
    }
  }, [defaultSchool, connectedAddress, useConnectedAddress, lastChecked, refetchEndTime]);
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-gray-800/50 border border-gray-700 rounded-lg p-4"
    >
      <h3 className="text-lg font-medium text-blue-400 mb-3">
        Subscription Status
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
                    className="text-xs px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  } rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
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
                disabled={isLoadingEndTime}
                className={`w-full px-4 py-2 rounded-md text-white font-medium ${
                  isLoadingEndTime
                    ? 'bg-gray-600 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500'
                }`}
              >
                {isLoadingEndTime ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Loading Subscription...
                  </span>
                ) : (
                  'Check Subscription Status'
                )}
              </button>
            </div>
          </div>
        </form>
      )}
      
      {/* Loading State */}
      {isLoadingEndTime && (
        <div className="flex items-center justify-center py-8 bg-gray-700/20 rounded-lg mb-4">
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 border-3 border-t-blue-400 border-blue-200/30 rounded-full animate-spin mb-3"></div>
            <span className="text-sm text-gray-300">Fetching subscription data...</span>
          </div>
        </div>
      )}
      
      {/* Error State */}
      {isEndTimeError && !isLoadingEndTime && (
        <div className="bg-red-500/20 text-red-400 border border-red-500/30 rounded-md p-4 mb-4">
          <div className="flex items-start">
            <svg className="w-5 h-5 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-medium">Subscription Check Error</p>
              <p className="text-xs mt-1">Unable to fetch subscription data. Please verify the school address is correct.</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Subscription Status Display */}
      {!isLoadingEndTime && !isEndTimeError && endTimeData !== undefined && (
        <div className="space-y-4">
          {/* School Address Banner */}
          <div className="bg-gray-700/50 rounded-md p-3">
            <p className="text-xs text-gray-400 mb-1">Subscription Status for School:</p>
            <div className="font-mono text-sm text-white break-all">
              {schoolAddress}
            </div>
          </div>
          
          {/* Status Indicator */}
          <div className={`bg-${subscriptionStatus.color}-900/20 border border-${subscriptionStatus.color}-700/30 rounded-lg p-4 flex items-center`}>
            <div className={`w-4 h-4 bg-${subscriptionStatus.color}-500 rounded-full mr-3 relative`}>
              {(subscriptionStatus.status === 'Active' || subscriptionStatus.status === 'Expiring Soon') && (
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full bg-${subscriptionStatus.color}-400 opacity-75`}></span>
              )}
            </div>
            <div>
              <h4 className={`text-lg font-medium text-${subscriptionStatus.color}-400`}>
                {subscriptionStatus.status}
              </h4>
              <p className="text-sm text-gray-300 mt-0.5">
                {getTimeStatus()}
              </p>
            </div>
          </div>
          
          {/* Subscription Details */}
          {subscriptionExists && (
            <div className="bg-gray-700/30 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-300 mb-3 flex items-center">
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Subscription Details
              </h4>
              
              <div className="bg-gray-700/40 rounded-md p-3 mb-4">
                <p className="text-sm text-gray-300 mb-1">End Date & Time</p>
                <p className="text-lg font-semibold text-white">{formatEndTime()}</p>
              </div>
              
              {isSubscriptionActive && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-400">Subscription Timeline</p>
                  <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className={`h-full bg-${
                        subscriptionStatus.status === 'Expiring Soon' 
                          ? 'orange' 
                          : 'blue'
                      }-500 rounded-full`}
                      style={{ width: `${calculateProgress()}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Now</span>
                    <span>Expiration</span>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* No Subscription Message */}
          {!subscriptionExists && (
            <div className="bg-gray-700/30 rounded-lg p-4 text-center">
              <svg className="w-12 h-12 mx-auto mb-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
              <h4 className="text-lg font-medium text-gray-300 mb-2">No Subscription Found</h4>
              <p className="text-sm text-gray-400">
                This address does not have an active subscription. Please subscribe to access platform features.
              </p>
            </div>
          )}
          
          {/* Actions */}
          <div className="flex justify-center">
            <button
              onClick={handleRefresh}
              disabled={isLoadingEndTime}
              className="flex items-center text-xs px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <svg className="w-3 h-3 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh Subscription Data
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
        <h4 className="text-sm font-medium text-gray-300 mb-2">About Subscriptions</h4>
        <p className="text-sm text-gray-400 mb-3">
          Schools must maintain an active subscription to access platform features and services. Subscriptions have a defined end time after which they need to be renewed.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <div className="bg-gray-700/20 rounded-md p-3">
            <h5 className="text-xs font-medium text-blue-400 mb-1">Subscription Status</h5>
            <p className="text-xs text-gray-400">
              An active subscription grants full access to platform features. Expired subscriptions limit functionality until renewed. The "Expiring Soon" status indicates that renewal will be required shortly.
            </p>
          </div>
          
          <div className="bg-gray-700/20 rounded-md p-3">
            <h5 className="text-xs font-medium text-blue-400 mb-1">Renewal Process</h5>
            <p className="text-xs text-gray-400">
              To renew a subscription, a payment must be made before the expiration date. Renewing early extends the end time from the current expiration date, ensuring continuous service.
            </p>
          </div>
        </div>
        
        <p className="text-xs text-gray-400">
          School administrators should monitor their subscription status regularly to avoid service interruptions. An expired subscription may affect your ability to create new programs, issue certificates, or access certain platform features.
        </p>
      </div>
    </motion.div>
  );
};

export default SubscriptionStatusViewer;