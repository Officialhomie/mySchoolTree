import { useState, useEffect } from 'react';
import { useReadContract } from 'wagmi';
import { motion } from 'framer-motion';

/**
 * RemainingRegistrationsViewer Component
 * 
 * This component displays information about the remaining registrations
 * and when the registration window resets. It fetches data using the
 * getRemainingRegistrations contract function.
 */
interface RemainingRegistrationsViewerProps {
  contract: any;
  refreshInterval?: number; // Optional interval to refresh data in milliseconds
  onDataFetched?: (remaining: bigint, windowReset: bigint) => void; // Optional callback when data is fetched
}

const RemainingRegistrationsViewer = ({ 
  contract,
  refreshInterval = 0, // Default: no auto-refresh
  onDataFetched
}: RemainingRegistrationsViewerProps) => {
  // State for timestamp display
  const [formattedResetTime, setFormattedResetTime] = useState<string>('');
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  
  // Fetch registration data from contract
  const { 
    data: registrationData,
    error,
    isLoading,
    isSuccess,
    refetch
  } = useReadContract({
    ...contract,
    functionName: 'getRemainingRegistrations',
    args: [],
  });
  
  // Extract values from registration data
  const remaining = registrationData ? (registrationData as any)[0] : undefined;
  const windowReset = registrationData ? (registrationData as any)[1] : undefined;
  
  // Callback when data is fetched successfully
  useEffect(() => {
    if (isSuccess && remaining !== undefined && windowReset !== undefined && onDataFetched) {
      onDataFetched(remaining, windowReset);
    }
  }, [isSuccess, remaining, windowReset, onDataFetched]);
  
  // Format the reset time and calculate time remaining
  useEffect(() => {
    if (windowReset !== undefined) {
      const updateTimes = () => {
        const resetTimestamp = Number(windowReset) * 1000; // Convert to milliseconds
        const now = Date.now();
        
        // Format the reset time
        const resetDate = new Date(resetTimestamp);
        setFormattedResetTime(resetDate.toLocaleString());
        
        // Calculate time remaining
        if (resetTimestamp > now) {
          const diff = resetTimestamp - now;
          const days = Math.floor(diff / (1000 * 60 * 60 * 24));
          const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((diff % (1000 * 60)) / 1000);
          
          setTimeRemaining(
            `${days > 0 ? `${days}d ` : ''}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
          );
        } else {
          setTimeRemaining('Expired');
        }
      };
      
      // Update immediately
      updateTimes();
      
      // Set up interval to update the time remaining
      const timer = setInterval(updateTimes, 1000);
      
      // Cleanup
      return () => {
        clearInterval(timer);
      };
    }
  }, [windowReset]);
  
  // Set up auto-refresh if interval is provided
  useEffect(() => {
    if (refreshInterval > 0) {
      const timer = setInterval(() => {
        refetch();
      }, refreshInterval);
      
      return () => {
        clearInterval(timer);
      };
    }
  }, [refreshInterval, refetch]);
  
  // Determine registration status and styling
  const getRegistrationStatus = () => {
    if (remaining === undefined) return { text: 'Unknown', color: 'text-gray-400', bg: 'bg-gray-500/20' };
    
    const remainingCount = Number(remaining);
    
    if (remainingCount > 10) {
      return { text: 'Open', color: 'text-green-400', bg: 'bg-green-500/20' };
    } else if (remainingCount > 0) {
      return { text: 'Limited', color: 'text-yellow-400', bg: 'bg-yellow-500/20' };
    } else {
      return { text: 'Closed', color: 'text-red-400', bg: 'bg-red-500/20' };
    }
  };
  
  const status = getRegistrationStatus();
  
  // Render the component UI
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-gray-800/50 border border-gray-700 rounded-lg p-4"
    >
      <h3 className="text-lg font-medium text-blue-400 mb-3">
        Registration Status
      </h3>
      
      {isLoading && (
        <div className="flex items-center justify-center py-4">
          <div className="w-5 h-5 border-2 border-t-blue-400 border-blue-200/30 rounded-full animate-spin mr-2"></div>
          <span className="text-sm text-gray-300">Fetching registration data...</span>
        </div>
      )}
      
      {error && (
        <div className="bg-red-500/20 text-red-400 border border-red-500/30 rounded-md p-3">
          <p className="text-sm">Error fetching registration data: {(error as Error).message || 'Unknown error'}</p>
          <button 
            onClick={() => refetch()} 
            className="text-xs mt-2 bg-gray-700 hover:bg-gray-600 text-gray-200 py-1 px-2 rounded"
          >
            Try Again
          </button>
        </div>
      )}
      
      {isSuccess && remaining !== undefined && windowReset !== undefined && (
        <div className="space-y-4">
          {/* Status Badge */}
          <div className={`inline-flex items-center px-3 py-1 rounded-full ${status.bg} border border-${status.color.replace('text-', '')}/30`}>
            <div className={`w-2 h-2 rounded-full ${status.color.replace('text-', 'bg-')} mr-2`}></div>
            <span className={`text-sm font-medium ${status.color}`}>
              {status.text}
            </span>
          </div>
          
          {/* Main Info Card */}
          <div className="bg-gray-700/30 rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Remaining Registrations */}
              <div className="space-y-1">
                <p className="text-xs text-gray-400">Remaining Registrations:</p>
                <div className="flex items-baseline">
                  <p className="text-2xl font-bold text-white">{remaining.toString()}</p>
                  <p className="text-sm text-gray-400 ml-2">slots</p>
                </div>
                {Number(remaining) === 0 && (
                  <p className="text-xs text-red-400">No slots available until next reset</p>
                )}
                {Number(remaining) > 0 && Number(remaining) <= 5 && (
                  <p className="text-xs text-yellow-400">Limited slots remaining</p>
                )}
              </div>
              
              {/* Window Reset Time */}
              <div className="space-y-1">
                <p className="text-xs text-gray-400">Registration Window Resets:</p>
                <p className="text-sm font-medium text-white">{formattedResetTime}</p>
                <div className="flex items-center">
                  <svg className="w-4 h-4 text-gray-400 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-xs text-gray-300">
                    {timeRemaining === 'Expired' ? 'Reset pending' : `Resets in ${timeRemaining}`}
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Additional Details */}
          <div className="bg-gray-700/20 rounded-md p-3">
            <h4 className="text-sm font-medium text-gray-300 mb-2">Registration Details</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 gap-x-4 text-xs">
              <div>
                <span className="text-gray-400">Status: </span>
                <span className={status.color}>{status.text}</span>
              </div>
              
              <div>
                <span className="text-gray-400">Registration Capacity: </span>
                <span className="text-gray-200">
                  {remaining.toString()} / {/* Assuming there's a total capacity, you'd display it here */}
                </span>
              </div>
              
              <div>
                <span className="text-gray-400">Next Reset: </span>
                <span className="text-gray-200">{formattedResetTime}</span>
              </div>
              
              <div>
                <span className="text-gray-400">Window Reset Timestamp: </span>
                <span className="text-gray-200 font-mono">{windowReset.toString()}</span>
              </div>
            </div>
            
            <div className="mt-3 pt-2 border-t border-gray-700">
              <button 
                onClick={() => refetch()} 
                className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 py-1 px-3 rounded flex items-center"
              >
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh Data
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default RemainingRegistrationsViewer;