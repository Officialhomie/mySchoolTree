import { useState, useEffect } from 'react';
import { useReadContract } from 'wagmi';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';

/**
 * StudentSchoolVerifier Component
 * 
 * This component verifies if a student belongs to a specific school.
 * It uses the isStudentOfSchool contract function to check the relationship.
 */
interface StudentSchoolVerifierProps {
  contract: any;
  studentAddress?: string; // Optional pre-filled student address
  schoolAddress?: string; // Optional pre-filled school address
  refreshInterval?: number; // Optional interval to refresh data in milliseconds
  onVerificationResult?: (isStudentOfSchool: boolean, studentAddress: string, schoolAddress: string) => void; // Optional callback when verification is complete
}

const StudentSchoolVerifier = ({
  contract,
  studentAddress = '',
  schoolAddress = '',
  refreshInterval = 0,
  onVerificationResult
}: StudentSchoolVerifierProps) => {
  // Form state
  const [student, setStudent] = useState<string>(studentAddress);
  const [school, setSchool] = useState<string>(schoolAddress);
  const [validationError, setValidationError] = useState<string>('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Fetch verification data from contract
  const {
    data: verificationResult,
    error: verificationError,
    isLoading: isLoadingVerification,
    isSuccess: isVerificationSuccess,
    refetch: refetchVerification
  } = useReadContract({
    ...contract,
    functionName: 'isStudentOfSchool',
    args: student && school ? [student as `0x${string}`, school as `0x${string}`] : undefined,
    query: {
      enabled: !!student && !!school
    }
  });

  // Format ethereum address for display
  const formatAddress = (address: string): string => {
    if (!address || address.length < 42) return address;
    return `${address.substring(0, 6)}...${address.substring(38)}`;
  };

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

  // Handle student address change
  const handleStudentChange = (value: string) => {
    setStudent(value);
    setValidationError('');
  };

  // Handle school address change
  const handleSchoolChange = (value: string) => {
    setSchool(value);
    setValidationError('');
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const isStudentValid = validateAddress(student, 'Student');
    if (!isStudentValid) return;
    
    const isSchoolValid = validateAddress(school, 'School');
    if (!isSchoolValid) return;
    
    refetchVerification();
  };

  // Callback when data is fetched
  useEffect(() => {
    if (isVerificationSuccess && verificationResult !== undefined) {
      setLastUpdated(new Date());
      
      if (onVerificationResult) {
        onVerificationResult(verificationResult as boolean, student, school);
      }
    }
  }, [isVerificationSuccess, verificationResult, student, school, onVerificationResult]);

  // Set up auto-refresh if interval is provided
  useEffect(() => {
    if (refreshInterval > 0 && student && school) {
      const timer = setInterval(() => {
        refetchVerification();
      }, refreshInterval);
      
      return () => {
        clearInterval(timer);
      };
    }
  }, [refreshInterval, student, school, refetchVerification]);

  // Get verification status styling
  const getVerificationStatus = () => {
    if (verificationResult === undefined) {
      return { text: 'Unknown', color: 'text-gray-400', bg: 'bg-gray-500/20' };
    }
    
    return verificationResult
      ? { text: 'Verified', color: 'text-green-400', bg: 'bg-green-500/20' }
      : { text: 'Not Verified', color: 'text-red-400', bg: 'bg-red-500/20' };
  };

  const status = getVerificationStatus();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-gray-800/50 border border-gray-700 rounded-lg p-4"
    >
      <h3 className="text-lg font-medium text-blue-400 mb-3">
        Student-School Verification
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
          
          {/* School Address Input */}
          <div className="space-y-2">
            <label htmlFor="school-address" className="block text-sm font-medium text-gray-300">
              School Address
            </label>
            <input
              id="school-address"
              type="text"
              value={school}
              onChange={(e) => handleSchoolChange(e.target.value)}
              placeholder="0x..."
              className={`w-full px-3 py-2 bg-gray-700 border ${
                validationError && !school ? 'border-red-500' : 'border-gray-600'
              } rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
            />
            <p className="text-xs text-gray-400">Enter the school's Ethereum address</p>
          </div>
          
          {/* Error Display */}
          {validationError && (
            <div className="text-xs text-red-400 mt-1">{validationError}</div>
          )}
          
          {/* Quick Test Buttons */}
          <div className="flex flex-wrap gap-2 mt-2">
            <div>
              <h4 className="text-xs text-gray-400 mb-1">Student Test Addresses:</h4>
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
              <h4 className="text-xs text-gray-400 mb-1">School Test Addresses:</h4>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleSchoolChange("0xdD2FD4581271e230360230F9337D5c0430Bf44C0")}
                  className="text-xs bg-gray-600 hover:bg-gray-500 text-gray-200 py-1 px-2 rounded"
                >
                  Test School 1
                </button>
                <button
                  type="button"
                  onClick={() => handleSchoolChange("0x5FbDB2315678afecb367f032d93F642f64180aa3")}
                  className="text-xs bg-gray-600 hover:bg-gray-500 text-gray-200 py-1 px-2 rounded"
                >
                  Test School 2
                </button>
              </div>
            </div>
          </div>
          
          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoadingVerification}
            >
              {isLoadingVerification ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Verifying...
                </span>
              ) : (
                'Verify Relationship'
              )}
            </button>
          </div>
        </div>
      </form>
      
      {/* Results Display */}
      {verificationError ? (
        <div className="bg-red-500/20 text-red-400 border border-red-500/30 rounded-md p-3 mb-4">
          <p className="text-sm">Error verifying relationship: {(verificationError as Error).message || 'Unknown error'}</p>
          <button 
            onClick={() => refetchVerification()} 
            className="text-xs mt-2 bg-gray-700 hover:bg-gray-600 text-gray-200 py-1 px-2 rounded"
          >
            Try Again
          </button>
        </div>
      ) : isVerificationSuccess && verificationResult !== undefined ? (
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
              {/* Verification Result */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-300">Verification Result</h4>
                <div className="bg-gray-700/40 rounded-md p-3 border border-gray-600">
                  <div className="flex items-center justify-center p-3">
                    {verificationResult ? (
                      <div className="flex flex-col items-center">
                        <div className="w-16 h-16 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center mb-2">
                          <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <p className="text-lg font-medium text-green-400">Verified Student</p>
                        <p className="text-sm text-gray-400 mt-1">This student is enrolled at the specified school</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <div className="w-16 h-16 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center mb-2">
                          <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </div>
                        <p className="text-lg font-medium text-red-400">Not Verified</p>
                        <p className="text-sm text-gray-400 mt-1">This student is not enrolled at the specified school</p>
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
                    
                    {/* School Address */}
                    <div className="space-y-1">
                      <p className="text-xs text-gray-400">School Address:</p>
                      <p className="text-sm font-mono text-white break-all">{school}</p>
                      <p className="text-xs text-gray-400">{formatAddress(school)}</p>
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
                <span className="text-gray-400 mr-2">Verification Status:</span>
                <span className={`font-medium ${verificationResult ? 'text-green-400' : 'text-red-400'}`}>
                  {verificationResult ? 'Verified' : 'Not Verified'}
                </span>
              </div>
              
              <div className="flex items-center space-x-3">
                <button 
                  onClick={() => refetchVerification()} 
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
    </motion.div>
  );
};

export default StudentSchoolVerifier;