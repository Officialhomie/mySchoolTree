import { useState, useEffect } from 'react';
import { useReadContract } from 'wagmi';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';

/**
 * ContractPauseStatus Component
 * 
 * This component displays the current pause status of the contract and explains
 * what it means when the system is paused. It provides real-time updates on
 * contract state changes and clear visual indicators of system availability.
 */
type ContractPauseStatusProps = { // Type aliases can only be used in TypeScript files.ts(8008)
  contract: any; // Contract configuration for reading the paused state
  refreshInterval?: number; // Optional: refresh interval in milliseconds
  onStatusChange?: (isPaused: boolean) => void; // Optional: callback when status changes
  className?: string; // Optional: additional CSS classes
}

const ContractPauseStatus = ({
  contract,
  refreshInterval = 15000, // Default: refresh every 15 seconds
  onStatusChange,
  className = ""
}: ContractPauseStatusProps) => { // Type annotations can only be used in TypeScript files.ts(8010)
  // State to track when the last check was performed
  const [lastChecked, setLastChecked] = useState(null);
  
  // Fetch the paused status from the contract
  const {
    data: pausedStatus,
    isLoading: isLoadingStatus,
    isError: isStatusError,
    refetch: refetchStatus
  } = useReadContract({
    ...contract,
    functionName: 'paused'
  });

  // Set up automatic refresh interval
  useEffect(() => {
    if (refreshInterval > 0) {
      const timer = setInterval(() => {
        refetchStatus();
      }, refreshInterval);
      
      return () => {
        clearInterval(timer);
      };
    }
  }, [refreshInterval, refetchStatus]);

  // Update last checked timestamp when data is fetched
  useEffect(() => {
    if (!isLoadingStatus && pausedStatus !== undefined) {
      setLastChecked(new Date() as any); // Type assertion to fix type mismatch
      
      // Call the callback if provided
      if (onStatusChange) {
        onStatusChange(Boolean(pausedStatus));
      }
    }
  }, [pausedStatus, isLoadingStatus, onStatusChange]);

  // Helper to format time since last check
  const getTimeSinceLastCheck = () => {
    if (!lastChecked) return 'Never checked';
    return formatDistanceToNow(lastChecked, { addSuffix: true });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className={`bg-gray-800/50 border border-gray-700 rounded-lg p-4 ${className}`}
    >
      <h3 className="text-lg font-medium text-blue-400 mb-3">
        System Status Monitor
      </h3>
      
      {/* Loading State */}
      {isLoadingStatus && (
        <div className="flex items-center justify-center py-4 bg-gray-700/20 rounded-lg">
          <div className="w-5 h-5 border-2 border-t-blue-400 border-blue-200/30 rounded-full animate-spin mr-2"></div>
          <span className="text-sm text-gray-300">Checking system status...</span>
        </div>
      )}
      
      {/* Error State */}
      {isStatusError && (
        <div className="bg-red-500/20 text-red-400 border border-red-500/30 rounded-md p-4 mb-3">
          <div className="flex items-start">
            <svg className="w-5 h-5 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-medium">Error Checking Status</p>
              <p className="text-xs mt-1">Unable to fetch the current system status. Please try again later.</p>
              <button 
                className="mt-2 px-3 py-1 bg-gray-700 hover:bg-gray-600 text-xs rounded-md transition-colors"
                onClick={() => refetchStatus()}
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Status Display */}
      {!isLoadingStatus && !isStatusError && pausedStatus !== undefined && (
        <div className="space-y-4">
          {/* Current Status Badge */}
          <div className={`flex items-center justify-between p-4 rounded-lg border ${
            pausedStatus 
              ? 'bg-red-900/20 border-red-700/30' 
              : 'bg-green-900/20 border-green-700/30'
          }`}>
            <div className="flex items-center">
              {pausedStatus ? (
                <>
                  <div className="w-3 h-3 bg-red-500 rounded-full mr-3 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  </div>
                  <div>
                    <h4 className="text-md font-medium text-red-400">System Paused</h4>
                    <p className="text-xs text-gray-300 mt-0.5">Contract operations are temporarily suspended</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-3 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  </div>
                  <div>
                    <h4 className="text-md font-medium text-green-400">System Active</h4>
                    <p className="text-xs text-gray-300 mt-0.5">Contract operations are functioning normally</p>
                  </div>
                </>
              )}
            </div>
            
            <button
              onClick={() => refetchStatus()}
              className="flex items-center text-xs px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>
          
          {/* Status Explanation */}
          <div className="bg-gray-700/30 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-300 mb-2">What This Means</h4>
            
            {pausedStatus ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-300">
                  The contract is currently <span className="text-red-400 font-medium">paused</span>. During a pause:
                </p>
                <ul className="space-y-2">
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-red-400 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm text-gray-300">
                      <span className="text-white font-medium">State-changing operations</span> are temporarily suspended
                    </span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-red-400 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm text-gray-300">
                      <span className="text-white font-medium">Transactional functions</span> will revert if called
                    </span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-yellow-400 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm text-gray-300">
                      <span className="text-white font-medium">View functions</span> remain accessible for reading state
                    </span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-blue-400 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm text-gray-300">
                      <span className="text-white font-medium">Contract balances and state</span> remain secure and intact
                    </span>
                  </li>
                </ul>
                
                <div className="bg-gray-800/50 rounded-md p-3 mt-2">
                  <p className="text-sm text-gray-300">
                    The system may be paused for maintenance, upgrades, security precautions, or in response to detected irregularities. Please check official announcements for more information on the current pause.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-gray-300">
                  The contract is currently <span className="text-green-400 font-medium">active</span> and operating normally:
                </p>
                <ul className="space-y-2">
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-green-400 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm text-gray-300">
                      <span className="text-white font-medium">All contract functions</span> are available for use
                    </span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-green-400 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm text-gray-300">
                      <span className="text-white font-medium">Transactions</span> can be submitted and processed
                    </span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-green-400 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm text-gray-300">
                      <span className="text-white font-medium">State changes</span> are being recorded on the blockchain
                    </span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-green-400 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm text-gray-300">
                      <span className="text-white font-medium">The system</span> is functioning as expected
                    </span>
                  </li>
                </ul>
                
                <div className="bg-gray-800/50 rounded-md p-3 mt-2">
                  <p className="text-sm text-gray-300">
                    You can proceed with normal operations and interactions with the contract. The contract has emergency pause functionality that may be activated if needed for security or maintenance purposes.
                  </p>
                </div>
              </div>
            )}
          </div>
          
          {/* Last Updated Info */}
          <div className="text-xs text-gray-400 flex items-center justify-end">
            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Last checked: {getTimeSinceLastCheck()}
          </div>
        </div>
      )}
      
      {/* Educational Information */}
      <div className="mt-6 pt-4 border-t border-gray-700">
        <h4 className="text-sm font-medium text-gray-300 mb-2">About Contract Pausing</h4>
        <p className="text-sm text-gray-400 mb-3">
          Smart contracts may include pause functionality as a safety mechanism. This feature allows authorized administrators to temporarily suspend contract operations in specific situations:
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <div className="bg-gray-700/20 rounded-md p-3">
            <h5 className="text-xs font-medium text-blue-400 mb-1">Security Incidents</h5>
            <p className="text-xs text-gray-400">
              If a vulnerability or exploit is detected, pausing prevents further exploitation while the issue is addressed, protecting user assets and contract integrity.
            </p>
          </div>
          
          <div className="bg-gray-700/20 rounded-md p-3">
            <h5 className="text-xs font-medium text-blue-400 mb-1">Upgrades and Maintenance</h5>
            <p className="text-xs text-gray-400">
              During contract upgrades or system maintenance, pausing ensures no operations occur that might conflict with the upgrade process or result in inconsistent state.
            </p>
          </div>
          
          <div className="bg-gray-700/20 rounded-md p-3">
            <h5 className="text-xs font-medium text-blue-400 mb-1">Abnormal Market Conditions</h5>
            <p className="text-xs text-gray-400">
              In financial applications, pausing may occur during extreme market volatility or unusual conditions to protect users from potentially unfavorable outcomes.
            </p>
          </div>
          
          <div className="bg-gray-700/20 rounded-md p-3">
            <h5 className="text-xs font-medium text-blue-400 mb-1">Regulatory Compliance</h5>
            <p className="text-xs text-gray-400">
              Sometimes contracts need to be paused to comply with regulatory requirements, legal orders, or to implement changes required by evolving regulations.
            </p>
          </div>
        </div>
        
        <p className="text-xs text-gray-400">
          The pause functionality is typically implemented using the OpenZeppelin Pausable contract pattern, which provides a standardized way to add emergency stops to smart contract operations for safety and security.
        </p>
      </div>
    </motion.div>
  );
};

export default ContractPauseStatus;