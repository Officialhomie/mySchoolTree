import { useState, useEffect } from 'react';
import { useReadContract } from 'wagmi';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';

/**
 * SchoolStudentCountViewer Component
 * 
 * This component displays the number of students at a school.
 * It uses the schoolStudentCount contract function to fetch data.
 */
interface SchoolStudentCountViewerProps {
  contract: any;
  schoolAddress?: string; // Optional pre-filled school address
  refreshInterval?: number; // Optional interval to refresh data in milliseconds
  onDataFetched?: (studentCount: bigint, schoolAddress: string) => void; // Optional callback when data is fetched
}

const SchoolStudentCountViewer = ({
  contract,
  schoolAddress = '',
  refreshInterval = 0,
  onDataFetched
}: SchoolStudentCountViewerProps) => {
  // Form state
  const [address, setAddress] = useState<string>(schoolAddress);
  const [validationError, setValidationError] = useState<string>('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Fetch student count data from contract
  const {
    data: studentCountData,
    error: studentCountError,
    isLoading: isLoadingStudentCount,
    isSuccess: isStudentCountSuccess,
    refetch: refetchStudentCount
  } = useReadContract({
    ...contract,
    functionName: 'schoolStudentCount',
    args: address ? [address as `0x${string}`] : undefined,
    query: {
      enabled: !!address
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
      setValidationError('School address is required');
      return false;
    }
    
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      setValidationError('Invalid Ethereum address format');
      return false;
    }
    
    setValidationError('');
    return true;
  };

  // Handle address change
  const handleAddressChange = (value: string) => {
    setAddress(value);
    setValidationError('');
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateAddress(address)) {
      refetchStudentCount();
    }
  };

  // Callback when data is fetched
  useEffect(() => {
    if (isStudentCountSuccess && studentCountData !== undefined) {
      setLastUpdated(new Date());
      
      if (onDataFetched) {
        onDataFetched(studentCountData as bigint, address);
      }
    }
  }, [isStudentCountSuccess, studentCountData, address, onDataFetched]);

  // Set up auto-refresh if interval is provided
  useEffect(() => {
    if (refreshInterval > 0 && address) {
      const timer = setInterval(() => {
        refetchStudentCount();
      }, refreshInterval);
      
      return () => {
        clearInterval(timer);
      };
    }
  }, [refreshInterval, address, refetchStudentCount]);

  // Get student count category and styling
  const getStudentCountCategory = () => {
    if (studentCountData === undefined) {
      return { text: 'No Data', color: 'text-gray-400', bg: 'bg-gray-500/20' };
    }
    
    const count = Number(studentCountData);
    
    if (count === 0) {
      return { text: 'No Students', color: 'text-red-400', bg: 'bg-red-500/20' };
    } else if (count < 10) {
      return { text: 'Small School', color: 'text-yellow-400', bg: 'bg-yellow-500/20' };
    } else if (count < 50) {
      return { text: 'Medium School', color: 'text-blue-400', bg: 'bg-blue-500/20' };
    } else {
      return { text: 'Large School', color: 'text-green-400', bg: 'bg-green-500/20' };
    }
  };

  const category = getStudentCountCategory();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-gray-800/50 border border-gray-700 rounded-lg p-4"
    >
      <h3 className="text-lg font-medium text-blue-400 mb-3">
        School Student Count
      </h3>
      
      {/* Query Form */}
      <form onSubmit={handleSubmit} className="space-y-4 mb-4">
        <div className="bg-gray-700/30 rounded-lg p-4 space-y-4">
          {/* School Address Input */}
          <div className="space-y-2">
            <label htmlFor="school-address" className="block text-sm font-medium text-gray-300">
              School Address
            </label>
            <input
              id="school-address"
              type="text"
              value={address}
              onChange={(e) => handleAddressChange(e.target.value)}
              placeholder="0x..."
              className={`w-full px-3 py-2 bg-gray-700 border ${
                validationError ? 'border-red-500' : 'border-gray-600'
              } rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
            />
            <p className="text-xs text-gray-400">Enter the school's Ethereum wallet address</p>
          </div>
          
          {/* Error Display */}
          {validationError && (
            <div className="text-xs text-red-400 mt-1">{validationError}</div>
          )}
          
          {/* Test Address Buttons */}
          <div className="flex flex-wrap gap-2 mt-2">
            <button
              type="button"
              onClick={() => handleAddressChange("0xdD2FD4581271e230360230F9337D5c0430Bf44C0")}
              className="text-xs bg-gray-600 hover:bg-gray-500 text-gray-200 py-1 px-2 rounded"
            >
              Test School 1
            </button>
            <button
              type="button"
              onClick={() => handleAddressChange("0x5FbDB2315678afecb367f032d93F642f64180aa3")}
              className="text-xs bg-gray-600 hover:bg-gray-500 text-gray-200 py-1 px-2 rounded"
            >
              Test School 2
            </button>
          </div>
          
          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoadingStudentCount}
            >
              {isLoadingStudentCount ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Loading...
                </span>
              ) : (
                'View Student Count'
              )}
            </button>
          </div>
        </div>
      </form>
      
      {/* Results Display */}
      {studentCountError ? (
        <div className="bg-red-500/20 text-red-400 border border-red-500/30 rounded-md p-3 mb-4">
          <p className="text-sm">Error fetching student count: {(studentCountError as Error).message || 'Unknown error'}</p>
          <button 
            onClick={() => refetchStudentCount()} 
            className="text-xs mt-2 bg-gray-700 hover:bg-gray-600 text-gray-200 py-1 px-2 rounded"
          >
            Try Again
          </button>
        </div>
      ) : isStudentCountSuccess && studentCountData !== undefined ? (
        <div className="space-y-4">
          {/* Status Badge */}
          <div className={`inline-flex items-center px-3 py-1 rounded-full ${category.bg} border border-${category.color.replace('text-', '')}/30`}>
            <div className={`w-2 h-2 rounded-full ${category.color.replace('text-', 'bg-')} mr-2`}></div>
            <span className={`text-sm font-medium ${category.color}`}>
              {category.text}
            </span>
          </div>
          
          {/* Main Info Card */}
          <div className="bg-gray-700/30 rounded-lg p-4">
            <div className="grid grid-cols-1 gap-6">
              {/* Student Count Information */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-300">Student Count Information</h4>
                <div className="bg-gray-700/40 rounded-md p-3 border border-gray-600">
                  <div className="flex flex-col items-center justify-center p-4">
                    <div className="text-5xl font-bold text-white mb-2">
                      {studentCountData ? studentCountData.toString() : '0'}
                    </div>
                    <p className="text-lg text-gray-300">
                      {Number(studentCountData) === 1 ? 'Student' : 'Students'}
                    </p>
                    
                    {/* Student Count Visual Indicator */}
                    <div className="w-full mt-4">
                      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div 
                          className={getStudentCountBarColor(Number(studentCountData))}
                          style={{ width: `${getStudentCountPercentage(Number(studentCountData))}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-400 mt-1 text-center">
                        {getStudentCountDescription(Number(studentCountData))}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Additional Details */}
          <div className="bg-gray-700/20 rounded-md p-3 text-xs">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2">
              <div>
                <span className="text-gray-400">School Address: </span>
                <span className="text-gray-200 font-mono">{formatAddress(address)}</span>
              </div>
              
              <div className="flex items-center space-x-3">
                <button 
                  onClick={() => refetchStudentCount()} 
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

// Helper functions for student count visualization
function getStudentCountBarColor(count: number): string {
  if (count === 0) return 'bg-red-500';
  if (count < 10) return 'bg-yellow-500';
  if (count < 50) return 'bg-blue-500';
  return 'bg-green-500';
}

function getStudentCountPercentage(count: number): number {
  if (count === 0) return 0;
  if (count < 10) return Math.min(count * 10, 100);
  if (count < 50) return Math.min(count * 2, 100);
  return 100;
}

function getStudentCountDescription(count: number): string {
  if (count === 0) return 'No students enrolled';
  if (count < 10) return 'Small student population';
  if (count < 50) return 'Medium-sized student population';
  if (count < 100) return 'Large student population';
  return 'Very large student population';
}

export default SchoolStudentCountViewer;