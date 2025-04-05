import { useState, useEffect, useCallback } from 'react';
import { useReadContract } from 'wagmi';
import { motion, AnimatePresence } from 'framer-motion';
import { contractAttendanceTrackingConfig } from '../../contracts';

// Predefined roles for selection - replace these with actual role constants from your contract
const PREDEFINED_ROLES = {
  "ADMIN_ROLE": "0x0000000000000000000000000000000000000000000000000000000000000000",
  "PROGRAM_MANAGER_ROLE": "0x7fab940a61ea2dbd47aca7449d99e95b1c9ea29dcad8f56e9a7a47f1e2989d11",
  "EDUCATOR_ROLE": "0x22976f7f83a7c9f912b9cf4bad5d23d14f64943c5de369cb54d95f68132led46",
  "STUDENT_ROLE": "0x4c5a99d76b63156c595e0f5e6d205b0b035c900015b44074d97e5eefdf156e64"
};

// Role check result type
export type RoleCheckResult = {
  timestamp: number;
  role: string;
  roleName: string;
  address: string;
  hasRole: boolean;
};

// Exportable role checker data
export type RoleCheckerData = {
  selectedRole: string;
  accountAddress: string;
  queryHistory: RoleCheckResult[];
  isPending: boolean;
  isError: boolean;
  error: Error | null;
  checkRole: (role: string, address: string) => Promise<boolean | undefined>;
};

