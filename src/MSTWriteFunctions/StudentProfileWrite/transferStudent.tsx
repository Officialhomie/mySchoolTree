import { useState, useEffect } from 'react';
import { useReadContract, useWriteContract, useAccount } from 'wagmi';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { contractStudentProfileConfig } from '../../contracts';

/**
 * StudentTransferComponent
 * 
 * This component allows for transferring a student from one school to another.
 * Before transfer can happen, it verifies:
 * 1. The student is currently enrolled at their claimed school
 * 2. The target school is active in the system
 * 
 * Enhanced with exportable data for use in other components.
 */

export interface TransferData {
  studentAddress: string;
  currentSchoolAddress: string;
  newSchoolAddress: string;
  isStudentVerified: boolean | null;
  isNewSchoolActive: boolean | null;
  verificationStep: number;
  lastUpdated: Date | null;
}

export interface TransferResult {
  status: 'idle' | 'verifying' | 'ready' | 'pending' | 'success' | 'error';
  transferData: TransferData;
  hash?: string;
  error?: Error | string | null;
}

interface StudentTransferComponentProps {
  contract?: any; // Optional with default value
  studentAddress?: string; // Optional pre-filled student address
  currentSchoolAddress?: string; // Optional pre-filled current school address
  newSchoolAddress?: string; // Optional pre-filled new school address
  onTransferComplete?: (success: boolean, studentAddress: string, newSchoolAddress: string) => void;
  onTransferDataChange?: (transferData: TransferData) => void; // New callback for when transfer data changes
  onTransferStateChange?: (result: TransferResult) => void; // New callback for transfer state changes
  initialTransferData?: TransferData; // Optional initial transfer data
}

