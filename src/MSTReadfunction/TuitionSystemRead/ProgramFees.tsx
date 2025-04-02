import { useState, useEffect } from 'react';
import { useReadContract } from 'wagmi';
import { motion } from 'framer-motion';

/**
 * ProgramFeesViewer Component
 * 
 * This component displays fee information for a program at a specific term.
 * It uses the programFees contract function to fetch data.
 */
interface ProgramFeesViewerProps {
  contract: any;
  programAddress?: string; // Optional pre-filled program address
  term?: number; // Optional pre-filled term
  refreshInterval?: number; // Optional interval to refresh data in milliseconds
  onDataFetched?: (feeData: ProgramFeeData) => void; // Optional callback when data is fetched
}

interface ProgramFeeData {
  registrationFee: bigint;
  termFee: bigint;
  graduationFee: bigint;
  lateFeePercentage: bigint;
  isActive: boolean;
}

const ProgramFeesViewer = ({
  contract,
  programAddress = '',
  term = 1,
  refreshInterval = 0,
  onDataFetched
}: ProgramFeesViewerProps) => {
  // Form state
  const [address, setAddress] = useState<string>(programAddress);
  const [currentTerm, setCurrentTerm] = useState<number>(term);
  const [validationError, setValidationError] = useState<string>('');
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  
  // Fetch fee data from contract
  const {
    data: feeData,
    error: feeError,
    isLoading: isLoadingFees,
    isSuccess: isFeesSuccess,
    refetch: refetchFees
  } = useReadContract({
    ...contract,
    functionName: 'programFees',
    args: address ? [address as `0x${string}`, BigInt(currentTerm)] : undefined,
    query: {
      enabled: !!address && currentTerm > 0
    }
  });
  
  // Extract fee values with proper typing
  const formattedFeeData: ProgramFeeData | undefined = feeData
    ? {
        registrationFee: (feeData as any).registrationFee,
        termFee: (feeData as any).termFee,
        graduationFee: (feeData as any).graduationFee,
        lateFeePercentage: (feeData as any).lateFeePercentage,
        isActive: (feeData as any).isActive
      }
    : undefined;
  
  // Calculate total fees (excluding late fees)
  const totalBaseFees = formattedFeeData
    ? formattedFeeData.registrationFee + formattedFeeData.termFee + formattedFeeData.graduationFee
    : BigInt(0);
  
  // Calculate max late fee potential
  const maxLateFee = formattedFeeData
    ? (totalBaseFees * formattedFeeData.lateFeePercentage) / BigInt(100)
    : BigInt(0);
  
  // Calculate worst case total (base + max late fees)
  const worstCaseTotal = totalBaseFees + maxLateFee;
  
  // Validate address format
  const validateAddress = (address: string): boolean => {
    if (!address) {
      setValidationError('Program address is required');
      return false;
    }
    
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      setValidationError('Invalid Ethereum address format');
      return false;
    }
    
    setValidationError('');
    return true;
  };
  
  // Validate term number
  const validateTerm = (term: number): boolean => {
    if (isNaN(term) || term <= 0) {
      setValidationError('Term must be a positive number');
      return false;
    }
    
    setValidationError('');
    return true;
  };
  
  // Handle address change
  const handleAddressChange = (value: string) => {
    setAddress(value);
    setValidationError('');
  };
  
  // Handle term change
  const handleTermChange = (value: string) => {
    const termNumber = parseInt(value);
    setCurrentTerm(isNaN(termNumber) ? 0 : termNumber);
    setValidationError('');
  };
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateAddress(address) && validateTerm(currentTerm)) {
      setHasSearched(true);
      refetchFees();
    }
  };
  
  // Format Wei to Ether with the specified number of decimal places
  const formatWeiToEther = (wei: bigint, decimals: number = 6): string => {
    const etherValue = Number(wei) / 1e18;
    return etherValue.toFixed(decimals);
  };
  
  // Get fee plan status styling
  const getFeeStatusStyle = (isActive: boolean) => {
    return isActive
      ? { text: 'Active', color: 'text-green-400', bg: 'bg-green-500/20' }
      : { text: 'Inactive', color: 'text-red-400', bg: 'bg-red-500/20' };
  };
  
  // Set up auto-refresh if interval is provided
  useEffect(() => {
    if (refreshInterval > 0 && address && currentTerm > 0) {
      const timer = setInterval(() => {
        refetchFees();
      }, refreshInterval);
      
      return () => {
        clearInterval(timer);
      };
    }
  }, [refreshInterval, address, currentTerm, refetchFees]);
  
  // Callback when data is fetched
  useEffect(() => {
    if (isFeesSuccess && formattedFeeData && onDataFetched) {
      onDataFetched(formattedFeeData);
    }
  }, [isFeesSuccess, formattedFeeData, onDataFetched]);
  
  // Render validation errors
  const renderValidationErrors = (): React.ReactNode => {
    if (!validationError) return null;
    
    return (
      <div className="text-xs text-red-400 mt-1">{validationError}</div>
    );
  };
  
  // Determine fee level for visual indicators
  const getFeeLevelStyle = (amount: bigint) => {
    const etherAmount = Number(amount) / 1e18;
    
    if (etherAmount >= 1.0) {
      return { text: 'High', bgClass: 'bg-red-500' };
    } else if (etherAmount >= 0.5) {
      return { text: 'Medium', bgClass: 'bg-yellow-500' };
    } else if (etherAmount > 0) {
      return { text: 'Low', bgClass: 'bg-green-500' };
    } else {
      return { text: 'None', bgClass: 'bg-gray-500' };
    }
  };
  
  const statusStyle = formattedFeeData ? getFeeStatusStyle(formattedFeeData.isActive) : { text: 'Unknown', color: 'text-gray-400', bg: 'bg-gray-500/20' };
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-gray-800/50 border border-gray-700 rounded-lg p-4"
    >
      <h3 className="text-lg font-medium text-blue-400 mb-3">
        Program Fees Viewer
      </h3>
      
      {/* Query Form */}
      <form onSubmit={handleSubmit} className="space-y-4 mb-4">
        <div className="bg-gray-700/30 rounded-lg p-4 space-y-4">
          {/* Program Address Input */}
          <div className="space-y-2">
            <label htmlFor="program-address" className="block text-sm font-medium text-gray-300">
              Program Contract Address
            </label>
            <input
              id="program-address"
              type="text"
              value={address}
              onChange={(e) => handleAddressChange(e.target.value)}
              placeholder="0x..."
              className={`w-full px-3 py-2 bg-gray-700 border ${
                validationError && !address ? 'border-red-500' : 'border-gray-600'
              } rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
            />
            <p className="text-xs text-gray-400">Enter the program's contract address</p>
          </div>
          
          {/* Term Input */}
          <div className="space-y-2">
            <label htmlFor="term-number" className="block text-sm font-medium text-gray-300">
              Term Number
            </label>
            <input
              id="term-number"
              type="number"
              value={currentTerm || ''}
              onChange={(e) => handleTermChange(e.target.value)}
              placeholder="Enter term number"
              min="1"
              className={`w-full px-3 py-2 bg-gray-700 border ${
                validationError && (!currentTerm || currentTerm <= 0) ? 'border-red-500' : 'border-gray-600'
              } rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
            />
            <p className="text-xs text-gray-400">Enter the term number to check fees for</p>
          </div>
          
          {/* Validation Errors */}
          {hasSearched && renderValidationErrors()}
          
          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoadingFees}
            >
              {isLoadingFees ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Loading...
                </span>
              ) : (
                'View Fees'
              )}
            </button>
          </div>
        </div>
      </form>
      
      {/* Results Display */}
      {feeError ? (
        <div className="bg-red-500/20 text-red-400 border border-red-500/30 rounded-md p-3 mb-4">
          <p className="text-sm">Error fetching fee data: {(feeError as Error).message || 'Unknown error'}</p>
          <button 
            onClick={() => refetchFees()} 
            className="text-xs mt-2 bg-gray-700 hover:bg-gray-600 text-gray-200 py-1 px-2 rounded"
          >
            Try Again
          </button>
        </div>
      ) : isFeesSuccess && formattedFeeData ? (
        <div className="space-y-4">
          {/* Status Badge */}
          <div className={`inline-flex items-center px-3 py-1 rounded-full ${statusStyle.bg} border border-${statusStyle.color.replace('text-', '')}/30`}>
            <div className={`w-2 h-2 rounded-full ${statusStyle.color.replace('text-', 'bg-')} mr-2`}></div>
            <span className={`text-sm font-medium ${statusStyle.color}`}>
              {statusStyle.text} Fee Plan
            </span>
          </div>
          
          {/* Main Info Card */}
          <div className="bg-gray-700/30 rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Registration Fee */}
              <div className="space-y-1">
                <p className="text-xs text-gray-400">Registration Fee:</p>
                <div className="flex items-baseline">
                  <p className="text-3xl font-bold text-white">{formatWeiToEther(formattedFeeData.registrationFee)}</p>
                  <p className="text-sm text-gray-400 ml-2">ETH</p>
                </div>
                
                {/* Fee Level Visual Indicator */}
                <div className="mt-2 h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${getFeeLevelStyle(formattedFeeData.registrationFee).bgClass}`}
                    style={{ width: `${Math.min((Number(formattedFeeData.registrationFee) / 1e18) * 100, 100)}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {getFeeLevelStyle(formattedFeeData.registrationFee).text} fee level
                </p>
              </div>
              
              {/* Term Fee */}
              <div className="space-y-1">
                <p className="text-xs text-gray-400">Term Fee:</p>
                <div className="flex items-baseline">
                  <p className="text-3xl font-bold text-white">{formatWeiToEther(formattedFeeData.termFee)}</p>
                  <p className="text-sm text-gray-400 ml-2">ETH</p>
                </div>
                
                {/* Fee Level Visual Indicator */}
                <div className="mt-2 h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${getFeeLevelStyle(formattedFeeData.termFee).bgClass}`}
                    style={{ width: `${Math.min((Number(formattedFeeData.termFee) / 1e18) * 100, 100)}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {getFeeLevelStyle(formattedFeeData.termFee).text} fee level
                </p>
              </div>
              
              {/* Graduation Fee */}
              <div className="space-y-1">
                <p className="text-xs text-gray-400">Graduation Fee:</p>
                <div className="flex items-baseline">
                  <p className="text-3xl font-bold text-white">{formatWeiToEther(formattedFeeData.graduationFee)}</p>
                  <p className="text-sm text-gray-400 ml-2">ETH</p>
                </div>
                
                {/* Fee Level Visual Indicator */}
                <div className="mt-2 h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${getFeeLevelStyle(formattedFeeData.graduationFee).bgClass}`}
                    style={{ width: `${Math.min((Number(formattedFeeData.graduationFee) / 1e18) * 100, 100)}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {getFeeLevelStyle(formattedFeeData.graduationFee).text} fee level
                </p>
              </div>
              
              {/* Late Fee Percentage */}
              <div className="space-y-1">
                <p className="text-xs text-gray-400">Late Fee Percentage:</p>
                <div className="flex items-baseline">
                  <p className="text-3xl font-bold text-white">{formattedFeeData.lateFeePercentage.toString()}</p>
                  <p className="text-sm text-gray-400 ml-2">%</p>
                </div>
                
                {/* Late Fee Visual Indicator */}
                <div className="mt-2 h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-yellow-500"
                    style={{ width: `${Math.min(Number(formattedFeeData.lateFeePercentage) * 2, 100)}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {Number(formattedFeeData.lateFeePercentage) > 25 ? 'High' : (Number(formattedFeeData.lateFeePercentage) > 10 ? 'Medium' : 'Low')} penalty rate
                </p>
              </div>
            </div>
            
            {/* Total Fee Summary */}
            <div className="mt-6 pt-4 border-t border-gray-600">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-700/40 p-3 rounded-md">
                  <p className="text-xs text-gray-400">Total Base Fees:</p>
                  <p className="text-xl font-bold text-white">{formatWeiToEther(totalBaseFees)} ETH</p>
                </div>
                
                <div className="bg-gray-700/40 p-3 rounded-md">
                  <p className="text-xs text-gray-400">Maximum Late Fee:</p>
                  <p className="text-xl font-bold text-yellow-400">{formatWeiToEther(maxLateFee)} ETH</p>
                </div>
                
                <div className="bg-gray-700/40 p-3 rounded-md">
                  <p className="text-xs text-gray-400">Worst Case Total:</p>
                  <p className="text-xl font-bold text-red-400">{formatWeiToEther(worstCaseTotal)} ETH</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Additional Details */}
          <div className="bg-gray-700/20 rounded-md p-3 text-xs">
            <h4 className="text-sm font-medium text-gray-300 mb-2">Fee Details</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 gap-x-4">
              <div>
                <span className="text-gray-400">Program Address: </span>
                <span className="text-gray-200 font-mono">{address}</span>
              </div>
              
              <div>
                <span className="text-gray-400">Term: </span>
                <span className="text-gray-200">{currentTerm}</span>
              </div>
              
              <div>
                <span className="text-gray-400">Registration Fee: </span>
                <span className="text-gray-200">{formatWeiToEther(formattedFeeData.registrationFee)} ETH</span>
              </div>
              
              <div>
                <span className="text-gray-400">Term Fee: </span>
                <span className="text-gray-200">{formatWeiToEther(formattedFeeData.termFee)} ETH</span>
              </div>
              
              <div>
                <span className="text-gray-400">Graduation Fee: </span>
                <span className="text-gray-200">{formatWeiToEther(formattedFeeData.graduationFee)} ETH</span>
              </div>
              
              <div>
                <span className="text-gray-400">Late Fee: </span>
                <span className="text-gray-200">{formattedFeeData.lateFeePercentage.toString()}%</span>
              </div>
              
              <div>
                <span className="text-gray-400">Status: </span>
                <span className={`${statusStyle.color}`}>{statusStyle.text}</span>
              </div>
            </div>
            
            <div className="mt-3 pt-2 border-t border-gray-700">
              <button 
                onClick={() => refetchFees()} 
                className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 py-1 px-3 rounded flex items-center"
              >
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh Data
              </button>
            </div>
          </div>
        </div>
      ) : hasSearched && !isLoadingFees ? (
        <div className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded-md p-3">
          <p className="text-sm">No fee data found for the specified program and term.</p>
        </div>
      ) : null}
    </motion.div>
  );
};

export default ProgramFeesViewer;