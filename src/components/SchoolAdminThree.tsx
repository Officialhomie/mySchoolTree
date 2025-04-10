import { useState, useEffect, useCallback } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, useReadContract, useAccount } from 'wagmi';
import { motion } from 'framer-motion';
import { formatEther, parseEther, Address } from 'viem';

// Import the contract configuration
import { contractProgramManagementConfig } from '../contracts';

// Import role checker and program ID reader
import RoleChecker from '../MSTReadfunction/ProgramManagementRead/hasRole';
import CurrentProgramIdReader from '../MSTReadfunction/ProgramManagementRead/getProgramID';

// Component modes
export type ComponentMode = 'create' | 'update' | 'view';

// Tab types
type TabType = 'create' | 'manage' | 'view';

// Program Data Interface
export interface ProgramDetails {
  programId: number;
  name: string;
  termFee: bigint;
  requiredAttendance: number;
  maxEnrollment: number;
  isActive: boolean;
  minAttendance: number;
  currentEnrollment: number;
}

// Form values interface
export interface ProgramFormValues {
  programName: string;
  termFee: string;
  requiredAttendance: string;
  maxEnrollment: string;
}

// Transaction data interface
export interface TransactionData {
  hash: string;
  timestamp: Date;
  status: 'pending' | 'success' | 'error';
  error?: Error;
}

// Program creation data export interface
export interface ProgramCreationData {
  programId?: number;
  programName: string;
  termFee: string;
  requiredAttendance: string;
  maxEnrollment: string;
  transaction: TransactionData | null;
}

// Program update data export interface
export interface ProgramUpdateData {
  programId: number;
  field: string;
  oldValue: string;
  newValue: string;
  transaction: TransactionData | null;
}

// Unified program management data export interface
export interface UnifiedProgramData {
  // Current program data
  currentProgram: ProgramDetails | null;
  
  // Creation data
  creationData: ProgramCreationData | null;
  
  // Update data
  updateData: ProgramUpdateData | null;

  // Role and permissions
  permissions: {
    hasAdminRole: boolean;
    roleCheckComplete: boolean;
  };
  
  // Loading and status
  status: {
    isLoading: boolean;
    isSuccess: boolean;
    isError: boolean;
    errorMessage: string | null;
  };
}

// Component props interface
interface UnifiedProgramManagementProps {
  defaultMode?: ComponentMode;
  initialProgramId?: number;
  onProgramCreated?: (data: ProgramCreationData) => void;
  onProgramUpdated?: (data: ProgramUpdateData) => void;
  onDataChange?: (data: UnifiedProgramData) => void;
  adminRole?: string;
  hideRoleChecker?: boolean;
  showAllTabs?: boolean;
}

/**
 * Unified Program Management Component
 * 
 * This component combines program creation and management functions into a single interface
 * with tabs for different operations.
 */
