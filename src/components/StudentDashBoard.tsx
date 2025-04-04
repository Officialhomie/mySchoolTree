import { useState, useEffect } from 'react';
import { useAccount } from "wagmi";
import AttendanceMetricsViewer from "../MSTReadfunction/AttendaceRead/StudentAttendance";
import GetStudentProgramProgress from "../MSTReadfunction/AttendaceRead/StudentProgramProgress";
import StudentProgressTracker from "../MSTReadfunction/AttendaceRead/StudentProgressTracker";
import { motion } from 'framer-motion';

// Import our custom hooks from the three components
import { useStudentDetails } from "../MSTReadfunction/SMRead/getStudentDetails";
import { useStudentProgram } from "../MSTReadfunction/SMRead/getStudentProgram";
import { useStudentProgramLookup } from "../MSTReadfunction/SMRead/StudentProgramLookup";

import { contractAttendanceTrackingConfig } from "../contracts";

const StudentMakeUpOne = () => {
    const { address } = useAccount();
    const [studentAddress, setStudentAddress] = useState('');
    const [hasSearched, setHasSearched] = useState(false);
    const [activeView, setActiveView] = useState('info'); // 'info', 'details', or 'program'
    const [programNames, ] = useState({
        "1": "Web Development",
        "2": "Mobile App Development",
        "3": "UI/UX Design",
        "4": "Data Science"
        // Add more program names as needed
    });

    // Initialize all three custom hooks
    const studentDetails = useStudentDetails(
        contractAttendanceTrackingConfig, 
        studentAddress || address || '',
        (data: any) => console.log('Student details fetched:', data)
    );
    
    const studentProgram = useStudentProgram(
        contractAttendanceTrackingConfig, 
        studentAddress || address || '',
        (programId: any, address: any) => console.log(`Program ID ${programId} for ${address}`)
    );
    
    const programLookup = useStudentProgramLookup(
        contractAttendanceTrackingConfig, 
        studentAddress || address || '',
        undefined,
        programNames
    );

    // Use connected wallet address by default
    useEffect(() => {
        if (address && !studentAddress) {
            setStudentAddress(address);
            
            // Auto-search when using own address
            if (!hasSearched) {
                handleSearch();
            }
        }
    }, [address, studentAddress, hasSearched]);

    // Search for student information
    const handleSearch = () => {
        setHasSearched(true);
        studentDetails.searchStudent();
        studentProgram.searchProgram();
        programLookup.searchProgram();
    };
    
    // Check if we have valid student data
    const hasStudentData = 
        hasSearched && 
        studentDetails.isSuccess && 
        studentDetails.studentData;
    
    // Get program ID with priority to the direct contract call
    const programId = 
        studentProgram.programId !== undefined 
            ? studentProgram.programId 
            : programLookup.programData.programId;
    
    // Determine loading state
    const isLoading = 
        studentDetails.isLoading || 
        studentProgram.isLoading || 
        programLookup.programData.isLoading;

    return (
        <div className="space-y-6">
            {/* Student Information Header */}
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="bg-gray-800/50 border border-gray-700 rounded-lg p-4"
            >
                <h2 className="text-lg font-medium text-blue-400 mb-4">Student Information</h2>
                
                {/* Loading Indicator */}
                {isLoading && (
                    <div className="flex items-center justify-center py-3">
                        <div className="w-5 h-5 border-2 border-t-blue-400 border-blue-200/30 rounded-full animate-spin mr-2"></div>
                        <span className="text-sm text-gray-300">Loading student data...</span>
                    </div>
                )}
                
                {/* Student Overview when data is available */}
                {hasStudentData && !isLoading && (
                    <div className="space-y-4">
                        {/* Student Basic Info */}
                        <div className="flex items-start">
                            <div className="w-12 h-12 bg-gray-600 rounded-full flex items-center justify-center text-gray-300 mr-3">
                                {studentDetails.studentData?.name ? 
                                studentDetails.studentData.name.substring(0, 2).toUpperCase() : 'ST'}
                            </div>
                            
                            <div className="flex-1">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-medium text-gray-200">
                                        {studentDetails.studentData?.name || 'Unnamed Student'}
                                    </h3>
                                    
                                    {/* Registration Status Badge */}
                                    {studentDetails.studentData && (
                                        <div className={`inline-flex items-center px-3 py-1 rounded-full ${
                                            studentDetails.studentData.isRegistered 
                                                ? 'bg-green-500/20 border-green-400/30' 
                                                : 'bg-red-500/20 border-red-400/30'
                                            } border`}>
                                            <div className={`w-2 h-2 rounded-full ${
                                                studentDetails.studentData.isRegistered ? 'bg-green-400' : 'bg-red-400'
                                            } mr-2`}></div>
                                            <span className={`text-xs font-medium ${
                                                studentDetails.studentData.isRegistered ? 'text-green-400' : 'text-red-400'
                                            }`}>
                                                {studentDetails.studentData.isRegistered ? 'Registered' : 'Not Registered'}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                
                                <div className="mt-1 space-y-1">
                                    <p className="text-sm text-gray-400">
                                        <span className="text-gray-300">Address:</span> 
                                        <span className="font-mono ml-2 text-xs">{(studentAddress || address || '').substring(0, 6)}...{(studentAddress || address || '').substring((studentAddress || address || '').length - 4)}</span>
                                    </p>
                                    
                                    {programId !== undefined && programId > 0n && (
                                        <p className="text-sm text-gray-400">
                                            <span className="text-gray-300">Program:</span> 
                                            <span className="ml-2">{programLookup.getProgramName(programId)}</span>
                                            <span className="ml-2 px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs">
                                                #{programId.toString()}
                                            </span>
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                        
                        {/* Key Metrics */}
                        <div className="grid grid-cols-3 gap-4 mt-4">
                            {/* Attendance */}
                            <div className="bg-gray-700/20 rounded-md p-3">
                                <p className="text-xs text-gray-400">Attendance</p>
                                <p className="text-lg font-medium text-white">{studentDetails.studentData?.attendanceCount || 0}</p>
                                <p className="text-xs text-gray-400">
                                    Rate: {studentDetails.formattedData.attendanceRate || 'N/A'}
                                </p>
                            </div>
                            
                            {/* Term */}
                            <div className="bg-gray-700/20 rounded-md p-3">
                                <p className="text-xs text-gray-400">Current Term</p>
                                <p className="text-lg font-medium text-white">
                                    {studentDetails.studentData && studentDetails.studentData.currentTerm !== undefined && studentDetails.studentData.currentTerm > 0 
                                        ? studentDetails.studentData.currentTerm 
                                        : 'N/A'}
                                </p>
                                <p className="text-xs text-gray-400">
                                    {studentDetails.studentData && studentDetails.studentData.currentTerm !== undefined && studentDetails.studentData.currentTerm > 0 ? 'Active' : 'Not enrolled'}
                                </p>
                            </div>
                            {/* Payments */}
                            <div className="bg-gray-700/20 rounded-md p-3">
                                <p className="text-xs text-gray-400">Total Payments</p>
                                <div className="flex items-baseline">
                                    <p className="text-lg font-medium text-white">
                                        {studentDetails.formattedData.totalPaymentsFormatted || '0'}
                                    </p>
                                    <p className="ml-1 text-xs text-gray-400">ETH</p>
                                </div>
                            </div>
                        </div>
                        
                        {/* Alert Messages */}
                        {studentDetails.studentData?.isRegistered && 
                         !studentDetails.studentData?.hasFirstAttendance && (
                            <div className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded-md p-3 text-sm">
                                <div className="flex items-start">
                                    <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                    <span>First attendance has not been recorded yet</span>
                                </div>
                            </div>
                        )}
                        
                        {/* View Toggle Buttons */}
                        <div className="flex space-x-2 mt-4">
                            <button 
                                onClick={() => setActiveView('info')}
                                className={`px-3 py-1 rounded text-sm ${
                                    activeView === 'info' 
                                        ? 'bg-blue-600 text-white' 
                                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                }`}
                            >
                                Basic Info
                            </button>
                            <button 
                                onClick={() => setActiveView('details')}
                                className={`px-3 py-1 rounded text-sm ${
                                    activeView === 'details' 
                                        ? 'bg-blue-600 text-white' 
                                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                }`}
                            >
                                Student Details
                            </button>
                            <button 
                                onClick={() => setActiveView('program')}
                                className={`px-3 py-1 rounded text-sm ${
                                    activeView === 'program' 
                                        ? 'bg-blue-600 text-white' 
                                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                }`}
                            >
                                Program Info
                            </button>
                        </div>
                        
                        {/* Extended Information Based on Active View */}
                        {activeView === 'details' && (
                            <div className="bg-gray-700/20 rounded-md p-3 mt-2">
                                <h4 className="text-sm font-medium text-gray-300 mb-2">Detailed Student Information</h4>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div>
                                        <span className="text-gray-400">Name: </span>
                                        <span className="text-gray-200">{studentDetails.studentData?.name}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-400">Is Registered: </span>
                                        <span className="text-gray-200">{studentDetails.studentData?.isRegistered ? 'Yes' : 'No'}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-400">Current Term: </span>
                                        <span className="text-gray-200">{studentDetails.studentData?.currentTerm}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-400">Attendance Count: </span>
                                        <span className="text-gray-200">{studentDetails.studentData?.attendanceCount}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-400">Last Attendance: </span>
                                        <span className="text-gray-200">{studentDetails.formattedData.lastAttendance}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-400">Has First Attendance: </span>
                                        <span className="text-gray-200">{studentDetails.studentData?.hasFirstAttendance ? 'Yes' : 'No'}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        {activeView === 'program' && (
                            <div className="bg-gray-700/20 rounded-md p-3 mt-2">
                                <h4 className="text-sm font-medium text-gray-300 mb-2">Program Information</h4>
                                {programId && programId > 0n ? (
                                    <div className="space-y-2">
                                        <div>
                                            <span className="text-xs text-gray-400">Program ID: </span>
                                            <span className="text-sm font-medium text-white">#{programId.toString()}</span>
                                        </div>
                                        <div>
                                            <span className="text-xs text-gray-400">Program Name: </span>
                                            <span className="text-sm text-white">{programLookup.getProgramName(programId)}</span>
                                        </div>
                                        <div>
                                            <span className="text-xs text-gray-400">Status: </span>
                                            <span className="text-sm text-green-400">Active Enrollment</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center">
                                        <svg className="w-5 h-5 text-yellow-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <span className="text-sm text-yellow-400">Not enrolled in any program</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
                
                {/* Not Found Message */}
                {hasSearched && !isLoading && (!studentDetails.studentData || studentDetails.studentData.name === '') && (
                    <div className="text-center py-4">
                        <svg className="w-10 h-10 mx-auto text-yellow-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <p className="text-sm font-medium text-yellow-400">No student record found</p>
                        <p className="text-xs text-gray-300 mt-1">
                            No student information exists for this address. Registration may be required.
                        </p>
                    </div>
                )}
                
                {/* Initial State - Only show if not using own address */}
                {!hasSearched && !isLoading && !address && (
                    <div className="bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-md p-3">
                        <p className="text-sm">
                            Connect your wallet to view your student information.
                        </p>
                    </div>
                )}
            </motion.div>
            
            {/* Attendance Metrics Section */}
            <AttendanceMetricsViewer 
                contract={{
                    address: contractAttendanceTrackingConfig.address as `0x${string}`,
                    abi: contractAttendanceTrackingConfig.abi
                }}
            />
            
            {/* Student Program Progress Section */}
            <GetStudentProgramProgress 
                contract={{
                    address: contractAttendanceTrackingConfig.address as `0x${string}`,
                    abi: contractAttendanceTrackingConfig.abi
                }}
                defaultAddress={address}
            />
            
            {/* Student Progress Tracker Section */}
            <StudentProgressTracker 
                contract={{
                    address: contractAttendanceTrackingConfig.address as `0x${string}`,
                    abi: contractAttendanceTrackingConfig.abi
                }}
            />
        </div>
    );
};

export default StudentMakeUpOne;