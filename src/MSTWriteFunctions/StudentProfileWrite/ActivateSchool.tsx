import { useState, useEffect } from 'react';
import { useWriteContract, useAccount } from 'wagmi';
import { motion } from 'framer-motion';
import SchoolStatusChecker from '../../MSTReadfunction/StudentProfileRead/isActiveSchool';

/**
 * SchoolActivator Component
 * 
 * This component allows administrators to activate schools in the educational system.
 * It first checks if the address is already an active school using SchoolStatusChecker,
 * and then provides an interface to activate the school if it's not already active.
 */
interface SchoolActivatorProps {
  readContract: any; // Contract configuration for read operations
  writeContract: {
    abi: any; // Contract ABI
    address: `0x${string}`; // Contract address
  }; 
  schoolAddress?: `0x${string}`; // Optional: specific school address to activate
  onActivationComplete?: (success: boolean, address: string) => void; // Optional callback
}

const SchoolActivator = ({
    readContract,
    writeContract,
    schoolAddress,
    onActivationComplete
}: SchoolActivatorProps) => {
  // Access the connected wallet address
  const { address: connectedAddress } = useAccount();
  
  // Component state
  const [address, setAddress] = useState<string>(schoolAddress || '');
  const [validationError, setValidationError] = useState<string>('');
  const [isAddressActive, setIsAddressActive] = useState<boolean | undefined>(undefined);
  const [showActivationForm, setShowActivationForm] = useState<boolean>(false);
  const [activationNote, setActivationNote] = useState<string>('');
  const [activationSuccess, setActivationSuccess] = useState<boolean | undefined>(undefined);
  
  // Flag to determine if user should provide their own address
  const useCustomAddress = !schoolAddress;
  
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
  
  // Flag to determine if we have a valid address to check
  const hasValidAddress = address && validateAddress(address);

  // Setup the contract write operation
  const { 
    writeContractAsync,
    isPending: isActivating,
    isSuccess: isActivationSuccess,
    isError: isActivationError,
    error: activationError,
    reset: resetActivation
  } = useWriteContract();

  // Update address state when schoolAddress prop changes
  useEffect(() => {
    if (schoolAddress) {
      setAddress(schoolAddress);
    }
  }, [schoolAddress]);

  // Handle effects for successful activation
  useEffect(() => {
    if (isActivationSuccess && activationSuccess === undefined) {
      setActivationSuccess(true);
      setActivationNote('School activated successfully! The school can now manage students and participate in educational programs.');
      setShowActivationForm(false);
      
      if (onActivationComplete) {
        onActivationComplete(true, address);
      }
    }
  }, [isActivationSuccess, activationSuccess, address, onActivationComplete]);

  // Handle effects for failed activation
  useEffect(() => {
    if (isActivationError && activationSuccess === undefined) {
      setActivationSuccess(false);
      setActivationNote(`Error activating school: ${activationError?.message || 'Unknown error'}`);
    }
  }, [isActivationError, activationError, activationSuccess]);

  // Handle address input change
  const handleAddressChange = (value: string) => {
    setAddress(value);
    setValidationError('');
    setShowActivationForm(false);
    setActivationSuccess(undefined);
    resetActivation();
  };

  // Handle status update from SchoolStatusChecker
  const handleStatusFetched = (isActive: boolean) => {
    setIsAddressActive(isActive);
    
    // Only show activation form if address is valid but not active
    if (isActive) {
      setShowActivationForm(false);
    } else {
      setShowActivationForm(true);
    }
  };

  // Handle school activation
  const handleActivateSchool = async () => {
    if (!validateAddress(address)) {
      return;
    }

    try {
      // Call the contract with the correctly structured parameters
      await writeContractAsync({
        abi: writeContract.abi, 
        address: writeContract.address,
        functionName: 'activateSchool',
        args: [address as `0x${string}`]
      });
      
      // Note: We don't need to set success state here as it will be handled by 
      // the useEffect that watches isActivationSuccess
      setActivationNote('School activation transaction submitted. It may take a moment to process.');
    } catch (error) {
      console.error('Error activating school:', error);
      setActivationSuccess(false);
      setActivationNote('Error submitting activation transaction. Please try again.');
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
        School Activation Portal
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

      {/* School Status Indicator - shows at a glance whether the address is active */}
      {hasValidAddress && isAddressActive !== undefined && (
        <div className="mb-4">
          <div className={`flex items-center p-3 rounded-md ${
            isAddressActive ? 'bg-green-900/20 border border-green-700/30' : 'bg-yellow-900/20 border border-yellow-700/30'
          }`}>
            {isAddressActive ? (
              <svg className="w-5 h-5 text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-yellow-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            )}
            <span className={`text-sm ${isAddressActive ? 'text-green-300' : 'text-yellow-300'}`}>
              {isAddressActive 
                ? 'This address is an active school in the system' 
                : 'This address is not currently active as a school'}
            </span>
          </div>
        </div>
      )}
      
      {/* School Status Checker - invisible component that fetches the status */}
      {hasValidAddress && (
        <div className={isAddressActive !== undefined ? 'hidden' : 'mb-6'}>
          <SchoolStatusChecker
            contract={readContract}
            schoolAddress={address as `0x${string}`}
            onStatusFetched={handleStatusFetched}
          />
        </div>
      )}
      
      {/* Activation Form */}
      {showActivationForm && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mt-6 bg-blue-900/20 border border-blue-700/30 rounded-lg p-4"
        >
          <h4 className="text-lg font-medium text-blue-400 mb-3">
            Activate School
          </h4>
          
          <div className="space-y-4">
            <div className="bg-gray-700/30 rounded-md p-4">
              <p className="text-sm text-gray-300 mb-3">
                You are about to activate the following address as a school in the system:
              </p>
              
              <div className="bg-gray-800/50 rounded-md p-3 font-mono text-sm text-white break-all mb-3">
                {address}
              </div>
              
              <p className="text-sm text-gray-300 mb-3">
                Activating a school grants this address the following capabilities:
              </p>
              
              <ul className="space-y-2 mb-3">
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-blue-400 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm text-gray-300">Register and manage student accounts</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-blue-400 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm text-gray-300">Record student attendance and progress</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-blue-400 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm text-gray-300">Participate in educational programs</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-blue-400 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm text-gray-300">Issue credentials and certifications</span>
                </li>
              </ul>
              
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-md p-3 text-sm text-yellow-200">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-yellow-400 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>
                    This action will grant significant permissions to the address. Please ensure this is a legitimate school administration address before proceeding.
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowActivationForm(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500"
                disabled={isActivating}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleActivateSchool}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isActivating}
              >
                {isActivating ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Activating...
                  </span>
                ) : (
                  'Activate School'
                )}
              </button>
            </div>
          </div>
        </motion.div>
      )}
      
      {/* Activation Result */}
      {activationSuccess !== undefined && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className={`mt-6 ${
            activationSuccess 
              ? 'bg-green-900/20 border border-green-700/30' 
              : 'bg-red-900/20 border border-red-700/30'
          } rounded-lg p-4`}
        >
          <div className="flex items-start">
            {activationSuccess ? (
              <svg className="w-6 h-6 text-green-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-6 h-6 text-red-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            <div>
              <h4 className={`text-lg font-medium ${activationSuccess ? 'text-green-400' : 'text-red-400'}`}>
                {activationSuccess ? 'Activation Successful' : 'Activation Failed'}
              </h4>
              <p className="text-sm text-gray-300 mt-1">
                {activationNote}
              </p>
              
              {activationSuccess && (
                <div className="mt-3 pt-3 border-t border-green-700/30">
                  <p className="text-sm text-gray-300">
                    The school is now ready to register students and participate in educational programs. To begin managing students, navigate to the School Management Dashboard.
                  </p>
                  
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => {
                        // Would typically navigate to school dashboard
                        console.log('Navigate to school dashboard');
                      }}
                      className="px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      Go to School Dashboard
                    </button>
                  </div>
                </div>
              )}
              
              {!activationSuccess && (
                <div className="mt-3 pt-3 border-t border-red-700/30">
                  <button
                    type="button"
                    onClick={resetActivation}
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
      
      {/* Status Information - shows when address is valid but activation form is not visible */}
      {isAddressActive && !showActivationForm && activationSuccess === undefined && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mt-6 bg-blue-900/20 border border-blue-700/30 rounded-lg p-4"
        >
          <div className="flex items-start">
            <svg className="w-6 h-6 text-blue-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h4 className="text-lg font-medium text-blue-400">School Already Active</h4>
              <p className="text-sm text-gray-300 mt-1">
                The address <span className="font-mono bg-gray-800/70 px-1 rounded">{address}</span> is already registered as an active school in the system.
              </p>
              
              <div className="mt-3 pt-3 border-t border-blue-700/30">
                <p className="text-sm text-gray-300">
                  This school can already register students and participate in educational programs. If you need to manage this school, you can visit the School Management Dashboard.
                </p>
                
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => {
                      // Would typically navigate to school dashboard
                      console.log('Navigate to school dashboard');
                    }}
                    className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Go to School Dashboard
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
      
      {/* Educational Information */}
      {!isAddressActive && !showActivationForm && activationSuccess === undefined && (
        <div className="mt-6 bg-gray-700/30 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-400 mb-2">About School Activation</h4>
          <p className="text-sm text-gray-300 mb-3">
            School activation is the process of granting an Ethereum address the permissions and capabilities needed to function as a school within the educational system. This is typically performed by system administrators.
          </p>
          <p className="text-sm text-gray-300">
            To activate a school, you'll need to:
          </p>
          <ol className="list-decimal list-inside space-y-1 text-sm text-gray-300 mt-2 pl-2">
            <li>Enter the Ethereum address of the school to be activated</li>
            <li>Verify the current status of the address (active/inactive)</li>
            <li>If the address is not already active, proceed with activation</li>
            <li>Confirm the activation transaction using your connected wallet</li>
          </ol>
          <div className="mt-4 bg-gray-800/50 rounded-md p-3">
            <p className="text-sm text-gray-400">
              <span className="text-blue-400 font-medium">Note:</span> You must have administrative privileges in the contract to activate schools. If you're not an administrator, the activation transaction will fail.
            </p>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default SchoolActivator;