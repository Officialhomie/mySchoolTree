import { useState, useEffect } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { motion } from 'framer-motion';
import { contractStudentManagementConfig } from '../../contracts';

/**
 * BatchStudentRegistration Component
 * 
 * This component provides a form to register multiple students at once.
 * It uses the batchRegisterStudents contract function.
 * 
 * Enhanced with exportable data for use in other components.
 */
export interface StudentEntry {
  id: string; // Unique ID for the form
  address: string;
  name: string;
  programId: string;
}

export interface RegistrationResult {
  status: 'idle' | 'pending' | 'confirming' | 'success' | 'error';
  students: StudentEntry[];
  hash?: string;
  error?: Error;
}

interface BatchStudentRegistrationProps {
  contract?: any; // Optional - will use contractStudentManagementConfig by default
  availablePrograms?: { id: number; name: string }[]; // Optional list of available programs
  onRegistrationSuccess?: (numStudents: number, txHash: string) => void; // Optional callback for successful registration
  onRegistrationError?: (error: Error) => void; // Optional callback for registration errors
  onStudentsChange?: (students: StudentEntry[]) => void; // New callback for when students data changes
  onRegistrationStateChange?: (result: RegistrationResult) => void; // New callback for registration state changes
  initialStudents?: StudentEntry[]; // Optional initial students data
}

