import { useState, useEffect } from 'react';
import { useReadContract, useAccount } from 'wagmi';
import { motion } from 'framer-motion';
import { formatEther, isAddress } from 'viem';

/**
 * StudentDetailsViewer Component
 * 
 * This component fetches and displays detailed information about a student
 * from the blockchain, including registration status, attendance, program info,
 * and payment history.
 */
interface StudentDetailsViewerProps {
  contract: any;
  initialAddress?: string; // Optional initial address to check
  onStudentDataFetched?: (studentData: StudentData) => void; // Callback for when data is fetched
}

interface StudentData {
  name: string;
  isRegistered: boolean;
  currentTerm: number;
  attendanceCount: number;
  lastAttendanceDate: bigint;
  hasFirstAttendance: boolean;
  programId: number;
  totalPayments: bigint;
}

// Type for the raw contract return data
type StudentDataTuple = [
  string,      // name
  boolean,     // isRegistered
  number,      // currentTerm
  number,      // attendanceCount
  bigint,      // lastAttendanceDate
  boolean,     // hasFirstAttendance
  number,      // programId
  bigint       // totalPayments
];

// Helper function to safely convert contract data to StudentData
const convertToStudentData = (data: unknown): StudentData => {
  const typedData = data as unknown as StudentDataTuple;
  
  return {
    name: typedData[0] ?? '',
    isRegistered: typedData[1] ?? false,
    currentTerm: Number(typedData[2] ?? 0),
    attendanceCount: Number(typedData[3] ?? 0),
    lastAttendanceDate: typedData[4] ?? 0n,
    hasFirstAttendance: typedData[5] ?? false,
    programId: Number(typedData[6] ?? 0),
    totalPayments: typedData[7] ?? 0n
  };
};

// Helper function to format date from timestamp
const formatTimestamp = (timestamp: bigint): string => {
  if (timestamp <= 0n) return 'Never';
  
  try {
    const date = new Date(Number(timestamp) * 1000);
    return date.toLocaleString();
  } catch (e) {
    console.error('Error formatting timestamp:', e);
    return 'Invalid date';
  }
};

// Helper function to calculate attendance rate
const calculateAttendanceRate = (currentTerm: number, attendanceCount: number): string => {
  if (currentTerm <= 0 || attendanceCount <= 0) return 'N/A';
  
  // Assuming 12 weeks per term with 1 class per week (adjust as needed)
  const expectedAttendance = Math.min(currentTerm * 12, 12);
  const rate = (attendanceCount / expectedAttendance) * 100;
  return `${rate.toFixed(1)}%`;
};

