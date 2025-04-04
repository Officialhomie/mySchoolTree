import { useState, useEffect } from 'react';
import { useReadContract, useAccount } from 'wagmi';
import { motion } from 'framer-motion';
import { isAddress } from 'viem';

/**
 * StudentProgramData interface represents the core program data
 * that is returned from the contract
 */
export interface StudentProgramData {
  programId: bigint | undefined;
  studentAddress: string;
  isSuccess: boolean;
  isLoading: boolean;
  error: Error | null;
  errorMessage: string;
}

/**
 * StudentProgramLookupResult interface defines all data and functionality
 * that the useStudentProgramLookup hook returns
 */
export interface StudentProgramLookupResult {
  // Core data
  programData: StudentProgramData;
  
  // UI state management
  studentAddress: string;
  isAddressValid: boolean;
  hasSearched: boolean;
  recentSearches: string[];
  
  // Actions
  setStudentAddress: (address: string) => void;
  searchProgram: () => void;
  selectRecentSearch: (address: string) => void;
  refetch: () => void;
  
  // Helper methods
  getProgramName: (id: bigint) => string;
  getEnrollmentStatus: () => { 
    text: string; 
    color: string; 
    bg: string; 
  };
}

/**
 * Custom hook that provides student program lookup functionality
 * This can be imported and used in any component
 * 
 * @param contract - The contract instance to interact with
 * @param initialAddress - Optional initial address to check
 * @param onProgramFound - Optional callback for when program is found
 * @param programNames - Optional mapping of program IDs to names
 * @returns An object containing program data, state, and actions
 */
export function useStudentProgramLookup(
  contract: any,
  initialAddress: string = '',
  onProgramFound?: (programId: bigint, studentAddress: string) => void,
  programNames: Record<string, string> = {}
): StudentProgramLookupResult {
  // Get connected wallet address if needed
  const { address: connectedAddress } = useAccount();
  
  // State for address input and validation
  const [studentAddress, setStudentAddress] = useState<string>(
    initialAddress || connectedAddress || ''
  );
  
  const [isAddressValid, setIsAddressValid] = useState<boolean>(
    initialAddress ? isAddress(initialAddress) : 
    connectedAddress ? isAddress(connectedAddress as string) : false
  );
  
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  
  // State for recent searches
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Fetch program data from contract
  const { 
    data: programIdRaw,
    error,
    isLoading,
    isSuccess,
    refetch
  } = useReadContract({
    ...contract,
    functionName: 'studentPrograms',
    args: [studentAddress],
    enabled: hasSearched && isAddressValid, // Only run when address is valid and search triggered
  });
  
  // Convert raw data to proper bigint type
  const programId = programIdRaw !== undefined && programIdRaw !== null 
    ? BigInt(programIdRaw.toString()) 
    : undefined;
  
  // Safely extract error message
  const errorMessage = error instanceof Error ? error.message : 
                      error ? String(error) : 'Unknown error';
  
  // Core program data structure
  const programData: StudentProgramData = {
    programId,
    studentAddress,
    isSuccess,
    isLoading,
    error: error as Error | null,
    errorMessage
  };
  
  // Update address validation when input changes
  useEffect(() => {
    setIsAddressValid(studentAddress ? isAddress(studentAddress) : false);
  }, [studentAddress]);
  
  // Load recent searches from localStorage on component mount
  useEffect(() => {
    const savedSearches = localStorage.getItem('studentProgramSearches');
    if (savedSearches) {
      try {
        const parsed = JSON.parse(savedSearches);
        if (Array.isArray(parsed)) {
          setRecentSearches(parsed.slice(0, 5)); // Keep only the 5 most recent
        }
      } catch (e) {
        console.error('Error parsing saved searches:', e);
      }
    }
  }, []);
  
  // Call the callback when program is found
  useEffect(() => {
    if (isSuccess && programId !== undefined && onProgramFound) {
      onProgramFound(programId, studentAddress);
    }
  }, [programId, isSuccess, studentAddress, onProgramFound]);

  // Function to trigger program lookup
  const searchProgram = () => {
    if (isAddressValid) {
      setHasSearched(true);
      
      // Add to recent searches if not already present
      if (!recentSearches.includes(studentAddress)) {
        const newSearches = [studentAddress, ...recentSearches].slice(0, 5);
        setRecentSearches(newSearches);
        
        // Save to localStorage
        try {
          localStorage.setItem('studentProgramSearches', JSON.stringify(newSearches));
        } catch (e) {
          console.error('Error saving to localStorage:', e);
        }
      }
    }
  };
  
  // Handler for selecting a recent search
  const selectRecentSearch = (address: string) => {
    setStudentAddress(address);
    if (isAddress(address)) {
      setIsAddressValid(true);
      setHasSearched(true);
    }
  };
  
  // Get program name if available
  const getProgramName = (id: bigint): string => {
    const idString = id.toString();
    return programNames[idString] || `Program #${idString}`;
  };
  
  // Determine enrollment status
  const getEnrollmentStatus = () => {
    if (!isSuccess || programId === undefined) {
      return { text: 'Unknown', color: 'text-gray-400', bg: 'bg-gray-500/20' };
    }
    
    if (programId > 0n) {
      return { 
        text: 'Enrolled', 
        color: 'text-green-400', 
        bg: 'bg-green-500/20' 
      };
    } else {
      return { 
        text: 'Not Enrolled', 
        color: 'text-red-400', 
        bg: 'bg-red-500/20' 
      };
    }
  };

  // Return everything needed by consuming components
  return {
    programData,
    studentAddress,
    isAddressValid,
    hasSearched,
    recentSearches,
    setStudentAddress,
    searchProgram,
    selectRecentSearch,
    refetch,
    getProgramName,
    getEnrollmentStatus
  };
}

