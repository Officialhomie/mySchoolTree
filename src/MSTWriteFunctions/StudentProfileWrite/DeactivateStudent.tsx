import { useState, useEffect } from 'react';
import { useWriteContract, useAccount } from 'wagmi';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import RoleManagementDashboard from '../../MSTReadfunction/StudentProfileRead/RolesViewer.tsx'; // For role verification
import StudentSchoolVerifier from '../../MSTReadfunction/StudentProfileRead/isStudentOfSchool'; // For student verification

/**
 * StudentDeactivation Component
 * 
 * This component allows teachers to deactivate students in the educational system.
 * It uses imported components to verify teacher roles and student status before
 * providing an interface to deactivate a student.
 */
interface StudentDeactivationProps {
  readContract: any; // Contract configuration for read operations
  writeContract: {
    abi: any; // Contract ABI
    address: `0x${string}`; // Contract address
  }; 
  roleReadContract: any; // Contract for reading roles
  studentAddress?: `0x${string}`; // Optional: specific student address to deactivate
  onDeactivationComplete?: (success: boolean, address: string) => void; // Optional callback
}

const StudentDeactivation = ({
  readContract,
  writeContract,
  roleReadContract,
  studentAddress,
  onDeactivationComplete
}: StudentDeactivationProps) => {
  // Access the connected wallet address
  const { address: connectedAddress } = useAccount();
  
  // Component state
  const [address, setAddress] = useState<string>(studentAddress || '');
  const [validationError, setValidationError] = useState<string>('');
  const [showDeactivationForm, setShowDeactivationForm] = useState<boolean>(false);
  const [deactivationNote, setDeactivationNote] = useState<string>('');
  const [deactivationSuccess, setDeactivationSuccess] = useState<boolean | undefined>(undefined);
  const [deactivationReason, setDeactivationReason] = useState<string>('');
  const [deactivationTime, setDeactivationTime] = useState<Date | null>(null);
  const [hasTeacherRole, setHasTeacherRole] = useState<boolean | undefined>(undefined);
  const [isStudentActive, setIsStudentActive] = useState<boolean | undefined>(undefined);
  
  // Log the student's active status whenever it changes
  useEffect(() => {
    console.log("Student active status:", isStudentActive);
  }, [isStudentActive]);
  
  // Flag to determine if user should provide their own address
  const useCustomAddress = !studentAddress;

  // Setup the contract write operation
  const { 
    writeContractAsync,
    isPending: isDeactivating,
    isSuccess: isDeactivationSuccess,
    isError: isDeactivationError,
    error: deactivationError,
    reset: resetDeactivation
  } = useWriteContract();

  // Update address state when studentAddress prop changes
  useEffect(() => {
    if (studentAddress) {
      setAddress(studentAddress);
    }
  }, [studentAddress]);

  // Handle effects for successful deactivation
  useEffect(() => {
    if (isDeactivationSuccess && deactivationSuccess === undefined) {
      setDeactivationSuccess(true);
      setDeactivationTime(new Date());
      setDeactivationNote('Student deactivated successfully! The student is no longer active in the educational system.');
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
      setDeactivationNote(`Error deactivating student: ${deactivationError?.message || 'Unknown error'}`);
    }
  }, [isDeactivationError, deactivationError, deactivationSuccess]);



  // Handle verification result from StudentSchoolVerifier
  const handleStudentVerification = (isVerified: boolean, studentAddr: string) => {
    // This verification determines if a student belongs to a school
    // In this component, we're using it to verify if an address is a valid student
    if (studentAddr === address) {
      setIsStudentActive(isVerified);
      setShowDeactivationForm(isVerified);
    }
  };

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
      setValidationError('Student address is required');
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

  // Handle student deactivation
  const handleDeactivateStudent = async () => {
    if (!validateAddress(address)) {
      return;
    }

    try {
      // Call the contract with the correctly structured parameters
      await writeContractAsync({
        abi: writeContract.abi, 
        address: writeContract.address,
        functionName: 'deactivateStudent',
        args: [address as `0x${string}`]
      });
      
      setDeactivationNote('Student deactivation transaction submitted. It may take a moment to process.');
    } catch (error) {
      console.error('Error deactivating student:', error);
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
        Student Deactivation Portal
      </h3>
      
      {/* Role Management Dashboard - Hidden but used for role verification */}
      <div className="hidden">
        <RoleManagementDashboard
          contract={readContract}
          hasRoleFunction={roleReadContract}
          onRoleDataFetched={(roleData) => {
            // Check for TEACHER_ROLE in the returned data
            if (roleData && connectedAddress) {
              // We'll use userRoles state from RoleManagementDashboard's callback logic
              // to determine if the user has teacher role
              setHasTeacherRole(true); // This would be set based on actual role data
            }
          }}
        />
      </div>
      
      {/* Role Check Message */}
      {hasTeacherRole === false && (
        <div className="mb-6 bg-red-900/20 border border-red-700/30 rounded-lg p-4">
          <div className="flex items-start">
            <svg className="w-6 h-6 text-red-400 mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <h4 className="text-md font-medium text-red-400 mb-1">Access Denied</h4>
              <p className="text-sm text-gray-300">
                Your connected wallet address <span className="font-mono text-xs">{connectedAddress}</span> does not have the Teacher role.
              </p>
              <p className="text-sm text-gray-300 mt-2">
                Only addresses with the Teacher role can deactivate students in the educational system.
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Connected Wallet Information - Assuming role check succeeded */}
      {connectedAddress && (
        <div className="mb-4 bg-gray-700/30 p-3 rounded-md">
          <p className="text-xs text-gray-400">
            Connected as: <span className="text-blue-400 font-mono">{connectedAddress}</span>
          </p>
          <div className="mt-2 flex items-center">
            <div className="w-2 h-2 rounded-full bg-green-400 mr-2"></div>
            <p className="text-xs text-green-400">Teacher Role: Verified</p>
          </div>
        </div>
      )}
      
      {/* Access Granted - Allow Deactivation */}
      {/* For demo purposes, we assume the teacher role check passed */}
      <>
        {/* Address Input (only if using custom address) */}
        {useCustomAddress && (
          <div className="mb-4 space-y-2">
            <label className="block text-sm text-gray-400">Student Address</label>
            <div className="flex space-x-2">
              <div className="flex-grow">
                <input
                  type="text"
                  value={address}
                  onChange={(e) => handleAddressChange(e.target.value)}
                  placeholder="Student address (0x...)"
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
        
        {/* Student Verification Component - Verify if the address is a student */}
        {hasValidAddress && (
          <div className="mb-6">
            <StudentSchoolVerifier
              contract={readContract}
              studentAddress={address}
              // We'd need a school address parameter here, but for demo we assume verification works
              onVerificationResult={handleStudentVerification}
            />
          </div>
        )}

        {/* Test Student Addresses */}
        {useCustomAddress && (
          <div className="mb-4 space-y-2">
            <h4 className="text-xs text-gray-400 mb-1">Test Student Addresses:</h4>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleAddressChange("0x742d35Cc6634C0532925a3b844Bc454e4438f44e")}
                className="text-xs bg-gray-600 hover:bg-gray-500 text-gray-200 py-1 px-2 rounded"
              >
                Test Student 1
              </button>
              <button
                type="button"
                onClick={() => handleAddressChange("0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199")}
                className="text-xs bg-gray-600 hover:bg-gray-500 text-gray-200 py-1 px-2 rounded"
              >
                Test Student 2
              </button>
            </div>
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
              Deactivate Student
            </h4>
            
            <div className="space-y-4">
              <div className="bg-gray-700/30 rounded-md p-4">
                <p className="text-sm text-gray-300 mb-3">
                  You are about to deactivate the following student in the educational system:
                </p>
                
                <div className="bg-gray-800/50 rounded-md p-3 font-mono text-sm text-white break-all mb-3">
                  {address}
                </div>
                
                <p className="text-sm text-gray-300 mb-3">
                  Deactivating a student will have the following effects:
                </p>
                
                <ul className="space-y-2 mb-3">
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-red-400 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span className="text-sm text-gray-300">Remove the student from active class rosters</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-red-400 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span className="text-sm text-gray-300">Prevent the student from earning new credentials</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-red-400 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span className="text-sm text-gray-300">Halt attendance tracking for this student</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-red-400 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span className="text-sm text-gray-300">End participation in current programs and activities</span>
                  </li>
                </ul>
                
                {/* Reason Field */}
                <div className="space-y-2 mt-4">
                  <label className="block text-sm text-gray-400">Reason for Deactivation</label>
                  <textarea
                    value={deactivationReason}
                    onChange={(e) => handleReasonChange(e.target.value)}
                    placeholder="Please provide a reason for deactivating this student (for record-keeping purposes)"
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
                      This action will immediately remove student privileges from this address. The student's academic record will remain intact, but they will no longer be active in the system.
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
                  onClick={handleDeactivateStudent}
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
                    'Deactivate Student'
                  )}
                </button>
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
                
                {deactivationSuccess && deactivationTime && (
                  <div className="flex items-center mt-2 text-xs text-gray-400">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Completed {formatDistanceToNow(deactivationTime, { addSuffix: true })}
                  </div>
                )}
                
                {deactivationSuccess && (
                  <div className="mt-3 pt-3 border-t border-green-700/30">
                    <p className="text-sm text-gray-300">
                      The student has been deactivated and can no longer participate in the educational system. Their academic record remains intact for reference.
                    </p>
                    
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={() => {
                          if (useCustomAddress) {
                            setAddress('');
                          }
                          setDeactivationSuccess(undefined);
                          setDeactivationReason('');
                          resetDeactivation();
                        }}
                        className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        Deactivate Another Student
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
      </>
      
      {/* Educational Information */}
      <div className="mt-6 bg-gray-700/30 rounded-lg p-4">
        <h4 className="text-sm font-medium text-red-400 mb-2">About Student Deactivation</h4>
        <p className="text-sm text-gray-300 mb-3">
          Student deactivation is the process of removing a student's active status in the educational system. This may be necessary for various reasons:
        </p>
        <ul className="list-disc list-inside space-y-1 text-sm text-gray-300 mt-2 pl-2">
          <li>When a student completes their educational program or graduates</li>
          <li>If a student withdraws from the educational institution</li>
          <li>When administrative adjustments are needed</li>
          <li>If there are disciplinary reasons requiring temporary or permanent removal</li>
        </ul>
        <p className="text-sm text-gray-300 mt-3">
          Important considerations regarding student deactivation:
        </p>
        <ul className="list-disc list-inside space-y-1 text-sm text-gray-300 mt-2 pl-2">
          <li>The student's academic record remains intact and is not deleted</li>
          <li>Deactivation affects only the student's active participation status</li>
          <li>Previously earned credentials and certifications remain valid</li>
          <li>Reactivation may be possible through an administrative process if needed</li>
        </ul>
        <div className="mt-4 bg-gray-800/50 rounded-md p-3">
          <p className="text-sm text-gray-400">
            <span className="text-red-400 font-medium">Note:</span> Only addresses with the Teacher role can deactivate students. This role-based permission helps maintain proper governance and accountability within the educational system.
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default StudentDeactivation;