const StudentDetailsViewer = ({ 
  contract,
  initialAddress = '',
  onStudentDataFetched
}: StudentDetailsViewerProps) => {
  // Get current connected wallet address if no initial address provided
  const { address: connectedAddress } = useAccount();
  
  // State for address input
  const [studentAddress, setStudentAddress] = useState<string>(initialAddress || connectedAddress || '');
  const [isAddressValid, setIsAddressValid] = useState<boolean>(
    initialAddress ? isAddress(initialAddress) : connectedAddress ? isAddress(connectedAddress as string) : false
  );
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  
  // State for formatted data
  const [formattedData, setFormattedData] = useState<{
    lastAttendance: string;
    totalPaymentsFormatted: string;
    attendanceRate: string;
  }>({
    lastAttendance: '',
    totalPaymentsFormatted: '',
    attendanceRate: ''
  });

  // Fetch student data from contract
  const { 
    data: studentDataRaw,
    error,
    isLoading,
    isSuccess,
    refetch
  } = useReadContract({
    ...contract,
    functionName: 'getStudentDetails',
    args: [studentAddress],
    enabled: hasSearched && isAddressValid, // Only run when address is valid and search is triggered
  });
  
  // Convert raw data to typed studentData if available
  const studentData = studentDataRaw ? convertToStudentData(studentDataRaw) : null;
  
  // Safely extract error message
  const errorMessage = error instanceof Error ? error.message : 
                       error ? String(error) : 'Unknown error';
  
  // Update address validation when input changes
  useEffect(() => {
    const valid = studentAddress ? isAddress(studentAddress) : false;
    setIsAddressValid(valid);
  }, [studentAddress]);
  
  // Process and format the student data
  useEffect(() => {
    if (isSuccess && studentData) {
      // Format the last attendance date
      const lastAttendance = formatTimestamp(studentData.lastAttendanceDate);
      
      // Format the total payments
      const totalPaymentsFormatted = formatEther(studentData.totalPayments);
      
      // Calculate attendance rate
      const attendanceRate = calculateAttendanceRate(
        studentData.currentTerm, 
        studentData.attendanceCount
      );
      
      // Set formatted data
      setFormattedData({
        lastAttendance,
        totalPaymentsFormatted,
        attendanceRate
      });
      
      // Call callback with student data if provided
      if (onStudentDataFetched) {
        onStudentDataFetched(studentData);
      }
    }
  }, [studentData, isSuccess, onStudentDataFetched]);

  // Handler for address input
  const handleAddressInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStudentAddress(e.target.value);
  };

  // Handler for search button
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (isAddressValid) {
      setHasSearched(true);
    }
  };
  
  // Get the registration status details for display
  const getRegistrationStatus = () => {
    if (!isSuccess || !studentData) {
      return { text: 'Unknown', color: 'text-gray-400', bg: 'bg-gray-500/20' };
    }
    
    if (studentData.isRegistered) {
      return { text: 'Registered', color: 'text-green-400', bg: 'bg-green-500/20' };
    } else {
      return { text: 'Not Registered', color: 'text-red-400', bg: 'bg-red-500/20' };
    }
  };
  
  const status = getRegistrationStatus();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 space-y-4"
    >
      <h3 className="text-lg font-medium text-blue-400 mb-2">
        Student Details Viewer
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
                'View Details'
              )}
            </button>
          </div>
          {studentAddress && !isAddressValid && (
            <p className="text-xs text-red-400">Please enter a valid Ethereum address</p>
          )}
        </div>
      </form>
      
      {/* Error Display */}
      {hasSearched && error && (
        <div className="bg-red-500/20 text-red-400 border border-red-500/30 rounded-md p-3">
          <p className="text-sm">Error fetching student data: {errorMessage}</p>
          <button 
            onClick={() => refetch()} 
            className="text-xs mt-2 bg-gray-700 hover:bg-gray-600 text-gray-200 py-1 px-2 rounded"
          >
            Try Again
          </button>
        </div>
      )}
      
      {/* Student Details Display */}
      {hasSearched && isSuccess && studentData && (
        <div className="space-y-4">
          {/* Registration Status Badge */}
          <div className={`inline-flex items-center px-3 py-1 rounded-full ${status.bg} border border-${status.color.replace('text-', '')}/30`}>
            <div className={`w-2 h-2 rounded-full ${status.color.replace('text-', 'bg-')} mr-2`}></div>
            <span className={`text-sm font-medium ${status.color}`}>
              {status.text}
            </span>
          </div>
          
          {/* Student Basic Info Card */}
          <div className="bg-gray-700/30 rounded-lg p-4">
            <div className="flex items-start">
              {/* Avatar Placeholder */}
              <div className="w-12 h-12 bg-gray-600 rounded-full flex items-center justify-center text-gray-300 mr-3">
                {studentData.name ? 
                  studentData.name.substring(0, 2).toUpperCase() : 'ST'}
              </div>
              
              {/* Student Info */}
              <div className="flex-1">
                <h4 className="text-lg font-medium text-gray-200">
                  {studentData.name ? studentData.name : 'Unnamed Student'}
                </h4>
                <p className="text-sm text-gray-400 mt-1">
                  Program #{studentData.programId.toString()}
                  {studentData.currentTerm > 0 && 
                   ` • Term ${studentData.currentTerm.toString()}`}
                </p>
                <div className="flex items-center mt-2">
                  <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">
                    {studentAddress.substring(0, 6)}...{studentAddress.substring(38)}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Detailed Information Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Attendance Card */}
            <div className="bg-gray-700/20 rounded-md p-3 space-y-3">
              <h5 className="text-sm font-medium text-gray-300">Attendance</h5>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-gray-400">Attendance Count:</p>
                  <p className="text-lg font-medium text-white">
                    {studentData.attendanceCount.toString()}
                  </p>
                </div>
                
                <div>
                  <p className="text-xs text-gray-400">Attendance Rate:</p>
                  <p className="text-lg font-medium text-white">
                    {formattedData.attendanceRate}
                  </p>
                </div>
                
                <div className="col-span-2">
                  <p className="text-xs text-gray-400">Last Attendance:</p>
                  <p className="text-sm text-white">
                    {formattedData.lastAttendance}
                  </p>
                </div>
              </div>
              
              {studentData.isRegistered && !studentData.hasFirstAttendance && (
                <div className="bg-yellow-500/20 text-yellow-400 rounded p-2 text-xs">
                  Student has not recorded first attendance
                </div>
              )}
            </div>
            
            {/* Program & Payment Card */}
            <div className="bg-gray-700/20 rounded-md p-3 space-y-3">
              <h5 className="text-sm font-medium text-gray-300">Program & Payments</h5>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-gray-400">Program ID:</p>
                  <p className="text-lg font-medium text-white">
                    #{studentData.programId.toString()}
                  </p>
                </div>
                
                <div>
                  <p className="text-xs text-gray-400">Current Term:</p>
                  <p className="text-lg font-medium text-white">
                    {studentData.currentTerm > 0 ? 
                     studentData.currentTerm.toString() : 'N/A'}
                  </p>
                </div>
                
                <div className="col-span-2">
                  <p className="text-xs text-gray-400">Total Payments:</p>
                  <div className="flex items-baseline">
                    <p className="text-lg font-medium text-white">{formattedData.totalPaymentsFormatted}</p>
                    <p className="ml-1 text-xs text-gray-400">ETH</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Raw Data & Actions */}
          <div className="bg-gray-700/10 rounded-md p-3">
            <div className="flex justify-between items-center mb-2">
              <h5 className="text-sm font-medium text-gray-300">Raw Data</h5>
              <button 
                onClick={() => refetch()} 
                className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 py-1 px-2 rounded flex items-center"
              >
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-xs">
              <div>
                <span className="text-gray-400">Name: </span>
                <span className="text-gray-200 font-mono">{studentData.name}</span>
              </div>
              
              <div>
                <span className="text-gray-400">Is Registered: </span>
                <span className="text-gray-200 font-mono">
                  {studentData.isRegistered ? 'true' : 'false'}
                </span>
              </div>
              
              <div>
                <span className="text-gray-400">Current Term: </span>
                <span className="text-gray-200 font-mono">
                  {studentData.currentTerm.toString()}
                </span>
              </div>
              
              <div>
                <span className="text-gray-400">Attendance Count: </span>
                <span className="text-gray-200 font-mono">
                  {studentData.attendanceCount.toString()}
                </span>
              </div>
              
              <div>
                <span className="text-gray-400">Last Attendance Timestamp: </span>
                <span className="text-gray-200 font-mono">
                  {studentData.lastAttendanceDate.toString()}
                </span>
              </div>
              
              <div>
                <span className="text-gray-400">Has First Attendance: </span>
                <span className="text-gray-200 font-mono">
                  {studentData.hasFirstAttendance ? 'true' : 'false'}
                </span>
              </div>
              
              <div>
                <span className="text-gray-400">Program ID: </span>
                <span className="text-gray-200 font-mono">
                  {studentData.programId.toString()}
                </span>
              </div>
              
              <div>
                <span className="text-gray-400">Total Payments (Wei): </span>
                <span className="text-gray-200 font-mono">
                  {studentData.totalPayments.toString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* No Data Message */}
      {hasSearched && isSuccess && (!studentData || studentData.name === '') && (
        <div className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded-md p-4 text-center">
          <svg className="w-12 h-12 mx-auto mb-2 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-sm font-medium">No student found at this address</p>
          <p className="text-xs mt-1">This address is not registered as a student in the system.</p>
        </div>
      )}
      
      {/* Initial State */}
      {!hasSearched && (
        <div className="bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-md p-3">
          <p className="text-sm">
            Enter a student address above to view their details.
          </p>
        </div>
      )}
    </motion.div>
  );
};

export default StudentDetailsViewer;