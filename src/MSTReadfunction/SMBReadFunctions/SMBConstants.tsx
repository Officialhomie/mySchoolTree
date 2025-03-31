import { useState, useEffect } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { motion } from 'framer-motion';
import { formatEther, Hex } from 'viem';


// Define interfaces for the state
interface RoleConstants {
  ADMIN_ROLE: Hex | null;
  DEFAULT_ADMIN_ROLE: Hex | null;
  FEE_MANAGER_ROLE: Hex | null;
  MASTER_ADMIN_ROLE: Hex | null;
  SCHOOL_ROLE: Hex | null;
  STUDENT_ROLE: Hex | null;
  TEACHER_ROLE: Hex | null;
}

interface TimePeriodConstants {
  BURST_WINDOW: bigint | null;
  GENERAL_COOLDOWN: bigint | null;
  GRACE_PERIOD: bigint | null;
  OPERATION_COOLDOWN: bigint | null;
  REGISTRATION_COOLDOWN: bigint | null;
}

interface LimitConstants {
  MAX_STRING_LENGTH: bigint | null;
  MAX_TERM_FEE: bigint | null;
  MIN_TERM_FEE: bigint | null;
  REGISTRATION_BURST_LIMIT: bigint | null;
}

interface Constants {
  roles: RoleConstants;
  timePeriods: TimePeriodConstants;
  limits: LimitConstants;
}

