import { useState, useEffect } from 'react';
import { useReadContract, useAccount } from 'wagmi';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { formatEther } from 'viem';

/**
 * SchoolBalanceViewer Component
 * 
 * This component displays the balance of a school address stored in the contract.
 * It can be used to view the balance of the current connected wallet or any specified school address.
 */
interface SchoolBalanceViewerProps {
  balanceContract: any; // Contract for reading school balance
  schoolAddress?: `0x${string}`; // Optional specific school address to check
}

const SchoolBalanceViewer = ({
  balanceContract,
  schoolAddress
}: SchoolBalanceViewerProps) => {
  // Current user's address (used if no specific school address is provided)
  const { address: connectedAddress } = useAccount();
  
  // State for tracking the address to check
  const [addressToCheck, setAddressToCheck] = useState<`0x${string}` | undefined>(
    schoolAddress || (connectedAddress as `0x${string}` | undefined)
  );
  const [customAddress, setCustomAddress] = useState<string>('');
  const [showCustomInput, setShowCustomInput] = useState<boolean>(!schoolAddress && !connectedAddress);
  const [validationError, setValidationError] = useState<string>('');
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  
  // Update addressToCheck when props or connected account changes
  useEffect(() => {
    if (schoolAddress) {
      setAddressToCheck(schoolAddress);
      setShowCustomInput(false);
    } else if (connectedAddress) {
      setAddressToCheck(connectedAddress as `0x${string}`);
      setShowCustomInput(false);
    } else {
      setShowCustomInput(true);
    }
  }, [schoolAddress, connectedAddress]);
  
  // Fetch school balance
  const {
    data: balanceData,
    isLoading: isLoadingBalance,
    isError: isBalanceError,
    refetch: refetchBalance
  } = useReadContract({
    ...balanceContract,
    functionName: 'schoolBalance',
    args: addressToCheck ? [addressToCheck] : undefined,
    query: {
      enabled: !!addressToCheck
    }
  });
  
  // Handle custom address input
  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomAddress(e.target.value);
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
  
  // Set custom address to check
  const handleSetAddress = () => {
    if (validateAddress(customAddress)) {
      setAddressToCheck(customAddress as `0x${string}`);
      setLastChecked(new Date());
    }
  };
  
  // Format balance for display
  const formattedBalance = balanceData
    ? formatEther(balanceData as bigint)
    : '0';
  
  // Helper to format time since last check
  const getTimeSinceLastCheck = () => {
    if (!lastChecked) return 'Never checked';
    return formatDistanceToNow(lastChecked, { addSuffix: true });
  };
  
  // Handle refresh button click
  const handleRefresh = () => {
    refetchBalance();
    setLastChecked(new Date());
  };
  
  // Toggle between custom input and connected address
  const toggleCustomAddress = () => {
    setShowCustomInput(!showCustomInput);
    if (!showCustomInput) {
      setAddressToCheck(undefined);
      setCustomAddress('');
    } else if (connectedAddress) {
      setAddressToCheck(connectedAddress as `0x${string}`);
    }
  };
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-gray-800/50 border border-gray-700 rounded-lg p-4"
    >
      <h3 className="text-lg font-medium text-teal-400 mb-3">
        School Balance Viewer
      </h3>
      
      {/* Address Selection */}
      <div className="bg-gray-700/30 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-medium text-gray-300">School Address</h4>
          {!schoolAddress && (
            <button
              onClick={toggleCustomAddress}
              className="text-xs px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              {showCustomInput ? 'Use Connected Address' : 'Enter Custom Address'}
            </button>
          )}
        </div>
        
        {showCustomInput ? (
          <div className="space-y-2">
            <div className="flex space-x-2">
              <input
                type="text"
                value={customAddress}
                onChange={handleAddressChange}
                placeholder="0x..."
                className={`flex-1 px-3 py-2 bg-gray-700 border ${
                  validationError ? 'border-red-500' : 'border-gray-600'
                } rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent`}
              />
              <button
                onClick={handleSetAddress}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 rounded-md text-white font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                Check
              </button>
            </div>
            {validationError && (
              <div className="text-xs text-red-400">{validationError}</div>
            )}
          </div>
        ) : (
          <div className="bg-gray-700/50 rounded-md p-3">
            <p className="text-xs text-gray-400 mb-1">Current Address:</p>
            <div className="font-mono text-sm text-white break-all">
              {addressToCheck || 'No address selected'}
            </div>
          </div>
        )}
      </div>
      
      {/* Balance Display */}
      <div className="bg-gray-700/30 rounded-lg p-4 mb-4">
        <div className="flex flex-col items-center justify-center">
          <h4 className="text-sm font-medium text-gray-300 mb-2">School Balance</h4>
          
          {/* Loading State */}
          {isLoadingBalance && (
            <div className="flex items-center justify-center py-6">
              <div className="w-6 h-6 border-2 border-t-teal-400 border-teal-200/30 rounded-full animate-spin"></div>
            </div>
          )}
          
          {/* Error State */}
          {isBalanceError && !isLoadingBalance && (
            <div className="bg-red-500/20 text-red-400 border border-red-500/30 rounded-md p-4 w-full">
              <div className="flex items-start">
                <svg className="w-5 h-5 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-sm font-medium">Balance Check Error</p>
                  <p className="text-xs mt-1">Unable to fetch school balance. Please try again later.</p>
                </div>
              </div>
            </div>
          )}
          
          {/* Balance Result */}
          {!isLoadingBalance && !isBalanceError && addressToCheck && (
            <>
              <div className="text-2xl font-bold text-teal-400 mb-2">
                {formattedBalance} ETH
              </div>
              
              <div className="w-full flex justify-center mb-2">
                <div className={`py-1 px-3 rounded-full text-xs font-medium ${
                  parseFloat(formattedBalance) > 0 
                    ? 'bg-green-900/20 text-green-400'
                    : 'bg-yellow-900/20 text-yellow-400'
                }`}>
                  {parseFloat(formattedBalance) > 0 
                    ? 'Funds Available' 
                    : 'No Funds Available'}
                </div>
              </div>
              
              <p className="text-xs text-gray-400 text-center">
                This is the current balance allocated to the school address in the system
              </p>
              
              <button
                onClick={handleRefresh}
                className="mt-4 flex items-center text-xs px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh Balance
              </button>
            </>
          )}
        </div>
      </div>
      
      {/* Last Updated Information */}
      {lastChecked && !isLoadingBalance && !isBalanceError && addressToCheck && (
        <div className="bg-gray-700/20 rounded-md p-3">
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
        <h4 className="text-sm font-medium text-gray-300 mb-2">About School Balance</h4>
        <p className="text-sm text-gray-400 mb-3">
          This component allows you to view the balance allocated to a school address in the system. This balance represents funds that have been assigned to the school but may not be directly accessible in the wallet.
        </p>
        
        <div className="bg-gray-700/20 rounded-md p-3 mb-3">
          <h5 className="text-xs font-medium text-teal-400 mb-1">Understanding School Balance</h5>
          <p className="text-xs text-gray-400">
            The school balance tracked by the contract may differ from the actual Ethereum balance of the address. It represents an internal accounting balance that might be associated with payments, allocations, or other financial operations within the educational system.
          </p>
        </div>
        
        <p className="text-xs text-gray-400">
          Administrators and school officials can use this information for financial planning, auditing, and reconciliation purposes. The balance is updated whenever relevant financial transactions occur within the system.
        </p>
      </div>
    </motion.div>
  );
};

export default SchoolBalanceViewer;