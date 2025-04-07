import { useState, useEffect } from 'react';
import { useReadContract, useAccount } from 'wagmi';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { contractRoleManagementConfig } from '../../contracts';

/**
 * AdminRoleChecker Component
 * 
 * This component allows users to check if a specific address has admin privileges
 * by calling the hasAdminRole function.
 * 
 * Enhanced with data export capabilities for use in other components.
 */
interface AdminRoleCheckerProps {
  adminContract?: any; // Contract for checking admin role (optional now as we use the imported config)
  onCheckComplete?: (result: boolean, address: string) => void; // Optional callback
  onRoleDataChange?: (roleData: AdminRoleData | null) => void; // Callback for when role data changes
  onRefresh?: () => void; // Callback when user manually refreshes data
  defaultAddress?: string; // Optional default address to check
  hideForm?: boolean; // Optional flag to hide the form and only display role check results
}

// Interface for the role data that can be exported
export interface AdminRoleData {
  address: string;
  hasAdminRole: boolean | null;
  lastChecked: Date | null;
  isLoading: boolean;
  isError: boolean;
  errorMessage: string | null;
  checkHistory: Array<{
    address: string;
    hasRole: boolean;
    timestamp: Date;
  }>;
}

// Interface for history items
interface HistoryItem {
  address: string;
  hasRole: boolean;
  timestamp: Date;
}