/**
 * StudentProgramLookupProps interface for component props
 */
interface StudentProgramLookupProps {
  contract: any;
  initialAddress?: string; // Optional initial address to check
  onProgramFound?: (programId: bigint, studentAddress: string) => void; // Callback when program is found
  programNames?: Record<string, string>; // Optional mapping of program IDs to names
}

/**
 * StudentProgramLookup Component
 * 
 * This component allows looking up which program a student is enrolled in
 * by querying the studentPrograms mapping in the contract. It provides
 * a user-friendly interface for searching and displaying the results.
 */
const StudentProgramLookup = ({ 
  contract,
  initialAddress = '',
  onProgramFound,
  programNames = {}
}: StudentProgramLookupProps) => {
  // Use the custom hook to get all program lookup functionality
  const {
    programData,
    studentAddress,
    isAddressValid,
    hasSearched,
    recentSearches,
    setStudentAddress,
    searchProgram,
    selectRecentSearch,
    refetch,
    getProgramName,
    getEnrollmentStatus
  } = useStudentProgramLookup(contract, initialAddress, onProgramFound, programNames);
  
  // Extract program data for easier access
  const { programId, isLoading, isSuccess, errorMessage } = programData;
  
  // Get status for display
  const status = getEnrollmentStatus();

  // Handler for address input changes
  const handleAddressInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStudentAddress(e.target.value);
  };

  // Handler for search form submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchProgram();
  };
  
  // Handler for selecting a recent search
  const handleSelectRecentSearch = (address: string) => {
    selectRecentSearch(address);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 space-y-4"
    >
      <h3 className="text-lg font-medium text-blue-400 mb-2">
        Student Program Lookup
      </h3>
      
      {/* Address Search Form */}
      <form onSubmit={handleSearch} className="space-y-3">
        <div className="space-y-2">
          <label htmlFor="student-address" className="block text-sm text-gray-400">
            Student Address:
          </label>
          <div className="flex space-x-2">
            <input
              id="student-address"
              type="text"
              value={studentAddress}
              onChange={handleAddressInput}
              placeholder="0x..."
              className={`flex-1 bg-gray-700/50 border ${
                studentAddress && !isAddressValid
                  ? 'border-red-500/50 focus:border-red-500'
                  : 'border-gray-600 focus:border-blue-500'
              } rounded px-3 py-2 text-sm text-gray-200 focus:outline-none`}
            />
            <button
              type="submit"
              disabled={!isAddressValid || isLoading}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                !isAddressValid || isLoading
                  ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="w-4 h-4 border-2 border-t-white border-white/30 rounded-full animate-spin mr-2"></div>
                  <span>Loading...</span>
                </div>
              ) : (
                'Find Program'
              )}
            </button>
          </div>
          {studentAddress && !isAddressValid && (
            <p className="text-xs text-red-400">Please enter a valid Ethereum address</p>
          )}
        </div>
      </form>
      
      {/* Recent Searches */}
      {recentSearches.length > 0 && !hasSearched && (
        <div className="bg-gray-700/30 rounded-md p-3">
          <p className="text-xs text-gray-400 mb-2">Recent Searches:</p>
          <div className="flex flex-wrap gap-2">
            {recentSearches.map((address, index) => (
              <button
                key={index}
                onClick={() => handleSelectRecentSearch(address)}
                className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 py-1 px-2 rounded-md flex items-center"
              >
                <span className="w-4 h-4 bg-gray-600 rounded-full flex items-center justify-center text-xs mr-1">
                  {index + 1}
                </span>
                {address.substring(0, 6)}...{address.substring(address.length - 4)}
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* Error Display */}
      {hasSearched && !isSuccess && !isLoading && (
        <div className="bg-red-500/20 text-red-400 border border-red-500/30 rounded-md p-3">
          <p className="text-sm">Error checking student program: {errorMessage}</p>
          <button 
            onClick={() => refetch()} 
            className="text-xs mt-2 bg-gray-700 hover:bg-gray-600 text-gray-200 py-1 px-2 rounded"
          >
            Try Again
          </button>
        </div>
      )}
      
      {/* Program Details Display */}
      {hasSearched && isSuccess && programId !== undefined && (
        <div className="space-y-4">
          {/* Enrollment Status Badge */}
          <div className={`inline-flex items-center px-3 py-1 rounded-full ${status.bg} border border-${status.color.replace('text-', '')}/30`}>
            <div className={`w-2 h-2 rounded-full ${status.color.replace('text-', 'bg-')} mr-2`}></div>
            <span className={`text-sm font-medium ${status.color}`}>
              {status.text}
            </span>
          </div>
          
          {/* Program Info Card */}
          <div className="bg-gray-700/30 rounded-lg p-4">
            <div className="flex items-start">
              {/* Program ID Display */}
              <div className="flex-1">
                <div className="flex items-center mb-3">
                  <div className="bg-gray-700/50 rounded-full p-2 mr-3">
                    <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Student Address:</p>
                    <p className="text-sm text-gray-200 font-mono break-all">
                      {studentAddress}
                    </p>
                  </div>
                </div>
                
                <div className="mt-4">
                  {programId > 0n ? (
                    <>
                      <div className="flex items-baseline mb-2">
                        <p className="text-3xl font-bold text-white">#{programId.toString()}</p>
                        <p className="ml-2 text-sm text-green-400">Active Enrollment</p>
                      </div>
                      <p className="text-sm text-gray-300">
                        {getProgramName(programId)}
                      </p>
                      {programNames[programId.toString()] && (
                        <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-md">
                          <p className="text-xs text-gray-400">Program Description:</p>
                          <p className="text-sm text-gray-200 mt-1">
                            This student is enrolled in the {programNames[programId.toString()]} program.
                            They can participate in all related courses and activities.
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-md">
                      <div className="flex items-center mb-2">
                        <svg className="w-5 h-5 text-yellow-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-sm font-medium text-yellow-400">No Program Enrollment</p>
                      </div>
                      <p className="text-xs text-gray-300">
                        This student is not currently enrolled in any program. They may need to register
                        or have their enrollment processed by an administrator.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <button 
              onClick={() => refetch()} 
              className="bg-gray-700 hover:bg-gray-600 text-gray-200 py-2 px-4 rounded flex items-center text-sm"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
            
            {programId > 0n && (
              <button 
                className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded flex items-center text-sm"
                onClick={() => {
                  // This could navigate to program details or perform another action
                  console.log(`View Program #${programId.toString()} Details`);
                }}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                View Program Details
              </button>
            )}
          </div>
          
          {/* Technical Details */}
          <div className="bg-gray-700/10 rounded-md p-3">
            <h5 className="text-sm font-medium text-gray-300 mb-2">Technical Details</h5>
            <div className="grid grid-cols-1 gap-y-2 text-xs">
              <div>
                <span className="text-gray-400">Student Address: </span>
                <span className="text-gray-200 font-mono break-all">{studentAddress}</span>
              </div>
              <div>
                <span className="text-gray-400">Program ID (raw): </span>
                <span className="text-gray-200 font-mono">{programId?.toString() || 'N/A'}</span>
              </div>
              <div>
                <span className="text-gray-400">Enrollment Status: </span>
                <span className={status.color}>{status.text}</span>
              </div>
              <div>
                <span className="text-gray-400">Program Name: </span>
                <span className="text-gray-200">
                  {programId && programId > 0n ? getProgramName(programId) : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Initial State */}
      {!hasSearched && (
        <div className="bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-md p-3">
          <p className="text-sm">
            Enter a student address above to find out which program they are enrolled in.
          </p>
        </div>
      )}
    </motion.div>
  );
};

export default StudentProgramLookup;