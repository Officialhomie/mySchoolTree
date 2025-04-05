import { useState, useEffect, useCallback } from 'react';
import { useReadContract } from 'wagmi';
import { motion } from 'framer-motion';
import { contractStudentManagementConfig } from '../../contracts';

export interface StudentDetails {
  name: string;
  isRegistered: boolean;
  currentTerm: number;
  attendanceCount: number;
  lastAttendanceDate: bigint;
  hasFirstAttendance: boolean;
  programId: number;
  totalPayments: bigint;
  formattedLastAttendance: string;
  formattedTotalPayments: string;
}

export interface StudentDetailsData {
  studentAddress: string;
  details: StudentDetails | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  fetchDetails: (address: string) => Promise<StudentDetails | undefined>;
}

type StudentDetailsViewerProps = {
  defaultAddress?: string;
  onDetailsChange?: (details: StudentDetails | null, address: string) => void;
};

const StudentDetailsViewer = ({ 
  defaultAddress = '',
  onDetailsChange
}: StudentDetailsViewerProps) => {
  // State for student address
  const [studentAddress, setStudentAddress] = useState<string>(defaultAddress);
  const [isValid, setIsValid] = useState<boolean>(false);
  const [showInfo, setShowInfo] = useState<boolean>(false);
  const [fetchStatus, setFetchStatus] = useState<string>('');
  const [showStatus, setShowStatus] = useState<boolean>(false);

  // Contract read hook
  const { 
    data: studentData,
    isError,
    error,
    isLoading,
    refetch
  } = useReadContract({
    address: contractStudentManagementConfig.address as `0x${string}`,
    abi: contractStudentManagementConfig.abi,
    functionName: 'getStudentDetails',
    args: [studentAddress as `0x${string}`],
  });

  // Validate address
  useEffect(() => {
    const validAddress = /^0x[a-fA-F0-9]{40}$/.test(studentAddress);
    setIsValid(validAddress);
  }, [studentAddress]);

  // Format date from Unix timestamp
  const formatDate = (timestamp: bigint): string => {
    if (timestamp === 0n) return 'Never';
    const date = new Date(Number(timestamp) * 1000);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  // Format payment amount from wei
  const formatPayment = (amount: bigint): string => {
    return (Number(amount) / 1e18).toFixed(4) + ' ETH';
  };

  // Process student data
  const processStudentData = useCallback((data: any): StudentDetails | null => {
    if (!data || !Array.isArray(data)) return null;
    
    const [
      name,
      isRegistered,
      currentTerm,
      attendanceCount,
      lastAttendanceDate,
      hasFirstAttendance,
      programId,
      totalPayments
    ] = data;

    return {
      name,
      isRegistered,
      currentTerm: Number(currentTerm),
      attendanceCount: Number(attendanceCount),
      lastAttendanceDate,
      hasFirstAttendance,
      programId: Number(programId),
      totalPayments,
      formattedLastAttendance: formatDate(lastAttendanceDate),
      formattedTotalPayments: formatPayment(totalPayments)
    };
  }, []);

  // Handle fetch student details action
  const handleFetchDetails = async () => {
    if (!isValid) {
      setFetchStatus('Please enter a valid Ethereum address');
      setShowStatus(true);
      return;
    }

    try {
      const result = await refetch();
      if (result.data) {
        setFetchStatus('Student details fetched successfully');
        setShowInfo(true);
        
        // Notify parent component if callback provided
        const processedData = processStudentData(result.data);
        if (onDetailsChange && processedData) {
          onDetailsChange(processedData, studentAddress);
        }
      } else {
        setFetchStatus('Could not retrieve student details');
        setShowInfo(false);
      }
    } catch (err) {
      console.error('Error fetching student details:', err);
      setFetchStatus(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setShowInfo(false);
    }
    
    setShowStatus(true);
  };

  // Hide status message after delay
  useEffect(() => {
    if (showStatus) {
      const timer = setTimeout(() => {
        setShowStatus(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showStatus]);

  // Student details data for display
  const studentDetails = processStudentData(studentData);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-gray-900/90 backdrop-blur-sm border border-gray-700 shadow-xl rounded-lg p-6 max-w-full mx-auto w-full md:max-w-full mb-9"
    >
      <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
        Student Details
      </h2>
      
      <div className="bg-gray-800/80 rounded-lg p-4 border border-gray-700 mb-4">
        <label className="block text-sm text-gray-400 mb-1">Student Address</label>
        <div className="flex space-x-2">
          <input
            type="text"
            value={studentAddress}
            onChange={(e) => setStudentAddress(e.target.value)}
            placeholder="0x..."
            className="flex-1 bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <motion.button
            onClick={handleFetchDetails}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={isLoading || !isValid}
            className="bg-gradient-to-r from-blue-500 to-purple-600 text-white py-2 px-4 rounded-md hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50 transition-colors duration-300 shadow-lg disabled:opacity-50"
          >
            {isLoading ? 'Loading...' : 'View Details'}
          </motion.button>
        </div>
      </div>
      
      {showStatus && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="mb-4"
        >
          <p className={`p-2 rounded-md text-center ${fetchStatus.includes('Error') || fetchStatus.includes('Could not') || fetchStatus.includes('Please enter') ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
            {fetchStatus}
          </p>
        </motion.div>
      )}
      
      {isLoading && (
        <div className="flex justify-center items-center h-40">
          <div className="w-10 h-10 border-4 border-t-blue-400 border-r-purple-500 border-b-blue-400 border-l-purple-500 rounded-full animate-spin"></div>
          <span className="ml-3 text-gray-300">Loading student details...</span>
        </div>
      )}
      
      {isError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-4">
          <div className="text-red-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mb-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <p>Error retrieving student details: {error?.message || 'Unknown error'}</p>
          </div>
        </div>
      )}
      
      {showInfo && studentDetails && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          transition={{ duration: 0.3 }}
        >
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-5 shadow-lg">
            <div className="flex items-center mb-4">
              <div className={`w-3 h-3 rounded-full mr-2 ${studentDetails.isRegistered ? 'bg-green-400' : 'bg-red-400'}`}></div>
              <h3 className="text-xl font-semibold text-blue-400">
                {studentDetails.name || 'Unnamed Student'}
              </h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Registration Status */}
              <div className="bg-gray-800/80 rounded-lg p-3 border border-gray-700">
                <p className="text-xs text-gray-400">Registration Status</p>
                <div className="flex items-center mt-1">
                  {studentDetails.isRegistered ? (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-400 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-green-400 font-medium">Registered</span>
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-400 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      <span className="text-red-400 font-medium">Not Registered</span>
                    </>
                  )}
                </div>
              </div>
              
              {/* Program ID */}
              <div className="bg-gray-800/80 rounded-lg p-3 border border-gray-700">
                <p className="text-xs text-gray-400">Program ID</p>
                <p className="text-gray-200 mt-1 font-medium">
                  {studentDetails.programId > 0 ? `Program #${studentDetails.programId}` : 'No Program Assigned'}
                </p>
              </div>
              
              {/* Current Term */}
              <div className="bg-gray-800/80 rounded-lg p-3 border border-gray-700">
                <p className="text-xs text-gray-400">Current Term</p>
                <p className="text-gray-200 mt-1 font-medium">
                  {studentDetails.currentTerm > 0 ? `Term ${studentDetails.currentTerm}` : 'Not Enrolled'}
                </p>
              </div>
              
              {/* Attendance */}
              <div className="bg-gray-800/80 rounded-lg p-3 border border-gray-700">
                <p className="text-xs text-gray-400">Attendance</p>
                <div className="flex flex-col mt-1">
                  <div className="flex items-center mb-1">
                    <span className="text-gray-200 font-medium mr-2">Count:</span>
                    <span className="text-blue-400">{studentDetails.attendanceCount}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-gray-200 font-medium mr-2">First Attendance:</span>
                    <span className={`${studentDetails.hasFirstAttendance ? 'text-green-400' : 'text-red-400'}`}>
                      {studentDetails.hasFirstAttendance ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Last Attendance */}
              <div className="bg-gray-800/80 rounded-lg p-3 border border-gray-700">
                <p className="text-xs text-gray-400">Last Attendance</p>
                <p className="text-gray-200 mt-1 font-medium">
                  {studentDetails.formattedLastAttendance}
                </p>
              </div>
              
              {/* Total Payments */}
              <div className="bg-gray-800/80 rounded-lg p-3 border border-gray-700">
                <p className="text-xs text-gray-400">Total Payments</p>
                <p className="text-gray-200 mt-1 font-medium">
                  {studentDetails.formattedTotalPayments}
                </p>
              </div>
            </div>
            
            {/* Additional Info */}
            <div className="mt-4 bg-gray-800/30 rounded-lg p-3 border border-gray-700">
              <div className="flex items-center text-xs text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span>Student Address: {studentAddress}</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

// Custom hook to use student details in other components
export const useStudentDetails = (): StudentDetailsData => {
  const [studentAddress, setStudentAddress] = useState<string>('');
  const [details, setDetails] = useState<StudentDetails | null>(null);
  
  const { 
    isError, 
    error, 
    isLoading
  } = useReadContract({
    address: contractStudentManagementConfig.address as `0x${string}`,
    abi: contractStudentManagementConfig.abi,
    functionName: 'getStudentDetails',
    args: [studentAddress as `0x${string}`],
  });

  // Format date from Unix timestamp
  const formatDate = (timestamp: bigint): string => {
    if (timestamp === 0n) return 'Never';
    const date = new Date(Number(timestamp) * 1000);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  // Format payment amount from wei
  const formatPayment = (amount: bigint): string => {
    return (Number(amount) / 1e18).toFixed(4) + ' ETH';
  };

  // Process student data
  const processStudentData = (data: any): StudentDetails | null => {
    if (!data || !Array.isArray(data)) return null;
    
    const [
      name,
      isRegistered,
      currentTerm,
      attendanceCount,
      lastAttendanceDate,
      hasFirstAttendance,
      programId,
      totalPayments
    ] = data;

    return {
      name,
      isRegistered,
      currentTerm: Number(currentTerm),
      attendanceCount: Number(attendanceCount),
      lastAttendanceDate,
      hasFirstAttendance,
      programId: Number(programId),
      totalPayments,
      formattedLastAttendance: formatDate(lastAttendanceDate),
      formattedTotalPayments: formatPayment(totalPayments)
    };
  };

  // Fetch student details function
  const fetchDetails = async (address: string): Promise<StudentDetails | undefined> => {
    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return undefined;
    }
    
    try {
      setStudentAddress(address);
      
      const result = await useReadContract({
        address: contractStudentManagementConfig.address as `0x${string}`,
        abi: contractStudentManagementConfig.abi,
        functionName: 'getStudentDetails',
        args: [address as `0x${string}`]
      }).refetch();
      
      if (result.data) {
        const studentDetails = processStudentData(result.data);
        setDetails(studentDetails);
        return studentDetails || undefined;
      }
      return undefined;
    } catch (err) {
      console.error('Error fetching student details:', err);
      return undefined;
    }
  };

  return {
    studentAddress,
    details,
    isLoading,
    isError,
    error: error as Error | null,
    fetchDetails
  };
};

export default StudentDetailsViewer;