const UnifiedProgramManagement = ({
  defaultMode = 'create',
  initialProgramId,
  onProgramCreated,
  onProgramUpdated,
  onDataChange,
  adminRole,
  hideRoleChecker = false,
  showAllTabs = true
}: UnifiedProgramManagementProps) => {
  // User account
  const { address } = useAccount();
  
  // Active tab state
  const [activeTab, setActiveTab] = useState<TabType>(defaultMode === 'create' ? 'create' : defaultMode === 'update' ? 'manage' : 'view');
  
  // Program data state
  const [currentProgramId, setCurrentProgramId] = useState<number>(initialProgramId || 0);
  const [currentProgram, setCurrentProgram] = useState<ProgramDetails | null>(null);
  
  // Permission state
  const [hasAdminRole, setHasAdminRole] = useState<boolean>(hideRoleChecker); // Assume role is true if hiding checker
  const [roleCheckComplete, setRoleCheckComplete] = useState<boolean>(hideRoleChecker); // Mark as complete if hiding checker
  
  // Form state for creating programs
  const [programName, setProgramName] = useState<string>('');
  const [termFee, setTermFee] = useState<string>('');
  const [requiredAttendance, setRequiredAttendance] = useState<string>('');
  const [maxEnrollment, setMaxEnrollment] = useState<string>('');
  
  // Form state for updating program fee
  const [newTermFee, setNewTermFee] = useState<string>('');
  
  // UI state
  const [, setStatusMessage] = useState<string>('');
  const [, setStatusType] = useState<'success' | 'error' | 'info' | 'warning'>('info');
  const [showStatus, setShowStatus] = useState<boolean>(false);
  const [processingState, setProcessingState] = useState<'initial' | 'processing' | 'completed'>('initial');
  const [validationError, setValidationError] = useState<string>('');
  
  // Export data state
  const [creationData, setCreationData] = useState<ProgramCreationData | null>(null);
  const [updateData, setUpdateData] = useState<ProgramUpdateData | null>(null);
  
  // Define the ADMIN_ROLE constant
  const ADMIN_ROLE = adminRole || "0x0000000000000000000000000000000000000000000000000000000000000000"; // Default admin role
  
  // Predefined roles for the RoleChecker
  const predefinedRoles = {
    "Admin Role": ADMIN_ROLE,
  };
  
  // Read contract hook for the current program
  const {
    data: programData,
    isLoading: isLoadingProgram,
    isSuccess: isProgramSuccess,
    refetch: refetchProgram
  } = useReadContract({
    address: contractProgramManagementConfig.address as Address,
    abi: contractProgramManagementConfig.abi,
    functionName: 'programs',
    args: [currentProgramId],
    query: {
      enabled: currentProgramId > 0
    }
  });
  
  // Write contract hook for transactions
  const {
    data: hash,
    isPending,
    writeContract,
    error: writeError,
    reset: resetWrite
  } = useWriteContract();
  
  // Hook to wait for transaction receipt
  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    error: confirmError
  } = useWaitForTransactionReceipt({ hash });
  
  // Helper for loading and error states
  const isLoading = isPending || isConfirming;
  const error = writeError || confirmError;
  
  // Parse program data when it changes
  useEffect(() => {
    if (programData && isProgramSuccess && currentProgramId > 0) {
      // Extract program data from the returned array
      const [name, isActive, termFee, minAttendance, reqAttendance, enrolled, maxEnroll] = programData as [string, boolean, bigint, number, number, number, number];
      
      setCurrentProgram({
        programId: currentProgramId,
        name,
        termFee,
        requiredAttendance: reqAttendance,
        maxEnrollment: maxEnroll,
        isActive,
        minAttendance,
        currentEnrollment: enrolled
      });
      
      // Update fee input field if we're on the manage tab
      if (activeTab === 'manage') {
        setNewTermFee(formatEther(termFee));
      }
    }
  }, [programData, isProgramSuccess, currentProgramId, activeTab]);
  
  // Callback for when program ID is read
  const handleProgramIdRead = (id: number) => {
    setCurrentProgramId(id);
  };
  
  // Callback for role check result
  const handleRoleCheckResult = (hasRole: boolean) => {
    setHasAdminRole(hasRole);
    setRoleCheckComplete(true);
  };
  
  // Create unified data object for export
  const createUnifiedData = useCallback(() => {
    if (!onDataChange) return;
    
    const unifiedData: UnifiedProgramData = {
      currentProgram,
      creationData,
      updateData,
      permissions: {
        hasAdminRole,
        roleCheckComplete
      },
      status: {
        isLoading,
        isSuccess: isConfirmed,
        isError: !!error,
        errorMessage: error ? (error as Error).message : null
      }
    };
    
    onDataChange(unifiedData);
  }, [
    currentProgram,
    creationData,
    updateData,
    hasAdminRole,
    roleCheckComplete,
    isLoading,
    isConfirmed,
    error,
    onDataChange
  ]);
  
  // Update exported data when dependencies change
  useEffect(() => {
    createUnifiedData();
  }, [createUnifiedData]);
  
  // Hide status message after a delay
  useEffect(() => {
    if (showStatus) {
      const timer = setTimeout(() => {
        setShowStatus(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showStatus]);
  
  // Update status when transaction is confirmed
  useEffect(() => {
    if (isConfirmed && hash) {
      setStatusMessage('Transaction successfully confirmed!');
      setStatusType('success');
      setShowStatus(true);
      setProcessingState('completed');
      
      // Determine whether this was a program creation or fee update
      if (activeTab === 'create') {
        // Create and store creation data for program creation
        const newCreationData: ProgramCreationData = {
          programName,
          termFee,
          requiredAttendance,
          maxEnrollment,
          transaction: {
            hash,
            timestamp: new Date(),
            status: 'success'
          }
        };
        
        setCreationData(newCreationData);
        
        // Callback for program creation
        if (onProgramCreated) {
          onProgramCreated(newCreationData);
        }
      } else if (activeTab === 'manage' && currentProgram) {
        // Create and store update data for fee update
        const newUpdateData: ProgramUpdateData = {
          programId: currentProgramId,
          field: 'termFee',
          oldValue: formatEther(currentProgram.termFee),
          newValue: newTermFee,
          transaction: {
            hash,
            timestamp: new Date(),
            status: 'success'
          }
        };
        
        setUpdateData(newUpdateData);
        
        // Callback for program update
        if (onProgramUpdated) {
          onProgramUpdated(newUpdateData);
        }
      }
    }
  }, [isConfirmed, hash, activeTab, programName, termFee, requiredAttendance, maxEnrollment, currentProgram, currentProgramId, newTermFee, onProgramCreated, onProgramUpdated]);
  
  // Handle transaction errors
  useEffect(() => {
    if (error) {
      const errorMessage = (error as Error)?.message || 'Unknown error occurred';
      setStatusMessage(`Transaction failed: ${errorMessage}`);
      setStatusType('error');
      setShowStatus(true);
      setProcessingState('initial');
      
      // Update transaction status in creation or update data
      if (creationData && creationData.transaction && creationData.transaction.status === 'pending') {
        setCreationData({
          ...creationData,
          transaction: {
            ...creationData.transaction,
            status: 'error',
            error: error as Error
          }
        });
      }
      
      if (updateData && updateData.transaction && updateData.transaction.status === 'pending') {
        setUpdateData({
          ...updateData,
          transaction: {
            ...updateData.transaction,
            status: 'error',
            error: error as Error
          }
        });
      }
    }
  }, [error, creationData, updateData]);
  
  // Validate creation form
  const validateCreateForm = () => {
    if (!programName.trim()) {
      setValidationError('Program name is required');
      return false;
    }
    
    if (!termFee || isNaN(Number(termFee)) || Number(termFee) < 0) {
      setValidationError('Please enter a valid term fee');
      return false;
    }
    
    if (!requiredAttendance || isNaN(Number(requiredAttendance)) || 
        Number(requiredAttendance) < 0 || Number(requiredAttendance) > 10000) {
      setValidationError('Required attendance must be a value between 0 and 10000 (0-100%)');
      return false;
    }
    
    if (!maxEnrollment || isNaN(Number(maxEnrollment)) || 
        !Number.isInteger(Number(maxEnrollment)) || Number(maxEnrollment) <= 0) {
      setValidationError('Maximum enrollment must be a positive integer');
      return false;
    }
    
    setValidationError('');
    return true;
  };
  
  // Validate fee update form
  const validateFeeUpdateForm = () => {
    if (!newTermFee || isNaN(Number(newTermFee)) || Number(newTermFee) < 0) {
      setValidationError('Please enter a valid term fee');
      return false;
    }
    
    if (currentProgram && formatEther(currentProgram.termFee) === newTermFee) {
      setValidationError('New fee must be different from the current fee');
      return false;
    }
    
    setValidationError('');
    return true;
  };
  
  // Handle program creation
  const handleCreateProgram = async () => {
    try {
      // Reset any previous errors
      resetWrite?.();
      setValidationError('');
      
      // Validate form
      if (!validateCreateForm()) {
        return;
      }
      
      // Update UI state
      setProcessingState('processing');
      setStatusMessage('Submitting transaction to create program...');
      setStatusType('info');
      setShowStatus(true);
      
      // Convert input values to appropriate types for the contract
      const termFeeValue = parseEther(termFee);
      const requiredAttendanceValue = Number(requiredAttendance);
      const maxEnrollmentValue = Number(maxEnrollment);
      
      // Create transaction - the hash will be available in the useWriteContract hook's state
      // and will trigger the useEffect that watches for confirmed transactions
      writeContract({
        ...contractProgramManagementConfig,
        address: contractProgramManagementConfig.address as `0x${string}`,
        functionName: 'createProgram',
        args: [
          programName,
          termFeeValue,
          requiredAttendanceValue,
          maxEnrollmentValue
        ]
      });
      
      // Show pending status
      setStatusMessage('Transaction submitted! Waiting for confirmation...');
      setStatusType('info');
      setShowStatus(true);
    } catch (err) {
      console.error('Error creating program:', err);
      const error = err instanceof Error ? err : new Error('Unknown error');
      setStatusMessage(`Error: ${error.message}`);
      setStatusType('error');
      setShowStatus(true);
      setProcessingState('initial');
    }
  };
  
  // Handle fee update
  const handleUpdateFee = async () => {
    try {
      // Reset any previous errors
      resetWrite?.();
      setValidationError('');
      
      // Validate form
      if (!validateFeeUpdateForm() || !currentProgram) {
        return;
      }
      
      // Update UI state
      setProcessingState('processing');
      setStatusMessage('Submitting transaction to update program fee...');
      setStatusType('info');
      setShowStatus(true);
      
      // Convert input values
      const newFeeValue = parseEther(newTermFee);
      
      // Execute transaction - the hash will be available in the useWriteContract hook's state
      // and will trigger the useEffect that watches for confirmed transactions
      writeContract({
        ...contractProgramManagementConfig,
        address: contractProgramManagementConfig.address as `0x${string}`,
        functionName: 'updateProgramFee',
        args: [currentProgramId, newFeeValue]
      });
      
      // Show pending status
      setStatusMessage('Transaction submitted! Waiting for confirmation...');
      setStatusType('info');
      setShowStatus(true);
    } catch (err) {
      console.error('Error updating program fee:', err);
      const error = err instanceof Error ? err : new Error('Unknown error');
      setStatusMessage(`Error: ${error.message}`);
      setStatusType('error');
      setShowStatus(true);
      setProcessingState('initial');
    }
  };
  
  // Reset forms
  const resetCreateForm = () => {
    setProgramName('');
    setTermFee('');
    setRequiredAttendance('');
    setMaxEnrollment('');
    setValidationError('');
    setProcessingState('initial');
    resetWrite?.();
  };
  
  const resetUpdateForm = () => {
    if (currentProgram) {
      setNewTermFee(formatEther(currentProgram.termFee));
    } else {
      setNewTermFee('');
    }
    setValidationError('');
    setProcessingState('initial');
    resetWrite?.();
  };
  
  // Public methods for external use
  const createProgram = (values: ProgramFormValues) => {
    if (typeof window !== 'undefined' && (window as any).__programManagement) {
      const programManagement = (window as any).__programManagement;
      programManagement.setProgramName(values.programName);
      programManagement.setTermFee(values.termFee);
      programManagement.setRequiredAttendance(values.requiredAttendance);
      programManagement.setMaxEnrollment(values.maxEnrollment);
      
      // Execute after state updates
      setTimeout(() => {
        programManagement.handleCreateProgram();
      }, 100);
    }
  };
  
  const updateProgramFee = (programId: number, newFee: string) => {
    if (typeof window !== 'undefined' && (window as any).__programManagement) {
      const programManagement = (window as any).__programManagement;
      programManagement.setCurrentProgramId(programId);
      programManagement.setNewTermFee(newFee);
      
      // Execute after state updates
      setTimeout(() => {
        programManagement.handleUpdateFee();
      }, 100);
    }
  };
  
  // Expose methods to parent components
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__programManagement = {
        createProgram,
        updateProgramFee,
        resetCreateForm,
        resetUpdateForm,
        refetchProgram,
        getCurrentProgramId: () => currentProgramId,
        getCurrentProgram: () => currentProgram,
        hasAdminRole: () => hasAdminRole,
        // Add state setters
        setProgramName,
        setTermFee,
        setRequiredAttendance,
        setMaxEnrollment,
        setValidationError,
        setProcessingState,
        resetWrite,
        setCurrentProgramId,
        setNewTermFee,
        // Add handlers
        handleCreateProgram,
        handleUpdateFee
      };
    }
    
    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).__programManagement;
      }
    };
  }, [
    currentProgramId,
    currentProgram,
    hasAdminRole,
    setProgramName,
    setTermFee,
    setRequiredAttendance,
    setMaxEnrollment,
    setValidationError,
    setProcessingState,
    resetWrite,
    setCurrentProgramId,
    setNewTermFee,
    handleCreateProgram,
    handleUpdateFee
  ]);
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-gray-900/90 backdrop-blur-sm border border-gray-700 shadow-xl rounded-lg p-6 max-w-full mx-auto w-full md:max-w-full mb-9"
    >
      <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
        Program Management Dashboard
      </h2>
      
      <p className="text-gray-300 text-sm mb-6">
        Create, manage, and view educational programs on the blockchain.
      </p>
      
      {/* Tab navigation */}
      {showAllTabs && (
        <div className="flex flex-wrap mb-6 border-b border-gray-700">
          <button
            onClick={() => setActiveTab('create')}
            className={`py-2 px-4 text-sm font-medium transition-colors ${
              activeTab === 'create'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Create Program
          </button>
          
          <button
            onClick={() => setActiveTab('manage')}
            className={`py-2 px-4 text-sm font-medium transition-colors ${
              activeTab === 'manage'
                ? 'text-green-400 border-b-2 border-green-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Manage Programs
          </button>
          
          <button
            onClick={() => setActiveTab('view')}
            className={`py-2 px-4 text-sm font-medium transition-colors ${
              activeTab === 'view'
                ? 'text-purple-400 border-b-2 border-purple-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            View Program
          </button>
        </div>
      )}
      
      {/* CREATE PROGRAM COMPLETION */}
      {activeTab === 'create' && processingState === 'completed' && (
        <div className="space-y-6">
          <div className="bg-green-900/30 border border-green-700/50 rounded-md p-4 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto mb-2 text-green-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <h3 className="text-lg font-semibold text-green-400">Program Created Successfully</h3>
            <p className="text-sm text-gray-300 mt-2">
              Your new educational program has been created and is now available on the blockchain.
            </p>
          </div>
          
          {/* Program Summary */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-md p-4">
            <h3 className="text-md font-semibold text-blue-400 mb-4">Program Details</h3>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 bg-gray-800 p-3 rounded-md">
                <p className="text-xs text-gray-400">Program Name</p>
                <p className="text-sm font-medium text-gray-200 mt-1">{programName}</p>
              </div>
              
              <div className="bg-gray-800 p-3 rounded-md">
                <p className="text-xs text-gray-400">Term Fee</p>
                <p className="text-sm font-medium text-gray-200 mt-1">{termFee} ETH</p>
              </div>
              
              <div className="bg-gray-800 p-3 rounded-md">
                <p className="text-xs text-gray-400">Required Attendance</p>
                <p className="text-sm font-medium text-gray-200 mt-1">{(Number(requiredAttendance) / 100).toFixed(2)}%</p>
              </div>
              
              <div className="bg-gray-800 p-3 rounded-md">
                <p className="text-xs text-gray-400">Maximum Enrollment</p>
                <p className="text-sm font-medium text-gray-200 mt-1">{maxEnrollment} students</p>
              </div>
              
              <div className="col-span-2 bg-gray-800 p-3 rounded-md">
                <p className="text-xs text-gray-400">Next Steps</p>
                <p className="text-sm text-gray-300 mt-1">
                  Your program is now created. You can now set up courses, enrollment periods, and share the program details with potential students.
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
          
          {/* Action Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <motion.button
              onClick={() => {
                setProcessingState('initial');
                resetCreateForm();
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium rounded-md shadow-lg transition-all duration-300"
            >
              Create Another Program
            </motion.button>
            
            <motion.button
              onClick={() => {
                setActiveTab('manage');
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-3 px-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-medium rounded-md shadow-lg transition-all duration-300"
            >
              Manage Programs
            </motion.button>
          </div>
        </div>
      )}
      
      {/* MANAGE PROGRAM TAB */}
      {activeTab === 'manage' && (
        <div className="space-y-6">
          {/* Program Selection & Role Check */}
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <h3 className="text-lg font-medium text-green-400 mb-4">
              Program Fee Management
            </h3>
            
            <div className="bg-gray-700/30 rounded-md p-3 mb-4">
              <p className="text-sm text-gray-300">
                Select a program and update its fee structure. Administrator privileges are required.
              </p>
            </div>
            
            {/* Program Selection */}
            <div className="mb-4">
              <h4 className="text-md font-medium text-gray-300 mb-3">Step 1: Select Program</h4>
              <CurrentProgramIdReader 
                onProgramIdRead={handleProgramIdRead}
              />
            </div>
            
            {/* Role Checker - only shown if not hidden */}
            {currentProgramId > 0 && !hideRoleChecker && (
              <div className="mb-4">
                <h4 className="text-md font-medium text-gray-300 mb-3">Step 2: Verify Admin Role</h4>
                <RoleChecker
                  contract={{
                    address: contractProgramManagementConfig.address as Address,
                    abi: contractProgramManagementConfig.abi
                  }}
                  initialRoleId={ADMIN_ROLE}
                  initialAddress={address ? (address as `0x${string}`) : undefined}
                  predefinedRoles={predefinedRoles}
                  onRoleCheckResult={handleRoleCheckResult}
                />
              </div>
            )}
          </div>
          
          {/* Program Fee Update Section */}
          {currentProgramId > 0 && (roleCheckComplete || hideRoleChecker) && (
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
              <h4 className="text-md font-medium text-green-400 mb-3">
                {hideRoleChecker ? 'Update Program Fee' : 'Step 3: Update Program Fee'}
                {!hasAdminRole && !hideRoleChecker && (
                  <span className="ml-2 text-red-400 text-sm">(Admin role required)</span>
                )}
              </h4>
              
              {!hasAdminRole && !hideRoleChecker ? (
                <div className="bg-red-500/20 text-red-400 border border-red-500/30 rounded-md p-3">
                  <p className="text-sm">
                    You do not have the Admin role required to update program fees.
                    Please contact your administrator for assistance.
                  </p>
                </div>
              ) : (
                <>
                  {isLoadingProgram ? (
                    <div className="flex items-center justify-center py-10">
                      <div className="w-8 h-8 border-4 border-t-green-400 border-green-200/30 rounded-full animate-spin mr-3"></div>
                      <span className="text-gray-300">Loading program details...</span>
                    </div>
                  ) : currentProgram ? (
                    <div className="space-y-4">
                      {/* Program Details */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-gray-700/50 rounded-md p-3">
                          <p className="text-xs text-gray-400 mb-1">Program Name</p>
                          <p className="text-sm font-medium text-white">{currentProgram.name}</p>
                        </div>
                        
                        <div className="bg-gray-700/50 rounded-md p-3">
                          <p className="text-xs text-gray-400 mb-1">Current Fee</p>
                          <p className="text-sm font-medium text-white">{formatEther(currentProgram.termFee)} ETH</p>
                        </div>
                        
                        <div className="bg-gray-700/50 rounded-md p-3">
                          <p className="text-xs text-gray-400 mb-1">Required Attendance</p>
                          <p className="text-sm font-medium text-white">{(currentProgram.requiredAttendance / 100).toFixed(2)}%</p>
                        </div>
                        
                        <div className="bg-gray-700/50 rounded-md p-3">
                          <p className="text-xs text-gray-400 mb-1">Maximum Enrollment</p>
                          <p className="text-sm font-medium text-white">{currentProgram.maxEnrollment} students</p>
                        </div>

                        <div className="bg-gray-700/50 rounded-md p-3">
                          <p className="text-xs text-gray-400 mb-1">Current Enrollment</p>
                          <p className="text-sm font-medium text-white">{currentProgram.currentEnrollment} students</p>
                        </div>

                        <div className="bg-gray-700/50 rounded-md p-3">
                          <p className="text-xs text-gray-400 mb-1">Minimum Attendance</p>
                          <p className="text-sm font-medium text-white">{(currentProgram.minAttendance / 100).toFixed(2)}%</p>
                        </div>
                      </div>
                      
                      {/* Fee Update Form */}
                      <div className="mt-6">
                        <h4 className="text-md font-medium text-gray-300 mb-3">Update Program Fee</h4>
                        
                        <div className="bg-gray-700/30 rounded-md p-4">
                          <label htmlFor="new-fee-input" className="block text-sm text-gray-400 mb-2">
                            New Fee (ETH):
                          </label>
                          <div className="flex space-x-2">
                            <div className="relative flex-1">
                              <input
                                id="new-fee-input"
                                type="text"
                                value={newTermFee}
                                onChange={(e) => {
                                  setNewTermFee(e.target.value);
                                  setValidationError('');
                                }}
                                disabled={isLoading}
                                placeholder="0.01"
                                className={`w-full bg-gray-700/50 border ${
                                  validationError
                                    ? 'border-red-500/50 focus:border-red-500'
                                    : 'border-gray-600 focus:border-green-500'
                                } rounded px-3 py-2 text-sm text-gray-200 focus:outline-none`}
                              />
                            </div>
                            
                            <button
                              onClick={handleUpdateFee}
                              disabled={isLoading || !newTermFee}
                              className={`px-4 py-2 rounded-md text-sm font-medium ${
                                isLoading || !newTermFee
                                  ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                                  : 'bg-green-600 hover:bg-green-700 text-white'
                              }`}
                            >
                              {isLoading ? (
                                <div className="flex items-center">
                                  <div className="w-4 h-4 border-2 border-t-white border-white/30 rounded-full animate-spin mr-2"></div>
                                  {isConfirming ? 'Confirming...' : 'Processing...'}
                                </div>
                              ) : (
                                'Update Fee'
                              )}
                            </button>
                          </div>
                          
                          {/* Validation errors */}
                          {validationError && (
                            <div className="bg-red-500/20 text-red-400 border border-red-500/30 rounded-md p-2 text-sm mt-2">
                              {validationError}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded-md p-3">
                      <p className="text-sm">
                        Could not load program details. Please make sure the program ID is valid.
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}
      
      {/* VIEW PROGRAM TAB */}
      {activeTab === 'view' && (
        <div className="space-y-6">
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <h3 className="text-lg font-medium text-purple-400 mb-4">
              Program Details Viewer
            </h3>
            
            <div className="bg-gray-700/30 rounded-md p-3 mb-4">
              <p className="text-sm text-gray-300">
                View detailed information about a specific educational program.
              </p>
            </div>
            
            {/* Program Selection */}
            <div className="mb-4">
              <h4 className="text-md font-medium text-gray-300 mb-3">Select Program to View</h4>
              <CurrentProgramIdReader 
                onProgramIdRead={handleProgramIdRead}
              />
            </div>
          </div>
          
          {/* Program Details Display */}
          {currentProgramId > 0 && (
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
              <h4 className="text-md font-medium text-purple-400 mb-4">Program Information</h4>
              
              {isLoadingProgram ? (
                <div className="flex items-center justify-center py-10">
                  <div className="w-8 h-8 border-4 border-t-purple-400 border-purple-200/30 rounded-full animate-spin mr-3"></div>
                  <span className="text-gray-300">Loading program details...</span>
                </div>
              ) : currentProgram ? (
                <div className="space-y-6">
                  {/* Program Header */}
                  <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
                      <div>
                        <h2 className="text-xl font-bold text-white">
                          {currentProgram.name}
                        </h2>
                        <div className="flex items-center mt-1">
                          <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                            currentProgram.isActive ? 'bg-green-500' : 'bg-red-500'
                          }`}></span>
                          <span className={`text-sm ${
                            currentProgram.isActive ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {currentProgram.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                      <div className="bg-purple-500/20 rounded-lg px-3 py-2 border border-purple-500/30 mt-3 md:mt-0">
                        <p className="text-sm font-medium text-purple-400">
                          ID: {currentProgramId}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Program Details Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                      <h5 className="text-sm font-medium text-blue-400 mb-2">Term Fee</h5>
                      <p className="text-2xl font-bold text-white">{formatEther(currentProgram.termFee)} ETH</p>
                      <p className="text-xs text-gray-400 mt-2">Cost for one term enrollment</p>
                    </div>
                    
                    <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                      <h5 className="text-sm font-medium text-green-400 mb-2">Required Attendance</h5>
                      <p className="text-2xl font-bold text-white">{(currentProgram.requiredAttendance / 100).toFixed(2)}%</p>
                      <p className="text-xs text-gray-400 mt-2">Minimum attendance to pass the program</p>
                    </div>
                    
                    <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
                      <h5 className="text-sm font-medium text-orange-400 mb-2">Enrollment Capacity</h5>
                      <p className="text-2xl font-bold text-white">{currentProgram.maxEnrollment}</p>
                      <p className="text-xs text-gray-400 mt-2">Maximum number of students allowed</p>
                    </div>

                    <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                      <h5 className="text-sm font-medium text-purple-400 mb-2">Current Enrollment</h5>
                      <p className="text-2xl font-bold text-white">{currentProgram.currentEnrollment}</p>
                      <p className="text-xs text-gray-400 mt-2">Currently enrolled students</p>
                    </div>
                    
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                      <h5 className="text-sm font-medium text-yellow-400 mb-2">Minimum Attendance</h5>
                      <p className="text-2xl font-bold text-white">{(currentProgram.minAttendance / 100).toFixed(2)}%</p>
                      <p className="text-xs text-gray-400 mt-2">Minimum attendance threshold</p>
                    </div>

                    <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-lg p-4">
                      <h5 className="text-sm font-medium text-indigo-400 mb-2">Available Slots</h5>
                      <p className="text-2xl font-bold text-white">
                        {Math.max(0, currentProgram.maxEnrollment - currentProgram.currentEnrollment)}
                      </p>
                      <p className="text-xs text-gray-400 mt-2">Remaining enrollment capacity</p>
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 justify-end">
                    <button
                      onClick={() => refetchProgram()}
                      className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-md text-sm text-gray-300 transition-colors"
                    >
                      <div className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                        </svg>
                        Refresh Data
                      </div>
                    </button>
                    
                    <button
                      onClick={() => setActiveTab('manage')}
                      className="px-3 py-1.5 bg-green-600 hover:bg-green-700 rounded-md text-sm text-white transition-colors"
                    >
                      <div className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                        </svg>
                        Manage Program
                      </div>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded-md p-3">
                  <p className="text-sm">
                    Could not load program details. Please make sure the program ID is valid.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
};

/**
 * Custom hook for unified program management
 */
export const useProgramManagement = (
  defaultMode?: ComponentMode,
  initialProgramId?: number
) => {
  const [unifiedData, setUnifiedData] = useState<UnifiedProgramData | null>(null);
  
  // Callback when data changes
  const handleDataChange = (data: UnifiedProgramData) => {
    setUnifiedData(data);
  };
  
  // Return the component and the current data
  return {
    ProgramManagementComponent: (props: Partial<UnifiedProgramManagementProps> = {}) => (
      <UnifiedProgramManagement
        defaultMode={defaultMode}
        initialProgramId={initialProgramId}
        onDataChange={handleDataChange}
        {...props}
      />
    ),
    data: unifiedData,
    // Program creation method
    createProgram: (values: ProgramFormValues) => {
      if (typeof window !== 'undefined' && (window as any).__programManagement) {
        (window as any).__programManagement.createProgram(values);
      }
    },
    // Program fee update method
    updateProgramFee: (programId: number, newFee: string) => {
      if (typeof window !== 'undefined' && (window as any).__programManagement) {
        (window as any).__programManagement.updateProgramFee(programId, newFee);
      }
    },
    // Get current program
    getCurrentProgram: () => {
      if (typeof window !== 'undefined' && (window as any).__programManagement) {
        return (window as any).__programManagement.getCurrentProgram();
      }
      return null;
    },
    // Check admin role
    hasAdminRole: () => {
      if (typeof window !== 'undefined' && (window as any).__programManagement) {
        return (window as any).__programManagement.hasAdminRole();
      }
      return false;
    },
    // Form reset methods
    resetCreateForm: () => {
      if (typeof window !== 'undefined' && (window as any).__programManagement) {
        (window as any).__programManagement.resetCreateForm();
      }
    },
    resetUpdateForm: () => {
      if (typeof window !== 'undefined' && (window as any).__programManagement) {
        (window as any).__programManagement.resetUpdateForm();
      }
    },
    // Specific view components
    ProgramCreator: (props: Partial<UnifiedProgramManagementProps> = {}) => (
      <UnifiedProgramManagement
        defaultMode="create"
        initialProgramId={initialProgramId}
        onDataChange={handleDataChange}
        showAllTabs={false}
        {...props}
      />
    ),
    ProgramManager: (props: Partial<UnifiedProgramManagementProps> = {}) => (
      <UnifiedProgramManagement
        defaultMode="update"
        initialProgramId={initialProgramId}
        onDataChange={handleDataChange}
        showAllTabs={false}
        {...props}
      />
    ),
    ProgramViewer: (props: Partial<UnifiedProgramManagementProps> = {}) => (
      <UnifiedProgramManagement
        defaultMode="view"
        initialProgramId={initialProgramId}
        onDataChange={handleDataChange}
        showAllTabs={false}
        {...props}
      />
    ),
  };
};

export default UnifiedProgramManagement;
 