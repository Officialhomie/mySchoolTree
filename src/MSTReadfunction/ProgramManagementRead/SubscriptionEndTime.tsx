import { useState, useEffect } from 'react';
import { useReadContract } from 'wagmi';
import { motion } from 'framer-motion';

/**
 * SubscriptionEndTimeReader Component
 * 
 * This component reads the current subscription end time from the contract
 * and provides both the raw data and formatted display. It can be used as a
 * standalone component or as part of a larger subscription management system.
 * 
 * The component handles loading states, errors, and successful data fetching.
 */
interface SubscriptionEndTimeReaderProps {
  contract: any;
  subscriptionId?: string; // Optional subscription ID if reading specific subscription
  onEndTimeRead?: (endTime: number) => void; // Callback when end time is successfully read
}

const SubscriptionEndTimeReader = ({ 
  contract, 
  subscriptionId,
  onEndTimeRead 
}: SubscriptionEndTimeReaderProps) => {
  // State for displaying formatted time
  const [formattedEndTime, setFormattedEndTime] = useState<string>('');
  
  // Get subscription end time from the contract
  const { 
    data: endTimeData,
    error,
    isLoading,
    isSuccess,
    refetch
  } = useReadContract({
    ...contract,
    functionName: 'subscriptionEndTime',
    args: subscriptionId ? [subscriptionId] : [], // Only pass args if we have a subscription ID
  });

  // Convert Unix timestamp to readable date format
  useEffect(() => {
    if (endTimeData && isSuccess) {
      const endTimeAsNumber = Number(endTimeData);
      
      // Format the date for display
      if (endTimeAsNumber > 0) {
        const endDate = new Date(endTimeAsNumber * 1000); // Convert seconds to milliseconds
        const formattedDate = endDate.toLocaleString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
        setFormattedEndTime(formattedDate);
      } else {
        setFormattedEndTime('No active subscription');
      }
      
      // Call the callback with the raw end time if provided
      if (onEndTimeRead) {
        onEndTimeRead(endTimeAsNumber);
      }
    }
  }, [endTimeData, isSuccess, onEndTimeRead]);

  // Calculate whether subscription is expired
  const isExpired = () => {
    if (endTimeData && isSuccess) {
      const endTimeAsNumber = Number(endTimeData);
      const now = Math.floor(Date.now() / 1000); // Current time in seconds
      return endTimeAsNumber > 0 && endTimeAsNumber < now;
    }
    return false;
  };
  
  // Calculate time remaining or time since expiration
  const getTimeRemaining = () => {
    if (endTimeData && isSuccess) {
      const endTimeAsNumber = Number(endTimeData);
      if (endTimeAsNumber > 0) {
        const now = Math.floor(Date.now() / 1000); // Current time in seconds
        const diffInSeconds = endTimeAsNumber - now;
        
        if (diffInSeconds > 0) {
          // Subscription is still active
          const days = Math.floor(diffInSeconds / (60 * 60 * 24));
          const hours = Math.floor((diffInSeconds % (60 * 60 * 24)) / (60 * 60));
          
          if (days > 0) {
            return `${days} day${days !== 1 ? 's' : ''} and ${hours} hour${hours !== 1 ? 's' : ''} remaining`;
          } else if (hours > 0) {
            const minutes = Math.floor((diffInSeconds % (60 * 60)) / 60);
            return `${hours} hour${hours !== 1 ? 's' : ''} and ${minutes} minute${minutes !== 1 ? 's' : ''} remaining`;
          } else {
            const minutes = Math.floor(diffInSeconds / 60);
            return `${minutes} minute${minutes !== 1 ? 's' : ''} remaining`;
          }
        } else {
          // Subscription is expired
          const absDiff = Math.abs(diffInSeconds);
          const days = Math.floor(absDiff / (60 * 60 * 24));
          
          if (days > 0) {
            return `Expired ${days} day${days !== 1 ? 's' : ''} ago`;
          } else {
            const hours = Math.floor(absDiff / (60 * 60));
            if (hours > 0) {
              return `Expired ${hours} hour${hours !== 1 ? 's' : ''} ago`;
            } else {
              const minutes = Math.floor(absDiff / 60);
              return `Expired ${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
            }
          }
        }
      }
    }
    return 'No valid end time';
  };

  // Render the component UI
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-gray-800/50 border border-gray-700 rounded-lg p-4"
    >
      <h3 className="text-lg font-medium text-blue-400 mb-2">
        Subscription End Time
      </h3>
      
      {isLoading && (
        <div className="flex items-center justify-center py-3">
          <div className="w-5 h-5 border-2 border-t-blue-400 border-blue-200/30 rounded-full animate-spin mr-2"></div>
          <span className="text-sm text-gray-300">Reading contract data...</span>
        </div>
      )}
      
      {error && (
        <div className="bg-red-500/20 text-red-400 border border-red-500/30 rounded-md p-3">
          <p className="text-sm">Error reading subscription end time: {(error as Error).message || 'Unknown error'}</p>
          <button 
            onClick={() => refetch()} 
            className="text-xs mt-2 bg-gray-700 hover:bg-gray-600 text-gray-200 py-1 px-2 rounded"
          >
            Try Again
          </button>
        </div>
      )}
      
      {isSuccess && endTimeData !== undefined && (
        <div className="space-y-3">
          <div className={`p-3 rounded-md ${
            isExpired() 
              ? 'bg-red-500/20 border border-red-500/30' 
              : 'bg-green-500/20 border border-green-500/30'
          }`}>
            <p className={`text-sm font-medium ${
              isExpired() ? 'text-red-400' : 'text-green-400'
            }`}>
              {isExpired() ? 'Subscription Expired' : 'Subscription Active'}
            </p>
            <p className="text-xs text-gray-300 mt-1">
              {getTimeRemaining()}
            </p>
          </div>
          
          <div className="bg-gray-700/50 rounded-md p-3">
            <p className="text-xs text-gray-400">End Date:</p>
            <p className="text-sm text-gray-200 mt-1">{formattedEndTime}</p>
            
            <p className="text-xs text-gray-400 mt-2">Unix Timestamp:</p>
            <p className="text-xs font-mono text-gray-300 mt-1">{String(endTimeData)}</p>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default SubscriptionEndTimeReader;