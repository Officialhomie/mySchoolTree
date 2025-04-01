import { useState, useEffect } from 'react';
import { useReadContract } from 'wagmi';
import { motion } from 'framer-motion';

/**
 * StudentInfoViewer Component
 * 
 * This component displays information about a student based on their address.
 * It fetches data using the students contract function.
 */
interface StudentInfoViewerProps {
  contract: any;
  studentAddress: `0x${string}`; // Student's wallet address
  refreshInterval?: number; // Optional interval to refresh data in milliseconds
  onDataFetched?: (studentData: StudentData) => void; // Optional callback when data is fetched
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

const StudentInfoViewer = ({ 
  contract,
  studentAddress,
  refreshInterval = 0, // Default: no auto-refresh
  onDataFetched
}: StudentInfoViewerProps) => {
  // State for formatted attendance date
  const [formattedLastAttendance, setFormattedLastAttendance] = useState<string>('');
  const [daysSinceLastAttendance, setDaysSinceLastAttendance] = useState<string>('');
  
  // Fetch student data from contract
  const { 
    data: studentData,
    error,
    isLoading,
    isSuccess,
    refetch
  } = useReadContract({
    ...contract,
    functionName: 'students',
    args: [studentAddress],
  });
  
  // Format the student data
  const student: StudentData | undefined = studentData ? {
    name: (studentData as any)[0],
    isRegistered: (studentData as any)[1],
    currentTerm: Number((studentData as any)[2]),
    attendanceCount: Number((studentData as any)[3]),
    lastAttendanceDate: (studentData as any)[4],
    hasFirstAttendance: (studentData as any)[5],
    programId: Number((studentData as any)[6]),
    totalPayments: (studentData as any)[7]
  } : undefined;
  
  // Callback when data is fetched successfully
  useEffect(() => {
    if (isSuccess && student && onDataFetched) {
      onDataFetched(student);
    }
  }, [isSuccess, student, onDataFetched]);
  
  // Format the last attendance date and calculate days since
  useEffect(() => {
    if (student?.lastAttendanceDate) {
      const updateTimes = () => {
        const attendanceTimestamp = Number(student.lastAttendanceDate) * 1000; // Convert to milliseconds
        const now = Date.now();
        
        // Format the attendance date
        const attendanceDate = new Date(attendanceTimestamp);
        setFormattedLastAttendance(attendanceDate.toLocaleString());
        
        // Calculate days since last attendance
        if (attendanceTimestamp > 0) {
          const diff = now - attendanceTimestamp;
          const days = Math.floor(diff / (1000 * 60 * 60 * 24));
          
          if (days === 0) {
            setDaysSinceLastAttendance('Today');
          } else if (days === 1) {
            setDaysSinceLastAttendance('Yesterday');
          } else {
            setDaysSinceLastAttendance(`${days} days ago`);
          }
        } else {
          setDaysSinceLastAttendance('Never');
        }
      };
      
      // Update immediately
      updateTimes();
      
      // Set up interval to update the time calculation
      const timer = setInterval(updateTimes, 60000); // Update every minute
      
      // Cleanup
      return () => {
        clearInterval(timer);
      };
    } else {
      setFormattedLastAttendance('N/A');
      setDaysSinceLastAttendance('Never');
    }
  }, [student?.lastAttendanceDate]);
  
  // Set up auto-refresh if interval is provided
  useEffect(() => {
    if (refreshInterval > 0) {
      const timer = setInterval(() => {
        refetch();
      }, refreshInterval);
      
      return () => {
        clearInterval(timer);
      };
    }
  }, [refreshInterval, refetch]);
  
  // Determine student status and styling
  const getStudentStatus = () => {
    if (!student) return { text: 'Unknown', color: 'text-gray-400', bg: 'bg-gray-500/20' };
    
    if (!student.isRegistered) {
      return { text: 'Not Registered', color: 'text-red-400', bg: 'bg-red-500/20' };
    }
    
    if (student.hasFirstAttendance && student.attendanceCount > 0) {
      return { text: 'Active', color: 'text-green-400', bg: 'bg-green-500/20' };
    } else {
      return { text: 'Registered', color: 'text-yellow-400', bg: 'bg-yellow-500/20' };
    }
  };

  // Format payment amount from wei to ETH
  const formatPayment = (payment: bigint) => {
    const ethValue = Number(payment) / 1e18;
    return ethValue.toFixed(4);
  };
  
  const status = getStudentStatus();
  
  // Render the component UI
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-gray-800/50 border border-gray-700 rounded-lg p-4"
    >
      <h3 className="text-lg font-medium text-blue-400 mb-3">
        Student Information
      </h3>
      
      {isLoading && (
        <div className="flex items-center justify-center py-4">
          <div className="w-5 h-5 border-2 border-t-blue-400 border-blue-200/30 rounded-full animate-spin mr-2"></div>
          <span className="text-sm text-gray-300">Fetching student data...</span>
        </div>
      )}
      
      {error && (
        <div className="bg-red-500/20 text-red-400 border border-red-500/30 rounded-md p-3">
          <p className="text-sm">Error fetching student data: {(error as Error).message || 'Unknown error'}</p>
          <button 
            onClick={() => refetch()} 
            className="text-xs mt-2 bg-gray-700 hover:bg-gray-600 text-gray-200 py-1 px-2 rounded"
          >
            Try Again
          </button>
        </div>
      )}
      
      {isSuccess && student && (
        <div className="space-y-4">
          {/* Status Badge */}
          <div className={`inline-flex items-center px-3 py-1 rounded-full ${status.bg} border border-${status.color.replace('text-', '')}/30`}>
            <div className={`w-2 h-2 rounded-full ${status.color.replace('text-', 'bg-')} mr-2`}></div>
            <span className={`text-sm font-medium ${status.color}`}>
              {status.text}
            </span>
          </div>
          
          {/* Student Header Info */}
          <div className="bg-gray-700/30 rounded-lg p-4">
            <div className="flex flex-col">
              <h4 className="text-xl font-bold text-white">{student.name || 'Unnamed Student'}</h4>
              <p className="text-sm text-gray-400">Program ID: {student.programId}</p>
              <p className="text-xs text-gray-500 font-mono">{studentAddress}</p>
            </div>
          </div>
          
          {/* Main Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Attendance Info */}
            <div className="bg-gray-700/30 rounded-lg p-4 space-y-3">
              <h4 className="text-sm font-medium text-gray-300">Attendance</h4>
              
              <div className="space-y-1">
                <p className="text-xs text-gray-400">Current Term:</p>
                <p className="text-2xl font-bold text-white">{student.currentTerm}</p>
              </div>
              
              <div className="space-y-1">
                <p className="text-xs text-gray-400">Attendance Count:</p>
                <div className="flex items-baseline">
                  <p className="text-2xl font-bold text-white">{student.attendanceCount}</p>
                  <p className="text-sm text-gray-400 ml-2">classes</p>
                </div>
              </div>
              
              <div className="space-y-1">
                <p className="text-xs text-gray-400">Last Attendance:</p>
                <p className="text-sm font-medium text-white">{formattedLastAttendance}</p>
                <div className="flex items-center">
                  <svg className="w-4 h-4 text-gray-400 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-xs text-gray-300">{daysSinceLastAttendance}</p>
                </div>
              </div>
            </div>
            
            {/* Payment Info */}
            <div className="bg-gray-700/30 rounded-lg p-4 space-y-3">
              <h4 className="text-sm font-medium text-gray-300">Payment</h4>
              
              <div className="space-y-1">
                <p className="text-xs text-gray-400">Total Payments:</p>
                <div className="flex items-baseline">
                  <p className="text-2xl font-bold text-white">{formatPayment(student.totalPayments)}</p>
                  <p className="text-sm text-gray-400 ml-2">ETH</p>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-700">
                <p className="text-xs text-gray-400 mb-1">Registration Status:</p>
                <div className="flex items-center space-x-2">
                  {student.isRegistered ? (
                    <>
                      <div className="w-3 h-3 rounded-full bg-green-400"></div>
                      <p className="text-sm text-green-400">Registered</p>
                    </>
                  ) : (
                    <>
                      <div className="w-3 h-3 rounded-full bg-red-400"></div>
                      <p className="text-sm text-red-400">Not Registered</p>
                    </>
                  )}
                </div>
                <div className="flex items-center space-x-2 mt-2">
                  {student.hasFirstAttendance ? (
                    <>
                      <div className="w-3 h-3 rounded-full bg-green-400"></div>
                      <p className="text-sm text-green-400">First Attendance Recorded</p>
                    </>
                  ) : (
                    <>
                      <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                      <p className="text-sm text-yellow-400">No Attendance Records</p>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* Additional Details */}
          <div className="bg-gray-700/20 rounded-md p-3">
            <h4 className="text-sm font-medium text-gray-300 mb-2">Student Details</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 gap-x-4 text-xs">
              <div>
                <span className="text-gray-400">Status: </span>
                <span className={status.color}>{status.text}</span>
              </div>
              
              <div>
                <span className="text-gray-400">Program ID: </span>
                <span className="text-gray-200">{student.programId}</span>
              </div>
              
              <div>
                <span className="text-gray-400">Current Term: </span>
                <span className="text-gray-200">{student.currentTerm}</span>
              </div>
              
              <div>
                <span className="text-gray-400">Total Payments: </span>
                <span className="text-gray-200">{formatPayment(student.totalPayments)} ETH</span>
              </div>
              
              <div>
                <span className="text-gray-400">Last Attendance: </span>
                <span className="text-gray-200">{formattedLastAttendance}</span>
              </div>
              
              <div>
                <span className="text-gray-400">Last Attendance Timestamp: </span>
                <span className="text-gray-200 font-mono">{student.lastAttendanceDate.toString()}</span>
              </div>
            </div>
            
            <div className="mt-3 pt-2 border-t border-gray-700">
              <button 
                onClick={() => refetch()} 
                className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 py-1 px-3 rounded flex items-center"
              >
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh Data
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default StudentInfoViewer;