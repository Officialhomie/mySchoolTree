import { useState, useEffect, useCallback } from 'react';
import { useReadContract, useAccount } from 'wagmi';
import { motion } from 'framer-motion';
import { formatDistanceToNow, format } from 'date-fns';
import { formatEther, Address } from 'viem';

// Import the contract configuration
import { contractProgramManagementConfig } from '../contracts';

// Contract configuration type
interface ContractConfig {
  address: string;
  abi: any[];
}

// Fee Structure interface
interface FeeStructure {
  programCreationFee: bigint;
  subscriptionFee: bigint;
  certificateFee: bigint;
  revenueSharePercentage: bigint;
  isCustom: boolean;
}

// Revenue Tracking interface
interface RevenueTracking {
  totalRevenue: bigint;
  platformShare: bigint;
  schoolShare: bigint;
  lastWithdrawalTime: bigint;
}

// Unified financial data export interface
export interface UnifiedFinancialData {
  // Program revenue data
  programRevenue: {
    raw: bigint | undefined;
    formatted: string;
    programId: number;
    schoolAddress: string;
  };

  // Revenue tracking data
  revenueTracking: {
    totalRevenue: {
      raw: bigint;
      formatted: string;
    };
    platformShare: {
      raw: bigint;
      formatted: string;
      percentage: number;
    };
    schoolShare: {
      raw: bigint;
      formatted: string;
      percentage: number;
    };
    lastWithdrawalTime: {
      raw: bigint;
      formatted: string;
      timeAgo: string;
    };
  } | null;

  // Fee structure data
  feeStructure: {
    programCreationFee: {
      raw: bigint;
      formatted: string;
    };
    subscriptionFee: {
      raw: bigint;
      formatted: string;
    };
    certificateFee: {
      raw: bigint;
      formatted: string;
    };
    revenueSharePercentage: {
      raw: bigint;
      formatted: string;
    };
    isCustom: boolean;
  } | null;

  // Loading states
  loading: {
    programRevenue: boolean;
    revenueTracking: boolean;
    feeStructure: boolean;
  };

  // Error states
  error: {
    programRevenue: boolean;
    revenueTracking: boolean;
    feeStructure: boolean;
  };

  // Last checked timestamps
  lastChecked: {
    programRevenue: Date | null;
    revenueTracking: Date | null;
    feeStructure: Date | null;
  };
}

/**
 * Component props interface
 */
interface UnifiedFinancialDashboardProps {
  contract?: ContractConfig;
  defaultSchool?: `0x${string}`;
  defaultProgramId?: number;
  compact?: boolean;
  onDataChange?: (data: UnifiedFinancialData) => void;
  hideRevenue?: boolean;
  hideTracking?: boolean;
  hideFees?: boolean;
}

/**
 * Unified Financial Dashboard Component
 * Combines program revenue, revenue tracking, and fee structure into a single component
 */