const StudentTransferComponent = ({
  contract = contractStudentProfileConfig,
  studentAddress = '',
  currentSchoolAddress = '',
  newSchoolAddress = '',
  onTransferComplete,
  onTransferDataChange,
  onTransferStateChange,
  initialTransferData
}: StudentTransferComponentProps) => {
  // Form state
  const { address: connectedAddress } = useAccount();
  const [student, setStudent] = useState<string>(initialTransferData?.studentAddress || studentAddress);
  const [currentSchool, setCurrentSchool] = useState<string>(initialTransferData?.currentSchoolAddress || currentSchoolAddress);
  const [newSchool, setNewSchool] = useState<string>(initialTransferData?.newSchoolAddress || newSchoolAddress);
  const [validationError, setValidationError] = useState<string>('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(initialTransferData?.lastUpdated || null);
  
  // Verification states
  const [isStudentVerified, setIsStudentVerified] = useState<boolean | null>(initialTransferData?.isStudentVerified || null);
  const [isNewSchoolActive, setIsNewSchoolActive] = useState<boolean | null>(initialTransferData?.isNewSchoolActive || null);
  const [verificationStep, setVerificationStep] = useState<number>(initialTransferData?.verificationStep || 0); // 0: Not started, 1: Checking student, 2: Checking school, 3: Both verified
  
  // Transaction state
  const [isTransferring, setIsTransferring] = useState<boolean>(false);
  const [transferSuccess, setTransferSuccess] = useState<boolean | null>(null);
  const [transferError, setTransferError] = useState<string | null>(null);
  
  // Fetch verification data: is student of current school
  const {
      data: studentVerificationResult,
      error: studentVerificationError,
      isLoading: isLoadingStudentVerification,
      isSuccess: isStudentVerificationSuccess,
      refetch: refetchStudentVerification
    } = useReadContract({
        ...contract,
        functionName: 'isStudentOfSchool',
        args: student && currentSchool ? [student as `0x${string}`, currentSchool as `0x${string}`] : undefined,
        query: {
            enabled: !!student && !!currentSchool
        }
    });
    
    // Fetch verification data: is new school active
    const {
        data: schoolStatusResult,
        error: schoolStatusError,
        isLoading: isLoadingSchoolStatus,
        isSuccess: isSchoolStatusSuccess,
        refetch: refetchSchoolStatus
    } = useReadContract({
        ...contract,
        functionName: 'isActiveSchool',
        args: newSchool ? [newSchool as `0x${string}`] : undefined,
        query: {
            enabled: !!newSchool
        }
    });
    
    // Write contract to transfer student
    const { 
        writeContract, 
        isPending: isTransferPending,
        isSuccess: isTransferSuccess,
        isError: isTransferFailed,
        error: transferContractError,
        data: transferHash,
        reset: resetTransfer
    } = useWriteContract();
    
  // Current transfer data object
  const transferData: TransferData = {
    studentAddress: student,
    currentSchoolAddress: currentSchool,
    newSchoolAddress: newSchool,
    isStudentVerified,
    isNewSchoolActive,
    verificationStep,
    lastUpdated
  };

  // Determine transfer status
  const getTransferStatus = (): 'idle' | 'verifying' | 'ready' | 'pending' | 'success' | 'error' => {
    if (isTransferSuccess) return 'success';
    if (isTransferFailed) return 'error';
    if (isTransferPending) return 'pending';
    if (verificationStep === 3 && isStudentVerified && isNewSchoolActive) return 'ready';
    if (verificationStep > 0) return 'verifying';
    return 'idle';
  };

  // Current transfer state
  const transferState: TransferResult = {
    status: getTransferStatus(),
    transferData,
    hash: transferHash,
    error: transferError || (transferContractError as Error)
  };

  // Update parent component when transfer data changes
  useEffect(() => {
    if (onTransferDataChange) {
      onTransferDataChange(transferData);
    }
  }, [student, currentSchool, newSchool, isStudentVerified, isNewSchoolActive, verificationStep, lastUpdated, onTransferDataChange]);

  // Update parent component when transfer state changes
  useEffect(() => {
    if (onTransferStateChange) {
      onTransferStateChange(transferState);
    }
  }, [transferState, onTransferStateChange]);
    
  // Validate address format
  const validateAddress = (address: string, fieldName: string): boolean => {
      if (!address) {
          setValidationError(`${fieldName} address is required`);
          return false;
      }
      
      if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
          setValidationError(`Invalid Ethereum address format for ${fieldName}`);
          return false;
      }
      
      setValidationError('');
      return true;
  };
    
  console.log('Connected wallet address:', connectedAddress);
  // Handle student address change
  const handleStudentChange = (value: string) => {
    setStudent(value);
    setValidationError('');
    resetVerification();
  };

  // Handle current school address change
  const handleCurrentSchoolChange = (value: string) => {
    setCurrentSchool(value);
    setValidationError('');
    resetVerification();
  };

  // Handle new school address change
  const handleNewSchoolChange = (value: string) => {
    setNewSchool(value);
    setValidationError('');
    resetVerification();
  };

  // Reset verification status
  const resetVerification = () => {
    setVerificationStep(0);
    setIsStudentVerified(null);
    setIsNewSchoolActive(null);
    setTransferSuccess(null);
    setTransferError(null);
    resetTransfer();
  };

  // Handle verification process start
  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all inputs
    const isStudentValid = validateAddress(student, 'Student');
    if (!isStudentValid) return;
    
    const isCurrentSchoolValid = validateAddress(currentSchool, 'Current School');
    if (!isCurrentSchoolValid) return;
    
    const isNewSchoolValid = validateAddress(newSchool, 'New School');
    if (!isNewSchoolValid) return;
    
    // Start verification process
    setVerificationStep(1);
    refetchStudentVerification();
    setLastUpdated(new Date());
  };

  // Handle transfer initiation
  const handleTransfer = () => {
    if (!isStudentVerified || !isNewSchoolActive) return;
    
    setIsTransferring(true);
    setTransferError(null);
    
    writeContract({
      ...contract,
      functionName: 'transferStudent',
      args: [student as `0x${string}`, newSchool as `0x${string}`]
    });
  };

  // Update student verification status when data is fetched
  useEffect(() => {
    if (isStudentVerificationSuccess && studentVerificationResult !== undefined) {
      setIsStudentVerified(studentVerificationResult as boolean);
      
      // If student verification is complete, proceed to check school status
      if (verificationStep === 1) {
        setVerificationStep(2);
        refetchSchoolStatus();
      }
    }
  }, [isStudentVerificationSuccess, studentVerificationResult, verificationStep, refetchSchoolStatus]);

  // Update school verification status when data is fetched
  useEffect(() => {
    if (isSchoolStatusSuccess && schoolStatusResult !== undefined) {
      setIsNewSchoolActive(schoolStatusResult as boolean);
      
      // If school verification completes the process
      if (verificationStep === 2) {
        setVerificationStep(3);
      }
    }
  }, [isSchoolStatusSuccess, schoolStatusResult, verificationStep]);

  // Handle transfer status updates
  useEffect(() => {
    if (isTransferSuccess) {
      setTransferSuccess(true);
      setIsTransferring(false);
      if (onTransferComplete) {
        onTransferComplete(true, student, newSchool);
      }
    }
    
    if (isTransferFailed) {
      setTransferSuccess(false);
      setIsTransferring(false);
      setTransferError((transferContractError as Error)?.message || 'Transfer failed. Please try again.');
      if (onTransferComplete) {
        onTransferComplete(false, student, newSchool);
      }
    }
  }, [isTransferSuccess, isTransferFailed, transferContractError, student, newSchool, onTransferComplete]);

  // Get verification status for student
  const getStudentVerificationStatus = () => {
    if (isStudentVerified === null) {
      return { text: 'Not Verified', color: 'text-gray-400', bg: 'bg-gray-500/20' };
    }
    
    return isStudentVerified
      ? { text: 'Verified', color: 'text-green-400', bg: 'bg-green-500/20' }
      : { text: 'Not Verified', color: 'text-red-400', bg: 'bg-red-500/20' };
  };

  // Get verification status for school
  const getSchoolVerificationStatus = () => {
    if (isNewSchoolActive === null) {
      return { text: 'Unknown Status', color: 'text-gray-400', bg: 'bg-gray-500/20' };
    }
    
    return isNewSchoolActive
      ? { text: 'Active School', color: 'text-green-400', bg: 'bg-green-500/20' }
      : { text: 'Inactive School', color: 'text-red-400', bg: 'bg-red-500/20' };
  };

  const studentStatus = getStudentVerificationStatus();
  const schoolStatus = getSchoolVerificationStatus();
  
  // Calculate if transfer is possible
  const canTransfer = isStudentVerified && isNewSchoolActive && !isTransferring && verificationStep === 3;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-gray-800/50 border border-gray-700 rounded-lg p-4"
    >
      <h3 className="text-lg font-medium text-blue-400 mb-3">
        Student Transfer System
      </h3>
      
      {/* Form Section */}
      <form onSubmit={handleVerify} className="space-y-4 mb-4">
        <div className="bg-gray-700/30 rounded-lg p-4 space-y-4">
          {/* Student Address Input */}
          <div className="space-y-2">
            <label htmlFor="student-address" className="block text-sm font-medium text-gray-300">
              Student Wallet Address
            </label>
            <input
              id="student-address"
              type="text"
              value={student}
              onChange={(e) => handleStudentChange(e.target.value)}
              placeholder="0x..."
              className={`w-full px-3 py-2 bg-gray-700 border ${
                validationError && !student ? 'border-red-500' : 'border-gray-600'
              } rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
            />
            <p className="text-xs text-gray-400">Enter the student's Ethereum wallet address</p>
          </div>
          
          {/* Current School Address Input */}
          <div className="space-y-2">
            <label htmlFor="current-school-address" className="block text-sm font-medium text-gray-300">
              Current School Address
            </label>
            <input
              id="current-school-address"
              type="text"
              value={currentSchool}
              onChange={(e) => handleCurrentSchoolChange(e.target.value)}
              placeholder="0x..."
              className={`w-full px-3 py-2 bg-gray-700 border ${
                validationError && !currentSchool ? 'border-red-500' : 'border-gray-600'
              } rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
            />
            <p className="text-xs text-gray-400">Enter the address of the student's current school</p>
          </div>
          
          {/* New School Address Input */}
          <div className="space-y-2">
            <label htmlFor="new-school-address" className="block text-sm font-medium text-gray-300">
              New School Address
            </label>
            <input
              id="new-school-address"
              type="text"
              value={newSchool}
              onChange={(e) => handleNewSchoolChange(e.target.value)}
              placeholder="0x..."
              className={`w-full px-3 py-2 bg-gray-700 border ${
                validationError && !newSchool ? 'border-red-500' : 'border-gray-600'
              } rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
            />
            <p className="text-xs text-gray-400">Enter the address of the school to transfer to</p>
          </div>
          
          {/* Error Display */}
          {validationError && (
            <div className="text-xs text-red-400 mt-1">{validationError}</div>
          )}
          
          {/* Quick Test Buttons */}
          <div className="flex flex-wrap gap-2 mt-2">
            <div>
              <h4 className="text-xs text-gray-400 mb-1">Test Addresses:</h4>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    handleStudentChange("0x742d35Cc6634C0532925a3b844Bc454e4438f44e");
                    handleCurrentSchoolChange("0xdD2FD4581271e230360230F9337D5c0430Bf44C0");
                    handleNewSchoolChange("0x5FbDB2315678afecb367f032d93F642f64180aa3");
                  }}
                  className="text-xs bg-gray-600 hover:bg-gray-500 text-gray-200 py-1 px-2 rounded"
                >
                  Load Test Data
                </button>
                <button
                  type="button"
                  onClick={resetVerification}
                  className="text-xs bg-gray-600 hover:bg-gray-500 text-gray-200 py-1 px-2 rounded"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
          
          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoadingStudentVerification || isLoadingSchoolStatus || verificationStep > 0}
            >
              {isLoadingStudentVerification || isLoadingSchoolStatus ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Verifying...
                </span>
              ) : verificationStep > 0 ? (
                'Verification in progress...'
              ) : (
                'Verify Eligibility'
              )}
            </button>
          </div>
        </div>
      </form>
      
      {/* Verification Results */}
      {verificationStep > 0 && (
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-300 mb-2">Verification Status</h4>
          
          {/* Student Verification Status */}
          <div className="bg-gray-700/30 border border-gray-600 rounded-lg p-4">
            <div className="flex justify-between items-center mb-4">
              <h5 className="text-sm font-medium text-gray-300">Student Enrollment Check</h5>
              <div className={`inline-flex items-center px-3 py-1 rounded-full ${studentStatus.bg} border border-${studentStatus.color.replace('text-', '')}/30`}>
                <div className={`w-2 h-2 rounded-full ${studentStatus.color.replace('text-', 'bg-')} mr-2`}></div>
                <span className={`text-xs font-medium ${studentStatus.color}`}>
                  {isLoadingStudentVerification ? 'Checking...' : studentStatus.text}
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="space-y-1">
                <p className="text-xs text-gray-400">Student Address:</p>
                <p className="text-sm font-mono text-white break-all">{student}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-gray-400">Current School Address:</p>
                <p className="text-sm font-mono text-white break-all">{currentSchool}</p>
              </div>
            </div>
            
            {studentVerificationError ? (
              <div className="bg-red-500/20 text-red-400 border border-red-500/30 rounded-md p-3">
                <p className="text-sm">Error verifying student: {(studentVerificationError as Error).message || 'Unknown error'}</p>
              </div>
            ) : isStudentVerificationSuccess && (
              <div className="bg-gray-700/40 rounded-md p-3 border border-gray-600">
                {isStudentVerified ? (
                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm text-green-400">Verified: Student is enrolled at the specified school</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span className="text-sm text-red-400">Not verified: Student is not enrolled at the specified school</span>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* School Verification Status (only show when student verification is complete) */}
          {verificationStep >= 2 && (
            <div className="bg-gray-700/30 border border-gray-600 rounded-lg p-4">
              <div className="flex justify-between items-center mb-4">
                <h5 className="text-sm font-medium text-gray-300">New School Status Check</h5>
                <div className={`inline-flex items-center px-3 py-1 rounded-full ${schoolStatus.bg} border border-${schoolStatus.color.replace('text-', '')}/30`}>
                  <div className={`w-2 h-2 rounded-full ${schoolStatus.color.replace('text-', 'bg-')} mr-2`}></div>
                  <span className={`text-xs font-medium ${schoolStatus.color}`}>
                    {isLoadingSchoolStatus ? 'Checking...' : schoolStatus.text}
                  </span>
                </div>
              </div>
              
              <div className="space-y-1 mb-4">
                <p className="text-xs text-gray-400">Target School Address:</p>
                <p className="text-sm font-mono text-white break-all">{newSchool}</p>
              </div>
              
              {schoolStatusError ? (
                <div className="bg-red-500/20 text-red-400 border border-red-500/30 rounded-md p-3">
                  <p className="text-sm">Error checking school status: {(schoolStatusError as Error).message || 'Unknown error'}</p>
                </div>
              ) : isSchoolStatusSuccess && (
                <div className="bg-gray-700/40 rounded-md p-3 border border-gray-600">
                  {isNewSchoolActive ? (
                    <div className="flex items-center space-x-2">
                      <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-sm text-green-400">Verified: School is active in the system</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <span className="text-sm text-red-400">Not verified: School is not active in the system</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          
          {/* Transfer Eligibility Summary */}
          {verificationStep === 3 && (
            <div className={`${canTransfer ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'} border rounded-lg p-4`}>
              <h5 className={`text-sm font-medium ${canTransfer ? 'text-green-400' : 'text-red-400'} mb-2`}>
                Transfer Eligibility Status
              </h5>
              
              <ul className="space-y-2 mb-4">
                <li className="flex items-start">
                  {isStudentVerified ? (
                    <svg className="w-5 h-5 text-green-400 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-red-400 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                  <span className="text-sm text-gray-300">
                    <span className="text-white font-medium">Student Verification:</span> Student {isStudentVerified ? 'is' : 'is not'} enrolled at current school
                  </span>
                </li>
                <li className="flex items-start">
                  {isNewSchoolActive ? (
                    <svg className="w-5 h-5 text-green-400 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-red-400 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                  <span className="text-sm text-gray-300">
                    <span className="text-white font-medium">New School Status:</span> New school {isNewSchoolActive ? 'is' : 'is not'} active in the system
                  </span>
                </li>
              </ul>
              
              <div className="bg-gray-700/30 rounded-md p-3">
                {canTransfer ? (
                  <p className="text-sm text-green-400">Student is eligible for transfer to the new school</p>
                ) : (
                  <p className="text-sm text-red-400">
                    Student is not eligible for transfer. Please ensure the student is enrolled at the current school and the new school is active.
                  </p>
                )}
              </div>
              
              {/* Transfer Button */}
              {canTransfer && (
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={handleTransfer}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isTransferPending}
                  >
                    {isTransferPending ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Processing Transfer...
                      </span>
                    ) : (
                      'Initiate Transfer'
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
          
          {/* Transfer Result Display */}
          {transferSuccess !== null && (
            <div className={`${transferSuccess ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'} border rounded-lg p-4 mt-4`}>
              <div className="flex items-center space-x-3">
                {transferSuccess ? (
                  <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                    <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                )}
                <div>
                  <h5 className={`text-sm font-medium ${transferSuccess ? 'text-green-400' : 'text-red-400'}`}>
                    {transferSuccess ? 'Transfer Successful' : 'Transfer Failed'}
                  </h5>
                  <p className="text-sm text-gray-300 mt-1">
                    {transferSuccess 
                      ? `Student has been successfully transferred to the new school.`
                      : transferError || 'An error occurred during the transfer process.'}
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Last Updated */}
          {lastUpdated && (
            <div className="text-xs text-gray-400 text-right mt-2">
              Last updated {formatDistanceToNow(lastUpdated, { addSuffix: true })}
            </div>
          )}
        </div>
      )}
      
      {/* Educational Information */}
      <div className="mt-6 pt-4 border-t border-gray-700">
        <h4 className="text-sm font-medium text-gray-300 mb-2">About Student Transfers</h4>
        <p className="text-sm text-gray-400 mb-2">
          The student transfer process allows students to move from one registered school to another within the educational system. This process ensures that student records and educational history are maintained and properly transferred between institutions.
        </p>
        <p className="text-sm text-gray-400 mb-2">
          For a transfer to be successful, the following conditions must be met:
        </p>
        <ul className="space-y-1 mb-4 text-sm text-gray-400">
          <li className="flex items-start">
            <span className="text-blue-400 mr-2">•</span>
            The student must be currently enrolled at their claimed school
          </li>
          <li className="flex items-start">
            <span className="text-blue-400 mr-2">•</span>
            The target school must be active in the system
          </li>
          <li className="flex items-start">
            <span className="text-blue-400 mr-2">•</span>
            The transaction must be initiated by an authorized account (school administrator or system manager)
          </li>
        </ul>
        <p className="text-sm text-gray-400">
          Once a transfer is complete, the student's association is updated in the blockchain, ensuring transparent and immutable record-keeping of their educational journey.
        </p>
      </div>
    </motion.div>
  );
};

// Export both the component and its types for easier importing in parent components
export { StudentTransferComponent };
export default StudentTransferComponent;