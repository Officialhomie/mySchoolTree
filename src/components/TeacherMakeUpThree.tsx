import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
// Instead of redefining the hooks and causing conflicts, import them
import { useSchoolStudentCount } from '../MSTReadfunction/StudentProfileRead/SchoolStudentCount';
import { useAttendanceData } from '../MSTReadfunction/StudentProfileRead/getStudentAttendance';

// Define interfaces for our component and data
interface StudentManagementDashboardProps {
  schoolAddress?: string;
  studentAddress?: string;
  studentContractView?: boolean;
  refreshInterval?: number;
}

// interface StudentInfo {
//   name: string;
//   isRegistered: boolean;
//   currentTerm: number;
// }

// interface AttendanceStatus {
//   text: string;
//   color: string;
//   bg: string;
// }

// interface StudentAttendanceData { // 'StudentAttendanceData' is declared but never used.ts(6196)
//   studentAddress: string;
//   term: number;
//   termAttendance: bigint | undefined;
//   totalAttendance: bigint | undefined;
//   studentInfo: StudentInfo | undefined;
//   status: AttendanceStatus;
//   isLoading: boolean;
//   error: Error | null;
//   refresh: () => void;
//   setStudentAddress: (address: string) => void;
//   setTerm: (term: number) => void;
//   toggleAdditionalInfo: () => void;
// }

// interface SchoolCategory {
//   text: string;
//   color: string;
//   bg: string;
// }

// interface SchoolData {
//   count: bigint | undefined;
//   schoolAddress: string;
//   category: SchoolCategory;
//   lastUpdated: Date | null;
//   isLoading: boolean;
//   isSuccess: boolean;
//   error: Error | null;
//   refetch: () => void;
// }

