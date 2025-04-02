import { useState, useCallback, useMemo } from 'react';
import { useReadContract, useAccount } from 'wagmi';
import { AnimatePresence, motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';

// Types
type CheckHistoryItem = {
  adminAddress: string;
  timestamp: Date;
  isCurrentUser: boolean;
};

interface AdminCheckerProps {
  contract: {
    address: `0x${string}`;
    abi: any[];
  };
  onAdminFound?: (address: string) => void;
}

// Component
export const MasterAdminChecker = ({ contract, onAdminFound }: AdminCheckerProps) => {
  // User's connected wallet address
  const { address: userAddress } = useAccount();
  
  // UI state
  const [showHistory, setShowHistory] = useState(false);
  const [checkHistory, setCheckHistory] = useState<CheckHistoryItem[]>([]);
  
  // Contract read hook
  const {
    data: adminAddress,
    isLoading,
    isError,
    error,
    refetch
  } = useReadContract({
    ...contract,
    functionName: 'masterAdmin',
    query: {
      refetchInterval: 30000, // Refetch every 30 seconds
    }
  });

  // Derived state
  const formattedAdminAddress = useMemo(() => {
    if (!adminAddress) return null;
    // Convert to string safely
    const addr = Array.isArray(adminAddress) ? adminAddress[0] as string : adminAddress as string;
    return {
      full: addr,
      short: `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`,
      isCurrentUser: userAddress?.toLowerCase() === addr.toLowerCase()
    };
  }, [adminAddress, userAddress]);

  // Last checked timestamp
  const [lastChecked, setLastChecked] = useState<Date | null>(
    adminAddress ? new Date() : null
  );

  // Format time since last check
  const timeSinceCheck = useMemo(() => {
    if (!lastChecked) return 'Never checked';
    return formatDistanceToNow(lastChecked, { addSuffix: true });
  }, [lastChecked]);

  // Handle manual check
  const handleCheckAdmin = useCallback(async () => {
    try {
      const result = await refetch();
      const now = new Date();
      setLastChecked(now);
      
      if (result.data) {
        // Convert to string safely
        const address = Array.isArray(result.data) ? result.data[0] as string : result.data as string;
        
        // Update history
        setCheckHistory(prev => {
          const newItem = {
            adminAddress: address,
            timestamp: now,
            isCurrentUser: userAddress?.toLowerCase() === address.toLowerCase()
          };
          
          return [newItem, ...prev].slice(0, 5);
        });
        
        // Trigger callback
        onAdminFound?.(address);
      }
    } catch (err) {
      console.error('Failed to check admin:', err);
    }
  }, [refetch, userAddress, onAdminFound]);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.3 } }
  };
  
  const resultVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } }
  };

  return (
    <motion.div 
      className="rounded-lg border border-gray-700 bg-gray-800/50 p-5 shadow-lg"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <h2 className="mb-4 text-xl font-semibold text-amber-400">Master Admin Checker</h2>
      
      {/* Action Panel */}
      <div className="mb-6 rounded-lg bg-gray-700/30 p-5">
        <button
          onClick={handleCheckAdmin}
          disabled={isLoading}
          className={`flex w-full items-center justify-center rounded-md px-4 py-3 text-white transition focus:outline-none focus:ring-2 focus:ring-amber-500 ${
            isLoading 
              ? 'cursor-not-allowed bg-gray-600' 
              : 'bg-amber-600 hover:bg-amber-700'
          }`}
        >
          {isLoading ? (
            <>
              <svg className="mr-2 h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
              </svg>
              Checking Admin...
            </>
          ) : (
            <>
              <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
              Fetch Master Admin
            </>
          )}
        </button>
        
        {/* Result Display */}
        <AnimatePresence>
          {formattedAdminAddress && !isError && (
            <motion.div
              className="mt-5 rounded-lg border border-blue-700/30 bg-blue-900/20 p-4"
              variants={resultVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start">
                  <div className="mr-3 mt-1">
                    <div className="relative h-3 w-3 rounded-full bg-blue-500">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75"></span>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-medium text-blue-400">Master Admin Address</h3>
                    <p className="mt-1 font-mono text-sm text-gray-300">
                      {formattedAdminAddress.short}
                    </p>
                    {userAddress && (
                      <p className="mt-2 text-sm">
                        {formattedAdminAddress.isCurrentUser ? (
                          <span className="flex items-center text-green-400">
                            <svg className="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                            You are the Master Admin
                          </span>
                        ) : (
                          <span className="text-gray-400">You are not the Master Admin</span>
                        )}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="text-right text-xs text-gray-400">
                  <p>Last checked</p>
                  <p>{timeSinceCheck}</p>
                </div>
              </div>
              
              <div className="mt-3 text-xs">
                <button 
                  onClick={() => navigator.clipboard.writeText(formattedAdminAddress.full)}
                  className="flex items-center rounded bg-gray-700/40 px-2 py-1 text-gray-300 hover:bg-gray-700/60"
                >
                  <svg className="mr-1 h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"/>
                  </svg>
                  Copy Address
                </button>
              </div>
            </motion.div>
          )}
          
          {isError && (
            <motion.div
              className="mt-5 rounded-lg border border-red-500/30 bg-red-500/20 p-4 text-red-400"
              variants={resultVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
            >
              <div className="flex items-start">
                <svg className="mr-2 mt-0.5 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <div>
                  <h3 className="font-medium">Error Checking Admin</h3>
                  <p className="mt-1 text-sm">
                    {error instanceof Error ? error.message : 'Failed to retrieve master admin information'}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Check History */}
      {checkHistory.length > 0 && (
        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-300">Recent Checks</h3>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center text-xs text-amber-400 hover:text-amber-300 focus:outline-none"
            >
              {showHistory ? 'Hide' : 'Show'} History
              <svg className={`ml-1 h-4 w-4 transition-transform ${showHistory ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
              </svg>
            </button>
          </div>
          
          <AnimatePresence>
            {showHistory && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="rounded-lg bg-gray-700/20 p-3">
                  <ul className="divide-y divide-gray-700">
                    {checkHistory.map((item, index) => (
                      <li key={index} className="py-2 first:pt-1 last:pb-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className={`mr-2 h-2 w-2 rounded-full ${item.isCurrentUser ? 'bg-green-500' : 'bg-blue-500'}`}></div>
                            <span className="font-mono text-xs text-blue-400">
                              {item.adminAddress.substring(0, 10)}...{item.adminAddress.substring(item.adminAddress.length - 8)}
                            </span>
                            {item.isCurrentUser && (
                              <span className="ml-2 rounded-full bg-green-900/20 px-2 py-0.5 text-xs text-green-400">You</span>
                            )}
                          </div>
                          <span className="text-xs text-gray-400">
                            {formatDistanceToNow(item.timestamp, { addSuffix: true })}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
      
      {/* Info Section */}
      <div className="border-t border-gray-700 pt-4">
        <h3 className="mb-3 text-sm font-medium text-gray-300">About Master Admin Role</h3>
        
        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="rounded-md bg-gray-700/20 p-3">
            <h4 className="mb-1 text-xs font-medium text-amber-400">Administrative Control</h4>
            <p className="text-xs text-gray-400">
              The Master Admin has the highest level of authority in the system, with complete control over all administrative functions and the ability to modify critical system parameters.
            </p>
          </div>
          
          <div className="rounded-md bg-gray-700/20 p-3">
            <h4 className="mb-1 text-xs font-medium text-amber-400">Security & Access</h4>
            <p className="text-xs text-gray-400">
              Master Admin credentials are stored securely on the blockchain. The role can only be transferred by the current Master Admin through a designated secure protocol function.
            </p>
          </div>
        </div>
        
        <div className="mb-4 rounded-md bg-gray-700/20 p-3">
          <h4 className="mb-2 text-xs font-medium text-amber-400">Master Admin Capabilities</h4>
          <div className="grid grid-cols-1 gap-2 text-xs text-gray-400 md:grid-cols-2">
            <div className="flex items-start">
              <span className="mr-2 text-blue-400">•</span>
              <span><strong>Role Management:</strong> Assign or revoke role privileges</span>
            </div>
            <div className="flex items-start">
              <span className="mr-2 text-blue-400">•</span>
              <span><strong>System Control:</strong> Configure platform parameters</span>
            </div>
            <div className="flex items-start">
              <span className="mr-2 text-blue-400">•</span>
              <span><strong>Emergency Functions:</strong> Pause or resume system operations</span>
            </div>
            <div className="flex items-start">
              <span className="mr-2 text-blue-400">•</span>
              <span><strong>Protocol Updates:</strong> Manage upgrade processes</span>
            </div>
          </div>
        </div>
        
        <p className="text-xs text-gray-400">
          This component queries the blockchain in real-time to verify the current Master Admin address. The check reflects the most recent state of the contract on the blockchain.
        </p>
      </div>
    </motion.div>
  );
};

export default MasterAdminChecker;