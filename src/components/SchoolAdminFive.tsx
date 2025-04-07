import { useState, useEffect, useCallback } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { motion } from 'framer-motion';

// Import contract configuration
import { contractStudentManagementConfig } from '../contracts';

// Define component modes
type RegistrationMode = 'single' | 'batch';

// Student data interface for single registration
export interface StudentData {
  address: string;
  name: string;
  programId: string;
}

// Student entry interface for batch registration
export interface StudentEntry {
  id: string; // Unique ID for the form
  address: string;
  name: string;
  programId: string;
}

// Registration result interface
export interface RegistrationResult {
  status: 'idle' | 'pending' | 'confirming' | 'success' | 'error';
  mode: RegistrationMode;
  singleStudent: StudentData | null;
  batchStudents: StudentEntry[] | null;
  hash?: string;
  error?: Error;
  timestamp: Date | null;
}

// Component props interface
interface UnifiedStudentRegistrationProps {
  defaultMode?: RegistrationMode;
  contract?: any; // Optional contract config
  availablePrograms?: { id: number; name: string }[]; // Optional list of available programs
  onRegistrationSuccess?: (mode: RegistrationMode, data: any, txHash: string) => void; // Optional callback for success
  onRegistrationError?: (error: Error) => void; // Optional callback for errors
  onDataChange?: (result: RegistrationResult) => void; // Callback for data changes
  initialSingleStudent?: StudentData; // Optional initial data for single student
  initialBatchStudents?: StudentEntry[]; // Optional initial data for batch
  maxBatchSize?: number; // Optional maximum batch size
  hideModeSwitcher?: boolean; // Optional setting to hide mode switcher
}

/**
 * UnifiedStudentRegistration Component
 * 
 * This component combines single student registration and batch registration
 * functionality into a single interface with shared state management.
 */
