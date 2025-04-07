import { useState, useEffect } from 'react';
import { useReadContract, useAccount } from 'wagmi';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { formatEther, Address } from 'viem';

// Import the contract configuration with address and ABI
import { contractProgramManagementConfig } from '../../contracts';

// Contract configuration type
interface ContractConfig {
  address: string;
  abi: any[];
}

/**
 * ProgramRevenueDisplay Component
 * 
 * This component displays the revenue for a specific program managed by a school address.
 * It uses the programRevenue getter function from the contract.
 */
interface ProgramRevenueDisplayProps {
  revenueContract?: ContractConfig; // Contract for reading program revenue
  defaultSchool?: `0x${string}`; // Optional default school address
  defaultProgramId?: number; // Optional default program ID
  hideForm?: boolean; // Optional flag to hide the form and only display revenue
}

const ProgramRevenueDisplay = ({
  revenueContract = contractProgramManagementConfig,
  defaultSchool,
  defaultProgramId,
  hideForm = false
}: ProgramRevenueDisplayProps) => {
  // Current user's address (used if no default school is provided)
  const { address: connectedAddress } = useAccount();
  
  // State for tracking the query parameters
  const [schoolAddress, setSchoolAddress] = useState<`0x${string}` | string>(
    defaultSchool || (connectedAddress as `0x${string}`) || ''
  );
  const [programId, setProgramId] = useState<number>(defaultProgramId || 1);
  const [customSchool, setCustomSchool] = useState<string>('');
  const [customProgramId, setCustomProgramId] = useState<string>(defaultProgramId?.toString() || '1');
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
  
  // Update programId when default prop changes
  useEffect(() => {
    if (defaultProgramId) {
      setProgramId(defaultProgramId);
      setCustomProgramId(defaultProgramId.toString());
    }
  }, [defaultProgramId]);
  
  // Fetch program revenue
  const {
    data: revenueData,
    isLoading: isLoadingRevenue,
    isError: isRevenueError,
    refetch: refetchRevenue
  } = useReadContract({
    address: revenueContract.address as Address,
    abi: revenueContract.abi,
    functionName: 'programRevenue',
    args: [schoolAddress as `0x${string}`, BigInt(programId)],
    query: {
      enabled: !!schoolAddress && /^0x[a-fA-F0-9]{40}$/.test(schoolAddress as string) && programId > 0
    }
  });
  
  // Handle custom school address input
  const handleSchoolAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomSchool(e.target.value);
    setValidationError('');
  };
  
  // Handle program ID input
  const handleProgramIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomProgramId(e.target.value);
    const value = parseInt(e.target.value);
    if (!isNaN(value)) {
      setProgramId(value);
    }
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
  
  // Validate program ID
  const validateProgramId = (id: number): boolean => {
    if (isNaN(id) || id <= 0) {
      setValidationError('Program ID must be a positive number');
      return false;
    }
    
    setValidationError('');
    return true;
  };
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (useConnectedAddress && connectedAddress) {
      const parsedProgramId = parseInt(customProgramId);
      if (!validateProgramId(parsedProgramId)) {
        return;
      }
      
      setSchoolAddress(connectedAddress as `0x${string}`);
      setProgramId(parsedProgramId);
    } else {
      const parsedProgramId = parseInt(customProgramId);
      if (!validateAddress(customSchool) || !validateProgramId(parsedProgramId)) {
        return;
      }
      
      setSchoolAddress(customSchool as `0x${string}`);
      setProgramId(parsedProgramId);
    }
    
    setLastChecked(new Date());
    refetchRevenue();
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
  
  // Format revenue for display
  const formattedRevenue = (() => {
    if (revenueData === undefined) return '0';
    try {
      // Convert unknown response to bigint safely
      return formatEther(BigInt(revenueData.toString()));
    } catch (e) {
      console.error('Error formatting revenue data:', e);
      return '0';
    }
  })();
  
  // Helper to format time since last check
  const getTimeSinceLastCheck = () => {
    if (!lastChecked) return 'Never checked';
    return formatDistanceToNow(lastChecked, { addSuffix: true });
  };
  
  // Handle refresh button click
  const handleRefresh = () => {
    refetchRevenue();
    setLastChecked(new Date());
  };
  
  // Determine if data is ready to display
  const hasData = !isLoadingRevenue && !isRevenueError && lastChecked;
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-gray-800/50 border border-gray-700 rounded-lg p-4"
    >
      <h3 className="text-lg font-medium text-cyan-400 mb-3">
        Program Revenue Display
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
                    className="text-xs px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500"
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
                    validationError && validationError.includes('address') ? 'border-red-500' : 'border-gray-600'
                  } rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent ${
                    defaultSchool ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                />
              )}
            </div>
            
            {/* Program ID Input */}
            <div className="space-y-2">
              <label htmlFor="program-id" className="block text-sm font-medium text-gray-300">
                Program ID
              </label>
              <input
                id="program-id"
                type="number"
                value={customProgramId}
                onChange={handleProgramIdChange}
                placeholder="Enter program ID"
                min="1"
                disabled={!!defaultProgramId}
                className={`w-full px-3 py-2 bg-gray-700 border ${
                  validationError && validationError.includes('Program ID') ? 'border-red-500' : 'border-gray-600'
                } rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent ${
                  defaultProgramId ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              />
              <p className="text-xs text-gray-400">Enter the ID of the program to check revenue for</p>
            </div>
            
            {/* Validation Errors */}
            {validationError && (
              <div className="text-xs text-red-400 mt-1">{validationError}</div>
            )}
            
            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoadingRevenue}
                className={`w-full px-4 py-2 rounded-md text-white font-medium ${
                  isLoadingRevenue
                    ? 'bg-gray-600 cursor-not-allowed'
                    : 'bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500'
                }`}
              >
                {isLoadingRevenue ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Loading Revenue...
                  </span>
                ) : (
                  'Check Program Revenue'
                )}
              </button>
            </div>
          </div>
        </form>
      )}
      
      {/* Revenue Display */}
      {hasData || hideForm ? (
        <div className="bg-gray-700/30 rounded-lg p-4">
          <div className="flex flex-col items-center justify-center">
            {/* Loading State */}
            {isLoadingRevenue && (
              <div className="flex items-center justify-center py-6">
                <div className="w-6 h-6 border-2 border-t-cyan-400 border-cyan-200/30 rounded-full animate-spin mb-2"></div>
                <span className="text-sm text-gray-300 ml-3">Loading revenue data...</span>
              </div>
            )}
            
            {/* Error State */}
            {isRevenueError && !isLoadingRevenue && (
              <div className="bg-red-500/20 text-red-400 border border-red-500/30 rounded-md p-4 w-full">
                <div className="flex items-start">
                  <svg className="w-5 h-5 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium">Revenue Check Error</p>
                    <p className="text-xs mt-1">Unable to fetch program revenue. Please verify the school address and program ID are correct.</p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Revenue Data */}
            {!isLoadingRevenue && !isRevenueError && (
              <>
                <div className="mb-3">
                  <div className="text-sm text-center text-gray-400 mb-1">Program Revenue</div>
                  <div className="text-3xl font-bold text-cyan-400 text-center">{formattedRevenue} ETH</div>
                </div>
                
                <div className="w-full mt-2 mb-4">
                  <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-cyan-500 rounded-full" 
                      style={{ 
                        width: `${Math.min(100, parseFloat(formattedRevenue) * 5)}%`,
                        transition: 'width 1s ease-in-out'
                      }}
                    ></div>
                  </div>
                </div>
                
                <div className="w-full flex items-center justify-between bg-gray-700/50 rounded-md p-3 mb-3">
                  <div>
                    <p className="text-xs text-gray-400">School:</p>
                    <p className="font-mono text-sm text-gray-300 break-all">{schoolAddress}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Program ID:</p>
                    <p className="text-sm text-gray-300 text-right">{programId}</p>
                  </div>
                </div>
                
                <div className={`py-1 px-3 rounded-full text-xs font-medium mb-3 ${
                  parseFloat(formattedRevenue) > 0 
                    ? 'bg-green-900/20 text-green-400'
                    : 'bg-yellow-900/20 text-yellow-400'
                }`}>
                  {parseFloat(formattedRevenue) > 0 
                    ? 'Revenue Available' 
                    : 'No Revenue Recorded'}
                </div>
                
                <button
                  onClick={handleRefresh}
                  disabled={isLoadingRevenue}
                  className="flex items-center text-xs px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh Revenue Data
                </button>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-gray-700/20 rounded-lg p-8 flex items-center justify-center">
          <p className="text-gray-400 text-sm">
            Enter a school address and program ID above to view revenue data
          </p>
        </div>
      )}
      
      {/* Last Updated Information */}
      {hasData && (
        <div className="mt-4 bg-gray-700/20 rounded-md p-3">
          <div className="text-xs text-gray-400 flex items-center justify-center">
            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Last checked: {getTimeSinceLastCheck()}
          </div>
        </div>
      )}
      
      {/* Educational Information */}
      <div className="mt-6 pt-4 border-t border-gray-700">
        <h4 className="text-sm font-medium text-gray-300 mb-2">About Program Revenue</h4>
        <p className="text-sm text-gray-400 mb-3">
          This component displays the revenue generated by a specific educational program operated by a school or institution. The revenue value is retrieved directly from the blockchain.
        </p>
        
        <div className="bg-gray-700/20 rounded-md p-3 mb-3">
          <h5 className="text-xs font-medium text-cyan-400 mb-1">Revenue Data Usage</h5>
          <p className="text-xs text-gray-400">
            Program revenue information is useful for financial reporting, performance tracking, and decision-making. It allows school administrators and program directors to monitor the financial success of their educational offerings.
          </p>
        </div>
        
        <p className="text-xs text-gray-400">
          Revenue is recorded on the blockchain whenever a payment is made to the program, such as tuition fees, certificate fees, or other program-related transactions. This data is updated in real-time as new transactions are processed.
        </p>
      </div>
    </motion.div>
  );
};

export default ProgramRevenueDisplay;