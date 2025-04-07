import { useState, useEffect } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { motion } from 'framer-motion';
import RoleChecker, { useRoleChecker, RoleCheckerData } from '../../MSTReadfunction/AttendaceRead/hasRole';

// Predefined roles for selection - replace these with actual role constants from your contract
const PREDEFINED_ROLES = {
  "ADMIN_ROLE": "0x0000000000000000000000000000000000000000000000000000000000000000",
  "PROGRAM_MANAGER_ROLE": "0x7fab940a61ea2dbd47aca7449d99e95b1c9ea29dcad8f56e9a7a47f1e2989d11",
  "EDUCATOR_ROLE": "0x22976f7f83a7c9f912b9cf4bad5d23d14f64943c5de369cb54d95f68132led46",
  "STUDENT_ROLE": "0x4c5a99d76b63156c595e0f5e6d205b0b035c900015b44074d97e5eefdf156e64"
};

// Custom utility for validating Ethereum addresses
const isValidEthAddress = (address: string) => {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

const RenounceRoleComponent = ({ contract, connectedAddress }: { contract: any, connectedAddress: string }) => {
  // Form state
  const [selectedRole, setSelectedRole] = useState('');
  const [customRole, setCustomRole] = useState('');
  const [useCustomRole, setUseCustomRole] = useState(false);
  
  // UI state
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState<'success' | 'error' | 'info' | 'warning'>('info');
  const [showStatus, setShowStatus] = useState(false);
  const [processingState, setProcessingState] = useState<'initial' | 'verifying' | 'processing' | 'completed'>('initial');
  
  // Transaction state
  const { data: hash, isPending, writeContract, error: writeError, reset: resetWrite } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed, error: confirmError } = useWaitForTransactionReceipt({ hash });

  // Role verification state
  const [isVerified, setIsVerified] = useState(false);
  const [showRoleChecker, setShowRoleChecker] = useState(false);
  const { setData: setRoleCheckerData } = useRoleChecker();

  // Determine which role value to use
  const getRoleValue = () => {
    return useCustomRole ? customRole : selectedRole;
  };
  
  // Read contract to check role before renouncing
  const { 
    data: hasRoleResult,
    isError: isRoleCheckError,
    error: roleCheckError,
    isPending: isRoleCheckPending,
    refetch: refetchRole
  } = useReadContract({
    ...contract,
    functionName: 'hasRole',
    args: [getRoleValue(), connectedAddress],
    enabled: processingState === 'verifying' && !!getRoleValue() && !!connectedAddress
  });

  // Handle role verification completion
  useEffect(() => {
    if (processingState === 'verifying' && !isRoleCheckPending) {
      if (isRoleCheckError) {
        setStatusMessage(`Error checking role: ${roleCheckError?.message || "Unknown error"}`);
        setStatusType('error');
        setShowStatus(true);
        setProcessingState('initial');
        return;
      }
      
      if (hasRoleResult === false) {
        setStatusMessage(`You do not have the specified role. No action needed.`);
        setStatusType('warning');
        setShowStatus(true);
        setProcessingState('initial');
        return;
      }
      
      if (hasRoleResult === true) {
        setIsVerified(true);
        setStatusMessage(`You have the role. Ready to renounce.`);
        setStatusType('info');
        setShowStatus(true);
        setProcessingState('initial');
      }
    }
  }, [hasRoleResult, isRoleCheckPending, isRoleCheckError, roleCheckError, processingState]);

  // Handle transaction success
  useEffect(() => {
    if (isConfirmed && hash) {
      setStatusMessage(`Role successfully renounced!`);
      setStatusType('success');
      setShowStatus(true);
      setProcessingState('completed');
    }
  }, [isConfirmed, hash]);

  // Handle transaction errors
  useEffect(() => {
    if (writeError || confirmError) {
      const errorMessage = writeError?.message || confirmError?.message || 'An unknown error occurred';
      setStatusMessage(`Transaction failed: ${errorMessage}`);
      setStatusType('error');
      setShowStatus(true);
      setProcessingState('initial');
    }
  }, [writeError, confirmError]);

  // Hide status message after a delay
  useEffect(() => {
    if (showStatus) {
      const timer = setTimeout(() => {
        setShowStatus(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showStatus]);

  // Reset verification when inputs change
  useEffect(() => {
    setIsVerified(false);
  }, [selectedRole, customRole, useCustomRole]);

  // Handle the verification step
  const handleVerifyRole = async () => {
    try {
      // Validate inputs
      const roleValue = getRoleValue();
      if (!roleValue) {
        setStatusMessage('Please select or enter a role');
        setStatusType('error');
        setShowStatus(true);
        return;
      }
      
      if (!connectedAddress || !isValidEthAddress(connectedAddress)) {
        setStatusMessage('Invalid connected wallet address');
        setStatusType('error');
        setShowStatus(true);
        return;
      }
      
      // Set to verifying state
      setProcessingState('verifying');
      setStatusMessage('Checking if you have the role...');
      setStatusType('info');
      setShowStatus(true);
      
      // The check will happen via the useReadContract hook
      refetchRole();
    } catch (err) {
      console.error('Error verifying role:', err);
      setStatusMessage(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setStatusType('error');
      setShowStatus(true);
      setProcessingState('initial');
    }
  };

  // Handle the renounce role process
  const handleRenounceRole = async () => {
    try {
      // Reset any previous errors
      resetWrite?.();
      
      // Validate verification
      if (!isVerified) {
        setStatusMessage('Please verify the role first');
        setStatusType('error');
        setShowStatus(true);
        return;
      }
      
      // Update UI state
      setProcessingState('processing');
      setStatusMessage('Submitting transaction to renounce role...');
      setStatusType('info');
      setShowStatus(true);
      
      // Execute the contract write
      writeContract({
        ...contract,
        functionName: 'renounceRole',
        args: [
          getRoleValue(),
          connectedAddress
        ]
      });
    } catch (err) {
      console.error('Error renouncing role:', err);
      setStatusMessage(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setStatusType('error');
      setShowStatus(true);
      setProcessingState('initial');
    }
  };

  // Handle role checker data changes
  const handleRoleCheckerDataChange = (data: RoleCheckerData) => {
    // You can use this data if needed
    setRoleCheckerData(data);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-gray-900/90 backdrop-blur-sm border border-gray-700 shadow-xl rounded-lg p-6 max-w-full mx-auto w-full md:max-w-full mb-9"
    >
      <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
        Renounce Role
      </h2>
      
      <p className="text-gray-300 text-sm mb-6">
        Voluntarily give up a role assigned to your account.
      </p>

      {/* Connected Wallet Info */}
      <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 mb-6">
        <div className="flex items-start">
          <div className="flex-shrink-0 mt-0.5">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3 text-sm text-gray-300">
            <p className="mb-2">
              You are connected with address:
            </p>
            <div className="font-mono bg-gray-800 p-2 rounded-md text-xs overflow-x-auto break-all">
              {connectedAddress || 'No wallet connected'}
            </div>
          </div>
        </div>
      </div>

      {/* Toggle for Role Checker */}
      <div className="mb-6">
        <button
          onClick={() => setShowRoleChecker(!showRoleChecker)}
          className="text-sm flex items-center text-blue-400 hover:text-blue-300 transition-colors"
        >
          <span className="mr-2">{showRoleChecker ? 'Hide' : 'Show'} Role Checker</span>
          <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-transform ${showRoleChecker ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
        
        {showRoleChecker && (
          <div className="mt-4">
            <RoleChecker 
              onDataChange={handleRoleCheckerDataChange}
            />
          </div>
        )}
      </div>

      {/* Status Messages */}
      {showStatus && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className={`p-3 rounded-md mb-6 ${
            statusType === 'success' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 
            statusType === 'error' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 
            statusType === 'warning' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
            'bg-blue-500/20 text-blue-400 border border-blue-500/30'
          }`}
        >
          <p className="text-sm">{statusMessage}</p>
          {hash && (
            <div className="mt-2 pt-2 border-t border-gray-700">
              <p className="text-xs">Transaction Hash:</p>
              <div className="flex items-center mt-1">
                <p className="text-xs font-mono truncate">{hash}</p>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(hash);
                    setStatusMessage('Transaction hash copied to clipboard!');
                    setStatusType('success');
                  }}
                  className="ml-2 p-1 bg-gray-800 hover:bg-gray-700 rounded text-gray-300"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                    <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Transaction Progress */}
      {((isPending || isConfirming) && processingState === 'processing') && (
        <div className="flex flex-col items-center justify-center p-4 border border-gray-700 rounded-md bg-gray-800/50 mb-6">
          <div className="flex items-center justify-center mb-3">
            <div className="w-8 h-8 border-4 border-t-blue-400 border-r-purple-500 border-b-blue-400 border-l-purple-500 rounded-full animate-spin mr-3"></div>
            <span className="text-gray-300">{isPending ? 'Waiting for wallet approval...' : 'Confirming transaction...'}</span>
          </div>
          <p className="text-xs text-gray-400 text-center">
            {isPending 
              ? 'Please confirm this transaction in your wallet' 
              : 'Transaction has been submitted. Waiting for blockchain confirmation...'}
          </p>
        </div>
      )}
      
      {/* Role Check Progress */}
      {isRoleCheckPending && processingState === 'verifying' && (
        <div className="flex flex-col items-center justify-center p-4 border border-gray-700 rounded-md bg-gray-800/50 mb-6">
          <div className="flex items-center justify-center mb-3">
            <div className="w-8 h-8 border-4 border-t-blue-400 border-r-purple-500 border-b-blue-400 border-l-purple-500 rounded-full animate-spin mr-3"></div>
            <span className="text-gray-300">Checking role assignment...</span>
          </div>
          <p className="text-xs text-gray-400 text-center">
            Querying the blockchain to verify if you have the specified role.
          </p>
        </div>
      )}

      {/* Initial State with Form */}
      {processingState === 'initial' && (
        <div className="space-y-6">
          {/* Role Input Form */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <input 
                type="checkbox" 
                id="useCustomRoleRenounce" 
                checked={useCustomRole}
                onChange={() => setUseCustomRole(!useCustomRole)}
                className="h-4 w-4 text-blue-500 focus:ring-blue-500 border-gray-700 rounded bg-gray-800"
              />
              <label htmlFor="useCustomRoleRenounce" className="block text-sm font-medium text-gray-300">
                Use custom role hash
              </label>
            </div>
            
            {!useCustomRole ? (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">
                  Select Role
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="block w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-300 text-sm"
                >
                  <option value="">Select a role...</option>
                  {Object.entries(PREDEFINED_ROLES).map(([name, value]) => (
                    <option key={value} value={value}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">
                  Custom Role (bytes32)
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <input
                    type="text"
                    value={customRole}
                    onChange={(e) => setCustomRole(e.target.value)}
                    className="block w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-300 text-sm font-mono"
                    placeholder="0x0000000000000000000000000000000000000000000000000000000000000000"
                  />
                </div>
              </div>
            )}
          </div>
          
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-md p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0 mt-0.5">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-orange-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-orange-400">Warning</h3>
                <p className="mt-1 text-sm text-gray-300">
                  This action cannot be undone. Once you renounce a role, you will immediately lose
                  all privileges associated with that role and will need an administrator to reassign it.
                </p>
              </div>
            </div>
          </div>
          
          {/* Two-Step Action Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <motion.button
              onClick={handleVerifyRole}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={isRoleCheckPending || !getRoleValue()}
              className={`py-3 px-4 rounded-md text-white font-medium shadow-lg transition-all duration-300 ${
                'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'
              } ${
                isRoleCheckPending || !getRoleValue() ? 'opacity-70 cursor-not-allowed' : 'opacity-100'
              }`}
            >
              {isRoleCheckPending ? 'Checking...' : 'Verify Role'}
            </motion.button>
            
            <motion.button
              onClick={handleRenounceRole}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={!isVerified || isPending || isConfirming}
              className={`py-3 px-4 rounded-md text-white font-medium shadow-lg transition-all duration-300 ${
                'bg-gradient-to-r from-orange-500 to-pink-600 hover:from-orange-600 hover:to-pink-700'
              } ${
                !isVerified || isPending || isConfirming ? 'opacity-70 cursor-not-allowed' : 'opacity-100'
              }`}
            >
              Renounce Role
            </motion.button>
          </div>
          
          {/* Verification Status */}
          {isVerified && (
            <div className="p-3 bg-green-500/20 border border-green-500/30 rounded-md text-green-400 text-sm">
              ✓ Verification successful! You currently have this role and can renounce it.
            </div>
          )}
        </div>
      )}

      {/* Completed State */}
      {processingState === 'completed' && (
        <div className="space-y-6">
          <div className="bg-green-900/30 border border-green-700/50 rounded-md p-4 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto mb-2 text-green-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <h3 className="text-lg font-semibold text-green-400">Role Successfully Renounced</h3>
            <p className="text-sm text-gray-300 mt-2">
              You have voluntarily given up the specified role.
              The changes have been applied immediately.
            </p>
          </div>
          
          {/* Action Summary */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-md p-4">
            <h3 className="text-md font-semibold text-blue-400 mb-4">Action Summary</h3>
            
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-1">
                <p className="text-xs text-gray-400">Role</p>
                <p className="text-sm font-mono bg-gray-800 p-2 rounded-md text-gray-200 break-all">
                  {getRoleValue()}
                </p>
              </div>
              
              <div className="grid grid-cols-1 gap-1">
                <p className="text-xs text-gray-400">Account Address</p>
                <p className="text-sm font-mono bg-gray-800 p-2 rounded-md text-gray-200 break-all">
                  {connectedAddress}
                </p>
              </div>
            </div>
          </div>
          
          {/* Transaction Details */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-md p-4">
            <h3 className="text-md font-semibold text-blue-400 mb-2">Transaction Details</h3>
            
            <div className="mt-3">
              <p className="text-sm text-gray-400 mb-1">Transaction Hash</p>
              <div className="flex items-center">
                <div className="font-mono text-xs bg-gray-800 p-2 rounded-md text-gray-300 overflow-x-auto max-w-full flex-1 break-all">
                  {hash}
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(hash || '');
                    setStatusMessage('Transaction hash copied to clipboard!');
                    setStatusType('success');
                    setShowStatus(true);
                  }}
                  className="ml-2 p-2 bg-gray-700 hover:bg-gray-600 rounded-md text-gray-300"
                  title="Copy to clipboard"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                    <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
          
          {/* Reset Button */}
          <motion.button
            onClick={() => {
              setProcessingState('initial');
              if (!useCustomRole) setSelectedRole('');
              if (useCustomRole) setCustomRole('');
              setIsVerified(false);
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium rounded-md shadow-lg transition-all duration-300"
          >
            Renounce Another Role
          </motion.button>
        </div>
      )}
    </motion.div>
  );
};

export default RenounceRoleComponent;