// Custom utility for validating Ethereum addresses
const isValidEthAddress = (address: string) => {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

// Get the role name from its hash value
const getRoleName = (roleHash: string) => {
  const entry = Object.entries(PREDEFINED_ROLES).find(([_, value]) => value === roleHash);
  return entry ? entry[0] : 'Custom Role';
};

type RoleCheckerProps = {
  onDataChange?: (data: RoleCheckerData) => void;
};

const RoleChecker = ({ onDataChange }: RoleCheckerProps) => {
  // Form state
  const [selectedRole, setSelectedRole] = useState('');
  const [customRole, setCustomRole] = useState('');
  const [accountAddress, setAccountAddress] = useState('');
  const [useCustomRole, setUseCustomRole] = useState(false);
  
  // Query state
  const [isQueryEnabled, setIsQueryEnabled] = useState(false);
  const [queryHistory, setQueryHistory] = useState<RoleCheckResult[]>([]);
  
  // Determine which role value to use
  const roleValue = useCustomRole ? customRole : selectedRole;
  
  // Contract read hook
  const { 
    data: hasRoleResult,
    isError,
    error,
    isPending,
    refetch
  } = useReadContract({
    address: contractAttendanceTrackingConfig.address as `0x${string}`,
    abi: contractAttendanceTrackingConfig.abi,
    functionName: 'hasRole',
    args: [roleValue, accountAddress]
  });

  // Manually control when to execute the query
  useEffect(() => {
    if (isQueryEnabled && !!roleValue && !!accountAddress) {
      refetch();
    }
  }, [isQueryEnabled, roleValue, accountAddress, refetch]);

  // Reset query state when inputs change
  useEffect(() => {
    setIsQueryEnabled(false);
  }, [roleValue, accountAddress]);

  // Add result to history when query completes
  useEffect(() => {
    if (hasRoleResult !== undefined && isQueryEnabled && !isPending && !isError) {
      // Add to history
      setQueryHistory(prev => [
        {
          timestamp: Date.now(),
          role: roleValue,
          roleName: getRoleName(roleValue),
          address: accountAddress,
          hasRole: Boolean(hasRoleResult)
        },
        ...prev.slice(0, 9) // Keep only the last 10 queries
      ]);
      
      // Reset query enabled flag
      setIsQueryEnabled(false);
    }
  }, [hasRoleResult, isPending, isError, isQueryEnabled, roleValue, accountAddress]);

  // Handle the check role action
  const handleCheckRole = useCallback(async () => {
    // Validate inputs
    if (!roleValue) {
      // Handle error - role is required
      return;
    }
    
    if (!accountAddress || !isValidEthAddress(accountAddress)) {
      // Handle error - valid address is required
      return;
    }
    
    // Enable the query
    setIsQueryEnabled(true);
    const result = await refetch?.();
    return result?.data as boolean | undefined;
  }, [roleValue, accountAddress, refetch]);

  // Exportable function to check roles from parent components
  const checkRoleExternal = useCallback(async (role: string, address: string) => {
    // Set the form values
    if (Object.values(PREDEFINED_ROLES).includes(role)) {
      setUseCustomRole(false);
      setSelectedRole(role);
    } else {
      setUseCustomRole(true);
      setCustomRole(role);
    }
    setAccountAddress(address);
    
    // Wait for state update
    await new Promise(resolve => setTimeout(resolve, 0));
    
    // Trigger the check
    return handleCheckRole();
  }, [handleCheckRole]);

  // Export data when it changes
  useEffect(() => {
    if (onDataChange) {
      onDataChange({
        selectedRole: roleValue,
        accountAddress,
        queryHistory,
        isPending,
        isError,
        error: error as Error | null,
        checkRole: checkRoleExternal
      });
    }
  }, [roleValue, accountAddress, queryHistory, isPending, isError, error, checkRoleExternal, onDataChange]);

  // Format time for display
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-gray-900/90 backdrop-blur-sm border border-gray-700 shadow-xl rounded-lg p-6 max-w-full mx-auto w-full md:max-w-full mb-9"
    >
      <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
        Role Checker
      </h2>
      
      <p className="text-gray-300 text-sm mb-6">
        Check if an account has a specific role assigned to it.
      </p>

      <div className="space-y-6">
        {/* Role Input Form */}
        <div className="grid grid-cols-1 gap-4">
          <div className="flex items-center space-x-3 mb-2">
            <input 
              type="checkbox" 
              id="useCustomRoleCheck" 
              checked={useCustomRole}
              onChange={() => setUseCustomRole(!useCustomRole)}
              className="h-4 w-4 text-blue-500 focus:ring-blue-500 border-gray-700 rounded bg-gray-800"
            />
            <label htmlFor="useCustomRoleCheck" className="block text-sm font-medium text-gray-300">
              Use custom role hash
            </label>
          </div>
          
          {!useCustomRole ? (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                Select Role
              </label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="block w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-300 text-sm"
              >
                <option value="">Select a role...</option>
                {Object.entries(PREDEFINED_ROLES).map(([name, value]) => (
                  <option key={value} value={value}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                Custom Role (bytes32)
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <input
                  type="text"
                  value={customRole}
                  onChange={(e) => setCustomRole(e.target.value)}
                  className="block w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-300 text-sm font-mono"
                  placeholder="0x0000000000000000000000000000000000000000000000000000000000000000"
                />
              </div>
            </div>
          )}
          
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">
              Account Address
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <input
                type="text"
                value={accountAddress}
                onChange={(e) => setAccountAddress(e.target.value)}
                className="block w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-300 text-sm font-mono"
                placeholder="0x..."
              />
            </div>
          </div>
        </div>
        
        {/* Information Box */}
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <div className="flex items-start">
            <div className="flex-shrink-0 mt-0.5">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="ml-3 text-sm text-gray-300">
              This is a read-only operation that checks if the specified account has been granted a particular role.
              The query does not modify any blockchain state and does not require a transaction.
            </p>
          </div>
        </div>
        
        {/* Action Button */}
        <motion.button
          onClick={handleCheckRole}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          disabled={isPending || !roleValue || !accountAddress || !isValidEthAddress(accountAddress)}
          className={`w-full py-3 px-4 rounded-md text-white font-medium shadow-lg transition-all duration-300 ${
            'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700'
          } ${
            isPending || !roleValue || !accountAddress || !isValidEthAddress(accountAddress) 
              ? 'opacity-70 cursor-not-allowed' 
              : 'opacity-100'
          }`}
        >
          {isPending ? 'Checking...' : 'Check Role'}
        </motion.button>
        
        {/* Latest Query Result */}
        <AnimatePresence>
          {isQueryEnabled && isPending && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="flex justify-center items-center p-4 bg-gray-800/50 rounded-md border border-gray-700"
            >
              <div className="w-6 h-6 border-2 border-t-blue-400 border-r-purple-500 border-b-blue-400 border-l-purple-500 rounded-full animate-spin mr-3"></div>
              <p className="text-gray-300">Querying blockchain...</p>
            </motion.div>
          )}
          
          {isError && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="p-4 bg-red-500/20 rounded-md border border-red-500/30 text-red-400"
            >
              <h3 className="font-medium mb-1">Error</h3>
              <p className="text-sm">{error?.message || "Failed to check role status"}</p>
            </motion.div>
          )}
          
          {queryHistory.length > 0 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-md border overflow-hidden"
            >
              <div className="bg-gray-800 p-3 border-b border-gray-700">
                <h3 className="text-md font-semibold text-blue-400">Latest Results</h3>
              </div>
              
              <div className="max-h-[360px] overflow-y-auto">
                {queryHistory.map((query, index) => (
                  <div 
                    key={`${query.timestamp}-${index}`}
                    className={`p-4 border-b border-gray-700 last:border-b-0 ${
                      index === 0 ? 'bg-gray-800/70' : 'bg-gray-900/90'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs text-gray-400">{formatTime(query.timestamp)}</span>
                      <div 
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          query.hasRole 
                            ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                            : 'bg-red-500/20 text-red-400 border border-red-500/30'
                        }`}
                      >
                        {query.hasRole ? 'Has Role' : 'No Role'}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs text-gray-400">Role</p>
                        <div className="flex items-center mt-1">
                          <p className="text-sm text-gray-300 mr-2">{query.roleName}</p>
                          <p className="text-xs text-gray-500 font-mono truncate">{query.role}</p>
                        </div>
                      </div>
                      
                      <div>
                        <p className="text-xs text-gray-400">Address</p>
                        <p className="text-sm font-mono text-gray-300 truncate mt-1">{query.address}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

// Custom hook to use role checker data
export const useRoleChecker = () => {
  const [data, setData] = useState<RoleCheckerData>({
    selectedRole: '',
    accountAddress: '',
    queryHistory: [],
    isPending: false,
    isError: false,
    error: null,
    checkRole: async () => undefined
  });

  return {
    data,
    setData,
    checkRole: data.checkRole,
    hasRole: (address: string, role: string) => {
      return data.queryHistory.find(
        item => item.address === address && item.role === role
      )?.hasRole || false;
    },
    getLatestResult: () => data.queryHistory[0] || null
  };
};

// Export constants for use elsewhere
export { PREDEFINED_ROLES };

export default RoleChecker;