import { useState, useEffect } from 'react';
import { useReadContract } from 'wagmi';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';

/**
 * ProgramEnrollmentValidator Component
 * 
 * This component verifies if a student is enrolled in a specific program.
 * It uses the validateProgramEnrollment contract function to check enrollment.
 */
interface ProgramEnrollmentValidatorProps {
  contract: any;
  studentAddress?: string; // Optional pre-filled student address
  programId?: number; // Optional pre-filled program ID
  refreshInterval?: number; // Optional interval to refresh data in milliseconds
  onValidationResult?: (isEnrolled: boolean, studentAddress: string, programId: number) => void; // Optional callback when validation is complete
  programOptions?: Array<{id: number, name: string}>; // Optional program options for dropdown selection
}

const ProgramEnrollmentValidator = ({
  contract,
  studentAddress = '',
  programId = 1,
  refreshInterval = 0,
  onValidationResult,
  programOptions = [
    { id: 1, name: 'Computer Science' },
    { id: 2, name: 'Business Administration' },
    { id: 3, name: 'Data Science' },
    { id: 4, name: 'Blockchain Development' },
    { id: 5, name: 'Artificial Intelligence' }
  ]
}: ProgramEnrollmentValidatorProps) => {
  // Form state
  const [student, setStudent] = useState<string>(studentAddress);
  const [program, setProgram] = useState<number>(programId);
  const [validationError, setValidationError] = useState<string>('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Fetch enrollment validation data from contract
  const {
    data: enrollmentData,
    error: enrollmentError,
    isLoading: isLoadingEnrollment,
    isSuccess: isEnrollmentSuccess,
    refetch: refetchEnrollment
  } = useReadContract({
    ...contract,
    functionName: 'validateProgramEnrollment',
    args: student && program ? [student as `0x${string}`, BigInt(program)] : undefined,
    query: {
      enabled: !!student && !!program
    }
  });

  // Format ethereum address for display
  const formatAddress = (address: string): string => {
    if (!address || address.length < 42) return address;
    return `${address.substring(0, 6)}...${address.substring(38)}`;
  };

  // Validate student address format
  const validateAddress = (address: string): boolean => {
    if (!address) {
      setValidationError('Student address is required');
      return false;
    }
    
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      setValidationError('Invalid Ethereum address format');
      return false;
    }
    
    setValidationError('');
    return true;
  };

  // Validate program ID
  const validateProgramId = (id: number): boolean => {
    if (!id) {
      setValidationError('Program ID is required');
      return false;
    }
    
    if (id <= 0) {
      setValidationError('Program ID must be a positive number');
      return false;
    }
    
    setValidationError('');
    return true;
  };

  // Handle student address change
  const handleStudentChange = (value: string) => {
    setStudent(value);
    setValidationError('');
  };

  // Handle program ID change
  const handleProgramChange = (value: string) => {
    const programId = parseInt(value);
    setProgram(isNaN(programId) ? 0 : programId);
    setValidationError('');
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const isAddressValid = validateAddress(student);
    if (!isAddressValid) return;
    
    const isProgramValid = validateProgramId(program);
    if (!isProgramValid) return;
    
    refetchEnrollment();
  };

  // Callback when data is fetched
  useEffect(() => {
    if (isEnrollmentSuccess && enrollmentData !== undefined) {
      setLastUpdated(new Date());
      
      if (onValidationResult) {
        onValidationResult(enrollmentData as boolean, student, program);
      }
    }
  }, [isEnrollmentSuccess, enrollmentData, student, program, onValidationResult]);

  // Set up auto-refresh if interval is provided
  useEffect(() => {
    if (refreshInterval > 0 && student && program) {
      const timer = setInterval(() => {
        refetchEnrollment();
      }, refreshInterval);
      
      return () => {
        clearInterval(timer);
      };
    }
  }, [refreshInterval, student, program, refetchEnrollment]);

  // Get program name from ID
  const getProgramName = (id: number): string => {
    const program = programOptions.find(p => p.id === id);
    return program ? program.name : `Program ${id}`;
  };

  // Get enrollment status styling
  const getEnrollmentStatus = () => {
    if (enrollmentData === undefined) {
      return { text: 'Unknown', color: 'text-gray-400', bg: 'bg-gray-500/20' };
    }
    
    return enrollmentData
      ? { text: 'Enrolled', color: 'text-green-400', bg: 'bg-green-500/20' }
      : { text: 'Not Enrolled', color: 'text-red-400', bg: 'bg-red-500/20' };
  };

  const status = getEnrollmentStatus();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-gray-800/50 border border-gray-700 rounded-lg p-4"
    >
      <h3 className="text-lg font-medium text-blue-400 mb-3">
        Program Enrollment Validator
      </h3>
      
      {/* Query Form */}
      <form onSubmit={handleSubmit} className="space-y-4 mb-4">
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
          
          {/* Program ID Input */}
          <div className="space-y-2">
            <label htmlFor="program-id" className="block text-sm font-medium text-gray-300">
              Program
            </label>
            <select
              id="program-id"
              value={program}
              onChange={(e) => handleProgramChange(e.target.value)}
              className={`w-full px-3 py-2 bg-gray-700 border ${
                validationError && (!program || program <= 0) ? 'border-red-500' : 'border-gray-600'
              } rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
            >
              <option value="">Select a program</option>
              {programOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name} (ID: {option.id})
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-400">Select the program to check enrollment for</p>
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
                  onClick={() => handleStudentChange("0x742d35Cc6634C0532925a3b844Bc454e4438f44e")}
                  className="text-xs bg-gray-600 hover:bg-gray-500 text-gray-200 py-1 px-2 rounded"
                >
                  Test Student 1
                </button>
                <button
                  type="button"
                  onClick={() => handleStudentChange("0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199")}
                  className="text-xs bg-gray-600 hover:bg-gray-500 text-gray-200 py-1 px-2 rounded"
                >
                  Test Student 2
                </button>
              </div>
            </div>
          </div>
          
          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoadingEnrollment}
            >
              {isLoadingEnrollment ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Validating...
                </span>
              ) : (
                'Validate Enrollment'
              )}
            </button>
          </div>
        </div>
      </form>
      
      {/* Results Display */}
      {enrollmentError ? (
        <div className="bg-red-500/20 text-red-400 border border-red-500/30 rounded-md p-3 mb-4">
          <div className="flex items-center">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-sm">Error validating enrollment: {(enrollmentError as Error).message || 'Unknown error'}</p>
          </div>
          <button 
            onClick={() => refetchEnrollment()} 
            className="text-xs mt-2 bg-gray-700 hover:bg-gray-600 text-gray-200 py-1 px-2 rounded flex items-center"
          >
            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Try Again
          </button>
        </div>
      ) : isEnrollmentSuccess && enrollmentData !== undefined ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-4"
        >
          {/* Status Badge */}
          <div className={`inline-flex items-center px-3 py-1 rounded-full ${status.bg} border border-${status.color.replace('text-', '')}/30`}>
            <div className={`w-2 h-2 rounded-full ${status.color.replace('text-', 'bg-')} mr-2`}></div>
            <span className={`text-sm font-medium ${status.color}`}>
              {status.text}
            </span>
          </div>
          
          {/* Main Info Card */}
          <div className="bg-gray-700/30 rounded-lg p-4">
            <div className="grid grid-cols-1 gap-4">
              {/* Enrollment Result */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-300">Enrollment Status</h4>
                <div className="bg-gray-700/40 rounded-md p-3 border border-gray-600">
                  <div className="flex items-center justify-center p-4">
                    {enrollmentData ? (
                      <div className="flex flex-col items-center">
                        <div className="w-16 h-16 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center mb-2">
                          <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <p className="text-lg font-medium text-green-400">Enrollment Verified</p>
                        <p className="text-sm text-gray-400 mt-1">Student is enrolled in this program</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <div className="w-16 h-16 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center mb-2">
                          <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </div>
                        <p className="text-lg font-medium text-red-400">Not Enrolled</p>
                        <p className="text-sm text-gray-400 mt-1">Student is not enrolled in this program</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Enrollment Details */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-300">Validation Details</h4>
                <div className="bg-gray-700/40 rounded-md p-3 border border-gray-600">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Student Address */}
                    <div className="space-y-1">
                      <p className="text-xs text-gray-400">Student Address:</p>
                      <p className="text-sm font-mono text-white break-all">{student}</p>
                      <p className="text-xs text-gray-400">{formatAddress(student)}</p>
                    </div>
                    
                    {/* Program Details */}
                    <div className="space-y-1">
                      <p className="text-xs text-gray-400">Program Information:</p>
                      <p className="text-sm text-white">{getProgramName(program)}</p>
                      <p className="text-xs text-gray-400">Program ID: {program}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Additional Actions */}
          <div className="bg-gray-700/20 rounded-md p-3">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2">
              <div className="flex items-center">
                <span className="text-gray-400 mr-2 text-xs">Validation Status:</span>
                <span className={`text-xs font-medium ${enrollmentData ? 'text-green-400' : 'text-red-400'}`}>
                  {enrollmentData ? 'Enrolled' : 'Not Enrolled'}
                </span>
              </div>
              
              <div className="flex items-center space-x-3">
                <button 
                  onClick={() => refetchEnrollment()} 
                  className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 py-1 px-3 rounded flex items-center"
                >
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </button>
                
                {lastUpdated && (
                  <span className="text-xs text-gray-400">
                    Updated {formatDistanceToNow(lastUpdated, { addSuffix: true })}
                  </span>
                )}
              </div>
            </div>
            
            {/* Conditional Action Buttons */}
            {isEnrollmentSuccess && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                transition={{ duration: 0.3 }}
                className="mt-3 pt-3 border-t border-gray-600"
              >
                <div className="grid grid-cols-2 gap-2">
                  {enrollmentData ? (
                    <>
                      <button className="text-xs bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded">
                        View Program Details
                      </button>
                      <button className="text-xs bg-purple-600 hover:bg-purple-700 text-white py-2 px-3 rounded">
                        View Student Progress
                      </button>
                    </>
                  ) : (
                    <>
                      <button className="text-xs bg-yellow-600 hover:bg-yellow-700 text-white py-2 px-3 rounded">
                        Enroll Student
                      </button>
                      <button className="text-xs bg-gray-600 hover:bg-gray-700 text-white py-2 px-3 rounded">
                        View Available Programs
                      </button>
                    </>
                  )}
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      ) : null}
    </motion.div>
  );
};

export default ProgramEnrollmentValidator;