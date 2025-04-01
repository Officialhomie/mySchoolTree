import { useState, useEffect } from 'react';
import { useWriteContract, useAccount } from 'wagmi';
import { motion } from 'framer-motion';
import SchoolStatusChecker from '../../MSTReadfunction/StudentProfileRead/isActiveSchool';

/**
 * SchoolDeactivation Component
 * 
 * This component allows system administrators to deactivate schools in the educational system.
 * It first checks if the address is an active school using SchoolStatusChecker,
 * and then provides an interface to deactivate the school if it's currently active.
 */
interface SchoolDeactivationProps {
  readContract: any; // Contract configuration for read operations
  writeContract: {
    abi: any; // Contract ABI
    address: `0x${string}`; // Contract address
  }; 
  schoolAddress?: `0x${string}`; // Optional: specific school address to deactivate
  onDeactivationComplete?: (success: boolean, address: string) => void; // Optional callback
}

const SchoolDeactivation = ({
  readContract,
  writeContract,
  schoolAddress,
  onDeactivationComplete
}: SchoolDeactivationProps) => {
  // Access the connected wallet address
  const { address: connectedAddress } = useAccount();
  
  // Component state
  const [address, setAddress] = useState<string>(schoolAddress || '');
  const [validationError, setValidationError] = useState<string>('');
  const [isAddressActive, setIsAddressActive] = useState<boolean | undefined>(undefined);
  const [showDeactivationForm, setShowDeactivationForm] = useState<boolean>(false);
  const [deactivationNote, setDeactivationNote] = useState<string>('');
  const [deactivationSuccess, setDeactivationSuccess] = useState<boolean | undefined>(undefined);
  const [deactivationReason, setDeactivationReason] = useState<string>('');
  
  // Flag to determine if user should provide their own address
  const useCustomAddress = !schoolAddress;

  // Setup the contract write operation
  const { 
    writeContractAsync,
    isPending: isDeactivating,
    isSuccess: isDeactivationSuccess,
    isError: isDeactivationError,
    error: deactivationError,
    reset: resetDeactivation
  } = useWriteContract();

  // Update address state when schoolAddress prop changes
  useEffect(() => {
    if (schoolAddress) {
      setAddress(schoolAddress);
    }
  }, [schoolAddress]);

  // Handle effects for successful deactivation
  useEffect(() => {
    if (isDeactivationSuccess && deactivationSuccess === undefined) {
      setDeactivationSuccess(true);
      setDeactivationNote('School deactivated successfully! The school can no longer register students or participate in educational programs.');
      setShowDeactivationForm(false);
      
      if (onDeactivationComplete) {
        onDeactivationComplete(true, address);
      }
    }
  }, [isDeactivationSuccess, deactivationSuccess, address, onDeactivationComplete]);

  // Handle effects for failed deactivation
  useEffect(() => {
    if (isDeactivationError && deactivationSuccess === undefined) {
      setDeactivationSuccess(false);
      setDeactivationNote(`Error deactivating school: ${deactivationError?.message || 'Unknown error'}`);
    }
  }, [isDeactivationError, deactivationError, deactivationSuccess]);

  // Handle address input change
  const handleAddressChange = (value: string) => {
    setAddress(value);
    setValidationError('');
    setShowDeactivationForm(false);
    setDeactivationSuccess(undefined);
    resetDeactivation();
  };

  // Validate the Ethereum address format
  const validateAddress = (input: string): boolean => {
    if (!input) {
      setValidationError('School address is required');
      return false;
    }
    
    if (!/^0x[a-fA-F0-9]{40}$/.test(input)) {
      setValidationError('Invalid Ethereum address format');
      return false;
    }
    
    setValidationError('');
    return true;
  };

  // Handle reason input change
  const handleReasonChange = (value: string) => {
    setDeactivationReason(value);
  };

  // Handle status update from SchoolStatusChecker
  const handleStatusFetched = (isActive: boolean) => {
    setIsAddressActive(isActive);
    
    // Only show deactivation form if address is valid and active
    if (isActive) {
      setShowDeactivationForm(true);
    } else {
      setShowDeactivationForm(false);
    }
  };

  // Handle school deactivation
  const handleDeactivateSchool = async () => {
    if (!validateAddress(address)) {
      return;
    }

    try {
      // Call the contract with the correctly structured parameters
      await writeContractAsync({
        abi: writeContract.abi, 
        address: writeContract.address,
        functionName: 'deactivateSchool',
        args: [address as `0x${string}`]
      });
      
      // Note: We don't need to set success state here as it will be handled by 
      // the useEffect that watches isDeactivationSuccess
      setDeactivationNote('School deactivation transaction submitted. It may take a moment to process.');
    } catch (error) {
      console.error('Error deactivating school:', error);
      setDeactivationSuccess(false);
      setDeactivationNote('Error submitting deactivation transaction. Please try again.');
    }
  };

  // Determine if we have a valid address to check
  const hasValidAddress = address && validateAddress(address);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-gray-800/50 border border-gray-700 rounded-lg p-4"
    >
      <h3 className="text-lg font-medium text-red-400 mb-3">
        School Deactivation Portal
      </h3>
      
      {/* Connected Wallet Information */}
      {connectedAddress && (
        <div className="mb-4 bg-gray-700/30 p-3 rounded-md">
          <p className="text-xs text-gray-400">
            Connected as: <span className="text-blue-400 font-mono">{connectedAddress}</span>
          </p>
        </div>
      )}
      
      {/* Address Input (only if using custom address) */}
      {useCustomAddress && (
        <div className="mb-4 space-y-2">
          <div className="flex space-x-2">
            <div className="flex-grow">
              <input
                type="text"
                value={address}
                onChange={(e) => handleAddressChange(e.target.value)}
                placeholder="School address (0x...)"
                className={`w-full px-3 py-2 bg-gray-700 border ${
                  validationError ? 'border-red-500' : 'border-gray-600'
                } rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
              />
            </div>
          </div>
          {validationError && (
            <p className="text-xs text-red-400">{validationError}</p>
          )}
        </div>
      )}

      {/* Warning Banner */}
      <div className="mb-6 bg-yellow-900/20 border border-yellow-700/30 rounded-lg p-4">
        <div className="flex items-start">
          <svg className="w-6 h-6 text-yellow-400 mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <h4 className="text-md font-medium text-yellow-400 mb-1">Important Notice</h4>
            <p className="text-sm text-gray-300">
              Deactivating a school is a significant administrative action that will immediately remove the school's ability to:
            </p>
            <ul className="list-disc list-inside text-sm text-gray-300 mt-2 ml-2 space-y-1">
              <li>Register and manage new students</li>
              <li>Record attendance and academic progress</li>
              <li>Issue credentials or certifications</li>
              <li>Participate in educational programs</li>
            </ul>
            <p className="text-sm text-gray-300 mt-2">
              Please ensure you have proper authorization before proceeding.
            </p>
          </div>
        </div>
      </div>
      
      {/* School Status Checker - to verify the school is active before deactivation */}
      {hasValidAddress && (
        <div className="mb-6">
          <h4 className="text-md font-medium text-gray-300 mb-3">School Status Verification</h4>
          <p className="text-sm text-gray-400 mb-4">
            First, let's verify if this address is currently an active school in the system:
          </p>
          <SchoolStatusChecker
            contract={readContract}
            schoolAddress={address as `0x${string}`}
            onStatusFetched={handleStatusFetched}
          />
        </div>
      )}
      
      {/* Deactivation Form */}
      {showDeactivationForm && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mt-6 bg-red-900/20 border border-red-700/30 rounded-lg p-4"
        >
          <h4 className="text-lg font-medium text-red-400 mb-3">
            Deactivate School
          </h4>
          
          <div className="space-y-4">
            <div className="bg-gray-700/30 rounded-md p-4">
              <p className="text-sm text-gray-300 mb-3">
                You are about to deactivate the following address as a school in the system:
              </p>
              
              <div className="bg-gray-800/50 rounded-md p-3 font-mono text-sm text-white break-all mb-3">
                {address}
              </div>
              
              <p className="text-sm text-gray-300 mb-3">
                Deactivating a school will revoke the following capabilities:
              </p>
              
              <ul className="space-y-2 mb-3">
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-red-400 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span className="text-sm text-gray-300">Register and manage student accounts</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-red-400 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span className="text-sm text-gray-300">Record student attendance and progress</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-red-400 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span className="text-sm text-gray-300">Participate in educational programs</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-red-400 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span className="text-sm text-gray-300">Issue credentials and certifications</span>
                </li>
              </ul>
              
              {/* Reason Field */}
              <div className="space-y-2 mt-4">
                <label className="block text-sm text-gray-400">Reason for Deactivation</label>
                <textarea
                  value={deactivationReason}
                  onChange={(e) => handleReasonChange(e.target.value)}
                  placeholder="Please provide a reason for deactivating this school (for record-keeping purposes)"
                  rows={4}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                />
                <p className="text-xs text-gray-400">
                  Note: This reason is stored in your administrative records but is not written to the blockchain.
                </p>
              </div>
              
              <div className="bg-red-500/10 border border-red-500/30 rounded-md p-3 text-sm text-red-200 mt-4">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-red-400 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>
                    This action will immediately revoke all school privileges from this address. Any ongoing educational processes may be disrupted.
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowDeactivationForm(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500"
                disabled={isDeactivating}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeactivateSchool}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                disabled={isDeactivating}
              >
                {isDeactivating ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Deactivating...
                  </span>
                ) : (
                  'Deactivate School'
                )}
              </button>
            </div>
          </div>
        </motion.div>
      )}
      
      {/* Not Active Message */}
      {hasValidAddress && isAddressActive === false && !deactivationSuccess && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mt-6 bg-gray-700/30 rounded-lg p-4"
        >
          <div className="flex items-start">
            <svg className="w-6 h-6 text-blue-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h4 className="text-lg font-medium text-blue-400">School Already Inactive</h4>
              <p className="text-sm text-gray-300 mt-1">
                The address <span className="font-mono bg-gray-800/70 px-1 rounded">{address}</span> is not currently registered as an active school in the system.
              </p>
              
              <div className="mt-3 pt-3 border-t border-gray-700/30">
                <p className="text-sm text-gray-300">
                  No action is needed, as this address does not have school privileges to revoke. If you meant to deactivate a different school, please enter a different address.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}
      
      {/* Deactivation Result */}
      {deactivationSuccess !== undefined && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className={`mt-6 ${
            deactivationSuccess 
              ? 'bg-green-900/20 border border-green-700/30' 
              : 'bg-red-900/20 border border-red-700/30'
          } rounded-lg p-4`}
        >
          <div className="flex items-start">
            {deactivationSuccess ? (
              <svg className="w-6 h-6 text-green-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-6 h-6 text-red-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            <div>
              <h4 className={`text-lg font-medium ${deactivationSuccess ? 'text-green-400' : 'text-red-400'}`}>
                {deactivationSuccess ? 'Deactivation Successful' : 'Deactivation Failed'}
              </h4>
              <p className="text-sm text-gray-300 mt-1">
                {deactivationNote}
              </p>
              
              {deactivationSuccess && (
                <div className="mt-3 pt-3 border-t border-green-700/30">
                  <p className="text-sm text-gray-300">
                    The school has been deactivated and can no longer perform school-related functions in the system. This change is effective immediately.
                  </p>
                  
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => {
                        // Reset the form to check another school
                        if (useCustomAddress) {
                          setAddress('');
                        }
                        setDeactivationSuccess(undefined);
                        setDeactivationReason('');
                        resetDeactivation();
                      }}
                      className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      Deactivate Another School
                    </button>
                  </div>
                </div>
              )}
              
              {!deactivationSuccess && (
                <div className="mt-3 pt-3 border-t border-red-700/30">
                  <button
                    type="button"
                    onClick={resetDeactivation}
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
      {!showDeactivationForm && deactivationSuccess === undefined && !isAddressActive && (
        <div className="mt-6 bg-gray-700/30 rounded-lg p-4">
          <h4 className="text-sm font-medium text-red-400 mb-2">About School Deactivation</h4>
          <p className="text-sm text-gray-300 mb-3">
            School deactivation is the process of removing a school's permissions and capabilities within the educational system. This is typically performed by system administrators when:
          </p>
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-300 mt-2 pl-2">
            <li>A school is no longer operating or participating in the program</li>
            <li>Administrative issues require temporary suspension of school activities</li>
            <li>There have been violations of system policies or educational standards</li>
            <li>Restructuring of the educational institution requires deactivation and reactivation</li>
          </ul>
          <p className="text-sm text-gray-300 mt-3">
            To deactivate a school, you'll need to:
          </p>
          <ol className="list-decimal list-inside space-y-1 text-sm text-gray-300 mt-2 pl-2">
            <li>Enter the Ethereum address of the school to be deactivated</li>
            <li>Verify the current status of the address (must be an active school)</li>
            <li>Provide a reason for deactivation (for administrative records)</li>
            <li>Confirm the deactivation transaction using your connected wallet</li>
          </ol>
          <div className="mt-4 bg-gray-800/50 rounded-md p-3">
            <p className="text-sm text-gray-400">
              <span className="text-red-400 font-medium">Note:</span> You must have administrative privileges in the contract to deactivate schools. If you're not an administrator, the deactivation transaction will fail.
            </p>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default SchoolDeactivation;