const BatchStudentRegistration = ({
  contract = contractStudentManagementConfig,
  availablePrograms = [],
  onRegistrationSuccess,
  onRegistrationError,
  onStudentsChange,
  onRegistrationStateChange,
  initialStudents
}: BatchStudentRegistrationProps) => {
  // Students array state
  const [students, setStudents] = useState<StudentEntry[]>(
    initialStudents || [{ id: Date.now().toString(), address: '', name: '', programId: '' }]
  );
  
  // Validation state
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});
  
  // Contract write state
  const { 
    data: hash,
    error: writeError,
    isPending: isWritePending,
    writeContract
  } = useWriteContract();
  
  // Transaction receipt state
  const { 
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    error: confirmError
  } = useWaitForTransactionReceipt({ 
    hash,
  });
  
  // Combined error state
  const error = writeError || confirmError;

  // Current registration state
  const registrationState: RegistrationResult = {
    status: isWritePending ? 'pending' : 
            isConfirming ? 'confirming' : 
            isConfirmed ? 'success' : 
            error ? 'error' : 'idle',
    students,
    hash,
    error: error as Error | undefined
  };

  // Update parent component when students change
  useEffect(() => {
    if (onStudentsChange) {
      onStudentsChange(students);
    }
  }, [students, onStudentsChange]);

  // Update parent component when registration state changes
  useEffect(() => {
    if (onRegistrationStateChange) {
      onRegistrationStateChange(registrationState);
    }
  }, [registrationState, onRegistrationStateChange]);
  
  // Add a new student entry
  const addStudentEntry = () => {
    setStudents([
      ...students,
      { id: Date.now().toString(), address: '', name: '', programId: '' }
    ]);
  };
  
  // Remove a student entry
  const removeStudentEntry = (id: string) => {
    if (students.length > 1) {
      setStudents(students.filter(student => student.id !== id));
    }
  };
  
  // Update a student entry
  const updateStudentEntry = (id: string, field: keyof StudentEntry, value: string) => {
    setStudents(students.map(student => 
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
  
  // Validate form data
  const validateForm = (): boolean => {
    const errors: {[key: string]: string} = {};
    let isValid = true;
    
    students.forEach(student => {
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
    const addresses = students.map(s => s.address.toLowerCase());
    const duplicateAddresses = addresses.filter((addr, index) => 
      addr && addresses.indexOf(addr) !== index
    );
    
    if (duplicateAddresses.length > 0) {
      duplicateAddresses.forEach(addr => {
        const studentsWithAddr = students.filter(s => s.address.toLowerCase() === addr);
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
      // Validate form
      if (!validateForm()) {
        return;
      }
      
      // Prepare data for contract call
      const addresses = students.map(s => s.address as `0x${string}`);
      const names = students.map(s => s.name);
      const programIds = students.map(s => BigInt(s.programId));
      
      // Execute contract call
      writeContract({
        ...contract,
        functionName: 'batchRegisterStudents',
        args: [addresses, names, programIds]
      });
    } catch (err) {
      if (onRegistrationError && err instanceof Error) {
        onRegistrationError(err);
      }
    }
  };
  
  // Call success callback when confirmed
  useEffect(() => {
    if (isConfirmed && hash && !isConfirming) {
      if (onRegistrationSuccess) {
        onRegistrationSuccess(students.length, hash);
      }
      
      // Reset form on success if no callbacks provided
      if (!onRegistrationSuccess && !onRegistrationStateChange) {
        setStudents([{ id: Date.now().toString(), address: '', name: '', programId: '' }]);
      }
    }
  }, [isConfirmed, hash, isConfirming, onRegistrationSuccess, students.length, onRegistrationStateChange]);
  
  // Get registration status and styling
  const getRegistrationStatus = () => {
    if (isWritePending) {
      return { text: 'Registering Students', color: 'text-yellow-400', bg: 'bg-yellow-500/20' };
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
    
    return { text: 'Ready for Registration', color: 'text-gray-400', bg: 'bg-gray-500/20' };
  };
  
  const status = getRegistrationStatus();
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-gray-800/50 border border-gray-700 rounded-lg p-4"
    >
      <h3 className="text-lg font-medium text-blue-400 mb-3">
        Batch Student Registration
      </h3>
      
      {/* Status Badge */}
      <div className={`inline-flex items-center px-3 py-1 rounded-full ${status.bg} border border-${status.color.replace('text-', '')}/30 mb-4`}>
        <div className={`w-2 h-2 rounded-full ${status.color.replace('text-', 'bg-')} mr-2`}></div>
        <span className={`text-sm font-medium ${status.color}`}>
          {status.text}
        </span>
      </div>
      
      {/* Registration Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-gray-700/30 rounded-lg p-4">
          <div className="mb-4 flex justify-between items-center">
            <h4 className="text-sm font-medium text-gray-300">
              Student Information
            </h4>
            <span className="text-xs text-gray-400">
              {students.length} {students.length === 1 ? 'student' : 'students'}
            </span>
          </div>
          
          {/* Student List */}
          <div className="space-y-4">
            {students.map((student, index) => (
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
                    disabled={students.length === 1 || isWritePending || isConfirming}
                  >
                    {students.length > 1 ? 'Remove' : ''}
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
                      disabled={isWritePending || isConfirming}
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
                      disabled={isWritePending || isConfirming}
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
                        disabled={isWritePending || isConfirming}
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
                        disabled={isWritePending || isConfirming}
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
            disabled={isWritePending || isConfirming}
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Another Student
          </button>
        </div>
        
        {/* Error Display */}
        {error && (
          <div className="bg-red-500/20 text-red-400 border border-red-500/30 rounded-md p-3">
            <p className="text-sm">Error registering students: {(error as Error).message || 'Unknown error'}</p>
          </div>
        )}
        
        {/* Success Display */}
        {isConfirmed && hash && (
          <div className="bg-green-500/20 text-green-400 border border-green-500/30 rounded-md p-3">
            <p className="text-sm">Successfully registered {students.length} students!</p>
            <div className="mt-1 flex items-center">
              <span className="text-xs text-gray-400">Transaction Hash: </span>
              <a 
                href={`https://etherscan.io/tx/${hash}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs text-blue-400 ml-1 font-mono truncate hover:underline"
              >
                {hash}
              </a>
            </div>
          </div>
        )}
        
        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            className={`px-4 py-2 rounded-md text-white font-medium transition-colors ${
              isWritePending || isConfirming
                ? 'bg-gray-600 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
            disabled={isWritePending || isConfirming}
          >
            {isWritePending || isConfirming ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {isWritePending ? 'Submitting...' : 'Confirming...'}
              </span>
            ) : isConfirmed ? (
              'Registration Complete'
            ) : (
              'Register Students'
            )}
          </button>
        </div>
      </form>
      
      {/* Registration Info */}
      <div className="mt-4 pt-4 border-t border-gray-700">
        <h4 className="text-sm font-medium text-gray-300 mb-2">Registration Information</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 gap-x-4 text-xs">
          <div>
            <span className="text-gray-400">Function: </span>
            <span className="text-gray-200 font-mono">batchRegisterStudents</span>
          </div>
          <div>
            <span className="text-gray-400">Transaction Type: </span>
            <span className="text-gray-200">Non-payable</span>
          </div>
          <div>
            <span className="text-gray-400">Gas Estimate: </span>
            <span className="text-gray-200">~100,000 + 50,000 per student</span>
          </div>
          <div>
            <span className="text-gray-400">Confirmation Time: </span>
            <span className="text-gray-200">~15-30 seconds</span>
          </div>
        </div>
        <div className="mt-3 text-xs text-gray-400">
          <p className="mb-1">Note: All students in the batch must have a valid wallet address, name, and program ID.</p>
          <p>Make sure each address is unique and has the correct format (0x followed by 40 hexadecimal characters).</p>
        </div>
      </div>
    </motion.div>
  );
};

// Export both the component and its types for easier importing in parent components
export { BatchStudentRegistration };
export default BatchStudentRegistration;