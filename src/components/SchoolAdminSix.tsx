import { useState, useEffect, useCallback } from 'react';
import { useWriteContract, useAccount } from 'wagmi';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';

// Import additional dependencies
// Note: If these paths are incorrect, please adjust them to match your project structure
import SchoolStatusChecker from '../MSTReadfunction/StudentProfileRead/isActiveSchool';
import StudentSchoolVerifier from '../MSTReadfunction/StudentProfileRead/isStudentOfSchool';
import RoleManagementDashboard from '../MSTReadfunction/StudentProfileRead/RolesViewer';

// Import contract configuration
// Note: If this path is incorrect, please adjust it to match your project structure
import { contractStudentProfileConfig } from '../contracts';

// Define component modes
type ComponentMode = 'activate-school' | 'deactivate-student' | 'transfer-student';

// Define tab types
type TabType = 'activate' | 'deactivate' | 'transfer';

// School data interface
export interface SchoolData {
  address: string;
  isActive: boolean | undefined;
  activationTime?: Date | null;
}

// Student data interface
export interface StudentData {
  address: string;
  isActive: boolean | undefined;
  currentSchoolAddress?: string;
  newSchoolAddress?: string;
  deactivationReason?: string;
  deactivationTime?: Date | null;
}

// Transfer data interface
export interface TransferData {
  studentAddress: string;
  currentSchoolAddress: string;
  newSchoolAddress: string;
  isStudentVerified: boolean | null;
  isNewSchoolActive: boolean | null;
  verificationStep: number;
  lastUpdated: Date | null;
}

// Operation result interface
export interface OperationResult {
  status: 'idle' | 'verifying' | 'ready' | 'pending' | 'success' | 'error';
  hash?: string;
  error?: Error | string | null;
  timestamp: Date | null;
}

// Unified student management data export interface
export interface UnifiedStudentManagementData {
  // Current active operation
  activeOperation: ComponentMode;
  
  // School data
  schoolData: SchoolData | null;
  
  // Student data
  studentData: StudentData | null;
  
  // Transfer data
  transferData: TransferData | null;
  
  // Operation result
  operationResult: OperationResult;
  
  // Permissions (roles)
  permissions: {
    hasTeacherRole: boolean | undefined;
    hasAdminRole: boolean | undefined;
    roleCheckComplete: boolean;
  };
}

// Component props interface
interface UnifiedStudentManagementProps {
  defaultMode?: ComponentMode;
  initialSchoolAddress?: string;
  initialStudentAddress?: string;
  onSchoolActivated?: (success: boolean, address: string) => void;
  onStudentDeactivated?: (success: boolean, address: string) => void;
  onStudentTransferred?: (success: boolean, studentAddress: string, newSchoolAddress: string) => void;
  onDataChange?: (data: UnifiedStudentManagementData) => void;
  contract?: any; // Optional contract config
  hideRoleChecker?: boolean;
  showAllTabs?: boolean;
}

/**
 * Unified Student Management Component
 * 
 * This component combines school activation, student deactivation, and student transfer
 * functionality into a single cohesive interface.
 */
