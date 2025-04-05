import { useState, useEffect } from 'react';
import { useReadContract } from 'wagmi';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';

/**
 * StudentTermCompletionVerifier Component
 * 
 * This component verifies if a student has completed a specific term.
 * It uses the completedTerms contract function to check the completion status.
 * 
 * The component exposes a useTermCompletionVerification hook for external data access.
 */
interface StudentTermCompletionVerifierProps {
  contract: any;
  studentAddress?: string; // Optional pre-filled student address
  termNumber?: number; // Optional pre-filled term number
  refreshInterval?: number; // Optional interval to refresh data in milliseconds
  onCompletionResult?: (isCompleted: boolean, studentAddress: string, termNumber: number) => void; // Optional callback when verification is complete
}

export interface VerificationStatus {
  text: string;
  color: string;
  bg: string;
}

export interface TermCompletionInfo {
  isCompleted: boolean | undefined;
  studentAddress: string;
  termNumber: number;
  status: VerificationStatus;
  lastUpdated: Date | null;
  isLoading: boolean;
  error: Error | null;
  setStudentAddress: (address: string) => void;
  setTermNumber: (term: number) => void;
  refresh: () => void;
  formatAddress: (address: string) => string;
  validateAddress: (address: string) => boolean;
  validateTerm: (term: number) => boolean;
  validationError: string;
}

/**
 * Hook to access term completion verification data outside the component
 */
