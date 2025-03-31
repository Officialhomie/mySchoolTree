import { useState, useEffect } from 'react';
import { useReadContract } from 'wagmi';
import { motion } from 'framer-motion';

// Interface for contract constants
interface ContractConstants {
  ADMIN_ROLE: string;
  BURST_WINDOW: bigint;
  DEFAULT_ADMIN_ROLE: string;
  FEE_MANAGER_ROLE: string;
  GENERAL_COOLDOWN: bigint;
  GRACE_PERIOD: bigint;
  MASTER_ADMIN_ROLE: string;
  MAX_STRING_LENGTH: bigint;
  MAX_TERM_FEE: bigint;
  MIN_TERM_FEE: bigint;
  OPERATION_COOLDOWN: bigint;
  REGISTRATION_BURST_LIMIT: bigint;
  REGISTRATION_COOLDOWN: bigint;
  SCHOOL_ROLE: string;
  STUDENT_ROLE: string;
  TEACHER_ROLE: string;
}

// Helper function to format cooldown/time values to readable format
const formatTimeValue = (seconds: bigint | undefined): string => {
  if (!seconds) return '0';
  
  if (seconds >= BigInt(86400)) {
    // Convert to days if greater than or equal to a day
    const days = Number(seconds) / 86400;
    return `${days.toFixed(1)} days`;
  } else if (seconds >= BigInt(3600)) {
    // Convert to hours if greater than or equal to an hour
    const hours = Number(seconds) / 3600;
    return `${hours.toFixed(1)} hours`;
  } else {
    // Keep as seconds
    return `${seconds.toString()} seconds`;
  }
};

// Helper function to format role hash for display
const formatRoleHash = (roleHash: string | undefined): string => {
  if (!roleHash) return 'Unknown';
  // Truncate the hash for display
  return `${roleHash.substring(0, 6)}...${roleHash.substring(roleHash.length - 4)}`;
};