const AdminRoleChecker = ({
  adminContract,
  onCheckComplete,
  onRoleDataChange,
  onRefresh,
  defaultAddress,
  hideForm = false
}: AdminRoleCheckerProps) => {
  // Use the imported contract config if adminContract is not provided
  const contractConfig = adminContract || contractRoleManagementConfig;
  
  // Current user's address
  const { address: connectedAddress } = useAccount();
  
  // Form state
  const [accountToCheck, setAccountToCheck] = useState<string>(defaultAddress || '');
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [isFormValid, setIsFormValid] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isCheckingConnectedAccount, setIsCheckingConnectedAccount] = useState<boolean>(true);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  
  // Track check history
  const [checkHistory, setCheckHistory] = useState<Array<HistoryItem>>([]);
  
  // Set connected address as default when component loads
  useEffect(() => {
    if (defaultAddress) {
      setAccountToCheck(defaultAddress);
    } else if (connectedAddress && accountToCheck === '') {
      setAccountToCheck(connectedAddress);
    }
  }, [connectedAddress, accountToCheck, defaultAddress]);
  
  // Validate form
  useEffect(() => {
    const isAddressValid = /^0x[a-fA-F0-9]{40}$/.test(accountToCheck);
    setIsFormValid(isAddressValid);
    
    // Check if we're looking at the connected account
    if (connectedAddress && accountToCheck === connectedAddress) {
      setIsCheckingConnectedAccount(true);
    } else {
      setIsCheckingConnectedAccount(false);
    }
  }, [accountToCheck, connectedAddress]);
  
  // Read contract state for the address being checked
  const {
    data: hasRoleData,
    isLoading: isCheckingRole,
    isError: isRoleCheckError,
    refetch: refetchRoleCheck,
    error: roleCheckError
  } = useReadContract({
    ...contractConfig,
    functionName: 'hasAdminRole',
    args: isFormValid ? [accountToCheck as `0x${string}`] : undefined,
    query: {
      enabled: isFormValid
    }
  });
  
  // Export role data when it changes
  useEffect(() => {
    if (onRoleDataChange) {
      const exportData: AdminRoleData = {
        address: accountToCheck,
        hasAdminRole: hasRoleData !== undefined ? (hasRoleData as boolean) : null,
        lastChecked,
        isLoading: isCheckingRole,
        isError: isRoleCheckError,
        errorMessage: roleCheckError ? (roleCheckError as Error).message : null,
        checkHistory
      };
      
      onRoleDataChange(exportData);
    }
  }, [
    accountToCheck,
    hasRoleData,
    lastChecked,
    isCheckingRole,
    isRoleCheckError,
    roleCheckError,
    checkHistory,
    onRoleDataChange
  ]);
  
  // Helper to format time since last check
  const getTimeSinceLastCheck = () => {
    if (!lastChecked) return 'Never checked';
    return formatDistanceToNow(lastChecked, { addSuffix: true });
  };
  
  // Check admin role for the address
  const handleCheckRole = () => {
    // Validate input data
    if (!isFormValid) {
      setErrorMessage('Please enter a valid Ethereum address');
      return;
    }
    
    setErrorMessage('');
    refetchRoleCheck().then((result) => {
      const now = new Date();
      setLastChecked(now);
      
      // Add to history if successful
      if (result.data !== undefined) {
        // Limit history to last 5 checks
        const newHistory = [
          {
            address: accountToCheck,
            hasRole: result.data as boolean,
            timestamp: now
          },
          ...checkHistory
        ].slice(0, 5);
        
        setCheckHistory(newHistory);
        
        // Call completion callback if provided
        if (onCheckComplete) {
          onCheckComplete(result.data as boolean, accountToCheck);
        }
        
        // Call refresh callback if provided
        if (onRefresh) {
          onRefresh();
        }
      }
    }).catch((error) => {
      console.error('Error checking role:', error);
      setErrorMessage('Error checking admin role: ' + error.message);
    });
  };
  
  // Set account to check from history
  const setAddressFromHistory = (address: string) => {
    setAccountToCheck(address);
  };
  
  // Public method to programmatically refresh/check the role
  const checkRole = (address?: string) => {
    if (address && address !== accountToCheck) {
      setAccountToCheck(address);
      
      // Allow time for state to update before checking
      setTimeout(() => {
        handleCheckRole();
      }, 100);
    } else {
      handleCheckRole();
    }
  };

  // Expose the checkRole method to parent components
  useEffect(() => {
    // Make the checkRole function available on the window for external access
    if (typeof window !== 'undefined') {
      (window as any).__adminRoleCheck = checkRole;
    }
    
    return () => {
      // Clean up when component unmounts
      if (typeof window !== 'undefined') {
        delete (window as any).__adminRoleCheck;
      }
    };
  }, [accountToCheck]);
  
  // Auto-check the role if default address is provided
  useEffect(() => {
    if (defaultAddress && isFormValid && !lastChecked) {
      handleCheckRole();
    }
  }, [defaultAddress, isFormValid, lastChecked]);
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-gray-800/50 border border-gray-700 rounded-lg p-4"
    >
      <h3 className="text-lg font-medium text-amber-400 mb-3">
        Admin Role Checker
      </h3>
      
      {/* Check Form */}
      {!hideForm && (
        <div className="bg-gray-700/30 rounded-lg p-4 mb-4">
          <div className="mb-4">
            <label htmlFor="accountToCheck" className="block text-sm font-medium text-gray-300 mb-1">
              Account Address
            </label>
            <div className="flex space-x-2">
              <input
                id="accountToCheck"
                type="text"
                value={accountToCheck}
                onChange={(e) => setAccountToCheck(e.target.value)}
                placeholder="0x..."
                className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
              {connectedAddress && (
                <button
                  onClick={() => setAccountToCheck(connectedAddress)}
                  className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-xs text-gray-300 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500"
                  title="Use my connected wallet address"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Enter the Ethereum address to check for admin role privileges
            </p>
          </div>
          
          {/* Error Message */}
          {errorMessage && (
            <div className="w-full bg-red-500/20 text-red-400 border border-red-500/30 rounded-md p-3 mb-4 text-sm">
              {errorMessage}
            </div>
          )}
          
          {/* Check Button */}
          <button
            onClick={handleCheckRole}
            disabled={!isFormValid || isCheckingRole}
            className={`w-full px-4 py-3 rounded-md text-white font-medium flex items-center justify-center mb-4 ${
              !isFormValid || isCheckingRole
                ? 'bg-gray-600 cursor-not-allowed'
                : 'bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500'
            }`}
          >
            {isCheckingRole ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Checking Admin Role...
              </>
            ) : (
              <>
                <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Check Admin Role
              </>
            )}
          </button>
          
          {/* Account being checked indicator */}
          {isFormValid && (
            <div className="w-full text-center">
              <p className="text-xs text-gray-400">
                {isCheckingConnectedAccount ? (
                  <span className="flex items-center justify-center">
                    <svg className="w-3 h-3 mr-1 text-amber-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                      <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                    </svg>
                    Checking your connected wallet address
                  </span>
                ) : (
                  "Checking external wallet address"
                )}
              </p>
            </div>
          )}
        </div>
      )}
      
      {/* Role Status Result */}
      {isFormValid && hasRoleData !== undefined && !isRoleCheckError && (
        <div className={`w-full rounded-lg p-4 flex items-center justify-between ${
          hasRoleData
            ? 'bg-green-900/20 border border-green-700/30'
            : 'bg-red-900/20 border border-red-700/30'
        }`}>
          <div className="flex items-center">
            {hasRoleData ? (
              <>
                <div className="w-3 h-3 bg-green-500 rounded-full mr-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                </div>
                <div>
                  <h4 className="text-md font-medium text-green-400">Admin Role Granted</h4>
                  <p className="text-xs text-gray-300 mt-0.5">
                    {isCheckingConnectedAccount 
                      ? "Your connected wallet has admin privileges" 
                      : `${accountToCheck.substring(0, 6)}...${accountToCheck.substring(accountToCheck.length - 4)} has admin privileges`}
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="w-3 h-3 bg-red-500 rounded-full mr-3"></div>
                <div>
                  <h4 className="text-md font-medium text-red-400">No Admin Role</h4>
                  <p className="text-xs text-gray-300 mt-0.5">
                    {isCheckingConnectedAccount 
                      ? "Your connected wallet does not have admin privileges" 
                      : `${accountToCheck.substring(0, 6)}...${accountToCheck.substring(accountToCheck.length - 4)} does not have admin privileges`}
                  </p>
                </div>
              </>
            )}
          </div>
          <div>
            <p className="text-xs text-gray-400">
              Last checked {getTimeSinceLastCheck()}
              {isCheckingConnectedAccount && (
                <span className="ml-1 inline-flex items-center text-amber-400">
                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1v-3a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span className="text-2xs">Your wallet</span>
                </span>
              )}
            </p>
          </div>
        </div>
      )}
      
      {/* Error State */}
      {isRoleCheckError && (
        <div className="bg-red-500/20 text-red-400 border border-red-500/30 rounded-md p-4">
          <div className="flex items-start">
            <svg className="w-5 h-5 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-medium">Role Check Error</p>
              <p className="text-xs mt-1">
                {roleCheckError 
                  ? (roleCheckError as Error).message 
                  : 'An error occurred while checking the admin role. Please try again.'}
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Check History */}
      {checkHistory.length > 0 && !hideForm && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-300">Recent Checks</h4>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="text-xs text-amber-400 hover:text-amber-300 flex items-center focus:outline-none"
            >
              {showHistory ? 'Hide History' : 'Show History'}
              <svg className={`ml-1 w-4 h-4 transition-transform ${showHistory ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
          
          {showHistory && (
            <div className="bg-gray-700/20 rounded-lg p-2 mt-2">
              <ul className="divide-y divide-gray-700">
                {checkHistory.map((item, index) => (
                  <li key={index} className="py-2 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className={`w-2 h-2 rounded-full ${item.hasRole ? 'bg-green-500' : 'bg-red-500'} mr-2`}></div>
                        <button
                          onClick={() => setAddressFromHistory(item.address)}
                          className="text-blue-400 hover:text-blue-300 font-mono text-xs hover:underline"
                        >
                          {item.address.substring(0, 10)}...{item.address.substring(item.address.length - 8)}
                        </button>
                      </div>
                      <div className="flex items-center">
                        <span className={`text-xs ${item.hasRole ? 'text-green-400' : 'text-red-400'} mr-3`}>
                          {item.hasRole ? 'Admin' : 'Not Admin'}
                        </span>
                        <span className="text-xs text-gray-400">
                          {formatDistanceToNow(item.timestamp, { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      
      {/* Educational Information */}
      {!hideForm && (
        <div className="mt-6 pt-4 border-t border-gray-700">
          <h4 className="text-sm font-medium text-gray-300 mb-2">About Admin Role Checks</h4>
          <p className="text-sm text-gray-400 mb-3">
            The Admin Role Checker allows you to verify if a specific Ethereum address has been granted admin privileges in the system.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <div className="bg-gray-700/20 rounded-md p-3">
              <h5 className="text-xs font-medium text-amber-400 mb-1">Admin Privileges</h5>
              <p className="text-xs text-gray-400">
                Addresses with admin privileges can perform sensitive operations such as updating fee structures, pausing contracts, and managing system configurations.
              </p>
            </div>
            
            <div className="bg-gray-700/20 rounded-md p-3">
              <h5 className="text-xs font-medium text-amber-400 mb-1">Security Considerations</h5>
              <p className="text-xs text-gray-400">
                Admin roles should be granted with caution and only to trusted entities. Regular audits of admin privileges help maintain system security.
              </p>
            </div>
          </div>
          
          <p className="text-xs text-gray-400">
            This role check verifies permissions against the blockchain's current state. If an address recently gained or lost admin privileges, those changes will be reflected in the check results.
          </p>
        </div>
      )}
    </motion.div>
  );
};

// Export a utility hook for checking admin roles
export const useAdminRoleCheck = (defaultAddress?: string) => {
  const [roleData, setRoleData] = useState<AdminRoleData | null>(null);
  
  const handleRoleDataChange = (data: AdminRoleData | null) => {
    setRoleData(data);
  };
  
  // Return both the component and the current data
  return {
    RoleCheckerComponent: () => (
      <AdminRoleChecker
        defaultAddress={defaultAddress}
        onRoleDataChange={handleRoleDataChange}
        hideForm={!!defaultAddress}
      />
    ),
    data: roleData,
    // Method to programmatically check a role
    checkRole: (address?: string) => {
      if (typeof window !== 'undefined' && (window as any).__adminRoleCheck) {
        (window as any).__adminRoleCheck(address);
      }
    }
  };
};

export default AdminRoleChecker;