const UnifiedFinancialDashboard = ({
  contract = contractProgramManagementConfig,
  defaultSchool,
  defaultProgramId = 1,
  compact = false,
  onDataChange,
  hideRevenue = false,
  hideTracking = false,
  hideFees = false
}: UnifiedFinancialDashboardProps) => {
  // Current user's address
  const { address: connectedAddress } = useAccount();
  
  // Active dashboard tab
  const [activeTab, setActiveTab] = useState<'revenue' | 'tracking' | 'fees'>(
    hideRevenue ? (hideTracking ? 'fees' : 'tracking') : 'revenue'
  );
  
  // School address state
  const [schoolAddress, setSchoolAddress] = useState<`0x${string}` | string>(
    defaultSchool || (connectedAddress as `0x${string}`) || ''
  );
  const [customSchool, setCustomSchool] = useState<string>('');
  const [useConnectedAddress, setUseConnectedAddress] = useState<boolean>(
    !defaultSchool && !!connectedAddress
  );
  
  // Program ID state
  const [programId, setProgramId] = useState<number>(defaultProgramId);
  const [customProgramId, setCustomProgramId] = useState<string>(defaultProgramId?.toString() || '1');
  
  // Form validation
  const [validationError, setValidationError] = useState<string>('');
  
  // Last checked timestamps
  const [lastCheckedRevenue, setLastCheckedRevenue] = useState<Date | null>(null);
  const [lastCheckedTracking, setLastCheckedTracking] = useState<Date | null>(null);
  const [lastCheckedFees, setLastCheckedFees] = useState<Date | null>(null);
  
  // Update schoolAddress when dependencies change
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
  
  /**
   * PROGRAM REVENUE DATA
   */
  const {
    data: revenueData,
    isLoading: isLoadingRevenue,
    isError: isRevenueError,
    refetch: refetchRevenue
  } = useReadContract({
    address: contract.address as Address,
    abi: contract.abi,
    functionName: 'programRevenue',
    args: [schoolAddress as `0x${string}`, BigInt(programId)],
    query: {
      enabled: !!schoolAddress && /^0x[a-fA-F0-9]{40}$/.test(schoolAddress as string) && programId > 0
    }
  });
  
  /**
   * REVENUE TRACKING DATA
   */
  const {
    data: revenueTrackingData,
    isLoading: isLoadingTracking,
    isError: isTrackingError,
    refetch: refetchTracking
  } = useReadContract({
    address: contract.address as Address,
    abi: contract.abi,
    functionName: 'revenueTracking',
    args: [schoolAddress as `0x${string}`],
    query: {
      enabled: !!schoolAddress && /^0x[a-fA-F0-9]{40}$/.test(schoolAddress as string)
    }
  });
  
  const revenueTracking = revenueTrackingData as RevenueTracking | undefined;
  
  /**
   * FEE STRUCTURE DATA
   */
  const {
    data: feeStructureData,
    isLoading: isLoadingFeeStructure,
    isError: isFeeStructureError,
    refetch: refetchFeeStructure
  } = useReadContract({
    address: contract.address as Address,
    abi: contract.abi,
    functionName: 'defaultFeeStructure'
  });
  
  const feeStructure = feeStructureData as FeeStructure | undefined;
  
  // Format ETH values
  const formatValue = (value: bigint | undefined): string => {
    if (value === undefined) return '0 ETH';
    return `${formatEther(value)} ETH`;
  };
  
  // Format timestamp
  const formatTimestamp = (timestamp: bigint | undefined): string => {
    if (!timestamp || timestamp === BigInt(0)) return 'No withdrawals yet';
    
    const date = new Date(Number(timestamp) * 1000);
    
    if (isNaN(date.getTime())) return 'Invalid date';
    
    return `${format(date, 'PPP')} at ${format(date, 'pp')}`;
  };
  
  // Calculate time since last withdrawal
  const getTimeSinceLastWithdrawal = (timestamp: bigint | undefined): string => {
    if (!timestamp || timestamp === BigInt(0)) return 'No withdrawals yet';
    
    const date = new Date(Number(timestamp) * 1000);
    
    if (isNaN(date.getTime())) return 'Invalid date';
    
    return formatDistanceToNow(date, { addSuffix: true });
  };
  
  // Calculate percentage of total revenue
  const calculatePercentage = (part: bigint | undefined, total: bigint | undefined): number => {
    if (!part || !total || total === BigInt(0)) return 0;
    return Number((part * BigInt(100)) / total);
  };
  
  // Format display value for fee structure
  const formatDisplayValue = (value: bigint | undefined, isPercentage = false): string => {
    if (value === undefined) return '—';
    
    if (isPercentage) {
      return `${value.toString()}%`;
    }
    
    return `${formatEther(value)} ETH`;
  };
  
  // Format program revenue
  const formattedRevenue = (() => {
    if (revenueData === undefined) return '0 ETH';
    try {
      return formatEther(BigInt(revenueData.toString())) + ' ETH';
    } catch (e) {
      console.error('Error formatting revenue data:', e);
      return '0 ETH';
    }
  })();
  
  // Helper to format time since last check
  const getTimeSinceLastCheck = (timestamp: Date | null) => {
    if (!timestamp) return 'Never checked';
    return formatDistanceToNow(timestamp, { addSuffix: true });
  };
  
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
    
    refreshAllData();
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
  
  // Refresh all data
  const refreshAllData = useCallback(() => {
    refetchRevenue();
    refetchTracking();
    refetchFeeStructure();
    
    const now = new Date();
    setLastCheckedRevenue(now);
    setLastCheckedTracking(now);
    setLastCheckedFees(now);
  }, [refetchRevenue, refetchTracking, refetchFeeStructure]);
  
  // Refresh specific data section
  const refreshSection = useCallback((section: 'revenue' | 'tracking' | 'fees') => {
    const now = new Date();
    
    if (section === 'revenue') {
      refetchRevenue();
      setLastCheckedRevenue(now);
    } else if (section === 'tracking') {
      refetchTracking();
      setLastCheckedTracking(now);
    } else if (section === 'fees') {
      refetchFeeStructure();
      setLastCheckedFees(now);
    }
  }, [refetchRevenue, refetchTracking, refetchFeeStructure]);
  
  // Prepare the exported data object
  useEffect(() => {
    if (onDataChange) {
      // Format revenue tracking data
      let trackingDataToExport = null;
      if (revenueTracking) {
        trackingDataToExport = {
          totalRevenue: {
            raw: revenueTracking.totalRevenue,
            formatted: formatValue(revenueTracking.totalRevenue)
          },
          platformShare: {
            raw: revenueTracking.platformShare,
            formatted: formatValue(revenueTracking.platformShare),
            percentage: calculatePercentage(revenueTracking.platformShare, revenueTracking.totalRevenue)
          },
          schoolShare: {
            raw: revenueTracking.schoolShare,
            formatted: formatValue(revenueTracking.schoolShare),
            percentage: calculatePercentage(revenueTracking.schoolShare, revenueTracking.totalRevenue)
          },
          lastWithdrawalTime: {
            raw: revenueTracking.lastWithdrawalTime,
            formatted: formatTimestamp(revenueTracking.lastWithdrawalTime),
            timeAgo: getTimeSinceLastWithdrawal(revenueTracking.lastWithdrawalTime)
          }
        };
      }
      
      // Format fee structure data
      let feeDataToExport = null;
      if (feeStructure) {
        feeDataToExport = {
          programCreationFee: {
            raw: feeStructure.programCreationFee,
            formatted: formatDisplayValue(feeStructure.programCreationFee)
          },
          subscriptionFee: {
            raw: feeStructure.subscriptionFee,
            formatted: formatDisplayValue(feeStructure.subscriptionFee)
          },
          certificateFee: {
            raw: feeStructure.certificateFee,
            formatted: formatDisplayValue(feeStructure.certificateFee)
          },
          revenueSharePercentage: {
            raw: feeStructure.revenueSharePercentage,
            formatted: formatDisplayValue(feeStructure.revenueSharePercentage, true)
          },
          isCustom: feeStructure.isCustom
        };
      }
      
      // Format program revenue data
      const revenueRaw = revenueData !== undefined ? BigInt(revenueData.toString()) : undefined;
      
      // Create the unified data object
      const unifiedData: UnifiedFinancialData = {
        programRevenue: {
          raw: revenueRaw,
          formatted: formattedRevenue,
          programId,
          schoolAddress: schoolAddress as string
        },
        revenueTracking: trackingDataToExport,
        feeStructure: feeDataToExport,
        loading: {
          programRevenue: isLoadingRevenue,
          revenueTracking: isLoadingTracking,
          feeStructure: isLoadingFeeStructure
        },
        error: {
          programRevenue: isRevenueError,
          revenueTracking: isTrackingError,
          feeStructure: isFeeStructureError
        },
        lastChecked: {
          programRevenue: lastCheckedRevenue,
          revenueTracking: lastCheckedTracking,
          feeStructure: lastCheckedFees
        }
      };
      
      onDataChange(unifiedData);
    }
  }, [
    revenueData, revenueTracking, feeStructure,
    isLoadingRevenue, isLoadingTracking, isLoadingFeeStructure,
    isRevenueError, isTrackingError, isFeeStructureError,
    lastCheckedRevenue, lastCheckedTracking, lastCheckedFees,
    formattedRevenue, programId, schoolAddress,
    onDataChange
  ]);
  
  // Auto-fetch data on mount if default values are provided
  useEffect(() => {
    if ((defaultSchool || (useConnectedAddress && connectedAddress)) && 
        !lastCheckedRevenue && !lastCheckedTracking && !lastCheckedFees) {
      refreshAllData();
    }
  }, [
    defaultSchool, connectedAddress, useConnectedAddress,
    lastCheckedRevenue, lastCheckedTracking, lastCheckedFees,
    refreshAllData
  ]);
  
  // Generate fee items for display
  const feeItems = feeStructure ? [
    {
      label: 'Program Creation Fee',
      value: formatDisplayValue(feeStructure.programCreationFee),
      raw: feeStructure.programCreationFee,
      description: 'One-time fee paid when creating a new educational program'
    },
    {
      label: 'Subscription Fee',
      value: formatDisplayValue(feeStructure.subscriptionFee),
      raw: feeStructure.subscriptionFee,
      description: 'Regular fee paid for access to platform services'
    },
    {
      label: 'Certificate Fee',
      value: formatDisplayValue(feeStructure.certificateFee),
      raw: feeStructure.certificateFee,
      description: 'Fee paid for issuing digital certificates to students'
    },
    {
      label: 'Revenue Share Percentage',
      value: formatDisplayValue(feeStructure.revenueSharePercentage, true),
      raw: feeStructure.revenueSharePercentage,
      description: 'Percentage of program revenue shared with the platform'
    }
  ] : [];
  
  // Determine if we have data to display in each section
  const hasRevenueData = !isLoadingRevenue && !isRevenueError && lastCheckedRevenue;
  const hasTrackingData = !isLoadingTracking && !isTrackingError && revenueTracking;
  const hasFeeData = !isLoadingFeeStructure && !isFeeStructureError && feeStructure;
  
  // Compact view for embedding
  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="bg-gray-800 rounded-lg p-4 border border-gray-700"
      >
        <h3 className="text-md font-semibold mb-3 flex items-center bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
          <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 7H7v10h5v-4m0-6v4h5m-5-4v10h5V7h-5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Financial Dashboard
        </h3>
        
        <div className="grid grid-cols-1 gap-3 mt-2">
          {/* Program Revenue */}
          {!hideRevenue && (
            <div className="bg-gray-700/50 rounded-md p-3">
              <div className="flex justify-between items-center mb-2">
                <p className="text-xs text-cyan-400 font-medium">Program Revenue:</p>
                <button 
                  onClick={() => refreshSection('revenue')} 
                  className="text-xs bg-gray-600/50 hover:bg-gray-600 text-gray-300 px-1.5 py-0.5 rounded-sm transition-colors"
                >
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none">
                    <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
                          stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
              {hasRevenueData ? (
                <div className="text-sm font-medium text-white">{formattedRevenue}</div>
              ) : (
                <div className="text-xs text-gray-400">No data available</div>
              )}
              <div className="text-xs text-gray-500 mt-1">Program #{programId}</div>
            </div>
          )}
          
          {/* Revenue Tracking */}
          {!hideTracking && (
            <div className="bg-gray-700/50 rounded-md p-3">
              <div className="flex justify-between items-center mb-2">
                <p className="text-xs text-orange-400 font-medium">Revenue Tracking:</p>
                <button 
                  onClick={() => refreshSection('tracking')} 
                  className="text-xs bg-gray-600/50 hover:bg-gray-600 text-gray-300 px-1.5 py-0.5 rounded-sm transition-colors"
                >
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none">
                    <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
                          stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
              {hasTrackingData ? (
                <>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-400">Total:</span>
                      <span className="text-white ml-1">{formatValue(revenueTracking?.totalRevenue)}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">School Share:</span>
                      <span className="text-white ml-1">{formatValue(revenueTracking?.schoolShare)}</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-xs text-gray-400">No tracking data available</div>
              )}
            </div>
          )}
          
          {/* Fee Structure */}
          {!hideFees && (
            <div className="bg-gray-700/50 rounded-md p-3">
              <div className="flex justify-between items-center mb-2">
                <p className="text-xs text-indigo-400 font-medium">Fee Structure:</p>
                <button 
                  onClick={() => refreshSection('fees')} 
                  className="text-xs bg-gray-600/50 hover:bg-gray-600 text-gray-300 px-1.5 py-0.5 rounded-sm transition-colors"
                >
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none">
                    <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
                          stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
              {hasFeeData ? (
                <>
                  <div className="text-xs text-gray-400 mb-1">Revenue Share:</div>
                  <div className="text-sm font-medium text-white">{formatDisplayValue(feeStructure?.revenueSharePercentage, true)}</div>
                </>
              ) : (
                <div className="text-xs text-gray-400">No fee data available</div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    );
  }
  
  // Full dashboard view
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-gray-800/50 border border-gray-700 rounded-lg p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold bg-gradient-to-r from-cyan-400 via-orange-400 to-indigo-400 bg-clip-text text-transparent">
          Financial Dashboard
        </h3>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={refreshAllData}
          disabled={isLoadingRevenue || isLoadingTracking || isLoadingFeeStructure}
          className="flex items-center bg-gray-700 hover:bg-gray-600 text-gray-200 px-3 py-1.5 rounded text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        >
          <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh All Data
        </motion.button>
      </div>
      
      {/* Query Form */}
      <form onSubmit={handleSubmit} className="bg-gray-700/30 rounded-lg p-4 mb-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  validationError && validationError.includes('address') ? 'border-red-500' : 'border-gray-600'
                } rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
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
              } rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                defaultProgramId ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            />
            <p className="text-xs text-gray-400">Enter the ID of the program to check financial data</p>
          </div>
        </div>
        
        {/* Validation Errors */}
        {validationError && (
          <div className="text-xs text-red-400 mt-3 bg-red-500/10 p-2 rounded border border-red-500/30">{validationError}</div>
        )}
        
        {/* Submit Button */}
        <div className="mt-4">
          <button
            type="submit"
            disabled={isLoadingRevenue || isLoadingTracking || isLoadingFeeStructure}
            className="w-full px-4 py-2 rounded-md text-white font-medium bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-700 hover:via-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-70 transition-colors duration-300"
          >
            {isLoadingRevenue || isLoadingTracking || isLoadingFeeStructure ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Loading Financial Data...
              </span>
            ) : (
              'View Financial Data'
            )}
          </button>
        </div>
      </form>
      
      {/* Dashboard Tabs */}
      {(hasRevenueData || hasTrackingData || hasFeeData) && (
        <div className="mb-4 border-b border-gray-700">
          <div className="flex flex-wrap">
            {!hideRevenue && (
              <button 
                onClick={() => setActiveTab('revenue')}
                className={`py-2 px-4 mr-2 text-sm font-medium transition-colors ${
                  activeTab === 'revenue' 
                    ? 'text-cyan-400 border-b-2 border-cyan-400 bg-cyan-500/10' 
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                Program Revenue
              </button>
            )}
            
            {!hideTracking && (
              <button 
                onClick={() => setActiveTab('tracking')}
                className={`py-2 px-4 mr-2 text-sm font-medium transition-colors ${
                  activeTab === 'tracking' 
                    ? 'text-orange-400 border-b-2 border-orange-400 bg-orange-500/10' 
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                Revenue Tracking
              </button>
            )}
            
            {!hideFees && (
              <button 
                onClick={() => setActiveTab('fees')}
                className={`py-2 px-4 mr-2 text-sm font-medium transition-colors ${
                  activeTab === 'fees' 
                    ? 'text-indigo-400 border-b-2 border-indigo-400 bg-indigo-500/10' 
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                Fee Structure
              </button>
            )}
          </div>
        </div>
      )}
      
      {/* Program Revenue Tab */}
      {activeTab === 'revenue' && !hideRevenue && (
        <div className="space-y-4">
          {/* Loading State */}
          {isLoadingRevenue && (
            <div className="flex items-center justify-center py-8 bg-gray-700/20 rounded-lg mb-4">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 border-3 border-t-cyan-400 border-cyan-200/30 rounded-full animate-spin mb-3"></div>
                <span className="text-sm text-gray-300">Fetching program revenue data...</span>
              </div>
            </div>
          )}
          
          {/* Error State */}
          {isRevenueError && !isLoadingRevenue && (
            <div className="bg-red-500/20 text-red-400 border border-red-500/30 rounded-md p-4 mb-4">
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
          {hasRevenueData && (
            <div className="bg-gray-700/30 rounded-lg p-4">
              <div className="flex flex-col items-center justify-center">
                <div className="mb-3">
                  <div className="text-sm text-center text-gray-400 mb-1">Program Revenue</div>
                  <div className="text-3xl font-bold text-cyan-400 text-center">{formattedRevenue}</div>
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
                  onClick={() => refreshSection('revenue')}
                  disabled={isLoadingRevenue}
                  className="flex items-center text-xs px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh Revenue Data
                </button>
              </div>
            </div>
          )}
          
          {/* Last Updated Information */}
          {hasRevenueData && (
            <div className="mt-4 bg-gray-700/20 rounded-md p-3">
              <div className="text-xs text-gray-400 flex items-center justify-center">
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Last checked: {getTimeSinceLastCheck(lastCheckedRevenue)}
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Revenue Tracking Tab */}
      {activeTab === 'tracking' && !hideTracking && (
        <div className="space-y-4">
          {/* Loading State */}
          {isLoadingTracking && (
            <div className="flex items-center justify-center py-8 bg-gray-700/20 rounded-lg mb-4">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 border-3 border-t-orange-400 border-orange-200/30 rounded-full animate-spin mb-3"></div>
                <span className="text-sm text-gray-300">Fetching revenue tracking data...</span>
              </div>
            </div>
          )}
          
          {/* Error State */}
          {isTrackingError && !isLoadingTracking && (
            <div className="bg-red-500/20 text-red-400 border border-red-500/30 rounded-md p-4 mb-4">
              <div className="flex items-start">
                <svg className="w-5 h-5 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-sm font-medium">Revenue Tracking Error</p>
                  <p className="text-xs mt-1">Unable to fetch revenue tracking data. Please verify the school address is correct.</p>
                </div>
              </div>
            </div>
          )}
          
          {/* Revenue Tracking Display */}
          {hasTrackingData && (
            <div className="space-y-4">
              {/* School Address Banner */}
              <div className="bg-gray-700/50 rounded-md p-3">
                <p className="text-xs text-gray-400 mb-1">Revenue Tracking for School:</p>
                <div className="font-mono text-sm text-white break-all">
                  {schoolAddress}
                </div>
              </div>
              
              {/* Revenue Summary */}
              <div className="bg-gray-700/30 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-300 mb-3 flex items-center">
                  <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Revenue Summary
                </h4>
                
                <div className="mb-4">
                  <div className="text-sm text-center text-gray-400 mb-1">Total Revenue Generated</div>
                  <div className="text-3xl font-bold text-orange-400 text-center">{formatValue(revenueTracking?.totalRevenue)}</div>
                </div>
                
                {/* Distribution Chart */}
                <div className="bg-gray-700/50 rounded-lg p-3 mb-4">
                  <p className="text-xs text-gray-400 mb-2">Revenue Distribution</p>
                  
                  <div className="h-6 bg-gray-800 rounded-md overflow-hidden flex mb-3">
                    <div 
                      className="h-full bg-orange-500 flex items-center justify-center text-xs font-semibold text-white"
                      style={{ 
                        width: `${calculatePercentage(revenueTracking?.platformShare, revenueTracking?.totalRevenue)}%`,
                        transition: 'width 1s ease-in-out'
                      }}
                    >
                      {calculatePercentage(revenueTracking?.platformShare, revenueTracking?.totalRevenue) >= 10 ? 
                        `${calculatePercentage(revenueTracking?.platformShare, revenueTracking?.totalRevenue)}%` : ''}
                    </div>
                    <div 
                      className="h-full bg-blue-500 flex items-center justify-center text-xs font-semibold text-white"
                      style={{ 
                        width: `${calculatePercentage(revenueTracking?.schoolShare, revenueTracking?.totalRevenue)}%`,
                        transition: 'width 1s ease-in-out'
                      }}
                    >
                      {calculatePercentage(revenueTracking?.schoolShare, revenueTracking?.totalRevenue) >= 10 ? 
                        `${calculatePercentage(revenueTracking?.schoolShare, revenueTracking?.totalRevenue)}%` : ''}
                    </div>
                  </div>
                  
                  <div className="flex justify-between text-xs">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-orange-500 rounded-sm mr-1.5"></div>
                      <span className="text-gray-300">Platform Share</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-blue-500 rounded-sm mr-1.5"></div>
                      <span className="text-gray-300">School Share</span>
                    </div>
                  </div>
                </div>
                
                {/* Revenue Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-gray-700/40 rounded-md p-3">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-sm text-gray-300">Platform Share</span>
                      <span className="text-md font-semibold text-orange-400">{formatValue(revenueTracking?.platformShare)}</span>
                    </div>
                    <p className="text-xs text-gray-400">Amount allocated to the platform</p>
                  </div>
                  
                  <div className="bg-gray-700/40 rounded-md p-3">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-sm text-gray-300">School Share</span>
                      <span className="text-md font-semibold text-blue-400">{formatValue(revenueTracking?.schoolShare)}</span>
                    </div>
                    <p className="text-xs text-gray-400">Amount allocated to the school</p>
                  </div>
                </div>
              </div>
              
              {/* Last Withdrawal Information */}
              <div className="bg-gray-700/30 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-300 mb-3 flex items-center">
                  <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Withdrawal History
                </h4>
                
                <div className="bg-gray-700/40 rounded-md p-3">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
                    <div className="mb-2 sm:mb-0">
                      <p className="text-sm text-gray-300">Last Withdrawal Date</p>
                      <p className="text-md text-white">{formatTimestamp(revenueTracking?.lastWithdrawalTime)}</p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                      revenueTracking?.lastWithdrawalTime && revenueTracking?.lastWithdrawalTime > BigInt(0)
                        ? 'bg-green-900/20 text-green-400'
                        : 'bg-yellow-900/20 text-yellow-400'
                    }`}>
                      {revenueTracking?.lastWithdrawalTime && revenueTracking?.lastWithdrawalTime > BigInt(0)
                        ? getTimeSinceLastWithdrawal(revenueTracking?.lastWithdrawalTime)
                        : 'No withdrawals yet'}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex justify-center">
                <button
                  onClick={() => refreshSection('tracking')}
                  disabled={isLoadingTracking}
                  className="flex items-center text-xs px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <svg className="w-3 h-3 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh Tracking Data
                </button>
              </div>
              
              {/* Last Updated Information */}
              <div className="bg-gray-700/20 rounded-md p-2.5">
                <div className="text-xs text-gray-400 flex items-center justify-center">
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Last checked: {getTimeSinceLastCheck(lastCheckedTracking)}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Fee Structure Tab */}
      {activeTab === 'fees' && !hideFees && (
        <div className="space-y-4">
          {/* Loading State */}
          {isLoadingFeeStructure && !feeStructure && (
            <div className="flex items-center justify-center py-8 bg-gray-700/20 rounded-lg mb-4">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 border-3 border-t-indigo-400 border-indigo-200/30 rounded-full animate-spin mb-3"></div>
                <span className="text-sm text-gray-300">Loading fee structure...</span>
              </div>
            </div>
          )}
          
          {/* Error State */}
          {isFeeStructureError && (
            <div className="bg-red-500/20 text-red-400 border border-red-500/30 rounded-md p-4 mb-4">
              <div className="flex items-start">
                <svg className="w-5 h-5 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-sm font-medium">Fee Structure Error</p>
                  <p className="text-xs mt-1">Unable to fetch fee structure data. Please try again later.</p>
                </div>
              </div>
            </div>
          )}
          
          {/* Fee Structure Display */}
          {hasFeeData && (
            <div className="space-y-6">
              {/* Fee Structure Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {feeItems.map((item, index) => (
                  <div key={index} className="bg-gray-700/30 rounded-md p-3">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-sm text-gray-300">{item.label}</span>
                      <span className="text-md font-semibold text-indigo-400">{item.value}</span>
                    </div>
                    <p className="text-xs text-gray-400">{item.description}</p>
                  </div>
                ))}
              </div>
              
              {/* Custom Structure Status */}
              <div className={`rounded-md p-3 flex items-center ${
                feeStructure?.isCustom
                  ? 'bg-purple-900/20 border border-purple-700/30'
                  : 'bg-blue-900/20 border border-blue-700/30'
              }`}>
                <div className={`w-3 h-3 rounded-full mr-3 ${
                  feeStructure?.isCustom ? 'bg-purple-500' : 'bg-blue-500'
                }`}></div>
                <div>
                  <h4 className="text-sm font-medium text-gray-200">
                    {feeStructure?.isCustom ? 'Custom Fee Structure' : 'Standard Fee Structure'}
                  </h4>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {feeStructure?.isCustom
                      ? 'This fee structure has been customized for specific use cases.'
                      : 'This is the standard platform fee structure applied by default.'}
                  </p>
                </div>
              </div>
              
              {/* Refresh Button */}
              <div className="flex justify-center">
                <button
                  onClick={() => refreshSection('fees')}
                  disabled={isLoadingFeeStructure}
                  className="flex items-center text-xs px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <svg className="w-3 h-3 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh Fee Structure
                </button>
              </div>
              
              {/* Last Updated Information */}
              <div className="bg-gray-700/20 rounded-md p-2.5">
                <div className="text-xs text-gray-400 flex items-center justify-end">
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Last checked: {getTimeSinceLastCheck(lastCheckedFees)}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
};

/**
 * Custom hook for accessing unified financial data
 */
export const useFinancialData = (
  defaultSchool?: `0x${string}`,
  defaultProgramId?: number
) => {
  const [financialData, setFinancialData] = useState<UnifiedFinancialData | null>(null);
  
  const handleDataChange = (data: UnifiedFinancialData) => {
    setFinancialData(data);
  };
  
  return {
    FinancialDashboard: ({ compact = false, ...props }) => (
      <UnifiedFinancialDashboard
        defaultSchool={defaultSchool}
        defaultProgramId={defaultProgramId}
        onDataChange={handleDataChange}
        compact={compact}
        {...props}
      />
    ),
    data: financialData,
    // Export individual components with pre-configured settings
    CompactFinancialView: (props: Partial<UnifiedFinancialDashboardProps>) => (
      <UnifiedFinancialDashboard
        defaultSchool={defaultSchool}
        defaultProgramId={defaultProgramId}
        onDataChange={handleDataChange}
        compact={true}
        {...props}
      />
    ),
    RevenueView: (props: Partial<UnifiedFinancialDashboardProps>) => (
      <UnifiedFinancialDashboard
        defaultSchool={defaultSchool}
        defaultProgramId={defaultProgramId}
        onDataChange={handleDataChange}
        hideTracking={true}
        hideFees={true}
        {...props}
      />
    ),
    TrackingView: (props: Partial<UnifiedFinancialDashboardProps>) => (
      <UnifiedFinancialDashboard
        defaultSchool={defaultSchool}
        onDataChange={handleDataChange}
        hideRevenue={true}
        hideFees={true}
        {...props}
      />
    ),
    FeesView: (props: Partial<UnifiedFinancialDashboardProps>) => (
      <UnifiedFinancialDashboard
        onDataChange={handleDataChange}
        hideRevenue={true}
        hideTracking={true}
        {...props}
      />
    )
  };
};

export default UnifiedFinancialDashboard;