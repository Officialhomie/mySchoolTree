import { useState } from 'react';
import { useWriteContract } from 'wagmi';
import { motion } from 'framer-motion';

// Import the two reader components
import SubscriptionEndTimeReader from '../../MSTReadfunction/ProgramManagementRead/SubscriptionEndTime';
import CurrentProgramIdReader from '../../MSTReadfunction/ProgramManagementRead/getProgramID';

/**
 * SubscriptionManager Component
 * 
 * This component combines the SubscriptionEndTimeReader and CurrentProgramIdReader components
 * and adds functionality for handling subscription expiration.
 * 
 * It provides a unified interface for managing subscriptions and programs.
 */
interface SubscriptionManagerProps {
  contract: any;
  subscriptionId?: string; // Optional subscription ID if reading specific subscription
}

const SubscriptionManager = ({ 
  contract, 
  subscriptionId 
}: SubscriptionManagerProps) => {
  // State for storing data from child components
  const [programId, setProgramId] = useState<number>(0);
  const [isExpired, setIsExpired] = useState<boolean>(false);
  
  // Handle subscription expiration function call
  const { 
    writeContractAsync, 
    status, 
    error: writeError,
    isPending 
  } = useWriteContract();

  // Function to handle subscription expiration
  const handleExpiration = async () => {
    try {
      await writeContractAsync({
        ...contract,
        functionName: 'handleSubscriptionExpiration',
        args: []
      });
    } catch (error) {
      console.error('Error handling subscription expiration:', error);
    }
  };

  // Calculate if user can handle expiration
  const canHandleExpiration = () => {
    // Determine if the subscription is expired and there's a valid program
    return isExpired && programId > 0;
  };

  // Callback for when end time is read
  const onEndTimeRead = (time: number) => {
    // Check if subscription is expired
    const now = Math.floor(Date.now() / 1000); // Current time in seconds
    setIsExpired(time > 0 && time < now);
  };

  // Callback for when program ID is read
  const onProgramIdRead = (id: number) => {
    setProgramId(id);
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="space-y-6 max-w-md mx-auto"
    >
      <div className="bg-gray-800/70 border border-gray-700 rounded-xl p-5 shadow-lg">
        <h2 className="text-xl font-bold text-white mb-4 border-b border-gray-700 pb-3">
          Subscription Management
        </h2>
        
        <div className="space-y-6">
          {/* Subscription End Time Reader */}
          <SubscriptionEndTimeReader 
            contract={contract} 
            subscriptionId={subscriptionId}
            onEndTimeRead={onEndTimeRead}
          />
          
          {/* Current Program ID Reader */}
          <CurrentProgramIdReader
            onProgramIdRead={onProgramIdRead}
          />
          
          {/* Subscription Expiration Handler */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-gray-800/50 border border-gray-700 rounded-lg p-4"
          >
            <h3 className="text-lg font-medium text-blue-400 mb-2">
              Subscription Actions
            </h3>
            
            <div className="p-3 rounded-md bg-gray-700/50">
              <p className="text-sm text-gray-300 mb-3">
                {canHandleExpiration() 
                  ? "Your subscription has expired. You can handle the expiration now."
                  : isExpired 
                    ? "Your subscription has expired, but no valid program is available."
                    : "Your subscription is currently active."}
              </p>
              
              <button
                onClick={handleExpiration}
                disabled={!canHandleExpiration() || isPending}
                className={`w-full py-2 px-4 rounded-md transition-colors ${
                  canHandleExpiration() && !isPending
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                }`}
              >
                {isPending ? (
                  <div className="flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-t-blue-400 border-blue-200/30 rounded-full animate-spin mr-2"></div>
                    <span>Processing...</span>
                  </div>
                ) : (
                  "Handle Subscription Expiration"
                )}
              </button>
              
              {status === 'success' && (
                <div className="mt-3 p-2 rounded bg-green-500/20 border border-green-500/30">
                  <p className="text-xs text-green-400">
                    Subscription expiration handled successfully!
                  </p>
                </div>
              )}
              
              {writeError && (
                <div className="mt-3 p-2 rounded bg-red-500/20 border border-red-500/30">
                  <p className="text-xs text-red-400">
                    Error: {(writeError as Error).message || "Failed to handle expiration"}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

export default SubscriptionManager;