const UnifiedStudentRegistration = ({
  defaultMode = 'single',
  contract = contractStudentManagementConfig,
  availablePrograms = [],
  onRegistrationSuccess,
  onRegistrationError,
  onDataChange,
  initialSingleStudent,
  initialBatchStudents,
  maxBatchSize = 100,
  hideModeSwitcher = false
}: UnifiedStudentRegistrationProps) => {
  // Active registration mode
  const [registrationMode, setRegistrationMode] = useState<RegistrationMode>(defaultMode);
  
  // Single student registration state
  const [studentAddress, setStudentAddress] = useState<string>(initialSingleStudent?.address || '');
  const [studentName, setStudentName] = useState<string>(initialSingleStudent?.name || '');
  const [singleProgramId, setSingleProgramId] = useState<string>(initialSingleStudent?.programId || '');
  
  // Batch registration state
  const [batchStudents, setBatchStudents] = useState<StudentEntry[]>(
    initialBatchStudents || [{ id: Date.now().toString(), address: '', name: '', programId: '' }]
  );
  
  // Validation state
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});
  
  // Transaction state
  const { 
    data: hash,
    error: writeError,
    isPending: isWritePending,
    writeContract,
    reset: resetWrite
  } = useWriteContract();
  
  // Transaction receipt state
  const { 
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    error: confirmError
  } = useWaitForTransactionReceipt({ 
    hash
  });
  
  // Combined error and processing states
  const error = writeError || confirmError;
  const isProcessing = isWritePending || isConfirming;
  
  // Create student data objects
  const singleStudentData: StudentData = {
    address: studentAddress,
    name: studentName,
    programId: singleProgramId
  };
  
  // Create registration result object
  const createRegistrationResult = useCallback((): RegistrationResult => {
    return {
      status: isWritePending ? 'pending' : 
              isConfirming ? 'confirming' : 
              isConfirmed ? 'success' : 
              error ? 'error' : 'idle',
      mode: registrationMode,
      singleStudent: registrationMode === 'single' ? singleStudentData : null,
      batchStudents: registrationMode === 'batch' ? batchStudents : null,
      hash,
      error: error as Error | undefined,
      timestamp: isConfirmed || error ? new Date() : null
    };
  }, [
    registrationMode, singleStudentData, batchStudents, 
    hash, error, isWritePending, isConfirming, isConfirmed
  ]);
  
  // Update parent component with registration data
  useEffect(() => {
    if (onDataChange) {
      const result = createRegistrationResult();
      onDataChange(result);
    }
  }, [createRegistrationResult, onDataChange]);
  
  // Reset validations errors when changing modes
  useEffect(() => {
    setValidationErrors({});
  }, [registrationMode]);
  
  // Call success callback when transaction confirmed
  useEffect(() => {
    if (isConfirmed && hash) {
      if (onRegistrationSuccess) {
        if (registrationMode === 'single') {
          onRegistrationSuccess('single', singleStudentData, hash);
        } else {
          onRegistrationSuccess('batch', batchStudents, hash);
        }
      }
      
      // Reset form if no callbacks provided
      if (!onRegistrationSuccess && !onDataChange) {
        if (registrationMode === 'single') {
          setStudentAddress('');
          setStudentName('');
          setSingleProgramId('');
        } else {
          setBatchStudents([{ id: Date.now().toString(), address: '', name: '', programId: '' }]);
        }
      }
    }
  }, [
    isConfirmed, hash, onRegistrationSuccess, onDataChange, 
    registrationMode, singleStudentData, batchStudents
  ]);
  
  // Call error callback
  useEffect(() => {
    if (error && onRegistrationError) {
      onRegistrationError(error as Error);
    }
  }, [error, onRegistrationError]);
  
  // Single student validation
  const validateSingleStudent = (): boolean => {
    const errors: {[key: string]: string} = {};
    let isValid = true;
    
    // Validate address
    if (!studentAddress) {
      errors.address = 'Address is required';
      isValid = false;
    } else if (!/^0x[a-fA-F0-9]{40}$/.test(studentAddress)) {
      errors.address = 'Invalid Ethereum address format';
      isValid = false;
    }
    
    // Validate name
    if (!studentName) {
      errors.name = 'Name is required';
      isValid = false;
    }
    
    // Validate program ID
    if (!singleProgramId) {
      errors.programId = 'Program ID is required';
      isValid = false;
    } else if (isNaN(Number(singleProgramId)) || Number(singleProgramId) < 0) {
      errors.programId = 'Program ID must be a valid number';
      isValid = false;
    }
    
    setValidationErrors(errors);
    return isValid;
  };
  
  // Batch students validation
  const validateBatchStudents = (): boolean => {
    const errors: {[key: string]: string} = {};
    let isValid = true;
    
    batchStudents.forEach(student => {
      // Validate address
      if (!student.address) {
        errors[`${student.id}-address`] = 'Address is required';
        isValid = false;
      } else if (!/^0x[a-fA-F0-9]{40}$/.test(student.address)) {
        errors[`${student.id}-address`] = 'Invalid Ethereum address format';
        isValid = false;
      }
      
      // Validate name
      if (!student.name) {
        errors[`${student.id}-name`] = 'Name is required';
        isValid = false;
      }
      
      // Validate program ID
      if (!student.programId) {
        errors[`${student.id}-programId`] = 'Program ID is required';
        isValid = false;
      } else if (isNaN(Number(student.programId)) || Number(student.programId) < 0) {
        errors[`${student.id}-programId`] = 'Program ID must be a valid number';
        isValid = false;
      }
    });
    
    // Check for duplicate addresses
    const addresses = batchStudents.map(s => s.address.toLowerCase());
    const duplicateAddresses = addresses.filter((addr, index) => 
      addr && addresses.indexOf(addr) !== index
    );
    
    if (duplicateAddresses.length > 0) {
      duplicateAddresses.forEach(addr => {
        const studentsWithAddr = batchStudents.filter(s => s.address.toLowerCase() === addr);
        studentsWithAddr.forEach(s => {
          errors[`${s.id}-address`] = 'Duplicate address found';
        });
      });
      isValid = false;
    }
    
    setValidationErrors(errors);
    return isValid;
  };
  
  // Handle registration submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (registrationMode === 'single') {
        // Validate single student form
        if (!validateSingleStudent()) {
          return;
        }
        
        // Execute contract call for single student
        writeContract({
          ...contract,
          functionName: 'registerStudent',
          args: [studentAddress as `0x${string}`, studentName, BigInt(singleProgramId)]
        });
      } else {
        // Validate batch students form
        if (!validateBatchStudents()) {
          return;
        }
        
        // Prepare data for contract call
        const addresses = batchStudents.map(s => s.address as `0x${string}`);
        const names = batchStudents.map(s => s.name);
        const programIds = batchStudents.map(s => BigInt(s.programId));
        
        // Execute contract call for batch students
        writeContract({
          ...contract,
          functionName: 'batchRegisterStudents',
          args: [addresses, names, programIds]
        });
      }
    } catch (err) {
      if (onRegistrationError && err instanceof Error) {
        onRegistrationError(err);
      }
    }
  };
  
  // Handle input change for single student
  const handleSingleInputChange = (field: keyof StudentData, value: string) => {
    switch (field) {
      case 'address':
        setStudentAddress(value);
        break;
      case 'name':
        setStudentName(value);
        break;
      case 'programId':
        setSingleProgramId(value);
        break;
    }
    
    // Clear validation error for this field if it exists
    if (validationErrors[field]) {
      setValidationErrors({
        ...validationErrors,
        [field]: ''
      });
    }
  };
  
  // Add a new student entry to batch
  const addStudentEntry = () => {
    if (batchStudents.length < maxBatchSize) {
      setBatchStudents([
        ...batchStudents,
        { id: Date.now().toString(), address: '', name: '', programId: '' }
      ]);
    }
  };
  
  // Remove a student entry from batch
  const removeStudentEntry = (id: string) => {
    if (batchStudents.length > 1) {
      setBatchStudents(batchStudents.filter(student => student.id !== id));
    }
  };
  
  // Update a student entry in batch
  const updateStudentEntry = (id: string, field: keyof StudentEntry, value: string) => {
    setBatchStudents(batchStudents.map(student => 
      student.id === id ? { ...student, [field]: value } : student
    ));
    
    // Clear validation error for this field if it exists
    if (validationErrors[`${id}-${field}`]) {
      setValidationErrors({
        ...validationErrors,
        [`${id}-${field}`]: ''
      });
    }
  };
  
  // Reset form and state
  const resetForm = () => {
    // Reset transaction state
    resetWrite?.();
    
    // Reset form state based on mode
    if (registrationMode === 'single') {
      setStudentAddress('');
      setStudentName('');
      setSingleProgramId('');
    } else {
      setBatchStudents([{ id: Date.now().toString(), address: '', name: '', programId: '' }]);
    }
    
    // Reset validation errors
    setValidationErrors({});
  };
  
  // Get registration status and styling
  const getRegistrationStatus = () => {
    if (isWritePending) {
      return { text: 'Registering...', color: 'text-yellow-400', bg: 'bg-yellow-500/20' };
    }
    
    if (isConfirming) {
      return { text: 'Confirming Registration', color: 'text-blue-400', bg: 'bg-blue-500/20' };
    }
    
    if (isConfirmed) {
      return { text: 'Registration Successful', color: 'text-green-400', bg: 'bg-green-500/20' };
    }
    
    if (error) {
      return { text: 'Registration Failed', color: 'text-red-400', bg: 'bg-red-500/20' };
    }
    
    return { text: 'Ready to Register', color: 'text-gray-400', bg: 'bg-gray-500/20' };
  };
  
  const status = getRegistrationStatus();
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-gray-800/50 border border-gray-700 rounded-lg p-4"
    >
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
        <div>
          <h3 className="text-lg font-medium text-blue-400">
            {registrationMode === 'single' ? 'Student Registration' : 'Batch Student Registration'}
          </h3>
          <p className="text-xs text-gray-400 mt-1">
            {registrationMode === 'single' 
              ? 'Register a single student to an educational program' 
              : `Register multiple students at once (max: ${maxBatchSize})`}
          </p>
        </div>
        
        {/* Registration Mode Switcher */}
        {!hideModeSwitcher && !isProcessing && !isConfirmed && (
          <div className="mt-2 md:mt-0 p-1 bg-gray-700/50 rounded-lg">
            <div className="flex text-sm">
              <button
                type="button"
                onClick={() => setRegistrationMode('single')}
                className={`px-3 py-1 rounded-md transition-colors ${
                  registrationMode === 'single'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                Single Student
              </button>
              <button
                type="button"
                onClick={() => setRegistrationMode('batch')}
                className={`px-3 py-1 rounded-md transition-colors ${
                  registrationMode === 'batch'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                Batch Registration
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Status Badge */}
      <div className={`inline-flex items-center px-3 py-1 rounded-full ${status.bg} border border-${status.color.replace('text-', '')}/30 mb-4`}>
        <div className={`w-2 h-2 rounded-full ${status.color.replace('text-', 'bg-')} mr-2`}></div>
        <span className={`text-sm font-medium ${status.color}`}>
          {status.text}
        </span>
      </div>
      
      {/* Registration Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Single Student Form */}
        {registrationMode === 'single' && (
          <div className="bg-gray-700/30 rounded-lg p-4 space-y-4">
            {/* Student Address Input */}
            <div className="space-y-2">
              <label htmlFor="student-address" className="block text-sm font-medium text-gray-300">
                Student Wallet Address
              </label>
              <input
                id="student-address"
                type="text"
                value={studentAddress}
                onChange={(e) => handleSingleInputChange('address', e.target.value)}
                placeholder="0x..."
                className={`w-full px-3 py-2 bg-gray-700 border ${
                  validationErrors.address ? 'border-red-500' : 'border-gray-600'
                } rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                disabled={isProcessing}
              />
              {validationErrors.address && (
                <p className="text-xs text-red-400">{validationErrors.address}</p>
              )}
              <p className="text-xs text-gray-400">Enter the student's Ethereum wallet address</p>
            </div>
            
            {/* Student Name Input */}
            <div className="space-y-2">
              <label htmlFor="student-name" className="block text-sm font-medium text-gray-300">
                Student Name
              </label>
              <input
                id="student-name"
                type="text"
                value={studentName}
                onChange={(e) => handleSingleInputChange('name', e.target.value)}
                placeholder="Full Name"
                className={`w-full px-3 py-2 bg-gray-700 border ${
                  validationErrors.name ? 'border-red-500' : 'border-gray-600'
                } rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                disabled={isProcessing}
              />
              {validationErrors.name && (
                <p className="text-xs text-red-400">{validationErrors.name}</p>
              )}
              <p className="text-xs text-gray-400">Enter the student's full name</p>
            </div>
            
            {/* Program ID Input */}
            <div className="space-y-2">
              <label htmlFor="program-id" className="block text-sm font-medium text-gray-300">
                Program ID
              </label>
              {availablePrograms.length > 0 ? (
                <select
                  id="program-id"
                  value={singleProgramId}
                  onChange={(e) => handleSingleInputChange('programId', e.target.value)}
                  className={`w-full px-3 py-2 bg-gray-700 border ${
                    validationErrors.programId ? 'border-red-500' : 'border-gray-600'
                  } rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                  disabled={isProcessing}
                >
                  <option value="">Select a program</option>
                  {availablePrograms.map(program => (
                    <option key={program.id} value={program.id}>
                      {program.name} (ID: {program.id})
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id="program-id"
                  type="number"
                  value={singleProgramId}
                  onChange={(e) => handleSingleInputChange('programId', e.target.value)}
                  placeholder="Program ID"
                  className={`w-full px-3 py-2 bg-gray-700 border ${
                    validationErrors.programId ? 'border-red-500' : 'border-gray-600'
                  } rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                  min="0"
                  disabled={isProcessing}
                />
              )}
              {validationErrors.programId && (
                <p className="text-xs text-red-400">{validationErrors.programId}</p>
              )}
              <p className="text-xs text-gray-400">Enter the ID of the program the student is enrolling in</p>
            </div>
          </div>
        )}
        
        {/* Batch Registration Form */}
        {registrationMode === 'batch' && (
          <div className="bg-gray-700/30 rounded-lg p-4">
            <div className="mb-4 flex justify-between items-center">
              <h4 className="text-sm font-medium text-gray-300">
                Student Information
              </h4>
              <span className="text-xs text-gray-400">
                {batchStudents.length} {batchStudents.length === 1 ? 'student' : 'students'}
              </span>
            </div>
            
            {/* Student List */}
            <div className="space-y-4">
              {batchStudents.map((student, index) => (
                <div 
                  key={student.id} 
                  className="bg-gray-700/40 rounded-md p-3 border border-gray-600"
                >
                  <div className="flex justify-between items-center mb-2">
                    <h5 className="text-sm font-medium text-gray-300">
                      Student #{index + 1}
                    </h5>
                    <button
                      type="button"
                      onClick={() => removeStudentEntry(student.id)}
                      className="text-xs text-gray-400 hover:text-red-400"
                      disabled={batchStudents.length === 1 || isProcessing}
                    >
                      {batchStudents.length > 1 ? 'Remove' : ''}
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Address Input */}
                    <div className="space-y-1">
                      <label htmlFor={`address-${student.id}`} className="block text-xs font-medium text-gray-300">
                        Wallet Address
                      </label>
                      <input
                        id={`address-${student.id}`}
                        type="text"
                        value={student.address}
                        onChange={(e) => updateStudentEntry(student.id, 'address', e.target.value)}
                        placeholder="0x..."
                        className={`w-full px-3 py-2 bg-gray-700 border ${
                          validationErrors[`${student.id}-address`] 
                            ? 'border-red-500' 
                            : 'border-gray-600'
                        } rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm`}
                        disabled={isProcessing}
                      />
                      {validationErrors[`${student.id}-address`] && (
                        <p className="text-xs text-red-400">
                          {validationErrors[`${student.id}-address`]}
                        </p>
                      )}
                    </div>
                    
                    {/* Name Input */}
                    <div className="space-y-1">
                      <label htmlFor={`name-${student.id}`} className="block text-xs font-medium text-gray-300">
                        Student Name
                      </label>
                      <input
                        id={`name-${student.id}`}
                        type="text"
                        value={student.name}
                        onChange={(e) => updateStudentEntry(student.id, 'name', e.target.value)}
                        placeholder="Full Name"
                        className={`w-full px-3 py-2 bg-gray-700 border ${
                          validationErrors[`${student.id}-name`] 
                            ? 'border-red-500' 
                            : 'border-gray-600'
                        } rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm`}
                        disabled={isProcessing}
                      />
                      {validationErrors[`${student.id}-name`] && (
                        <p className="text-xs text-red-400">
                          {validationErrors[`${student.id}-name`]}
                        </p>
                      )}
                    </div>
                    
                    {/* Program ID Input */}
                    <div className="space-y-1 md:col-span-2">
                      <label htmlFor={`program-${student.id}`} className="block text-xs font-medium text-gray-300">
                        Program ID
                      </label>
                      {availablePrograms.length > 0 ? (
                        <select
                          id={`program-${student.id}`}
                          value={student.programId}
                          onChange={(e) => updateStudentEntry(student.id, 'programId', e.target.value)}
                          className={`w-full px-3 py-2 bg-gray-700 border ${
                            validationErrors[`${student.id}-programId`] 
                              ? 'border-red-500' 
                              : 'border-gray-600'
                          } rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm`}
                          disabled={isProcessing}
                        >
                          <option value="">Select a program</option>
                          {availablePrograms.map(program => (
                            <option key={program.id} value={program.id}>
                              {program.name} (ID: {program.id})
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          id={`program-${student.id}`}
                          type="number"
                          value={student.programId}
                          onChange={(e) => updateStudentEntry(student.id, 'programId', e.target.value)}
                          placeholder="Program ID"
                          className={`w-full px-3 py-2 bg-gray-700 border ${
                            validationErrors[`${student.id}-programId`] 
                              ? 'border-red-500' 
                              : 'border-gray-600'
                          } rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm`}
                          min="0"
                          disabled={isProcessing}
                        />
                      )}
                      {validationErrors[`${student.id}-programId`] && (
                        <p className="text-xs text-red-400">
                          {validationErrors[`${student.id}-programId`]}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Add Student Button */}
            <button
              type="button"
              onClick={addStudentEntry}
              className="mt-4 w-full py-2 border border-dashed border-gray-600 rounded-md text-gray-400 hover:text-gray-300 hover:border-gray-500 transition-colors flex items-center justify-center"
              disabled={isProcessing || batchStudents.length >= maxBatchSize}
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Another Student {batchStudents.length >= maxBatchSize ? `(Max: ${maxBatchSize})` : ''}
            </button>
          </div>
        )}
        
        {/* Error Display */}
        {error && (
          <div className="bg-red-500/20 text-red-400 border border-red-500/30 rounded-md p-3">
            <p className="text-sm">
              Error registering {registrationMode === 'single' ? 'student' : 'students'}: 
              {(error as Error).message || 'Unknown error'}
            </p>
          </div>
        )}
        
        {/* Success Display */}
        {isConfirmed && hash && (
          <div className="bg-green-500/20 text-green-400 border border-green-500/30 rounded-md p-3">
            {registrationMode === 'single' ? (
              <>
                <p className="text-sm">Student registration successful!</p>
                <div className="flex flex-col space-y-1 mt-2">
                  <div className="flex items-center">
                    <span className="text-xs text-gray-400 w-20">Name:</span>
                    <span className="text-xs text-white">{studentName}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-xs text-gray-400 w-20">Address:</span>
                    <span className="text-xs text-white font-mono truncate">{studentAddress}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-xs text-gray-400 w-20">Program ID:</span>
                    <span className="text-xs text-white">{singleProgramId}</span>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm">Successfully registered {batchStudents.length} students!</p>
            )}
                          <div className="mt-2 flex items-center">
                <span className="text-xs text-gray-400 w-20">TX Hash:</span>
                <a 
                  href={`https://etherscan.io/tx/${hash}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-blue-400 font-mono truncate hover:underline"
                >
                  {hash}
                </a>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(hash);
                  }}
                  className="ml-2 p-1 bg-gray-700 hover:bg-gray-600 rounded text-gray-300"
                  title="Copy to clipboard"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                    <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                  </svg>
                </button>
              </div>
              
              {/* Reset / New Registration Button */}
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-sm bg-blue-600 hover:bg-blue-700 text-white py-1 px-3 rounded-md transition-colors"
                >
                  Register Another {registrationMode === 'single' ? 'Student' : 'Batch'}
                </button>
              </div>
            </div>
          )}
        
        {/* Action Buttons */}
        <div className="flex justify-between">
          <button
            type="button"
            onClick={resetForm}
            className={`px-4 py-2 rounded-md text-white font-medium transition-colors ${
              isProcessing
                ? 'bg-gray-600 cursor-not-allowed opacity-50'
                : 'bg-gray-600 hover:bg-gray-700'
            }`}
            disabled={isProcessing || isConfirmed}
          >
            Reset Form
          </button>
          
          <button
            type="submit"
            className={`px-4 py-2 rounded-md text-white font-medium transition-colors ${
              isProcessing || isConfirmed
                ? 'bg-gray-600 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
            disabled={isProcessing || isConfirmed}
          >
            {isProcessing ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {isWritePending ? 'Registering...' : 'Confirming...'}
              </span>
            ) : isConfirmed ? (
              'Registration Complete'
            ) : (
              `Register ${registrationMode === 'single' ? 'Student' : 'Students'}`
            )}
          </button>
        </div>
      </form>
      
      {/* Additional Information */}
      <div className="mt-4 pt-4 border-t border-gray-700">
        <h4 className="text-sm font-medium text-gray-300 mb-2">Registration Information</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 gap-x-4 text-xs">
          <div>
            <span className="text-gray-400">Function: </span>
            <span className="text-gray-200 font-mono">
              {registrationMode === 'single' ? 'registerStudent' : 'batchRegisterStudents'}
            </span>
          </div>
          <div>
            <span className="text-gray-400">Transaction Type: </span>
            <span className="text-gray-200">Non-payable</span>
          </div>
          <div>
            <span className="text-gray-400">Gas Estimate: </span>
            <span className="text-gray-200">
              {registrationMode === 'single' 
                ? '~80,000 gas' 
                : `~100,000 + 50,000 per student (${batchStudents.length} students)`}
            </span>
          </div>
          <div>
            <span className="text-gray-400">Confirmation Time: </span>
            <span className="text-gray-200">~15-30 seconds</span>
          </div>
        </div>
        
        <div className="mt-3 text-xs text-gray-400">
          <p className="mb-1">Note: {registrationMode === 'single' 
            ? 'The wallet address must be a valid Ethereum address starting with 0x.' 
            : 'All students in the batch must have valid wallet addresses, names, and program IDs.'}</p>
          <p>{registrationMode === 'single'
            ? 'After registration, the student will need to make their first attendance to activate their account.'
            : 'Make sure each address is unique and has the correct format (0x followed by 40 hexadecimal characters).'}</p>
        </div>
      </div>
    </motion.div>
  );
};

/**
 * Custom hook for single student registration
 */
export const useSingleStudentRegistration = (initialStudent?: StudentData) => {
  const [studentData, setStudentData] = useState<StudentData | null>(initialStudent || null);
  const [registrationResult, setRegistrationResult] = useState<RegistrationResult>({
    status: 'idle',
    mode: 'single',
    singleStudent: initialStudent || null,
    batchStudents: null,
    timestamp: null
  });

  // Callback for when registration data changes
  const handleDataChange = (result: RegistrationResult) => {
    if (result.mode === 'single') {
      setStudentData(result.singleStudent);
      setRegistrationResult(result);
    }
  };

  return {
    SingleStudentRegistrationComponent: (props: Partial<UnifiedStudentRegistrationProps> = {}) => (
      <UnifiedStudentRegistration
        defaultMode="single"
        initialSingleStudent={initialStudent}
        onDataChange={handleDataChange}
        hideModeSwitcher={true}
        {...props}
      />
    ),
    studentData,
    registrationResult,
    isRegistering: registrationResult.status === 'pending' || registrationResult.status === 'confirming',
    isSuccess: registrationResult.status === 'success',
    isError: registrationResult.status === 'error',
    error: registrationResult.error,
    transactionHash: registrationResult.hash
  };
};

/**
 * Custom hook for batch student registration
 */
export const useBatchStudentRegistration = (initialStudents?: StudentEntry[]) => {
  const [studentsData, setStudentsData] = useState<StudentEntry[] | null>(initialStudents || null);
  const [registrationResult, setRegistrationResult] = useState<RegistrationResult>({
    status: 'idle',
    mode: 'batch',
    singleStudent: null,
    batchStudents: initialStudents || null,
    timestamp: null
  });

  // Callback for when registration data changes
  const handleDataChange = (result: RegistrationResult) => {
    if (result.mode === 'batch') {
      setStudentsData(result.batchStudents);
      setRegistrationResult(result);
    }
  };

  return {
    BatchStudentRegistrationComponent: (props: Partial<UnifiedStudentRegistrationProps> = {}) => (
      <UnifiedStudentRegistration
        defaultMode="batch"
        initialBatchStudents={initialStudents}
        onDataChange={handleDataChange}
        hideModeSwitcher={true}
        {...props}
      />
    ),
    studentsData,
    registrationResult,
    studentCount: studentsData?.length || 0,
    isRegistering: registrationResult.status === 'pending' || registrationResult.status === 'confirming',
    isSuccess: registrationResult.status === 'success',
    isError: registrationResult.status === 'error',
    error: registrationResult.error,
    transactionHash: registrationResult.hash
  };
};

/**
 * Main hook for unified student registration
 */
export const useStudentRegistration = (defaultMode: RegistrationMode = 'single') => {
  const [registrationData, setRegistrationData] = useState<RegistrationResult>({
    status: 'idle',
    mode: defaultMode,
    singleStudent: null,
    batchStudents: null,
    timestamp: null
  });

  // Callback for when registration data changes
  const handleDataChange = (result: RegistrationResult) => {
    setRegistrationData(result);
  };

  return {
    // Complete component with mode switching
    StudentRegistrationComponent: (props: Partial<UnifiedStudentRegistrationProps> = {}) => (
      <UnifiedStudentRegistration
        defaultMode={defaultMode}
        onDataChange={handleDataChange}
        {...props}
      />
    ),
    // Individual mode components
    SingleRegistration: useSingleStudentRegistration(),
    BatchRegistration: useBatchStudentRegistration(),
    // Current data
    data: registrationData,
    // Helper methods
    getCurrentMode: () => registrationData.mode,
    getStatus: () => registrationData.status,
    getRegisteredData: () => 
      registrationData.mode === 'single' 
        ? registrationData.singleStudent 
        : registrationData.batchStudents,
    isProcessing: registrationData.status === 'pending' || registrationData.status === 'confirming',
    isSuccess: registrationData.status === 'success',
    isError: registrationData.status === 'error'
  };
};

export default UnifiedStudentRegistration;