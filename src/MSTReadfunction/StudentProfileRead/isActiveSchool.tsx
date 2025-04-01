import { useState, useEffect } from 'react';
import { useReadContract, useAccount } from 'wagmi';
import { motion } from 'framer-motion';

/**
 * SchoolStatusChecker Component
 * 
 * This component checks if a specific school address is active in the system.
 * It provides visual indicators of the school's status and explanations
 * of what being an active school means within the educational platform.
 */
interface SchoolStatusCheckerProps {
  contract: any;
  schoolAddress?: `0x${string}`; // Optional: specific school address to check
  onStatusFetched?: (isActive: boolean, address: string) => void; // Optional callback
}

const SchoolStatusChecker = ({
  contract,
  schoolAddress,
  onStatusFetched
}: SchoolStatusCheckerProps) => {
  // State for the displayed school address
  const { address: connectedAddress } = useAccount();
  const [displayAddress, setDisplayAddress] = useState<string>(schoolAddress || '');
  const [customAddress, setCustomAddress] = useState<boolean>(!schoolAddress);
  const [validationError, setValidationError] = useState<string>('');
  
  // Update display address when schoolAddress prop changes
  useEffect(() => {
    if (schoolAddress) {
      setDisplayAddress(schoolAddress);
      setCustomAddress(false);
    } else {
      setCustomAddress(true);
    }
  }, [schoolAddress]);
  
  // Derived state for the effective address to use
  const effectiveAddress = customAddress 
    ? displayAddress 
    : (schoolAddress || connectedAddress || '');
  
  // Fetch school status data
  const { 
    data: isActiveData,
    isLoading: isLoadingStatus,
    isError: isStatusError,
    refetch: refetchStatus
  } = useReadContract({
    ...contract,
    functionName: 'isActiveSchool',
    args: [effectiveAddress as `0x${string}`],
    query: {
      enabled: !!effectiveAddress
    }
  });
  
  // Call callback when status is fetched
  useEffect(() => {
    if (isActiveData !== undefined && effectiveAddress && onStatusFetched) {
      onStatusFetched(isActiveData as boolean, effectiveAddress);
    }
  }, [isActiveData, effectiveAddress, onStatusFetched]);
  
  // Validate address format
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
  
  // Handle address change
  const handleAddressChange = (value: string) => {
    setDisplayAddress(value);
    setValidationError('');
  };
  
  // Handle address lookup
  const handleLookup = () => {
    if (validateAddress(displayAddress)) {
      refetchStatus();
    }
  };
  
  // Determine the school status and styling
  const getSchoolStatus = () => {
    if (isActiveData === undefined) {
      return { text: 'Unknown Status', color: 'text-gray-400', bg: 'bg-gray-500/20' };
    }
    
    if (isActiveData === true) {
      return { text: 'Active School', color: 'text-green-400', bg: 'bg-green-500/20' };
    } else {
      return { text: 'Inactive School', color: 'text-red-400', bg: 'bg-red-500/20' };
    }
  };
  
  const status = getSchoolStatus();
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-gray-800/50 border border-gray-700 rounded-lg p-4"
    >
      <h3 className="text-lg font-medium text-blue-400 mb-3">
        School Status Checker
      </h3>
      
      {/* Address Input (if no specific school address provided) */}
      {customAddress && (
        <div className="mb-4 space-y-2">
          <div className="flex space-x-2">
            <div className="flex-grow">
              <input
                type="text"
                value={displayAddress}
                onChange={(e) => handleAddressChange(e.target.value)}
                placeholder="School address (0x...)"
                className={`w-full px-3 py-2 bg-gray-700 border ${
                  validationError ? 'border-red-500' : 'border-gray-600'
                } rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
              />
            </div>
            <button
              type="button"
              onClick={handleLookup}
              className="px-3 py-2 bg-gray-600 text-gray-200 rounded-md hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoadingStatus || !displayAddress}
            >
              {isLoadingStatus ? (
                <div className="w-5 h-5 border-2 border-t-blue-400 border-blue-200/30 rounded-full animate-spin"></div>
              ) : (
                'Check Status'
              )}
            </button>
          </div>
          {validationError && (
            <p className="text-xs text-red-400">{validationError}</p>
          )}
        </div>
      )}
      
      {/* Loading State */}
      {isLoadingStatus && (
        <div className="flex items-center justify-center py-6">
          <div className="w-6 h-6 border-2 border-t-blue-400 border-blue-200/30 rounded-full animate-spin mr-3"></div>
          <span className="text-sm text-gray-300">Checking school status...</span>
        </div>
      )}
      
      {/* Error State */}
      {isStatusError && (
        <div className="bg-red-500/20 text-red-400 border border-red-500/30 rounded-md p-4 mb-4">
          <p className="text-sm">Error checking school status. Please try again later.</p>
        </div>
      )}
      
      {/* Status Results */}
      {!isLoadingStatus && !isStatusError && isActiveData !== undefined && (
        <div className="space-y-4">
          {/* School Address Display */}
          <div className="bg-gray-700/20 rounded-md p-3">
            <h4 className="text-xs text-gray-400 mb-1">School Address:</h4>
            <div className="flex items-center">
              <span className="text-sm font-mono text-gray-300 truncate">{effectiveAddress}</span>
            </div>
          </div>
          
          {/* Status Badge */}
          <div className={`${status.bg} border border-${status.color.replace('text-', '')}/30 rounded-lg p-5 flex items-center`}>
            <div className={`w-10 h-10 ${status.color.replace('text-', 'bg-')}/20 rounded-full flex items-center justify-center mr-4`}>
              {isActiveData ? (
                <svg className={`w-6 h-6 ${status.color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className={`w-6 h-6 ${status.color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </div>
            <div>
              <h4 className={`text-lg font-bold ${status.color}`}>
                {status.text}
              </h4>
              <p className="text-sm text-gray-300">
                {isActiveData
                  ? "This address is registered as an active school in the system."
                  : "This address is not recognized as an active school."}
              </p>
            </div>
          </div>
          
          {/* Status Explanation */}
          <div className="bg-gray-700/30 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-300 mb-2">What This Means</h4>
            
            {isActiveData ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-300">
                  This address has been verified as an active school in the educational system. Active schools enjoy several privileges and capabilities:
                </p>
                <ul className="space-y-2">
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-green-400 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm text-gray-300">
                      <span className="text-white font-medium">Student Management:</span> Ability to register students and manage their educational records
                    </span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-green-400 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm text-gray-300">
                      <span className="text-white font-medium">Program Participation:</span> Access to educational programs and curriculum resources
                    </span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-green-400 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm text-gray-300">
                      <span className="text-white font-medium">Attendance Tracking:</span> Authority to record and verify student attendance
                    </span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-green-400 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm text-gray-300">
                      <span className="text-white font-medium">Certification Authority:</span> Ability to validate student achievements and completed terms
                    </span>
                  </li>
                </ul>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-gray-300">
                  This address is not recognized as an active school in the system. There could be several reasons for this status:
                </p>
                <ul className="space-y-2">
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-red-400 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm text-gray-300">
                      <span className="text-white font-medium">Not Registered:</span> The address may not be registered in the system at all
                    </span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-red-400 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm text-gray-300">
                      <span className="text-white font-medium">Pending Approval:</span> Registration could be pending administrative approval
                    </span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-red-400 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm text-gray-300">
                      <span className="text-white font-medium">Suspended Status:</span> The school may have been suspended from the system
                    </span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-red-400 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm text-gray-300">
                      <span className="text-white font-medium">Different Role:</span> The address might be registered with a different role (e.g., student or teacher)
                    </span>
                  </li>
                </ul>
              </div>
            )}
          </div>
          
          {/* Next Steps */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-md p-3">
            <h4 className="text-sm font-medium text-blue-400 mb-2">Next Steps</h4>
            <p className="text-sm text-gray-300">
              {isActiveData
                ? "This address can perform all school-related functions in the system. School administrators can manage students, record attendance, and participate in educational programs."
                : "If you believe this address should be recognized as an active school, please contact the system administrator or initiate the school registration process through the administrative interface."}
            </p>
          </div>
        </div>
      )}
      
      {/* Empty State */}
      {!isLoadingStatus && !isStatusError && isActiveData === undefined && effectiveAddress && (
        <div className="bg-gray-700/20 rounded-md p-6 text-center">
          <svg className="w-12 h-12 text-gray-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <p className="text-gray-400 mb-3">Enter a school address to check its status</p>
          <p className="text-xs text-gray-500">You can verify if an address is registered as an active school in the educational system.</p>
        </div>
      )}
      
      {/* Educational Information */}
      <div className="mt-4 pt-4 border-t border-gray-700">
        <h4 className="text-sm font-medium text-gray-300 mb-2">About School Status</h4>
        <p className="text-sm text-gray-400 mb-2">
          In this educational system, schools are entities that provide educational services to students. Schools must be registered and active in the system to perform various administrative functions related to student management and educational program delivery.
        </p>
        <p className="text-sm text-gray-400">
          A school's status is an important indicator of whether it is authorized to register students, record attendance, mark completed terms, and participate in the broader educational ecosystem. Only addresses with active school status can perform these functions within the system.
        </p>
      </div>
    </motion.div>
  );
};

export default SchoolStatusChecker;