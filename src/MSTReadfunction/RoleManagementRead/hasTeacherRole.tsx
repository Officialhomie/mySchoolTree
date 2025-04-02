import { useState, useEffect } from 'react';
import { useReadContract, useAccount } from 'wagmi';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';

/**
 * TeacherRoleChecker Component
 * 
 * This component allows users to check if a specific address has teacher privileges
 * by calling the hasTeacherRole function.
 */
interface TeacherRoleCheckerProps {
  roleContract: any; // Contract for checking teacher role
  onCheckComplete?: (result: boolean, address: string) => void; // Optional callback
}

const TeacherRoleChecker = ({
  roleContract,
  onCheckComplete
}: TeacherRoleCheckerProps) => {
  // Current user's address
  const { address: connectedAddress } = useAccount();
  
  // Form state
  const [accountToCheck, setAccountToCheck] = useState<string>('');
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [isFormValid, setIsFormValid] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isCheckingConnectedAccount, setIsCheckingConnectedAccount] = useState<boolean>(true);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  
  // Log state for debugging
  useEffect(() => {
    console.log('TeacherRoleChecker state:', {
      accountToCheck,
      lastChecked,
      isFormValid,
      errorMessage,
      isCheckingConnectedAccount,
      showHistory
    });
  }, [accountToCheck, lastChecked, isFormValid, errorMessage, isCheckingConnectedAccount, showHistory]);
  
  // Track check history
  const [checkHistory, setCheckHistory] = useState<Array<{
    address: string;
    hasRole: boolean;
    timestamp: Date;
  }>>([]);
  
  // Set connected address as default when component loads
  useEffect(() => {
    if (connectedAddress && accountToCheck === '') {
      setAccountToCheck(connectedAddress);
    }
  }, [connectedAddress, accountToCheck]);
  
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
    ...roleContract,
    functionName: 'hasTeacherRole',
    args: isFormValid ? [accountToCheck as `0x${string}`] : undefined,
    query: {
      enabled: isFormValid
    }
  });
  
  // Helper to format time since last check
  const getTimeSinceLastCheck = () => {
    if (!lastChecked) return 'Never checked';
    return formatDistanceToNow(lastChecked, { addSuffix: true });
  };
  
  // Check teacher role for the address
  const handleCheckRole = () => {
    // Validate input data
    if (!isFormValid) {
      setErrorMessage('Please enter a valid Ethereum address');
      return;
    }
    
    setErrorMessage('');
    refetchRoleCheck().then((result) => {
      setLastChecked(new Date());
      
      // Add to history if successful
      if (result.data !== undefined) {
        // Limit history to last 5 checks
        const newHistory = [
          {
            address: accountToCheck,
            hasRole: result.data as boolean,
            timestamp: new Date()
          },
          ...checkHistory
        ].slice(0, 5);
        
        setCheckHistory(newHistory);
        
        // Call completion callback if provided
        if (onCheckComplete) {
          onCheckComplete(result.data as boolean, accountToCheck);
        }
      }
    }).catch((error) => {
      console.error('Error checking role:', error);
      setErrorMessage('Error checking teacher role: ' + error.message);
    });
  };
  
  // Set account to check from history
  const setAddressFromHistory = (address: string) => {
    setAccountToCheck(address);
  };
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-gray-800/50 border border-gray-700 rounded-lg p-4"
    >
      <h3 className="text-lg font-medium text-amber-400 mb-3">
        Teacher Role Checker
      </h3>
      
      {/* Check Form */}
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
            Enter the Ethereum address to check for teacher role privileges
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
              Checking Teacher Role...
            </>
          ) : (
            <>
              <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Check Teacher Role
            </>
          )}
        </button>
        
        {/* Role Status Result */}
        {isFormValid && hasRoleData !== undefined && !isRoleCheckError && (
          <div className={`w-full rounded-lg p-4 flex items-center justify-between ${
            hasRoleData
              ? 'bg-blue-900/20 border border-blue-700/30'
              : 'bg-red-900/20 border border-red-700/30'
          }`}>
            <div className="flex items-center">
              {hasRoleData ? (
                <>
                  <div className="w-3 h-3 bg-blue-500 rounded-full mr-3 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  </div>
                  <div>
                    <h4 className="text-md font-medium text-blue-400">Teacher Role Granted</h4>
                    <p className="text-xs text-gray-300 mt-0.5">
                      {accountToCheck.substring(0, 6)}...{accountToCheck.substring(accountToCheck.length - 4)} has teacher privileges
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-3 h-3 bg-red-500 rounded-full mr-3"></div>
                  <div>
                    <h4 className="text-md font-medium text-red-400">No Teacher Role</h4>
                    <p className="text-xs text-gray-300 mt-0.5">
                      {accountToCheck.substring(0, 6)}...{accountToCheck.substring(accountToCheck.length - 4)} does not have teacher privileges
                    </p>
                  </div>
                </>
              )}
            </div>
            <div>
              <p className="text-xs text-gray-400">
                Last checked {getTimeSinceLastCheck()}
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
                    : 'An error occurred while checking the teacher role. Please try again.'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Check History */}
      {checkHistory.length > 0 && (
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
                        <div className={`w-2 h-2 rounded-full ${item.hasRole ? 'bg-blue-500' : 'bg-red-500'} mr-2`}></div>
                        <button
                          onClick={() => setAddressFromHistory(item.address)}
                          className="text-blue-400 hover:text-blue-300 font-mono text-xs hover:underline"
                        >
                          {item.address.substring(0, 10)}...{item.address.substring(item.address.length - 8)}
                        </button>
                      </div>
                      <div className="flex items-center">
                        <span className={`text-xs ${item.hasRole ? 'text-blue-400' : 'text-red-400'} mr-3`}>
                          {item.hasRole ? 'Teacher' : 'Not Teacher'}
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
      <div className="mt-6 pt-4 border-t border-gray-700">
        <h4 className="text-sm font-medium text-gray-300 mb-2">About Teacher Role</h4>
        <p className="text-sm text-gray-400 mb-3">
          The Teacher Role Checker allows you to verify if a specific Ethereum address has been granted teacher privileges in the system.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <div className="bg-gray-700/20 rounded-md p-3">
            <h5 className="text-xs font-medium text-amber-400 mb-1">Teacher Privileges</h5>
            <p className="text-xs text-gray-400">
              Teachers have the ability to create and manage educational content, oversee student enrollments, administer assessments, and issue credentials within their assigned courses and programs.
            </p>
          </div>
          
          <div className="bg-gray-700/20 rounded-md p-3">
            <h5 className="text-xs font-medium text-amber-400 mb-1">Role Assignment</h5>
            <p className="text-xs text-gray-400">
              The teacher role is typically assigned by school administrators and can be associated with specific educational institutions or programs within the platform.
            </p>
          </div>
        </div>
        
        <div className="bg-gray-700/20 rounded-md p-3 mb-3">
          <h5 className="text-xs font-medium text-amber-400 mb-1">Teacher Capabilities</h5>
          <p className="text-xs text-gray-400 mb-2">
            Teachers on the platform can typically perform these functions:
          </p>
          <ul className="text-xs text-gray-400 space-y-2">
            <li className="flex items-start">
              <span className="text-blue-400 mr-2">•</span>
              <span><strong>Content Creation:</strong> Develop and publish educational materials and courses</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-400 mr-2">•</span>
              <span><strong>Student Management:</strong> Review and approve student enrollments and track progress</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-400 mr-2">•</span>
              <span><strong>Assessment:</strong> Create and grade assignments, quizzes, and exams</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-400 mr-2">•</span>
              <span><strong>Certification:</strong> Issue digital credentials and certificates of completion</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-400 mr-2">•</span>
              <span><strong>Revenue:</strong> Receive compensation based on platform's revenue sharing model</span>
            </li>
          </ul>
        </div>
        
        <p className="text-xs text-gray-400">
          The teacher role check verifies permissions against the blockchain's current state. If an address recently gained or lost teacher privileges, those changes will be reflected in the check results.
        </p>
      </div>
    </motion.div>
  );
};

export default TeacherRoleChecker;