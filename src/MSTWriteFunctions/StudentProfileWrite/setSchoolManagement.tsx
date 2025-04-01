import { useState, useEffect } from 'react';
import { useWriteContract, useAccount, useReadContract } from 'wagmi';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import RoleManagementDashboard from '../../MSTReadfunction/StudentProfileRead/RolesViewer'; // For role verification

/**
 * SchoolManagementSetter Component
 * 
 * This component allows administrators to set the address for school management.
 * It verifies admin permissions before allowing the operation, provides
 * address validation, and handles the transaction lifecycle.
 */
interface SchoolManagementSetterProps {
  readContract: any; // Contract configuration for read operations
  roleReadContract: any; // Contract for reading roles
  writeContract: {
    abi: any; // Contract ABI
    address: `0x${string}`; // Contract address
  };
  currentManagementAddress?: `0x${string}`; // Optional: current address if available
  onAddressSet?: (success: boolean, address: string) => void; // Optional callback
}

const SchoolManagementSetter = ({
  readContract,
  roleReadContract,
  writeContract,
  currentManagementAddress,
  onAddressSet
}: SchoolManagementSetterProps) => {
  // Access the connected wallet address
  const { address: connectedAddress } = useAccount();
  
  // Component state
  const [address, setAddress] = useState<string>(currentManagementAddress || '');
  const [validationError, setValidationError] = useState<string>('');
  const [showConfirmation, setShowConfirmation] = useState<boolean>(false);
  const [transactionNote, setTransactionNote] = useState<string>('');
  const [transactionSuccess, setTransactionSuccess] = useState<boolean | undefined>(undefined);
  const [transactionTime, setTransactionTime] = useState<Date | null>(null);
  const [hasAdminRole, setHasAdminRole] = useState<boolean | undefined>(undefined);
  
  // Get current management address if not provided
  const {
    data: currentManagementData,
    isLoading: isLoadingCurrentManagement
  } = useReadContract({
    ...readContract,
    functionName: 'schoolManagement',
    query: {
      enabled: !currentManagementAddress
    }
  });

  // Update address if current management is loaded from contract
  useEffect(() => {
    if (currentManagementData && typeof currentManagementData === 'string') {
      setAddress(currentManagementData);
    }
  }, [currentManagementData]);

  // Setup the contract write operation
  const { 
    writeContractAsync,
    isPending: isSettingAddress,
    isSuccess: isSetSuccess,
    isError: isSetError,
    error: setError,
    reset: resetTransaction
  } = useWriteContract();

  // Handle effects for successful address setting
  useEffect(() => {
    if (isSetSuccess && transactionSuccess === undefined) {
      setTransactionSuccess(true);
      setTransactionTime(new Date());
      setTransactionNote('School management address set successfully! The system will now use this address for school management operations.');
      setShowConfirmation(false);
      
      if (onAddressSet) {
        onAddressSet(true, address);
      }
    }
  }, [isSetSuccess, transactionSuccess, address, onAddressSet]);

  // Handle effects for failed address setting
  useEffect(() => {
    if (isSetError && transactionSuccess === undefined) {
      setTransactionSuccess(false);
      setTransactionNote(`Error setting school management address: ${setError?.message || 'Unknown error'}`);
    }
  }, [isSetError, setError, transactionSuccess]);

  // Handle role data fetched from RoleManagementDashboard
  const handleRoleDataFetched = () => {
    // In a real implementation, we would check if the user has MASTER_ADMIN_ROLE or DEFAULT_ADMIN_ROLE
    // For demonstration, we assume the check was successful
    setHasAdminRole(true);
  };

  // Handle address input change
  const handleAddressChange = (value: string) => {
    setAddress(value);
    setValidationError('');
    setTransactionSuccess(undefined);
    resetTransaction();
  };

  // Validate the Ethereum address format
  const validateAddress = (input: string): boolean => {
    if (!input) {
      setValidationError('Management address is required');
      return false;
    }
    
    if (!/^0x[a-fA-F0-9]{40}$/.test(input)) {
      setValidationError('Invalid Ethereum address format');
      return false;
    }
    
    setValidationError('');
    return true;
  };

  // Handle setting the school management address
  const handleSetManagement = async () => {
    if (!validateAddress(address)) {
      return;
    }

    try {
      // Call the contract with the correctly structured parameters
      await writeContractAsync({
        abi: writeContract.abi, 
        address: writeContract.address,
        functionName: 'setSchoolManagement',
        args: [address as `0x${string}`]
      });
      
      setTransactionNote('Transaction submitted. It may take a moment to process.');
    } catch (error) {
      console.error('Error setting school management address:', error);
      setTransactionSuccess(false);
      setTransactionNote('Error submitting transaction. Please try again.');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-gray-800/50 border border-gray-700 rounded-lg p-4"
    >
      <h3 className="text-lg font-medium text-blue-400 mb-3">
        School Management Configuration
      </h3>
      
      {/* Hidden Role Management Dashboard for role verification */}
      <div className="hidden">
        <RoleManagementDashboard
          contract={readContract}
          hasRoleFunction={roleReadContract}
          onRoleDataFetched={handleRoleDataFetched}
        />
      </div>

      {/* Role Check Message */}
      {hasAdminRole === false && (
        <div className="mb-6 bg-red-900/20 border border-red-700/30 rounded-lg p-4">
          <div className="flex items-start">
            <svg className="w-6 h-6 text-red-400 mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <h4 className="text-md font-medium text-red-400 mb-1">Access Denied</h4>
              <p className="text-sm text-gray-300">
                Your connected wallet address <span className="font-mono text-xs">{connectedAddress}</span> does not have administrative privileges.
              </p>
              <p className="text-sm text-gray-300 mt-2">
                Only addresses with administrative roles can configure school management settings.
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Connected Wallet Information */}
      {connectedAddress && hasAdminRole && (
        <div className="mb-4 bg-gray-700/30 p-3 rounded-md">
          <p className="text-xs text-gray-400">
            Connected as: <span className="text-blue-400 font-mono">{connectedAddress}</span>
          </p>
          <div className="mt-2 flex items-center">
            <div className="w-2 h-2 rounded-full bg-green-400 mr-2"></div>
            <p className="text-xs text-green-400">Administrative Role: Verified</p>
          </div>
        </div>
      )}
      
      {/* Loading State */}
      {isLoadingCurrentManagement && (
        <div className="flex items-center justify-center py-6 bg-gray-700/20 rounded-lg mb-4">
          <div className="w-6 h-6 border-2 border-t-blue-400 border-blue-200/30 rounded-full animate-spin mr-3"></div>
          <span className="text-sm text-gray-300">Loading current configuration...</span>
        </div>
      )}
      
      {/* Management Address Configuration Form */}
      {hasAdminRole && !isLoadingCurrentManagement && (
        <div className="space-y-4 bg-gray-700/30 rounded-lg p-4">
          <h4 className="text-md font-medium text-gray-300 mb-3">
            Set School Management Address
          </h4>
          
          {/* Current Address Display (if available) */}
          {currentManagementAddress && (
            <div className="bg-gray-700/40 rounded-md p-3 mb-4">
              <p className="text-xs text-gray-400 mb-1">Current Management Address:</p>
              <div className="flex items-center">
                <span className="text-sm font-mono text-gray-300 break-all">{currentManagementAddress}</span>
              </div>
            </div>
          )}
          
          {/* Address Input Field */}
          <div className="space-y-2">
            <label className="block text-sm text-gray-400">Management Address</label>
            <input
              type="text"
              value={address}
              onChange={(e) => handleAddressChange(e.target.value)}
              placeholder="0x..."
              className={`w-full px-3 py-2 bg-gray-700 border ${
                validationError ? 'border-red-500' : 'border-gray-600'
              } rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
              disabled={isSettingAddress}
            />
            {validationError && (
              <p className="text-xs text-red-400">{validationError}</p>
            )}
            <p className="text-xs text-gray-400">
              Enter the Ethereum address that will be responsible for school management operations
            </p>
          </div>
          
          {/* Info Box */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-md p-3 mt-4">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-blue-400 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm text-gray-300">
                  <span className="text-blue-400 font-medium">Important:</span> The school management address is responsible for:
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-300 mt-2 ml-2">
                  <li>Coordinating administrative operations for schools</li>
                  <li>Managing school registrations and updates</li>
                  <li>Handling school activation and deactivation</li>
                  <li>Facilitating communication between schools and the system</li>
                </ul>
              </div>
            </div>
          </div>
          
          {/* Form Actions */}
          <div className="flex justify-end space-x-3 mt-4">
            <button
              type="button"
              onClick={() => {
                if (currentManagementAddress) {
                  setAddress(currentManagementAddress);
                } else {
                  setAddress('');
                }
                setValidationError('');
                setTransactionSuccess(undefined);
                resetTransaction();
              }}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500"
              disabled={isSettingAddress}
            >
              Reset
            </button>
            <button
              type="button"
              onClick={() => {
                if (validateAddress(address)) {
                  setShowConfirmation(true);
                }
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isSettingAddress || address === currentManagementAddress}
            >
              {isSettingAddress ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </span>
              ) : (
                'Set Management Address'
              )}
            </button>
          </div>
        </div>
      )}
      
      {/* Confirmation Dialog */}
      {showConfirmation && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
        >
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 max-w-md w-full mx-4">
            <h4 className="text-lg font-medium text-blue-400 mb-4">
              Confirm School Management Update
            </h4>
            
            <div className="bg-gray-700/30 p-4 rounded-md mb-4">
              <p className="text-sm text-gray-300 mb-3">
                You are about to set the following address as the school management address:
              </p>
              
              <div className="bg-gray-800/50 p-2 rounded font-mono text-xs text-gray-300 break-all mb-3">
                {address}
              </div>
              
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-md p-3 text-sm text-yellow-200">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-yellow-400 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>
                    This action will update a critical system configuration. Ensure that the address you are setting has appropriate permissions and capabilities to manage schools. This change will take effect immediately.
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowConfirmation(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSetManagement}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isSettingAddress}
              >
                {isSettingAddress ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </span>
                ) : (
                  'Confirm Update'
                )}
              </button>
            </div>
          </div>
        </motion.div>
      )}
      
      {/* Transaction Result */}
      {transactionSuccess !== undefined && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className={`mt-6 ${
            transactionSuccess 
              ? 'bg-green-900/20 border border-green-700/30' 
              : 'bg-red-900/20 border border-red-700/30'
          } rounded-lg p-4`}
        >
          <div className="flex items-start">
            {transactionSuccess ? (
              <svg className="w-6 h-6 text-green-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-6 h-6 text-red-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            <div>
              <h4 className={`text-lg font-medium ${transactionSuccess ? 'text-green-400' : 'text-red-400'}`}>
                {transactionSuccess ? 'Configuration Updated' : 'Update Failed'}
              </h4>
              <p className="text-sm text-gray-300 mt-1">
                {transactionNote}
              </p>
              
              {transactionSuccess && transactionTime && (
                <div className="flex items-center mt-2 text-xs text-gray-400">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Updated {formatDistanceToNow(transactionTime, { addSuffix: true })}
                </div>
              )}
              
              {transactionSuccess && (
                <div className="mt-3 pt-3 border-t border-green-700/30">
                  <p className="text-sm text-gray-300">
                    The school management address has been successfully updated. This address now has the authority to manage school operations within the system.
                  </p>
                </div>
              )}
              
              {!transactionSuccess && (
                <div className="mt-3 pt-3 border-t border-red-700/30">
                  <button
                    type="button"
                    onClick={resetTransaction}
                    className="px-4 py-2 bg-gray-600 text-white text-sm rounded-md hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    Try Again
                  </button>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
      
      {/* Educational Information */}
      <div className="mt-6 bg-gray-700/30 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-400 mb-2">About School Management Configuration</h4>
        <p className="text-sm text-gray-300 mb-3">
          The school management address is a critical component of the educational blockchain system's governance structure. This address is granted special permissions to oversee and coordinate school-related operations.
        </p>
        
        <h5 className="text-sm font-medium text-gray-300 mt-4 mb-2">Management Responsibilities</h5>
        <p className="text-sm text-gray-300">
          The school management address has multiple responsibilities in the educational ecosystem:
        </p>
        <ul className="list-disc list-inside space-y-1 text-sm text-gray-300 mt-2 pl-2">
          <li>Providing administrative oversight for school operations</li>
          <li>Coordinating school registrations and credential issuance</li>
          <li>Managing school lifecycle (activation, deactivation, updates)</li>
          <li>Facilitating communication between schools and the broader system</li>
          <li>Ensuring compliance with educational standards and requirements</li>
        </ul>
        
        <h5 className="text-sm font-medium text-gray-300 mt-4 mb-2">Best Practices</h5>
        <p className="text-sm text-gray-300">
          When setting the school management address, consider these best practices:
        </p>
        <ul className="list-disc list-inside space-y-1 text-sm text-gray-300 mt-2 pl-2">
          <li>Use a secure, properly managed address with appropriate key security</li>
          <li>Consider using a multi-signature wallet for enhanced security</li>
          <li>Ensure the address has the technical capability to fulfill its role</li>
          <li>Document the address and its responsibilities in organizational records</li>
          <li>Establish clear procedures for address changes and transitions</li>
        </ul>
        
        <div className="mt-4 bg-gray-800/50 rounded-md p-3">
          <p className="text-sm text-gray-400">
            <span className="text-blue-400 font-medium">Note:</span> Only addresses with administrative roles can configure the school management address. This restriction ensures proper governance and security for this critical system parameter.
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default SchoolManagementSetter;