import { useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { motion } from 'framer-motion';

/**
 * StudentRegistrationForm Component
 * 
 * This component provides a form to register a single student.
 * It uses the registerStudent contract function.
 */
interface StudentRegistrationFormProps {
  contract: any;
  availablePrograms?: { id: number; name: string }[]; // Optional list of available programs
  onRegistrationSuccess?: (studentAddress: string, name: string, programId: number, txHash: string) => void; // Optional callback for successful registration
  onRegistrationError?: (error: Error) => void; // Optional callback for registration errors
}

const StudentRegistrationForm = ({
  contract,
  availablePrograms = [],
  onRegistrationSuccess,
  onRegistrationError
}: StudentRegistrationFormProps) => {
  // Form state
  const [studentAddress, setStudentAddress] = useState<string>('');
  const [studentName, setStudentName] = useState<string>('');
  const [programId, setProgramId] = useState<string>('');
  
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
  
  // Combined error and processing states
  const error = writeError || confirmError;
  const isProcessing = isWritePending || isConfirming;
  
  // Validate form data
  const validateForm = (): boolean => {
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
    if (!programId) {
      errors.programId = 'Program ID is required';
      isValid = false;
    } else if (isNaN(Number(programId)) || Number(programId) < 0) {
      errors.programId = 'Program ID must be a valid number';
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
      
      // Execute contract call
      writeContract({
        ...contract,
        functionName: 'registerStudent',
        args: [studentAddress as `0x${string}`, studentName, BigInt(programId)]
      });
    } catch (err) {
      if (onRegistrationError && err instanceof Error) {
        onRegistrationError(err);
      }
    }
  };
  
  // Handle input change with validation clearing
  const handleInputChange = (field: string, value: string) => {
    switch (field) {
      case 'address':
        setStudentAddress(value);
        break;
      case 'name':
        setStudentName(value);
        break;
      case 'programId':
        setProgramId(value);
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
  
  // Call success callback when confirmed
  if (isConfirmed && hash && !isConfirming) {
    if (onRegistrationSuccess) {
      onRegistrationSuccess(studentAddress, studentName, Number(programId), hash);
    }
    
    // Reset form on success if no callback provided
    if (!onRegistrationSuccess) {
      setStudentAddress('');
      setStudentName('');
      setProgramId('');
    }
  }
  
  // Get registration status and styling
  const getRegistrationStatus = () => {
    if (isWritePending) {
      return { text: 'Registering Student', color: 'text-yellow-400', bg: 'bg-yellow-500/20' };
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
        Student Registration
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
              onChange={(e) => handleInputChange('address', e.target.value)}
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
              onChange={(e) => handleInputChange('name', e.target.value)}
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
                value={programId}
                onChange={(e) => handleInputChange('programId', e.target.value)}
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
                value={programId}
                onChange={(e) => handleInputChange('programId', e.target.value)}
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
        
        {/* Error Display */}
        {error && (
          <div className="bg-red-500/20 text-red-400 border border-red-500/30 rounded-md p-3">
            <p className="text-sm">Error registering student: {(error as Error).message || 'Unknown error'}</p>
          </div>
        )}
        
        {/* Success Display */}
        {isConfirmed && hash && (
          <div className="bg-green-500/20 text-green-400 border border-green-500/30 rounded-md p-3">
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
                <span className="text-xs text-white">{programId}</span>
              </div>
              <div className="flex items-center mt-1">
                <span className="text-xs text-gray-400 w-20">TX Hash:</span>
                <a 
                  href={`https://etherscan.io/tx/${hash}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-blue-400 font-mono truncate hover:underline"
                >
                  {hash}
                </a>
              </div>
            </div>
          </div>
        )}
        
        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            className={`px-4 py-2 rounded-md text-white font-medium transition-colors ${
              isProcessing
                ? 'bg-gray-600 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
            disabled={isProcessing}
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
              'Register Student'
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
            <span className="text-gray-200 font-mono">registerStudent(address,string,uint256)</span>
          </div>
          <div>
            <span className="text-gray-400">Transaction Type: </span>
            <span className="text-gray-200">Non-payable</span>
          </div>
          <div>
            <span className="text-gray-400">Gas Estimate: </span>
            <span className="text-gray-200">~80,000 gas</span>
          </div>
          <div>
            <span className="text-gray-400">Confirmation Time: </span>
            <span className="text-gray-200">~15-30 seconds</span>
          </div>
        </div>
        <div className="mt-3 text-xs text-gray-400">
          <p className="mb-1">Note: The wallet address must be a valid Ethereum address starting with 0x.</p>
          <p>After registration, the student will need to make their first attendance to activate their account.</p>
        </div>
      </div>
    </motion.div>
  );
};

export default StudentRegistrationForm;