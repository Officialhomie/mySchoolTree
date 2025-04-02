import { useState, useEffect } from 'react';
import { useReadContract } from 'wagmi';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { formatEther } from 'viem';

/**
 * DefaultFeeStructureViewer Component
 * 
 * This component displays the default fee structure information from the contract,
 * including program creation fees, subscription fees, certificate fees, and revenue share percentage.
 */
interface DefaultFeeStructureViewerProps {
  feeContract: any; // Contract for reading fee structure
}

interface FeeStructure {
  programCreationFee: bigint;
  subscriptionFee: bigint;
  certificateFee: bigint;
  revenueSharePercentage: bigint;
  isCustom: boolean;
}

const DefaultFeeStructureViewer = ({
  feeContract
}: DefaultFeeStructureViewerProps) => {
  // State for tracking last update
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  
  // Fetch fee structure data
  const {
    data: feeStructureData,
    isLoading: isLoadingFeeStructure,
    isError: isFeeStructureError,
    refetch: refetchFeeStructure
  } = useReadContract({
    ...feeContract,
    functionName: 'defaultFeeStructure'
  });
  
  // Parse fee structure data
  const feeStructure = feeStructureData as FeeStructure | undefined;
  
  // Set last checked timestamp on initial load
  useEffect(() => {
    if (feeStructureData && !lastChecked) {
      setLastChecked(new Date());
    }
  }, [feeStructureData, lastChecked]);
  
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
  
  // Format display values
  const formatDisplayValue = (value: bigint | undefined, isPercentage = false): string => {
    if (value === undefined) return '—';
    
    if (isPercentage) {
      // Assuming percentage is stored as a whole number (e.g., 5 for 5%)
      return `${value.toString()}%`;
    }
    
    return `${formatEther(value)} ETH`;
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
    },
    {
      label: 'Custom Structure',
      value: feeStructure.isCustom ? 'Yes' : 'No',
      description: 'Indicates whether this fee structure is customized'
    }
  ] : [];
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-gray-800/50 border border-gray-700 rounded-lg p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-medium text-indigo-400">
          Default Fee Structure
        </h3>
        
        <button
          onClick={handleRefresh}
          className="flex items-center text-xs px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
          disabled={isLoadingFeeStructure}
        >
          {isLoadingFeeStructure ? (
            <>
              <div className="w-3 h-3 border-2 border-t-indigo-400 border-indigo-200/30 rounded-full animate-spin mr-2"></div>
              Updating...
            </>
          ) : (
            <>
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </>
          )}
        </button>
      </div>
      
      {/* Loading State */}
      {isLoadingFeeStructure && !feeStructure && (
        <div className="flex items-center justify-center py-12 bg-gray-700/20 rounded-lg">
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 border-4 border-t-indigo-400 border-indigo-200/30 rounded-full animate-spin mb-4"></div>
            <span className="text-sm text-gray-300">Loading fee structure...</span>
          </div>
        </div>
      )}
      
      {/* Error State */}
      {isFeeStructureError && (
        <div className="bg-red-500/20 text-red-400 border border-red-500/30 rounded-md p-4">
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
      {feeStructure && !isLoadingFeeStructure && !isFeeStructureError && (
        <div className="space-y-6">
          {/* Fee Structure Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {feeItems.slice(0, 4).map((item, index) => (
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
            feeStructure.isCustom
              ? 'bg-purple-900/20 border border-purple-700/30'
              : 'bg-blue-900/20 border border-blue-700/30'
          }`}>
            <div className={`w-3 h-3 rounded-full mr-3 ${
              feeStructure.isCustom ? 'bg-purple-500' : 'bg-blue-500'
            }`}></div>
            <div>
              <h4 className="text-sm font-medium text-gray-200">
                {feeStructure.isCustom ? 'Custom Fee Structure' : 'Standard Fee Structure'}
              </h4>
              <p className="text-xs text-gray-400 mt-0.5">
                {feeStructure.isCustom
                  ? 'This fee structure has been customized for specific use cases.'
                  : 'This is the standard platform fee structure applied by default.'}
              </p>
            </div>
          </div>
          
          {/* Last Updated Information */}
          <div className="bg-gray-700/20 rounded-md p-2.5">
            <div className="text-xs text-gray-400 flex items-center justify-end">
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
        <h4 className="text-sm font-medium text-gray-300 mb-2">About Fee Structure</h4>
        <p className="text-sm text-gray-400 mb-4">
          The default fee structure defines the standard costs associated with using the platform. These fees apply to all educational programs unless a custom structure has been defined.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="bg-gray-700/20 rounded-md p-3">
            <h5 className="text-xs font-medium text-indigo-400 mb-1">Platform Fees</h5>
            <p className="text-xs text-gray-400">
              Program Creation, Subscription, and Certificate fees are one-time or recurring payments required for using specific platform features. These fees are typically paid in ETH.
            </p>
          </div>
          
          <div className="bg-gray-700/20 rounded-md p-3">
            <h5 className="text-xs font-medium text-indigo-400 mb-1">Revenue Sharing</h5>
            <p className="text-xs text-gray-400">
              The revenue share percentage determines what portion of a program's income is allocated to the platform. This helps sustain the ecosystem while providing value to all participants.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default DefaultFeeStructureViewer;