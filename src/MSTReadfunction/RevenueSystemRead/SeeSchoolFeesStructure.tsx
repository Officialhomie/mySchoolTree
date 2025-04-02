import { useState, useEffect } from 'react';
import { useReadContract, useAccount } from 'wagmi';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { formatEther } from 'viem';

/**
 * SchoolFeeStructureViewer Component
 * 
 * This component displays the fee structure assigned to a specific school,
 * including program creation fees, subscription fees, certificate fees, and revenue share percentage.
 */
interface SchoolFeeStructureViewerProps {
  feeContract: any; // Contract for reading fee structure
  defaultSchool?: `0x${string}`; // Optional default school address
  hideForm?: boolean; // Optional flag to hide the form and only display fee structure
}

interface FeeStructure {
  programCreationFee: bigint;
  subscriptionFee: bigint;
  certificateFee: bigint;
  revenueSharePercentage: bigint;
  isCustom: boolean;
}

const SchoolFeeStructureViewer = ({
  feeContract,
  defaultSchool,
  hideForm = false
}: SchoolFeeStructureViewerProps) => {
  // Current user's address (used if no default school is provided)
  const { address: connectedAddress } = useAccount();
  
  // State for tracking the query parameters
  const [schoolAddress, setSchoolAddress] = useState<`0x${string}` | string>(
    defaultSchool || (connectedAddress as `0x${string}`) || ''
  );
  const [customSchool, setCustomSchool] = useState<string>('');
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
  
  // Fetch fee structure data
  const {
    data: feeStructureData,
    isLoading: isLoadingFeeStructure,
    isError: isFeeStructureError,
    refetch: refetchFeeStructure
  } = useReadContract({
    ...feeContract,
    functionName: 'schoolFeeStructures',
    args: [schoolAddress as `0x${string}`],
    query: {
      enabled: !!schoolAddress && /^0x[a-fA-F0-9]{40}$/.test(schoolAddress as string)
    }
  });
  
  // Parse fee structure data
  const feeStructure = feeStructureData as FeeStructure | undefined;
  
  // Handle custom school address input
  const handleSchoolAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomSchool(e.target.value);
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
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (useConnectedAddress && connectedAddress) {
      setSchoolAddress(connectedAddress as `0x${string}`);
    } else {
      if (!validateAddress(customSchool)) {
        return;
      }
      
      setSchoolAddress(customSchool as `0x${string}`);
    }
    
    setLastChecked(new Date());
    refetchFeeStructure();
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
  
  // Format display values
  const formatDisplayValue = (value: bigint | undefined, isPercentage = false): string => {
    if (value === undefined) return '—';
    
    if (isPercentage) {
      // Assuming percentage is stored as a whole number (e.g., 5 for 5%)
      return `${value.toString()}%`;
    }
    
    return `${formatEther(value)} ETH`;
  };
  
  // Helper to format time since last check
  const getTimeSinceLastCheck = () => {
    if (!lastChecked) return 'Never checked';
    return formatDistanceToNow(lastChecked, { addSuffix: true });
  };
  
  // Handle refresh button click
  const handleRefresh = () => {
    refetchFeeStructure();
    setLastChecked(new Date());
  };
  
  // Generate key-value pairs for fee data
  const feeItems = feeStructure ? [
    {
      label: 'Program Creation Fee',
      value: formatDisplayValue(feeStructure.programCreationFee),
      description: 'One-time fee paid when creating a new educational program'
    },
    {
      label: 'Subscription Fee',
      value: formatDisplayValue(feeStructure.subscriptionFee),
      description: 'Regular fee paid for access to platform services'
    },
    {
      label: 'Certificate Fee',
      value: formatDisplayValue(feeStructure.certificateFee),
      description: 'Fee paid for issuing digital certificates to students'
    },
    {
      label: 'Revenue Share Percentage',
      value: formatDisplayValue(feeStructure.revenueSharePercentage, true),
      description: 'Percentage of program revenue shared with the platform'
    }
  ] : [];
  
  // Execute initial fetch if default school is provided or connected address is used
  useEffect(() => {
    if ((defaultSchool || (useConnectedAddress && connectedAddress)) && !lastChecked) {
      refetchFeeStructure();
      setLastChecked(new Date());
    }
  }, [defaultSchool, connectedAddress, useConnectedAddress, lastChecked, refetchFeeStructure]);
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-gray-800/50 border border-gray-700 rounded-lg p-4"
    >
      <h3 className="text-lg font-medium text-purple-400 mb-3">
        School Fee Structure
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
                    className="text-xs px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                    validationError ? 'border-red-500' : 'border-gray-600'
                  } rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                    defaultSchool ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                />
              )}
              
              {/* Validation Errors */}
              {validationError && (
                <div className="text-xs text-red-400 mt-1">{validationError}</div>
              )}
            </div>
            
            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoadingFeeStructure}
                className={`w-full px-4 py-2 rounded-md text-white font-medium ${
                  isLoadingFeeStructure
                    ? 'bg-gray-600 cursor-not-allowed'
                    : 'bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500'
                }`}
              >
                {isLoadingFeeStructure ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Loading Fee Structure...
                  </span>
                ) : (
                  'View Fee Structure'
                )}
              </button>
            </div>
          </div>
        </form>
      )}
      
      {/* Loading State */}
      {isLoadingFeeStructure && (
        <div className="flex items-center justify-center py-8 bg-gray-700/20 rounded-lg mb-4">
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 border-3 border-t-purple-400 border-purple-200/30 rounded-full animate-spin mb-3"></div>
            <span className="text-sm text-gray-300">Fetching fee structure data...</span>
          </div>
        </div>
      )}
      
      {/* Error State */}
      {isFeeStructureError && !isLoadingFeeStructure && (
        <div className="bg-red-500/20 text-red-400 border border-red-500/30 rounded-md p-4 mb-4">
          <div className="flex items-start">
            <svg className="w-5 h-5 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-medium">Fee Structure Error</p>
              <p className="text-xs mt-1">Unable to fetch fee structure data. Please verify the school address is correct.</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Fee Structure Display */}
      {!isLoadingFeeStructure && !isFeeStructureError && feeStructure && (
        <div className="space-y-4">
          {/* School Address Banner */}
          <div className="bg-gray-700/50 rounded-md p-3">
            <p className="text-xs text-gray-400 mb-1">Fee Structure for School:</p>
            <div className="font-mono text-sm text-white break-all">
              {schoolAddress}
            </div>
          </div>
          
          {/* Fee Structure Type Indicator */}
          <div className={`rounded-md p-3 flex items-center ${
            feeStructure.isCustom
              ? 'bg-purple-900/20 border border-purple-700/30'
              : 'bg-blue-900/20 border border-blue-700/30'
          }`}>
            <div className={`w-3 h-3 rounded-full mr-3 ${
              feeStructure.isCustom ? 'bg-purple-500' : 'bg-blue-500'
            }`}></div>
            <div>
              <h4 className="text-sm font-medium text-gray-200">
                {feeStructure.isCustom ? 'Custom Fee Structure' : 'Default Fee Structure'}
              </h4>
              <p className="text-xs text-gray-400 mt-0.5">
                {feeStructure.isCustom
                  ? 'This school has a customized fee structure tailored to its specific needs.'
                  : 'This school uses the platform\'s default fee structure.'}
              </p>
            </div>
          </div>
          
          {/* Fee Structure Summary */}
          <div className="bg-gray-700/30 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-300 mb-3 flex items-center">
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              Fee Structure Details
            </h4>
            
            <div className="space-y-3">
              {feeItems.map((item, index) => (
                <div key={index} className="bg-gray-700/40 rounded-md p-3">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-sm text-gray-300">{item.label}</span>
                    <span className="text-md font-semibold text-purple-400">{item.value}</span>
                  </div>
                  <p className="text-xs text-gray-400">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex justify-center">
            <button
              onClick={handleRefresh}
              disabled={isLoadingFeeStructure}
              className="flex items-center text-xs px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <svg className="w-3 h-3 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh Fee Data
            </button>
          </div>
          
          {/* Last Updated Information */}
          <div className="bg-gray-700/20 rounded-md p-2.5">
            <div className="text-xs text-gray-400 flex items-center justify-center">
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Last checked: {getTimeSinceLastCheck()}
            </div>
          </div>
        </div>
      )}
      
      {/* Educational Information */}
      <div className="mt-6 pt-4 border-t border-gray-700">
        <h4 className="text-sm font-medium text-gray-300 mb-2">About School Fee Structures</h4>
        <p className="text-sm text-gray-400 mb-3">
          This component displays the fee structure assigned to a specific school. Each school can either use the platform's default fee structure or have a custom structure tailored to their specific needs.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <div className="bg-gray-700/20 rounded-md p-3">
            <h5 className="text-xs font-medium text-purple-400 mb-1">Platform Fees</h5>
            <p className="text-xs text-gray-400">
              Program Creation, Subscription, and Certificate fees are one-time or recurring payments required for using specific platform features. These fees are typically paid in ETH.
            </p>
          </div>
          
          <div className="bg-gray-700/20 rounded-md p-3">
            <h5 className="text-xs font-medium text-purple-400 mb-1">Revenue Sharing</h5>
            <p className="text-xs text-gray-400">
              The revenue share percentage determines what portion of a school's program income is allocated to the platform. This helps sustain the ecosystem while providing value to all participants.
            </p>
          </div>
        </div>
        
        <p className="text-xs text-gray-400">
          School administrators should be aware of their assigned fee structure as it directly impacts the cost of operating on the platform and the distribution of revenue from their educational programs.
        </p>
      </div>
    </motion.div>
  );
};

export default SchoolFeeStructureViewer;