export function useTermCompletionVerification(
  contract: any,
  initialStudentAddress: string = '',
  initialTermNumber: number = 1,
  refreshInterval: number = 0
): TermCompletionInfo {
  // Form state
  const [student, setStudent] = useState<string>(initialStudentAddress);
  const [termNumber, setTermNumber] = useState<number>(initialTermNumber);
  const [validationError, setValidationError] = useState<string>('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Fetch completion data from contract
  const {
    data: completionResult,
    error: completionError,
    isLoading: isLoadingCompletion,
    isSuccess: isCompletionSuccess,
    refetch: refetchCompletion
  } = useReadContract({
    ...contract,
    functionName: 'completedTerms',
    args: student && termNumber ? [student as `0x${string}`, BigInt(termNumber)] : undefined,
    query: {
      enabled: !!student && termNumber > 0
    }
  });

  // Format ethereum address for display
  const formatAddress = (address: string): string => {
    if (!address || address.length < 42) return address;
    return `${address.substring(0, 6)}...${address.substring(38)}`;
  };

  // Validate address format
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

  // Validate term number
  const validateTerm = (term: number): boolean => {
    if (!term || term <= 0) {
      setValidationError('Term number must be positive');
      return false;
    }
    
    setValidationError('');
    return true;
  };

  // Set student address with validation
  const setStudentAddress = (value: string) => {
    setStudent(value);
    setValidationError('');
  };

  // Set term number with validation
  const setTermValue = (value: number) => {
    setTermNumber(value);
    setValidationError('');
  };

  // Callback when data is fetched
  useEffect(() => {
    if (isCompletionSuccess && completionResult !== undefined) {
      setLastUpdated(new Date());
    }
  }, [isCompletionSuccess, completionResult]);

  // Set up auto-refresh if interval is provided
  useEffect(() => {
    if (refreshInterval > 0 && student && termNumber > 0) {
      const timer = setInterval(() => {
        refetchCompletion();
      }, refreshInterval);
      
      return () => {
        clearInterval(timer);
      };
    }
  }, [refreshInterval, student, termNumber, refetchCompletion]);

  // Get verification status styling
  const getCompletionStatus = (): VerificationStatus => {
    if (completionResult === undefined) {
      return { text: 'Unknown', color: 'text-gray-400', bg: 'bg-gray-500/20' };
    }
    
    return completionResult
      ? { text: 'Completed', color: 'text-green-400', bg: 'bg-green-500/20' }
      : { text: 'Not Completed', color: 'text-red-400', bg: 'bg-red-500/20' };
  };

  return {
    isCompleted: completionResult as boolean | undefined,
    studentAddress: student,
    termNumber,
    status: getCompletionStatus(),
    lastUpdated,
    isLoading: isLoadingCompletion,
    error: completionError as Error | null,
    setStudentAddress,
    setTermNumber: setTermValue,
    refresh: refetchCompletion,
    formatAddress,
    validateAddress,
    validateTerm,
    validationError
  };
}

const StudentTermCompletionVerifier = ({
  contract,
  studentAddress = '',
  termNumber = 1,
  refreshInterval = 0,
  onCompletionResult
}: StudentTermCompletionVerifierProps) => {
  // Use the exported hook for handling verification data
  const {
    isCompleted,
    studentAddress: student,
    termNumber: term,
    status,
    lastUpdated,
    isLoading: isLoadingCompletion,
    error: completionError,
    setStudentAddress,
    setTermNumber,
    refresh: refetchCompletion,
    formatAddress,
    validateAddress,
    validateTerm,
    validationError
  } = useTermCompletionVerification(contract, studentAddress, termNumber, refreshInterval);

  // Callback when data is fetched - using useEffect to trigger callback
  useEffect(() => {
    if (isCompleted !== undefined && onCompletionResult) {
      onCompletionResult(isCompleted, student, term);
    }
  }, [isCompleted, student, term, onCompletionResult]);

  // Handle student address change
  const handleStudentChange = (value: string) => {
    setStudentAddress(value);
  };

  // Handle term number change
  const handleTermChange = (value: string) => {
    const termNumber = parseInt(value);
    if (!isNaN(termNumber)) {
      setTermNumber(termNumber);
    }
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const isStudentValid = validateAddress(student);
    if (!isStudentValid) return;
    
    const isTermValid = validateTerm(term);
    if (!isTermValid) return;
    
    refetchCompletion();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-gray-800/50 border border-gray-700 rounded-lg p-4"
    >
      <h3 className="text-lg font-medium text-blue-400 mb-3">
        Student Term Completion Verifier
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
          
          {/* Term Number Input */}
          <div className="space-y-2">
            <label htmlFor="term-number" className="block text-sm font-medium text-gray-300">
              Term Number
            </label>
            <input
              id="term-number"
              type="number"
              value={term}
              onChange={(e) => handleTermChange(e.target.value)}
              placeholder="Enter term number"
              min="1"
              className={`w-full px-3 py-2 bg-gray-700 border ${
                validationError && (!term || term <= 0) ? 'border-red-500' : 'border-gray-600'
              } rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
            />
            <p className="text-xs text-gray-400">Enter the term number to check completion status</p>
          </div>
          
          {/* Error Display */}
          {validationError && (
            <div className="text-xs text-red-400 mt-1">{validationError}</div>
          )}
          
          {/* Quick Test Buttons */}
          <div className="flex flex-wrap gap-2 mt-2">
            <div>
              <h4 className="text-xs text-gray-400 mb-1">Test Student Addresses:</h4>
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
            
            <div>
              <h4 className="text-xs text-gray-400 mb-1">Term Numbers:</h4>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setTermNumber(1)}
                  className="text-xs bg-gray-600 hover:bg-gray-500 text-gray-200 py-1 px-2 rounded"
                >
                  Term 1
                </button>
                <button
                  type="button"
                  onClick={() => setTermNumber(2)}
                  className="text-xs bg-gray-600 hover:bg-gray-500 text-gray-200 py-1 px-2 rounded"
                >
                  Term 2
                </button>
                <button
                  type="button"
                  onClick={() => setTermNumber(3)}
                  className="text-xs bg-gray-600 hover:bg-gray-500 text-gray-200 py-1 px-2 rounded"
                >
                  Term 3
                </button>
              </div>
            </div>
          </div>
          
          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoadingCompletion}
            >
              {isLoadingCompletion ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Verifying...
                </span>
              ) : (
                'Verify Completion'
              )}
            </button>
          </div>
        </div>
      </form>
      
      {/* Results Display */}
      {completionError ? (
        <div className="bg-red-500/20 text-red-400 border border-red-500/30 rounded-md p-3 mb-4">
          <p className="text-sm">Error verifying term completion: {(completionError as Error).message || 'Unknown error'}</p>
          <button 
            onClick={() => refetchCompletion()} 
            className="text-xs mt-2 bg-gray-700 hover:bg-gray-600 text-gray-200 py-1 px-2 rounded"
          >
            Try Again
          </button>
        </div>
      ) : isCompleted !== undefined ? (
        <div className="space-y-4">
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
              {/* Completion Result */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-300">Term Completion Result</h4>
                <div className="bg-gray-700/40 rounded-md p-3 border border-gray-600">
                  <div className="flex items-center justify-center p-3">
                    {isCompleted ? (
                      <div className="flex flex-col items-center">
                        <div className="w-16 h-16 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center mb-2">
                          <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <p className="text-lg font-medium text-green-400">Term {term} Completed</p>
                        <p className="text-sm text-gray-400 mt-1">This student has successfully completed term {term}</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <div className="w-16 h-16 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center mb-2">
                          <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </div>
                        <p className="text-lg font-medium text-red-400">Term {term} Not Completed</p>
                        <p className="text-sm text-gray-400 mt-1">This student has not yet completed term {term}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Verification Details */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-300">Verification Details</h4>
                <div className="bg-gray-700/40 rounded-md p-3 border border-gray-600">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Student Address */}
                    <div className="space-y-1">
                      <p className="text-xs text-gray-400">Student Address:</p>
                      <p className="text-sm font-mono text-white break-all">{student}</p>
                      <p className="text-xs text-gray-400">{formatAddress(student)}</p>
                    </div>
                    
                    {/* Term Number */}
                    <div className="space-y-1">
                      <p className="text-xs text-gray-400">Term Number:</p>
                      <p className="text-sm text-white font-medium">{term}</p>
                      <p className="text-xs text-gray-400">Academic period being verified</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Additional Details */}
          <div className="bg-gray-700/20 rounded-md p-3 text-xs">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2">
              <div className="flex items-center">
                <span className="text-gray-400 mr-2">Completion Status:</span>
                <span className={`font-medium ${isCompleted ? 'text-green-400' : 'text-red-400'}`}>
                  {isCompleted ? 'Completed' : 'Not Completed'}
                </span>
              </div>
              
              <div className="flex items-center space-x-3">
                <button 
                  onClick={() => refetchCompletion()} 
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
          </div>
        </div>
      ) : null}
      
      {/* Educational Information */}
      <div className="mt-4 pt-4 border-t border-gray-700">
        <h4 className="text-sm font-medium text-gray-300 mb-2">About Term Completion</h4>
        <p className="text-xs text-gray-400 mb-2">
          Term completion verification checks if a student has successfully completed all required coursework, assessments, and attendance requirements for a specific academic term.
        </p>
        <div className="bg-blue-500/10 border border-blue-500/30 rounded p-3 text-xs text-gray-300">
          <div className="flex items-start">
            <div className="w-5 h-5 rounded-full bg-blue-500/30 text-blue-400 flex items-center justify-center mr-2 mt-0.5">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="mb-1">Completed terms are permanently recorded on the blockchain, providing an immutable record of academic achievement.</p>
              <p>Students who have completed a term may be eligible for certificates, credentials, or advancement to the next academic level.</p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default StudentTermCompletionVerifier;