const PlatformConstants = ({ contract }: { contract: { address: `0x${string}`; abi: any } }) => {
  // Connected wallet account
  useAccount();

  // State for the constants
  const [constants, setConstants] = useState<Constants>({
    roles: {
      ADMIN_ROLE: null,
      DEFAULT_ADMIN_ROLE: null,
      FEE_MANAGER_ROLE: null,
      MASTER_ADMIN_ROLE: null,
      SCHOOL_ROLE: null,
      STUDENT_ROLE: null,
      TEACHER_ROLE: null
    },
    timePeriods: {
      BURST_WINDOW: null,
      GENERAL_COOLDOWN: null,
      GRACE_PERIOD: null,
      OPERATION_COOLDOWN: null,
      REGISTRATION_COOLDOWN: null
    },
    limits: {
      MAX_STRING_LENGTH: null,
      MAX_TERM_FEE: null,
      MIN_TERM_FEE: null,
      REGISTRATION_BURST_LIMIT: null
    }
  });

  // State for loading
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  // Define the role names
  const roleNames: (keyof RoleConstants)[] = [
    'ADMIN_ROLE',
    'DEFAULT_ADMIN_ROLE',
    'FEE_MANAGER_ROLE',
    'MASTER_ADMIN_ROLE',
    'SCHOOL_ROLE',
    'STUDENT_ROLE',
    'TEACHER_ROLE'
  ];

  const timeNames: (keyof TimePeriodConstants)[] = [
    'BURST_WINDOW',
    'GENERAL_COOLDOWN',
    'GRACE_PERIOD',
    'OPERATION_COOLDOWN',
    'REGISTRATION_COOLDOWN'
  ];

  const limitNames: (keyof LimitConstants)[] = [
    'MAX_STRING_LENGTH',
    'MAX_TERM_FEE',
    'MIN_TERM_FEE',
    'REGISTRATION_BURST_LIMIT'
  ];

  // Individual read contract hooks for roles
  const roleResults = roleNames.map(roleName => 
    useReadContract({
      ...contract,
      functionName: roleName,
    })
  );

  // Individual read contract hooks for time periods
  const timeResults = timeNames.map(timeName => 
    useReadContract({
      ...contract,
      functionName: timeName,
    })
  );

  // Individual read contract hooks for limits
  const limitResults = limitNames.map(limitName => 
    useReadContract({
      ...contract,
      functionName: limitName,
    })
  );

  // Effect to set constants when data is available
  useEffect(() => {
    const updateConstants = () => {
      try {
        // Update roles
        const updatedRoles = { ...constants.roles };
        let hasError = false;
        
        roleNames.forEach((roleName, index) => {
          if (roleResults[index].error) {
            hasError = true;
            console.error(`Error fetching ${roleName}:`, roleResults[index].error);
          } else {
            updatedRoles[roleName] = roleResults[index].data as unknown as Hex;
          }
        });

        // Update time periods
        const updatedTimePeriods = { ...constants.timePeriods };
        timeNames.forEach((timeName, index) => {
          if (timeResults[index].error) {
            hasError = true;
            console.error(`Error fetching ${timeName}:`, timeResults[index].error);
          } else {
            updatedTimePeriods[timeName] = timeResults[index].data as unknown as bigint;
          }
        });

        // Update limits
        const updatedLimits = { ...constants.limits };
        limitNames.forEach((limitName, index) => {
          if (limitResults[index].error) {
            hasError = true;
            console.error(`Error fetching ${limitName}:`, limitResults[index].error);
          } else {
            updatedLimits[limitName] = limitResults[index].data as unknown as bigint;
          }
        });

        if (hasError) {
          setError("Error fetching one or more constants. Check console for details.");
        } else {
          setError(null);
        }

        // Set all constants
        setConstants({
          roles: updatedRoles,
          timePeriods: updatedTimePeriods,
          limits: updatedLimits
        });

        setLoading(false);
      } catch (err) {
        console.error('Error updating constants:', err);
        setError(`Error updating constants: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setLoading(false);
      }
    };

    updateConstants();
  }, [
    ...roleResults.map(r => r.data), 
    ...timeResults.map(t => t.data), 
    ...limitResults.map(l => l.data),
    refreshTrigger
  ]);

  // Trigger a refresh of the data
  const handleRefresh = () => {
    setLoading(true);
    setRefreshTrigger(prev => prev + 1);
    
    // Manually refetch all data
    [...roleResults, ...timeResults, ...limitResults].forEach(result => {
      if (result.refetch) {
        result.refetch();
      }
    });
  };

  // Format time in seconds to a human-readable format
  const formatTime = (seconds: bigint | null): string => {
    if (!seconds) return 'N/A';
    
    const secondsNum = Number(seconds);
    
    if (secondsNum < 60) return `${secondsNum} seconds`;
    if (secondsNum < 3600) return `${Math.floor(secondsNum / 60)} minutes`;
    if (secondsNum < 86400) return `${Math.floor(secondsNum / 3600)} hours`;
    return `${Math.floor(secondsNum / 86400)} days`;
  };

  // Format number values
  const formatNumber = (value: bigint | null): string => {
    if (!value) return 'N/A';
    return value.toString();
  };

  // Format ETH values
  const formatEth = (value: bigint | null): string => {
    if (!value) return 'N/A';
    try {
      return `${formatEther(value)} ETH`;
    } catch (err) {
      return value.toString();
    }
  };

  // Shorten hex strings (for roles)
  const shortenHex = (hex: string): string => {
    if (!hex) return 'N/A';
    return `${hex.substring(0, 10)}...${hex.substring(hex.length - 8)}`;
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 100 }
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-gray-900/90 backdrop-blur-sm border border-gray-700 shadow-xl rounded-lg p-6 max-w-full mx-auto w-full md:max-w-full mb-9"
    >
      <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
        Platform Constants
      </h2>
      
      <p className="text-gray-300 text-sm mb-6">
        View all platform constants and parameters defined in the smart contract
      </p>

      {loading ? (
        <div className="flex items-center justify-center p-12">
          <div className="w-10 h-10 border-4 border-t-blue-400 border-r-purple-500 border-b-blue-400 border-l-purple-500 rounded-full animate-spin"></div>
          <span className="ml-3 text-gray-300">Loading platform constants...</span>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-900/20 border border-red-700/30 rounded-lg text-red-400">
          <p>{error}</p>
        </div>
      ) : (
        <motion.div 
          className="space-y-8"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Roles Section */}
          <motion.div variants={itemVariants} className="bg-gray-800/50 rounded-lg p-5 border border-gray-700">
            <h3 className="text-lg font-semibold text-blue-400 mb-4">Role Identifiers</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(constants.roles).map(([role, value]) => (
                <div key={role} className="bg-gray-800 p-3 rounded-md">
                  <div className="flex justify-between items-start">
                    <div className="text-gray-300 font-medium">{role}</div>
                    <div className="bg-gray-900/50 text-xs px-2 py-1 rounded text-purple-400 font-mono">Role</div>
                  </div>
                  <div className="mt-2 text-xs font-mono text-gray-400 break-all cursor-pointer hover:text-gray-300" 
                       onClick={() => {
                         if (value) {
                           navigator.clipboard.writeText(value);
                         }
                       }}
                       title="Click to copy full value">
                    {value ? shortenHex(value) : 'N/A'}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Time Periods Section */}
          <motion.div variants={itemVariants} className="bg-gray-800/50 rounded-lg p-5 border border-gray-700">
            <h3 className="text-lg font-semibold text-green-400 mb-4">Time Periods</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(constants.timePeriods).map(([period, value]) => (
                <div key={period} className="bg-gray-800 p-3 rounded-md">
                  <div className="flex justify-between items-start">
                    <div className="text-gray-300 font-medium">{period}</div>
                    <div className="bg-gray-900/50 text-xs px-2 py-1 rounded text-green-400">Time</div>
                  </div>
                  <div className="mt-2 flex items-baseline justify-between">
                    <div className="text-lg font-mono text-green-400">{formatTime(value)}</div>
                    <div className="text-xs text-gray-500 font-mono">{formatNumber(value)} seconds</div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Limits Section */}
          <motion.div variants={itemVariants} className="bg-gray-800/50 rounded-lg p-5 border border-gray-700">
            <h3 className="text-lg font-semibold text-amber-400 mb-4">Limits & Thresholds</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(constants.limits).map(([limit, value]) => (
                <div key={limit} className="bg-gray-800 p-3 rounded-md">
                  <div className="flex justify-between items-start">
                    <div className="text-gray-300 font-medium">{limit}</div>
                    <div className="bg-gray-900/50 text-xs px-2 py-1 rounded text-amber-400">Limit</div>
                  </div>
                  <div className="mt-2">
                    {limit.includes('FEE') ? (
                      <div className="text-lg font-mono text-amber-400">{formatEth(value)}</div>
                    ) : (
                      <div className="text-lg font-mono text-amber-400">{formatNumber(value)}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Actions */}
          <motion.div variants={itemVariants} className="flex justify-end">
            <button
              onClick={handleRefresh}
              className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-200 font-medium text-sm flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
              </svg>
              Refresh Constants
            </button>
          </motion.div>

          {/* Educational Info */}
          <motion.div variants={itemVariants} className="bg-blue-900/20 border border-blue-700/30 rounded-md p-4 text-sm text-gray-300">
            <p className="mb-2">
              <span className="font-medium text-blue-400">About Platform Constants:</span> These values define the fundamental parameters and rules of the platform.
            </p>
            <ul className="list-disc pl-5 space-y-1 text-gray-400">
              <li><span className="text-blue-400">Roles</span> - Unique identifiers for different access levels in the system</li>
              <li><span className="text-green-400">Time Periods</span> - Durations for various cooldowns, windows, and grace periods</li>
              <li><span className="text-amber-400">Limits & Thresholds</span> - Maximum/minimum values for fees, string lengths, and operation counts</li>
            </ul>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default PlatformConstants;