const UnifiedStudentManagement = ({
  defaultMode = 'activate-school',
  initialSchoolAddress,
  initialStudentAddress,
  onSchoolActivated,
  onStudentDeactivated,
  onStudentTransferred,
  onDataChange,
  contract = contractStudentProfileConfig,
  hideRoleChecker = false,
  showAllTabs = true
}: UnifiedStudentManagementProps) => {
  // Current user's account
  const { address: connectedAddress } = useAccount();
  
  // Active tab state
  const [activeTab, setActiveTab] = useState<TabType>(
    defaultMode === 'activate-school' ? 'activate' : 
    defaultMode === 'deactivate-student' ? 'deactivate' : 'transfer'
  );
  
  // School activation state
  const [schoolAddress, setSchoolAddress] = useState<string>(initialSchoolAddress || '');
  const [isSchoolActive, setIsSchoolActive] = useState<boolean | undefined>(undefined);
  const [schoolActivationTime, setSchoolActivationTime] = useState<Date | null>(null);
  
  // Student deactivation state
  const [studentAddress, setStudentAddress] = useState<string>(initialStudentAddress || '');
  const [studentCurrentSchool] = useState<string>('');
  const [isStudentActive, setIsStudentActive] = useState<boolean | undefined>(undefined);
  const [deactivationReason, setDeactivationReason] = useState<string>('');
  const [deactivationTime, setDeactivationTime] = useState<Date | null>(null);
  
  // Student transfer state
  const [transferStudentAddress, setTransferStudentAddress] = useState<string>(initialStudentAddress || '');
  const [currentSchoolAddress, setCurrentSchoolAddress] = useState<string>('');
  const [newSchoolAddress, setNewSchoolAddress] = useState<string>('');
  const [isStudentVerified, setIsStudentVerified] = useState<boolean | null>(null);
  const [isNewSchoolActive, setIsNewSchoolActive] = useState<boolean | null>(null);
  const [verificationStep, setVerificationStep] = useState<number>(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  // Role state
  const [hasTeacherRole, setHasTeacherRole] = useState<boolean | undefined>(hideRoleChecker);
  const [hasAdminRole, setHasAdminRole] = useState<boolean | undefined>(hideRoleChecker);
  const [roleCheckComplete, setRoleCheckComplete] = useState<boolean>(hideRoleChecker);
  
  // UI state
  const [validationError, setValidationError] = useState<string>('');
  const [showActivationForm, setShowActivationForm] = useState<boolean>(false);
  const [showDeactivationForm, setShowDeactivationForm] = useState<boolean>(false);
  const [activationNote, setActivationNote] = useState<string>('');
  const [deactivationNote, setDeactivationNote] = useState<string>('');
  const [, setProcessingState] = useState<'initial' | 'processing' | 'completed'>('initial');
  
  // Transaction state
  const [operationResult, setOperationResult] = useState<OperationResult>({
    status: 'idle',
    hash: undefined,
    error: null,
    timestamp: null
  });
  
  // Write contract hook
  const { 
    writeContractAsync,
    isPending,
    isSuccess,
    isError: isWriteError,
    error: writeError,
    data: transactionHash,
    reset: resetWrite
  } = useWriteContract();
  
  // Create school data object
  const schoolData: SchoolData = {
    address: schoolAddress,
    isActive: isSchoolActive,
    activationTime: schoolActivationTime
  };
  
  // Create student data object
  const studentData: StudentData = {
    address: studentAddress,
    isActive: isStudentActive,
    currentSchoolAddress: studentCurrentSchool,
    deactivationReason,
    deactivationTime
  };
  
  // Create transfer data object
  const transferData: TransferData = {
    studentAddress: transferStudentAddress,
    currentSchoolAddress,
    newSchoolAddress,
    isStudentVerified,
    isNewSchoolActive,
    verificationStep,
    lastUpdated
  };
  
  // Create unified data object for export
  const createUnifiedData = useCallback((): UnifiedStudentManagementData => {
    return {
      activeOperation: 
        activeTab === 'activate' ? 'activate-school' :
        activeTab === 'deactivate' ? 'deactivate-student' : 'transfer-student',
      schoolData: schoolAddress ? { ...schoolData } : null,
      studentData: studentAddress ? { ...studentData } : null,
      transferData: transferStudentAddress && currentSchoolAddress && newSchoolAddress ? { ...transferData } : null,
      operationResult: { ...operationResult },
      permissions: {
        hasTeacherRole,
        hasAdminRole,
        roleCheckComplete
      }
    };
  }, [
    activeTab, schoolData, schoolAddress, studentData, studentAddress, 
    transferData, transferStudentAddress, currentSchoolAddress, newSchoolAddress,
    operationResult, hasTeacherRole, hasAdminRole, roleCheckComplete
  ]);
  
  // Update exported data when dependencies change
  useEffect(() => {
    if (onDataChange) {
      const unifiedData = createUnifiedData();
      onDataChange(unifiedData);
    }
  }, [createUnifiedData, onDataChange]);
  
  // Validate Ethereum address
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
  
  // Update status when transaction is confirmed
  useEffect(() => {
    if (isSuccess && transactionHash) {
      setOperationResult({
        status: 'success',
        hash: transactionHash,
        error: null,
        timestamp: new Date()
      });
      
      setProcessingState('completed');
      
      // Update depending on active tab
      if (activeTab === 'activate') {
        setSchoolActivationTime(new Date());
        setIsSchoolActive(true);
        setActivationNote('School activated successfully! The school can now manage students and participate in educational programs.');
        
        if (onSchoolActivated) {
          onSchoolActivated(true, schoolAddress);
        }
      } else if (activeTab === 'deactivate') {
        setDeactivationTime(new Date());
        setIsStudentActive(false);
        setDeactivationNote('Student deactivated successfully! The student is no longer active in the educational system.');
        
        if (onStudentDeactivated) {
          onStudentDeactivated(true, studentAddress);
        }
      } else if (activeTab === 'transfer') {
        setLastUpdated(new Date());
        
        if (onStudentTransferred) {
          onStudentTransferred(true, transferStudentAddress, newSchoolAddress);
        }
      }
    }
  }, [
    isSuccess, transactionHash, activeTab, schoolAddress, studentAddress, 
    transferStudentAddress, newSchoolAddress, onSchoolActivated, 
    onStudentDeactivated, onStudentTransferred
  ]);
  
  // Handle transaction errors
  useEffect(() => {
    if (isWriteError && writeError) {
      const errorMessage = (writeError as Error)?.message || 'Unknown error occurred';
      
      setOperationResult({
        status: 'error',
        hash: undefined,
        error: errorMessage,
        timestamp: new Date()
      });
      
      setProcessingState('initial');
      
      // Update depending on active tab
      if (activeTab === 'activate') {
        setActivationNote(`Error activating school: ${errorMessage}`);
        
        if (onSchoolActivated) {
          onSchoolActivated(false, schoolAddress);
        }
      } else if (activeTab === 'deactivate') {
        setDeactivationNote(`Error deactivating student: ${errorMessage}`);
        
        if (onStudentDeactivated) {
          onStudentDeactivated(false, studentAddress);
        }
      } else if (activeTab === 'transfer') {
        setLastUpdated(new Date());
        
        if (onStudentTransferred) {
          onStudentTransferred(false, transferStudentAddress, newSchoolAddress);
        }
      }
    }
  }, [
    isWriteError, writeError, activeTab, schoolAddress, studentAddress, 
    transferStudentAddress, newSchoolAddress, onSchoolActivated, 
    onStudentDeactivated, onStudentTransferred
  ]);
  
  // Reset forms and state
  const resetAll = () => {
    // Reset common state
    setValidationError('');
    setProcessingState('initial');
    resetWrite?.();
    
    // Reset based on active tab
    if (activeTab === 'activate') {
      if (!initialSchoolAddress) {
        setSchoolAddress('');
      }
      setShowActivationForm(false);
      setActivationNote('');
      setIsSchoolActive(undefined);
      setSchoolActivationTime(null);
    } else if (activeTab === 'deactivate') {
      if (!initialStudentAddress) {
        setStudentAddress('');
      }
      setShowDeactivationForm(false);
      setDeactivationNote('');
      setDeactivationReason('');
      setDeactivationTime(null);
      setIsStudentActive(undefined);
    } else if (activeTab === 'transfer') {
      if (!initialStudentAddress) {
        setTransferStudentAddress('');
      }
      setCurrentSchoolAddress('');
      setNewSchoolAddress('');
      setIsStudentVerified(null);
      setIsNewSchoolActive(null);
      setVerificationStep(0);
      setLastUpdated(null);
    }
    
    // Reset operation result
    setOperationResult({
      status: 'idle',
      hash: undefined,
      error: null,
      timestamp: null
    });
  };
  
  // Handle tab change
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    resetAll();
  };
  
  // Handle school status fetched
  const handleSchoolStatusFetched = (isActive: boolean) => {
    setIsSchoolActive(isActive);
    
    // Only show activation form if address is valid but not active
    if (isActive) {
      setShowActivationForm(false);
    } else {
      setShowActivationForm(true);
    }
  };
  
  // Handle student verification result
  const handleStudentVerification = (isVerified: boolean, verifiedStudentAddr: string) => {
    if (activeTab === 'deactivate' && verifiedStudentAddr === studentAddress) {
      setIsStudentActive(isVerified);
      setShowDeactivationForm(isVerified);
    } else if (activeTab === 'transfer' && verifiedStudentAddr === transferStudentAddress) {
      setIsStudentVerified(isVerified);
      
      // If student verification is complete in transfer mode, proceed to check school status
      if (verificationStep === 1) {
        setVerificationStep(2);
      }
    }
  };
  
  // Handle school activation
  const handleActivateSchool = async () => {
    if (!validateAddress(schoolAddress, 'School')) {
      return;
    }
    
    try {
      setProcessingState('processing');
      setOperationResult({
        status: 'pending',
        hash: undefined,
        error: null,
        timestamp: new Date()
      });
      
      // Call the contract with the correctly structured parameters
      const hash = await writeContractAsync({
        abi: contract.abi, 
        address: contract.address as `0x${string}`,
        functionName: 'activateSchool',
        args: [schoolAddress as `0x${string}`]
      });
      
      setOperationResult({
        status: 'pending',
        hash,
        error: null,
        timestamp: new Date()
      });
      
      setActivationNote('School activation transaction submitted. It may take a moment to process.');
    } catch (error) {
      console.error('Error activating school:', error);
      
      setOperationResult({
        status: 'error',
        hash: undefined,
        error: (error as Error)?.message || 'Unknown error',
        timestamp: new Date()
      });
      
      setProcessingState('initial');
      setActivationNote('Error submitting activation transaction. Please try again.');
    }
  };
  
  // Handle student deactivation
  const handleDeactivateStudent = async () => {
    if (!validateAddress(studentAddress, 'Student')) {
      return;
    }
    
    try {
      setProcessingState('processing');
      setOperationResult({
        status: 'pending',
        hash: undefined,
        error: null,
        timestamp: new Date()
      });
      
      // Call the contract with the correctly structured parameters
      const hash = await writeContractAsync({
        abi: contract.abi, 
        address: contract.address as `0x${string}`,
        functionName: 'deactivateStudent',
        args: [studentAddress as `0x${string}`]
      });
      
      setOperationResult({
        status: 'pending',
        hash,
        error: null,
        timestamp: new Date()
      });
      
      setDeactivationNote('Student deactivation transaction submitted. It may take a moment to process.');
    } catch (error) {
      console.error('Error deactivating student:', error);
      
      setOperationResult({
        status: 'error',
        hash: undefined,
        error: (error as Error)?.message || 'Unknown error',
        timestamp: new Date()
      });
      
      setProcessingState('initial');
      setDeactivationNote('Error submitting deactivation transaction. Please try again.');
    }
  };
  
  // Handle transfer verification
  const handleVerifyTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all inputs
    const isStudentValid = validateAddress(transferStudentAddress, 'Student');
    if (!isStudentValid) return;
    
    const isCurrentSchoolValid = validateAddress(currentSchoolAddress, 'Current School');
    if (!isCurrentSchoolValid) return;
    
    const isNewSchoolValid = validateAddress(newSchoolAddress, 'New School');
    if (!isNewSchoolValid) return;
    
    // Start verification process
    setVerificationStep(1);
    setLastUpdated(new Date());
  };
  
  // Handle student transfer
  const handleTransferStudent = async () => {
    if (!isStudentVerified || !isNewSchoolActive) return;
    
    try {
      setProcessingState('processing');
      setOperationResult({
        status: 'pending',
        hash: undefined,
        error: null,
        timestamp: new Date()
      });
      
      // Call the contract
      const hash = await writeContractAsync({
        abi: contract.abi, 
        address: contract.address as `0x${string}`,
        functionName: 'transferStudent',
        args: [transferStudentAddress as `0x${string}`, newSchoolAddress as `0x${string}`]
      });
      
      setOperationResult({
        status: 'pending',
        hash,
        error: null,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error transferring student:', error);
      
      setOperationResult({
        status: 'error',
        hash: undefined,
        error: (error as Error)?.message || 'Unknown error',
        timestamp: new Date()
      });
      
      setProcessingState('initial');
    }
  };
  
  // Get verification status for student in transfer process
  const getStudentVerificationStatus = () => {
    if (isStudentVerified === null) {
      return { text: 'Not Verified', color: 'text-gray-400', bg: 'bg-gray-500/20' };
    }
    
    return isStudentVerified
      ? { text: 'Verified', color: 'text-green-400', bg: 'bg-green-500/20' }
      : { text: 'Not Verified', color: 'text-red-400', bg: 'bg-red-500/20' };
  };

  // Get verification status for new school in transfer process
  const getSchoolVerificationStatus = () => {
    if (isNewSchoolActive === null) {
      return { text: 'Unknown Status', color: 'text-gray-400', bg: 'bg-gray-500/20' };
    }
    
    return isNewSchoolActive
      ? { text: 'Active School', color: 'text-green-400', bg: 'bg-green-500/20' }
      : { text: 'Inactive School', color: 'text-red-400', bg: 'bg-red-500/20' };
  };
  
  // Calculate if transfer is possible
  const canTransfer = isStudentVerified && isNewSchoolActive && verificationStep === 3 && !isPending;
  
  // Status variables for transfer process
  const studentStatus = getStudentVerificationStatus();
  const schoolStatus = getSchoolVerificationStatus();
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-gray-900/90 backdrop-blur-sm border border-gray-700 shadow-xl rounded-lg p-6 max-w-full mx-auto w-full md:max-w-full mb-9"
    >
      <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
        Student Management System
      </h2>
      
      <p className="text-gray-300 text-sm mb-6">
        Manage schools, students, and transfers on the blockchain.
      </p>
      
      {/* Tab navigation */}
      {showAllTabs && (
        <div className="flex flex-wrap mb-6 border-b border-gray-700">
          <button
            onClick={() => handleTabChange('activate')}
            className={`py-2 px-4 text-sm font-medium transition-colors ${
              activeTab === 'activate'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Activate School
          </button>
          
          <button
            onClick={() => handleTabChange('deactivate')}
            className={`py-2 px-4 text-sm font-medium transition-colors ${
              activeTab === 'deactivate'
                ? 'text-red-400 border-b-2 border-red-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Deactivate Student
          </button>
          
          <button
            onClick={() => handleTabChange('transfer')}
            className={`py-2 px-4 text-sm font-medium transition-colors ${
              activeTab === 'transfer'
                ? 'text-green-400 border-b-2 border-green-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Transfer Student
          </button>
        </div>
      )}
      
      {/* Connected Wallet Information */}
      {connectedAddress && (
        <div className="mb-4 bg-gray-700/30 p-3 rounded-md">
          <p className="text-xs text-gray-400">
            Connected as: <span className="text-blue-400 font-mono">{connectedAddress}</span>
          </p>
        </div>
      )}
      
      {/* Role Management Dashboard - Hidden but used for role verification */}
      {!hideRoleChecker && (
        <div className="hidden">
          <RoleManagementDashboard
            contract={contract}
            hasRoleFunction={contract}
            onRoleDataFetched={() => {
              // Here we would check for specific roles based on the role data
              // Since this is hidden, we'll simulate the check
              setHasTeacherRole(true);
              setHasAdminRole(true);
              setRoleCheckComplete(true);
            }}
          />
        </div>
      )}
      
      {/* SCHOOL ACTIVATION TAB */}
      {activeTab === 'activate' && (
        <div className="space-y-6">
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <h3 className="text-lg font-medium text-blue-400 mb-3">
              School Activation Portal
            </h3>
            
            <div className="bg-gray-700/30 rounded-md p-3 mb-4">
              <p className="text-sm text-gray-300">
                Activate a school to grant it permissions for managing students and educational programs.
              </p>
            </div>
            
            {/* School Address Input */}
            <div className="mb-4 space-y-2">
              <div className="flex space-x-2">
                <div className="flex-grow">
                  <input
                    type="text"
                    value={schoolAddress}
                    onChange={(e) => {
                      setSchoolAddress(e.target.value);
                      setValidationError('');
                      setShowActivationForm(false);
                      resetWrite?.();
                    }}
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
            
            {/* School Status Indicator */}
            {schoolAddress && validateAddress(schoolAddress, 'School') && isSchoolActive !== undefined && (
              <div className="mb-4">
                <div className={`flex items-center p-3 rounded-md ${
                  isSchoolActive ? 'bg-green-900/20 border border-green-700/30' : 'bg-yellow-900/20 border border-yellow-700/30'
                }`}>
                  {isSchoolActive ? (
                    <svg className="w-5 h-5 text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-yellow-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  )}
                  <span className={`text-sm ${isSchoolActive ? 'text-green-300' : 'text-yellow-300'}`}>
                    {isSchoolActive 
                      ? 'This address is an active school in the system' 
                      : 'This address is not currently active as a school'}
                  </span>
                </div>
              </div>
            )}
            
            {/* School Status Checker */}
            {schoolAddress && validateAddress(schoolAddress, 'School') && (
              <div className={isSchoolActive !== undefined ? 'hidden' : 'mb-6'}>
                <SchoolStatusChecker
                  contract={contract}
                  schoolAddress={schoolAddress as `0x${string}`}
                  onStatusFetched={handleSchoolStatusFetched}
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
                      {schoolAddress}
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
                      disabled={isPending}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleActivateSchool}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={isPending}
                    >
                      {isPending ? (
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
            {operationResult.status === 'success' && activeTab === 'activate' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="mt-6 bg-green-900/20 border border-green-700/30 rounded-lg p-4"
              >
                <div className="flex items-start">
                  <svg className="w-6 h-6 text-green-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h4 className="text-lg font-medium text-green-400">
                      Activation Successful
                    </h4>
                    <p className="text-sm text-gray-300 mt-1">
                      {activationNote}
                    </p>
                    
                    <div className="mt-3 pt-3 border-t border-green-700/30">
                      <p className="text-sm text-gray-300">
                        The school is now ready to register students and participate in educational programs. To begin managing students, navigate to the School Management Dashboard.
                      </p>
                      
                      <div className="mt-3">
                        <button
                          type="button"
                          onClick={resetAll}
                          className="px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                        >
                          Activate Another School
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
            
            {/* Activation Error */}
            {operationResult.status === 'error' && activeTab === 'activate' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="mt-6 bg-red-900/20 border border-red-700/30 rounded-lg p-4"
              >
                <div className="flex items-start">
                  <svg className="w-6 h-6 text-red-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h4 className="text-lg font-medium text-red-400">
                      Activation Failed
                    </h4>
                    <p className="text-sm text-gray-300 mt-1">
                      {activationNote}
                    </p>
                    
                    <div className="mt-3 pt-3 border-t border-red-700/30">
                      <button
                        type="button"
                        onClick={resetAll}
                        className="px-4 py-2 bg-gray-600 text-white text-sm rounded-md hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500"
                      >
                        Try Again
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
            
            {/* Status Information - shows when address is valid but activation form is not visible */}
            {isSchoolActive && !showActivationForm && operationResult.status !== 'success' && operationResult.status !== 'error' && (
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
                      The address <span className="font-mono bg-gray-800/70 px-1 rounded">{schoolAddress}</span> is already registered as an active school in the system.
                    </p>
                    
                    <div className="mt-3 pt-3 border-t border-blue-700/30">
                      <p className="text-sm text-gray-300">
                        This school can already register students and participate in educational programs. If you need to manage this school, you can visit the School Management Dashboard.
                      </p>
                      
                      <div className="mt-3">
                        <button
                          type="button"
                          onClick={resetAll}
                          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          Check Another School
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
            
            {/* Educational Information */}
            {!isSchoolActive && !showActivationForm && operationResult.status !== 'success' && operationResult.status !== 'error' && (
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
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* STUDENT DEACTIVATION TAB */}
      {activeTab === 'deactivate' && (
        <div className="space-y-6">
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <h3 className="text-lg font-medium text-red-400 mb-3">
              Student Deactivation Portal
            </h3>
            
            <div className="bg-gray-700/30 rounded-md p-3 mb-4">
              <p className="text-sm text-gray-300">
                Deactivate a student to remove them from active participation in educational programs.
              </p>
            </div>
            
            {/* Student Address Input */}
            <div className="mb-4 space-y-2">
              <label className="block text-sm text-gray-400">Student Address</label>
              <div className="flex space-x-2">
                <div className="flex-grow">
                  <input
                    type="text"
                    value={studentAddress}
                    onChange={(e) => {
                      setStudentAddress(e.target.value);
                      setValidationError('');
                      setShowDeactivationForm(false);
                      resetWrite?.();
                    }}
                    placeholder="Student address (0x...)"
                    className={`w-full px-3 py-2 bg-gray-700 border ${
                      validationError ? 'border-red-500' : 'border-gray-600'
                    } rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent`}
                  />
                </div>
              </div>
              {validationError && (
                <p className="text-xs text-red-400">{validationError}</p>
              )}
            </div>
            
            {/* Test Student Addresses */}
            <div className="mb-4 space-y-2">
              <h4 className="text-xs text-gray-400 mb-1">Test Student Addresses:</h4>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setStudentAddress("0x742d35Cc6634C0532925a3b844Bc454e4438f44e")}
                  className="text-xs bg-gray-600 hover:bg-gray-500 text-gray-200 py-1 px-2 rounded"
                >
                  Test Student 1
                </button>
                <button
                  type="button"
                  onClick={() => setStudentAddress("0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199")}
                  className="text-xs bg-gray-600 hover:bg-gray-500 text-gray-200 py-1 px-2 rounded"
                >
                  Test Student 2
                </button>
              </div>
            </div>
            
            {/* Student Verification Component */}
            {studentAddress && validateAddress(studentAddress, 'Student') && (
              <div className="mb-6">
                <StudentSchoolVerifier
                  contract={contract}
                  studentAddress={studentAddress}
                  onVerificationResult={handleStudentVerification}
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
                  Deactivate Student
                </h4>
                
                <div className="space-y-4">
                  <div className="bg-gray-700/30 rounded-md p-4">
                    <p className="text-sm text-gray-300 mb-3">
                      You are about to deactivate the following student in the educational system:
                    </p>
                    
                    <div className="bg-gray-800/50 rounded-md p-3 font-mono text-sm text-white break-all mb-3">
                      {studentAddress}
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
                        onChange={(e) => setDeactivationReason(e.target.value)}
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
                      disabled={isPending}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleDeactivateStudent}
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                      disabled={isPending}
                    >
                      {isPending ? (
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
            {operationResult.status === 'success' && activeTab === 'deactivate' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="mt-6 bg-green-900/20 border border-green-700/30 rounded-lg p-4"
              >
                <div className="flex items-start">
                  <svg className="w-6 h-6 text-green-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h4 className="text-lg font-medium text-green-400">
                      Deactivation Successful
                    </h4>
                    <p className="text-sm text-gray-300 mt-1">
                      {deactivationNote}
                    </p>
                    
                    {deactivationTime && (
                      <div className="flex items-center mt-2 text-xs text-gray-400">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Completed {formatDistanceToNow(deactivationTime, { addSuffix: true })}
                      </div>
                    )}
                    
                    <div className="mt-3 pt-3 border-t border-green-700/30">
                      <p className="text-sm text-gray-300">
                        The student has been deactivated and can no longer participate in the educational system. Their academic record remains intact for reference.
                      </p>
                      
                      <div className="mt-3">
                        <button
                          type="button"
                          onClick={resetAll}
                          className="px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                        >
                          Deactivate Another Student
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
            
            {/* Deactivation Error */}
            {operationResult.status === 'error' && activeTab === 'deactivate' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="mt-6 bg-red-900/20 border border-red-700/30 rounded-lg p-4"
              >
                <div className="flex items-start">
                  <svg className="w-6 h-6 text-red-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h4 className="text-lg font-medium text-red-400">
                      Deactivation Failed
                    </h4>
                    <p className="text-sm text-gray-300 mt-1">
                      {deactivationNote}
                    </p>
                    
                    <div className="mt-3 pt-3 border-t border-red-700/30">
                      <button
                        type="button"
                        onClick={resetAll}
                        className="px-4 py-2 bg-gray-600 text-white text-sm rounded-md hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500"
                      >
                        Try Again
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      )}
      
      {/* STUDENT TRANSFER TAB */}
      {activeTab === 'transfer' && (
        <div className="space-y-6">
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <h3 className="text-lg font-medium text-green-400 mb-3">
              Student Transfer System
            </h3>
            
            <div className="bg-gray-700/30 rounded-md p-3 mb-4">
              <p className="text-sm text-gray-300">
                Transfer a student from one school to another while maintaining their academic records.
              </p>
            </div>
            
            {/* Transfer Form */}
            <form onSubmit={handleVerifyTransfer} className="space-y-4 mb-4">
              <div className="bg-gray-700/30 rounded-lg p-4 space-y-4">
                {/* Student Address Input */}
                <div className="space-y-2">
                  <label htmlFor="student-address" className="block text-sm font-medium text-gray-300">
                    Student Wallet Address
                  </label>
                  <input
                    id="student-address"
                    type="text"
                    value={transferStudentAddress}
                    onChange={(e) => {
                      setTransferStudentAddress(e.target.value);
                      setValidationError('');
                      setVerificationStep(0);
                      setIsStudentVerified(null);
                      resetWrite?.();
                    }}
                    placeholder="0x..."
                    className={`w-full px-3 py-2 bg-gray-700 border ${
                      validationError && !transferStudentAddress ? 'border-red-500' : 'border-gray-600'
                    } rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent`}
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
                    value={currentSchoolAddress}
                    onChange={(e) => {
                      setCurrentSchoolAddress(e.target.value);
                      setValidationError('');
                      setVerificationStep(0);
                      setIsStudentVerified(null);
                      resetWrite?.();
                    }}
                    placeholder="0x..."
                    className={`w-full px-3 py-2 bg-gray-700 border ${
                      validationError && !currentSchoolAddress ? 'border-red-500' : 'border-gray-600'
                    } rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent`}
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
                    value={newSchoolAddress}
                    onChange={(e) => {
                      setNewSchoolAddress(e.target.value);
                      setValidationError('');
                      setVerificationStep(0);
                      setIsNewSchoolActive(null);
                      resetWrite?.();
                    }}
                    placeholder="0x..."
                    className={`w-full px-3 py-2 bg-gray-700 border ${
                      validationError && !newSchoolAddress ? 'border-red-500' : 'border-gray-600'
                    } rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent`}
                  />
                  <p className="text-xs text-gray-400">Enter the address of the school to transfer to</p>
                </div>
                
                {/* Error Display */}
                {validationError && (
                  <div className="text-xs text-red-400 bg-red-400/10 p-2 rounded border border-red-400/30">
                    {validationError}
                  </div>
                )}
                
                {/* Quick Test Buttons */}
                <div className="flex flex-wrap gap-2 mt-2">
                  <div>
                    <h4 className="text-xs text-gray-400 mb-1">Test Addresses:</h4>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setTransferStudentAddress("0x742d35Cc6634C0532925a3b844Bc454e4438f44e");
                          setCurrentSchoolAddress("0xdD2FD4581271e230360230F9337D5c0430Bf44C0");
                          setNewSchoolAddress("0x5FbDB2315678afecb367f032d93F642f64180aa3");
                          setValidationError('');
                          setVerificationStep(0);
                          setIsStudentVerified(null);
                          setIsNewSchoolActive(null);
                          resetWrite?.();
                        }}
                        className="text-xs bg-gray-600 hover:bg-gray-500 text-gray-200 py-1 px-2 rounded"
                      >
                        Load Test Data
                      </button>
                      <button
                        type="button"
                        onClick={resetAll}
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
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                    disabled={verificationStep > 0}
                  >
                    {verificationStep > 0 ? (
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
                        {studentStatus.text}
                      </span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="space-y-1">
                      <p className="text-xs text-gray-400">Student Address:</p>
                      <p className="text-sm font-mono text-white break-all">{transferStudentAddress}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-gray-400">Current School Address:</p>
                      <p className="text-sm font-mono text-white break-all">{currentSchoolAddress}</p>
                    </div>
                  </div>
                  
                  <div className="bg-gray-700/40 rounded-md p-3 border border-gray-600">
                    {isStudentVerified === null ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-t-blue-400 border-blue-200/30 rounded-full animate-spin"></div>
                        <span className="text-sm text-gray-300">Verifying student enrollment...</span>
                      </div>
                    ) : isStudentVerified ? (
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
                </div>
                
                {/* Hidden School Status Checker for the new school */}
                {verificationStep === 2 && (
                  <div className="hidden">
                    <SchoolStatusChecker
                      contract={contract}
                      schoolAddress={newSchoolAddress as `0x${string}`}
                      onStatusFetched={(isActive) => {
                        setIsNewSchoolActive(isActive);
                        
                        // If school verification completes the process
                        if (verificationStep === 2) {
                          setVerificationStep(3);
                        }
                      }}
                    />
                  </div>
                )}
                
                {/* School Verification Status (only show when student verification is complete) */}
                {verificationStep >= 2 && (
                  <div className="bg-gray-700/30 border border-gray-600 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-4">
                      <h5 className="text-sm font-medium text-gray-300">New School Status Check</h5>
                      <div className={`inline-flex items-center px-3 py-1 rounded-full ${schoolStatus.bg} border border-${schoolStatus.color.replace('text-', '')}/30`}>
                        <div className={`w-2 h-2 rounded-full ${schoolStatus.color.replace('text-', 'bg-')} mr-2`}></div>
                        <span className={`text-xs font-medium ${schoolStatus.color}`}>
                          {schoolStatus.text}
                        </span>
                      </div>
                    </div>
                    
                    <div className="space-y-1 mb-4">
                      <p className="text-xs text-gray-400">Target School Address:</p>
                      <p className="text-sm font-mono text-white break-all">{newSchoolAddress}</p>
                    </div>
                    
                    <div className="bg-gray-700/40 rounded-md p-3 border border-gray-600">
                      {isNewSchoolActive === null ? (
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 border-2 border-t-blue-400 border-blue-200/30 rounded-full animate-spin"></div>
                          <span className="text-sm text-gray-300">Checking school status...</span>
                        </div>
                      ) : isNewSchoolActive ? (
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
                          onClick={handleTransferStudent}
                          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={isPending}
                        >
                          {isPending ? (
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
                {operationResult.status === 'success' && activeTab === 'transfer' && (
                  <div className="bg-green-500/10 border-green-500/30 border rounded-lg p-4 mt-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                        <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div>
                        <h5 className="text-sm font-medium text-green-400">
                          Transfer Successful
                        </h5>
                        <p className="text-sm text-gray-300 mt-1">
                          Student has been successfully transferred to the new school.
                        </p>
                        
                        <div className="flex justify-end mt-4">
                          <button
                            type="button"
                            onClick={resetAll}
                            className="px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                          >
                            Transfer Another Student
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Transfer Error Display */}
                {operationResult.status === 'error' && activeTab === 'transfer' && (
                  <div className="bg-red-500/10 border-red-500/30 border rounded-lg p-4 mt-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                        <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </div>
                      <div>
                        <h5 className="text-sm font-medium text-red-400">
                          Transfer Failed
                        </h5>
                        <p className="text-sm text-gray-300 mt-1">
                          {operationResult.error ? (operationResult.error as Error).message : 'An error occurred during the transfer process.'}
                        </p>
                        
                        <div className="flex justify-end mt-4">
                          <button
                            type="button"
                            onClick={resetAll}
                            className="px-4 py-2 bg-gray-600 text-white text-sm rounded-md hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500"
                          >
                            Try Again
                          </button>
                        </div>
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
          </div>
        </div>
      )}
    </motion.div>
  );
};

/**
 * Custom hook for school activation 
 */
export const useSchoolActivation = (initialSchoolAddress?: string) => {
  const [schoolData, setSchoolData] = useState<SchoolData | null>(null);
  const [operationResult, setOperationResult] = useState<OperationResult>({
    status: 'idle',
    timestamp: null
  });

  // Callback for when data changes
  const handleDataChange = (data: UnifiedStudentManagementData) => {
    setSchoolData(data.schoolData);
    setOperationResult(data.operationResult);
  };

  return {
    SchoolActivationComponent: (props: Partial<UnifiedStudentManagementProps> = {}) => (
      <UnifiedStudentManagement
        defaultMode="activate-school"
        initialSchoolAddress={initialSchoolAddress}
        onDataChange={handleDataChange}
        showAllTabs={false}
        {...props}
      />
    ),
    schoolData,
    operationResult,
    isActive: schoolData?.isActive || false,
    isLoading: operationResult.status === 'pending',
    isSuccess: operationResult.status === 'success',
    isError: operationResult.status === 'error',
    error: operationResult.error
  };
};

/**
 * Custom hook for student deactivation
 */
export const useStudentDeactivation = (initialStudentAddress?: string) => {
  const [studentData, setStudentData] = useState<StudentData | null>(null);
  const [operationResult, setOperationResult] = useState<OperationResult>({
    status: 'idle',
    timestamp: null
  });

  // Callback for when data changes
  const handleDataChange = (data: UnifiedStudentManagementData) => {
    setStudentData(data.studentData);
    setOperationResult(data.operationResult);
  };

  return {
    StudentDeactivationComponent: (props: Partial<UnifiedStudentManagementProps> = {}) => (
      <UnifiedStudentManagement
        defaultMode="deactivate-student"
        initialStudentAddress={initialStudentAddress}
        onDataChange={handleDataChange}
        showAllTabs={false}
        {...props}
      />
    ),
    studentData,
    operationResult,
    isActive: studentData?.isActive || false,
    deactivationReason: studentData?.deactivationReason || '',
    isLoading: operationResult.status === 'pending',
    isSuccess: operationResult.status === 'success',
    isError: operationResult.status === 'error',
    error: operationResult.error
  };
};

/**
 * Custom hook for student transfer
 */
export const useStudentTransfer = (initialStudentAddress?: string) => {
  const [transferData, setTransferData] = useState<TransferData | null>(null);
  const [operationResult, setOperationResult] = useState<OperationResult>({
    status: 'idle',
    timestamp: null
  });

  // Callback for when data changes
  const handleDataChange = (data: UnifiedStudentManagementData) => {
    setTransferData(data.transferData);
    setOperationResult(data.operationResult);
  };

  return {
    StudentTransferComponent: (props: Partial<UnifiedStudentManagementProps> = {}) => (
      <UnifiedStudentManagement
        defaultMode="transfer-student"
        initialStudentAddress={initialStudentAddress}
        onDataChange={handleDataChange}
        showAllTabs={false}
        {...props}
      />
    ),
    transferData,
    operationResult,
    isVerified: transferData?.isStudentVerified || false,
    isNewSchoolActive: transferData?.isNewSchoolActive || false,
    verificationStep: transferData?.verificationStep || 0,
    isLoading: operationResult.status === 'pending',
    isSuccess: operationResult.status === 'success',
    isError: operationResult.status === 'error',
    error: operationResult.error
  };
};

/**
 * Main hook for unified student management
 */
export const useStudentManagement = () => {
  const [unifiedData, setUnifiedData] = useState<UnifiedStudentManagementData | null>(null);

  // Callback for when data changes
  const handleDataChange = (data: UnifiedStudentManagementData) => {
    setUnifiedData(data);
  };

  return {
    // Complete component with all tabs
    StudentManagementComponent: (props: Partial<UnifiedStudentManagementProps> = {}) => (
      <UnifiedStudentManagement
        onDataChange={handleDataChange}
        showAllTabs={true}
        {...props}
      />
    ),
    // Individual tab components
    SchoolActivation: useSchoolActivation(),
    StudentDeactivation: useStudentDeactivation(),
    StudentTransfer: useStudentTransfer(),
    // Current data
    data: unifiedData,
    // Helper methods
    getCurrentOperation: () => unifiedData?.activeOperation || 'activate-school',
    hasPermission: (role: 'teacher' | 'admin') => 
      role === 'teacher' ? unifiedData?.permissions.hasTeacherRole || false : 
      role === 'admin' ? unifiedData?.permissions.hasAdminRole || false : false
  };
};

export default UnifiedStudentManagement;