const StudentManagementDashboard = ({
  schoolAddress = '',
  studentAddress = '',
  studentContractView = false,
  refreshInterval = 0
}: StudentManagementDashboardProps) => {
  // Tab state
  const [activeTab, setActiveTab] = useState('school');
  
  // School data state
  const [schoolQuery, setSchoolQuery] = useState(schoolAddress);
  
  // Student data state
  const [studentQuery, setStudentQuery] = useState(studentAddress);
  const [termQuery, setTermQuery] = useState(1);
  const [showStudentInfo, setShowStudentInfo] = useState(true);
  
  // Form validation
  const [validationError, setValidationError] = useState('');
  
  // Use custom hooks for data fetching
  const schoolData = useSchoolStudentCount(
    activeTab === 'school' ? schoolQuery : '', 
    refreshInterval
  );
  
  const studentData = useAttendanceData(
    studentContractView,
    activeTab === 'student' ? studentQuery : '',
    termQuery,
    refreshInterval
  );
  
  // Initialize toggle state based on available student info
  useEffect(() => {
    if (studentData.studentInfo) {
      setShowStudentInfo(true);
    }
  }, [studentData.studentInfo]);
  
  // Address validation
  const validateAddress = (address: string): boolean => {
    if (!address) {
      setValidationError('Address is required');
      return false;
    }
    
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      setValidationError('Invalid Ethereum address format');
      return false;
    }
    
    setValidationError('');
    return true;
  };
  
  // Term validation
  const validateTerm = (term: number): boolean => {
    if (isNaN(term) || term <= 0) {
      setValidationError('Term must be a positive number');
      return false;
    }
    
    setValidationError('');
    return true;
  };
  
  // Handle school form submission
  const handleSchoolSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    
    if (validateAddress(schoolQuery)) {
      schoolData.refetch();
    }
  };
  
  // Handle student form submission
  const handleStudentSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    
    if (validateAddress(studentQuery) && validateTerm(termQuery)) {
      studentData.refresh();
    }
  };
  
  // Format ethereum address for display
  const formatAddress = (address: string): string => {
    if (!address || address.length < 42) return address;
    return `${address.substring(0, 6)}...${address.substring(38)}`;
  };
  
  // Demo data buttons
  const handleDemoSchool = (address: string): void => {
    setSchoolQuery(address);
    setValidationError('');
  };
  
  const handleDemoStudent = (address: string): void => {
    setStudentQuery(address);
    setValidationError('');
  };
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-gradient-to-br from-gray-900 to-gray-800 text-white rounded-xl shadow-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6">
        <h2 className="text-2xl font-bold">Student Management Dashboard</h2>
        <p className="text-blue-100 mt-1">View school enrollment and student attendance data</p>
      </div>
      
      {/* Tab Navigation */}
      <div className="flex border-b border-gray-700">
        <button
          onClick={() => setActiveTab('school')}
          className={`flex-1 py-4 px-6 text-center transition-colors ${
            activeTab === 'school'
              ? 'text-blue-400 border-b-2 border-blue-400 font-medium'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          <div className="flex items-center justify-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            School Enrollment
          </div>
        </button>
        <button
          onClick={() => setActiveTab('student')}
          className={`flex-1 py-4 px-6 text-center transition-colors ${
            activeTab === 'student'
              ? 'text-blue-400 border-b-2 border-blue-400 font-medium'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          <div className="flex items-center justify-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Student Attendance
          </div>
        </button>
      </div>
      
      {/* Content Area */}
      <div className="p-6">
        <AnimatePresence mode="wait">
          {activeTab === 'school' ? (
            <motion.div
              key="school-tab"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.3 }}
            >
              {/* School Student Count Form */}
              <form onSubmit={handleSchoolSubmit} className="mb-6">
                <div className="bg-gray-800/60 backdrop-blur-sm rounded-lg p-5 shadow-lg">
                  <h3 className="text-lg font-medium text-gray-200 mb-4 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Search School Enrollment
                  </h3>
                  
                  <div className="space-y-4">
                    {/* School Address Input */}
                    <div className="space-y-2">
                      <label htmlFor="school-address" className="block text-sm font-medium text-gray-300">
                        School Wallet Address
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                          </svg>
                        </div>
                        <input
                          id="school-address"
                          type="text"
                          value={schoolQuery}
                          onChange={(e) => {
                            setSchoolQuery(e.target.value);
                            setValidationError('');
                          }}
                          placeholder="0x..."
                          className={`w-full pl-10 px-3 py-3 bg-gray-700/70 border ${
                            validationError && activeTab === 'school' ? 'border-red-500' : 'border-gray-600'
                          } rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors`}
                        />
                      </div>
                      <p className="text-xs text-gray-400">Enter the school's Ethereum wallet address</p>
                    </div>
                    
                    {/* Demo Buttons */}
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleDemoSchool("0xdD2FD4581271e230360230F9337D5c0430Bf44C0")}
                        className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 py-2 px-3 rounded-md transition-colors flex items-center"
                      >
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Test School 1
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDemoSchool("0x5FbDB2315678afecb367f032d93F642f64180aa3")}
                        className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 py-2 px-3 rounded-md transition-colors flex items-center"
                      >
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Test School 2
                      </button>
                    </div>
                    
                    {/* Error Display */}
                    {validationError && activeTab === 'school' && (
                      <div className="text-sm text-red-400 mt-1 flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {validationError}
                      </div>
                    )}
                    
                    {/* Submit Button */}
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        className="px-5 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-lg flex items-center"
                        disabled={schoolData.isLoading}
                      >
                        {schoolData.isLoading ? (
                          <span className="flex items-center">
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Loading...
                          </span>
                        ) : (
                          <>
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            View Enrollment
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </form>
              
              {/* School Results */}
              <AnimatePresence>
                {schoolData.error ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6"
                  >
                    <div className="flex items-start">
                      <svg className="w-5 h-5 text-red-400 mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <h4 className="text-red-400 font-medium">Error</h4>
                        <p className="text-sm text-gray-300 mt-1">
                          {schoolData.error?.message || 'Failed to fetch school data'}
                        </p>
                        <button 
                          onClick={() => schoolData.refetch()} 
                          className="text-sm mt-3 bg-gray-700 hover:bg-gray-600 text-gray-200 py-1 px-3 rounded-md transition-colors flex items-center"
                        >
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          Try Again
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ) : schoolData.isSuccess && schoolData.count !== undefined ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-6"
                  >
                    {/* Status Badge */}
                    <div className="flex justify-between items-center">
                      <div className={`inline-flex items-center px-3 py-1 rounded-full ${schoolData.category.bg} border border-${schoolData.category.color.replace('text-', '')}/30`}>
                        <div className={`w-2 h-2 rounded-full ${schoolData.category.color.replace('text-', 'bg-')} mr-2`}></div>
                        <span className={`text-sm font-medium ${schoolData.category.color}`}>
                          {schoolData.category.text}
                        </span>
                      </div>
                      <div className="text-xs text-gray-400">
                        {schoolData.lastUpdated && (
                          <span>Updated {getTimeAgo(schoolData.lastUpdated)}</span>
                        )}
                      </div>
                    </div>
                    
                    {/* Main Info Card */}
                    <div className="bg-gradient-to-b from-gray-800/70 to-gray-800/20 rounded-xl shadow-lg overflow-hidden border border-gray-700">
                      <div className="p-6">
                        <div className="flex flex-col md:flex-row items-center justify-between">
                          <div className="flex flex-col items-center justify-center md:items-start">
                            <h3 className="text-xl font-semibold text-gray-100 flex items-center mb-1">
                              <svg className="w-5 h-5 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                              </svg>
                              School Enrollment
                            </h3>
                            <p className="text-gray-400 text-sm mb-4 md:mb-0">
                              School ID: <span className="text-gray-300 font-mono">{formatAddress(schoolData.schoolAddress)}</span>
                            </p>
                          </div>
                          
                          {/* Refresh Button */}
                          <button 
                            onClick={() => schoolData.refetch()} 
                            className="text-sm bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 py-2 px-4 rounded-lg transition-colors flex items-center"
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Refresh Data
                          </button>
                        </div>
                      </div>
                      
                      <div className="px-6 py-8 bg-gray-700/20 backdrop-blur-sm">
                        <div className="flex flex-col items-center">
                          <div className="text-6xl font-bold text-white mb-2 flex items-baseline">
                            {schoolData.count ? schoolData.count.toString() : '0'}
                            <span className="text-xl text-gray-400 ml-2">
                              {Number(schoolData.count || 0) === 1 ? 'Student' : 'Students'}
                            </span>
                          </div>
                          
                          {/* Student Count Visual Indicator */}
                          <div className="w-full max-w-md mt-4">
                            <div className="h-3 bg-gray-700 rounded-full overflow-hidden shadow-inner">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ 
                                  width: `${getStudentCountPercentage(Number(schoolData.count || 0))}%` 
                                }}
                                transition={{ duration: 1, ease: "easeOut" }}
                                className={getStudentCountBarColor(Number(schoolData.count || 0))}
                              ></motion.div>
                            </div>
                            <p className="text-sm text-gray-400 mt-2 text-center">
                              {getStudentCountDescription(Number(schoolData.count || 0))}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </motion.div>
          ) : (
            <motion.div
              key="student-tab"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.3 }}
            >
              {/* Student Attendance Form */}
              <form onSubmit={handleStudentSubmit} className="mb-6">
                <div className="bg-gray-800/60 backdrop-blur-sm rounded-lg p-5 shadow-lg">
                  <h3 className="text-lg font-medium text-gray-200 mb-4 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Search Student Attendance
                  </h3>
                  
                  <div className="space-y-4">
                    {/* Student Address Input */}
                    <div className="space-y-2">
                      <label htmlFor="student-address" className="block text-sm font-medium text-gray-300">
                        Student Wallet Address
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        <input
                          id="student-address"
                          type="text"
                          value={studentQuery}
                          onChange={(e) => {
                            setStudentQuery(e.target.value);
                            setValidationError('');
                          }}
                          placeholder="0x..."
                          className={`w-full pl-10 px-3 py-3 bg-gray-700/70 border ${
                            validationError && !studentQuery && activeTab === 'student' ? 'border-red-500' : 'border-gray-600'
                          } rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors`}
                        />
                      </div>
                      <p className="text-xs text-gray-400">Enter the student's Ethereum wallet address</p>
                    </div>
                    
                    {/* Term Input */}
                    <div className="space-y-2">
                      <label htmlFor="term-number" className="block text-sm font-medium text-gray-300">
                        Term Number
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <input
                          id="term-number"
                          type="number"
                          value={termQuery || ''}
                          onChange={(e) => {
                            setTermQuery(parseInt(e.target.value) || 0);
                            setValidationError('');
                          }}
                          placeholder="Enter term number"
                          min="1"
                          className={`w-full pl-10 px-3 py-3 bg-gray-700/70 border ${
                            validationError && (!termQuery || termQuery <= 0) && activeTab === 'student' ? 'border-red-500' : 'border-gray-600'
                          } rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors`}
                        />
                      </div>
                      <p className="text-xs text-gray-400">Enter the term number to check attendance for</p>
                    </div>
                    
                    {/* Demo Buttons */}
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleDemoStudent("0x1234567890123456789012345678901234567890")}
                        className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 py-2 px-3 rounded-md transition-colors flex items-center"
                      >
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Test Student 1
                      </button>
                    </div>
                    
                    {/* Additional Info Toggle */}
                    {studentContractView && (
                      <div className="flex items-center mt-2">
                        <label className="inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={showStudentInfo}
                            onChange={() => setShowStudentInfo(!showStudentInfo)}
                          />
                          <div className="relative w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-gray-300 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                          <span className="ms-3 text-sm text-gray-300">Show Student Profile</span>
                        </label>
                      </div>
                    )}
                    
                    {/* Error Display */}
                    {validationError && activeTab === 'student' && (
                      <div className="text-sm text-red-400 mt-1 flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {validationError}
                      </div>
                    )}
                    
                    {/* Submit Button */}
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        className="px-5 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-lg flex items-center"
                        disabled={studentData.isLoading}
                      >
                        {studentData.isLoading ? (
                          <span className="flex items-center">
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Loading...
                          </span>
                        ) : (
                          <>
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            View Attendance
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </form>
              
              {/* Student Results */}
              <AnimatePresence>
                {studentData.error ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6"
                  >
                    <div className="flex items-start">
                      <svg className="w-5 h-5 text-red-400 mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <h4 className="text-red-400 font-medium">Error</h4>
                        <p className="text-sm text-gray-300 mt-1">
                          {studentData.error?.message || 'Failed to fetch student data'}
                        </p>
                        <button 
                          onClick={() => studentData.refresh()} 
                          className="text-sm mt-3 bg-gray-700 hover:bg-gray-600 text-gray-200 py-1 px-3 rounded-md transition-colors flex items-center"
                        >
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          Try Again
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ) : studentData.termAttendance !== undefined && studentData.totalAttendance !== undefined ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-6"
                  >
                    {/* Status Badge */}
                    <div className={`inline-flex items-center px-3 py-1 rounded-full ${studentData.status.bg} border border-${studentData.status.color.replace('text-', '')}/30`}>
                      <div className={`w-2 h-2 rounded-full ${studentData.status.color.replace('text-', 'bg-')} mr-2`}></div>
                      <span className={`text-sm font-medium ${studentData.status.color}`}>
                        {studentData.status.text} Attendance
                      </span>
                    </div>
                    
                    {/* Student Info (if available) */}
                    <AnimatePresence>
                      {showStudentInfo && studentData.studentInfo && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="bg-gradient-to-b from-blue-900/20 to-blue-800/10 rounded-xl shadow-lg overflow-hidden border border-blue-800/30"
                        >
                          <div className="p-5">
                            <h3 className="text-xl font-semibold text-gray-100 flex items-center mb-4">
                              <svg className="w-5 h-5 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                              Student Profile
                            </h3>
                            
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                              <div className="space-y-3">
                                <div>
                                  <p className="text-xs text-gray-400">Name:</p>
                                  <p className="text-xl font-medium text-white">{studentData.studentInfo.name || 'Unnamed Student'}</p>
                                </div>
                                
                                <div>
                                  <p className="text-xs text-gray-400">Wallet Address:</p>
                                  <p className="text-sm font-mono text-gray-300">{formatAddress(studentData.studentAddress)}</p>
                                </div>
                              </div>
                              
                              <div className="mt-4 md:mt-0 flex flex-col items-start md:items-end">
                                <div className="flex items-center mb-2">
                                  <div className={`w-3 h-3 rounded-full ${studentData.studentInfo.isRegistered ? 'bg-green-400' : 'bg-red-400'} mr-2`}></div>
                                  <span className={`text-sm ${studentData.studentInfo.isRegistered ? 'text-green-400' : 'text-red-400'}`}>
                                    {studentData.studentInfo.isRegistered ? 'Registered' : 'Not Registered'}
                                  </span>
                                </div>
                                
                                <div>
                                  <span className="text-xs text-gray-400">Current Term: </span>
                                  <span className="text-md text-white font-medium">{studentData.studentInfo.currentTerm}</span>
                                  {termQuery !== studentData.studentInfo.currentTerm && (
                                    <span className="text-xs text-yellow-400 ml-2">
                                      (Viewing term {termQuery})
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    
                    {/* Main Attendance Info Card */}
                    <div className="bg-gradient-to-b from-gray-800/70 to-gray-800/20 rounded-xl shadow-lg overflow-hidden border border-gray-700">
                      <div className="p-6">
                        <div className="flex flex-col md:flex-row items-center justify-between">
                          <div className="flex flex-col items-center justify-center md:items-start">
                            <h3 className="text-xl font-semibold text-gray-100 flex items-center mb-1">
                              <svg className="w-5 h-5 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                              </svg>
                              Attendance Record
                            </h3>
                            <p className="text-gray-400 text-sm mb-4 md:mb-0">
                              Term {studentData.term}
                            </p>
                          </div>
                          
                          {/* Refresh Button */}
                          <button 
                            onClick={() => studentData.refresh()} 
                            className="text-sm bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 py-2 px-4 rounded-lg transition-colors flex items-center"
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Refresh Data
                          </button>
                        </div>
                      </div>
                      
                      <div className="p-6 bg-gray-700/20 backdrop-blur-sm">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Term Attendance */}
                          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                            <h4 className="text-md font-medium text-gray-300 mb-3 flex items-center">
                              <svg className="w-4 h-4 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              Term Attendance
                            </h4>
                            
                            <div className="flex items-baseline justify-center mb-4">
                              <p className="text-4xl font-bold text-white">{studentData.termAttendance.toString()}</p>
                              <p className="text-sm text-gray-400 ml-2">classes</p>
                            </div>
                            
                            {Number(studentData.termAttendance) === 0 && (
                              <p className="text-xs text-red-400 text-center mb-2">No attendance recorded for this term</p>
                            )}
                            
                            {/* Attendance Level Visual Indicator */}
                            <div className="mt-2 h-3 bg-gray-700 rounded-full overflow-hidden shadow-inner">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ 
                                  width: `${Math.min(Number(studentData.termAttendance) * 5, 100)}%` 
                                }}
                                transition={{ duration: 1, ease: "easeOut" }}
                                className={getAttendanceBarColor(Number(studentData.termAttendance))}
                              ></motion.div>
                            </div>
                            <p className="text-xs text-gray-400 mt-2 text-center">
                              {getAttendanceLevel(Number(studentData.termAttendance))}
                            </p>
                          </div>
                          
                          {/* Total Attendance */}
                          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                            <h4 className="text-md font-medium text-gray-300 mb-3 flex items-center">
                              <svg className="w-4 h-4 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                              </svg>
                              Total Attendance
                            </h4>
                            
                            <div className="flex items-baseline justify-center mb-4">
                              <p className="text-4xl font-bold text-white">{studentData.totalAttendance.toString()}</p>
                              <p className="text-sm text-gray-400 ml-2">classes</p>
                            </div>
                            
                            {/* Comparison with Term Attendance */}
                            {Number(studentData.termAttendance) > 0 && Number(studentData.totalAttendance) > Number(studentData.termAttendance) && (
                              <p className="text-xs text-blue-400 text-center mb-2">
                                {((Number(studentData.termAttendance) / Number(studentData.totalAttendance)) * 100).toFixed(1)}% of total in this term
                              </p>
                            )}
                            
                            {/* Total Attendance Visual Indicator */}
                            <div className="mt-2 h-3 bg-gray-700 rounded-full overflow-hidden shadow-inner">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ 
                                  width: `${Math.min(Number(studentData.totalAttendance) * 2, 100)}%` 
                                }}
                                transition={{ duration: 1, ease: "easeOut" }}
                                className="h-full bg-blue-500"
                              ></motion.div>
                            </div>
                            
                            {/* Career Progress Indicator */}
                            <div className="mt-4 pt-2 border-t border-gray-700">
                              <div className="flex justify-between text-xs text-gray-400">
                                <span>Beginning</span>
                                <span>Career Progress</span>
                                <span>Advanced</span>
                              </div>
                              <div className="mt-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"
                                  style={{ width: `${Math.min(Number(studentData.totalAttendance) * 2, 100)}%` }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

// Helper functions for student count visualization
function getStudentCountBarColor(count: number): string {
  if (count === 0) return 'h-full bg-red-500';
  if (count < 10) return 'h-full bg-yellow-500';
  if (count < 50) return 'h-full bg-blue-500';
  return 'h-full bg-gradient-to-r from-green-500 to-emerald-400';
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

// Time ago formatter (replacement for date-fns formatDistanceToNow)
function getTimeAgo(date: Date): string {
  if (!date) return '';
  
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  
  let interval = Math.floor(seconds / 31536000);
  if (interval >= 1) {
    return interval === 1 ? '1 year ago' : `${interval} years ago`;
  }
  
  interval = Math.floor(seconds / 2592000);
  if (interval >= 1) {
    return interval === 1 ? '1 month ago' : `${interval} months ago`;
  }
  
  interval = Math.floor(seconds / 86400);
  if (interval >= 1) {
    return interval === 1 ? '1 day ago' : `${interval} days ago`;
  }
  
  interval = Math.floor(seconds / 3600);
  if (interval >= 1) {
    return interval === 1 ? '1 hour ago' : `${interval} hours ago`;
  }
  
  interval = Math.floor(seconds / 60);
  if (interval >= 1) {
    return interval === 1 ? '1 minute ago' : `${interval} minutes ago`;
  }
  
  return seconds < 10 ? 'just now' : `${Math.floor(seconds)} seconds ago`;
}

// Helper functions for attendance visualization
function getAttendanceBarColor(count: number): string {
  if (count > 10) return 'h-full bg-gradient-to-r from-green-500 to-emerald-400';
  if (count > 5) return 'h-full bg-blue-500';
  if (count > 0) return 'h-full bg-yellow-500';
  return 'h-full bg-red-500';
}

function getAttendanceLevel(count: number): string {
  if (count > 15) return 'Exceptional attendance level';
  if (count > 10) return 'Excellent attendance level';
  if (count > 5) return 'Good attendance level';
  if (count > 0) return 'Minimal attendance level';
  return 'No attendance recorded';
}

export default StudentManagementDashboard;