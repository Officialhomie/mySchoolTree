import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { motion, AnimatePresence } from 'framer-motion';
import { isAddress } from 'viem';

// Import the original components
import StudentProgramLookup, { useStudentProgramLookup } from '../MSTReadfunction/SMRead/StudentProgramLookup';
import StudentDetailsViewer, { useStudentDetails, StudentDetails } from '../MSTReadfunction/SMRead/StudentDetailsLookup';

// Define the combined data type
interface StudentData {
  address: string;
  programId?: bigint;
  details?: StudentDetails;
  isLoading: boolean;
  isAddressValid: boolean;
}

// Define the program names mapping
const PROGRAM_NAMES: Record<string, { name: string, description: string }> = {
  "1": { 
    name: "Computer Science",
    description: "Full-stack development, algorithms, and computer architecture."
  },
  "2": { 
    name: "Data Science",
    description: "Statistics, machine learning, and data visualization."
  },
  "3": { 
    name: "Blockchain Development",
    description: "Smart contracts, decentralized applications, and blockchain theory."
  },
  "4": { 
    name: "Digital Marketing",
    description: "SEO, content marketing, and social media strategy."
  },
  "5": { 
    name: "UX/UI Design",
    description: "User experience, interface design, and prototyping."
  }
};

const StudentManagementDashboard = () => {
  // Get connected wallet address
  const { address: connectedAddress } = useAccount();
  
  // Dashboard state
  const [activeTab, setActiveTab] = useState<'lookup' | 'details' | 'summary'>('summary');
  const [studentData, setStudentData] = useState<StudentData>({
    address: connectedAddress as string || '',
    isLoading: false,
    isAddressValid: false
  });
  const [recentStudents, setRecentStudents] = useState<{address: string, name?: string}[]>([]);
  const [showToast, setShowToast] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' as 'success' | 'error' | 'info' | 'warning' });
  
  // Custom hooks from original components
  const studentProgramLookup = useStudentProgramLookup(studentData.address);
  const studentDetails = useStudentDetails();

  // Initialize from connected wallet or localStorage
  useEffect(() => {
    if (connectedAddress && isAddress(connectedAddress)) {
      setStudentData(prev => ({
        ...prev,
        address: connectedAddress,
        isAddressValid: true
      }));
    }
    
    // Load recent students from localStorage
    try {
      const saved = localStorage.getItem('recentStudents');
      if (saved) {
        setRecentStudents(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Error loading recent students:', e);
    }
  }, [connectedAddress]);

  // Show toast message
  const showMessage = useCallback((message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    setToast({ message, type });
    setShowToast(true);
    setTimeout(() => setShowToast(false), 5000);
  }, []);

  // Handle address change
  const handleAddressChange = useCallback((address: string) => {
    setStudentData(prev => ({
      ...prev,
      address,
      isAddressValid: isAddress(address),
      programId: undefined,
      details: undefined
    }));
  }, []);

  // Handle lookup student
  const handleLookupStudent = useCallback(async () => {
    if (!studentData.isAddressValid) {
      showMessage('Please enter a valid Ethereum address', 'error');
      return;
    }
    
    setStudentData(prev => ({ ...prev, isLoading: true }));
    
    try {
      // Lookup program
      studentProgramLookup.searchProgram();
      
      // Fetch details
      const details = await studentDetails.fetchDetails(studentData.address);
      
      // Update student data
      setStudentData(prev => ({
        ...prev,
        programId: studentProgramLookup.programData.programId,
        details,
        isLoading: false
      }));
      
      // Add to recent students if not already present
      if (details) {
        const newStudent = { 
          address: studentData.address,
          name: details.name || undefined
        };
        
        setRecentStudents(prev => {
          // Remove if exists
          const filtered = prev.filter(s => s.address !== studentData.address);
          // Add to front
          const updated = [newStudent, ...filtered].slice(0, 5);
          
          // Save to localStorage
          try {
            localStorage.setItem('recentStudents', JSON.stringify(updated));
          } catch (e) {
            console.error('Error saving recent students:', e);
          }
          
          return updated;
        });
      }
      
      showMessage('Student information loaded successfully', 'success');
    } catch (e) {
      console.error('Error looking up student:', e);
      showMessage('Error looking up student information', 'error');
      setStudentData(prev => ({ ...prev, isLoading: false }));
    }
  }, [studentData.isAddressValid, studentData.address, studentProgramLookup, studentDetails, showMessage]);

  // Handle tab change
  const handleTabChange = (tab: 'lookup' | 'details' | 'summary') => {
    setActiveTab(tab);
  };

  // Handle select recent student
  const handleSelectRecentStudent = (address: string) => {
    handleAddressChange(address);
    // Automatically fetch data for the selected student
    setTimeout(() => {
      handleLookupStudent();
    }, 100);
  };

  // Render program status badge
  const renderProgramStatus = () => {
    if (!studentData.programId) return null;
    
    const programId = studentData.programId;
    const idString = programId.toString();
    const programInfo = PROGRAM_NAMES[idString];
    const isEnrolled = programId > 0n;
    
    return (
      <div className={`inline-flex items-center px-3 py-1 rounded-full ${
        isEnrolled ? 'bg-green-500/20 border-green-400/30' : 'bg-red-500/20 border-red-400/30'
      } border`}>
        <div className={`w-2 h-2 rounded-full ${
          isEnrolled ? 'bg-green-400' : 'bg-red-400'
        } mr-2`}></div>
        <span className={`text-sm font-medium ${
          isEnrolled ? 'text-green-400' : 'text-red-400'
        }`}>
          {isEnrolled ? `Enrolled in ${programInfo?.name || `Program #${idString}`}` : 'Not Enrolled'}
        </span>
      </div>
    );
  };

  // Render registration status badge
  const renderRegistrationStatus = () => {
    if (!studentData.details) return null;
    
    const { isRegistered } = studentData.details;
    
    return (
      <div className={`inline-flex items-center px-3 py-1 rounded-full ${
        isRegistered ? 'bg-green-500/20 border-green-400/30' : 'bg-red-500/20 border-red-400/30'
      } border`}>
        <div className={`w-2 h-2 rounded-full ${
          isRegistered ? 'bg-green-400' : 'bg-red-400'
        } mr-2`}></div>
        <span className={`text-sm font-medium ${
          isRegistered ? 'text-green-400' : 'text-red-400'
        }`}>
          {isRegistered ? 'Registered' : 'Not Registered'}
        </span>
      </div>
    );
  };

  // Render student metrics
  const renderStudentMetrics = () => {
    if (!studentData.details) return null;
    
    const { attendanceCount, currentTerm, formattedTotalPayments, hasFirstAttendance } = studentData.details;
    
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
          <div className="text-sm text-gray-400 mb-1">Current Term</div>
          <div className="text-2xl font-bold text-blue-400">{currentTerm || 'N/A'}</div>
        </div>
        
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
          <div className="text-sm text-gray-400 mb-1">Attendance</div>
          <div className="text-2xl font-bold text-blue-400">{attendanceCount}</div>
        </div>
        
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
          <div className="text-sm text-gray-400 mb-1">First Attendance</div>
          <div className={`text-lg font-bold ${hasFirstAttendance ? 'text-green-400' : 'text-red-400'}`}>
            {hasFirstAttendance ? 'Completed' : 'Missing'}
          </div>
        </div>
        
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
          <div className="text-sm text-gray-400 mb-1">Total Payments</div>
          <div className="text-2xl font-bold text-purple-400">{formattedTotalPayments}</div>
        </div>
      </div>
    );
  };

  // Render student summary 
  const renderStudentSummary = () => {
    if (!studentData.details) {
      return (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 text-center">
          <p className="text-blue-400">Enter a student address and click "Look Up Student" to view their information.</p>
        </div>
      );
    }
    
    const { name, programId, formattedLastAttendance } = studentData.details;
    const programIdString = programId?.toString() || '';
    const programInfo = PROGRAM_NAMES[programIdString];
    
    return (
      <div className="bg-gray-800/30 border border-gray-700 rounded-lg p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
          <div>
            <h3 className="text-2xl font-bold text-white mb-2">{name || 'Unnamed Student'}</h3>
            <p className="text-gray-400 text-sm font-mono">{studentData.address}</p>
          </div>
          
          <div className="mt-4 md:mt-0 space-x-2 flex">
            {renderRegistrationStatus()}
            {renderProgramStatus()}
          </div>
        </div>
        
        {renderStudentMetrics()}
        
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
            <h4 className="text-lg font-medium text-blue-400 mb-3">Program Information</h4>
            
            {programId && programId > 0 ? (
              <>
                <p className="text-xl font-bold text-white mb-2">{programInfo?.name || `Program #${programIdString}`}</p>
                {programInfo && (
                  <p className="text-gray-300 text-sm">{programInfo.description}</p>
                )}
                <div className="mt-4 pt-4 border-t border-gray-700">
                  <p className="text-gray-400 text-sm">Last Attendance: <span className="text-gray-300">{formattedLastAttendance}</span></p>
                </div>
              </>
            ) : (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-md p-3">
                <p className="text-yellow-400 text-sm">This student is not enrolled in any program.</p>
              </div>
            )}
          </div>
          
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
            <h4 className="text-lg font-medium text-blue-400 mb-3">Actions</h4>
            
            <div className="space-y-3">
              <button
                onClick={() => handleTabChange('details')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition-colors flex items-center justify-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 2a8 8 0 100 16 8 8 0 000-16zm0 1a7 7 0 100 14 7 7 0 000-14zm0 9a1 1 0 110 2 1 1 0 010-2zm0-6a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 1113 7a1 1 0 01-2 0 1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                View Detailed Information
              </button>
              
              <button
                onClick={() => handleTabChange('lookup')}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-md transition-colors flex items-center justify-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 100-12 6 6 0 000 12z" clipRule="evenodd" />
                </svg>
                Look Up Program
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-purple-500 to-indigo-400 bg-clip-text text-transparent mb-4 md:mb-0">
              Student Management
            </h1>
            
            <div className="flex space-x-3">
              <button
                onClick={() => handleTabChange('summary')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'summary' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                Summary
              </button>
              
              <button
                onClick={() => handleTabChange('details')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'details' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                Student Details
              </button>
              
              <button
                onClick={() => handleTabChange('lookup')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'lookup' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                Program Lookup
              </button>
            </div>
          </div>
        </header>
        
        {/* Student Search Form */}
        <div className="bg-gray-900/90 backdrop-blur-sm border border-gray-700 rounded-lg p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-end space-y-4 md:space-y-0 md:space-x-4">
            <div className="flex-grow">
              <label htmlFor="student-address" className="block text-sm text-gray-400 mb-1">
                Student Address:
              </label>
              <input
                id="student-address"
                type="text"
                value={studentData.address}
                onChange={(e) => handleAddressChange(e.target.value)}
                placeholder="0x..."
                className={`w-full bg-gray-800 border ${
                  studentData.address && !studentData.isAddressValid
                    ? 'border-red-500/50 focus:border-red-500'
                    : 'border-gray-700 focus:border-blue-500'
                } rounded-md px-4 py-2 text-gray-200 focus:outline-none`}
              />
              {studentData.address && !studentData.isAddressValid && (
                <p className="text-xs text-red-400 mt-1">Please enter a valid Ethereum address</p>
              )}
            </div>
            
            <button
              onClick={handleLookupStudent}
              disabled={!studentData.isAddressValid || studentData.isLoading}
              className={`px-6 py-2 rounded-md text-white font-medium ${
                !studentData.isAddressValid || studentData.isLoading
                  ? 'bg-gray-700 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700'
              } transition-colors flex items-center justify-center md:w-auto w-full`}
            >
              {studentData.isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin mr-2"></div>
                  Loading...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                  </svg>
                  Look Up Student
                </>
              )}
            </button>
          </div>
          
          {/* Recent Students */}
          {recentStudents.length > 0 && (
            <div className="mt-4">
              <p className="text-xs text-gray-400 mb-2">Recent Students:</p>
              <div className="flex flex-wrap gap-2">
                {recentStudents.map((student, index) => (
                  <button
                    key={index}
                    onClick={() => handleSelectRecentStudent(student.address)}
                    className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 py-1 px-3 rounded-md flex items-center"
                  >
                    {student.name ? (
                      <span className="mr-2">{student.name}</span>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                      </svg>
                    )}
                    <span className="font-mono">
                      {student.address.substring(0, 6)}...{student.address.substring(student.address.length - 4)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Main Content */}
        <main>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              {activeTab === 'summary' && renderStudentSummary()}
              
              {activeTab === 'lookup' && (
                <StudentProgramLookup 
                  initialAddress={studentData.address}
                  onProgramFound={(programId) => {
                    setStudentData(prev => ({ ...prev, programId }));
                    showMessage(`Found program #${programId.toString()} for student`, 'success');
                  }}
                  programNames={Object.fromEntries(
                    Object.entries(PROGRAM_NAMES).map(([key, { name }]) => [key, name])
                  )}
                />
              )}
              
              {activeTab === 'details' && (
                <StudentDetailsViewer
                  defaultAddress={studentData.address}
                  onDetailsChange={(details) => {
                    if (details) {
                      setStudentData(prev => ({ ...prev, details }));
                      showMessage(`Loaded details for ${details.name || 'student'}`, 'success');
                    }
                  }}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
        
        {/* Toast Notification */}
        <AnimatePresence>
          {showToast && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className={`fixed bottom-6 right-6 px-4 py-3 rounded-lg shadow-lg ${
                toast.type === 'success' ? 'bg-green-500 text-white' :
                toast.type === 'error' ? 'bg-red-500 text-white' :
                toast.type === 'warning' ? 'bg-yellow-500 text-white' :
                'bg-blue-500 text-white'
              } flex items-center`}
            >
              {toast.type === 'success' && (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              )}
              
              {toast.type === 'error' && (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              )}
              
              {toast.type === 'warning' && (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              )}
              
              {toast.type === 'info' && (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              )}
              
              <p>{toast.message}</p>
              
              <button 
                onClick={() => setShowToast(false)}
                className="ml-3 text-white opacity-70 hover:opacity-100"
              >
                ×
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default StudentManagementDashboard;