const ContractConstantsViewer = ({ contract }: { contract: any }) => {
  const [constants, setConstants] = useState<Partial<ContractConstants>>({});
  const [showConstants, setShowConstants] = useState(false);
  const [fetchStatus, setFetchStatus] = useState('');
  const [showStatus, setShowStatus] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  // Set up the constant function names
  const constantFunctions: (keyof ContractConstants)[] = [
    'ADMIN_ROLE',
    'BURST_WINDOW',
    'DEFAULT_ADMIN_ROLE',
    'FEE_MANAGER_ROLE',
    'GENERAL_COOLDOWN',
    'GRACE_PERIOD',
    'MASTER_ADMIN_ROLE',
    'MAX_STRING_LENGTH',
    'MAX_TERM_FEE',
    'MIN_TERM_FEE',
    'OPERATION_COOLDOWN',
    'REGISTRATION_BURST_LIMIT',
    'REGISTRATION_COOLDOWN',
    'SCHOOL_ROLE',
    'STUDENT_ROLE',
    'TEACHER_ROLE'
  ];

  // Create individual read contract hooks for each constant
  const readContractResults = constantFunctions.map(funcName => {
    return useReadContract({
      ...contract,
      functionName: funcName,
      enabled: false, // Don't fetch on component mount
    });
  });

  // Check if any hook is in loading state
  const isLoading = readContractResults.some(result => result.isLoading);
  
  // Check if any hook has an error
  const isError = readContractResults.some(result => result.isError);

  // Function to fetch all constants using the read contract hooks
  const handleFetchConstants = async () => {
    setIsFetching(true);
    
    try {
      const results = await Promise.all(
        readContractResults.map((result) => {
          return result.refetch();
        })
      );
      
      const newConstants: Partial<ContractConstants> = {};
      
      results.forEach((result, index) => {
        const funcName = constantFunctions[index];
        
        if (result.data !== undefined) {
          newConstants[funcName] = result.data as any;
        }
      });
      
      setConstants(newConstants);
      setFetchStatus('Contract constants fetched successfully');
      setShowConstants(true);
    } catch (error) {
      console.error('Error fetching contract constants:', error);
      setFetchStatus('Error fetching contract constants');
    } finally {
      setIsFetching(false);
      setShowStatus(true);
    }
  };

  useEffect(() => {
    if (showStatus) {
      const timer = setTimeout(() => {
        setShowStatus(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showStatus]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-gray-900/90 backdrop-blur-sm border border-gray-700 shadow-xl rounded-lg p-6 max-w-full mx-auto w-full md:max-w-full mb-9"
    >
      <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
        Contract Constants
      </h2>

      <p className="text-gray-300 text-sm mb-4">
        View the constants and configuration parameters defined in the smart contract.
      </p>

      <motion.button
        onClick={handleFetchConstants}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        disabled={isLoading || isFetching}
        className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-2 px-4 rounded-md hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50 transition-colors duration-300 shadow-lg disabled:opacity-50"
      >
        {isLoading || isFetching ? 'Loading...' : 'Fetch Contract Constants'}
      </motion.button>
      
      {showStatus && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="mt-4"
        >
          <p className={`p-2 rounded-md ${fetchStatus.includes('Error') ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
            {fetchStatus}
          </p>
        </motion.div>
      )}
      
      {(isLoading || isFetching) && (
        <div className="flex justify-center items-center h-40">
          <div className="w-10 h-10 border-4 border-t-blue-400 border-r-purple-500 border-b-blue-400 border-l-purple-500 rounded-full animate-spin"></div>
          <span className="ml-3 text-gray-300">Loading contract constants...</span>
        </div>
      )}
      
      {isError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-4 mt-4">
          <div className="text-red-400 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mx-auto mb-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <p className="text-lg">Error fetching contract constants</p>
          </div>
        </div>
      )}
      
      {showConstants && Object.keys(constants).length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          transition={{ duration: 0.3 }}
          className="mt-6"
        >
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-5 shadow-lg">
            <h3 className="text-xl font-semibold mb-4 text-blue-400">Contract Constants</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Role Constants */}
              <div className="bg-gray-800/80 rounded-lg p-4 border border-gray-700">
                <p className="text-sm text-gray-400 mb-1">ADMIN_ROLE</p>
                <div className="flex items-baseline space-x-1">
                  <span className="text-md font-bold text-gray-200">{formatRoleHash(constants.ADMIN_ROLE)}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Role hash for administrators</p>
              </div>
              
              <div className="bg-gray-800/80 rounded-lg p-4 border border-gray-700">
                <p className="text-sm text-gray-400 mb-1">DEFAULT_ADMIN_ROLE</p>
                <div className="flex items-baseline space-x-1">
                  <span className="text-md font-bold text-gray-200">{formatRoleHash(constants.DEFAULT_ADMIN_ROLE)}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Default admin role hash</p>
              </div>
              
              <div className="bg-gray-800/80 rounded-lg p-4 border border-gray-700">
                <p className="text-sm text-gray-400 mb-1">FEE_MANAGER_ROLE</p>
                <div className="flex items-baseline space-x-1">
                  <span className="text-md font-bold text-gray-200">{formatRoleHash(constants.FEE_MANAGER_ROLE)}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Role hash for fee managers</p>
              </div>
              
              <div className="bg-gray-800/80 rounded-lg p-4 border border-gray-700">
                <p className="text-sm text-gray-400 mb-1">MASTER_ADMIN_ROLE</p>
                <div className="flex items-baseline space-x-1">
                  <span className="text-md font-bold text-gray-200">{formatRoleHash(constants.MASTER_ADMIN_ROLE)}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Role hash for master admins</p>
              </div>
              
              <div className="bg-gray-800/80 rounded-lg p-4 border border-gray-700">
                <p className="text-sm text-gray-400 mb-1">SCHOOL_ROLE</p>
                <div className="flex items-baseline space-x-1">
                  <span className="text-md font-bold text-gray-200">{formatRoleHash(constants.SCHOOL_ROLE)}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Role hash for schools</p>
              </div>
              
              <div className="bg-gray-800/80 rounded-lg p-4 border border-gray-700">
                <p className="text-sm text-gray-400 mb-1">STUDENT_ROLE</p>
                <div className="flex items-baseline space-x-1">
                  <span className="text-md font-bold text-gray-200">{formatRoleHash(constants.STUDENT_ROLE)}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Role hash for students</p>
              </div>
              
              <div className="bg-gray-800/80 rounded-lg p-4 border border-gray-700">
                <p className="text-sm text-gray-400 mb-1">TEACHER_ROLE</p>
                <div className="flex items-baseline space-x-1">
                  <span className="text-md font-bold text-gray-200">{formatRoleHash(constants.TEACHER_ROLE)}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Role hash for teachers</p>
              </div>
              
              {/* Time Constants */}
              <div className="bg-gray-800/80 rounded-lg p-4 border border-gray-700">
                <p className="text-sm text-gray-400 mb-1">BURST_WINDOW</p>
                <div className="flex items-baseline space-x-1">
                  <span className="text-md font-bold text-gray-200">{formatTimeValue(constants.BURST_WINDOW)}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Time window for burst limits</p>
              </div>
              
              <div className="bg-gray-800/80 rounded-lg p-4 border border-gray-700">
                <p className="text-sm text-gray-400 mb-1">GENERAL_COOLDOWN</p>
                <div className="flex items-baseline space-x-1">
                  <span className="text-md font-bold text-gray-200">{formatTimeValue(constants.GENERAL_COOLDOWN)}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">General operation cooldown period</p>
              </div>
              
              <div className="bg-gray-800/80 rounded-lg p-4 border border-gray-700">
                <p className="text-sm text-gray-400 mb-1">GRACE_PERIOD</p>
                <div className="flex items-baseline space-x-1">
                  <span className="text-md font-bold text-gray-200">{formatTimeValue(constants.GRACE_PERIOD)}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Grace period duration</p>
              </div>
              
              <div className="bg-gray-800/80 rounded-lg p-4 border border-gray-700">
                <p className="text-sm text-gray-400 mb-1">OPERATION_COOLDOWN</p>
                <div className="flex items-baseline space-x-1">
                  <span className="text-md font-bold text-gray-200">{formatTimeValue(constants.OPERATION_COOLDOWN)}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Specific operation cooldown period</p>
              </div>
              
              <div className="bg-gray-800/80 rounded-lg p-4 border border-gray-700">
                <p className="text-sm text-gray-400 mb-1">REGISTRATION_COOLDOWN</p>
                <div className="flex items-baseline space-x-1">
                  <span className="text-md font-bold text-gray-200">{formatTimeValue(constants.REGISTRATION_COOLDOWN)}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Registration cooldown period</p>
              </div>
              
              {/* Limit Constants */}
              <div className="bg-gray-800/80 rounded-lg p-4 border border-gray-700">
                <p className="text-sm text-gray-400 mb-1">MAX_STRING_LENGTH</p>
                <div className="flex items-baseline space-x-1">
                  <span className="text-md font-bold text-gray-200">{constants.MAX_STRING_LENGTH?.toString() || '0'}</span>
                  <span className="text-gray-400">chars</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Maximum string length</p>
              </div>
              
              <div className="bg-gray-800/80 rounded-lg p-4 border border-gray-700">
                <p className="text-sm text-gray-400 mb-1">MAX_TERM_FEE</p>
                <div className="flex items-baseline space-x-1">
                  <span className="text-md font-bold text-gray-200">{constants.MAX_TERM_FEE?.toString() || '0'}</span>
                  <span className="text-gray-400">wei</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Maximum term fee</p>
              </div>
              
              <div className="bg-gray-800/80 rounded-lg p-4 border border-gray-700">
                <p className="text-sm text-gray-400 mb-1">MIN_TERM_FEE</p>
                <div className="flex items-baseline space-x-1">
                  <span className="text-md font-bold text-gray-200">{constants.MIN_TERM_FEE?.toString() || '0'}</span>
                  <span className="text-gray-400">wei</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Minimum term fee</p>
              </div>
              
              <div className="bg-gray-800/80 rounded-lg p-4 border border-gray-700">
                <p className="text-sm text-gray-400 mb-1">REGISTRATION_BURST_LIMIT</p>
                <div className="flex items-baseline space-x-1">
                  <span className="text-md font-bold text-gray-200">{constants.REGISTRATION_BURST_LIMIT?.toString() || '0'}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Maximum registrations in burst window</p>
              </div>
            </div>
            
            {/* Raw Values Section - Collapsible */}
            <div className="mt-6">
              <details className="group">
                <summary className="flex items-center justify-between cursor-pointer list-none text-gray-400 hover:text-blue-400 transition-colors duration-300">
                  <span className="text-sm font-medium">View Raw Values</span>
                  <span className="transform group-open:rotate-180 transition-transform duration-200">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </span>
                </summary>
                <div className="mt-2 grid grid-cols-1 gap-2 pl-2 border-l-2 border-gray-700">
                  {Object.entries(constants).map(([key, value]) => (
                    <div key={key} className="text-xs text-gray-400">
                      <span className="text-gray-500">{key}:</span> {value?.toString() || 'undefined'}
                    </div>
                  ))}
                </div>
              </details>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

export default ContractConstantsViewer;